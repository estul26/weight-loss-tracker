import crypto from 'node:crypto'
import type { Db, MongoClient } from 'mongodb'
import type { AppSettings, DailyLog, DailyLogInput, RemoteState } from '../shared/tracker.js'
import { normalizeSettings, parseDailyLogInput } from '../shared/tracker.js'

export type { RemoteState } from '../shared/tracker.js'

export interface TrackerStore {
  initialize(): Promise<void>
  health(): Promise<void>
  getState(): Promise<RemoteState>
  updateSettings(settings: AppSettings): Promise<RemoteState>
  upsertLog(log: DailyLogInput): Promise<DailyLog>
  deleteLog(date: string): Promise<boolean>
  importLogs(logs: DailyLogInput[], mode: 'merge' | 'replace', settings: AppSettings): Promise<RemoteState>
}

type SettingsDocument = { _id: 'owner'; settings: AppSettings; updatedAt: string; legacyMigrationComplete?: boolean }
type StoredLog = DailyLog & { _id: string }
type LegacyState = { _id: 'owner'; settings?: unknown; logs?: unknown[] }

const now = () => new Date().toISOString()
const toPublicLog = ({ _id: _ignored, ...log }: StoredLog): DailyLog => log
const toStoredLog = (input: DailyLogInput, timestamp = now()): StoredLog => ({ _id: input.date, id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp, ...input })
const insertFields = ({ _id: _ignored, ...log }: StoredLog) => log

/**
 * Mongo persistence intentionally keeps logs in their own collection. That makes a
 * date a real uniqueness boundary and avoids rewriting a growing document per save.
 */
export class MongoTrackerStore implements TrackerStore {
  private readonly settings
  private readonly logs
  private readonly legacy
  private initialization?: Promise<void>

  constructor(
    private readonly mongo: MongoClient,
    private readonly db: Db,
    private readonly defaults: () => AppSettings,
  ) {
    this.settings = db.collection<SettingsDocument>('tracker_settings')
    this.logs = db.collection<StoredLog>('daily_logs')
    this.legacy = db.collection<LegacyState>('tracker_state')
  }

  initialize() {
    this.initialization ??= this.initializeOnce()
    return this.initialization
  }

  private async initializeOnce() {
    const topology = await this.db.admin().command({ hello: 1 }) as { setName?: string; msg?: string }
    if (!topology.setName && topology.msg !== 'isdbgrid') throw new Error('MongoDB must run as a replica set (or sharded cluster) so replace imports can be transactional.')
    await this.logs.createIndex({ date: 1 }, { unique: true, name: 'daily_log_date_unique' })

    let settings = await this.settings.findOne({ _id: 'owner' })
    const legacy = await this.legacy.findOne({ _id: 'owner' })
    if (!settings) {
      await this.settings.updateOne(
        { _id: 'owner' },
        { $setOnInsert: { settings: normalizeSettings(legacy?.settings, this.defaults()), updatedAt: now(), legacyMigrationComplete: false } },
        { upsert: true },
      )
      settings = await this.settings.findOne({ _id: 'owner' })
    }
    if (!settings) throw new Error('Could not initialize tracker settings.')
    if (settings.legacyMigrationComplete) return

    const parsed = (legacy?.logs ?? []).map((entry, index) => {
      const raw = entry as Record<string, unknown> | null
      const input = raw && typeof raw === 'object' ? raw : null
      if (!input) throw new Error(`Legacy daily log ${index + 1} is not an object.`)
      const result = parseDailyLogInput(input)
      if (!result.ok) throw new Error(`Legacy daily log ${index + 1} cannot be migrated: ${result.error}`)
      return result.value
    })
    const latestByDate = new Map<string, DailyLogInput>()
    for (const log of parsed) latestByDate.set(log.date, log)
    const writes = [...latestByDate.values()].map((log) => ({ updateOne: { filter: { _id: log.date }, update: { $setOnInsert: insertFields(toStoredLog(log)) }, upsert: true } }))
    if (writes.length) await this.logs.bulkWrite(writes)
    await this.settings.updateOne({ _id: 'owner' }, { $set: { legacyMigrationComplete: true, updatedAt: now() } })
  }

  async health() {
    await this.db.command({ ping: 1 })
  }

  async getState(): Promise<RemoteState> {
    await this.initialize()
    const [settings, logs] = await Promise.all([
      this.settings.findOne({ _id: 'owner' }),
      this.logs.find({}).sort({ date: -1 }).toArray(),
    ])
    if (!settings) throw new Error('Tracker settings are unavailable.')
    return { settings: settings.settings, logs: logs.map(toPublicLog) }
  }

  async updateSettings(settings: AppSettings) {
    await this.initialize()
    await this.settings.updateOne({ _id: 'owner' }, { $set: { settings, updatedAt: now() } })
    return this.getState()
  }

  async upsertLog(input: DailyLogInput): Promise<DailyLog> {
    await this.initialize()
    const timestamp = now()
    await this.logs.updateOne(
      { _id: input.date },
      { $set: { ...input, updatedAt: timestamp }, $setOnInsert: { id: crypto.randomUUID(), createdAt: timestamp } },
      { upsert: true },
    )
    const saved = await this.logs.findOne({ _id: input.date })
    if (!saved) throw new Error('Saved daily log could not be read back.')
    return toPublicLog(saved)
  }

  async deleteLog(date: string) {
    await this.initialize()
    return (await this.logs.deleteOne({ _id: date })).deletedCount === 1
  }

  async importLogs(inputs: DailyLogInput[], mode: 'merge' | 'replace', settings: AppSettings) {
    await this.initialize()
    if (mode === 'merge') {
      const timestamp = now()
      await this.logs.bulkWrite(inputs.map((input) => ({
        updateOne: {
          filter: { _id: input.date },
          update: { $set: { ...input, updatedAt: timestamp }, $setOnInsert: { id: crypto.randomUUID(), createdAt: timestamp } },
          upsert: true,
        },
      })))
      return this.getState()
    }

    const replacement = inputs.map((input) => toStoredLog(input))
    const session = this.mongo.startSession()
    try {
      await session.withTransaction(async () => {
        await this.logs.deleteMany({}, { session })
        if (replacement.length) await this.logs.insertMany(replacement, { session })
        await this.settings.updateOne({ _id: 'owner' }, { $set: { settings, updatedAt: now() } }, { session })
      })
    } finally {
      await session.endSession()
    }
    return this.getState()
  }
}
