import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';
import { auth, googleProvider } from './services/firebase';
import {
  ensureUserProfile,
  subscribeTranslationHistory,
} from './services/firestoreService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TranslatorView } from './components/TranslatorView';
import { HistoryView } from './components/HistoryView';
import type { TargetLanguage, TranslationRecord } from './types';

type ActiveTab = 'translate' | 'history';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('translate');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [historyRecords, setHistoryRecords] = useState<TranslationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [reusePrompt, setReusePrompt] = useState<{
    text: string;
    targetLanguage: TargetLanguage;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setAuthError(null);
      setDbError(null);

      if (nextUser) {
        try {
          await ensureUserProfile(nextUser);
        } catch (err) {
          console.error('Profile sync failed:', err);
        }
      } else {
        setHistoryRecords([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    setHistoryLoading(true);
    const unsubHistory = subscribeTranslationHistory(
      user.uid,
      (records) => {
        setHistoryRecords(records);
        setHistoryLoading(false);
      },
      (err) => {
        setHistoryLoading(false);
        setDbError(err.message);
      }
    );

    return () => unsubHistory();
  }, [authReady, user]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in could not be completed.'
      );
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('translate')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            VaniGondi
          </button>

          {/* Zone 2: Minimal navigation links */}
          <nav className="flex items-center gap-6" aria-label="Primary">
            {(
              [
                { id: 'translate', label: 'Translate' },
                { id: 'history', label: 'History' },
              ] as { id: ActiveTab; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'text-[#0F5257] border-[#0F5257]'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Single primary auth action */}
          <div className="shrink-0">
            {!authReady ? (
              <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
            ) : user ? (
              <button
                type="button"
                onClick={handleSignOut}
                title={`Signed in as ${user.email || user.displayName}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <span className="max-w-[110px] truncate hidden sm:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0F5257] rounded-lg hover:bg-[#0B3E42] transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {authError && (
          <div
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"
          >
            {authError}
          </div>
        )}

        {dbError && (
          <div
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 break-words"
          >
            Firestore error: {dbError}
          </div>
        )}

        {activeTab === 'translate' && (
          <TranslatorView
            user={user}
            initialPrompt={reusePrompt}
            onClearInitialPrompt={() => setReusePrompt(null)}
            onRequireSignIn={handleSignIn}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            user={user}
            records={historyRecords}
            loading={historyLoading}
            onRequireSignIn={handleSignIn}
            onReuseSentence={(text, targetLanguage) => {
              setReusePrompt({ text, targetLanguage });
              setActiveTab('translate');
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
