import { defaultSettings, normalizeSettings, type AppSettings, type BackupFile, type DailyLog } from './types'

const KEY = 'weight-path-data-v1'
export const loadData = (): { settings: AppSettings; logs: DailyLog[] } => {
  try { const raw = localStorage.getItem(KEY); if (!raw) return { settings: defaultSettings, logs: [] }; const data = JSON.parse(raw); return { settings: normalizeSettings(data.settings, defaultSettings), logs: Array.isArray(data.logs) ? data.logs : [] } } catch { return { settings: defaultSettings, logs: [] } }
}
export const backup = (settings: AppSettings, logs: DailyLog[]): BackupFile => ({ version: 2, exportedAt: new Date().toISOString(), settings, logs })
