import { useEffect, useMemo, useRef, useState } from 'react';
import QorvixLogo from './components/logo/QorvixLogo';
import { useSyllabus, heatClass, rollupProgress } from './features/syllabus/store';
import type { NodeKind, SourceMode, LearningSource, SylNode } from './features/syllabus/store';
import { useBatches } from './features/syllabus/batches';
import { statusOf } from './features/syllabus/logic';
import { useJobs, isFullyCleared, nextMilestone } from './features/jobs/store';
import type { Stage, StageType, SyllabusLink, Level, Category, PayMode, StageStatus } from './features/jobs/store';
import { useTimetable } from './features/timetable/store';
import type { Repeat, PlanItem } from './features/timetable/store';
import { buildPlan } from './features/timetable/engine';
import { useDashboard } from './features/dashboard/store';
import { daysUntil, fmtDate, todayIso } from './lib/dates';
import { isValidUrl, parseCsv } from './lib/validate';
import { ensurePushPermission, fireDue, scheduleInDays, scheduleBefore, scheduleRoutines } from './lib/notify';

type Tab = 'dashboard' | 'syllabus' | 'jobs' | 'timetable';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('qorvix-theme') !== 'light'; } catch { return true; }
  });
  const [query, setQuery] = useState('');
  const routines = useTimetable((s) => (Array.isArray(s.routines) ? s.routines : []));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('qorvix-theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);

  useEffect(() => {
    // No demo seeds: the app starts empty with guided empty states (§71).
    fireDue().catch(() => undefined);
    const t = window.setInterval(() => fireDue().catch(() => undefined), 60000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      scheduleRoutines(routines);
    } catch {
      /* ignore */
    }
  }, [routines]);

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

      {tab !== 'dashboard' && (
        <button
          className="fab"
          aria-label={tab === 'syllabus' ? 'add syllabus' : tab === 'jobs' ? 'add job' : 'add study topic'}
          onClick={() => {
            const id = tab === 'syllabus' ? 'syl-add-input' : tab === 'jobs' ? 'job-add-name' : 'tt-add-title';
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            window.setTimeout(() => document.getElementById(id)?.focus(), 350);
          }}
        >+</button>
      )}

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
  const days = useTimetable((s) => (Array.isArray(s.days) ? s.days : []));
  const items = useMemo(() => days.find((d) => d.date === todayIso())?.items ?? [], [days]);
  const jobs = useJobs((s) => (Array.isArray(s.jobs) ? s.jobs : []));
  const nodes = useSyllabus((s) => (Array.isArray(s.nodes) ? s.nodes : []));
  const running = useDashboard((s) => s.running);
  const hours = useDashboard((s) => (Array.isArray(s.hours) ? s.hours : []));
  const start = useDashboard((s) => s.start);
  const stop = useDashboard((s) => s.stop);
  const totalToday = useDashboard((s) => s.totalToday);
  const sessionsToday = useDashboard((s) => s.sessionsToday);
  const routines = useTimetable((s) => (Array.isArray(s.routines) ? s.routines : []));

  const active = useMemo(() => jobs.filter((j) => !j.isTarget && !isFullyCleared(j)), [jobs]);
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
      <p className="rounded-xl bg-[#4F46E5]/10 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">👋 Just press <strong>Start</strong> and study — your plan is made from Syllabus + Jobs by itself.</p>
      <div className="grid items-start gap-4 md:grid-cols-2">
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
        {running?.title && <p className="mt-0.5 text-xs text-slate-500">Studying now: <strong>{running.title}</strong></p>}
        <div className="mt-2 flex gap-2">
          {!running
            ? <button className="btn-primary" onClick={() => start()}>▶ Start</button>
            : <button className="btn-ghost" onClick={stop}>⏹ Stop</button>}
        </div>
        {sessionsToday().length > 0 && (
          <div className="mt-2 space-y-0.5">
            {sessionsToday().map((ss) => (
              <p key={ss.id} className="text-[11px] text-slate-500">▶ {ss.title || 'Study'} · {ss.minutes}m</p>
            ))}
          </div>
        )}
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
      </div>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Active Exams + Countdowns</h2>
        <div className="mt-2 space-y-2">
          {active.length === 0 && <p className="text-sm text-slate-500">No active exams. Add one in Jobs — or add a Target dream exam.</p>}
          {active.map((j) => {
            const ms = nextMilestone(j);
            const d = ms?.date ? daysUntil(ms.date) : 9999;
            const urg = !ms?.date ? 'text-slate-500' : d < 7 ? 'text-red-500 font-semibold' : d <= 30 ? 'text-amber-500 font-semibold' : 'text-green-600';
            return (
              <div key={j.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
                <span className={`w-2 self-stretch rounded-full ${j.priority >= 4 ? 'bg-red-500' : j.priority === 3 ? 'bg-amber-500' : 'bg-green-600'}`} />
                <div className="flex-1">
                  <p className="text-sm font-bold">{j.examName} <span className="font-normal text-slate-500">· {j.postName}</span></p>
                  <p className={`text-xs ${urg}`}>
                    {ms?.date ? `${ms.label}: ${d}d left · ${fmtDate(ms.date)}` : (ms?.label ?? 'No date set')}
                    {ms?.postponed ? ' · Postponed' : ''} · P{j.priority}
                  </p>
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
  const nodes = useSyllabus((s) => (Array.isArray(s.nodes) ? s.nodes : []));
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
  const [preview, setPreview] = useState<string[] | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  /** Child-simple add: tap + where you want it, type the name, press Add. */
  const quickAdd = (k: NodeKind, pid: string, parentTitle: string): void => {
    setKind(k);
    setParentId(pid);
    setTitle('');
    const label = k === 'chapter' ? 'Chapter' : k === 'topic' ? 'Topic' : 'Sub-topic';
    setMsg(`Type the ${label} name — it will go inside “${parentTitle}”.`);
    document.getElementById('syl-add')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => titleRef.current?.focus(), 350);
  };

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
    setPreview(null);
  };

  /** Review-before-import preview (§68): counts + sample, nothing is written yet. */
  const doPreview = (): void => {
    try {
      const lines: string[] = [];
      if (fmt === 'json') {
        const data = JSON.parse(text) as { subjects?: { title: string; chapters?: { title: string; topics?: { title: string; subtopics?: string[] }[] }[] }[] };
        const subs = data.subjects ?? [];
        let ch = 0, tp = 0, st = 0;
        const sample: string[] = [];
        for (const s of subs) {
          if (sample.length < 8 && s.title?.trim()) sample.push(`📘 ${s.title.trim()}`);
          for (const c of s.chapters ?? []) {
            ch++;
            if (sample.length < 8 && c.title?.trim()) sample.push(`📁 ${c.title.trim()}`);
            for (const t of c.topics ?? []) {
              tp++;
              if (sample.length < 8 && t.title?.trim()) sample.push(`📝 ${t.title.trim()}`);
              st += (t.subtopics ?? []).length;
            }
          }
        }
        lines.push(`${subs.length} subjects · ${ch} chapters · ${tp} topics · ${st} sub-topics`);
        lines.push(...sample);
      } else {
        const rows = parseCsv(text);
        const head = (rows[0] ?? []).map((c) => c.trim().toLowerCase());
        const hasHead = head.includes('subject') || head.includes('chapter') || head.includes('topic');
        const dataRows = hasHead ? rows.slice(1) : rows;
        lines.push(`${dataRows.length} data rows${hasHead ? ' (header found)' : ' (no header — using subject,chapter,topic,subtopic order)'}`);
        for (const r of dataRows.slice(0, 6)) {
          lines.push(`• ${(r.map((c) => c.trim()).filter(Boolean).join(' › ') || '(empty row)')}`);
        }
      }
      setPreview(lines.length > 0 ? lines : ['Nothing readable found — check the format.']);
      setMsg('');
    } catch {
      setPreview(null);
      setMsg('Preview failed: invalid JSON. Fix it and try again.');
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <section id="syl-add" className="card p-4">
        <h2 className="text-lg font-bold">📚 My Syllabus — one list for all exams</h2>
        <p className="mt-0.5 text-xs text-slate-500">Big idea: Subject › Chapter › Topic. Tap <strong>+</strong> where you want to add.</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-slate-500">Advanced: choose type + parent by hand (or just tap + above)</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select className="input" value={kind} onChange={(e) => { const k = e.target.value as NodeKind; setKind(k); if (k === 'subject') setParentId(''); }} aria-label="node kind">
              <option value="subject">Subject</option><option value="chapter">Chapter</option>
              <option value="topic">Topic</option><option value="subtopic">SubTopic</option>
            </select>
            <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)} aria-label="parent node">
              <option value="">No parent (subject)</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.kind}: {n.title}</option>)}
            </select>
          </div>
        </details>
        <div className="mt-2 flex gap-2">
          <input ref={titleRef} id="syl-add-input" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ratio, Partnership…" aria-label="new title" />
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
            <button className="btn-ghost text-sm" onClick={doPreview}>👁 Preview first</button>
            <button className="btn-ghost text-sm" onClick={doImport}>Import {fmt.toUpperCase()}</button>
          </div>
          {preview && (
            <div className="mt-2 rounded-xl bg-slate-100 p-2.5 text-[11px] dark:bg-white/5">
              <p className="font-semibold">Preview — nothing saved yet:</p>
              {preview.map((l, i) => <p key={i} className="mt-0.5 text-slate-600 dark:text-slate-300">{l}</p>)}
              <button className="btn-primary mt-2 !py-1.5 text-xs" onClick={doImport}>Looks good — import now</button>
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-500">Excel: Save As → CSV with header row subject,chapter,topic,subtopic, then paste here. No heavy library needed.</p>
        </details>
      </section>

      {subjects.length === 0 && (
        nodes.length === 0
          ? (
            <section className="card space-y-1.5 p-4 text-sm">
              <h3 className="font-bold">🌱 Start here — 3 tiny steps</h3>
              <p className="text-slate-500"><strong>1.</strong> Type a Subject above (e.g. Quantitative Aptitude) → Add.</p>
              <p className="text-slate-500"><strong>2.</strong> Tap <strong>+ Chapter</strong> on its card, then <strong>+ Topic</strong> — or paste Excel-CSV via Import.</p>
              <p className="text-slate-500"><strong>3.</strong> Open 💼 Jobs → add your exam → 🗓 Plan makes your study list itself.</p>
            </section>
          )
          : <p className="card p-4 text-sm text-slate-500">No match for “{query}” — clear search or add it above.</p>
      )}
      {nodes.length > 0 && <Batches />}
      {subjects.map((s) => (
        <section key={s.id} className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold"><NodeTitle id={s.id} title={s.title} icon="📘" siblings={siblingTitles(s.id)} /></h3>
            <div className="flex items-center gap-1.5">
              <button className="chip chip-idle !px-2 !py-0.5 !text-[11px]" onClick={() => quickAdd('chapter', s.id, s.title)}>+ Chapter</button>
              <RollupPill id={s.id} />
            </div>
          </div>
          <ProgressBar value={rollupProgress(nodes, s.id)} />
          {childrenOf(s.id).map((c) => (
            <div key={c.id} className="ml-3 mt-2 border-l-2 border-[#4F46E5]/30 pl-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold"><NodeTitle id={c.id} title={c.title} icon="📁" siblings={siblingTitles(c.id)} /></p>
                <div className="flex items-center gap-1.5">
                  <button className="chip chip-idle !px-2 !py-0.5 !text-[11px]" onClick={() => quickAdd('topic', c.id, c.title)}>+ Topic</button>
                  <RollupPill id={c.id} />
                </div>
              </div>
              <ProgressBar value={rollupProgress(nodes, c.id)} />
              {childrenOf(c.id).map((t) => (
                <div key={t.id} className="ml-3 mt-1 border-l border-slate-300 pl-3 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm"><NodeTitle id={t.id} title={t.title} icon="📝" siblings={siblingTitles(t.id)} /> <span className={`ml-1 inline-block h-2 w-2 rounded-full ${heatClass(t)}`} title="weakness heat" /></p>
                    <div className="flex items-center gap-1.5">
                      <button className="chip chip-idle !px-2 !py-0.5 !text-[11px]" onClick={() => quickAdd('subtopic', t.id, t.title)}>+ Sub-topic</button>
                      <label className="flex items-center gap-1 text-[11px] text-slate-500">Done
                        <input type="range" min={0} max={100} value={t.progress} onChange={(e) => setProgress(t.id, Number(e.target.value))} aria-label="how much done" className="w-20" />
                        {t.progress}%
                      </label>
                    </div>
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

/* ---------------- Batches (reusable courses, §17) ---------------- */
function Batches() {
  const batches = useBatches((s) => (Array.isArray(s.batches) ? s.batches : []));
  const addBatch = useBatches((s) => s.addBatch);
  const updateBatch = useBatches((s) => s.updateBatch);
  const removeBatch = useBatches((s) => s.removeBatch);
  const addLecture = useBatches((s) => s.addLecture);
  const updateLecture = useBatches((s) => s.updateLecture);
  const removeLecture = useBatches((s) => s.removeLecture);
  const nodes = useSyllabus((s) => (Array.isArray(s.nodes) ? s.nodes : []));
  const [name, setName] = useState('');
  const [lecDraft, setLecDraft] = useState<Record<string, string>>({});

  const subjects = nodes.filter((n) => n.kind === 'subject');
  const linkables = nodes.filter((n) => n.kind === 'chapter' || n.kind === 'topic' || n.kind === 'subtopic');
  const nodeTitle = (id?: string): string => (id ? (nodes.find((n) => n.id === id)?.title ?? '') : '');

  return (
    <details className="card p-4" open={batches.length === 0}>
      <summary className="cursor-pointer text-lg font-bold">📦 My Batches — full courses ({batches.length})</summary>
      <p className="mt-1 text-xs text-slate-500">A batch teaches many topics at once. Add the batch → add its lectures → after studying, link each lecture to the exact syllabus topic. Same topic is never duplicated.</p>
      <div className="mt-2 flex gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New batch e.g. SSC Quant Batch…" aria-label="new batch name" />
        <button className="btn-primary" onClick={() => { if (name.trim()) { addBatch(name.trim()); setName(''); } }}>+ Add</button>
      </div>
      <div className="mt-3 space-y-3">
        {batches.map((b) => (
          <div key={b.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <input className="input !text-sm font-bold" value={b.name} onChange={(e) => updateBatch(b.id, { name: e.target.value })} aria-label="batch name" />
              <button className="text-[11px] opacity-60" aria-label="delete batch" onClick={() => { if (window.confirm(`Delete batch “${b.name}”?`)) removeBatch(b.id); }}>🗑</button>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <input className="input !text-xs" value={b.description ?? ''} onChange={(e) => updateBatch(b.id, { description: e.target.value })} placeholder="What is this batch for? (optional)" aria-label="batch description" />
              <select className="input !text-xs" value={b.subjectId ?? ''} onChange={(e) => updateBatch(b.id, { subjectId: e.target.value || undefined })} aria-label="batch subject">
                <option value="">Subject? (pick when known)</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">Lectures ({b.lectures.length})</p>
            <div className="mt-1 space-y-1.5">
              {b.lectures.map((l) => (
                <div key={l.id} className="grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-2 dark:bg-white/5">
                  <input className="input !text-xs" value={l.no ?? ''} onChange={(e) => updateLecture(b.id, l.id, { no: e.target.value })} placeholder="No. (e.g. 18)" aria-label="lecture number" />
                  <input className="input !text-xs" value={l.name} onChange={(e) => updateLecture(b.id, l.id, { name: e.target.value })} placeholder="Lecture name" aria-label="lecture name" />
                  <input className="input !text-xs col-span-2" value={l.url ?? ''} onChange={(e) => updateLecture(b.id, l.id, { url: e.target.value })} placeholder="Lecture URL (optional)" aria-label="lecture url" />
                  <select
                    className="input !text-xs col-span-2"
                    value={l.nodeId ?? ''}
                    onChange={(e) => updateLecture(b.id, l.id, { nodeId: e.target.value || undefined })}
                    aria-label="linked syllabus topic"
                  >
                    <option value="">Teaches which topic? (link after study{nodeTitle(l.nodeId) ? `: now ${nodeTitle(l.nodeId)}` : ''})</option>
                    {linkables.map((n) => <option key={n.id} value={n.id}>{n.kind}: {n.title}</option>)}
                  </select>
                  <button className="col-span-2 text-right text-[11px] text-red-400" onClick={() => removeLecture(b.id, l.id)}>Remove lecture ✕</button>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              <input
                className="input !text-xs"
                value={lecDraft[b.id] ?? ''}
                onChange={(e) => setLecDraft((p) => ({ ...p, [b.id]: e.target.value }))}
                placeholder="New lecture e.g. Lecture 18 — Ratio basics"
                aria-label="new lecture name"
              />
              <button
                className="btn-ghost !py-1.5 text-xs"
                onClick={() => { const v = (lecDraft[b.id] ?? '').trim(); if (v) { addLecture(b.id, v); setLecDraft((p) => ({ ...p, [b.id]: '' })); } }}
              >+ Lecture</button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden="true">
      <div className="h-full rounded-full bg-[#4F46E5]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function RollupPill({ id }: { id: string }) {
  const nodes = useSyllabus((s) => (Array.isArray(s.nodes) ? s.nodes : []));
  const v = rollupProgress(nodes, id);
  return <span className="chip chip-idle !px-2 !py-0.5 !text-[11px]" title={statusOf(v)}>{v}% · {statusOf(v)}</span>;
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
  const [batchId, setBatchId] = useState(existing?.batchId ?? '');
  const [lectureId, setLectureId] = useState(existing?.lectureId ?? '');
  const batches = useBatches((s) => (Array.isArray(s.batches) ? s.batches : []));
  const selBatch = batches.find((b) => b.id === batchId);
  const [err, setErr] = useState('');

  const savedBatch = existing?.batchId ? (batches.find((b) => b.id === existing.batchId)?.name ?? '') : '';
  const savedLec = existing?.lectureId && existing?.batchId
    ? (batches.find((b) => b.id === existing.batchId)?.lectures.find((l) => l.id === existing.lectureId)?.name ?? '')
    : '';
  const saved = existing
    ? `${existing.mode}${existing.indName ? ` · ${existing.indName}` : ''}${savedBatch ? ` · 📦 ${savedBatch}${savedLec ? ` — ${savedLec}` : ''}` : existing.batchName ? ` · ${existing.batchName}` : ''}`
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
          {batches.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              <select className="input !py-1.5 !text-xs" value={batchId} onChange={(e) => { setBatchId(e.target.value); setLectureId(''); }} aria-label="pick my batch">
                <option value="">Pick my batch…</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select className="input !py-1.5 !text-xs" value={lectureId} onChange={(e) => setLectureId(e.target.value)} aria-label="pick lecture" disabled={!selBatch}>
                <option value="">Pick lecture…</option>
                {(selBatch?.lectures ?? []).map((l) => <option key={l.id} value={l.id}>{l.no ? `${l.no} — ` : ''}{l.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <input className="input !py-1.5 !text-xs" value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Batch name (if not in My Batches) *" aria-label="batch name" />
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
          if ((mode === 'batch' || mode === 'both') && !batchId && !batchName.trim()) { setErr('Pick a batch (or type its name).'); return; }
          setErr('');
          const clean = (v: string): string | undefined => (v.trim() ? v.trim() : undefined);
          onSave({
            mode,
            indName: clean(indName), indUrl: clean(indUrl), indNotes: clean(indNotes),
            batchName: clean(batchName), batchSubject: clean(batchSubject), batchNotes: clean(batchNotes),
            batchId: batchId || undefined, lectureId: lectureId || undefined,
          });
        }}
      >Save source</button>
    </div>
  );
}

/* ---------------- Jobs ---------------- */
function Jobs({ query }: { query: string }) {
  const jobs = useJobs((s) => (Array.isArray(s.jobs) ? s.jobs : []));
  const addJob = useJobs((s) => s.addJob);
  const updateJob = useJobs((s) => s.updateJob);
  const removeJob = useJobs((s) => s.removeJob);
  const convertTarget = useJobs((s) => s.convertTarget);
  const addStage = useJobs((s) => s.addStage);
  const [filter, setFilter] = useState<'Jobs' | 'Academics' | 'Targets'>('Jobs');
  const [name, setName] = useState('');

  const matchesFilter = (j: { examName: string; kind: string; isTarget: boolean }): boolean => {
    if (!j.examName.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'Targets') return j.isTarget;
    if (filter === 'Academics') return j.kind === 'academic' && !j.isTarget;
    return j.kind === 'job' && !j.isTarget;
  };
  // Parents first, grouped applications nested right below (§36). Collapse hides children.
  const roots = jobs.filter((j) => !j.parentId && matchesFilter(j));
  const kidCount = (id: string): number => jobs.filter((x) => x.parentId === id).length;
  const parentName = (id?: string): string => (id ? (jobs.find((x) => x.id === id)?.examName ?? '') : '');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const ordered = roots.flatMap((j) => {
    const kids = jobs.filter((x) => x.parentId === j.id && matchesFilter(x));
    return collapsed[j.id] ? [j] : [j, ...kids];
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
          <input id="job-add-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New exam e.g. SSC CGL / UGC NET…" aria-label="new exam name" />
          <button className="btn-primary" onClick={() => { if (name.trim()) { addJob({ examName: name.trim(), kind: filter === 'Academics' ? 'academic' : 'job', isTarget: filter === 'Targets' }); setName(''); } }}>+ Add</button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Dream exam? Just add the name for now — press the button on its card when you fill the form.</p>
      </section>

      {ordered.length === 0 && (
        <section className="card space-y-1.5 p-4 text-sm">
          <h3 className="font-bold">💼 No exams here yet</h3>
          <p className="text-slate-500"><strong>1.</strong> Type an exam name above → + Add{filter === 'Targets' ? ' (dream exam — no form needed).' : ' (after you fill its form).'}</p>
          <p className="text-slate-500"><strong>2.</strong> Open its card → tap Prelims/Mains/… → Step 1 sets date + syllabus.</p>
          <p className="text-slate-500"><strong>3.</strong> Same job in many districts? Combine them under one parent below its card.</p>
        </section>
      )}
      {ordered.map((j) => (
        <article key={j.id} className={`card flex gap-3 p-3 ${j.parentId ? 'ml-6 border-l-4 !border-l-amber-500' : ''}`}>
          <span className={`w-2.5 rounded-full ${j.category === 'Central' ? 'bg-[#4F46E5]' : j.category === 'District' ? 'bg-amber-500' : 'bg-green-600'}`} title={j.category} />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-bold">{j.examName}</h3>
                <p className="text-xs text-slate-500">{j.postName || 'Post —'} · {j.level} · {j.category} · P{j.priority}{j.parentId ? ` · ↳ grouped under ${parentName(j.parentId)}` : kidCount(j.id) > 0 ? ` · 🔗 ${kidCount(j.id)} grouped` : ''}</p>
                {j.isTarget && <span className="mt-1 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-600">🎯 TARGET</span>}
              </div>
              <div className="flex items-center gap-1">
                {j.stages.some((s) => s.result.cleared) && <span className="icon-badge-ok">✓</span>}
                {j.stages.some((s) => s.result.status === 'Missed') && <span className="icon-badge-no">✗</span>}
                {j.stages.length > 0 ? <span className="icon-badge-pending">○</span> : null}
                {!j.parentId && kidCount(j.id) > 0 && (
                  <button
                    className="chip chip-idle !px-2 !py-0.5 !text-[10px]"
                    onClick={() => setCollapsed((p) => ({ ...p, [j.id]: !p[j.id] }))}
                  >{collapsed[j.id] ? `Show ${kidCount(j.id)}` : 'Hide'} 🔗</button>
                )}
                <button className="px-1 text-[11px] opacity-60" aria-label="delete job" onClick={() => { if (window.confirm(`Delete ${j.examName} and its stages?`)) removeJob(j.id); }}>🗑</button>
              </div>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-slate-500">📝 Form details (post, fee, numbers…)</summary>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              <input className="input !text-xs" value={j.postName} onChange={(e) => updateJob(j.id, { postName: e.target.value })} placeholder="Post name *" aria-label="post name" />
              <input className="input !text-xs" value={j.bodyName} onChange={(e) => updateJob(j.id, { bodyName: e.target.value })} placeholder="Conducting body name" aria-label="body name" />
              <input className="input !text-xs" value={j.bodyWebsite} onChange={(e) => updateJob(j.id, { bodyWebsite: e.target.value })} placeholder="Body website" aria-label="body website" />
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
                  <label className="flex items-center gap-1.5 text-xs">Refund status
                    <select className="input !w-auto !py-1 !text-xs" value={j.refundStatus ?? 'Expected'} onChange={(e) => updateJob(j.id, { refundStatus: e.target.value as 'Expected' | 'Received' })} aria-label="refund status">
                      <option>Expected</option><option>Received</option>
                    </select>
                  </label>
                </>
              )}
              <input className="input !text-xs" value={j.appNo ?? ''} onChange={(e) => updateJob(j.id, { appNo: e.target.value })} placeholder="Application No. (optional)" aria-label="application number" />
              <input className="input !text-xs" value={j.regNo ?? ''} onChange={(e) => updateJob(j.id, { regNo: e.target.value })} placeholder="Registration No. (optional)" aria-label="registration number" />
              <input className="input !text-xs col-span-2" value={j.rollNo ?? ''} onChange={(e) => updateJob(j.id, { rollNo: e.target.value })} placeholder="Roll No. (optional — entry now or at admit)" aria-label="roll number" />
              </div>
            </details>

            {j.isTarget
              ? <>
                <TargetLinks jobId={j.id} links={j.targetLinks} />
                <button className="btn-primary mt-2 w-full !py-2.5 text-xs" onClick={() => convertTarget(j.id)}>📝 I filled the form — make it Active</button>
              </>
              : (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-slate-500">Which steps does this exam have? Tap to add (any order):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['Prelims', 'Mains', 'Tier II', 'Written', 'Skill', 'DV', 'Interview'] as StageType[]).map((t) => (
                      <button key={t} className="chip chip-idle !text-[11px]" onClick={() => addStage(j.id, t)}>+ {t}</button>
                    ))}
                  </div>
                  {j.stages.map((st) => (
                    <StageCard key={st.id} jobId={j.id} jobName={j.examName} st={st} />
                  ))}
                  <details>
                    <summary className="cursor-pointer text-[11px] text-slate-500">🔗 Combine: same job in many districts? Put them under one parent…</summary>
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

function StepDot({ done, n }: { done: boolean; n: number }) {
  return done
    ? <span className="icon-badge-ok !h-5 !w-5 !text-[10px]">✓</span>
    : <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-600 dark:bg-white/15 dark:text-slate-300">{n}</span>;
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

  const s1 = !!st.approxDate && (st.links.length > 0 || (st.type === 'Skill' && !!st.customSyllabus?.trim()));
  const s2 = st.admit.downloaded;
  const s3 = !!st.result.status;

  return (
    <div className="rounded-xl bg-slate-100 p-2.5 text-xs dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <strong>{st.type}</strong>
        <div className="flex items-center gap-1" title="1 date+syllabus · 2 admit · 3 result">
          <StepDot done={s1} n={1} /><span className="w-0.5" /><StepDot done={s2} n={2} /><span className="w-0.5" /><StepDot done={s3} n={3} />
          <button className="ml-1 text-[11px] opacity-60" aria-label="remove stage" onClick={() => { if (window.confirm(`Remove ${st.type} stage?`)) removeStage(jobId, st.id); }}>✕</button>
        </div>
      </div>

      <details open={!s1} className="mt-1.5 rounded-lg bg-white p-2 dark:bg-white/5">
        <summary className="cursor-pointer font-semibold">Step 1 · 📅 Date + 📘 What to study {s1 ? '✓' : ''}</summary>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500">Exam around:</span>
          <input type="date" className="input !w-auto !py-1 !text-xs" value={st.approxDate ?? ''} onChange={(e) => armApprox(e.target.value)} aria-label="expected date" />
          <span className="text-[11px] text-slate-500">until:</span>
          <input type="date" className="input !w-auto !py-1 !text-xs" value={st.dateEnd ?? ''} onChange={(e) => updateStage(jobId, st.id, { dateEnd: e.target.value || undefined })} aria-label="date range end" />
          <select className="input !w-auto !py-1 !text-xs" value={st.status ?? 'Scheduled'} onChange={(e) => updateStage(jobId, st.id, { status: e.target.value as StageStatus })} aria-label="stage status">
            <option>Scheduled</option><option>Postponed</option><option>Rescheduled</option>
          </select>
        </div>
        <StageLinks jobId={jobId} stageId={st.id} links={st.links} />
        {st.type === 'Skill' && (
          <textarea
            className="input mt-1.5 !text-xs"
            rows={2}
            placeholder="Skill to learn (your words) — e.g. Typing, running test…"
            value={st.customSyllabus ?? ''}
            onChange={(e) => updateStage(jobId, st.id, { customSyllabus: e.target.value })}
            aria-label="skill syllabus"
          />
        )}
      </details>

      <details open={s1 && !s2} className="mt-1.5 rounded-lg bg-white p-2 dark:bg-white/5">
        <summary className="cursor-pointer font-semibold">Step 2 · 🎫 Admit card {s2 ? '✓' : ''}</summary>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <input className="input !text-xs" placeholder="Exam date" value={st.admit.examDate ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, examDate: e.target.value } })} aria-label="exam date" />
          <input className="input !text-xs" placeholder="Shift (morning/evening)" value={st.admit.shift ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, shift: e.target.value } })} aria-label="shift" />
          <input className="input !text-xs" placeholder="Gate closes at" value={st.admit.gateClosing ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, gateClosing: e.target.value } })} aria-label="gate closing" />
          <input className="input !text-xs" placeholder="Exam center" value={st.admit.center ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, center: e.target.value } })} aria-label="center" />
          <input className="input !text-xs col-span-2" placeholder="Take with you (documents, photo, pen…)" value={st.admit.docs ?? ''} onChange={(e) => updateStage(jobId, st.id, { admit: { ...st.admit, docs: e.target.value } })} aria-label="documents" />
          <label className="col-span-2 flex items-center gap-2 font-semibold text-[#4F46E5]">
            <input type="checkbox" checked={st.admit.downloaded} onChange={(e) => armExam(e.target.checked, st.admit.examDate)} /> I downloaded the admit card ✓
          </label>
        </div>
      </details>

      <details open={s2 && !s3} className="mt-1.5 rounded-lg bg-white p-2 dark:bg-white/5">
        <summary className="cursor-pointer font-semibold">Step 3 · 🏁 Exam done? Result {s3 ? '✓' : ''}</summary>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <select className="input !text-xs" value={st.result.status ?? ''} onChange={(e) => setStatus(e.target.value)} aria-label="what happened">
            <option value="">What happened?</option><option value="Given">I gave it ✓</option><option value="Missed">Missed ✗</option><option value="Overlap">Date clashed ○</option>
          </select>
          <input className="input !text-xs" placeholder="Answer key link" value={st.result.answerKey ?? ''} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, answerKey: e.target.value } })} aria-label="answer key" />
          <input className="input !text-xs" placeholder="My marks" value={st.result.marks ?? ''} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, marks: e.target.value } })} aria-label="marks" />
          <input className="input !text-xs" placeholder="Cutoff" value={st.result.cutoff ?? ''} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, cutoff: e.target.value } })} aria-label="cutoff" />
          <input className="input !text-xs col-span-2" placeholder="Result PDF link" value={st.result.pdf ?? ''} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, pdf: e.target.value } })} aria-label="result pdf" />
          <label className="col-span-2 flex items-center gap-2 font-semibold text-green-600"><input type="checkbox" checked={!!st.result.cleared} onChange={(e) => updateStage(jobId, st.id, { result: { ...st.result, cleared: e.target.checked } })} /> I cleared it — add next step above 🎉</label>
        </div>
      </details>
    </div>
  );
}

function StageLinks({ jobId, stageId, links }: { jobId: string; stageId: string; links: SyllabusLink[] }) {
  const updateStage = useJobs((s) => s.updateStage);
  return <LinkPicker links={links} onChange={(l) => updateStage(jobId, stageId, { links: l })} />;
}

function TargetLinks({ jobId, links }: { jobId: string; links: SyllabusLink[] }) {
  const updateJob = useJobs((s) => s.updateJob);
  return (
    <div className="mt-2">
      <LinkPicker links={links} onChange={(l) => updateJob(jobId, { targetLinks: l })} />
      <p className="mt-1 text-[11px] text-slate-500">This syllabus steers your study plan even before you fill the form — and moves along when you convert.</p>
    </div>
  );
}

function LinkPicker({ links, onChange }: { links: SyllabusLink[]; onChange: (l: SyllabusLink[]) => void }) {
  const nodes = useSyllabus((s) => (Array.isArray(s.nodes) ? s.nodes : []));
  const [subj, setSubj] = useState('');
  const [chap, setChap] = useState('');
  const [wt, setWt] = useState(0);
  const [err, setErr] = useState('');

  const subjects = nodes.filter((n) => n.kind === 'subject');
  const chapters = nodes.filter((n) => n.kind === 'chapter' && n.parentId === subj);
  const titleOf = (id: string): string => nodes.find((n) => n.id === id)?.title ?? '—';

  return (
    <div className="mt-1.5 rounded-lg border border-slate-200 p-2 dark:border-white/10">
      <p className="text-[11px] font-semibold text-slate-500">📘 What to study (pick a Subject first — that is a must)</p>
      {links.length === 0 && <p className="mt-0.5 text-[11px] text-slate-500">Nothing linked yet — choose a Subject below, then tap + Link.</p>}
      <div className="mt-1 space-y-1">
        {links.map((l, i) => (
          <div key={`${l.subjectId}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1 dark:bg-white/5">
            <span className="text-[11px]">📘 {titleOf(l.subjectId)}{l.chapterIds[0] ? ` › ${titleOf(l.chapterIds[0] as string)}` : ''}{l.weightage ? ` · ${l.weightage} marks` : ''}</span>
            <button
              className="text-[11px] text-red-400"
              aria-label="remove link"
              onClick={() => onChange(links.filter((_, k) => k !== i))}
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
        <label className="flex items-center gap-1.5 text-[11px]">Marks (optional)
          <input type="number" min={0} className="input !w-20 !text-xs" value={wt} onChange={(e) => setWt(Math.max(0, Number(e.target.value)))} aria-label="marks from total" />
        </label>
        <button
          className="rounded-lg bg-[#4F46E5] px-2 py-1 text-[11px] font-semibold text-white"
          onClick={() => {
            if (!subj) { setErr('Subject is mandatory.'); return; }
            setErr('');
            onChange([...links, { subjectId: subj, chapterIds: chap ? [chap] : [], weightage: wt > 0 ? wt : undefined }]);
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
  const days = useTimetable((s) => (Array.isArray(s.days) ? s.days : []));
  const ensureToday = useTimetable((s) => s.ensureToday);
  const replaceToday = useTimetable((s) => s.replaceToday);
  const addItem = useTimetable((s) => s.addItem);
  const updateItem = useTimetable((s) => s.updateItem);
  const removeItem = useTimetable((s) => s.removeItem);
  const moveItem = useTimetable((s) => s.moveItem);
  const shiftRemaining = useTimetable((s) => s.shiftRemaining);
  const routines = useTimetable((s) => (Array.isArray(s.routines) ? s.routines : []));
  const addRoutine = useTimetable((s) => s.addRoutine);
  const removeRoutine = useTimetable((s) => s.removeRoutine);
  const nodes = useSyllabus((s) => (Array.isArray(s.nodes) ? s.nodes : []));
  const jobs = useJobs((s) => (Array.isArray(s.jobs) ? s.jobs : []));
  const logResult = useSyllabus((s) => s.logResult);
  const completeNode = useSyllabus((s) => s.completeNode);
  const dashStart = useDashboard((s) => s.start);
  const [title, setTitle] = useState('');
  const [mins, setMins] = useState(45);

  const today = days.find((d) => d.date === todayIso());
  const [motivation, setMotivation] = useState('');

  const generate = () => {
    const plan = buildPlan(nodes, jobs, new Date());
    ensureToday(plan.items);
    setMotivation(plan.motivation ?? '');
  };
  const remake = () => {
    if (!window.confirm('Replace today’s plan with a fresh proposal? Your done ticks will be lost.')) return;
    const plan = buildPlan(nodes, jobs, new Date());
    replaceToday(plan.items);
    setMotivation(plan.motivation ?? '');
  };
  const toggleDone = (date: string, it: PlanItem) => {
    if (it.status === 'done') {
      updateItem(date, it.id, { status: 'todo' });
      return;
    }
    updateItem(date, it.id, { status: 'done' });
    if (it.nodeId) completeNode(it.nodeId); // syllabus auto-completes (§79)
  };

  return (
    <div className="mt-4 space-y-4">
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🌙 Tonight → Tomorrow</h2>
          <div className="flex gap-1.5">
            {today && today.items.length > 0 && <button className="btn-ghost !py-2 text-xs" onClick={remake}>↻ Remake</button>}
            <button className="btn-primary !py-2 text-xs" onClick={generate}>Make my plan ✨</button>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">One tap makes tomorrow&apos;s study list from your exams. You can change it before saving.</p>
        {motivation && <p className="mt-2 rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-600">{motivation}</p>}
        <div className="mt-2 flex gap-2">
          <input id="tt-add-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Custom topic e.g. Polity — Fundamental Rights" aria-label="custom topic" />
          <input type="number" className="input !w-20" value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="minutes" />
          <button className="btn-ghost text-sm" onClick={() => { if (title.trim()) { addItem(todayIso(), { nodeId: '', title: title.trim(), chosenSource: 'both', minutes: mins }); setTitle(''); } }}>Add</button>
        </div>
      </section>

      {(!today || today.items.length === 0) && <p className="card p-4 text-sm text-slate-500">No items today. Generate plan above.</p>}
      {today?.items.map((it) => (
        <section key={it.id} className="card p-3">
          <p className="text-sm font-bold">{it.status === 'done' ? '✅' : '○'} {it.title} · {it.minutes}m{it.actualMinutes ? ` (took ${it.actualMinutes}m)` : ''}</p>
          <div className="mt-2 flex gap-1.5">
            <button
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white ${it.status === 'done' ? 'bg-green-600' : 'bg-[#4F46E5]'}`}
              onClick={() => toggleDone(today.date, it)}
            >{it.status === 'done' ? '✅ Done — tap to undo' : 'Tap when done ✓'}</button>
            <button
              className="rounded-xl border border-slate-200 px-3 text-sm dark:border-white/10"
              aria-label="study now with timer"
              title="Start timer linked to this task"
              onClick={() => dashStart(it.title, it.nodeId || undefined)}
            >▶</button>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] text-slate-500">Change (time, order, mistakes…)</summary>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <label className="flex items-center gap-1 text-[11px]">Time
                <input type="number" min={10} className="input !w-16 !py-1 !text-xs" value={it.minutes} onChange={(e) => updateItem(today.date, it.id, { minutes: Math.max(10, Number(e.target.value) || 10) })} aria-label="planned minutes" />
              </label>
              <label className="flex items-center gap-1 text-[11px]">Took
                <input type="number" min={0} className="input !w-16 !py-1 !text-xs" value={it.actualMinutes ?? ''} onChange={(e) => updateItem(today.date, it.id, { actualMinutes: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })} placeholder="—" aria-label="actual minutes" />
              </label>
              <button className="chip chip-idle !text-[11px]" onClick={() => moveItem(today.date, it.id, -1)} aria-label="move up">↑</button>
              <button className="chip chip-idle !text-[11px]" onClick={() => moveItem(today.date, it.id, 1)} aria-label="move down">↓</button>
              <button className="chip chip-idle !text-[11px]" onClick={() => { if (window.confirm(`Remove “${it.title}”?`)) removeItem(today.date, it.id); }}>Remove ✕</button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Study from:</span>
              <select className="input !w-28 !py-1 !text-xs" value={it.chosenSource} onChange={(e) => updateItem(today.date, it.id, { chosenSource: e.target.value as 'both' })} aria-label="study from">
                <option value="individual">My video</option><option value="batch">My batch</option><option value="both">Both</option>
              </select>
            </div>
            <BatchHint nodeId={it.nodeId} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button className="chip chip-idle !text-[11px]" onClick={() => shiftRemaining(today.date, it.id, 30)}>Need +30m? (today only)</button>
              <button className="chip chip-idle !text-[11px]" onClick={() => { if (it.nodeId) logResult(it.nodeId, false); updateItem(today.date, it.id, { incorrect: (it.incorrect ?? 0) + 1 }); }}>✗ I got it wrong</button>
              <button className="chip chip-idle !text-[11px]" onClick={() => { if (it.nodeId) logResult(it.nodeId, true); updateItem(today.date, it.id, { correct: (it.correct ?? 0) + 1 }); }}>✓ I got it right</button>
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
                <option value="">Which topic was this? (pick one…)</option>
                {nodes.filter((n) => n.kind === 'chapter' || n.kind === 'topic' || n.kind === 'subtopic').map((n) => <option key={n.id} value={n.id}>{n.kind}: {n.title}</option>)}
              </select>
            )}
            {(it.correct || it.incorrect) ? <p className="mt-1 text-[11px] text-slate-500">✓ {it.correct ?? 0} · ✗ {it.incorrect ?? 0} — wrong ones come back in revision by themselves.</p> : null}
          </details>
          <input className="input mt-2 !text-xs" placeholder="What did you learn? (one line…)" value={it.summary ?? it.mistakeNote ?? ''} onChange={(e) => updateItem(today.date, it.id, { summary: e.target.value, mistakeNote: e.target.value })} aria-label="what did you learn" />
        </section>
      ))}

      <section className="card p-4">
        <h3 className="font-bold">Daily Routine (repeat)</h3>
        <RoutineForm onAdd={addRoutine} />
        {routines.map((r) => (
          <p key={r.id} className="mt-1 flex items-center justify-between gap-2 text-sm text-slate-500">
            <span>{r.time} — {r.title} · {r.repeat}{r.repeat === 'days' && r.days?.length ? ` (${r.days.join(', ')})` : ''}{r.repeat === 'once' && r.date ? ` (${r.date})` : ''}</span>
            <button className="text-[11px] opacity-60" aria-label="remove routine" onClick={() => removeRoutine(r.id)}>✕</button>
          </p>
        ))}
      </section>
    </div>
  );
}

function BatchHint({ nodeId }: { nodeId: string }) {
  const nodes = useSyllabus((s) => (Array.isArray(s.nodes) ? s.nodes : []));
  const batches = useBatches((s) => (Array.isArray(s.batches) ? s.batches : []));
  if (!nodeId) return null;
  const src = nodes.find((n) => n.id === nodeId)?.source;
  if (!src?.batchId) return null;
  const b = batches.find((x) => x.id === src.batchId);
  if (!b) return null;
  return (
    <p className="mt-1 text-[11px] text-slate-500">
      📦 {b.name}{b.lectures.length > 0 ? ` — lectures: ${b.lectures.map((l) => `${l.no ? `${l.no}. ` : ''}${l.name}`).join(' · ')}` : ' (no lectures added yet)'}
    </p>
  );
}

function RoutineForm({ onAdd }: { onAdd: (t: string, time: string, repeat: Repeat, days?: string[], date?: string) => void }) {
  const [t, setT] = useState('');
  const [time, setTime] = useState('06:00');
  const [repeat, setRepeat] = useState<Repeat>('daily');
  const [days, setDays] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const WK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input type="time" className="input !w-28" value={time} onChange={(e) => setTime(e.target.value)} aria-label="time" />
        <input className="input" value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. Wake up, CA daily…" aria-label="routine title" />
        <select className="input !w-28" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} aria-label="repeat">
          <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="days">Days</option><option value="once">Once</option>
        </select>
        <button className="btn-ghost text-sm" onClick={() => { if (t.trim()) { onAdd(t.trim(), time, repeat, repeat === 'days' ? days : undefined, repeat === 'once' ? date || undefined : undefined); setT(''); setDays([]); setDate(''); } }}>Add</button>
      </div>
      {repeat === 'once' && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">On date:</span>
          <input type="date" className="input !w-auto !py-1 !text-xs" value={date} onChange={(e) => setDate(e.target.value)} aria-label="specific date" />
        </div>
      )}
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
