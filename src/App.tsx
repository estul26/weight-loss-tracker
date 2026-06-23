import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { dateKey } from './data'
import { Dashboard } from './features/Dashboard'
import { CheckIn } from './features/CheckIn'
import { History } from './features/History'
import { WeeklyReview } from './features/Review'
import { Settings } from './features/Settings'
import { Rules } from './features/Rules'
import { Icon, type IconName } from './components/ui'
import { clearLegacyData, loadData } from './storage'
import type { AppSettings, DailyLog } from './types'

type Page = 'home' | 'checkin' | 'history' | 'more' | 'review' | 'settings' | 'rules'
type NavItem = { id: Extract<Page, 'home' | 'checkin' | 'history' | 'more'>; label: string; icon: IconName }
const navigation: NavItem[] = [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'checkin', label: 'Check-in', icon: 'check' }, { id: 'history', label: 'History', icon: 'history' }, { id: 'more', label: 'More', icon: 'more' }]

function App() {
  const legacy = useMemo(loadData, [])
  const [settings, setSettings] = useState(legacy.settings)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [page, setPage] = useState<Page>('home')
  const [checkInDate, setCheckInDate] = useState(dateKey(new Date()))
  const [notice, setNotice] = useState('')
  const [errorNotice, setErrorNotice] = useState('')
  const [auth, setAuth] = useState<'checking' | 'out' | 'in' | 'unavailable'>('checking')
  const [migrationAvailable, setMigrationAvailable] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing')
  const [loadError, setLoadError] = useState('')

  const loadRemote = async () => {
    setSyncStatus('syncing')
    const data = await api.data()
    setSettings(data.settings)
    setLogs(data.logs)
    setMigrationAvailable(legacy.logs.length > 0 && legacy.invalidLogCount === 0)
    setSyncStatus('synced')
  }
  const bootstrap = async () => {
    setAuth('checking'); setLoadError('')
    try {
      const { authenticated } = await api.session()
      if (!authenticated) { setAuth('out'); setSyncStatus('offline'); return }
      await loadRemote()
      setAuth('in')
    } catch (cause) {
      setSyncStatus('offline')
      setLoadError(cause instanceof Error ? cause.message : 'Weight Path could not reach the server.')
      setAuth('unavailable')
    }
  }
  useEffect(() => { void bootstrap() }, [])
  const ordered = useMemo(() => [...logs].sort((a, b) => b.date.localeCompare(a.date)), [logs])
  const navigate = (next: Page) => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openCheckIn = (date = dateKey(new Date())) => { setCheckInDate(date); navigate('checkin') }
  const saveLog = async (entry: DailyLog) => {
    setSyncStatus('syncing')
    try {
      const saved = await api.log(entry)
      setLogs((items) => { const index = items.findIndex((item) => item.date === saved.date); return index >= 0 ? items.map((item, itemIndex) => itemIndex === index ? saved : item) : [...items, saved] })
      setErrorNotice(''); setNotice('Your daily check-in is saved.'); setSyncStatus('synced')
      return saved
    } catch (cause) { setSyncStatus('offline'); throw cause }
  }
  const removeLog = async (log: DailyLog) => {
    setSyncStatus('syncing')
    try { await api.deleteLog(log.date); setLogs((items) => items.filter((item) => item.date !== log.date)); setErrorNotice(''); setNotice('Daily check-in deleted.'); setSyncStatus('synced') } catch (cause) { setSyncStatus('offline'); throw cause }
  }
  const importLogs = async (entries: DailyLog[], mode: 'merge' | 'replace', incomingSettings?: AppSettings) => {
    setSyncStatus('syncing')
    try { const data = await api.import({ settings: incomingSettings ?? settings, logs: entries }, mode); setSettings(data.settings); setLogs(data.logs); setErrorNotice(''); setNotice(`${entries.length} record${entries.length === 1 ? '' : 's'} imported.`); setSyncStatus('synced') } catch (cause) { setSyncStatus('offline'); throw cause }
  }
  const saveSettings = async (next: AppSettings) => {
    setSyncStatus('syncing')
    try { const data = await api.settings(next); setSettings(data.settings); setErrorNotice(''); setSyncStatus('synced') } catch (cause) { setSyncStatus('offline'); throw cause }
  }
  const logout = async () => {
    try { await api.logout(); setAuth('out'); setLogs([]); setNotice(''); setErrorNotice(''); setSyncStatus('offline') } catch (cause) { setSyncStatus('offline'); setErrorNotice(cause instanceof Error ? `Could not log out: ${cause.message}` : 'Could not log out. Please try again.') }
  }
  const migrate = async () => {
    setSyncStatus('syncing')
    try {
      const data = await api.import({ settings: legacy.settings, logs: legacy.logs }, 'merge')
      setSettings(data.settings); setLogs(data.logs); clearLegacyData(); setMigrationAvailable(false); setErrorNotice(''); setNotice('Your browser records were moved to MongoDB.'); setSyncStatus('synced')
    } catch (cause) { setSyncStatus('offline'); setErrorNotice(cause instanceof Error ? `Could not move browser records: ${cause.message}` : 'Could not move browser records.') }
  }

  if (auth === 'checking') return <LoadingScreen />
  if (auth === 'unavailable') return <ConnectionScreen error={loadError} onRetry={() => void bootstrap()} />
  if (auth === 'out') return <Login onLogin={async (password) => {
    await api.login(password)
    try { await loadRemote(); setAuth('in') } catch (cause) {
      setSyncStatus('offline')
      setLoadError(cause instanceof Error ? cause.message : 'Weight Path could not load your data.')
      setAuth('unavailable')
    }
  }} />

  const primaryPage: NavItem['id'] = page === 'review' || page === 'settings' || page === 'rules' ? 'more' : page
  return <div className="app-shell">
    <header className="app-header"><div className="app-header-inner"><button onClick={() => navigate('home')} className="brand" aria-label="Weight Path home"><span>W</span><span><b>Weight Path</b><small>Private daily tracker</small></span></button><nav className="desktop-nav" aria-label="Main navigation">{navigation.map((item) => <NavButton key={item.id} item={item} active={primaryPage === item.id} onClick={() => item.id === 'checkin' ? openCheckIn() : navigate(item.id)} />)}</nav><div className="header-actions"><span className="sync-status" role="status">{syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Saving…' : 'Sync unavailable'}</span><button className="logout-button" onClick={() => void logout()}>Log out</button></div></div></header>
    <main className="app-main">
      {legacy.invalidLogCount > 0 && <div className="notice notice-error mb-5" role="alert">{legacy.invalidLogCount} old browser record{legacy.invalidLogCount === 1 ? ' is' : 's are'} malformed and will not be moved automatically. Keep that browser data until it can be repaired or exported manually.</div>}
      {migrationAvailable && <div className="notice notice-info mb-5"><span>Daily logs from the old browser-only app are ready to move.</span><button className="btn-secondary" onClick={() => void migrate()}>Move them to MongoDB</button></div>}
      {errorNotice && <div className="notice notice-error mb-5" role="alert"><span>{errorNotice}</span><button className="icon-button" onClick={() => setErrorNotice('')} aria-label="Dismiss error">×</button></div>}
      {notice && <div className="notice notice-good mb-5" role="status"><span>{notice}</span><button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
      {page === 'home' && <Dashboard logs={ordered} settings={settings} onCheckIn={() => openCheckIn()} />}
      {page === 'checkin' && <CheckIn logs={logs} selectedDate={checkInDate} onDateChange={setCheckInDate} onSave={saveLog} />}
      {page === 'history' && <History logs={ordered} settings={settings} onEdit={(log) => openCheckIn(log.date)} onDelete={removeLog} onImport={importLogs} />}
      {page === 'more' && <More onNavigate={navigate} />}
      {page === 'review' && <WeeklyReview logs={logs} settings={settings} onBack={() => navigate('more')} />}
      {page === 'settings' && <Settings settings={settings} logs={logs} onSave={saveSettings} onBack={() => navigate('more')} />}
      {page === 'rules' && <Rules onBack={() => navigate('more')} />}
    </main>
    <footer className="app-footer">This app is for personal tracking only and is not medical advice. If you have diabetes, use insulin, take glucose-lowering medication, have an eating disorder history, or feel dizzy or unwell during fasting, talk to a doctor.</footer>
    <nav className="mobile-nav" aria-label="Main navigation">{navigation.map((item) => <NavButton key={item.id} item={item} active={primaryPage === item.id} onClick={() => item.id === 'checkin' ? openCheckIn() : navigate(item.id)} />)}</nav>
  </div>
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) { return <button type="button" className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon name={item.icon} className="h-5 w-5" /><span>{item.label}</span></button> }

function More({ onNavigate }: { onNavigate: (page: Page) => void }) { const options: Array<{ page: Extract<Page, 'review' | 'settings' | 'rules'>; icon: IconName; title: string; body: string }> = [{ page: 'review', icon: 'trend', title: 'Weekly review', body: 'Look for supportive patterns and choose one next step.' }, { page: 'settings', icon: 'settings', title: 'Goals & plan', body: 'Set your target range, plan dates, and personal baseline.' }, { page: 'rules', icon: 'rules', title: 'Food rules', body: 'Keep the everyday choices you want to lean on close by.' }]; return <><div className="mb-6"><p className="eyebrow">More tools</p><h1 className="page-title">Your quiet corner.</h1><p className="page-subtitle">Everything beyond today’s check-in, kept tidy and close at hand.</p></div><section className="more-grid">{options.map((option) => <button key={option.page} className="more-card" onClick={() => onNavigate(option.page)}><span className="section-icon"><Icon name={option.icon} className="h-5 w-5" /></span><span><b>{option.title}</b><small>{option.body}</small></span><Icon name="arrow" className="more-arrow" /></button>)}</section></> }

function LoadingScreen() { return <main className="grid min-h-screen place-items-center bg-[#f7f7f1] text-slate-600"><div className="text-center"><span className="loading-mark">W</span><p className="mt-4 font-semibold">Loading your private path…</p></div></main> }

function ConnectionScreen({ error, onRetry }: { error: string; onRetry: () => void }) { return <main className="login-page"><section className="login-card" role="alert"><div className="login-mark">W</div><p className="eyebrow">Connection problem</p><h1>Your records are still on the server.</h1><p>{error || 'Weight Path could not load your data right now.'}</p><button className="btn mt-5 w-full" onClick={onRetry}>Try again</button></section></main> }

function Login({ onLogin }: { onLogin: (password: string) => Promise<void> }) { const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await onLogin(password) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in.') } finally { setBusy(false) } }; return <main className="login-page"><form onSubmit={submit} className="login-card"><div className="login-mark">W</div><p className="eyebrow">Welcome back</p><h1>Weight Path</h1><p>One small check-in at a time.</p><label><span className="field-label">Private app password</span><input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="btn mt-5 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button><p className="login-note">This server uses direct HTTP. Do not reuse this password on another service.</p></form></main> }

export default App
