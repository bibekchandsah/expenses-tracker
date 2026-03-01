import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { TrendingUp, CheckCircle, Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const features = [
  'Track expenses with real-time cloud sync',
  'Powerful analytics and spending insights',
  'Budget tracking with alerts',
  'Multiple secure sign-in options',
];

const PROVIDERS = [
  {
    key: 'google',
    label: 'Google',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
  {
    key: 'microsoft',
    label: 'Microsoft',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
        <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022"/>
        <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00"/>
        <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF"/>
        <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/>
      </svg>
    ),
  },
  {
    key: 'apple',
    label: 'Apple',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    key: 'github',
    label: 'GitHub',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
];

export default function Login() {
  const {
    user, loading, error, clearError,
    signInWithGoogle, signInWithMicrosoft, signInWithApple, signInWithTwitter, signInWithGitHub,
    signUpWithEmail, signInWithEmail, resetPassword,
  } = useAuth();

  // 'signin' | 'signup' | 'reset'
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [localError, setLocalError] = useState('');

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  function changeMode(m) {
    setMode(m);
    setLocalError('');
    setResetSent(false);
    clearError();
  }

  const providerFns = {
    google:    signInWithGoogle,
    microsoft: signInWithMicrosoft,
    apple:     signInWithApple,
    twitter:   signInWithTwitter,
    github:    signInWithGitHub,
  };

  async function handleSocial(key) {
    setBusy(key);
    setLocalError('');
    try { await providerFns[key](); } catch { /* shown via context */ } finally { setBusy(null); }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (mode === 'reset') {
      if (!form.email) { setLocalError('Enter your email address.'); return; }
      setBusy('email');
      try { await resetPassword(form.email); setResetSent(true); }
      catch { /* shown via context */ }
      finally { setBusy(null); }
      return;
    }

    if (mode === 'signup' && !form.name.trim()) { setLocalError('Enter your full name.'); return; }
    if (!form.email)    { setLocalError('Enter your email address.'); return; }
    if (!form.password) { setLocalError('Enter your password.'); return; }

    setBusy('email');
    try {
      if (mode === 'signup') await signUpWithEmail(form.name.trim(), form.email, form.password);
      else                   await signInWithEmail(form.email, form.password);
    } catch { /* shown via context */ }
    finally { setBusy(null); }
  }

  const anyBusy = busy !== null;
  const displayError = localError || error;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">

      {/* ── Left branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-white/20 rounded-2xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold">ExpenseIQ</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Smart Expense Tracking for Modern Life
          </h1>
          <p className="text-primary-200 text-lg mb-8">
            Take control of your finances with real-time insights, budget planning, and beautiful analytics.
          </p>
          <ul className="space-y-3">
            {features.map(f => (
              <li key={f} className="flex items-center gap-3 text-primary-100">
                <CheckCircle className="w-5 h-5 text-primary-300 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right: auth panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-4">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 justify-center mb-6 lg:hidden">
            <div className="p-2 bg-primary-600 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">ExpenseIQ</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">

            {/* Header */}
            <div className="text-center mb-6">
              {mode === 'reset' ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Reset password</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">We'll send a reset link to your email</p>
                </>
              ) : mode === 'signup' ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Create account</h2>
                  <p className="text-sm text-gray-500 dark:text-gray:400">Start tracking your expenses today</p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to manage your expenses</p>
                </>
              )}
            </div>

            {/* Error */}
            {displayError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
              </div>
            )}

            {/* Reset sent */}
            {resetSent && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <p className="text-sm text-green-700 dark:text-green-400">Reset link sent! Check your inbox.</p>
              </div>
            )}

            {/* Email/password form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    disabled={anyBusy}
                    className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={anyBusy}
                  className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                />
              </div>

              {mode !== 'reset' && (
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? 'Password (min. 6 characters)' : 'Password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    disabled={anyBusy}
                    className="w-full pl-10 pr-10 py-3 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {mode === 'signin' && (
                <div className="text-right -mt-1">
                  <button type="button" onClick={() => changeMode('reset')} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={anyBusy}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                {busy === 'email'
                  ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : <Mail className="w-4 h-4" />
                }
                {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in with Email'}
              </button>
            </form>

            {/* Mode toggle */}
            <div className="flex items-center justify-center gap-1 mt-4 text-sm">
              {mode === 'reset' ? (
                <button onClick={() => changeMode('signin')} className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>
              ) : mode === 'signup' ? (
                <>
                  <span className="text-gray-500 dark:text-gray-400">Already have an account?</span>
                  <button onClick={() => changeMode('signin')} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline ml-1">Sign in</button>
                </>
              ) : (
                <>
                  <span className="text-gray-500 dark:text-gray-400">Don't have an account?</span>
                  <button onClick={() => changeMode('signup')} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline ml-1">Sign up</button>
                </>
              )}
            </div>

            {/* Social providers */}
            {mode !== 'reset' && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">or continue with</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PROVIDERS.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => handleSocial(key)}
                      disabled={anyBusy}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50 transition-all sm:last:col-span-2 sm:last:justify-center"
                    >
                      {busy === key
                        ? <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 flex-shrink-0" />
                        : icon
                      }
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-6">
              By signing in, you agree to our terms of service.<br />
              Your data is securely stored and never shared.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
