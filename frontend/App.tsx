import { useCallback, useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import {
  deleteTranslationRecord,
  fetchTranslationHistory,
  logoutAccount,
} from './services/apiService';
import { AuthScreen } from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TranslatorView } from './components/TranslatorView';
import { HistoryView } from './components/HistoryView';
import type { TargetLanguage, TranslationRecord, UserProfile } from './types';

type ActiveTab = 'translate' | 'history';

function MainApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('translate');
  const [user, setUser] = useState<UserProfile | null>(null);

  const [historyRecords, setHistoryRecords] = useState<TranslationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [reusePrompt, setReusePrompt] = useState<{
    text: string;
    targetLanguage: TargetLanguage;
  } | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setDbError(null);
    try {
      const records = await fetchTranslationHistory();
      setHistoryRecords(records);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Failed to load saved translations.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setHistoryRecords([]);
      setDbError(null);
      return;
    }
    void loadHistory();
  }, [user, loadHistory]);

  const handleSignOut = async () => {
    await logoutAccount();
    setUser(null);
    setHistoryRecords([]);
    setActiveTab('translate');
    setDbError(null);
  };

  const handleRecordsSaved = (savedRecords: TranslationRecord[]) => {
    if (savedRecords.length === 0) return;
    setHistoryRecords((prev) => [...savedRecords, ...prev]);
  };

  const handleDeleteRecord = async (recordId: string) => {
    await deleteTranslationRecord(recordId);
    setHistoryRecords((prev) => prev.filter((item) => item.id !== recordId));
  };

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser);
          setActiveTab('translate');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('translate')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
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
                className={`py-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === item.id
                    ? 'text-[#0F5257] border-[#0F5257]'
                    : 'text-slate-600 border-transparent hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Signed-in user + Sign out */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleSignOut}
              title={`Signed in as ${user.email}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="max-w-[120px] truncate hidden sm:inline">{user.name}</span>
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {dbError && (
          <div
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 break-words"
          >
            {dbError}
          </div>
        )}

        {activeTab === 'translate' && (
          <TranslatorView
            initialPrompt={reusePrompt}
            onClearInitialPrompt={() => setReusePrompt(null)}
            onRecordsSaved={handleRecordsSaved}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            records={historyRecords}
            loading={historyLoading}
            onDeleteRecord={handleDeleteRecord}
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
