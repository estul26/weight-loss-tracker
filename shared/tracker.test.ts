import { describe, expect, it } from 'vitest'
import { parseAppSettings, parseDailyLogInput } from './tracker.js'

const log = (overrides: Record<string, unknown> = {}) => ({
  date: '2026-06-20', weightKg: 100, eatingWindowStart: '12:00', eatingWindowEnd: '18:00', fastingHours: 18,
  firstMeal: 'Eggs', secondMeal: '', snacks: false, lateNightEating: false, sugaryDrink: false, refinedCarbs: 'low',
  exerciseType: 'Walk', exerciseMinutes: 30, sleepHours: 7, hungerLevel: 4, energyLevel: 7, moodLevel: 7,
  notes: '', biggestProblem: '', tomorrowFocus: '', ...overrides,
})

describe('shared tracker validation', () => {
  it('accepts a complete valid log and rejects invalid clock values without coercing them', () => {
    expect(parseDailyLogInput(log()).ok).toBe(true)
    expect(parseDailyLogInput(log({ eatingWindowStart: '99:99' }))).toMatchObject({ ok: false, error: expect.stringContaining('24-hour') })
    expect(parseDailyLogInput(log({ snacks: 'false' }))).toMatchObject({ ok: false, error: expect.stringContaining('true or false') })
    expect(parseDailyLogInput(log({ refinedCarbs: 'sometimes' }))).toMatchObject({ ok: false, error: expect.stringContaining('Refined carbs') })
  })

  it('requires valid settings and a target after the plan start', () => {
    expect(parseAppSettings({ heightCm: 176, startingWeightKg: 110, goalWeightKg: 85, planStartDate: '2026-01-01', goalDate: '2027-01-01' }).ok).toBe(true)
    expect(parseAppSettings({ heightCm: 176, startingWeightKg: 110, goalWeightKg: 85, planStartDate: '2026-02-30', goalDate: '2027-01-01' }).ok).toBe(false)
    expect(parseAppSettings({ heightCm: 176, startingWeightKg: 110, goalWeightKg: 85, planStartDate: '2026-01-01', goalDate: '2026-01-01' }).ok).toBe(false)
  })
})
