import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Dashboard } from './Dashboard'
import { emptyLog, type AppSettings } from '../types'

const settings: AppSettings = { heightCm: 180, startingWeightKg: 110, goalWeightKg: 95, planStartDate: '2025-01-01', goalDate: '2026-01-01' }

describe('Dashboard', () => {
  it('shows the saved exact target and its deadline instead of a hard-coded range', () => {
    const entry = { ...emptyLog('2026-06-20'), weightKg: 100, fastingHours: 18 }
    render(<Dashboard logs={[entry]} settings={settings} onCheckIn={() => undefined} />)
    expect(screen.getByText('Goal 95 kg by Jan 1')).toBeInTheDocument()
    expect(screen.getByText('Required pace')).toBeInTheDocument()
    expect(screen.getByText('Current weight')).toBeInTheDocument()
    expect(screen.getByText('100.0')).toBeInTheDocument()
  })

  it('shows an achieved goal with a zero required pace', () => {
    const entry = { ...emptyLog('2026-06-20'), weightKg: 90, fastingHours: 18 }
    render(<Dashboard logs={[entry]} settings={{ ...settings, goalDate: '2099-01-01' }} onCheckIn={() => undefined} />)
    expect(screen.getByText('Goal achieved')).toBeInTheDocument()
    expect(screen.getByText('0.0 kg/week')).toBeInTheDocument()
  })

  it('shows an elapsed deadline without a negative countdown', () => {
    const entry = { ...emptyLog('2026-06-20'), weightKg: 100, fastingHours: 18 }
    render(<Dashboard logs={[entry]} settings={{ ...settings, goalDate: '2000-01-01' }} onCheckIn={() => undefined} />)
    expect(screen.getByText(/days past target date/)).toBeInTheDocument()
  })
})
