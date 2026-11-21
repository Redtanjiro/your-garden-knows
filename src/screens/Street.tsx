import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useGarden } from '../data/store';
import { daysBetween, localDate } from '../engine/dates';
import { fromStreetLevels, mess, streetLevels, tier } from '../engine/metrics';
import { streetFeed } from '../engine/stories';
import type { StreetMembership } from '../engine/types';
import { gardenSVG } from '../garden/draw';
import { appUrl, copyText, local } from '../lib/files';
import { streetApi, StreetError, type Joined, type StreetView as SV } from '../street/api';
import { Bubble, Companion, Switch, usePageTitle, useToast } from '../ui/common';

/* ---------- consent panel (screens 13 and join) ---------- */
export function Consent() {
  return (
    <aside className="panel stack-16" aria-label="What neighbours see">
      <div className="grid-2" style={{ gap: 16 }}>
        <div>
          <h3>What neighbours see</h3>
          <ul className="ticklist ok">
            <li>Your garden picture</li>
            <li>Your garden’s name</li>
            <li>When you last checked in</li>
            <li>Waves you send</li>
          </ul>
        </div>
        <div>
          <h3>What they never see</h3>
          <ul className="ticklist no">
            <li>Any of your numbers</li>
            <li>Your messages or files</li>
            <li>Which apps you use</li>
            <li>Your normal</li>
          </ul>
        </div>
      </div>
      <p className="ok-panel" style={{ fontSize: 14 }}>
        Gardens are shown as pictures only. There are no rankings, scores or leaderboards.
      </p>
      <p className="caption">Seeds can drift between gardens, so you see how forwards travel through a group. You can hide your garden from the street at any time.</p>
    </aside>
  );
}

function membership(j: Joined, groupLabel?: string): StreetMembership {
  return { id: 'street', ...j, groupLabel, visible: true, joinedAt: new Date().toISOString() };
}

function useMe() {
  const g = useGarden();
  return { gardenName: g.profile?.gardenName ?? 'My garden', levels: streetLevels(g.levels), lastCheckIn: g.dataDays[0] ?? null };
}

/* ---------- 13. Start a cul-de-sac ---------- */
export function StreetNew() {
  usePageTitle('Start a cul-de-sac');
  const g = useGarden();
  const nav = useNavigate();
  const toast = useToast();
  const me = useMe();
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const existing = g.street;
  const invite = existing ? appUrl(`/join/${existing.code}`) : '';
  const nameErr = name.trim() ? '' : 'Give your street a name';

  const create = async () => {
    setTouched(true);
    setErr('');
    if (nameErr) return document.getElementById('street-name')?.focus();
    setBusy(true);
    try {
      const j = await streetApi.create(name.trim(), me);
      await g.actions.setStreet(membership(j, group.trim() || undefined));
      toast('Cul-de-sac made. Copy the invite link into your group chat.');
    } catch (e) {
      setErr(e instanceof StreetError ? e.message : (e as Error).message || 'The street service didn’t answer. Check your connection, then try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <h1>Start a cul-de-sac.</h1>
      <p className="lede">A shared street for one group chat. Everyone sees each other’s gardens, never the numbers.</p>
      <div className="split" style={{ marginTop: 32 }}>
        <div className="stack-24">
          {existing ? (
            <>
              <div className="ok-panel">
                <div className="ok-title">
                  <span aria-hidden="true">✓</span> {existing.name} is ready
                </div>
                <p style={{ marginTop: 4, fontSize: 14 }}>{existing.groupLabel ? `For ${existing.groupLabel}. ` : ''}You can be on one street at a time.</p>
              </div>
              <InviteBox url={invite} />
              <div className="btnrow">
                <button type="button" className="btn" onClick={() => nav(`/cul-de-sac/${existing.slug}`)}>
                  Go to {existing.name}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="field" htmlFor="street-name">
                  Street name
                </label>
                <input id="street-name" className={'input' + (touched && nameErr ? ' invalid' : '')} style={{ marginTop: 8, maxWidth: 420 }} value={name} maxLength={40} placeholder="Wattle Close" onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={Boolean(touched && nameErr)} aria-describedby="street-err" />
                {touched && nameErr && (
                  <p className="field-error" id="street-err" role="alert">
                    {nameErr}
                  </p>
                )}
              </div>
              <div>
                <label className="field" htmlFor="street-group">
                  Which group is it for?
                </label>
                <input id="street-group" className="input" style={{ marginTop: 8, maxWidth: 420 }} value={group} maxLength={40} placeholder="Family chat" onChange={(e) => setGroup(e.target.value)} aria-describedby="group-hint" />
                <p className="caption" id="group-hint" style={{ marginTop: 6 }}>
                  Just a label for you. It stays on this device, and we never read the chat itself.
                </p>
              </div>
              <div>
                <p className="field">Invite link</p>
                <p className="caption" style={{ marginTop: 6 }}>
                  Appears here once the street is made. Anyone with the link can join, and anyone can leave at any time.
                </p>
              </div>
              {err && (
                <p className="err-panel" role="alert">
                  {err}
                </p>
              )}
              <div className="btnrow">
                <button type="button" className="btn" onClick={create} disabled={busy}>
                  Create cul-de-sac
                </button>
              </div>
            </>
          )}
        </div>
        <Consent />
      </div>
    </main>
  );
}

function InviteBox({ url }: { url: string }) {
  const toast = useToast();
  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (await copyText(url)) toast('Invite link copied.');
    else {
      const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement) ?? null;
      input?.focus();
      input?.select();
      toast('Copy was blocked, so the link is selected. Press Ctrl+C or ⌘C to copy it.');
    }
  };
  return (
    <div>
      <label className="field" htmlFor="invite-link">
        Invite link
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, maxWidth: 520 }}>
        <input id="invite-link" className="input" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn secondary" onClick={copy}>
          Copy link
        </button>
      </div>
      <p className="caption" style={{ marginTop: 6 }}>
        Paste it into the group chat. Anyone with the link can join, and anyone can leave at any time.
      </p>
    </div>
  );
}

/* ---------- 14. The street ---------- */
const MAX = 8;
function ringPos(i: number, n: number) {
  // spread lots over 300°, leaving the bottom wedge free for the road
  const deg = n > 1 ? 120 + (i * 300) / (n - 1) : 270;
  const a = (deg * Math.PI) / 180;
  return { x: 50 + 34 * Math.cos(a), y: 48 + 34 * Math.sin(a) };
}
function checkedText(last: string | null, today: string) {
  if (!last) return 'not checked in yet';
  const d = daysBetween(last, today);
  return d <= 0 ? 'checked in today' : d === 1 ? 'checked in yesterday' : `checked in ${d} days ago`;
}

export function StreetView() {
  const g = useGarden();
  const { slug } = useParams();
  const toast = useToast();
  const nav = useNavigate();
  const [view, setView] = useState<SV | null>(null);
  const [err, setErr] = useState('');
  const s = g.street;
  usePageTitle(s?.name ?? 'Cul-de-sac');

  const load = useCallback(async () => {
    if (!s) return;
    try {
      setView(await streetApi.get(s.slug, s));
      setErr('');
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [s]);
  useEffect(() => {
    load();
  }, [load, g.levels]);

  if (!s) return <Navigate to="/cul-de-sac/new" replace />;
  if (!slug || slug !== s.slug) return <Navigate to={`/cul-de-sac/${s.slug}`} replace />;

  const invite = appUrl(`/join/${s.code}`);
  const copyInvite = async () => toast((await copyText(invite)) ? 'Invite link copied.' : `Copy was blocked. The link is ${invite}`);
  const toggleHide = async (hidden: boolean) => {
    try {
      await g.actions.setStreet({ ...s, visible: !hidden });
      toast(hidden ? 'Your garden is hidden from the street.' : 'Your garden is back on the street.');
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
  const wave = async (to: string, name: string) => {
    try {
      await streetApi.wave(s.slug, s, to);
      toast(`You waved at ${name}. 👋`);
      load();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  if (err)
    return (
      <main className="page narrow">
        <h1>{s.name}</h1>
        <p className="err-panel" role="alert" style={{ marginTop: 20 }}>
          {err}
        </p>
        <div className="btnrow" style={{ marginTop: 16 }}>
          <button type="button" className="btn" onClick={load}>
            Try again
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={async () => {
              await g.actions.setStreet(null);
              nav('/cul-de-sac/new');
            }}
          >
            Forget this street
          </button>
        </div>
      </main>
    );
  if (!view) return <main className="page" aria-busy="true" />;
  return <Street view={view} s={s} invite={invite} onCopy={copyInvite} onWave={wave} onHide={toggleHide} />;
}

function Street({ view, s, invite, onCopy, onWave, onHide }: { view: SV; s: StreetMembership; invite: string; onCopy: () => void; onWave: (id: string, name: string) => void; onHide: (h: boolean) => void }) {
  const g = useGarden();
  const members = view.members.filter((m) => m.visible || m.memberId === s.memberId);
  const lots = members.slice(0, MAX);
  const slots = Math.min(MAX + 1, lots.length + (lots.length < MAX ? 1 : 0));
  const pos = lots.map((_, i) => ringPos(i, slots));
  const svgs = useMemo(() => lots.map((m, i) => gardenSVG(fromStreetLevels(m.levels), 7 + i * 13)), [lots]);

  // seed trails: forwards level ≥ 6 → two nearest neighbours on the ring
  const trails: { from: number; to: number }[] = [];
  const landings: Record<string, number> = {};
  lots.forEach((m, i) => {
    if (m.levels.forwards < 6 || lots.length < 2) return;
    const near = lots
      .map((_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) => Math.hypot(pos[a].x - pos[i].x, pos[a].y - pos[i].y) - Math.hypot(pos[b].x - pos[i].x, pos[b].y - pos[i].y))
      .slice(0, 2);
    near.forEach((j) => trails.push({ from: i, to: j }));
    landings[m.memberId === s.memberId ? 'Your' : m.gardenName] = near.length;
  });
  const feed = streetFeed(
    lots.filter((m) => m.memberId !== s.memberId).map((m) => ({ name: m.gardenName, levels: m.levels, prev: m.prevLevels })),
    Object.fromEntries(Object.entries(landings).filter(([k]) => k !== 'Your')),
  );
  const myWaves = view.wavesForYou.filter((w) => daysBetween(w.date, g.today) <= 7);
  const nameOf = (id: string) => view.members.find((m) => m.memberId === id)?.gardenName ?? 'A neighbour';
  const size = lots.length > 6 ? 17 : 20;

  return (
    <main className="page">
      <div className="grid-home">
        <section>
          <h1>{view.name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {s.groupLabel ? `${s.groupLabel} · ` : ''}you joined {daysBetween(localDate(s.joinedAt), g.today) < 1 ? 'today' : `${daysBetween(localDate(s.joinedAt), g.today)} days ago`} · {members.length} {members.length === 1 ? 'garden' : 'gardens'}
          </p>
          {view.sample && (
            <p className="info-panel" style={{ marginTop: 16, fontSize: 14 }}>
              Sample neighbours. Until the street service is connected, this street lives only in this browser, and the other gardens are examples.
            </p>
          )}
          <div className="street-ring" style={{ marginTop: 20 }} role="group" aria-label={`${view.name}: ${members.length} gardens around a cul-de-sac`}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
              <rect width="100" height="100" fill="#8bbf5e" />
              <rect x="44" y="60" width="12" height="40" fill="#c9c6bf" />
              <circle cx="50" cy="47" r="17" fill="#c9c6bf" />
              <circle cx="50" cy="47" r="6" fill="#7aae52" />
              <path d="M50 64 V100" stroke="#fff" strokeWidth=".5" strokeDasharray="2 2" />
              {trails.map((t, i) => {
                const a = pos[t.from], b = pos[t.to];
                const mx = (a.x + b.x) / 2 + (50 - (a.x + b.x) / 2) * 0.35, my = (a.y + b.y) / 2 + (47 - (a.y + b.y) / 2) * 0.35;
                return <path key={i} d={`M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`} stroke="#fff" strokeWidth=".6" fill="none" strokeDasharray="1 1.4" opacity=".9" />;
              })}
            </svg>
            {lots.map((m, i) => {
              const mine = m.memberId === s.memberId;
              const label = mine ? `Your garden, ${tier(mess(fromStreetLevels(m.levels))).toLowerCase()}${m.visible ? '' : ', hidden from the street'}` : `${m.gardenName}’s garden, ${tier(mess(fromStreetLevels(m.levels))).toLowerCase()}`;
              return (
                <div key={m.memberId} className="lot" style={{ left: `${pos[i].x}%`, top: `${pos[i].y}%`, width: `${size}%` }}>
                  <div className={'g' + (mine ? ' me' : '')} role="img" aria-label={label} style={{ opacity: m.visible ? 1 : 0.5 }} dangerouslySetInnerHTML={{ __html: svgs[i] }} />
                  <span className="nm">{mine ? 'You' : m.gardenName}</span>
                </div>
              );
            })}
            {lots.length < MAX && (
              <div className="lot empty" style={{ left: `${ringPos(lots.length, slots).x}%`, top: `${ringPos(lots.length, slots).y}%`, width: `${size}%` }}>
                <button type="button" className="g" style={{ aspectRatio: '1', width: '100%', cursor: 'pointer', font: 'inherit', color: '#fff', fontWeight: 600, fontSize: 12 }} onClick={onCopy} aria-label="Empty lot. Invite someone: copies the invite link">
                  + Invite someone
                </button>
                <span className="nm">Empty lot</span>
              </div>
            )}
          </div>
        </section>
        <aside className="stack-24">
          <div>
            <h2 style={{ fontSize: 22 }}>This week on the street</h2>
            <div className="stack-8" style={{ marginTop: 12 }} aria-live="polite">
              {myWaves.map((w, i) => (
                <div key={'w' + i}>
                  <Bubble sender={view.name} time={w.date === g.today ? 'today' : undefined}>
                    {nameOf(w.from)} waved at you. 👋
                  </Bubble>
                </div>
              ))}
              {feed.length || myWaves.length ? (
                feed.map((f) => (
                  <div key={f}>
                    <Bubble sender={view.name}>{f}</Bubble>
                  </div>
                ))
              ) : (
                <p className="muted">Quiet on the street so far. News turns up as gardens change.</p>
              )}
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: 22 }}>Neighbours</h2>
            <div style={{ marginTop: 8 }}>
              {lots
                .filter((m) => m.memberId !== s.memberId)
                .map((m, idx) => {
                  const waved = view.wavesToday.includes(m.memberId);
                  const i = lots.indexOf(m);
                  return (
                    <div key={m.memberId} className="nrow">
                      <div className="mini" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgs[i] }} />
                      <div>
                        <b style={{ color: 'var(--ink)' }}>{m.gardenName}</b>
                        <p className="caption">
                          {tier(mess(fromStreetLevels(m.levels)))} · {checkedText(m.lastCheckIn, g.today)}
                        </p>
                      </div>
                      <button type="button" className="btn small secondary" disabled={waved} onClick={() => onWave(m.memberId, m.gardenName)} aria-label={waved ? `You waved at ${m.gardenName} today` : `Wave at ${m.gardenName}`} data-i={idx}>
                        {waved ? 'Waved' : 'Wave'}
                      </button>
                    </div>
                  );
                })}
              {lots.length <= 1 && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '12px 0' }}>
                  <Companion size={60} />
                  <p className="muted">No neighbours yet. Share the invite link in your group chat.</p>
                </div>
              )}
            </div>
          </div>
          <div className="btnrow">
            <button type="button" className="btn ghost" onClick={onCopy}>
              Invite more
            </button>
          </div>
          <div className="srow" style={{ borderTop: '1px solid var(--rule)' }}>
            <div>
              <b id="hide-lbl">Hide my garden from the street</b>
              <span>{s.visible ? 'Neighbours can see your garden picture.' : 'Neighbours can’t see your garden right now.'}</span>
            </div>
            <Switch checked={!s.visible} onChange={onHide} label="Hide my garden from the street" />
          </div>
          <p className="caption">
            Invite link: <span style={{ wordBreak: 'break-all' }}>{invite}</span>
          </p>
        </aside>
      </div>
    </main>
  );
}

/* ---------- join flow ---------- */
export function JoinStreet() {
  const { code = '' } = useParams();
  const g = useGarden();
  const nav = useNavigate();
  const toast = useToast();
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const guess = code.split('-')[0];
  const streetName = guess ? `${guess.charAt(0).toUpperCase()}${guess.slice(1)}` : 'this street';
  usePageTitle(`Join ${streetName}`);

  if (!g.profile) {
    return (
      <main className="page narrow" style={{ paddingTop: 64 }}>
        <div style={{ display: 'grid', placeItems: 'start' }} aria-hidden="true">
          <Companion pose="wave" size={90} />
        </div>
        <h1 style={{ marginTop: 16 }}>You’re invited to a cul-de-sac.</h1>
        <p className="lede">First, plant your own garden. It takes about four minutes, then you’ll come straight back here to join.</p>
        <div className="btnrow" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              local.set('ygk-pending-join', code);
              nav('/start');
            }}
          >
            Plant my garden
          </button>
        </div>
        <div style={{ marginTop: 32 }}>
          <Consent />
        </div>
      </main>
    );
  }
  if (g.street)
    return (
      <main className="page narrow" style={{ paddingTop: 48 }}>
        <h1>You’re already on {g.street.name}.</h1>
        <p className="lede">A garden can be on one street at a time. To join a different one, leave {g.street.name} in Settings first.</p>
        <div className="btnrow" style={{ marginTop: 24 }}>
          <Link to={`/cul-de-sac/${g.street.slug}`} className="btn">
            Go to {g.street.name}
          </Link>
          <Link to="/settings" className="btn ghost">
            Settings
          </Link>
        </div>
      </main>
    );

  const join = async () => {
    setBusy(true);
    setErr('');
    try {
      const j = await streetApi.join(code, me);
      await g.actions.setStreet(membership(j));
      local.del('ygk-pending-join');
      toast(`You joined ${j.name}.`);
      nav(`/cul-de-sac/${j.slug}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <main className="page">
      <h1>Join {streetName}.</h1>
      <p className="lede">Your garden picture joins the street. Your numbers stay on this device.</p>
      <div className="split" style={{ marginTop: 32 }}>
        <div className="stack-16">
          <p>
            Joining as <b>{g.profile.gardenName}</b>.
          </p>
          {err && (
            <p className="err-panel" role="alert">
              {err}
            </p>
          )}
          <div className="btnrow">
            <button type="button" className="btn" onClick={join} disabled={busy}>
              Join {streetName}
            </button>
            <Link to="/garden" className="btn ghost">
              Not now
            </Link>
          </div>
        </div>
        <Consent />
      </div>
    </main>
  );
}
