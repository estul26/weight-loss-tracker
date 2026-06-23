export type RefinedCarbs = 'none' | 'low' | 'medium' | 'high'

export interface DailyLog {
  id: string
  date: string
  weightKg: number | null
  eatingWindowStart: string
  eatingWindowEnd: string
  fastingHours: number | null
  firstMeal: string
  secondMeal: string
  snacks: boolean
  lateNightEating: boolean
  sugaryDrink: boolean
  refinedCarbs: RefinedCarbs
  exerciseType: string
  exerciseMinutes: number | null
  sleepHours: number | null
  hungerLevel: number | null
  energyLevel: number | null
  moodLevel: number | null
  notes: string
  biggestProblem: string
  tomorrowFocus: string
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  heightCm: number
  startingWeightKg: number
  goalWeightKg: number
  planStartDate: string
  goalDate: string
}

export interface BackupFile {
  version: 2
  exportedAt: string
  settings: AppSettings
  logs: DailyLog[]
}

const localToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const isDateKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

export const addCalendarYear = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  const nextYear = year + 1
  const lastDayOfMonth = new Date(nextYear, month, 0).getDate()
  return `${nextYear}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDayOfMonth)).padStart(2, '0')}`
}

const validNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback

/** Makes pre-goal-range browser data safe to use with the current app. */
export const normalizeSettings = (value: unknown, fallback: AppSettings): AppSettings => {
  if (!value || typeof value !== 'object') return fallback
  const raw = value as Record<string, unknown>
  const planStartDate = isDateKey(raw.planStartDate) ? raw.planStartDate : fallback.planStartDate
  const legacyGoal = raw.targetHighKg
  const goalWeightKg = validNumber(raw.goalWeightKg, validNumber(legacyGoal, fallback.goalWeightKg))
  return {
    heightCm: validNumber(raw.heightCm, fallback.heightCm),
    startingWeightKg: validNumber(raw.startingWeightKg, fallback.startingWeightKg),
    goalWeightKg,
    planStartDate,
    goalDate: isDateKey(raw.goalDate) ? raw.goalDate : addCalendarYear(planStartDate),
  }
}

const createId = () => {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  const bytes = new Uint8Array(16)
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes)
  else for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const defaultPlanStartDate = localToday()

export const defaultSettings: AppSettings = {
  heightCm: 176,
  startingWeightKg: 110.2,
  goalWeightKg: 85,
  planStartDate: defaultPlanStartDate,
  goalDate: addCalendarYear(defaultPlanStartDate),
}

export const emptyLog = (date = localToday()): DailyLog => {
  const now = new Date().toISOString()
  return {
    id: createId(), date, weightKg: null, eatingWindowStart: '12:00', eatingWindowEnd: '18:00', fastingHours: null,
    firstMeal: '', secondMeal: '', snacks: false, lateNightEating: false, sugaryDrink: false, refinedCarbs: 'none',
    exerciseType: '', exerciseMinutes: null, sleepHours: null, hungerLevel: null, energyLevel: null, moodLevel: null,
    notes: '', biggestProblem: '', tomorrowFocus: '', createdAt: now, updatedAt: now,
  }
}
