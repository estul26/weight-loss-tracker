import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Settings } from './Settings'
import { emptyLog, type AppSettings } from '../types'

const settings: AppSettings = { heightCm: 176, startingWeightKg: 111, goalWeightKg: 92, planStartDate: '2026-01-01', goalDate: '2027-01-01' }

describe('Settings', () => {
  it('starts an 85 kg plan from the latest weighted log and snapshots a one-year deadline', async () => {
    const save = vi.fn(async () => undefined)
    const older = { ...emptyLog('2026-06-01'), weightKg: 104 }
    const latest = { ...emptyLog('2026-06-20'), weightKg: 101.5 }
    render(<Settings settings={settings} logs={[older, latest]} onSave={save} onBack={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: 'Start/restart 85 kg plan' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith({ ...settings, startingWeightKg: 101.5, goalWeightKg: 85, planStartDate: '2026-06-20', goalDate: '2027-06-20' }))
  })

  it('does not allow a new plan without a recorded weight', () => {
    render(<Settings settings={settings} logs={[emptyLog('2026-06-20')]} onSave={async () => undefined} onBack={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Start/restart 85 kg plan' })).toBeDisabled()
    expect(screen.getByText('Log a morning weight before starting a new plan.')).toBeInTheDocument()
  })

  it('saves a height change without moving the captured plan baseline', async () => {
    const save = vi.fn(async () => undefined)
    const latest = { ...emptyLog('2026-06-20'), weightKg: 101.5 }
    render(<Settings settings={settings} logs={[latest]} onSave={save} onBack={() => undefined} />)

    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '180' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith({ ...settings, heightCm: 180 }))
  })
})
