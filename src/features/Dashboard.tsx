import { useMemo, useState } from 'react'
import { addDays, average, compliance, currentStreak, dateKey, fastingGoal, fmtDate, fmtNum, goalDaysRemaining, latestLog, requiredWeeklyLoss, targetProgress, trendChange, weightChange, weekStart } from '../data'
import type { AppSettings, DailyLog } from '../types'
import { EmptyState, Icon, SectionTitle, Stat } from '../components/ui'

type Range = 7 | 30 | 90
type Point = { label: string; value: number }

export function Dashboard({ logs, settings, onCheckIn }: { logs: DailyLog[]; settings: AppSettings; onCheckIn: () => void }) {
  const [range, setRange] = useState<Range>(30)
  const today = new Date()
  const latest = latestLog(logs)
  const currentWeight = latest?.weightKg ?? settings.startingWeightKg
  const cutoff = dateKey(addDays(today, -(range - 1)))
  const periodLogs = useMemo(() => logs.filter((log) => log.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date)), [logs, cutoff])
  const weightPoints = periodLogs.filter((log) => log.weightKg != null).map((log) => ({ label: fmtDate(log.date), value: log.weightKg! }))
  const fastingPoints = periodLogs.map((log) => ({ label: fmtDate(log.date), value: log.fastingHours ?? 0 }))
  const goal = fastingGoal(settings)
  const week = logs.filter((log) => log.date >= dateKey(weekStart(today)) && log.date <= dateKey(addDays(weekStart(today), 6)))
  const todayLogged = logs.some((log) => log.date === dateKey(today))
  const trend = trendChange(periodLogs)
  const progress = targetProgress(currentWeight, settings)
  const sevenDays = logs.filter((log) => log.date >= dateKey(addDays(today, -6)))
  const daysRemaining = goalDaysRemaining(settings, dateKey(today))
  const weeklyPace = requiredWeeklyLoss(currentWeight, settings, dateKey(today))
  const isLossPlan = settings.goalWeightKg < settings.startingWeightKg
  const goalReached = isLossPlan && currentWeight <= settings.goalWeightKg
  const deadlineLabel = !isLossPlan ? 'Weight-loss tracking unavailable' : goalReached ? 'Goal achieved' : daysRemaining < 0 ? `${Math.abs(daysRemaining)} days past target date` : `${daysRemaining} days remaining`
  const paceLabel = !isLossPlan ? 'Unavailable' : goalReached ? '0.0 kg/week' : weeklyPace == null ? 'Set a new target date' : `${fmtNum(weeklyPace, 2)} kg/week`

  return <>
    <SectionTitle eyebrow="Your progress" title={latest ? 'Steady days add up.' : 'Your path starts here.'} subtitle={latest ? `Last weigh-in ${fmtDate(latest.date)} · Your target is ${fmtNum(settings.goalWeightKg, 0)} kg by ${fmtDate(settings.goalDate)}.` : `Your target is ${fmtNum(settings.goalWeightKg, 0)} kg by ${fmtDate(settings.goalDate)}.`} action={<button className="btn" onClick={onCheckIn}><Icon name="check" className="h-4 w-4" />{todayLogged ? 'Update today' : 'Log today'}</button>} />

    <section className="progress-hero">
      <div className="progress-hero-main"><div className="flex items-center gap-2 text-emerald-950/70"><span className="hero-icon"><Icon name="trend" className="h-5 w-5" /></span><span className="text-sm font-semibold">Current weight</span></div><p className="hero-weight">{fmtNum(currentWeight)} <span>kg</span></p><p className="mt-1 text-sm text-emerald-950/70">{latest ? `${fmtNum(weightChange(currentWeight, settings))} kg from your starting point` : `Starting point: ${fmtNum(settings.startingWeightKg)} kg`}</p></div>
      <div className="progress-hero-side"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-emerald-950">Path to target</span><span className="font-bold text-emerald-800">{progress == null ? 'Unavailable' : `${Math.round(progress)}%`}</span></div>{progress == null ? <p className="mt-3 text-sm text-emerald-950/70">Progress and pace are available for a goal below your plan baseline.</p> : <div className="progress-track" role="progressbar" aria-label="Progress toward target weight" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div>}<div className="flex justify-between text-xs text-emerald-950/65"><span>Start {fmtNum(settings.startingWeightKg, 1)}</span><span>Goal {fmtNum(settings.goalWeightKg, 0)} kg</span></div><div className="hero-target"><Icon name="target" className="h-4 w-4" />Goal {fmtNum(settings.goalWeightKg, 0)} kg by {fmtDate(settings.goalDate)}</div><div className="hero-goal-meta"><div><span>Deadline</span><b>{deadlineLabel}</b></div><div><span>Required pace</span><b>{paceLabel}</b></div></div></div>
    </section>

    <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="7-day average" value={`${fmtNum(average(sevenDays.map((log) => log.weightKg)))} kg`} hint={sevenDays.length ? `${sevenDays.length} logged day${sevenDays.length === 1 ? '' : 's'}` : 'Add a weigh-in to begin'} /><Stat label={`${range}-day trend`} value={trend == null ? '—' : `${trend > 0 ? '+' : ''}${fmtNum(trend)} kg`} hint={trend == null ? 'Two weigh-ins reveal a trend' : trend <= 0 ? 'Moving in your chosen direction' : 'A normal fluctuation'} tone={trend != null && trend <= 0 ? 'green' : trend != null ? 'amber' : 'plain'} /><Stat label="Fasting streak" value={`${currentStreak(logs, goal)} days`} hint={`Current goal: ${goal}+ hours`} tone="soft" /><Stat label="This week" value={compliance(week, goal) == null ? '—' : `${compliance(week, goal)}%`} hint="Routine score" tone="green" /></section>

    <section className="mt-7 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <ChartCard title="Weight trend" subtitle="See the signal, not every single fluctuation." range={range} onRange={setRange} empty={!weightPoints.length} emptyAction={<button className="btn-secondary mt-4" onClick={onCheckIn}>Add a weigh-in</button>}><LineChart points={weightPoints} goal={settings.goalWeightKg} /></ChartCard>
      <ChartCard title="Fasting rhythm" subtitle={`Your ${goal}+ hour goal is shown in deep green.`} range={range} onRange={setRange} empty={!fastingPoints.length} emptyAction={<button className="btn-secondary mt-4" onClick={onCheckIn}>Log today</button>}><BarChart points={fastingPoints} goal={goal} /></ChartCard>
    </section>

    <section className="today-card"><span className="today-icon"><Icon name="calendar" className="h-5 w-5" /></span><div><p className="eyebrow">Today’s gentle focus</p><h2>{todayLogged ? 'Your check-in is safely recorded.' : `Aim for a ${goal}+ hour fast and one satisfying meal rhythm.`}</h2><p>{todayLogged ? 'Come back whenever you want to add a note, then let the day be the day.' : 'Protein, vegetables, water, and a little movement are enough to make today count.'}</p></div>{!todayLogged && <button className="text-link" onClick={onCheckIn}>Check in <Icon name="arrow" className="h-4 w-4" /></button>}</section>
  </>
}

function ChartCard({ title, subtitle, range, onRange, empty, emptyAction, children }: { title: string; subtitle: string; range: Range; onRange: (range: Range) => void; empty: boolean; emptyAction: React.ReactNode; children: React.ReactNode }) {
  return <section className="chart-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2>{title}</h2><p>{subtitle}</p></div><div className="range-tabs" aria-label={`${title} date range`}>{([7, 30, 90] as Range[]).map((item) => <button type="button" key={item} aria-pressed={range === item} className={range === item ? 'is-active' : ''} onClick={() => onRange(item)}>{item}d</button>)}</div></div>{empty ? <EmptyState icon="trend" title="No data in this range" body="Your chart will take shape as you record a few days." action={emptyAction} /> : <div className="mt-5">{children}</div>}</section>
}

function LineChart({ points, goal }: { points: Point[]; goal: number }) {
  const width = 520; const height = 220
  const values = [...points.map((point) => point.value), goal]
  const min = Math.min(...values) - 0.5; const max = Math.max(...values) + 0.5
  const x = (index: number) => points.length === 1 ? width / 2 : (index / (points.length - 1)) * (width - 12) + 6
  const y = (value: number) => height - 28 - ((value - min) / (max - min || 1)) * (height - 56)
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`).join(' ')
  return <div><svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Weight trend chart"><line x1="6" x2={width - 6} y1={y(goal)} y2={y(goal)} className="chart-goal" /><text x={width - 8} y={y(goal) - 6} textAnchor="end" className="chart-label">Goal {fmtNum(goal)} kg</text><line x1="6" x2={width - 6} y1={height - 28} y2={height - 28} className="chart-baseline" /><path d={path} className="chart-line" />{points.map((point, index) => <circle key={`${point.label}-${index}`} cx={x(index)} cy={y(point.value)} r="4" className="chart-dot"><title>{point.label}: {fmtNum(point.value)} kg</title></circle>)}</svg><div className="chart-axis"><span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span></div></div>
}

function BarChart({ points, goal }: { points: Point[]; goal: number }) {
  const width = 360; const height = 220; const max = Math.max(goal + 2, 20, ...points.map((point) => point.value)); const bar = (width - 12) / points.length
  const y = (value: number) => height - 28 - (value / max) * (height - 56)
  return <div><svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="Fasting hours chart"><line x1="6" x2={width - 6} y1={y(goal)} y2={y(goal)} className="chart-goal" /><text x={width - 8} y={y(goal) - 6} textAnchor="end" className="chart-label">{goal}h goal</text><line x1="6" x2={width - 6} y1={height - 28} y2={height - 28} className="chart-baseline" />{points.map((point, index) => { const barHeight = Math.max(2, (point.value / max) * (height - 56)); return <rect key={`${point.label}-${index}`} x={6 + index * bar + bar * 0.18} y={height - 28 - barHeight} width={Math.max(3, bar * 0.64)} height={barHeight} rx="4" className={point.value >= goal ? 'chart-bar-good' : 'chart-bar'}><title>{point.label}: {fmtNum(point.value)} hours</title></rect> })}</svg><div className="chart-axis"><span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span></div></div>
}
