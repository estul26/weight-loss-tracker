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
    id: crypto.randomUUID(), date, weightKg: null, eatingWindowStart: '12:00', eatingWindowEnd: '18:00', fastingHours: null,
    firstMeal: '', secondMeal: '', snacks: false, lateNightEating: false, sugaryDrink: false, refinedCarbs: 'none',
    exerciseType: '', exerciseMinutes: null, sleepHours: null, hungerLevel: null, energyLevel: null, moodLevel: null,
    notes: '', biggestProblem: '', tomorrowFocus: '', createdAt: now, updatedAt: now,
  }
}
