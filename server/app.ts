import crypto from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import type { DailyLogInput } from '../shared/tracker.js'
import { isDateKey, parseAppSettings, parseDailyLogInput, uniqueDates } from '../shared/tracker.js'
import type { TrackerStore } from './store.js'

export interface AppConfig {
  appPassword: string
  sessionSecret: string
  timeZone: string
  maxImportRows: number
}

type ApiError = Error & { status: number }
const error = (status: number, message: string): ApiError => Object.assign(new Error(message), { status })

const cookies = (request: Request) => {
  const parsed: Record<string, string> = {}
  for (const entry of (request.headers.cookie ?? '').split(';')) {
    const divider = entry.indexOf('=')
    if (divider < 1) continue
    try { parsed[decodeURIComponent(entry.slice(0, divider).trim())] = decodeURIComponent(entry.slice(divider + 1)) } catch { /* Ignore malformed cookie values. */ }
  }
  return parsed
}
const sign = (value: string, secret: string) => crypto.createHmac('sha256', secret).update(value).digest('base64url')
const safeCompare = (left: string, right: string) => {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
const dateInTimeZone = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === kind)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function createTrackerApp(store: TrackerStore, config: AppConfig) {
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))
  app.use(express.json({ limit: '5mb' }))

  const sessionValid = (request: Request) => {
    const value = cookies(request).weight_path_session
    if (!value) return false
    const parts = value.split('.')
    if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false
    const [expires, signature] = parts
    return Number(expires) > Date.now() && safeCompare(signature, sign(expires, config.sessionSecret))
  }
  const auth = (request: Request, response: Response, next: NextFunction) => sessionValid(request) ? next() : next(error(401, 'Authentication required.'))
  const rejectFutureDate = (date: string) => { if (date > dateInTimeZone(config.timeZone)) throw error(400, 'Future check-ins are not allowed.') }

  app.get('/health', async (_request, response) => { await store.health(); response.json({ ok: true }) })
  app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }), (request, response, next) => {
    const password = typeof request.body?.password === 'string' ? request.body.password : ''
    if (!safeCompare(password, config.appPassword)) return next(error(401, 'Incorrect password.'))
    const expires = String(Date.now() + 7 * 24 * 60 * 60 * 1000)
    // Direct HTTP is intentionally supported for this private deployment; see README for the risk.
    response.cookie('weight_path_session', `${expires}.${sign(expires, config.sessionSecret)}`, { httpOnly: true, sameSite: 'strict', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' })
    response.json({ ok: true })
  })
  app.post('/api/auth/logout', (_request, response) => {
    response.clearCookie('weight_path_session', { httpOnly: true, sameSite: 'strict', secure: false, path: '/' })
    response.status(204).end()
  })
  app.get('/api/auth/session', (request, response) => response.json({ authenticated: sessionValid(request) }))
  app.get('/api/data', auth, async (_request, response) => response.json(await store.getState()))
  app.put('/api/settings', auth, async (request, response) => {
    const parsed = parseAppSettings(request.body)
    if (!parsed.ok) throw error(400, parsed.error)
    response.json(await store.updateSettings(parsed.value))
  })
  app.put('/api/logs/:date', auth, async (request, response) => {
    if (!isDateKey(request.params.date)) throw error(400, 'Invalid log date.')
    const parsed = parseDailyLogInput(request.body)
    if (!parsed.ok) throw error(400, parsed.error)
    if (parsed.value.date !== request.params.date) throw error(400, 'Log date must match the request path.')
    rejectFutureDate(parsed.value.date)
    response.json(await store.upsertLog(parsed.value))
  })
  app.delete('/api/logs/:date', auth, async (request, response) => {
    if (!isDateKey(request.params.date)) throw error(400, 'Invalid log date.')
    if (!await store.deleteLog(request.params.date)) throw error(404, 'Log not found.')
    response.status(204).end()
  })
  app.post('/api/import', auth, async (request, response) => {
    const mode = request.query.mode === 'merge' || request.query.mode === 'replace' ? request.query.mode : null
    const rows = request.body?.logs
    if (!mode || !Array.isArray(rows)) throw error(400, 'Import must include a mode and daily records.')
    if (!rows.length) throw error(400, 'Import must contain at least one daily record.')
    if (rows.length > config.maxImportRows) throw error(413, `Import cannot contain more than ${config.maxImportRows} records.`)
    const logs: DailyLogInput[] = rows.map((row, index) => {
      const parsed = parseDailyLogInput(row)
      if (!parsed.ok) throw error(400, `Record ${index + 1}: ${parsed.error}`)
      rejectFutureDate(parsed.value.date)
      return parsed.value
    })
    if (!uniqueDates(logs)) throw error(400, 'Import contains more than one record for the same date.')
    const settings = parseAppSettings(request.body?.settings)
    if (!settings.ok) throw error(400, settings.error)
    response.json(await store.importLogs(logs, mode, settings.value))
  })

  app.use('/api', (_request, _response, next) => next(error(404, 'API route not found.')))
  app.use((cause: unknown, request: Request, response: Response, _next: NextFunction) => {
    const known = cause as Partial<ApiError> & { type?: string }
    const status = known.type === 'entity.parse.failed' ? 400 : known.type === 'entity.too.large' ? 413 : typeof known.status === 'number' ? known.status : 500
    const message = known.type === 'entity.parse.failed' ? 'Request body must contain valid JSON.' : known.type === 'entity.too.large' ? 'Request body is too large. Imports are limited to 5 MB.' : status < 500 && typeof known.message === 'string' ? known.message : 'The server could not complete that request. Please try again.'
    if (status >= 500) console.error('Weight Path API error', { method: request.method, path: request.path, cause })
    response.status(status).json({ error: message })
  })
  return app
}
