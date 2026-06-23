export const refinedCarbValues = ['none', 'low', 'medium', 'high'] as const

export type RefinedCarbs = (typeof refinedCarbValues)[number]

export interface DailyLog {
  id: string
  date: string
  weightKg: number | null
  eatingWindowStart: string
  eatingWindowEnd: string
  fastingHours: number | null
  firstMeal: string
  secondMeal: string
  snacks: boolean
  lateNightEating: boolean
  sugaryDrink: boolean
  refinedCarbs: RefinedCarbs
  exerciseType: string
  exerciseMinutes: number | null
  sleepHours: number | null
  hungerLevel: number | null
  energyLevel: number | null
  moodLevel: number | null
  notes: string
  biggestProblem: string
  tomorrowFocus: string
  createdAt: string
  updatedAt: string
}

/** Data accepted from clients before the server assigns immutable metadata. */
export type DailyLogInput = Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>

export interface AppSettings {
  heightCm: number
  startingWeightKg: number
  goalWeightKg: number
  planStartDate: string
  goalDate: string
}

export interface BackupFile {
  version: 2
  exportedAt: string
  settings: AppSettings
  logs: DailyLog[]
}

export interface RemoteState {
  settings: AppSettings
  logs: DailyLog[]
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const fail = <T>(error: string): ParseResult<T> => ({ ok: false, error })
const pass = <T>(value: T): ParseResult<T> => ({ ok: true, value })

export const isDateKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

export const isTimeKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

export const addCalendarYear = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  const nextYear = year + 1
  const lastDayOfMonth = new Date(nextYear, month, 0).getDate()
  return `${nextYear}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDayOfMonth)).padStart(2, '0')}`
}

const numberInRange = (value: unknown, min: number, max: number): number | null => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null
const nullableNumber = (value: unknown, min: number, max: number): number | null | undefined => value === null ? null : numberInRange(value, min, max) ?? undefined
const requiredText = (value: unknown, name: string, max: number): ParseResult<string> => typeof value === 'string' && value.length <= max ? pass(value) : fail(`${name} must be text no longer than ${max} characters.`)
const requiredBoolean = (value: unknown, name: string): ParseResult<boolean> => typeof value === 'boolean' ? pass(value) : fail(`${name} must be true or false.`)

export function parseDailyLogInput(value: unknown): ParseResult<DailyLogInput> {
  const raw = object(value)
  if (!raw) return fail('Daily log must be an object.')
  if (!isDateKey(raw.date)) return fail('Daily log date must be a real YYYY-MM-DD date.')
  if (!isTimeKey(raw.eatingWindowStart) || !isTimeKey(raw.eatingWindowEnd)) return fail('Eating window times must use valid 24-hour HH:MM values.')

  const weightKg = nullableNumber(raw.weightKg, 30, 300)
  const fastingHours = nullableNumber(raw.fastingHours, 0, 48)
  const exerciseMinutes = nullableNumber(raw.exerciseMinutes, 0, 1440)
  const sleepHours = nullableNumber(raw.sleepHours, 0, 24)
  const hungerLevel = nullableNumber(raw.hungerLevel, 1, 10)
  const energyLevel = nullableNumber(raw.energyLevel, 1, 10)
  const moodLevel = nullableNumber(raw.moodLevel, 1, 10)
  if ([weightKg, fastingHours, exerciseMinutes, sleepHours, hungerLevel, energyLevel, moodLevel].some((item) => item === undefined)) return fail('Daily log contains a number outside its allowed range.')
  if (!refinedCarbValues.includes(raw.refinedCarbs as RefinedCarbs)) return fail('Refined carbs must be none, low, medium, or high.')

  const firstMeal = requiredText(raw.firstMeal, 'First meal', 2_000)
  const secondMeal = requiredText(raw.secondMeal, 'Second meal', 2_000)
  const exerciseType = requiredText(raw.exerciseType, 'Exercise type', 120)
  const notes = requiredText(raw.notes, 'Notes', 5_000)
  const biggestProblem = requiredText(raw.biggestProblem, 'Biggest problem', 2_000)
  const tomorrowFocus = requiredText(raw.tomorrowFocus, 'Tomorrow focus', 2_000)
  const snacks = requiredBoolean(raw.snacks, 'Snacks')
  const lateNightEating = requiredBoolean(raw.lateNightEating, 'Late-night eating')
  const sugaryDrink = requiredBoolean(raw.sugaryDrink, 'Sugary drink')
  const textFields = [firstMeal, secondMeal, exerciseType, notes, biggestProblem, tomorrowFocus]
  const boolFields = [snacks, lateNightEating, sugaryDrink]
  const failed = [...textFields, ...boolFields].find((result) => !result.ok)
  if (failed && !failed.ok) return fail(failed.error)

  return pass({
    date: raw.date,
    weightKg: weightKg!,
    eatingWindowStart: raw.eatingWindowStart,
    eatingWindowEnd: raw.eatingWindowEnd,
    fastingHours: fastingHours!,
    firstMeal: firstMeal.ok ? firstMeal.value : '',
    secondMeal: secondMeal.ok ? secondMeal.value : '',
    snacks: snacks.ok ? snacks.value : false,
    lateNightEating: lateNightEating.ok ? lateNightEating.value : false,
    sugaryDrink: sugaryDrink.ok ? sugaryDrink.value : false,
    refinedCarbs: raw.refinedCarbs as RefinedCarbs,
    exerciseType: exerciseType.ok ? exerciseType.value : '',
    exerciseMinutes: exerciseMinutes!,
    sleepHours: sleepHours!,
    hungerLevel: hungerLevel!,
    energyLevel: energyLevel!,
    moodLevel: moodLevel!,
    notes: notes.ok ? notes.value : '',
    biggestProblem: biggestProblem.ok ? biggestProblem.value : '',
    tomorrowFocus: tomorrowFocus.ok ? tomorrowFocus.value : '',
  })
}

export function parseDailyLog(value: unknown): ParseResult<DailyLog> {
  const raw = object(value)
  if (!raw) return fail('Daily log must be an object.')
  const input = parseDailyLogInput(raw)
  if (!input.ok) return input
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 200) return fail('Daily log has an invalid identifier.')
  if (typeof raw.createdAt !== 'string' || Number.isNaN(Date.parse(raw.createdAt)) || typeof raw.updatedAt !== 'string' || Number.isNaN(Date.parse(raw.updatedAt))) return fail('Daily log has invalid timestamps.')
  return pass({ ...input.value, id: raw.id, createdAt: raw.createdAt, updatedAt: raw.updatedAt })
}

export function parseAppSettings(value: unknown): ParseResult<AppSettings> {
  const raw = object(value)
  if (!raw) return fail('Settings must be an object.')
  const heightCm = numberInRange(raw.heightCm, 100, 250)
  const startingWeightKg = numberInRange(raw.startingWeightKg, 30, 300)
  const goalWeightKg = numberInRange(raw.goalWeightKg, 30, 300)
  if (heightCm == null || startingWeightKg == null || goalWeightKg == null) return fail('Settings contain a number outside its allowed range.')
  if (!isDateKey(raw.planStartDate) || !isDateKey(raw.goalDate)) return fail('Plan dates must be real YYYY-MM-DD dates.')
  if (raw.goalDate <= raw.planStartDate) return fail('Goal date must be after the plan start date.')
  return pass({ heightCm, startingWeightKg, goalWeightKg, planStartDate: raw.planStartDate, goalDate: raw.goalDate })
}

export function parseRemoteState(value: unknown): ParseResult<RemoteState> {
  const raw = object(value)
  if (!raw || !Array.isArray(raw.logs)) return fail('Server response is missing tracker data.')
  const settings = parseAppSettings(raw.settings)
  if (!settings.ok) return fail(`Server returned invalid settings: ${settings.error}`)
  const logs: DailyLog[] = []
  for (let index = 0; index < raw.logs.length; index++) {
    const log = parseDailyLog(raw.logs[index])
    if (!log.ok) return fail(`Server returned invalid record ${index + 1}: ${log.error}`)
    logs.push(log.value)
  }
  if (new Set(logs.map((log) => log.date)).size !== logs.length) return fail('Server returned duplicate daily records.')
  return pass({ settings: settings.value, logs })
}

/** Makes pre-goal-range browser and database data safe to open without accepting it as a new API write. */
export function normalizeSettings(value: unknown, fallback: AppSettings): AppSettings {
  const raw = object(value)
  if (!raw) return fallback
  const planStartDate = isDateKey(raw.planStartDate) ? raw.planStartDate : fallback.planStartDate
  const goalWeightKg = numberInRange(raw.goalWeightKg ?? raw.targetHighKg, 30, 300) ?? fallback.goalWeightKg
  const candidate = {
    heightCm: numberInRange(raw.heightCm, 100, 250) ?? fallback.heightCm,
    startingWeightKg: numberInRange(raw.startingWeightKg, 30, 300) ?? fallback.startingWeightKg,
    goalWeightKg,
    planStartDate,
    goalDate: isDateKey(raw.goalDate) ? raw.goalDate : addCalendarYear(planStartDate),
  }
  return parseAppSettings(candidate).ok ? candidate : fallback
}

export const uniqueDates = (logs: readonly DailyLogInput[]) => new Set(logs.map((log) => log.date)).size === logs.length
