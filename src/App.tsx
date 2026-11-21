import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { DemoProvider } from './data/demo';
import { STORAGE_BLOCKED } from './data/db';
import { useGarden } from './data/store';
import { daysBetween, localDate } from './engine/dates';
import { BrandMark } from './ui/common';
import { Welcome } from './screens/Welcome';
import { HowItWorks, ChooseData, SetNormal, NameGarden } from './screens/Onboarding';
import { GardenHome } from './screens/Home';
import { CheckInScreen } from './screens/CheckIn';
import { TidyUp } from './screens/TidyUp';
import { Exports } from './screens/Exports';
import { Report } from './screens/Report';
import { StreetNew, StreetView, JoinStreet } from './screens/Street';
import { Settings } from './screens/Settings';

const NAV = [
  { to: '/garden', label: 'Garden', icon: 'M4 20h16M7 20v-6m5 6V9m5 11v-4M12 9c-3 0-4-3-3-5 3 0 4 2 3 5z' },
  { to: '/check-in', label: 'Check in', icon: 'M5 12l4 4 10-10M4 4h16v16H4z' },
  { to: '/tidy-up', label: 'Tidy up', icon: 'M14 4l6 6-9 9H5v-6zM12 6l6 6' },
  { to: '/cul-de-sac', label: 'Cul-de-sac', icon: 'M3 11l5-5 5 5v8H3zM13 11l4-4 4 4v8h-8' },
  { to: '/report', label: 'Report', icon: 'M5 20V10M10 20V4M15 20v-7M20 20v-11' },
];

function Topbar({ withNav }: { withNav: boolean }) {
  const { profile, today, readOnly } = useGarden();
  const day = profile ? daysBetween(localDate(profile.createdAt), today) + 1 : 0;
  const initials = profile?.gardenName.replace(/[’']s\b.*$/, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'YG';
  const base = readOnly ? '/example' : '';
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link to={withNav && !readOnly ? '/garden' : '/'} className="brand">
          <BrandMark /> Your Garden Knows
        </Link>
        {withNav && (
          <>
            <nav className="nav" aria-label="Main">
              {NAV.map((n) =>
                readOnly && n.to !== '/garden' ? null : (
                  <NavLink key={n.to} to={base + n.to} end={n.to === '/garden' && !readOnly}>
                    {n.label}
                  </NavLink>
                ),
              )}
            </nav>
            <div className="nav-end">
              {profile && <span className="daychip">Day {day}</span>}
              {!readOnly && (
                <Link to="/settings" className="avatar" aria-label="Settings and privacy">
                  {initials}
                </Link>
              )}
            </div>
          </>
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
            <path d={n.icon} stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
      <Link className="btn small" to="/check-in">
        Check in
      </Link>
    </div>
  );
}

function AppShell() {
  const { ready, profile } = useGarden();
  useEffect(() => {
    document.body.classList.add('has-tabbar');
    return () => document.body.classList.remove('has-tabbar');
  }, []);
  if (!ready) return null;
  if (!profile) return <Navigate to="/" replace />;
  return (
    <>
      <Topbar withNav />
      <ReminderBanner />
      <Outlet />
      <TabBar />
    </>
  );
}

function PlainShell({ children }: { children?: ReactNode }) {
  const { ready } = useGarden();
  if (!ready) return null;
  return (
    <>
      <Topbar withNav={false} />
      {children ?? <Outlet />}
    </>
  );
}

function ExampleShell() {
  return (
    <DemoProvider>
      <Topbar withNav />
      <div className="banner" role="note">
        This is an example garden with sample numbers. Nothing here is saved.
        <Link className="btn small" to="/start">
          Plant my garden
        </Link>
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

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!/^\/(garden|example)\/[a-z]+/.test(pathname)) window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollTop />
      <StorageBanner />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route element={<PlainShell />}>
          <Route path="/start" element={<HowItWorks />} />
          <Route path="/start/data" element={<ChooseData />} />
          <Route path="/start/normal" element={<SetNormal />} />
          <Route path="/start/name" element={<NameGarden />} />
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
      </Routes>
    </>
  );
}
