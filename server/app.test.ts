// @vitest-environment node
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppSettings, DailyLog, DailyLogInput } from '../shared/tracker.js'
import { createTrackerApp } from './app.js'
import type { RemoteState, TrackerStore } from './store.js'

const settings: AppSettings = { heightCm: 176, startingWeightKg: 110, goalWeightKg: 85, planStartDate: '2020-01-01', goalDate: '2027-01-01' }
const logInput = (date = '2020-06-20'): DailyLogInput => ({ date, weightKg: 100, eatingWindowStart: '12:00', eatingWindowEnd: '18:00', fastingHours: 18, firstMeal: '', secondMeal: '', snacks: false, lateNightEating: false, sugaryDrink: false, refinedCarbs: 'none', exerciseType: '', exerciseMinutes: null, sleepHours: null, hungerLevel: null, energyLevel: null, moodLevel: null, notes: '', biggestProblem: '', tomorrowFocus: '' })

class MemoryStore implements TrackerStore {
  private currentSettings = settings
  private logs = new Map<string, DailyLog>()
  async initialize() {}
  async health() {}
  async getState(): Promise<RemoteState> { return { settings: this.currentSettings, logs: [...this.logs.values()].sort((a, b) => b.date.localeCompare(a.date)) } }
  async updateSettings(next: AppSettings) { this.currentSettings = next; return this.getState() }
  async upsertLog(input: DailyLogInput) {
    const existing = this.logs.get(input.date)
    const timestamp = new Date().toISOString()
    const saved: DailyLog = { ...input, id: existing?.id ?? `id-${input.date}`, createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp }
    this.logs.set(input.date, saved)
    return saved
  }
  async deleteLog(date: string) { return this.logs.delete(date) }
  async importLogs(inputs: DailyLogInput[], mode: 'merge' | 'replace', nextSettings: AppSettings) {
    if (mode === 'replace') { this.logs.clear(); this.currentSettings = nextSettings }
    for (const input of inputs) await this.upsertLog(input)
    return this.getState()
  }
}

const servers: Array<ReturnType<ReturnType<typeof createTrackerApp>['listen']>> = []
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))) })

async function api() {
  const app = createTrackerApp(new MemoryStore(), { appPassword: 'correct horse battery staple', sessionSecret: 'a test secret', timeZone: 'UTC', maxImportRows: 2 })
  const server = app.listen(0, '127.0.0.1'); servers.push(server)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'correct horse battery staple' }) })
  return { base, cookie: login.headers.get('set-cookie')!.split(';')[0] }
}

describe('tracker API', () => {
  it('authenticates sessions and returns JSON for unknown routes and malformed bodies', async () => {
    const { base, cookie } = await api()
    expect((await fetch(`${base}/api/auth/session`)).status).toBe(200)
    expect(await (await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie } })).json()).toEqual({ authenticated: true })
    const malformed = await fetch(`${base}/api/settings`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{' })
    expect(malformed.status).toBe(400); expect(await malformed.json()).toEqual({ error: 'Request body must contain valid JSON.' })
    const missing = await fetch(`${base}/api/not-a-route`, { headers: { Cookie: cookie } })
    expect(missing.status).toBe(404); expect(await missing.json()).toEqual({ error: 'API route not found.' })
  })

  it('rejects invalid logs and protects date-based import and deletion behavior', async () => {
    const { base, cookie } = await api(); const headers = { Cookie: cookie, 'Content-Type': 'application/json' }
    const invalid = await fetch(`${base}/api/logs/2020-06-20`, { method: 'PUT', headers, body: JSON.stringify({ ...logInput(), eatingWindowStart: '99:99' }) })
    expect(invalid.status).toBe(400); expect((await invalid.json()).error).toContain('24-hour')
    const future = await fetch(`${base}/api/logs/2999-01-01`, { method: 'PUT', headers, body: JSON.stringify(logInput('2999-01-01')) })
    expect(future.status).toBe(400); expect((await future.json()).error).toContain('Future')

    const duplicateImport = await fetch(`${base}/api/import?mode=merge`, { method: 'POST', headers, body: JSON.stringify({ settings, logs: [logInput('2020-06-20'), logInput('2020-06-20')] }) })
    expect(duplicateImport.status).toBe(400); expect((await duplicateImport.json()).error).toContain('more than one')

    const merged = await fetch(`${base}/api/import?mode=merge`, { method: 'POST', headers, body: JSON.stringify({ settings: { ...settings, heightCm: 200 }, logs: [logInput('2020-06-20')] }) })
    expect(merged.status).toBe(200); expect((await merged.json()).settings.heightCm).toBe(settings.heightCm)

    const imported = await fetch(`${base}/api/import?mode=replace`, { method: 'POST', headers, body: JSON.stringify({ settings, logs: [logInput('2020-06-20'), logInput('2020-06-21')] }) })
    expect(imported.status).toBe(200); expect((await imported.json()).logs).toHaveLength(2)
    expect((await fetch(`${base}/api/logs/2020-06-20`, { method: 'DELETE', headers: { Cookie: cookie } })).status).toBe(204)
    expect((await fetch(`${base}/api/logs/2020-06-20`, { method: 'DELETE', headers: { Cookie: cookie } })).status).toBe(404)
  })
})
