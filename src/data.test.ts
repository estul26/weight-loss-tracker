import { describe, expect, it } from 'vitest'
import { compliance, currentStreak, dateKey, fastingGoal, goalDaysRemaining, requiredWeeklyLoss, targetProgress, trendChange } from './data'
import { addCalendarYear, defaultSettings, emptyLog, isDateKey, normalizeSettings, type AppSettings } from './types'

const settings: AppSettings = { heightCm: 170, startingWeightKg: 100, goalWeightKg: 85, planStartDate: '2026-06-01', goalDate: '2027-06-01' }
const log = (date: string, weightKg: number, fastingHours = 16) => ({ ...emptyLog(date), weightKg, fastingHours, exerciseMinutes: 20, sleepHours: 7 })

describe('tracker calculations', () => {
  it('uses the local calendar date instead of converting to UTC', () => {
    const localDate = new Date(2026, 0, 5, 23, 45)
    expect(dateKey(localDate)).toBe('2026-01-05')
  })

  it('calculates bounded target progress and trends from weight logs', () => {
    expect(targetProgress(92.5, settings)).toBe(50)
    expect(targetProgress(110, settings)).toBe(0)
    expect(targetProgress(80, settings)).toBe(100)
    expect(trendChange([log('2026-06-02', 96), log('2026-06-01', 98)])).toBe(-2)
  })

  it('calculates a calendar-year deadline and the pace required from the current weight', () => {
    expect(addCalendarYear('2024-02-29')).toBe('2025-02-28')
    expect(isDateKey('2026-02-30')).toBe(false)
    expect(goalDaysRemaining(settings, '2026-06-01')).toBe(365)
    expect(goalDaysRemaining(settings, '2027-06-02')).toBe(-1)
    expect(requiredWeeklyLoss(92.5, settings, '2026-12-01')).toBeCloseTo(7.5 / (182 / 7))
    expect(requiredWeeklyLoss(84, settings, '2026-12-01')).toBe(0)
    expect(requiredWeeklyLoss(92.5, settings, '2027-06-02')).toBeNull()
  })

  it('uses the personal 110.2 kg default and marks loss metrics unavailable for non-loss targets', () => {
    const nonLossSettings = { ...settings, goalWeightKg: 105 }
    expect(defaultSettings.startingWeightKg).toBe(110.2)
    expect(targetProgress(100, nonLossSettings)).toBeNull()
    expect(requiredWeeklyLoss(100, nonLossSettings, '2026-12-01')).toBeNull()
  })

  it('normalizes legacy target ranges from older saved data and backups', () => {
    expect(normalizeSettings({ heightCm: 170, startingWeightKg: 100, targetLowKg: 80, targetHighKg: 85, planStartDate: '2026-06-01' }, settings)).toEqual(settings)
  })

  it('calculates fasting goals, streaks, and compliance', () => {
    expect(fastingGoal(settings)).toBe(12)
    const today = dateKey(new Date())
    const yesterday = dateKey(new Date(new Date().setDate(new Date().getDate() - 1)))
    const records = [log(today, 95), log(yesterday, 95.2)]
    expect(currentStreak(records, 16)).toBe(2)
    expect(compliance(records, 16)).toBe(100)
  })

  it('can create a daily log without crypto.randomUUID', () => {
    const originalRandomUuid = globalThis.crypto.randomUUID
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined })
    expect(emptyLog('2026-06-03').id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: originalRandomUuid })
  })
})
