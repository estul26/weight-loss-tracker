import type { AppSettings, DailyLog } from './types'

export interface RemoteState { settings: AppSettings; logs: DailyLog[] }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, ...options })
  if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string } | null; throw new Error(body?.error ?? 'Request failed.') }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const api = {
  session: () => request<{ authenticated: boolean }>('/api/auth/session'),
  login: (password: string) => request<{ ok: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  data: () => request<RemoteState>('/api/data'),
  settings: (settings: AppSettings) => request<RemoteState>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  log: (log: DailyLog) => request<DailyLog>(`/api/logs/${log.date}`, { method: 'PUT', body: JSON.stringify(log) }),
  deleteLog: (id: string) => request<void>(`/api/logs/${id}`, { method: 'DELETE' }),
  import: (payload: RemoteState, mode: 'merge' | 'replace') => request<RemoteState>(`/api/import?mode=${mode}`, { method: 'POST', body: JSON.stringify(payload) }),
}
