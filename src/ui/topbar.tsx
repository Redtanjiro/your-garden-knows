import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGarden } from '../data/store';
import { Monogram } from './common';

export function Brand({ to }: { to: string }) {
  return (
    <Link to={to} className="brand">
      <Monogram /> Your garden knows
    </Link>
  );
}

/* ---------- public top bar: welcome, walkthrough, example, join ---------- */
const PUBLIC_LINKS = [
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/walkthrough', label: 'Walkthrough' },
  { to: '/play', label: 'Play a day' },
  { to: '/#privacy', label: 'Privacy' },
];
export function PublicTopbar() {
  const { profile } = useGarden();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => setMenu(false), [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        btn.current?.focus();
      }
    };
    window.addEventListener('keydown', esc);
    document.querySelector<HTMLElement>('.menu-sheet a')?.focus();
    return () => window.removeEventListener('keydown', esc);
  }, [menu]);
  const cta = profile ? { to: '/garden', label: 'My garden' } : { to: '/start', label: 'Plant my garden' };
  const current = (to: string) => (!to.includes('#') && loc.pathname.startsWith(to) ? 'page' : undefined);
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Brand to="/" />
        <nav className="nav right" aria-label="Main">
          {PUBLIC_LINKS.map((l) => (
            <Link key={l.to} to={l.to} aria-current={current(l.to)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link to={cta.to} className="btn on-dark small welcome-cta">
          {cta.label}
        </Link>
        <button ref={btn} type="button" className="menu-btn" aria-expanded={menu} aria-controls="site-menu" onClick={() => setMenu(true)}>
          Menu
        </button>
      </div>
      {menu && (
        <div className="menu-sheet" id="site-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="menu-sheet-top">
            <Brand to="/" />
            <button type="button" className="menu-btn" style={{ display: 'inline-flex' }} onClick={() => (setMenu(false), btn.current?.focus())}>
              Close
            </button>
          </div>
          <ul>
            {PUBLIC_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={() => setMenu(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link to={cta.to} className="btn on-dark solid" onClick={() => setMenu(false)}>
            {cta.label}
          </Link>
        </div>
      )}
    </header>
  );
}

