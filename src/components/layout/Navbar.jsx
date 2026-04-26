import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { logout }   from '../../services/authService';

const navLinks = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/patients',
    label: 'Patients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const { profile }       = useAuth();
  const { dark, toggle }  = useTheme();
  const location          = useLocation();
  const navigate          = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = profile?.name?.charAt(0)?.toUpperCase() ?? 'R';

  return (
    <>
      {/* ── Top bar (mobile) ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 transition-colors">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-glow-rose">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-base">OncoGuide</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle dark={dark} toggle={toggle} />
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-64
        bg-white dark:bg-gray-900
        border-r border-gray-100 dark:border-gray-800
        flex flex-col transition-all duration-300 ease-in-out
        md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-glow-rose flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">OncoGuide</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs leading-tight">Radiologist Portal</p>
          </div>
          {/* Dark mode toggle — desktop */}
          <div className="hidden md:block">
            <ThemeToggle dark={dark} toggle={toggle} />
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-gray-400 dark:text-gray-600 text-xs font-semibold uppercase tracking-widest px-3 mb-3">Menu</p>
          {navLinks.map(({ to, label, icon }) => {
            const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-gradient-to-r from-rose-50 to-violet-50 dark:from-rose-900/30 dark:to-violet-900/30 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/50'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className={`flex-shrink-0 transition-colors ${active ? 'text-rose-500 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                  {icon}
                </span>
                {label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-2">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-white text-sm font-semibold truncate">{profile?.name ?? 'Radiologist'}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs truncate">{profile?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Dark mode toggle button ────────────────────────────────────────────────────
function ThemeToggle({ dark, toggle }) {
  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {dark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
