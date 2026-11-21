import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useGarden } from '../data/store';
import { META } from '../engine/meta';
import type { ImportRecord, MetricKey } from '../engine/types';
import { KEYS } from '../engine/types';
import { ERR, parseVideoFile, readExport, videoDaily, type VideoResult } from '../parsers/video';
import { parseWhatsApp, people, waDaily, type DateOrder, type Msg } from '../parsers/whatsapp';
import { usePageTitle, useToast } from '../ui/common';

type Status = 'idle' | 'read' | 'error';

function DropZone({ id, label, accept, onFile }: { id: string; label: string; accept: string; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label
      className={'drop' + (over ? ' over' : '')}
      htmlFor={id}
      onDragEnter={(e) => (e.preventDefault(), setOver(true))}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      {label}
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function SourceCard({ title, status, children }: { title: string; status: Status; children: ReactNode }) {
  return (
    <section className="card stack-16" aria-label={title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2>{title}</h2>
        {status === 'read' ? <span className="badge ok">Read</span> : status === 'error' ? <span className="badge err">Not read</span> : <span className="badge muted">Not added</span>}
      </div>
      {children}
    </section>
  );
}

export function Exports() {
  usePageTitle('Data sources');
  const g = useGarden();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const first = params.get('first') === '1';
  const existing = useMemo(() => Object.fromEntries(g.imports.map((i) => [i.kind, i])) as Partial<Record<ImportRecord['kind'], ImportRecord>>, [g.imports]);
  const existingVideo = existing.tiktok ?? existing.instagram;

  // WhatsApp state
  const [wa, setWa] = useState<{ file: string; text: string; msgs: Msg[]; order: DateOrder; me: string } | null>(null);
  const [waErr, setWaErr] = useState('');
  const waRes = useMemo(() => (wa && wa.msgs.length ? waDaily(wa.msgs, wa.me) : null), [wa]);
  const waPeople = useMemo(() => (wa ? people(wa.msgs) : []), [wa]);

  // Video state
  const [vid, setVid] = useState<{ file: string; res: VideoResult } | null>(null);
  const [vidErr, setVidErr] = useState('');

  const [steps, setSteps] = useState<number>(g.profile?.avgSteps ?? g.profile?.normal.steps ?? 6000);
  const [busy, setBusy] = useState(false);
  const waRef = useRef<HTMLDivElement>(null);

  const onWa = async (f: File) => {
    setWaErr('');
    try {
      const r = await readExport(f, (n) => /_chat\.txt$|chat.*\.txt$/i.test(n));
      const { msgs, order } = parseWhatsApp(r.text);
      if (!msgs.length) {
        setWa(null);
        setWaErr(ERR.noMessages(f.name));
        return;
      }
      const ppl = people(msgs);
      const prevMe = existing.whatsapp?.selfName;
      setWa({ file: f.name, text: r.text, msgs, order, me: prevMe && ppl.includes(prevMe) ? prevMe : ppl[0] });
      setTimeout(() => waRef.current?.querySelector('select')?.focus(), 50);
    } catch (e) {
      setWa(null);
      setWaErr((e as Error).message === ERR.zipEmpty ? ERR.zipEmpty : ERR.noMessages(f.name));
    }
  };
  const flipOrder = () => {
    if (!wa) return;
    const { msgs, order } = parseWhatsApp(wa.text, wa.order === 'dmy' ? 'mdy' : 'dmy');
    setWa({ ...wa, msgs, order });
  };
  const onVid = async (f: File) => {
    setVidErr('');
    try {
      const r = await readExport(f, (n) => /(user_data|watch history|browsing history|videos_watched)/i.test(n));
      const parsed = parseVideoFile(r.name, r.text);
      if (!parsed) {
        setVid(null);
        setVidErr(ERR.noHistory(f.name));
        return;
      }
      setVid({ file: f.name, res: videoDaily(parsed.kind, parsed.dates) });
    } catch (e) {
      setVid(null);
      setVidErr((e as Error).message === ERR.zipEmpty ? ERR.zipEmpty : ERR.noHistory(f.name));
    }
  };

  const waStatus: Status = waErr ? 'error' : waRes || existing.whatsapp ? 'read' : 'idle';
  const vidStatus: Status = vidErr ? 'error' : vid || existingVideo ? 'read' : 'idle';
  const canUpdate = Boolean(waRes || vid || existing.whatsapp || existingVideo);

  const update = async () => {
    setBusy(true);
    const now = new Date().toISOString();
    const recs: ImportRecord[] = [];
    if (wa && waRes)
      recs.push({
        id: 'whatsapp',
        kind: 'whatsapp',
        fileName: wa.file,
        coverage: { from: waRes.from, to: waRes.to },
        selfName: wa.me,
        summary: `${waRes.count.toLocaleString('en-AU')} messages over ${waRes.days} days`,
        daily: waRes.daily,
        importedAt: now,
      });
    if (vid)
      recs.push({
        id: vid.res.kind,
        kind: vid.res.kind,
        fileName: vid.file,
        coverage: { from: vid.res.from, to: vid.res.to },
        summary: `${vid.res.n.toLocaleString('en-AU')} videos over ${vid.res.days} days`,
        daily: vid.res.daily,
        importedAt: now,
      });
    try {
      await g.actions.saveImports(recs, steps);
      toast('Garden updated from your exports.');
      nav(first ? '/garden?first=1' : '/garden');
    } catch (e) {
      toast((e as Error).message, true);
      setBusy(false);
    }
  };

  const source = (k: MetricKey): string => {
    const hasWa = Boolean(waRes || existing.whatsapp);
    const hasVid = Boolean(vid || existingVideo);
    const vname = (vid?.res.kind ?? existingVideo?.kind) === 'instagram' ? 'Instagram' : 'TikTok';
    if (k === 'thumb') return hasVid ? vname : 'Check-ins · watch history not read yet';
    if (k === 'potato') return hasVid ? `${vname} + steps` : 'Steps + check-ins';
    return hasWa ? 'WhatsApp' : 'Check-ins · WhatsApp not read yet';
  };

  return (
    <main className="page">
      <p className="caption">
        <Link to="/settings">Settings</Link> / Data sources
      </p>
      <h1 style={{ marginTop: 8 }}>Bring your exports.</h1>
      <p className="lede">Files are read on this device. Nothing is uploaded. Anything missing comes from your check-ins.</p>
      <div className="grid-home" style={{ marginTop: 32 }}>
        <div className="stack-16">
          <SourceCard title="WhatsApp group chat" status={waStatus}>
            <p className="caption">In the chat: ⋮ or the chat name → Export chat → Without media. A .txt file, or the .zip from iPhone.</p>
            {waErr && (
              <p className="err-panel" role="alert">
                {waErr}
              </p>
            )}
            {waRes && wa ? (
              <div ref={waRef} className="stack-8">
                <p>
                  <b>{wa.file}</b> · {waRes.count.toLocaleString('en-AU')} messages over {waRes.days} days
                </p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label htmlFor="wa-me" className="field">
                    Which one is you?
                  </label>
                  <select id="wa-me" className="input" style={{ width: 'auto', minWidth: 180 }} value={wa.me} onChange={(e) => setWa({ ...wa, me: e.target.value })}>
                    {waPeople.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="caption">
                  From {wa.me}: {waRes.mine} messages · link-only {waRes.totals.head} · chain-style {waRes.totals.fwd} · 😂 {waRes.totals.laughs} · since you last spoke {waRes.totals.seen}
                </p>
                {waRes.futureDates || wa.order === 'mdy' ? (
                  <button type="button" className="linkbtn" onClick={flipOrder}>
                    {wa.order === 'dmy' ? 'Dates look wrong? Switch to month-first' : 'Dates look wrong? Switch to day-first'}
                  </button>
                ) : null}
              </div>
            ) : (
              existing.whatsapp && (
                <p>
                  <b>{existing.whatsapp.fileName}</b> · {existing.whatsapp.summary} · you are {existing.whatsapp.selfName}
                </p>
              )
            )}
            <DropZone id="f-wa" label={waRes || existing.whatsapp ? 'Choose another chat' : 'Drop the chat export here, or click to choose'} accept=".txt,.zip" onFile={onWa} />
          </SourceCard>

          <SourceCard title="TikTok or Instagram watch history" status={vidStatus}>
            <p className="caption">TikTok: Settings → Account → Download your data (JSON or TXT). Instagram: Accounts Centre → Download your information (JSON, includes videos watched).</p>
            {vidErr && (
              <p className="err-panel" role="alert">
                {vidErr}
              </p>
            )}
            {vid ? (
              <p>
                <b>{vid.file}</b> · {vid.res.n.toLocaleString('en-AU')} videos over {vid.res.days} days · about {Math.round(vid.res.perDay)} a day
              </p>
            ) : (
              existingVideo && (
                <p>
                  <b>{existingVideo.fileName}</b> · {existingVideo.summary}
                </p>
              )
            )}
            <DropZone id="f-vid" label={vidErr ? 'Choose another file' : 'Drop user_data_tiktok.json, Watch History.txt or videos_watched.json'} accept=".json,.txt,.zip" onFile={onVid} />
            <p className="caption">
              <a href="https://support.tiktok.com/en/account-and-privacy/personalized-ads-and-data/requesting-your-data" target="_blank" rel="noreferrer">
                How to download your TikTok data
              </a>
            </p>
          </SourceCard>

          <SourceCard title="Walking" status="read">
            <label className="field" htmlFor="avg-steps">
              Average daily steps <span className="field-hint">From Apple Health or Google Fit. A guess is fine.</span>
            </label>
            <input id="avg-steps" className="input" style={{ maxWidth: 200 }} type="number" min={0} max={50000} step={100} value={steps} onChange={(e) => setSteps(Math.max(0, Math.min(50000, Number(e.target.value) || 0)))} />
          </SourceCard>

          <div className="btnrow">
            <button type="button" className="btn" disabled={!canUpdate || busy} onClick={update}>
              Update my garden
            </button>
            {first && (
              <Link to="/garden?first=1" className="btn ghost">
                Skip for now
              </Link>
            )}
          </div>
          <p className="caption">{canUpdate ? (vidStatus !== 'read' ? 'You can update with what’s here and add watch history later.' : waStatus !== 'read' ? 'You can update with what’s here and add WhatsApp later.' : 'Both sources are read.') : 'Add at least one file to update your garden.'}</p>
        </div>
        <aside className="panel stack-16" aria-label="Where each measure comes from">
          <h2>Where each measure comes from</h2>
          <ul className="srclist">
            {KEYS.map((k) => (
              <li key={k}>
                <b>{META[k].name}</b>
                <span>{source(k)}</span>
              </li>
            ))}
          </ul>
          <p className="caption">Exports replace your check-in numbers for the days they cover. Newer check-ins always win.</p>
        </aside>
      </div>
    </main>
  );
}
