import { useEffect, useMemo, useState } from 'react'
import { feedback, fmtDate } from '../data'
import { emptyLog, type DailyLog, type RefinedCarbs } from '../types'
import { Field, Icon, RangeField, SectionTitle, Toggle } from '../components/ui'

const toNumber = (value: string) => value === '' ? null : Number(value)

export function CheckIn({ logs, selectedDate, onDateChange, onSave }: { logs: DailyLog[]; selectedDate: string; onDateChange: (date: string) => void; onSave: (log: DailyLog) => Promise<DailyLog> }) {
  const existing = useMemo(() => logs.find((log) => log.date === selectedDate), [logs, selectedDate])
  const [form, setForm] = useState<DailyLog>(() => existing ?? emptyLog(selectedDate))
  const [messages, setMessages] = useState<{ kind: 'good' | 'warn'; text: string }[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(existing ? { ...existing } : emptyLog(selectedDate)); setMessages([]); setError('') }, [selectedDate, existing?.updatedAt])
  const update = <K extends keyof DailyLog>(key: K, value: DailyLog[K]) => setForm((current) => ({ ...current, [key]: value }))
  const changeDate = (date: string) => { onDateChange(date) }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const now = new Date().toISOString()
      const saved = await onSave({ ...form, id: existing?.id ?? form.id, createdAt: existing?.createdAt ?? form.createdAt, updatedAt: now })
      setForm(saved); setMessages(feedback(saved))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your check-in could not be saved. Please try again.') } finally { setSaving(false) }
  }

  return <>
    <SectionTitle eyebrow="Daily check-in" title={existing ? 'Refine your day.' : 'A small check-in is enough.'} subtitle={existing ? `Editing your record for ${fmtDate(selectedDate)}.` : 'Track honestly, then carry on with your day.'} />
    <form onSubmit={submit} className="space-y-5 pb-20 md:pb-0">
      <section className="checkin-card checkin-highlight"><div className="checkin-card-heading"><span className="section-icon"><Icon name="calendar" className="h-5 w-5" /></span><div><h2>Today’s anchor</h2><p>Start with the two details that make progress visible.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Date"><input type="date" value={form.date} onChange={(event) => changeDate(event.target.value)} required /></Field><Field label="Morning weight (kg)" hint="Optional, but useful for a clear trend."><input type="number" min="30" max="300" step="0.1" value={form.weightKg ?? ''} onChange={(event) => update('weightKg', toNumber(event.target.value))} placeholder="Example: 109.5" /></Field></div></section>

      <section className="checkin-card"><div className="checkin-card-heading"><span className="section-icon"><Icon name="trend" className="h-5 w-5" /></span><div><h2>Fasting & meals</h2><p>Capture the rhythm, not a perfect food diary.</p></div></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Eating window starts"><input type="time" value={form.eatingWindowStart} onChange={(event) => update('eatingWindowStart', event.target.value)} /></Field><Field label="Eating window ends"><input type="time" value={form.eatingWindowEnd} onChange={(event) => update('eatingWindowEnd', event.target.value)} /></Field><Field label="Fasting hours"><input type="number" min="0" max="36" step="0.5" value={form.fastingHours ?? ''} onChange={(event) => update('fastingHours', toNumber(event.target.value))} placeholder="16" /></Field><Field wide label="First meal"><textarea value={form.firstMeal} onChange={(event) => update('firstMeal', event.target.value)} placeholder="What felt satisfying?" /></Field><Field wide label="Second meal"><textarea value={form.secondMeal} onChange={(event) => update('secondMeal', event.target.value)} placeholder="Add anything useful to remember." /></Field></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Toggle label="Any snacks?" checked={form.snacks} onChange={(value) => update('snacks', value)} /><Toggle label="Any late-night eating?" checked={form.lateNightEating} onChange={(value) => update('lateNightEating', value)} /><Toggle label="Any sugary drink?" checked={form.sugaryDrink} onChange={(value) => update('sugaryDrink', value)} /><Field label="Refined carbs"><select value={form.refinedCarbs} onChange={(event) => update('refinedCarbs', event.target.value as RefinedCarbs)}><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field></div></section>

      <section className="checkin-card"><div className="checkin-card-heading"><span className="section-icon"><Icon name="check" className="h-5 w-5" /></span><div><h2>Movement & recovery</h2><p>Your energy matters just as much as the numbers.</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Exercise type"><input value={form.exerciseType} onChange={(event) => update('exerciseType', event.target.value)} placeholder="Walking, strength…" /></Field><Field label="Exercise minutes"><input type="number" min="0" max="600" value={form.exerciseMinutes ?? ''} onChange={(event) => update('exerciseMinutes', toNumber(event.target.value))} /></Field><Field label="Sleep hours"><input type="number" min="0" max="24" step="0.5" value={form.sleepHours ?? ''} onChange={(event) => update('sleepHours', toNumber(event.target.value))} /></Field><RangeField label="Hunger level" value={form.hungerLevel} onChange={(value) => update('hungerLevel', value)} /><RangeField label="Energy level" value={form.energyLevel} onChange={(value) => update('energyLevel', value)} /><RangeField label="Mood" value={form.moodLevel} onChange={(value) => update('moodLevel', value)} /></div></section>

      <section className="checkin-card"><div className="checkin-card-heading"><span className="section-icon"><Icon name="more" className="h-5 w-5" /></span><div><h2>A little reflection</h2><p>Leave a breadcrumb for tomorrow-you.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Biggest problem today"><textarea value={form.biggestProblem} onChange={(event) => update('biggestProblem', event.target.value)} /></Field><Field label="Tomorrow’s focus"><textarea value={form.tomorrowFocus} onChange={(event) => update('tomorrowFocus', event.target.value)} /></Field><Field wide label="Notes"><textarea rows={4} value={form.notes} onChange={(event) => update('notes', event.target.value)} /></Field></div></section>

      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {messages.length > 0 && <section className="space-y-2" aria-live="polite">{messages.map((message, index) => <div key={`${message.kind}-${index}`} className={`notice ${message.kind === 'good' ? 'notice-good' : 'notice-warn'}`}>{message.kind === 'good' ? '✓' : '!'} <span>{message.text}</span></div>)}</section>}
      <div className="sticky-save"><button className="btn w-full sm:w-auto" disabled={saving}>{saving ? 'Saving your check-in…' : existing ? 'Save changes' : 'Save today'}</button></div>
    </form>
  </>
}
