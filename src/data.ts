import type { AppSettings, DailyLog } from './types'

/** A local calendar date, deliberately not a UTC ISO date. */
export const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export const dateFromKey = (key: string) => new Date(`${key}T12:00:00`)
export const fmtDate = (key: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => dateFromKey(key).toLocaleDateString(undefined, options)
export const fmtNum = (n: number | null | undefined, decimals = 1) => n == null || Number.isNaN(n) ? '—' : n.toFixed(decimals)
export const average = (values: Array<number | null | undefined>) => {
  const actual = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return actual.length ? actual.reduce((a, b) => a + b, 0) / actual.length : null
}
export const latestLog = (logs: DailyLog[]) => [...logs].filter((l) => l.weightKg != null).sort((a, b) => b.date.localeCompare(a.date))[0]
export const bmi = (weight: number, heightCm: number) => weight / ((heightCm / 100) ** 2)
export const weekStart = (input: Date) => {
  const date = new Date(input); date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}
export const addDays = (date: Date, days: number) => { const out = new Date(date); out.setDate(out.getDate() + days); return out }
export const planMonth = (start: string) => {
  const from = dateFromKey(start); const now = new Date();
  return Math.max(1, Math.min(12, (now.getFullYear() - from.getFullYear()) * 12 + now.getMonth() - from.getMonth() + 1))
}
export const fastingGoal = (settings: AppSettings) => {
  const month = planMonth(settings.planStartDate)
  if (month === 1) return 12
  if (month <= 3) return 16
  if (month <= 9) return 18
  return 16
}
export const targetProgress = (weight: number, settings: AppSettings) => {
  const distance = settings.startingWeightKg - settings.goalWeightKg
  if (distance <= 0) return 0
  return Math.max(0, Math.min(100, ((settings.startingWeightKg - weight) / distance) * 100))
}
export const weightChange = (weight: number, settings: AppSettings) => settings.startingWeightKg - weight
export const calendarDayDifference = (from: string, until: string) => {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [untilYear, untilMonth, untilDay] = until.split('-').map(Number)
  return Math.round((Date.UTC(untilYear, untilMonth - 1, untilDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86_400_000)
}
export const goalDaysRemaining = (settings: AppSettings, today = dateKey(new Date())) => calendarDayDifference(today, settings.goalDate)
export const requiredWeeklyLoss = (settings: AppSettings) => {
  const totalDays = calendarDayDifference(settings.planStartDate, settings.goalDate)
  const remainingLoss = settings.startingWeightKg - settings.goalWeightKg
  return totalDays > 0 && remainingLoss > 0 ? remainingLoss / (totalDays / 7) : 0
}
export const trendChange = (logs: DailyLog[]) => {
  const weights = logs.filter((log) => log.weightKg != null).sort((a, b) => a.date.localeCompare(b.date))
  if (weights.length < 2) return null
  return weights.at(-1)!.weightKg! - weights[0].weightKg!
}
export const currentStreak = (logs: DailyLog[], goal: number) => {
  const byDate = new Map(logs.map((log) => [log.date, log])); let cursor = new Date(); let count = 0
  while (true) { const log = byDate.get(dateKey(cursor)); if (!log || (log.fastingHours ?? 0) < goal) break; count++; cursor = addDays(cursor, -1) }
  return count
}
export const compliance = (logs: DailyLog[], goal: number) => {
  if (!logs.length) return null
  const score = logs.reduce((sum, log) => sum + ((log.fastingHours ?? 0) >= goal ? 30 : 0) + (!log.sugaryDrink ? 20 : 0) + (!log.snacks ? 15 : 0) + (!log.lateNightEating ? 15 : 0) + (['none', 'low'].includes(log.refinedCarbs) ? 10 : 0) + ((log.exerciseMinutes ?? 0) >= 20 ? 5 : 0) + ((log.sleepHours ?? 0) >= 7 ? 5 : 0), 0)
  return Math.round(score / logs.length)
}
export function feedback(log: DailyLog) {
  const messages: { kind: 'good' | 'warn'; text: string }[] = []
  if (log.sugaryDrink) messages.push({ kind: 'warn', text: 'Sugar may make progress harder. Choose water, tea, or coffee without sugar tomorrow.' })
  if (log.snacks) messages.push({ kind: 'warn', text: 'Frequent eating may keep insulin high. Plan satisfying meals instead of snacks.' })
  if (log.lateNightEating) messages.push({ kind: 'warn', text: 'Try closing your eating window earlier to support your fasting routine.' })
  if ((log.fastingHours ?? 0) >= 16) messages.push({ kind: 'good', text: 'Great work: 16+ fasting hours is a strong step toward your goal.' })
  if ((log.exerciseMinutes ?? 0) >= 30) messages.push({ kind: 'good', text: 'Nice work moving for 30+ minutes today.' })
  if ((log.hungerLevel ?? 0) >= 8) messages.push({ kind: 'warn', text: 'High hunger: add more protein and vegetables to your meals.' })
  return messages.length ? messages : [{ kind: 'good' as const, text: 'Log saved. Honest tracking is the habit that matters.' }]
}
