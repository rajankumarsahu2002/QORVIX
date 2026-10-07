import { useEffect, useMemo, useState } from 'react';
import QorvixLogo from './components/logo/QorvixLogo';
import { useSyllabus, heatClass } from './features/syllabus/store';
import type { NodeKind, SourceMode } from './features/syllabus/store';
import { useJobs } from './features/jobs/store';
import type { StageType } from './features/jobs/store';
import { useTimetable } from './features/timetable/store';
import { useDashboard } from './features/dashboard/store';
import { daysUntil, fmtDate, todayIso } from './lib/dates';
import { ensurePushPermission, fireDue, scheduleInDays } from './lib/notify';

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
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Active Exams + Countdowns</h2>
        <div className="mt-2 space-y-2">
          {active.length === 0 && <p className="text-sm text-slate-500">No active exams. Convert a Target in Jobs.</p>}
          {active.map((j) => {
            const next = j.stages.map((s) => s.approxDate).filter(Boolean).sort()[0] as string | undefined;
            const d = next ? daysUntil(next) : 9999;
            return (
              <div key={j.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
                <span className={`w-2 self-stretch rounded-full ${j.priority >= 4 ? 'bg-red-500' : j.priority === 3 ? 'bg-amber-500' : 'bg-green-600'}`} />
                <div className="flex-1">
                  <p className="text-sm font-bold">{j.examName} <span className="font-normal text-slate-500">· {j.postName}</span></p>
                  <p className="text-xs text-slate-500">{next ? `${d}d left · ${fmtDate(next)}` : 'No date set'} · P{j.priority}</p>
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
            {routines.map((r) => <p key={r.id} className="text-sm text-slate-500">{r.time} — {r.title}</p>)}
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
  const removeNode = useSyllabus((s) => s.removeNode);
  const importJson = useSyllabus((s) => s.importJson);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<NodeKind>('subject');
  const [parentId, setParentId] = useState('');
  const [json, setJson] = useState('');
  const [msg, setMsg] = useState('');

  const subjects = nodes.filter((n) => n.kind === 'subject' && n.title.toLowerCase().includes(query.toLowerCase()));
  const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);

  return (
    <div className="mt-4 space-y-4">
      <section className="card p-4">
        <h2 className="text-lg font-bold">Add — Subject › Chapter › Topic › SubTopic</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as NodeKind)}>
            <option value="subject">Subject</option><option value="chapter">Chapter</option>
            <option value="topic">Topic</option><option value="subtopic">SubTopic</option>
          </select>
          <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">No parent (subject)</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.kind}: {n.title}</option>)}
          </select>
        </div>
        <div className="mt-2 flex gap-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ratio, Partnership…" />
          <button className="btn-primary" onClick={() => { addNode(kind, title, parentId || undefined); setTitle(''); }}>Add</button>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#4F46E5]">Import JSON / Excel-CSV (paste JSON)</summary>
          <textarea className="input mt-2 h-24" value={json} onChange={(e) => setJson(e.target.value)} placeholder='{"subjects":[{"title":"Quant","chapters":[{"title":"Ratio","topics":[{"title":"Partnership"}]}]}]}' />
          <div className="mt-2 flex items-center gap-2">
            <button className="btn-ghost text-sm" onClick={() => { const r = importJson(json); setMsg(`Added ${r.added}, skipped ${r.skipped}`); }}>Import</button>
            {msg && <span className="text-xs text-slate-500">{msg}</span>}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Excel: save as CSV then convert to above JSON (keeps app light, no heavy lib).</p>
        </details>
      </section>

      {subjects.map((s) => (
        <section key={s.id} className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">📘 {s.title}</h3>
            <button className="text-xs text-red-500" onClick={() => removeNode(s.id)}>Delete</button>
          </div>
          {childrenOf(s.id).map((c) => (
            <div key={c.id} className="ml-3 mt-2 border-l-2 border-[#4F46E5]/30 pl-3">
              <p className="text-sm font-semibold">📁 {c.title}</p>
              {childrenOf(c.id).map((t) => (
                <div key={t.id} className="ml-3 mt-1 border-l border-slate-300 pl-3 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">📝 {t.title} <span className={`ml-1 inline-block h-2 w-2 rounded-full ${heatClass(t)}`} title="weakness heat" /></p>
                    <input type="range" min={0} max={100} value={t.progress} onChange={(e) => setProgress(t.id, Number(e.target.value))} aria-label="progress" className="w-24" />
                  </div>
                  <SourceEditor nodeId={t.id} currentMode={t.source?.mode ?? 'both'} onSave={(m, f) => setSource(t.id, { mode: m, ...f })} />
                  {childrenOf(t.id).map((st) => (
                    <div key={st.id} className="ml-3 mt-1 border-l border-slate-300 pl-3 dark:border-white/10">
                      <p className="text-[13px]">🔹 {st.title} <span className={`ml-1 inline-block h-2 w-2 rounded-full ${heatClass(st)}`} /></p>
                      <SourceEditor nodeId={st.id} currentMode={st.source?.mode ?? 'individual'} onSave={(m, f) => setSource(st.id, { mode: m, ...f })} />
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

function SourceEditor({ currentMode, onSave }: { nodeId: string; currentMode: SourceMode; onSave: (m: SourceMode, f: Record<string, string>) => void }) {
  const [mode, setMode] = useState<SourceMode>(currentMode);
  const [indName, setIndName] = useState('');
  const [indUrl, setIndUrl] = useState('');
  const [batchName, setBatchName] = useState('');
  return (
    <div className="mt-1 rounded-xl bg-slate-100 p-2 text-xs dark:bg-white/5">
      <div className="flex gap-1.5">
        {(['individual', 'batch', 'both'] as SourceMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`chip ${mode === m ? 'chip-active' : 'chip-idle'} !px-2.5 !py-1 !text-[11px]`}>{m}</button>
        ))}
      </div>
      {(mode === 'individual' || mode === 'both') && (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <input className="input !py-1.5 !text-xs" value={indName} onChange={(e) => setIndName(e.target.value)} placeholder="Lecture name" />
          <input className="input !py-1.5 !text-xs" value={indUrl} onChange={(e) => setIndUrl(e.target.value)} placeholder="Lecture URL" />
        </div>
      )}
      {(mode === 'batch' || mode === 'both') && (
        <input className="input mt-1.5 !py-1.5 !text-xs" value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Batch e.g. SSC Batch / Odisha State Batch" />
      )}
      <button className="mt-1.5 rounded-lg bg-[#4F46E5] px-2.5 py-1 text-[11px] font-semibold text-white" onClick={() => onSave(mode, { indName, indUrl, batchName })}>Save source</button>
    </div>
  );
}

/* ---------------- Jobs ---------------- */
function Jobs({ query }: { query: string }) {
  const jobs = useJobs((s) => s.jobs);
  const addJob = useJobs((s) => s.addJob);
  const updateJob = useJobs((s) => s.updateJob);
  const convertTarget = useJobs((s) => s.convertTarget);
  const addStage = useJobs((s) => s.addStage);
  const updateStage = useJobs((s) => s.updateStage);
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
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              <input className="input !text-xs" value={j.postName} onChange={(e) => updateJob(j.id, { postName: e.target.value })} placeholder="Post name" />
              <input className="input !text-xs" value={j.bodyWebsite} onChange={(e) => updateJob(j.id, { bodyWebsite: e.target.value })} placeholder="Conducting body website" />
              <input className="input !text-xs" value={j.notifPdf} onChange={(e) => updateJob(j.id, { notifPdf: e.target.value })} placeholder="Notification PDF link" />
              <label className="flex items-center gap-1.5 text-xs">Priority
                <input type="number" min={1} max={5} className="input !w-14 !text-xs" value={j.priority} onChange={(e) => updateJob(j.id, { priority: Number(e.target.value) })} />
              </label>
              <label className="flex items-center gap-1.5 text-xs">Fee ₹
                <input type="number" className="input !w-20 !text-xs" value={j.fee} onChange={(e) => updateJob(j.id, { fee: Number(e.target.value) })} />
              </label>
              <select className="input !text-xs" value={j.payMode} onChange={(e) => updateJob(j.id, { payMode: e.target.value as 'Online' })}>
                <option>Online</option><option>Challan</option><option>Postal Stamp</option><option>Other</option>
              </select>
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
                    <div key={st.id} className="rounded-xl bg-slate-100 p-2.5 text-xs dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <strong>{st.type}</strong>
                        <input type="date" className="input !w-auto !py-1 !text-xs" value={st.approxDate ?? ''} onChange={(e) => {
                          updateStage(j.id, st.id, { approxDate: e.target.value });
                          if (st.type === 'Prelims' || st.type === 'Mains') scheduleInDays(st.id + '-admit', 0, `Admit soon: ${j.examName} ${st.type}`, 'Check admit download (15d logic in countdowns)');
                        }} />
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <input className="input !text-xs" placeholder="Exam date" value={st.admit.examDate ?? ''} onChange={(e) => updateStage(j.id, st.id, { admit: { ...st.admit, examDate: e.target.value } })} />
                        <input className="input !text-xs" placeholder="Shift" value={st.admit.shift ?? ''} onChange={(e) => updateStage(j.id, st.id, { admit: { ...st.admit, shift: e.target.value } })} />
                        <input className="input !text-xs" placeholder="Gate closing" value={st.admit.gateClosing ?? ''} onChange={(e) => updateStage(j.id, st.id, { admit: { ...st.admit, gateClosing: e.target.value } })} />
                        <input className="input !text-xs" placeholder="Center" value={st.admit.center ?? ''} onChange={(e) => updateStage(j.id, st.id, { admit: { ...st.admit, center: e.target.value } })} />
                        <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={st.admit.downloaded} onChange={(e) => updateStage(j.id, st.id, { admit: { ...st.admit, downloaded: e.target.checked } })} /> Admit downloaded</label>
                        <select className="input !text-xs" value={st.result.status ?? ''} onChange={(e) => updateStage(j.id, st.id, { result: { ...st.result, status: e.target.value as 'Given' } })}>
                          <option value="">Result: —</option><option value="Given">Given</option><option value="Missed">Missed</option><option value="Overlap">Overlap</option>
                        </select>
                        <input className="input !text-xs" placeholder="Marks obtained" value={st.result.marks ?? ''} onChange={(e) => updateStage(j.id, st.id, { result: { ...st.result, marks: e.target.value } })} />
                        <input className="input !text-xs" placeholder="Cutoff" value={st.result.cutoff ?? ''} onChange={(e) => updateStage(j.id, st.id, { result: { ...st.result, cutoff: e.target.value } })} />
                        <input className="input !text-xs" placeholder="Result PDF link" value={st.result.pdf ?? ''} onChange={(e) => updateStage(j.id, st.id, { result: { ...st.result, pdf: e.target.value } })} />
                        <label className="flex items-center gap-2"><input type="checkbox" checked={!!st.result.cleared} onChange={(e) => updateStage(j.id, st.id, { result: { ...st.result, cleared: e.target.checked } })} /> Cleared → next stage</label>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">Syllabus: link Subject (mandatory) + weightage in Timetable engine. Flexible order — add stages as needed.</p>
                    </div>
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

  const generate = () => {
    const prioritySubs = new Set<string>();
    for (const j of jobs.filter((x) => !x.isTarget && x.priority >= 4)) {
      for (const st of j.stages) for (const l of st.links) prioritySubs.add(l.subjectId);
    }
    const cands = nodes.filter((n) => (n.kind === 'topic' || n.kind === 'subtopic') && n.progress < 100);
    cands.sort((a, b) => {
      const pa = prioritySubs.has(a.id) ? 0 : 1;
      const pb = prioritySubs.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (b.mistakes - b.corrects) - (a.mistakes - a.corrects);
    });
    ensureToday(cands.slice(0, 6).map((n) => ({ nodeId: n.id, title: n.title })));
  };

  return (
    <div className="mt-4 space-y-4">
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Tonight → Tomorrow To-Do</h2>
          <button className="btn-primary !py-2 text-xs" onClick={generate}>✨ Generate next-day plan</button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Uses active + priority exams, dates, progress, mistakes. Edit before saving. Overrun shifts today only. 5–8 new · 10–12 problems · 4–6 revision · 7–9 mock.</p>
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
          <input className="input mt-2 !text-xs" placeholder="Summary / short note / mistake note…" value={it.summary ?? it.mistakeNote ?? ''} onChange={(e) => updateItem(today.date, it.id, { summary: e.target.value, mistakeNote: e.target.value })} />
          {(it.correct || it.incorrect) ? <p className="mt-1 text-[11px] text-slate-500">✓ {it.correct ?? 0} · ✗ {it.incorrect ?? 0} — mistakes raise revision frequency + heat.</p> : null}
        </section>
      ))}

      <section className="card p-4">
        <h3 className="font-bold">Daily Routine (repeat)</h3>
        <RoutineForm onAdd={addRoutine} />
        {routines.map((r) => <p key={r.id} className="mt-1 text-sm text-slate-500">{r.time} — {r.title} · {r.repeat}</p>)}
      </section>
    </div>
  );
}

function RoutineForm({ onAdd }: { onAdd: (t: string, time: string) => void }) {
  const [t, setT] = useState('');
  const [time, setTime] = useState('06:00');
  return (
    <div className="mt-2 flex gap-2">
      <input type="time" className="input !w-28" value={time} onChange={(e) => setTime(e.target.value)} aria-label="time" />
      <input className="input" value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. Wake up, CA daily…" />
      <button className="btn-ghost text-sm" onClick={() => { if (t.trim()) { onAdd(t.trim(), time); setT(''); } }}>Add</button>
    </div>
  );
}
