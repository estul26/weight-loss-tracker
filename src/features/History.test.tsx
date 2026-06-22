import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { History } from './History'
import { emptyLog, type AppSettings } from '../types'

const settings: AppSettings = { heightCm: 176, startingWeightKg: 111, targetLowKg: 92, targetHighKg: 96, planStartDate: '2026-01-01' }

describe('History confirmations', () => {
  it('uses an in-app dialog before deleting a record', () => {
    const record = { ...emptyLog('2026-06-20'), weightKg: 100 }
    render(<History logs={[record]} settings={settings} onEdit={() => undefined} onDelete={async () => undefined} onImport={async () => undefined} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(screen.getByRole('dialog', { name: 'Delete this check-in?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep record' })).toBeInTheDocument()
  })

  it('asks the user to choose merge or replace after reading an import', async () => {
    const record = { ...emptyLog('2026-06-20'), weightKg: 100 }
    const view = render(<History logs={[record]} settings={settings} onEdit={() => undefined} onDelete={async () => undefined} onImport={async () => undefined} />)
    const file = new File([JSON.stringify({ settings, logs: [record] })], 'weight-path.json', { type: 'application/json' })
    const input = view.container.querySelector('input[type="file"]')!
    fireEvent.change(input, { target: { files: [file] } })
    expect(await screen.findByRole('dialog', { name: 'Import your records' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Merge records' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace all records' })).toBeInTheDocument()
  })
})
