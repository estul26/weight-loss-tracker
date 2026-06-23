import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Dashboard } from './Dashboard'
import { addDays, dateKey } from '../data'
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
    expect(screen.getByText('Set a new target date')).toBeInTheDocument()
  })

  it('calculates required pace from the latest weight and days remaining', () => {
    const today = new Date()
    const paceSettings = { ...settings, startingWeightKg: 110.2, goalWeightKg: 85, planStartDate: dateKey(addDays(today, -60)), goalDate: dateKey(addDays(today, 14)) }
    const entry = { ...emptyLog(dateKey(today)), weightKg: 100, fastingHours: 18 }
    render(<Dashboard logs={[entry]} settings={paceSettings} onCheckIn={() => undefined} />)

    expect(screen.getByText('7.50 kg/week')).toBeInTheDocument()
  })

  it('shows loss progress and pace as unavailable for a non-loss target', () => {
    const entry = { ...emptyLog('2026-06-20'), weightKg: 102, fastingHours: 18 }
    render(<Dashboard logs={[entry]} settings={{ ...settings, startingWeightKg: 100, goalWeightKg: 105, goalDate: '2099-01-01' }} onCheckIn={() => undefined} />)

    expect(screen.getByText('Progress and pace are available for a goal below your plan baseline.')).toBeInTheDocument()
    expect(screen.getAllByText('Unavailable')).toHaveLength(2)
  })
})
