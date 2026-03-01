import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Tag,
  Target,
  User,
  TrendingUp,
  X,
  Landmark,
  HandCoins,
  Wallet,
  PiggyBank,
  StickyNote,
  Heart,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
  Wrench,
  Calculator as CalculatorIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Calculator from './ui/Calculator';

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/income',      label: 'Income',       icon: TrendingUp },
  { to: '/expenses',    label: 'Expenses',     icon: Receipt },
  { to: '/categories',  label: 'Categories',   icon: Tag },
  { to: '/budget',      label: 'Budget',       icon: Target },
  { to: '/profile',     label: 'Profile',      icon: User },
  { to: '/bank',        label: 'Bank',         icon: Landmark },
  { to: '/lend',        label: 'Lend',         icon: HandCoins },
  { to: '/loan',        label: 'Loan',         icon: Wallet },
  { to: '/saving',      label: 'Saving',       icon: PiggyBank },
  { to: '/note',        label: 'Note',         icon: StickyNote },
  { to: '/for-me',      label: 'For Me',       icon: Heart },
  { to: '/net-summary', label: 'Net Summary',  icon: BarChart3 },
];

function NavItem({ to, label, icon: Icon, collapsed, onClose }) {
  return (
    <div className="relative group">
      <NavLink
        to={to}
        onClick={onClose}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            collapsed ? 'justify-center' : ''
          } ${
            isActive
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          }`
        }
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </NavLink>
      {/* Tooltip — only in collapsed mode */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                        opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5
                          rounded-lg whitespace-nowrap shadow-lg">
            {label}
            {/* Arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2
                            border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [toolsOpen,   setToolsOpen]   = useState(false);
  const [showCalc,    setShowCalc]    = useState(false);
  const profileRef = useRef(null);
  const toolsRef   = useRef(null);

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem('sidebarCollapsed', String(next)); } catch {}
      return next;
    });
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (toolsRef.current   && !toolsRef.current.contains(e.target))   setToolsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleLogout() {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  }

  function handleProfile() {
    setProfileOpen(false);
    onClose();
    navigate('/profile');
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          flex flex-col transition-all duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Logo + collapse toggle */}
        <div className={`flex items-center border-b border-gray-200 dark:border-gray-800 h-16 ${
          collapsed ? 'justify-center px-3' : 'justify-between px-4'
        }`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary-600 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">ExpenseIQ</span>
            </div>
          )}
          {collapsed && (
            <div className="p-1.5 bg-primary-600 rounded-xl">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          )}

          {/* Mobile close */}
          {!collapsed && (
            <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1">
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden lg:flex items-center justify-center p-1.5 rounded-lg
                        text-gray-400 hover:text-gray-700 dark:hover:text-gray-300
                        hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                        ${collapsed ? 'mt-3' : ''}`}
          >
            {collapsed
              ? <PanelLeftOpen  className="w-4 h-4" />
              : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-3 space-y-0.5 ${
          collapsed ? 'px-1.5 overflow-visible' : 'px-3 overflow-y-auto'
        }`}>
          {navItems.map(item => (
            <NavItem key={item.to} {...item} collapsed={collapsed} onClose={onClose} />
          ))}
        </nav>

        {/* ── Tools section ───────────────────────────────────────── */}
        <div
          className={`border-t border-gray-200 dark:border-gray-800 ${
            collapsed ? 'px-1.5 py-2' : 'px-3 py-2'
          }`}
          ref={toolsRef}
        >
          <div className="relative group">
            <button
              onClick={() => setToolsOpen(o => !o)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                          text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                          hover:text-gray-900 dark:hover:text-white
                          ${collapsed ? 'justify-center' : ''}`}
            >
              <Wrench className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Tools</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Tooltip in collapsed mode */}
            {collapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                              opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5
                                rounded-lg whitespace-nowrap shadow-lg">
                  Tools
                  <div className="absolute right-full top-1/2 -translate-y-1/2
                                  border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                </div>
              </div>
            )}

            {/* Tools dropdown */}
            {toolsOpen && (
              <div className={`absolute bottom-full mb-2 z-50 bg-white dark:bg-gray-800
                              border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden
                              ${ collapsed ? 'left-full ml-2 bottom-0 mb-0 w-44' : 'left-0 right-0 w-full' }`}>
                <button
                  onClick={() => { setShowCalc(true); setToolsOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <CalculatorIcon className="w-4 h-4 text-gray-400" />
                  Calculator
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calculator overlay */}
        {showCalc && <Calculator onClose={() => setShowCalc(false)} />}

        {/* Theme toggle */}
        <div className={`border-t border-gray-200 dark:border-gray-800 ${
          collapsed ? 'px-1.5 py-2' : 'px-3 py-2'
        }`}>
          <div className="relative group">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                          text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800
                          hover:text-gray-900 dark:hover:text-white
                          ${collapsed ? 'justify-center' : ''}`}
            >
              {dark
                ? <Sun  className="w-5 h-5 flex-shrink-0" />
                : <Moon className="w-5 h-5 flex-shrink-0" />}
              {!collapsed && (
                <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
              )}
            </button>
            {/* Tooltip in collapsed mode */}
            {collapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                              opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5
                                rounded-lg whitespace-nowrap shadow-lg">
                  {dark ? 'Light Mode' : 'Dark Mode'}
                  <div className="absolute right-full top-1/2 -translate-y-1/2
                                  border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile section */}
        <div className={`border-t border-gray-200 dark:border-gray-800 ${
          collapsed ? 'px-1.5 py-3' : 'px-3 py-3'
        }`} ref={profileRef}>
          <div className="relative">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className={`w-full flex items-center gap-2.5 rounded-xl px-2 py-2
                          text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                          ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? (user?.displayName || user?.email || 'Profile') : ''}
            >
              {/* Avatar */}
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-primary-200 dark:ring-primary-800"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center
                                flex-shrink-0 text-white text-xs font-bold ring-2 ring-primary-200 dark:ring-primary-800">
                  {initials}
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user?.displayName || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <ChevronUp className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${profileOpen ? '' : 'rotate-180'}`} />
                </>
              )}
            </button>

            {/* Collapsed tooltip for profile */}
            {collapsed && (
              <div className="pointer-events-none absolute left-full bottom-0 ml-3 z-50
                              opacity-0 group-hover:opacity-100 transition-opacity duration-150
                              hidden group-hover:block">
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5
                                rounded-lg whitespace-nowrap shadow-lg">
                  {user?.displayName || user?.email || 'Profile'}
                </div>
              </div>
            )}

            {/* Dropdown */}
            {profileOpen && (
              <div className={`absolute bottom-full mb-2 z-50 bg-white dark:bg-gray-800
                              border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden
                              ${ collapsed ? 'left-full ml-2 bottom-0 mb-0 w-44' : 'left-0 right-0 w-full' }`}>
                {/* User info header */}
                {!collapsed && (
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Signed in as</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">{user?.displayName || 'User'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
                  </div>
                )}
                <button
                  onClick={handleProfile}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  View Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400
                             hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
