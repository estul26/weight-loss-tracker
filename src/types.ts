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
  targetLowKg: number
  targetHighKg: number
  planStartDate: string
}

export interface BackupFile {
  version: 1
  exportedAt: string
  settings: AppSettings
  logs: DailyLog[]
}

const localToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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

export const defaultSettings: AppSettings = {
  heightCm: 176,
  startingWeightKg: 111,
  targetLowKg: 92,
  targetHighKg: 96,
  planStartDate: localToday(),
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
