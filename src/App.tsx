import { useEffect, useMemo, useState } from 'react';
import QorvixLogo from './components/logo/QorvixLogo';
import { useSyllabus, heatClass, rollupProgress } from './features/syllabus/store';
import type { NodeKind, SourceMode, LearningSource, SylNode } from './features/syllabus/store';
import { useJobs } from './features/jobs/store';
import type { Stage, StageType, SyllabusLink, Level, Category, PayMode } from './features/jobs/store';
import { useTimetable } from './features/timetable/store';
import type { Repeat } from './features/timetable/store';
import { buildPlan } from './features/timetable/engine';
import { useDashboard } from './features/dashboard/store';
import { daysUntil, fmtDate, todayIso } from './lib/dates';
import { isValidUrl } from './lib/validate';
import { ensurePushPermission, fireDue, scheduleInDays, scheduleBefore } from './lib/notify';

type Tab = 'dashboard' | 'syllabus' | 'jobs' | 'timetable';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    useSyllabus.getState().seedIfEmpty();
    useJobs.getState().seedIfEmpty();
    fireDue().catch(() => undefined);
    const t = window.setInterval(() => fireDue().catch(() => undefined), 60000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="app-shell">
        <header className="flex items-center justify-between py-3">
          <QorvixLogo size={38} />
          <div className="flex items-center gap-2">
            <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setDark((d) => !d)} aria-label="theme">
              {dark ? '☀ Light' : '🌙 Dark'}
            </button>
            <button
              className="btn-ghost !px-3 !py-2 text-xs"
              onClick={() => ensurePushPermission().then((p) => alert(p === 'granted' ? 'Push ON — admit/exam/revision alerts active' : 'Push: ' + p + ' — in-app countdowns still work'))}
            >
              🔔 Push
            </button>
          </div>
        </header>

        <div className="card flex items-center gap-2 !rounded-full px-4 py-2.5">
          <span aria-hidden="true">🔍</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subjects, exams, topics…" className="w-full bg-transparent text-sm outline-none" />
        </div>

        {tab === 'dashboard' && <Dashboard />}
        {tab === 'syllabus' && <Syllabus query={query} />}
        {tab === 'jobs' && <Jobs query={query} />}
        {tab === 'timetable' && <Timetable />}
      </div>

      <button className="fab" aria-label="quick add" onClick={() => {
        if (tab === 'syllabus') setTab('syllabus');
        else if (tab === 'jobs') setTab('jobs');
        else setTab('timetable');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}>+</button>

      <nav className="bottom-island" aria-label="bottom navigation">
        <div className="grid grid-cols-4 gap-1">
          {([['dashboard', '📊', 'Dashboard'], ['syllabus', '📚', 'Syllabus'], ['jobs', '💼', 'Jobs'], ['timetable', '🗓', 'Plan']] as [Tab, string, string][]).map(([k, icon, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`nav-pill justify-center ${tab === k ? 'bg-[#4F46E5] text-white' : 'text-slate-500 dark:text-slate-300'}`}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard() {
  const items = useTimetable((s) => s.todayItems());
  const jobs = useJobs((s) => s.jobs);
  const nodes = useSyllabus((s) => s.nodes);
  const { runningSince, start, stop, totalToday, hours } = useDashboard();
  const routines = useTimetable((s) => s.routines);

  const active = useMemo(() => jobs.filter((j) => !j.isTarget), [jobs]);
  const pendingRev = useMemo(() => nodes.filter((n) => n.mistakes > n.corrects).slice(0, 8), [nodes]);
  const week = useMemo(() => hours.slice(-7), [hours]);
  const [selMonth, setSelMonth] = useState<string | null>(null);

  const sumSince = (days: number): number =>
    hours
      .filter((h) => (Date.now() - new Date(h.date).getTime()) / 86400000 <= days)
      .reduce((a, h) => a + h.minutes, 0);
  const totalAll = hours.reduce((a, h) => a + h.minutes, 0);
  const monthAgg = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hours) {
      const k = h.date.slice(0, 7);
      m.set(k, (m.get(k) ?? 0) + h.minutes);
    }
    return [...m.entries()].sort().slice(-6);
  }, [hours]);
  const monthDays = selMonth ? hours.filter((h) => h.date.startsWith(selMonth)).sort().reverse() : [];
  const fmtHm = (m: number): string => `${Math.floor(m / 60)}h ${m % 60}m`;

  return (
    <div className="mt-4 space-y-4">
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Today — {todayIso()}</h2>
          <span className="chip chip-idle">{items.filter((i) => i.status === 'done').length}/{items.length} done</span>
        </div>
        <div className="mt-3 space-y-2">
          {items.length === 0 && <p className="text-sm text-slate-500">No plan yet — open Plan tab to generate tonight&apos;s plan.</p>}
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
              <span>{it.status === 'done' ? '✅' : '○'} {it.title} · {it.minutes}m · {it.chosenSource}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Study Timer</h2>
        <p className="mt-1 text-3xl font-extrabold">{Math.floor(totalToday() / 60)}h {totalToday() % 60}m <span className="text-xs font-medium text-slate-500">today</span></p>
        <div className="mt-2 flex gap-2">
          {!runningSince
            ? <button className="btn-primary" onClick={start}>▶ Start</button>
            : <button className="btn-ghost" onClick={stop}>⏹ Stop</button>}
        </div>
        <div className="mt-3 flex items-end gap-1.5" aria-label="weekly hours">
          {week.map((h) => (
            <div key={h.date} className="flex-1 text-center">
              <div className="mx-auto w-full rounded bg-[#4F46E5]" style={{ height: Math.max(4, Math.min(64, h.minutes / 3)) }} />
              <div className="mt-1 text-[10px] text-slate-500">{h.date.slice(5)}</div>
            </div>
          ))}
          {week.length === 0 && <p className="text-xs text-slate-500">Start timer to build your trend.</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className="chip chip-idle">7d: {fmtHm(sumSince(7))}</span>
          <span className="chip chip-idle">30d: {fmtHm(sumSince(30))}</span>
          <span className="chip chip-idle">All: {fmtHm(totalAll)}</span>
        </div>
        {monthAgg.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500">Monthly (tap a month for day detail)</p>
            <div className="mt-1.5 flex items-end gap-1.5">
              {monthAgg.map(([k, m]) => (
                <button key={k} className="flex-1 text-center" onClick={() => setSelMonth((s) => (s === k ? null : k))} aria-label={`month ${k}`}>
                  <div className={`mx-auto w-full rounded ${selMonth === k ? 'bg-amber-500' : 'bg-green-600'}`} style={{ height: Math.max(4, Math.min(64, m / 20)) }} />
                  <div className="mt-1 text-[10px] text-slate-500">{k.slice(2)}</div>
                </button>
              ))}
            </div>
            {selMonth && (
              <div className="mt-2 rounded-xl bg-slate-100 p-2 text-xs dark:bg-white/5">
                <p className="font-semibold">{selMonth} — {fmtHm(monthDays.reduce((a, h) => a + h.minutes, 0))}</p>
                {monthDays.map((h) => (
                  <p key={h.date} className="mt-0.5 text-slate-500">{h.date} · {fmtHm(h.minutes)}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Active Exams + Countdowns</h2>
        <div className="mt-2 space-y-2">
          {active.length === 0 && <p className="text-sm text-slate-500">No active exams. Convert a Target in Jobs.</p>}
          {active.map((j) => {
            const next = j.stages.map((s) => s.approxDate).filter(Boolean).sort()[0] as string | undefined;
            const d = next ? daysUntil(next) : 9999;
            const urg = !next ? 'text-slate-500' : d < 7 ? 'text-red-500 font-semibold' : d <= 30 ? 'text-amber-500 font-semibold' : 'text-green-600';
            return (
              <div key={j.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
                <span className={`w-2 self-stretch rounded-full ${j.priority >= 4 ? 'bg-red-500' : j.priority === 3 ? 'bg-amber-500' : 'bg-green-600'}`} />
                <div className="flex-1">
                  <p className="text-sm font-bold">{j.examName} <span className="font-normal text-slate-500">· {j.postName}</span></p>
                  <p className={`text-xs ${urg}`}>{next ? `${d}d left · ${fmtDate(next)}` : 'No date set'} · P{j.priority}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Pending Revision (mistake-first)</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {pendingRev.length === 0 && <p className="text-sm text-slate-500">No pending revision. Mistakes will surface here.</p>}
          {pendingRev.map((n) => (
            <span key={n.id} className="chip chip-idle flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${heatClass(n)}`} />{n.title}</span>
          ))}
        </div>
        {routines.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-semibold">Today&apos;s Routine</h3>
            {routines.map((r) => <p key={r.id} className="text-sm text-slate-500">{r.time} — {r.title} · {r.repeat}{r.repeat === 'days' && r.days?.length ? ` (${r.days.join(', ')})` : ''}</p>)}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Syllabus ---------------- */
function Syllabus({ query }: { query: string }) {
  const nodes = useSyllabus((s) => s.nodes);
  const addNode = useSyllabus((s) => s.addNode);
  const setSource = useSyllabus((s) => s.setSource);
  const setProgress = useSyllabus((s) => s.setProgress);
  const importJson = useSyllabus((s) => s.importJson);
  const importCsv = useSyllabus((s) => s.importCsv);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<NodeKind>('subject');
  const [parentId, setParentId] = useState('');
  const [text, setText] = useState('');
  const [fmt, setFmt] = useState<'json' | 'csv'>('json');
  const [msg, setMsg] = useState('');

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return null;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const keep = new Set<string>();
    for (const n of nodes) {
      if (!n.title.toLowerCase().includes(q)) continue;
      keep.add(n.id);
      let p = n.parentId;
      while (p) {
        keep.add(p);
        p = byId.get(p)?.parentId;
      }
      const stack: string[] = [n.id];
      while (stack.length > 0) {
        const cur = stack.pop() as string;
        for (const k of nodes) {
          if (k.parentId === cur && !keep.has(k.id)) {
            keep.add(k.id);
            stack.push(k.id);
          }
        }
      }
    }
    return keep;
  }, [nodes, q]);
  const show = (id: string): boolean => visible === null || visible.has(id);

  const childrenOf = (id: string): SylNode[] => nodes.filter((n) => n.parentId === id && show(n.id));
  const subjects = nodes.filter((n) => n.kind === 'subject' && show(n.id));
  const siblingTitles = (id: string): string[] => {
    const self = nodes.find((n) => n.id === id);
    if (!self) return [];
    return nodes
      .filter((n) => n.id !== id && n.kind === self.kind && (n.parentId ?? '') === (self.parentId ?? ''))
      .map((n) => n.title.toLowerCase());
  };

  const doAdd = (): void => {
    const t = title.trim();
    if (!t) { setMsg('Title is required.'); return; }
    if (kind !== 'subject' && !parentId) { setMsg('Pick a parent for Chapter / Topic / SubTopic.'); return; }
    if (kind === 'subject' && parentId) { setMsg('Subject has no parent — clear the parent picker.'); return; }
    const dup = nodes.some(
      (n) => n.kind === kind && (n.parentId ?? '') === parentId && n.title.toLowerCase() === t.toLowerCase(),
    );
    if (dup) { setMsg('Duplicate — this title already exists here.'); return; }
    addNode(kind, t, parentId || undefined);
    setTitle('');
    setMsg(`Added ${t}.`);
  };

  const doImport = (): void => {
    const r = fmt === 'json' ? importJson(text) : importCsv(text);
    setMsg(`Import (${fmt.toUpperCase()}): added ${r.added}, skipped ${r.skipped}.`);
  };

  return (
    <div className="mt-4 space-y-4">
      <section className="card p-4">
        <h2 className="text-lg font-bold">Add — Subject › Chapter › Topic › SubTopic</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as NodeKind)} aria-label="node kind">
            <option value="subject">Subject</option><option value="chapter">Chapter</option>
            <option value="topic">Topic</option><option value="subtopic">SubTopic</option>
          </select>
          <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)} aria-label="parent node">
            <option value="">No parent (subject)</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.kind}: {n.title}</option>)}
          </select>
        </div>
        <div className="mt-2 flex gap-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ratio, Partnership…" aria-label="new title" />
          <button className="btn-primary" onClick={doAdd}>Add</button>
        </div>
        {msg && <p className="mt-1.5 text-xs text-slate-500">{msg}</p>}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#4F46E5]">Import JSON / Excel-CSV (paste below)</summary>
          <div className="mt-2 flex gap-1.5">
            {(['json', 'csv'] as const).map((f) => (
              <button key={f} onClick={() => setFmt(f)} className={`chip ${fmt === f ? 'chip-active' : 'chip-idle'} !text-[11px]`}>{f.toUpperCase()}</button>
            ))}
          </div>
          <textarea
            className="input mt-2 h-24 font-mono !text-[11px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={fmt === 'json'
              ? '{"subjects":[{"title":"Quant","chapters":[{"title":"Ratio","topics":[{"title":"Partnership"}]}]}]}'
              : 'subject,chapter,topic,subtopic\nQuantitative Aptitude,Ratio,Partnership,Compound Partnership'}
          />
          <div className="mt-2 flex items-center gap-2">
            <button className="btn-ghost text-sm" onClick={doImport}>Import {fmt.toUpperCase()}</button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Excel: Save As → CSV with header row subject,chapter,topic,subtopic, then paste here. No heavy library needed.</p>
        </details>
      </section>

      {subjects.length === 0 && (
        <p className="card p-4 text-sm text-slate-500">
          {nodes.length === 0 ? 'No syllabus yet — add your first Subject above.' : `No match for “${query}” — clear search or add it above.`}
        </p>
      )}
      {subjects.map((s) => (
        <section key={s.id} className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold"><NodeTitle id={s.id} title={s.title} icon="📘" siblings={siblingTitles(s.id)} /></h3>
            <span className="chip chip-idle !px-2 !py-0.5 !text-[11px]">{rollupProgress(nodes, s.id)}%</span>
          </div>
          <ProgressBar value={rollupProgress(nodes, s.id)} />
          {childrenOf(s.id).map((c) => (
            <div key={c.id} className="ml-3 mt-2 border-l-2 border-[#4F46E5]/30 pl-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold"><NodeTitle id={c.id} title={c.title} icon="📁" siblings={siblingTitles(c.id)} /></p>
                <span className="chip chip-idle !px-2 !py-0.5 !text-[11px]">{rollupProgress(nodes, c.id)}%</span>
              </div>
              <ProgressBar value={rollupProgress(nodes, c.id)} />
              {childrenOf(c.id).map((t) => (
                <div key={t.id} className="ml-3 mt-1 border-l border-slate-300 pl-3 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm"><NodeTitle id={t.id} title={t.title} icon="📝" siblings={siblingTitles(t.id)} /> <span className={`ml-1 inline-block h-2 w-2 rounded-full ${heatClass(t)}`} title="weakness heat" /></p>
                    <input type="range" min={0} max={100} value={t.progress} onChange={(e) => setProgress(t.id, Number(e.target.value))} aria-label="progress" className="w-24" />
                  </div>
                  <SourceEditor existing={t.source} onSave={(src) => setSource(t.id, src)} />
                  {childrenOf(t.id).map((st) => (
                    <div key={st.id} className="ml-3 mt-1 border-l border-slate-300 pl-3 dark:border-white/10">
                      <p className="text-[13px]"><NodeTitle id={st.id} title={st.title} icon="🔹" siblings={siblingTitles(st.id)} /> <span className={`ml-1 inline-block h-2 w-2 rounded-full ${heatClass(st)}`} /></p>
                      <SourceEditor existing={st.source} onSave={(src) => setSource(st.id, src)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden="true">
      <div className="h-full rounded-full bg-[#4F46E5]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function NodeTitle({ id, title, icon, siblings }: { id: string; title: string; icon: string; siblings: string[] }) {
  const renameNode = useSyllabus((s) => s.renameNode);
  const removeNode = useSyllabus((s) => s.removeNode);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  const [err, setErr] = useState('');
  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span>{icon} {title}</span>
        <button className="px-0.5 text-[11px] opacity-60" aria-label="rename" onClick={() => { setVal(title); setErr(''); setEditing(true); }}>✏️</button>
        <button className="px-0.5 text-[11px] opacity-60" aria-label="delete" onClick={() => removeNode(id)}>🗑</button>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <input className="input !w-40 !py-1 !text-xs" value={val} onChange={(e) => setVal(e.target.value)} aria-label="new name" />
      <button
        className="text-[12px] font-bold text-green-600"
        aria-label="save name"
        onClick={() => {
          const t = val.trim();
          if (!t) { setErr('Required'); return; }
          if (siblings.includes(t.toLowerCase())) { setErr('Duplicate here'); return; }
          renameNode(id, t);
          setEditing(false);
        }}
      >✓</button>
      <button className="text-[12px] text-slate-400" aria-label="cancel rename" onClick={() => setEditing(false)}>✕</button>
      {err && <span className="text-[11px] text-red-500">{err}</span>}
    </span>
  );
}

function SourceEditor({ existing, onSave }: { existing?: LearningSource; onSave: (s: LearningSource) => void }) {
  const [mode, setMode] = useState<SourceMode>(existing?.mode ?? 'individual');
  const [indName, setIndName] = useState(existing?.indName ?? '');
  const [indUrl, setIndUrl] = useState(existing?.indUrl ?? '');
  const [indNotes, setIndNotes] = useState(existing?.indNotes ?? '');
  const [batchName, setBatchName] = useState(existing?.batchName ?? '');
  const [batchSubject, setBatchSubject] = useState(existing?.batchSubject ?? '');
  const [batchNotes, setBatchNotes] = useState(existing?.batchNotes ?? '');
  const [err, setErr] = useState('');

  const saved = existing
    ? `${existing.mode}${existing.indName ? ` · ${existing.indName}` : ''}${existing.batchName ? ` · ${existing.batchName}` : ''}`
    : 'No source saved yet';

  return (
    <div className="mt-1 rounded-xl bg-slate-100 p-2 text-xs dark:bg-white/5">
      <p className="mb-1.5 text-[11px] text-slate-500">Saved: {saved}</p>
      <div className="flex gap-1.5">
        {(['individual', 'batch', 'both'] as SourceMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`chip ${mode === m ? 'chip-active' : 'chip-idle'} !px-2.5 !py-1 !text-[11px]`}>{m}</button>
        ))}
      </div>
      {(mode === 'individual' || mode === 'both') && (
        <div className="mt-1.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input className="input !py-1.5 !text-xs" value={indName} onChange={(e) => setIndName(e.target.value)} placeholder="Lecture name *" aria-label="lecture name" />
            <input className="input !py-1.5 !text-xs" value={indUrl} onChange={(e) => setIndUrl(e.target.value)} placeholder="Lecture URL" aria-label="lecture url" />
          </div>
          <input className="input !py-1.5 !text-xs" value={indNotes} onChange={(e) => setIndNotes(e.target.value)} placeholder="Notes (optional)" aria-label="lecture notes" />
        </div>
      )}
      {(mode === 'batch' || mode === 'both') && (
        <div className="mt-1.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input className="input !py-1.5 !text-xs" value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Batch e.g. SSC Batch *" aria-label="batch name" />
            <input className="input !py-1.5 !text-xs" value={batchSubject} onChange={(e) => setBatchSubject(e.target.value)} placeholder="Batch subject" aria-label="batch subject" />
          </div>
          <input className="input !py-1.5 !text-xs" value={batchNotes} onChange={(e) => setBatchNotes(e.target.value)} placeholder="Batch notes (optional)" aria-label="batch notes" />
        </div>
      )}
      {err && <p className="mt-1 text-[11px] text-red-500">{err}</p>}
      <button
        className="mt-1.5 rounded-lg bg-[#4F46E5] px-2.5 py-1 text-[11px] font-semibold text-white"
        onClick={() => {
          if ((mode === 'individual' || mode === 'both') && !indName.trim()) { setErr('Lecture name is required.'); return; }
          if (indUrl.trim() && !isValidUrl(indUrl)) { setErr('Lecture URL must start with http(s)://'); return; }
          if ((mode === 'batch' || mode === 'both') && !batchName.trim()) { setErr('Batch name is required.'); return; }
          setErr('');
          const clean = (v: string): string | undefined => (v.trim() ? v.trim() : undefined);
          onSave({
            mode,
            indName: clean(indName), indUrl: clean(indUrl), indNotes: clean(indNotes),
            batchName: clean(batchName), batchSubject: clean(batchSubject), batchNotes: clean(batchNotes),
          });
        }}
      >Save source</button>
    </div>
  );
}

/* ---------------- Jobs ---------------- */
function Jobs({ query }: { query: string }) {
  const jobs = useJobs((s) => s.jobs);
  const addJob = useJobs((s) => s.addJob);
  const updateJob = useJobs((s) => s.updateJob);
  const removeJob = useJobs((s) => s.removeJob);
  const convertTarget = useJobs((s) => s.convertTarget);
  const addStage = useJobs((s) => s.addStage);
  const [filter, setFilter] = useState<'Jobs' | 'Academics' | 'Targets'>('Jobs');
  const [name, setName] = useState('');

  const list = jobs.filter((j) => {
    if (!j.examName.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'Targets') return j.isTarget;
    if (filter === 'Academics') return j.kind === 'academic' && !j.isTarget;
    return j.kind === 'job' && !j.isTarget;
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {(['Jobs', 'Academics', 'Targets'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'chip-active' : 'chip-idle'}`}>
            {f} <span className="ml-1 rounded-full bg-black/20 px-1.5 text-[11px]">{f === 'Targets' ? jobs.filter((j) => j.isTarget).length : f === 'Academics' ? jobs.filter((j) => j.kind === 'academic' && !j.isTarget).length : jobs.filter((j) => j.kind === 'job' && !j.isTarget).length}</span>
          </button>
        ))}
      </div>

      <section className="card p-4">
        <div className="flex gap-2">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New exam e.g. SSC CGL / UGC NET…" />
          <button className="btn-primary" onClick={() => { if (name.trim()) { addJob({ examName: name.trim(), kind: filter === 'Academics' ? 'academic' : 'job', isTarget: filter === 'Targets' }); setName(''); } }}>+ Add</button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Targets need only name + priority + syllabus. Convert to active on form fill.</p>
      </section>

      {list.map((j) => (
        <article key={j.id} className="card flex gap-3 p-3">
          <span className={`w-2.5 rounded-full ${j.category === 'Central' ? 'bg-[#4F46E5]' : j.category === 'District' ? 'bg-amber-500' : 'bg-green-600'}`} title={j.category} />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-bold">{j.examName}</h3>
                <p className="text-xs text-slate-500">{j.postName || 'Post —'} · {j.level} · {j.category} · P{j.priority} {j.parentId ? '· merged child' : ''}</p>
                {j.isTarget && <span className="mt-1 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-600">🎯 TARGET</span>}
              </div>
              <div className="flex gap-1">
                {j.stages.some((s) => s.result.cleared) && <span className="icon-badge-ok">✓</span>}
                {j.stages.some((s) => s.result.status === 'Missed') && <span className="icon-badge-no">✗</span>}
                {j.stages.length > 0 ? <span className="icon-badge-pending">○</span> : null}
                <button className="px-1 text-[11px] opacity-60" aria-label="delete job" onClick={() => { if (window.confirm(`Delete ${j.examName} and its stages?`)) removeJob(j.id); }}>🗑</button>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              <input className="input !text-xs" value={j.postName} onChange={(e) => updateJob(j.id, { postName: e.target.value })} placeholder="Post name *" aria-label="post name" />
              <input className="input !text-xs" value={j.bodyWebsite} onChange={(e) => updateJob(j.id, { bodyWebsite: e.target.value })} placeholder="Conducting body website" aria-label="body website" />
              <input className="input !text-xs col-span-2" value={j.notifPdf} onChange={(e) => updateJob(j.id, { notifPdf: e.target.value })} placeholder="Notification PDF link" aria-label="notification pdf" />
              <select className="input !text-xs" value={j.level} onChange={(e) => updateJob(j.id, { level: e.target.value as Level })} aria-label="level">
                <option value="10th">10th</option><option value="+2">+2</option><option value="+3">+3</option><option value="PG">PG</option>
              </select>
              <select className="input !text-xs" value={j.category} onChange={(e) => updateJob(j.id, { category: e.target.value as Category })} aria-label="category">
                <option>Central</option><option>State</option><option>District</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs">Priority
                <input type="number" min={1} max={5} className="input !w-14 !text-xs" value={j.priority} onChange={(e) => updateJob(j.id, { priority: Math.max(1, Math.min(5, Number(e.target.value))) })} aria-label="priority" />
              </label>
              <label className="flex items-center gap-1.5 text-xs">Applied
                <input type="date" className="input !w-auto !py-1 !text-xs" value={j.appDate} onChange={(e) => updateJob(j.id, { appDate: e.target.value })} aria-label="application date" />
              </label>
              <label className="flex items-center gap-1.5 text-xs">Fee ₹
                <input type="number" min={0} className="input !w-20 !text-xs" value={j.fee} onChange={(e) => updateJob(j.id, { fee: Math.max(0, Number(e.target.value)) })} aria-label="fee" />
              </label>
              <select className="input !text-xs" value={j.payMode} onChange={(e) => updateJob(j.id, { payMode: e.target.value as PayMode })} aria-label="payment mode">
                <option>Online</option><option>Challan</option><option>Postal Stamp</option><option>Other</option>
              </select>
              <label className="col-span-2 flex items-center gap-2 text-xs">
                <input type="checkbox" checked={j.refundable} onChange={(e) => updateJob(j.id, { refundable: e.target.checked })} /> Fee refundable?
              </label>
              {j.refundable && (
                <>
                  <label className="flex items-center gap-1.5 text-xs">Refund ₹
                    <input type="number" min={0} className="input !w-20 !text-xs" value={j.refundAmt ?? 0} onChange={(e) => updateJob(j.id, { refundAmt: Number(e.target.value) })} aria-label="refund amount" />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">Refund date
                    <input type="date" className="input !w-auto !py-1 !text-xs" value={j.refundDate ?? ''} onChange={(e) => updateJob(j.id, { refundDate: e.target.value })} aria-label="refund date" />
                  </label>
                </>
              )}
              <input className="input !text-xs" value={j.appNo ?? ''} onChange={(e) => updateJob(j.id, { appNo: e.target.value })} placeholder="Application No. (optional)" aria-label="application number" />
              <input className="input !text-xs" value={j.regNo ?? ''} onChange={(e) => updateJob(j.id, { regNo: e.target.value })} placeholder="Registration No. (optional)" aria-label="registration number" />
              <input className="input !text-xs col-span-2" value={j.rollNo ?? ''} onChange={(e) => updateJob(j.id, { rollNo: e.target.value })} placeholder="Roll No. (optional — entry now or at admit)" aria-label="roll number" />
            </div>

            {j.isTarget
              ? <button className="btn-primary mt-2 !py-2 text-xs" onClick={() => convertTarget(j.id)}>Convert Target → Active (form filled)</button>
              : (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(['Prelims', 'Mains', 'Skill', 'DV', 'Interview'] as StageType[]).map((t) => (
                      <button key={t} className="chip chip-idle !text-[11px]" onClick={() => addStage(j.id, t)}>+ {t}</button>
                    ))}
                  </div>
                  {j.stages.map((st) => (
                    <StageCard key={st.id} jobId={j.id} jobName={j.examName} st={st} />
                  ))}
                  <details>
                    <summary className="cursor-pointer text-[11px] text-slate-500">Merge: make this a child of…</summary>
                    <select className="input mt-1 !text-xs" value={j.parentId ?? ''} onChange={(e) => updateJob(j.id, { parentId: e.target.value || undefined })}>
                      <option value="">No parent (standalone)</option>
                      {useJobs.getState().jobs.filter((x) => x.id !== j.id && !x.parentId).map((x) => <option key={x.id} value={x.id}>{x.examName}</option>)}
                    </select>
                  </details>
                </div>
              )}
          </div>
        </article>
      ))}
    </div>
  );
}

function StageCard({ jobId, jobName, st }: { jobId: string; jobName: string; st: Stage }) {
  const updateStage = useJobs((s) => s.updateStage);
  const removeStage = useJobs((s) => s.removeStage);

  const armApprox = (date: string): void => {
    updateStage(jobId, st.id, { approxDate: date });
    if (!date) return;
    scheduleBefore(date, 15, `${st.id}-admit15`, `Admit card: ${jobName} ${st.type}`, 'Admit releases ~15 days before — download now.');
    scheduleBefore(date, 10, `${st.id}-admit10`, `Admit reminder: ${jobName} ${st.type}`, 'If not downloaded, download the admit card today.');
  };
  const armExam = (downloaded: boolean, examDate?: string): void => {
    updateStage(jobId, st.id, { admit: { ...st.admit, downloaded } });
    if (!downloaded || !examDate) return;
    scheduleBefore(examDate, 7, `${st.id}-exam7`, `Exam in 7 days: ${jobName}`, 'Revise + check center, documents, gate time.');
    scheduleBefore(examDate, 3, `${st.id}-exam3`, `Exam in 3 days: ${jobName}`, 'Light revision + sleep well + pack documents.');
    scheduleBefore(examDate, 1, `${st.id}-exam1`, `Exam tomorrow: ${jobName}`, 'Check shift, gate closing, center. All the best.');
  };
  const setStatus = (v: string): void => {
    const status = (v || undefined) as Stage['result']['status'];
    updateStage(jobId, st.id, { result: { ...st.result, status } });
    if (status === 'Given') {
      scheduleInDays(`${st.id}-ans`, 10, `Answer key: ${jobName} ${st.type}`, 'Check answer key / result — 7–15 days after exam.');
    }
  };

  return (
    <div className="rounded-xl bg-slate-100 p-2.5 text-xs dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <strong>{st.type}</strong>
        <div className="flex items-center gap-1.5">
          <input type="date" className="input !w-auto !py-1 !text-xs" value={st.approxDate ?? ''} onChange={(e) => armApprox(e.target.value)} aria-label="approximate date" />
          <button className="text-[11px] opacity-60" aria-label="remove stage" onClick={() => { if (window.confirm(`Remove ${st.type} stage?`)) removeStage(jobId, st.id); }}>✕</button>
        </div>
      </div>

      <StageLinks jobId={jobId} stageId={st.id} links={st.links} />
      {st.type === 'Skill' && (
        <textarea
          className="input mt-1.5 !text-xs"
          rows={2}
          placeholder="Skill syllabus (free text) — e.g. Typing 8000 key depressions, PET measurements…"
          value={st.customSyllabus ?? ''}
          onChange={(e) => updateStage(jobId, st.id, { customSyllabus: e.target.value })}
          aria-label="skill syllabus"
        />
      )}

      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <input className="input !text-xs" placeholder="Exam date" value={st.admit.examDate ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, examDate: e.target.value } })} aria-label="exam date" />
        <input className="input !text-xs" placeholder="Shift" value={st.admit.shift ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, shift: e.target.value } })} aria-label="shift" />
        <input className="input !text-xs" placeholder="Gate closing" value={st.admit.gateClosing ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, gateClosing: e.target.value } })} aria-label="gate closing" />
        <input className="input !text-xs" placeholder="Center" value={st.admit.center ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, center: e.target.value } })} aria-label="center" />
        <input className="input !text-xs col-span-2" placeholder="Documents / things required" value={st.admit.docs ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, docs: e.target.value } })} aria-label="documents" />
        <label className="col-span-2 flex items-center gap-2">
          <input type="checkbox" checked={st.admit.downloaded} onChange={(e) => armExam(e.target.checked, st.admit.examDate)} /> Admit downloaded (arms 7/3/1-day reminders)
        </label>
        <select className="input !text-xs" value={st.result.status ?? ''} onChange={(e) => setStatus(e.target.value)} aria-label="exam status">
          <option value="">Result: —</option><option value="Given">Given</option><option value="Missed">Missed</option><option value="Overlap">Overlap</option>
        </select>
        <input className="input !text-xs" placeholder="Answer key link" value={st.result.answerKey ?? ''} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, answerKey: e.target.value } })} aria-label="answer key" />
        <input className="input !text-xs" placeholder="Marks obtained" value={st.result.marks ?? ''} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, marks: e.target.value } })} aria-label="marks" />
        <input className="input !text-xs" placeholder="Cutoff" value={st.result.cutoff ?? ''} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, cutoff: e.target.value } })} aria-label="cutoff" />
        <input className="input !text-xs col-span-2" placeholder="Result PDF link" value={st.result.pdf ?? ''} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, pdf: e.target.value } })} aria-label="result pdf" />
        <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={!!st.result.cleared} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, cleared: e.target.checked } })} /> Cleared → add next stage above</label>
      </div>
    </div>
  );
}

function StageLinks({ jobId, stageId, links }: { jobId: string; stageId: string; links: SyllabusLink[] }) {
  const nodes = useSyllabus((s) => s.nodes);
  const updateStage = useJobs((s) => s.updateStage);
  const [subj, setSubj] = useState('');
  const [chap, setChap] = useState('');
  const [wt, setWt] = useState(0);
  const [err, setErr] = useState('');

  const subjects = nodes.filter((n) => n.kind === 'subject');
  const chapters = nodes.filter((n) => n.kind === 'chapter' && n.parentId === subj);
  const titleOf = (id: string): string => nodes.find((n) => n.id === id)?.title ?? '—';

  return (
    <div className="mt-1.5 rounded-lg border border-slate-200 p-2 dark:border-white/10">
      <p className="text-[11px] font-semibold text-slate-500">Syllabus + weightage (Subject mandatory)</p>
      {links.length === 0 && <p className="mt-0.5 text-[11px] text-slate-500">No syllabus linked yet — pick a Subject below.</p>}
      <div className="mt-1 space-y-1">
        {links.map((l, i) => (
          <div key={`${l.subjectId}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1 dark:bg-white/5">
            <span className="text-[11px]">📘 {titleOf(l.subjectId)}{l.chapterIds[0] ? ` › ${titleOf(l.chapterIds[0] as string)}` : ''}{l.weightage ? ` · ${l.weightage} marks` : ''}</span>
            <button
              className="text-[11px] text-red-400"
              aria-label="remove link"
              onClick={() => updateStage(jobId, stageId, { links: links.filter((_, k) => k !== i) })}
            >✕</button>
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <select className="input !text-xs" value={subj} onChange={(e) => { setSubj(e.target.value); setChap(''); }} aria-label="link subject">
          <option value="">Subject *</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <select className="input !text-xs" value={chap} onChange={(e) => setChap(e.target.value)} aria-label="link chapter">
          <option value="">Chapter (optional)</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-[11px]">Weightage
          <input type="number" min={0} className="input !w-20 !text-xs" value={wt} onChange={(e) => setWt(Math.max(0, Number(e.target.value)))} aria-label="weightage marks" />
        </label>
        <button
          className="rounded-lg bg-[#4F46E5] px-2 py-1 text-[11px] font-semibold text-white"
          onClick={() => {
            if (!subj) { setErr('Subject is mandatory.'); return; }
            setErr('');
            updateStage(jobId, stageId, {
              links: [...links, { subjectId: subj, chapterIds: chap ? [chap] : [], weightage: wt > 0 ? wt : undefined }],
            });
            setSubj(''); setChap(''); setWt(0);
          }}
        >+ Link</button>
      </div>
      {err && <p className="mt-1 text-[11px] text-red-500">{err}</p>}
    </div>
  );
}

/* ---------------- Timetable ---------------- */
function Timetable() {
  const days = useTimetable((s) => s.days);
  const ensureToday = useTimetable((s) => s.ensureToday);
  const addItem = useTimetable((s) => s.addItem);
  const updateItem = useTimetable((s) => s.updateItem);
  const shiftRemaining = useTimetable((s) => s.shiftRemaining);
  const routines = useTimetable((s) => s.routines);
  const addRoutine = useTimetable((s) => s.addRoutine);
  const nodes = useSyllabus((s) => s.nodes);
  const jobs = useJobs((s) => s.jobs);
  const logResult = useSyllabus((s) => s.logResult);
  const [title, setTitle] = useState('');
  const [mins, setMins] = useState(45);

  const today = days.find((d) => d.date === todayIso());
  const [motivation, setMotivation] = useState('');

  const generate = () => {
    const plan = buildPlan(nodes, jobs, new Date());
    ensureToday(plan.items);
    setMotivation(plan.motivation ?? '');
  };

  return (
    <div className="mt-4 space-y-4">
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Tonight → Tomorrow To-Do</h2>
          <button className="btn-primary !py-2 text-xs" onClick={generate}>✨ Generate next-day plan</button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Uses active + priority exams, dates, progress, mistakes. Edit before saving. Overrun shifts today only. 5–8 new · 10–12 problems · 4–6 revision · 7–9 mock.</p>
        {motivation && <p className="mt-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-600">{motivation}</p>}
        <div className="mt-2 flex gap-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Custom topic e.g. Polity — Fundamental Rights" />
          <input type="number" className="input !w-20" value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="minutes" />
          <button className="btn-ghost text-sm" onClick={() => { if (title.trim()) { addItem(todayIso(), { nodeId: '', title: title.trim(), chosenSource: 'both', minutes: mins }); setTitle(''); } }}>Add</button>
        </div>
      </section>

      {(!today || today.items.length === 0) && <p className="card p-4 text-sm text-slate-500">No items today. Generate plan above.</p>}
      {today?.items.map((it) => (
        <section key={it.id} className="card p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold">{it.status === 'done' ? '✅' : '○'} {it.title} · {it.minutes}m</p>
            <select className="input !w-28 !py-1 !text-xs" value={it.chosenSource} onChange={(e) => updateItem(today.date, it.id, { chosenSource: e.target.value as 'both' })}>
              <option value="individual">Individual</option><option value="batch">Batch</option><option value="both">Both</option>
            </select>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button className="chip chip-idle !text-[11px]" onClick={() => updateItem(today.date, it.id, { status: it.status === 'done' ? 'todo' : 'done' })}>{it.status === 'done' ? 'Reopen' : 'Mark done'}</button>
            <button className="chip chip-idle !text-[11px]" onClick={() => shiftRemaining(today.date, it.id, 30)}>+30m (auto-shift today)</button>
            <button className="chip chip-idle !text-[11px]" onClick={() => { if (it.nodeId) logResult(it.nodeId, false); updateItem(today.date, it.id, { incorrect: (it.incorrect ?? 0) + 1 }); }}>✗ Incorrect</button>
            <button className="chip chip-idle !text-[11px]" onClick={() => { if (it.nodeId) logResult(it.nodeId, true); updateItem(today.date, it.id, { correct: (it.correct ?? 0) + 1 }); }}>✓ Correct</button>
          </div>
          {!it.nodeId && (
            <select
              className="input mt-2 !text-xs"
              value=""
              onChange={(e) => {
                const nn = nodes.find((n) => n.id === e.target.value);
                if (nn) updateItem(today.date, it.id, { nodeId: nn.id, title: nn.title });
              }}
              aria-label="link syllabus topic"
            >
              <option value="">Link to syllabus topic… (micro detail after study)</option>
              {nodes.filter((n) => n.kind === 'topic' || n.kind === 'subtopic').map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
          )}
          <input className="input mt-2 !text-xs" placeholder="Summary / short note / mistake note…" value={it.summary ?? it.mistakeNote ?? ''} onChange={(e) => updateItem(today.date, it.id, { summary: e.target.value, mistakeNote: e.target.value })} />
          {(it.correct || it.incorrect) ? <p className="mt-1 text-[11px] text-slate-500">✓ {it.correct ?? 0} · ✗ {it.incorrect ?? 0} — mistakes raise revision frequency + heat.</p> : null}
        </section>
      ))}

      <section className="card p-4">
        <h3 className="font-bold">Daily Routine (repeat)</h3>
        <RoutineForm onAdd={addRoutine} />
        {routines.map((r) => <p key={r.id} className="mt-1 text-sm text-slate-500">{r.time} — {r.title} · {r.repeat}{r.repeat === 'days' && r.days?.length ? ` (${r.days.join(', ')})` : ''}</p>)}
      </section>
    </div>
  );
}

function RoutineForm({ onAdd }: { onAdd: (t: string, time: string, repeat: Repeat, days?: string[]) => void }) {
  const [t, setT] = useState('');
  const [time, setTime] = useState('06:00');
  const [repeat, setRepeat] = useState<Repeat>('daily');
  const [days, setDays] = useState<string[]>([]);
  const WK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input type="time" className="input !w-28" value={time} onChange={(e) => setTime(e.target.value)} aria-label="time" />
        <input className="input" value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. Wake up, CA daily…" aria-label="routine title" />
        <select className="input !w-28" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} aria-label="repeat">
          <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="days">Days</option>
        </select>
        <button className="btn-ghost text-sm" onClick={() => { if (t.trim()) { onAdd(t.trim(), time, repeat, repeat === 'days' ? days : undefined); setT(''); setDays([]); } }}>Add</button>
      </div>
      {repeat === 'days' && (
        <div className="flex flex-wrap gap-1.5">
          {WK.map((d) => (
            <button
              key={d}
              onClick={() => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
              className={`chip !text-[11px] ${days.includes(d) ? 'chip-active' : 'chip-idle'}`}
            >{d}</button>
          ))}
        </div>
      )}
    </div>
  );
}
