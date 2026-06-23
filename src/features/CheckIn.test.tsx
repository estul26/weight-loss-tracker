import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CheckIn } from './CheckIn'
import { dateKey } from '../data'
import { emptyLog } from '../types'

describe('CheckIn', () => {
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
})
