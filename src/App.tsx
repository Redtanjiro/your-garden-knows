import { useEffect, useRef, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { DemoProvider } from './data/demo';
import { STORAGE_BLOCKED } from './data/db';
import { useGarden } from './data/store';
import { daysBetween, localDate } from './engine/dates';
import { Brand, PublicTopbar } from './ui/topbar';
import { Mural } from './ui/Mural';
import { Welcome } from './screens/Welcome';
import { Game } from './game/Game';
import { HowItWorks, ChooseData, SetNormal, NameGarden } from './screens/Onboarding';
import { GardenHome } from './screens/Home';
import { CheckInScreen } from './screens/CheckIn';
import { TidyUp } from './screens/TidyUp';
import { Exports } from './screens/Exports';
import { Report } from './screens/Report';
import { StreetNew, StreetView, JoinStreet } from './screens/Street';
import { Settings } from './screens/Settings';
import { Walkthrough } from './screens/Walkthrough';

export const NAV = [
  { to: '/garden', label: 'Garden', icon: 'M4 20h16M7 20v-6m5 6V9m5 11v-4M12 9c-3 0-4-3-3-5 3 0 4 2 3 5z' },
  { to: '/check-in', label: 'Check in', icon: 'M5 12l4 4 10-10M4 4h16v16H4z' },
  { to: '/tidy-up', label: 'Tidy up', icon: 'M14 4l6 6-9 9H5v-6zM12 6l6 6' },
  { to: '/report', label: 'Report', icon: 'M5 20V10M10 20V4M15 20v-7M20 20v-11' },
  { to: '/cul-de-sac', label: 'Street', icon: 'M3 11l5-5 5 5v8H3zM13 11l4-4 4 4v8h-8' },
];

/* ---------- app top bar: has a profile ---------- */
function AppTopbar() {
  const { profile, today, readOnly } = useGarden();
  const day = profile ? daysBetween(localDate(profile.createdAt), today) + 1 : 0;
  const initial = (profile?.gardenName.trim()[0] ?? 'Y').toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Brand to={readOnly ? '/' : '/garden'} />
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/garden' ? false : undefined}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-end">
          {profile && <span className="daychip">Day {day}</span>}
          <NavLink to="/settings" className="avatar" aria-label="Settings and privacy">
            {initial}
          </NavLink>
        </div>
      </div>
    </header>
  );
}

function OnboardingTopbar() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const n = { '/start': 1, '/start/data': 2, '/start/normal': 3, '/start/name': 4 }[pathname];
  const editing = params.get('edit') === '1';
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Brand to="/" />
        {n && !editing && <span className="stepchip">Step {n} of 4</span>}
        {editing && (
          <Link to="/settings" className="btn on-dark small" style={{ marginLeft: 'auto' }}>
            Back to settings
          </Link>
        )}
      </div>
    </header>
  );
}

function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={n.icon} stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
          </svg>
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function ReminderBanner() {
  const { profile, today, days, readOnly } = useGarden();
  const loc = useLocation();
  if (readOnly || !profile?.reminder.inApp || !profile.reminder.time || profile.paused) return null;
  if (loc.pathname.startsWith('/check-in')) return null;
  const [h, m] = profile.reminder.time.split(':').map(Number);
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return null;
  if (days.get(today)?.raw) return null;
  return (
    <div className="banner" role="status">
      Your garden is waiting. Two minutes to check in?
      <Link className="btn on-dark small" to="/check-in">
        Check in
      </Link>
    </div>
  );
}

function AppShell() {
  const { ready, profile, levels } = useGarden();
  const [params] = useSearchParams();
  const reveal = params.get('first') === '1';
  useEffect(() => {
    document.body.classList.add('has-tabbar');
    return () => document.body.classList.remove('has-tabbar');
  }, []);
  if (!ready) return null;
  if (!profile) return <Navigate to="/" replace />;
  return (
    <>
      <AppTopbar />
      <ReminderBanner />
      {!reveal && <Mural levels={levels} height={72} className="mural-strip" />}
      <Outlet />
      <TabBar />
    </>
  );
}

function OnboardingShell() {
  const { ready } = useGarden();
  if (!ready) return null;
  return (
    <>
      <OnboardingTopbar />
      <Outlet />
    </>
  );
}

function PublicShell({ children }: { children?: ReactNode }) {
  const { ready } = useGarden();
  if (!ready) return null;
  return (
    <>
      <PublicTopbar />
      {children ?? <Outlet />}
    </>
  );
}

function ExampleShell() {
  return (
    <DemoProvider>
      <PublicTopbar />
      <div className="banner" role="note">
        You’re looking at an example garden. Nothing here is saved.
        <Link className="btn on-dark small" to="/start">
          Plant my own
        </Link>
        <Link to="/walkthrough">Or walk through how it works</Link>
      </div>
      <Outlet />
    </DemoProvider>
  );
}

function StorageBanner() {
  const { storageBlocked } = useGarden();
  if (!storageBlocked) return null;
  return (
    <div className="banner err" role="alert">
      {STORAGE_BLOCKED}
    </div>
  );
}

/** Scroll to the top (or to a #hash) and move focus to the page heading on route change. */
function RouteFocus() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);
  const lastBase = useRef('');
  useEffect(() => {
    const base = pathname.replace(/^\/(garden|example)\/[a-z]+$/, '/$1').replace(/^\/walkthrough\/.*$/, '/walkthrough');
    const sameBase = base === lastBase.current;
    lastBase.current = base;
    if (hash) {
      const t = setTimeout(() => {
        const el = document.getElementById(hash.slice(1));
        if (el) {
          el.scrollIntoView({ block: 'start' });
          const h = el.querySelector<HTMLElement>('h2, h1');
          if (h) {
            h.tabIndex = -1;
            h.focus({ preventScroll: true });
          }
        }
      }, 60);
      return () => clearTimeout(t);
    }
    if (sameBase) return;
    window.scrollTo(0, 0);
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const h = document.querySelector<HTMLElement>('.app main h1');
      if (h && !h.contains(document.activeElement)) {
        if (!h.hasAttribute('tabindex')) h.tabIndex = -1;
        h.focus({ preventScroll: true });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [pathname, hash]);
  return null;
}

function AppRoot() {
  return (
    <div className="app">
      <RouteFocus />
      <StorageBanner />
      <Outlet />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/play" element={<Game trackerHref={import.meta.env.BASE_URL} />} />
      <Route element={<AppRoot />}>
        <Route path="/" element={<Welcome />} />
        <Route path="/tracker" element={<Navigate to="/" replace />} />
        <Route path="/walkthrough" element={<Walkthrough />} />
        <Route path="/walkthrough/:step" element={<Walkthrough />} />
        <Route element={<OnboardingShell />}>
          <Route path="/start" element={<HowItWorks />} />
          <Route path="/start/data" element={<ChooseData />} />
          <Route path="/start/normal" element={<SetNormal />} />
          <Route path="/start/name" element={<NameGarden />} />
        </Route>
        <Route element={<PublicShell />}>
          <Route path="/join/:code" element={<JoinStreet />} />
        </Route>
        <Route element={<ExampleShell />}>
          <Route path="/example" element={<GardenHome />} />
          <Route path="/example/garden" element={<Navigate to="/example" replace />} />
          <Route path="/example/:prop" element={<GardenHome />} />
        </Route>
        <Route element={<AppShell />}>
          <Route path="/garden" element={<GardenHome />} />
          <Route path="/garden/:prop" element={<GardenHome />} />
          <Route path="/check-in" element={<CheckInScreen />} />
          <Route path="/tidy-up" element={<TidyUp />} />
          <Route path="/report" element={<Report />} />
          <Route path="/cul-de-sac" element={<StreetView />} />
          <Route path="/cul-de-sac/new" element={<StreetNew />} />
          <Route path="/cul-de-sac/:slug" element={<StreetView />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/data" element={<Exports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
