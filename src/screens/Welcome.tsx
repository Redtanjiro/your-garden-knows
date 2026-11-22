import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PublicTopbar } from '../ui/topbar';
import { demoData } from '../data/demo';
import { derive, useGarden } from '../data/store';
import { META } from '../engine/meta';
import { latestValue } from '../engine/metrics';
import type { MetricKey } from '../engine/types';
import { KEYS } from '../engine/types';
import { Garden } from '../garden/Garden';
import { Companion, MetricTile, Ticks, usePageTitle } from '../ui/common';
import { Mural } from '../ui/Mural';
import { ReceiptRows } from '../ui/receipts';
import { useFadeIn } from '../ui/useFadeIn';

export function Welcome() {
  usePageTitle('');
  const { ready, profile } = useGarden();
  const sample = useMemo(() => {
    const d = demoData();
    const t = d.checkins[d.checkins.length - 1].date;
    const r = derive(d.profile, d.checkins, [], t);
    const values: Partial<Record<MetricKey, number>> = {};
    for (const k of KEYS) values[k] = latestValue(r.days, k, t, 13)?.value;
    return { ...r, values, name: d.profile.gardenName };
  }, []);
  const fade = useFadeIn();
  if (!ready) return null;
  return (
    <>
      <PublicTopbar />
      <main ref={fade}>
        {/* 1 · Hero */}
        <section className="band obsidian hero" aria-labelledby="hero-h">
          <div className="wrap">
            <h1 id="hero-h" className="display-xl">
              Your garden{' '}
              <span className="hl">
                knows
                <span className="hl-meta" aria-hidden="true">
                  8:04 pm <Ticks />
                </span>
              </span>{' '}
              how you scroll.
            </h1>
            <p className="lead">Six silly measures of your screen life grow a backyard you can see, laugh at and tidy up. It never judges what’s true, only how you share.</p>
            <Link to={profile ? '/garden' : '/start'} className="btn on-dark hero">
              {profile ? 'Go to my garden' : 'Plant my garden'}
            </Link>
            <div className="hero-links">
              <Link to="/walkthrough">Walk through a sample →</Link>
              <Link to="/play">Play a day →</Link>
            </div>
            <p className="meta">Free · No account · Your numbers never leave this device</p>
          </div>
        </section>

        {/* 2 · Garden mural */}
        <Mural levels={sample.levels} className="mural-hero" animate={false} />

        {/* 3 · Six silly measures */}
        <section className="band mint" id="how-it-works" aria-labelledby="how-h">
          <div className="wrap fade-wait">
            <h2 id="how-h" className="heading">
              Six silly measures, one backyard
            </h2>
            <ul className="measures" style={{ listStyle: 'none', padding: 0 }}>
              {KEYS.map((k) => (
                <li key={k} className="measure">
                  <MetricTile k={k} size="100%" />
                  <b>{META[k].name}</b>
                  <span>→ {META[k].prop.toLowerCase()}</span>
                </li>
              ))}
            </ul>
            <p className="lead" style={{ marginTop: 32 }}>
              Each one is compared only with your own normal. Twice your normal is maximum mess.
            </p>
          </div>
        </section>

        {/* 4 · An example backyard */}
        <section className="band paper" aria-labelledby="ex-h">
          <div className="wrap fade-wait">
            <h2 id="ex-h" className="heading">
              An example backyard
            </h2>
            <div className="example-grid">
              <div className="garden-frame" style={{ position: 'relative' }}>
                <Garden levels={sample.levels} name={sample.name} animate={false} />
              </div>
              <div>
                <ReceiptRows levels={sample.levels} values={sample.values} normal={sample.normal} />
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 28 }}>
                  <Link to="/example" className="btn">
                    See the example garden
                  </Link>
                  <div aria-hidden="true">
                    <Companion pose="wave" size={84} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 · Privacy */}
        <section className="band emerald" id="privacy" aria-labelledby="priv-h">
          <div className="wrap fade-wait">
            <h2 id="priv-h" className="heading">
              Your numbers never leave this device
            </h2>
            <p className="lead" style={{ marginTop: 20 }}>
              Check-ins and files stay in this browser. If you join a street, only your garden picture is shared: how many of each prop, never the numbers.
            </p>
          </div>
        </section>

        {/* 6 · Two ways in */}
        <section className="band obsidian" aria-labelledby="ways-h">
          <div className="wrap fade-wait">
            <h2 id="ways-h" className="heading" style={{ marginBottom: 40 }}>
              Two ways in
            </h2>
            <div className="ways">
              <Link to="/walkthrough" className="way">
                <h3>Walk through Mia’s month</h3>
                <p>Two minutes. See the whole app with sample data.</p>
                <span className="go">Start the walkthrough →</span>
              </Link>
              <Link to="/play" className="way">
                <h3>Play one absurd day</h3>
                <p>Three minutes. Twelve buzzes, one backyard. For all ages.</p>
                <span className="go">Play a day →</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer band paper">
      <div className="wrap">
        <p className="caption" style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 760 }}>
          Your Garden Knows · Neel Parikh · UNSW Master of Design, DDES9016/9017 · UN SDG 16.10, public access to information
        </p>
        <nav aria-label="Footer">
          <Link to="/settings">Settings</Link>
          <Link to="/#privacy">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
