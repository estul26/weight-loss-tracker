import { describe, expect, it } from 'vitest'
import { compliance, currentStreak, dateKey, fastingGoal, targetProgress, trendChange } from './data'
import { emptyLog, type AppSettings } from './types'

const settings: AppSettings = { heightCm: 170, startingWeightKg: 100, targetLowKg: 80, targetHighKg: 85, planStartDate: '2026-06-01' }
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

  it('calculates fasting goals, streaks, and compliance', () => {
    expect(fastingGoal(settings)).toBe(12)
    const today = dateKey(new Date())
    const yesterday = dateKey(new Date(new Date().setDate(new Date().getDate() - 1)))
    const records = [log(today, 95), log(yesterday, 95.2)]
    expect(currentStreak(records, 16)).toBe(2)
    expect(compliance(records, 16)).toBe(100)
  })
})
