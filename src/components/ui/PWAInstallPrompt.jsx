import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, MoreVertical, Plus } from 'lucide-react';

const DISMISSED_KEY  = 'pwa-install-dismissed';
const DISMISSED_DAYS = 7; // re-show after this many days

function isDismissedRecently() {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY);
    if (!ts) return false;
    return (Date.now() - Number(ts)) < DISMISSED_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [showIOSGuide, setShowIOSGuide]     = useState(false);
  const [installing, setInstalling]         = useState(false);
  const [installed, setInstalled]           = useState(false);

  useEffect(() => {
    // Already running as installed app — never show
    if (isStandalone()) return;
    // User dismissed recently — stay hidden
    if (isDismissedRecently()) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setShowBanner(false);
      setInstalled(true);
      setTimeout(() => setInstalled(false), 4000);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // iOS Safari: no beforeinstallprompt — show manual guide
    if (isIOS() && !isStandalone()) {
      // Small delay so it doesn't appear immediately on first load
      const t = setTimeout(() => setShowIOSGuide(true), 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onPrompt);
        window.removeEventListener('appinstalled', onAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
      } else {
        dismiss();
      }
    } catch {
      // silently ignore
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* noop */ }
    setShowBanner(false);
    setShowIOSGuide(false);
  }, []);

  // Success flash
  if (installed) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-bounce-in">
        <div className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-2xl shadow-xl text-sm font-semibold">
          <Download className="w-4 h-4" />
          App installed successfully!
        </div>
      </div>
    );
  }

  // Chrome / Edge / Android: native install banner
  if (showBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 pointer-events-none">
        <div className="mx-auto max-w-md pointer-events-auto">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Colored top strip */}
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <div className="px-4 pt-4 pb-4">
              <div className="flex items-start gap-3">
                {/* App icon */}
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white text-xl font-black">E</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    Install ExpenseIQ
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Add to your home screen for quick access, offline support, and a native app experience.
                  </p>
                </div>

                <button
                  onClick={dismiss}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 -mt-1 -mr-1"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 rounded-xl transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  {installing ? 'Installing…' : 'Install App'}
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari: manual guide
  if (showIOSGuide) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 pointer-events-none">
        <div className="mx-auto max-w-md pointer-events-auto">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <div className="px-4 pt-4 pb-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-black">E</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Add ExpenseIQ to Home Screen</p>
                </div>
                <button
                  onClick={dismiss}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { icon: Share, text: <>Tap the <strong>Share</strong> button in Safari's toolbar</> },
                  { icon: Plus,  text: <>Scroll down and tap <strong>"Add to Home Screen"</strong></> },
                  { icon: Download, text: <>Tap <strong>"Add"</strong> to install the app</> },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <Icon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-300">{text}</p>
                  </div>
                ))}
              </div>

              {/* Arrow pointing down at Safari toolbar */}
              <div className="flex justify-center mt-3">
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <MoreVertical className="w-3 h-3" />
                  <span>Look for the share icon in Safari's bottom bar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
