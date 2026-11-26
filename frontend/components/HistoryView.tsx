import React, { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, Search, Trash2, Volume2 } from 'lucide-react';
import { synthesizeSpeech } from '../services/apiService';
import type { TargetLanguage, TranslationRecord } from '../types';

interface HistoryViewProps {
  records: TranslationRecord[];
  loading: boolean;
  onDeleteRecord: (id: string) => Promise<void>;
  onReuseSentence: (text: string, targetLanguage: TargetLanguage) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  loading,
  onDeleteRecord,
  onReuseSentence,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.englishText.toLowerCase().includes(q) ||
        r.translatedText.toLowerCase().includes(q) ||
        r.secondaryText.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const handleListen = async (rec: TranslationRecord) => {
    const textToSpeak =
      rec.targetLanguage === 'gondi'
        ? rec.secondaryText || rec.translatedText
        : rec.translatedText;
    if (!textToSpeak.trim()) return;

    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(rec.id);
    try {
      const url = await synthesizeSpeech(textToSpeak, rec.targetLanguage);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      await audio.play();
    } catch (err) {
      setPlayingId(null);
      setError(err instanceof Error ? err.message : 'Audio playback failed.');
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setDeletingId(id);
    try {
      await onDeleteRecord(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete translation record.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Saved Translations
          </h1>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved translations..."
            className="h-9 w-64 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F5257] focus:outline-none focus:ring-2 focus:ring-[#0F5257]/20"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"
        >
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading && (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center space-y-1.5">
            <p className="text-sm font-medium text-slate-800">
              {records.length === 0
                ? 'No saved translations yet'
                : 'No saved translations match your search'}
            </p>
            <p className="text-xs text-slate-500">
              Translate text in Telugu or Gondi mode and click Save to History to store it in your
              workspace.
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-slate-200">
            {filtered.map((rec) => {
              const timestampStr = rec.createdAt
                ? new Date(rec.createdAt).toLocaleString()
                : 'Just now';

              return (
                <div
                  key={rec.id}
                  className="p-5 space-y-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-slate-500">English</p>
                      <p className="text-sm text-slate-900 leading-relaxed">{rec.englishText}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-slate-500">
                        {rec.targetLanguage === 'gondi' ? 'Gondi' : 'Telugu'}
                      </p>
                      <p
                        className={`text-sm text-slate-900 leading-relaxed ${
                          rec.targetLanguage === 'telugu' ? 'font-telugu' : ''
                        }`}
                      >
                        {rec.translatedText}
                      </p>
                      {rec.secondaryText && (
                        <p
                          className={`text-xs text-slate-500 ${
                            rec.targetLanguage === 'gondi' ? 'font-telugu' : ''
                          }`}
                        >
                          {rec.secondaryText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        {rec.targetLanguage === 'gondi' ? 'English → Gondi' : 'English → Telugu'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{timestampStr}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleListen(rec)}
                        disabled={playingId !== null}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        {playingId === rec.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        Listen
                      </button>
                      <button
                        type="button"
                        onClick={() => onReuseSentence(rec.englishText, rec.targetLanguage)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Reuse
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rec.id)}
                        disabled={deletingId === rec.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-slate-200 rounded-md hover:bg-red-50 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
