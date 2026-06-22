import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Dashboard } from './Dashboard'
import { emptyLog, type AppSettings } from '../types'

const settings: AppSettings = { heightCm: 180, startingWeightKg: 110, targetLowKg: 90, targetHighKg: 95, planStartDate: '2025-01-01' }

describe('Dashboard', () => {
  it('shows saved target settings instead of a hard-coded target', () => {
    const entry = { ...emptyLog('2026-06-20'), weightKg: 100, fastingHours: 18 }
    render(<Dashboard logs={[entry]} settings={settings} onCheckIn={() => undefined} />)
    expect(screen.getByText('Target range 90–95 kg')).toBeInTheDocument()
    expect(screen.getByText('Current weight')).toBeInTheDocument()
    expect(screen.getByText('100.0')).toBeInTheDocument()
  })
})
