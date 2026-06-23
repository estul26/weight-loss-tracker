import { useEffect, useMemo, useState } from 'react'
import { fastingGoal, fmtDate, fmtNum, latestLog, planMonth } from '../data'
import { addCalendarYear, isDateKey, type AppSettings, type DailyLog } from '../types'
import { Field, Icon, SectionTitle } from '../components/ui'

const numberOr = (value: string, fallback: number) => value === '' ? fallback : Number(value)

export function Settings({ settings, logs, onSave, onBack }: { settings: AppSettings; logs: DailyLog[]; onSave: (settings: AppSettings) => Promise<void>; onBack: () => void }) {
  const [form, setForm] = useState(settings); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false)
  const latestWeight = useMemo(() => latestLog(logs), [logs])
  useEffect(() => setForm(settings), [settings])
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => { setSaved(false); setForm((current) => ({ ...current, [key]: value })) }
  const valid = (next: AppSettings) => {
    if (!Number.isFinite(next.startingWeightKg) || next.startingWeightKg < 30 || next.startingWeightKg > 300) return 'Enter a starting weight between 30 and 300 kg.'
    if (!Number.isFinite(next.goalWeightKg) || next.goalWeightKg < 30 || next.goalWeightKg > 300) return 'Enter a goal weight between 30 and 300 kg.'
    if (!isDateKey(next.planStartDate) || !isDateKey(next.goalDate) || next.goalDate <= next.planStartDate) return 'Your goal date must be after your plan start date.'
    return ''
  }
  const save = async (next: AppSettings) => {
    const message = valid(next); setError(message); setSaved(false); if (message) return
    setSaving(true)
    try { await onSave(next); setSaved(true) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your settings could not be saved. Please try again.') } finally { setSaving(false) }
  }
  const submit = async (event: React.FormEvent) => { event.preventDefault(); await save(form) }
  const startPlan = async () => {
    if (latestWeight?.weightKg == null) return
    const planStartDate = latestWeight.date
    const next = { ...form, startingWeightKg: latestWeight.weightKg, planStartDate, goalDate: addCalendarYear(planStartDate) }
    setForm(next)
    await save(next)
  }
  const month = planMonth(form.planStartDate); const goal = fastingGoal(form)
  const stages = [{ title: 'Month 1', fast: '12:12 to 14:10', focus: 'Settle into a steady rhythm: fewer sugary drinks, fewer snacks, and a comfortable eating window.', active: month === 1 }, { title: 'Months 2–3', fast: '16:8 to 18:6', focus: 'Build satisfying meals around protein and vegetables, with a dependable eating window.', active: month >= 2 && month <= 3 }, { title: 'Months 4–6', fast: '18:6 most days', focus: 'Keep consistency simple: walking, strength work, and meals that keep you full.', active: month >= 4 && month <= 6 }, { title: 'Months 7–9', fast: '18:6, with flexibility', focus: 'Notice plateaus with curiosity and make small adjustments to hidden snacks or carbs.', active: month >= 7 && month <= 9 }, { title: 'Months 10–12', fast: 'Stable 16:8 or 18:6', focus: 'Practice the version of this routine you can comfortably sustain long term.', active: month >= 10 }]
  return <>
    <SectionTitle eyebrow="Goals & plan" title="Make the path yours." subtitle="Your dashboard and plan use these private settings—nothing is hard-coded." action={<button className="btn-secondary" onClick={onBack}>Back to more</button>} />
    <form onSubmit={submit} className="settings-card"><div className="checkin-card-heading"><span className="section-icon"><Icon name="settings" className="h-5 w-5" /></span><div><h2>Your personal baseline</h2><p>Keep your height, plan baseline, and exact goal current. Adjusting your baseline does not change your plan dates.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Height (cm)"><input type="number" min="100" max="250" value={form.heightCm} onChange={(event) => update('heightCm', numberOr(event.target.value, form.heightCm))} /></Field><Field label="Starting weight (kg)"><input type="number" min="30" max="300" step="0.1" value={form.startingWeightKg} onChange={(event) => update('startingWeightKg', numberOr(event.target.value, form.startingWeightKg))} /></Field><Field label="Goal weight (kg)"><input type="number" min="30" max="300" step="0.1" value={form.goalWeightKg} onChange={(event) => update('goalWeightKg', numberOr(event.target.value, form.goalWeightKg))} /></Field></div>{error && <div className="notice notice-error mt-5" role="alert">{error}</div>}{saved && <div className="notice notice-good mt-5" role="status">✓ Your personal settings are saved.</div>}<button className="btn mt-5" disabled={saving}>{saving ? 'Saving settings…' : 'Save settings'}</button></form>
    <section className="plan-overview"><div><p className="eyebrow">Your plan right now</p><h2>Month {month} · {goal}+ hour fasting goal</h2><p>From {fmtNum(form.startingWeightKg)} kg on {fmtDate(form.planStartDate)}, your exact target is {fmtNum(form.goalWeightKg)} kg by {fmtDate(form.goalDate)}.</p></div><div className="mt-5"><button type="button" className="btn-secondary" disabled={saving || !latestWeight} onClick={() => void startPlan()}>{saving ? 'Saving plan…' : 'Start/restart plan'}</button><p className="mt-3 text-xs text-emerald-50/80">{latestWeight ? `This will snapshot your latest weigh-in of ${fmtNum(latestWeight.weightKg)} kg from ${fmtDate(latestWeight.date)}, preserve your ${fmtNum(form.goalWeightKg)} kg target, and set its one-year deadline.` : 'Log a morning weight before starting a new plan.'}</p></div></section>
    <section className="mt-5 space-y-3">{stages.map((stage) => <article key={stage.title} className={`plan-stage ${stage.active ? 'is-current' : ''}`}><div className="flex flex-wrap items-center justify-between gap-2"><h2>{stage.title}</h2>{stage.active && <span>Current stage</span>}</div><dl><div><dt>Fasting rhythm</dt><dd>{stage.fast}</dd></div><div><dt>Focus</dt><dd>{stage.focus}</dd></div></dl></article>)}</section>
  </>
}
