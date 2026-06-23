import { parseDailyLog, parseRemoteState } from '../shared/tracker'
import type { AppSettings, DailyLog, RemoteState } from './types'

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, { credentials: 'same-origin', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, ...options })
  if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string } | null; throw new Error(body?.error ?? 'Request failed.') }
  return response.status === 204 ? undefined : response.json()
}

const parsed = <T>(value: unknown, parser: (input: unknown) => { ok: true; value: T } | { ok: false; error: string }) => {
  const result = parser(value)
  if (!result.ok) throw new Error(result.error)
  return result.value
}
const session = (value: unknown) => {
  if (!value || typeof value !== 'object' || typeof (value as { authenticated?: unknown }).authenticated !== 'boolean') throw new Error('Server returned an invalid session response.')
  return value as { authenticated: boolean }
}
const login = (value: unknown) => {
  if (!value || typeof value !== 'object' || (value as { ok?: unknown }).ok !== true) throw new Error('Server returned an invalid login response.')
  return { ok: true }
}

export const api = {
  session: async () => session(await request('/api/auth/session')),
  login: async (password: string) => login(await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) })),
  logout: async () => { await request('/api/auth/logout', { method: 'POST' }) },
  data: async () => parsed(await request('/api/data'), parseRemoteState),
  settings: async (settings: AppSettings) => parsed(await request('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }), parseRemoteState),
  log: async (log: DailyLog) => parsed(await request(`/api/logs/${encodeURIComponent(log.date)}`, { method: 'PUT', body: JSON.stringify(log) }), parseDailyLog),
  deleteLog: async (date: string) => { await request(`/api/logs/${encodeURIComponent(date)}`, { method: 'DELETE' }) },
  import: async (payload: RemoteState, mode: 'merge' | 'replace') => parsed(await request(`/api/import?mode=${mode}`, { method: 'POST', body: JSON.stringify(payload) }), parseRemoteState),
}
