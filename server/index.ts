import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { MongoClient, type Collection } from 'mongodb'

type RefinedCarbs = 'none' | 'low' | 'medium' | 'high'
interface DailyLog { id: string; date: string; weightKg: number | null; eatingWindowStart: string; eatingWindowEnd: string; fastingHours: number | null; firstMeal: string; secondMeal: string; snacks: boolean; lateNightEating: boolean; sugaryDrink: boolean; refinedCarbs: RefinedCarbs; exerciseType: string; exerciseMinutes: number | null; sleepHours: number | null; hungerLevel: number | null; energyLevel: number | null; moodLevel: number | null; notes: string; biggestProblem: string; tomorrowFocus: string; createdAt: string; updatedAt: string }
interface AppSettings { heightCm: number; startingWeightKg: number; targetLowKg: number; targetHighKg: number; planStartDate: string }
interface TrackerState { _id: 'owner'; settings: AppSettings; logs: DailyLog[]; updatedAt: string }

for (const key of ['MONGO_URI', 'APP_PASSWORD', 'SESSION_SECRET'] as const) if (!process.env[key]) throw new Error(`${key} must be set`)
const mongo = new MongoClient(process.env.MONGO_URI!)
let collection: Collection<TrackerState>
const defaults = (): AppSettings => ({ heightCm: 176, startingWeightKg: 111, targetLowKg: 92, targetHighKg: 96, planStartDate: new Date().toISOString().slice(0, 10) })
const app = express()
app.set('trust proxy', 1)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))
app.use(express.json({ limit: '1mb' }))

const cookies = (request: Request) => Object.fromEntries((request.headers.cookie ?? '').split(';').map((entry) => entry.trim().split('=').map(decodeURIComponent)).filter(([key]) => key))
const sign = (value: string) => crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(value).digest('base64url')
const safeCompare = (a: string, b: string) => { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && crypto.timingSafeEqual(left, right) }
const sessionValid = (request: Request) => { const session = cookies(request).weight_path_session; if (!session) return false; const [expires, signature] = session.split('.'); return Boolean(expires && signature && Number(expires) > Date.now() && safeCompare(signature, sign(expires))) }
const auth = (request: Request, response: Response, next: NextFunction) => sessionValid(request) ? next() : response.status(401).json({ error: 'Authentication required.' })
const nullableNumber = (value: unknown, min: number, max: number) => value == null || value === '' ? null : typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : undefined
const text = (value: unknown, max = 2000) => typeof value === 'string' ? value.slice(0, max) : ''
const bool = (value: unknown) => value === true
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const isTime = (value: unknown): value is string => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)

function cleanLog(input: unknown, existing?: DailyLog): DailyLog | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>; const date = raw.date
  if (!isDate(date) || !isTime(raw.eatingWindowStart) || !isTime(raw.eatingWindowEnd)) return null
  const weightKg = nullableNumber(raw.weightKg, 30, 300); const fastingHours = nullableNumber(raw.fastingHours, 0, 48); const exerciseMinutes = nullableNumber(raw.exerciseMinutes, 0, 1440); const sleepHours = nullableNumber(raw.sleepHours, 0, 24); const hungerLevel = nullableNumber(raw.hungerLevel, 1, 10); const energyLevel = nullableNumber(raw.energyLevel, 1, 10); const moodLevel = nullableNumber(raw.moodLevel, 1, 10)
  if (weightKg === undefined || fastingHours === undefined || exerciseMinutes === undefined || sleepHours === undefined || hungerLevel === undefined || energyLevel === undefined || moodLevel === undefined) return null
  const refinedCarbs: RefinedCarbs = ['none', 'low', 'medium', 'high'].includes(String(raw.refinedCarbs)) ? raw.refinedCarbs as RefinedCarbs : 'none'; const now = new Date().toISOString()
  return { id: existing?.id ?? (typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID()), date, weightKg, eatingWindowStart: raw.eatingWindowStart as string, eatingWindowEnd: raw.eatingWindowEnd as string, fastingHours, firstMeal: text(raw.firstMeal), secondMeal: text(raw.secondMeal), snacks: bool(raw.snacks), lateNightEating: bool(raw.lateNightEating), sugaryDrink: bool(raw.sugaryDrink), refinedCarbs, exerciseType: text(raw.exerciseType, 120), exerciseMinutes, sleepHours, hungerLevel, energyLevel, moodLevel, notes: text(raw.notes, 5000), biggestProblem: text(raw.biggestProblem), tomorrowFocus: text(raw.tomorrowFocus), createdAt: existing?.createdAt ?? now, updatedAt: now }
}
function cleanSettings(input: unknown, fallback: AppSettings): AppSettings | null { if (!input || typeof input !== 'object') return null; const raw = input as Record<string, unknown>; const heightCm = nullableNumber(raw.heightCm, 100, 250); const startingWeightKg = nullableNumber(raw.startingWeightKg, 30, 300); const targetLowKg = nullableNumber(raw.targetLowKg, 30, 300); const targetHighKg = nullableNumber(raw.targetHighKg, 30, 300); if ([heightCm, startingWeightKg, targetLowKg, targetHighKg].some((v) => v == null) || !isDate(raw.planStartDate)) return null; return { ...fallback, heightCm: heightCm!, startingWeightKg: startingWeightKg!, targetLowKg: targetLowKg!, targetHighKg: targetHighKg!, planStartDate: raw.planStartDate as string } }
async function state() { const found = await collection.findOne({ _id: 'owner' }); if (found) return found; const initial: TrackerState = { _id: 'owner', settings: defaults(), logs: [], updatedAt: new Date().toISOString() }; await collection.insertOne(initial); return initial }
async function save(next: TrackerState) { next.updatedAt = new Date().toISOString(); await collection.replaceOne({ _id: 'owner' }, next, { upsert: true }); return next }

app.get('/health', (_request, response) => response.json({ ok: true }))
app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }), (request, response) => { const password = typeof request.body?.password === 'string' ? request.body.password : ''; if (!safeCompare(password, process.env.APP_PASSWORD!)) return response.status(401).json({ error: 'Incorrect password.' }); const expires = String(Date.now() + 7 * 24 * 60 * 60 * 1000); response.cookie('weight_path_session', `${expires}.${sign(expires)}`, { httpOnly: true, sameSite: 'strict', secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' }); response.json({ ok: true }) })
app.post('/api/auth/logout', (_request, response) => { response.clearCookie('weight_path_session', { httpOnly: true, sameSite: 'strict', secure: false, path: '/' }); response.status(204).end() })
app.get('/api/auth/session', (request, response) => response.json({ authenticated: sessionValid(request) }))
app.get('/api/data', auth, async (_request, response) => response.json(await state()))
app.put('/api/settings', auth, async (request, response) => { const current = await state(); const settings = cleanSettings(request.body, current.settings); if (!settings) return response.status(400).json({ error: 'Invalid settings.' }); current.settings = settings; response.json(await save(current)) })
app.put('/api/logs/:date', auth, async (request, response) => { if (!isDate(request.params.date) || request.body?.date !== request.params.date) return response.status(400).json({ error: 'Invalid log date.' }); const current = await state(); const index = current.logs.findIndex((log) => log.date === request.params.date); const log = cleanLog(request.body, index >= 0 ? current.logs[index] : undefined); if (!log) return response.status(400).json({ error: 'Invalid daily log.' }); if (index >= 0) current.logs[index] = log; else current.logs.push(log); await save(current); response.json(log) })
app.delete('/api/logs/:id', auth, async (request, response) => { const current = await state(); const before = current.logs.length; current.logs = current.logs.filter((log) => log.id !== request.params.id); if (current.logs.length === before) return response.status(404).json({ error: 'Log not found.' }); await save(current); response.status(204).end() })
app.post('/api/import', auth, async (request, response) => { const mode = request.query.mode === 'replace' ? 'replace' : request.query.mode === 'merge' ? 'merge' : null; if (!mode || !Array.isArray(request.body?.logs)) return response.status(400).json({ error: 'Invalid import.' }); const current = await state(); const rows = request.body.logs as unknown[]; const incoming = rows.map((log) => cleanLog(log)).filter((log: DailyLog | null): log is DailyLog => Boolean(log)); if (incoming.length !== rows.length) return response.status(400).json({ error: 'One or more imported records are invalid.' }); const settings = request.body.settings ? cleanSettings(request.body.settings, current.settings) : current.settings; if (!settings) return response.status(400).json({ error: 'Invalid imported settings.' }); current.logs = mode === 'replace' ? incoming : [...current.logs.filter((log) => !incoming.some((item: DailyLog) => item.date === log.date)), ...incoming]; if (mode === 'replace') current.settings = settings; response.json(await save(current)) })

const here = path.dirname(fileURLToPath(import.meta.url)); const staticDir = path.resolve(here, '..', 'dist')
app.use(express.static(staticDir, { index: false, maxAge: '1h' }))
app.get('/{*splat}', (_request, response) => response.sendFile(path.join(staticDir, 'index.html')))

await mongo.connect(); collection = mongo.db(process.env.MONGO_DB_NAME ?? 'weight_path').collection<TrackerState>('tracker_state'); await state()
const port = Number(process.env.PORT ?? 3000); app.listen(port, '0.0.0.0', () => console.log(`Weight Path listening on ${port}`))
