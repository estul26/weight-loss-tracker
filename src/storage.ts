import { parseDailyLogInput } from '../shared/tracker'
import { defaultSettings, emptyLog, normalizeSettings, type AppSettings, type BackupFile, type DailyLog } from './types'

const KEY = 'weight-path-data-v1'
const legacyLogs = (value: unknown): { logs: DailyLog[]; invalidLogCount: number } => {
  if (!Array.isArray(value)) return { logs: [], invalidLogCount: 0 }
  let invalidLogCount = 0
  const logs = value.flatMap((row) => {
    const parsed = parseDailyLogInput(row)
    if (!parsed.ok) { invalidLogCount++; return [] }
    return [{ ...emptyLog(parsed.value.date), ...parsed.value }]
  })
  return { logs, invalidLogCount }
}

export const loadData = (): { settings: AppSettings; logs: DailyLog[]; invalidLogCount: number } => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { settings: defaultSettings, logs: [], invalidLogCount: 0 }
    const data = JSON.parse(raw) as { settings?: unknown; logs?: unknown }
    return { settings: normalizeSettings(data.settings, defaultSettings), ...legacyLogs(data.logs) }
  } catch {
    return { settings: defaultSettings, logs: [], invalidLogCount: 0 }
  }
}

export const clearLegacyData = () => {
  try { localStorage.removeItem(KEY) } catch { /* Browser privacy settings can block local storage. */ }
}

export const backup = (settings: AppSettings, logs: DailyLog[]): BackupFile => ({ version: 2, exportedAt: new Date().toISOString(), settings, logs })
