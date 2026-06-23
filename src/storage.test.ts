import { describe, expect, it } from 'vitest'
import { backup, clearLegacyData, loadData } from './storage'
import type { AppSettings } from './types'

const settings: AppSettings = { heightCm: 176, startingWeightKg: 101.5, goalWeightKg: 85, planStartDate: '2026-06-20', goalDate: '2027-06-20' }

describe('backup', () => {
  it('exports the dated-goal settings in version 2 backups', () => {
    const result = backup(settings, [])
    expect(result.version).toBe(2)
    expect(result.settings).toEqual(settings)
  })

  it('normalizes legacy logs before migration and removes them only when asked', () => {
    localStorage.setItem('weight-path-data-v1', JSON.stringify({ settings, logs: [{ date: '2026-06-20', weightKg: 100, eatingWindowStart: '12:00', eatingWindowEnd: '18:00', fastingHours: 18, firstMeal: '', secondMeal: '', snacks: false, lateNightEating: false, sugaryDrink: false, refinedCarbs: 'none', exerciseType: '', exerciseMinutes: null, sleepHours: null, hungerLevel: null, energyLevel: null, moodLevel: null, notes: '', biggestProblem: '', tomorrowFocus: '' }, { date: 'not-a-date' }] }))
    expect(loadData().logs).toHaveLength(1)
    expect(loadData().invalidLogCount).toBe(1)
    clearLegacyData()
    expect(localStorage.getItem('weight-path-data-v1')).toBeNull()
  })
})
