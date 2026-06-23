import { addCalendarYear, isDateKey, normalizeSettings } from '../shared/tracker'

export type { AppSettings, BackupFile, DailyLog, RefinedCarbs, RemoteState } from '../shared/tracker'
import type { AppSettings, DailyLog } from '../shared/tracker'

const localToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export { addCalendarYear, isDateKey, normalizeSettings }

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
