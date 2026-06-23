import { useEffect, useMemo, useState } from 'react'
import { addDays, average, dateFromKey, dateKey, fastingGoal, fmtDate, fmtNum, hasWeightPlateau, weekStart } from '../data'
import type { AppSettings, DailyLog } from '../types'
import { Icon, SectionTitle, Stat } from '../components/ui'

export function WeeklyReview({ logs, settings, onBack }: { logs: DailyLog[]; settings: AppSettings; onBack: () => void }) {
  const starts = useMemo(() => [...new Set(logs.map((log) => dateKey(weekStart(dateFromKey(log.date)))))] .sort().reverse(), [logs])
  const [selected, setSelected] = useState(starts[0] ?? dateKey(weekStart(new Date())))
  useEffect(() => { if (starts[0] && !starts.includes(selected)) setSelected(starts[0]) }, [starts, selected])
  const from = dateFromKey(selected); const until = dateKey(addDays(from, 6)); const goal = fastingGoal(settings)
  const weekly = logs.filter((log) => log.date >= selected && log.date <= until)
  const previous = logs.filter((log) => log.date >= dateKey(addDays(from, -7)) && log.date < selected)
  const avgWeight = average(weekly.map((log) => log.weightKg)); const previousWeight = average(previous.map((log) => log.weightKg)); const exercise = weekly.reduce((sum, log) => sum + (log.exerciseMinutes ?? 0), 0)
  const averages = starts.map((start) => average(logs.filter((log) => log.date >= start && log.date <= dateKey(addDays(dateFromKey(start), 6))).map((log) => log.weightKg))).filter((value): value is number => value != null).reverse()
  const plateau = hasWeightPlateau(averages)
  const suggestions = [plateau && 'Your trend has been steady for a few weeks. Revisit snacks, sugary drinks, and weekend rhythm with curiosity—not blame.', average(weekly.map((log) => log.hungerLevel)) != null && average(weekly.map((log) => log.hungerLevel))! >= 7 && 'Hunger ran high. A little more protein and vegetables at meals may help next week feel easier.', average(weekly.map((log) => log.sleepHours)) != null && average(weekly.map((log) => log.sleepHours))! < 7 && 'Sleep was lighter this week. A steadier wind-down can make hunger more manageable.', exercise < 100 && 'Movement was light. A short walk after one meal is a gentle place to start.', !plateau && exercise >= 100 && 'The basics are showing up. Keep next week uncomplicated and repeat what worked.'].filter(Boolean) as string[]
  return <>
    <SectionTitle eyebrow="Weekly reflection" title="Notice what supported you." subtitle="A kind look back, followed by one simple next step." action={<button className="btn-secondary" onClick={onBack}>Back to more</button>} />
    <section className="review-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Review period</p><p className="mt-1 font-bold text-slate-900">{fmtDate(selected)} – {fmtDate(until)}</p></div><select className="w-auto" value={selected} onChange={(event) => setSelected(event.target.value)}>{(starts.length ? starts : [selected]).map((start) => <option key={start} value={start}>Week of {fmtDate(start)}</option>)}</select></div><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Average weight" value={`${fmtNum(avgWeight)} kg`} /><Stat label="Weekly change" value={avgWeight != null && previousWeight != null ? `${avgWeight - previousWeight > 0 ? '+' : ''}${fmtNum(avgWeight - previousWeight)} kg` : '—'} /><Stat label="Average fast" value={`${fmtNum(average(weekly.map((log) => log.fastingHours)))} h`} hint={`Goal: ${goal}+h`} tone="green" /><Stat label="Movement" value={`${exercise} min`} hint="Logged exercise" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Mini label="Sugary drink days" value={weekly.filter((log) => log.sugaryDrink).length} /><Mini label="Snack days" value={weekly.filter((log) => log.snacks).length} /><Mini label="Late eating days" value={weekly.filter((log) => log.lateNightEating).length} /><Mini label="Average hunger" value={fmtNum(average(weekly.map((log) => log.hungerLevel)))} /><Mini label="Average sleep" value={`${fmtNum(average(weekly.map((log) => log.sleepHours)))} h`} /><Mini label="Logged days" value={weekly.length} /></div></section>
    <section className="focus-card"><span className="section-icon"><Icon name="target" className="h-5 w-5" /></span><div><p className="eyebrow">A simple focus for next week</p><ul>{suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div></section>
  </>
}

function Mini({ label, value }: { label: string; value: string | number }) { return <div className="mini-stat"><p>{label}</p><strong>{value}</strong></div> }
