import { describe, expect, it } from 'vitest'
import { backup } from './storage'
import type { AppSettings } from './types'

const settings: AppSettings = { heightCm: 176, startingWeightKg: 101.5, goalWeightKg: 85, planStartDate: '2026-06-20', goalDate: '2027-06-20' }

describe('backup', () => {
  it('exports the dated-goal settings in version 2 backups', () => {
    const result = backup(settings, [])
    expect(result.version).toBe(2)
    expect(result.settings).toEqual(settings)
  })
})
