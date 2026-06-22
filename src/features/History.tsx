import { useMemo, useRef, useState } from 'react'
import { addDays, dateKey, fmtDate, fmtNum } from '../data'
import { backup } from '../storage'
import { emptyLog, type AppSettings, type DailyLog, type RefinedCarbs } from '../types'
import { Dialog, EmptyState, Icon, SectionTitle } from '../components/ui'

const csvColumns: (keyof DailyLog)[] = ['id', 'date', 'weightKg', 'eatingWindowStart', 'eatingWindowEnd', 'fastingHours', 'firstMeal', 'secondMeal', 'snacks', 'lateNightEating', 'sugaryDrink', 'refinedCarbs', 'exerciseType', 'exerciseMinutes', 'sleepHours', 'hungerLevel', 'energyLevel', 'moodLevel', 'notes', 'biggestProblem', 'tomorrowFocus', 'createdAt', 'updatedAt']
const csvValue = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
const toNumber = (value: string) => value === '' ? null : Number(value)

type PendingImport = { logs: DailyLog[]; settings?: AppSettings; name: string }

export function History({ logs, settings, onEdit, onDelete, onImport }: { logs: DailyLog[]; settings: AppSettings; onEdit: (log: DailyLog) => void; onDelete: (log: DailyLog) => Promise<void>; onImport: (logs: DailyLog[], mode: 'merge' | 'replace', settings?: AppSettings) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DailyLog | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cutoff = period === 'week' ? dateKey(addDays(new Date(), -6)) : dateKey(addDays(new Date(), -29))
  const shown = useMemo(() => logs.filter((log) => (period === 'all' || log.date >= cutoff) && log.date.includes(query)), [logs, period, cutoff, query])
  const selectedRows = selected.length ? logs.filter((log) => selected.includes(log.id)) : logs
  const choose = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const chooseAll = (checked: boolean) => setSelected(checked ? [...new Set([...selected, ...shown.map((log) => log.id)])] : selected.filter((id) => !shown.some((log) => log.id === id)))
  const exportData = (kind: 'csv' | 'json') => {
    const date = dateKey(new Date())
    if (kind === 'json') download(`weight-path-${date}.json`, 'application/json', JSON.stringify(backup(settings, selectedRows), null, 2))
    else download(`weight-path-${date}.csv`, 'text/csv', [csvColumns.join(','), ...selectedRows.map((row) => csvColumns.map((key) => csvValue(row[key])).join(','))].join('\n'))
  }
  const parseImport = async (file: File) => {
    setError('')
    try { setPendingImport(await parseBackup(file)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'This file could not be read.') } finally { if (fileRef.current) fileRef.current.value = '' }
  }
  const runImport = async (mode: 'merge' | 'replace') => {
    if (!pendingImport) return
    setBusy(true); setError('')
    try { await onImport(pendingImport.logs, mode, pendingImport.settings); setPendingImport(null); setConfirmReplace(false) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Import failed. Your current records are unchanged.') } finally { setBusy(false) }
  }
  const runDelete = async () => { if (!deleteTarget) return; setBusy(true); setError(''); try { await onDelete(deleteTarget); setDeleteTarget(null); setSelected((current) => current.filter((id) => id !== deleteTarget.id)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete this record.') } finally { setBusy(false) } }

  return <>
    <SectionTitle eyebrow="Your record" title="History, on your terms." subtitle="Search, revisit, back up, or restore every daily check-in." action={<button className="btn-secondary" onClick={() => fileRef.current?.click()}><Icon name="history" className="h-4 w-4" />Import</button>} />
    <input ref={fileRef} className="sr-only" type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => event.target.files?.[0] && void parseImport(event.target.files[0])} />
    {error && <div className="notice notice-error mb-4" role="alert">{error}</div>}
    <section className="history-toolbar"><label className="search-field"><span className="sr-only">Search date</span><input placeholder="Search date (YYYY-MM-DD)" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="filter-tabs" aria-label="History period">{(['all', 'week', 'month'] as const).map((item) => <button key={item} type="button" aria-pressed={period === item} className={period === item ? 'is-active' : ''} onClick={() => setPeriod(item)}>{item === 'all' ? 'All time' : `Last ${item}`}</button>)}</div><p>{selected.length ? `${selected.length} selected` : `${shown.length} record${shown.length === 1 ? '' : 's'}`}</p></section>
    <section className="export-bar"><span>{selected.length ? `Exporting ${selected.length} selected record${selected.length === 1 ? '' : 's'}` : 'Export your full record'}</span><div><button className="btn-secondary" disabled={!logs.length} onClick={() => exportData('csv')}>CSV</button><button className="btn-secondary" disabled={!logs.length} onClick={() => exportData('json')}>JSON</button>{selected.length > 0 && <button className="text-link ml-3" onClick={() => setSelected([])}>Clear selection</button>}</div></section>
    {!shown.length ? <EmptyState icon="history" title="No records here yet" body={logs.length ? 'Try a wider date range or clear your search.' : 'Your completed check-ins will live here, ready whenever you need them.'} /> : <>
      <div className="history-cards md:hidden">{shown.map((log) => <HistoryCard key={log.id} log={log} checked={selected.includes(log.id)} onChoose={() => choose(log.id)} onEdit={() => onEdit(log)} onDelete={() => setDeleteTarget(log)} />)}</div>
      <div className="history-table hidden md:block"><table><thead><tr><th><input aria-label="Select visible records" type="checkbox" checked={shown.length > 0 && shown.every((log) => selected.includes(log.id))} onChange={(event) => chooseAll(event.target.checked)} /></th><th>Date</th><th>Weight</th><th>Fast</th><th>Food flags</th><th>Exercise</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map((log) => <tr key={log.id}><td><input aria-label={`Select ${fmtDate(log.date)}`} type="checkbox" checked={selected.includes(log.id)} onChange={() => choose(log.id)} /></td><td className="font-semibold">{fmtDate(log.date)}</td><td>{log.weightKg == null ? '—' : `${fmtNum(log.weightKg)} kg`}</td><td>{log.fastingHours == null ? '—' : `${fmtNum(log.fastingHours)} h`}</td><td>{flags(log)}</td><td>{log.exerciseMinutes ? `${log.exerciseMinutes} min` : '—'}</td><td className="whitespace-nowrap"><button className="text-link" onClick={() => onEdit(log)}>Edit</button><button className="text-link danger-link" onClick={() => setDeleteTarget(log)}>Delete</button></td></tr>)}</tbody></table></div>
    </>}
    {pendingImport && !confirmReplace && <Dialog title="Import your records" onClose={() => setPendingImport(null)}><p className="dialog-copy"><b>{pendingImport.logs.length} record{pendingImport.logs.length === 1 ? '' : 's'}</b> found in {pendingImport.name}. How should they be added?</p><div className="dialog-actions"><button className="btn-secondary" disabled={busy} onClick={() => void runImport('merge')}>Merge records</button><button className="btn-danger" disabled={busy} onClick={() => setConfirmReplace(true)}>Replace all records</button></div><p className="dialog-note">Merge replaces only matching dates. Replace removes your current records first.</p></Dialog>}
    {pendingImport && confirmReplace && <Dialog title="Replace all current records?" onClose={() => setConfirmReplace(false)}><p className="dialog-copy">This will permanently replace your existing {logs.length} record{logs.length === 1 ? '' : 's'} with the {pendingImport.logs.length} record{pendingImport.logs.length === 1 ? '' : 's'} in this import.</p><div className="dialog-actions"><button className="btn-secondary" disabled={busy} onClick={() => setConfirmReplace(false)}>Go back</button><button className="btn-danger" disabled={busy} onClick={() => void runImport('replace')}>{busy ? 'Replacing…' : 'Yes, replace records'}</button></div></Dialog>}
    {deleteTarget && <Dialog title="Delete this check-in?" onClose={() => setDeleteTarget(null)}><p className="dialog-copy">The record for <b>{fmtDate(deleteTarget.date)}</b> will be permanently deleted.</p><div className="dialog-actions"><button className="btn-secondary" disabled={busy} onClick={() => setDeleteTarget(null)}>Keep record</button><button className="btn-danger" disabled={busy} onClick={() => void runDelete()}>{busy ? 'Deleting…' : 'Delete record'}</button></div></Dialog>}
  </>
}

function HistoryCard({ log, checked, onChoose, onEdit, onDelete }: { log: DailyLog; checked: boolean; onChoose: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className="history-card"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{fmtDate(log.date)}</p><p className="mt-1 text-sm text-slate-500">{log.weightKg == null ? 'No weigh-in' : `${fmtNum(log.weightKg)} kg`} · {log.fastingHours == null ? 'No fast logged' : `${fmtNum(log.fastingHours)} h fast`}</p></div><input aria-label={`Select ${fmtDate(log.date)}`} type="checkbox" checked={checked} onChange={onChoose} /></div><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{flags(log)}</p><div className="mt-4 flex gap-4"><button className="text-link" onClick={onEdit}>Edit</button><button className="text-link danger-link" onClick={onDelete}>Delete</button></div></article>
}

function flags(log: DailyLog) { return [log.sugaryDrink && 'Sugar', log.snacks && 'Snacks', log.lateNightEating && 'Late eating'].filter(Boolean).join(' · ') || 'Clear day' }
function download(name: string, type: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url) }

async function parseBackup(file: File): Promise<PendingImport> {
  const text = await file.text(); let entries: DailyLog[] = []; let settings: AppSettings | undefined
  if (file.name.toLowerCase().endsWith('.json')) { const data = JSON.parse(text) as { logs?: DailyLog[]; settings?: AppSettings }; if (!Array.isArray(data.logs)) throw new Error('This JSON backup does not contain daily records.'); entries = data.logs; settings = data.settings }
  else { const [headerRow, ...csvRows] = parseCsv(text); const headers = headerRow ?? []; entries = csvRows.filter((values) => values.some(Boolean)).map((values) => { const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])); const log = emptyLog(row.date); Object.assign(log, row, { weightKg: toNumber(row.weightKg), fastingHours: toNumber(row.fastingHours), exerciseMinutes: toNumber(row.exerciseMinutes), sleepHours: toNumber(row.sleepHours), hungerLevel: toNumber(row.hungerLevel), energyLevel: toNumber(row.energyLevel), moodLevel: toNumber(row.moodLevel), snacks: row.snacks === 'true', lateNightEating: row.lateNightEating === 'true', sugaryDrink: row.sugaryDrink === 'true', refinedCarbs: (['none', 'low', 'medium', 'high'].includes(row.refinedCarbs) ? row.refinedCarbs : 'none') as RefinedCarbs }); return log }) }
  if (!entries.length || entries.some((entry) => !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))) throw new Error('No valid dated records were found in this file.')
  return { logs: entries, settings, name: file.name }
}

function parseCsv(text: string) { const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false; for (let index = 0; index < text.length; index++) { const char = text[index]; if (char === '"') { if (quoted && text[index + 1] === '"') { value += '"'; index++ } else quoted = !quoted } else if (char === ',' && !quoted) { row.push(value); value = '' } else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[index + 1] === '\n') index++; row.push(value); rows.push(row); row = []; value = '' } else value += char } if (value || row.length) { row.push(value); rows.push(row) } return rows }
