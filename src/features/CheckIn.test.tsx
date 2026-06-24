import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CheckIn, fastingHoursForWindow } from './CheckIn'
import { dateKey } from '../data'
import { emptyLog } from '../types'

describe('CheckIn', () => {
  afterEach(() => vi.useRealTimers())

  it('calculates fasting hours from a same-day eating window', () => {
    expect(fastingHoursForWindow('12:00', '18:00')).toBe(18)
    expect(fastingHoursForWindow('12:17', '18:42')).toBe(17.6)
    expect(fastingHoursForWindow('18:00', '18:00')).toBeNull()
    expect(fastingHoursForWindow('18:00', '12:00')).toBeNull()
  })

  it('loads the selected date record instead of retaining the previous draft', () => {
    const first = { ...emptyLog('2026-06-01'), weightKg: 101 }
    const second = { ...emptyLog('2026-06-02'), weightKg: 99 }
    const props = { logs: [first, second], onDateChange: () => undefined, onSave: async () => first }
    const view = render(<CheckIn {...props} selectedDate="2026-06-01" />)
    expect(screen.getByDisplayValue('101')).toBeInTheDocument()
    view.rerender(<CheckIn {...props} selectedDate="2026-06-02" />)
    expect(screen.getByDisplayValue('99')).toBeInTheDocument()
  })

  it('shows an inline error when saving fails', async () => {
    render(<CheckIn logs={[]} selectedDate="2026-06-02" onDateChange={() => undefined} onSave={async () => { throw new Error('Network unavailable') }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save today' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable')
  })

  it('does not offer future dates in the check-in date picker', () => {
    render(<CheckIn logs={[]} selectedDate="2026-06-02" onDateChange={() => undefined} onSave={async () => emptyLog('2026-06-02')} />)
    expect(screen.getByLabelText('Date')).toHaveAttribute('max', dateKey(new Date()))
  })

  it('applies an eating-window preset and saves its calculated fasting hours', async () => {
    const onSave = vi.fn(async (log: ReturnType<typeof emptyLog>) => log)
    render(<CheckIn logs={[]} selectedDate="2026-06-02" onDateChange={() => undefined} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: '12–8 · 16h' }))
    expect(screen.getByLabelText('Eating window starts')).toHaveValue('12:00')
    expect(screen.getByLabelText('Eating window ends')).toHaveValue('20:00')
    expect(screen.getByText('16 h')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save today' }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0].fastingHours).toBe(16)
  })

  it('shows live-time shortcuts only for today and uses the local time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-24T13:37:00'))
    const props = { logs: [], onDateChange: () => undefined, onSave: async () => emptyLog('2026-06-24') }
    const view = render(<CheckIn {...props} selectedDate="2026-06-24" />)
    fireEvent.click(screen.getByRole('button', { name: 'Start now' }))
    expect(screen.getByLabelText('Eating window starts')).toHaveValue('13:37')
    view.rerender(<CheckIn {...props} selectedDate="2026-06-23" />)
    expect(screen.queryByRole('button', { name: 'Start now' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'End now' })).not.toBeInTheDocument()
  })

  it('blocks saving an invalid eating window', () => {
    render(<CheckIn logs={[]} selectedDate="2026-06-02" onDateChange={() => undefined} onSave={async () => emptyLog('2026-06-02')} />)
    fireEvent.change(screen.getByLabelText('Eating window ends'), { target: { value: '12:00' } })
    expect(screen.getByRole('alert')).toHaveTextContent('End time must be later than start time')
    expect(screen.getByRole('button', { name: 'Save today' })).toBeDisabled()
  })
})
