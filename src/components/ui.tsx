import type { ReactNode } from 'react'

export type IconName = 'home' | 'check' | 'history' | 'more' | 'trend' | 'target' | 'calendar' | 'settings' | 'rules' | 'arrow'

const paths: Record<IconName, ReactNode> = {
  home: <path d="m3 10.5 9-7 9 7v9.75a.75.75 0 0 1-.75.75h-4.5v-6h-7.5v6h-4.5a.75.75 0 0 1-.75-.75V10.5Z" />,
  check: <><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="m8 12 2.5 2.5L16.5 8.5" /></>,
  history: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M8 11h8m-8 4h5" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  trend: <><path d="M4 18V6m0 12h16" /><path d="m7 15 4-4 3 2 4-5" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="m17.7 6.3 2.8-2.8" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.55 2.55-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.55v.1h-3.6v-.1a1.7 1.7 0 0 0-1.04-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.55-2.55.06-.06A1.7 1.7 0 0 0 5.6 15a1.7 1.7 0 0 0-1.55-1.04h-.1v-3.6h.1A1.7 1.7 0 0 0 5.6 9.32a1.7 1.7 0 0 0-.34-1.88L5.2 7.38l2.55-2.55.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.04-1.55v-.1h3.6v.1a1.7 1.7 0 0 0 1.04 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.55 2.55-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1.04h.1v3.6h-.1A1.7 1.7 0 0 0 19.4 15Z" /></>,
  rules: <><path d="M5 4h14v17H5z" /><path d="m8 9 1.5 1.5L12 8m1 2h3M8 15l1.5 1.5L12 14m1 2h3" /></>,
  arrow: <path d="m9 18 6-6-6-6" />,
}

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>
}

export function SectionTitle({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="page-title">{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{action}</div>
}

export function Stat({ label, value, hint, tone = 'plain' }: { label: string; value: string; hint?: string; tone?: 'plain' | 'green' | 'amber' | 'soft' }) {
  return <article className={`stat-card stat-${tone}`}><p className="stat-label">{label}</p><p className="stat-value">{value}</p>{hint && <p className="stat-hint">{hint}</p>}</article>
}

export function Field({ label, children, hint, wide = false }: { label: string; children: ReactNode; hint?: string; wide?: boolean }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div><span className="field-label">{label}</span><div className="segmented" aria-label={label}><button type="button" aria-pressed={!checked} onClick={() => onChange(false)} className={!checked ? 'is-selected' : ''}>No</button><button type="button" aria-pressed={checked} onClick={() => onChange(true)} className={checked ? 'is-warning' : ''}>Yes</button></div></div>
}

export function RangeField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number) => void }) {
  return <label><span className="field-label">{label} <b>{value ?? '—'}</b></span><input className="range" type="range" min="1" max="10" value={value ?? 5} onChange={(event) => onChange(Number(event.target.value))} /><span className="range-labels"><span>1</span><span>10</span></span></label>
}

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="flex items-start justify-between gap-4"><h2 id="dialog-title" className="text-lg font-bold text-slate-900">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>{children}</section></div>
}

export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} className="h-6 w-6" /></span><h2>{title}</h2><p>{body}</p>{action}</div>
}
