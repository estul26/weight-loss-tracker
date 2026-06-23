import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyLog, type AppSettings } from './types'

const api = vi.hoisted(() => ({ session: vi.fn(), login: vi.fn(), logout: vi.fn(), data: vi.fn(), settings: vi.fn(), log: vi.fn(), deleteLog: vi.fn(), import: vi.fn() }))
vi.mock('./api', () => ({ api }))

import App from './App'

const settings: AppSettings = { heightCm: 176, startingWeightKg: 110, goalWeightKg: 85, planStartDate: '2026-01-01', goalDate: '2027-01-01' }

describe('App startup and legacy migration', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('offers a merge migration even when MongoDB already has records, then clears local data after success', async () => {
    const legacy = { ...emptyLog('2026-06-01'), weightKg: 100 }
    const remote = { ...emptyLog('2026-06-02'), weightKg: 99 }
    localStorage.setItem('weight-path-data-v1', JSON.stringify({ settings, logs: [legacy] }))
    api.session.mockResolvedValue({ authenticated: true })
    api.data.mockResolvedValue({ settings, logs: [remote] })
    api.import.mockResolvedValue({ settings, logs: [legacy, remote] })

    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Move them to MongoDB' }))

    await waitFor(() => expect(api.import).toHaveBeenCalledWith({ settings, logs: [expect.objectContaining({ date: '2026-06-01' })] }, 'merge'))
    await waitFor(() => expect(localStorage.getItem('weight-path-data-v1')).toBeNull())
    expect(screen.getByText('Your browser records were moved to MongoDB.')).toBeInTheDocument()
  })

  it('shows a retry screen instead of incorrectly sending an unavailable session back to login', async () => {
    api.session.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ authenticated: false })

    render(<App />)
    expect(await screen.findByText('Connection problem')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByLabelText('Private app password')).toBeInTheDocument()
  })
})
