import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { MongoClient } from 'mongodb'
import type { AppSettings } from '../shared/tracker.js'
import { addCalendarYear } from '../shared/tracker.js'
import { createTrackerApp, type AppConfig } from './app.js'
import { MongoTrackerStore } from './store.js'

const required = (name: 'MONGO_URI' | 'APP_PASSWORD' | 'SESSION_SECRET') => {
  const value = process.env[name]
  if (!value) throw new Error(`${name} must be set`)
  return value
}
const timeZone = process.env.APP_TIME_ZONE ?? 'UTC'
try { new Intl.DateTimeFormat('en-CA', { timeZone }).format() } catch { throw new Error('APP_TIME_ZONE must be a valid IANA time zone, for example America/Edmonton.') }
const port = Number(process.env.PORT ?? 3000)
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT must be an integer between 1 and 65535.')

const config: AppConfig = { appPassword: required('APP_PASSWORD'), sessionSecret: required('SESSION_SECRET'), timeZone, maxImportRows: 5_000 }
const localDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === kind)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}
const defaults = (): AppSettings => {
  const planStartDate = localDate()
  return { heightCm: 176, startingWeightKg: 110.2, goalWeightKg: 85, planStartDate, goalDate: addCalendarYear(planStartDate) }
}

const mongo = new MongoClient(required('MONGO_URI'))
await mongo.connect()
const store = new MongoTrackerStore(mongo, mongo.db(process.env.MONGO_DB_NAME ?? 'weight_path'), defaults)
await store.initialize()

const here = path.dirname(fileURLToPath(import.meta.url))
const staticDir = path.resolve(here, '..', '..', 'dist')
const app = createTrackerApp(store, config)
app.use(express.static(staticDir, { index: false, maxAge: '1h' }))
app.get('/{*splat}', (_request, response) => response.sendFile(path.join(staticDir, 'index.html')))

const server = app.listen(port, '0.0.0.0', () => console.log(`Weight Path listening on ${port}`))
const shutdown = async () => { server.close(); await mongo.close(); process.exit(0) }
process.once('SIGINT', () => { void shutdown() })
process.once('SIGTERM', () => { void shutdown() })
