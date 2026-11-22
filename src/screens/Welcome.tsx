import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { demoData } from '../data/demo';
import { derive, useGarden } from '../data/store';
import { META } from '../engine/meta';
import { KEYS } from '../engine/types';
import { Garden } from '../garden/Garden';
import { BrandMark, Blocks, Companion, PropIcon, Ticks, usePageTitle } from '../ui/common';

export function Welcome() {
  usePageTitle('');
  const { ready, profile } = useGarden();
  const sample = useMemo(() => {
    const d = demoData();
    return { ...derive(d.profile, d.checkins, [], d.checkins[d.checkins.length - 1].date), name: d.profile.gardenName };
  }, []);
  if (!ready) return null;
  if (profile) return <Navigate to="/garden" replace />;
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Link to="/tracker" className="brand">
            <BrandMark /> Your Garden Knows
          </Link>
          <nav className="nav welcome-nav" aria-label="Main">
            <Link to="/start">How it works</Link>
            <a href="#privacy">Privacy</a>
          </nav>
          <Link to="/start" className="btn small">
            Plant my garden
          </Link>
        </div>
      </header>
      <main className="page" style={{ textAlign: 'center', paddingTop: 72, position: 'relative' }}>
        <h1 className="display">
          Your garden{' '}
          <span className="hl">
            knows
            <span className="hl-meta" aria-hidden="true">
              8:04 pm <Ticks />
            </span>
          </span>{' '}
          how you scroll.
        </h1>
        <p className="lede" style={{ margin: '20px auto 0', color: 'var(--text)' }}>
          Six silly measures of your screen life grow a backyard you can see, laugh at and tidy up. It never judges what’s true, only how you share.
        </p>
        <div className="btnrow" style={{ justifyContent: 'center', marginTop: 28 }}>
          <Link to="/start" className="btn">
            Plant my garden
          </Link>
          <Link to="/example" className="btn secondary">
            See an example garden
          </Link>
        </div>
        <p className="caption" style={{ marginTop: 14 }} id="privacy">
          Free · No account · Your numbers never leave this device
        </p>

        <div className="welcome-card paper" aria-label="An example garden">
          <div className="welcome-card-head">
            <b>{sample.name}</b>
            <span className="caption">Day 9</span>
          </div>
          <div className="welcome-card-body">
            <div style={{ width: '100%', maxWidth: 300 }}>
              <Garden levels={sample.levels} name={sample.name} animate={false} />
            </div>
            <ul className="welcome-list">
              {KEYS.map((k) => (
                <li key={k}>
                  <PropIcon k={k} size={24} />
                  <b>{META[k].name}</b>
                  <span className="caption">{META[k].prop}</span>
                  <Blocks level={sample.levels[k]} />
                </li>
              ))}
            </ul>
          </div>
          <div className="peek" aria-hidden="true">
            <Companion pose="peek" size={80} />
          </div>
        </div>
        <div className="companion-left" aria-hidden="true">
          <Companion size={110} />
        </div>
      </main>
    </>
  );
}
