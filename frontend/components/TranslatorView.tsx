import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  Loader2,
  Square,
  Volume2,
} from 'lucide-react';
import {
  saveTranslationRecord,
  SpeechQuotaError,
  synthesizeSpeech,
  translateText,
} from '../services/apiService';
import {
  isBrowserSpeechSupported,
  speakWithBrowserVoice,
  stopBrowserSpeech,
} from '../services/speechService';
import {
  type AutoSpeakMode,
  type TargetLanguage,
  type TranslationApiResult,
  type TranslationRecord,
  type TranslatorMode,
  type VoiceName,
} from '../types';

interface TranslatorViewProps {
  initialPrompt?: { text: string; targetLanguage: TargetLanguage } | null;
  onClearInitialPrompt?: () => void;
  onRecordsSaved?: (records: TranslationRecord[]) => void;
}

const SAMPLE_PROMPTS = [
  {
    label: 'Greeting',
    text: 'Hello, how are you and your family today?',
  },
  {
    label: 'Healthcare',
    text: 'Drink clean boiled water and visit the health center if the fever continues.',
  },
  {
    label: 'Education',
    text: 'Children should go to school every day to learn reading and writing.',
  },
];

const VOICE_OPTIONS: { value: VoiceName; label: string }[] = [
  { value: 'Kore', label: 'Kore (Female)' },
  { value: 'Puck', label: 'Puck (Male)' },
  { value: 'Charon', label: 'Charon (Calm Male)' },
  { value: 'Zephyr', label: 'Zephyr (Soft Female)' },
];

const SPEED_OPTIONS = [
  { value: 0.85, label: '0.85× Slow' },
  { value: 1.0, label: '1.0× Normal' },
  { value: 1.15, label: '1.15× Fast' },
];

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export const TranslatorView: React.FC<TranslatorViewProps> = ({
  initialPrompt,
  onClearInitialPrompt,
  onRecordsSaved,
}) => {
  const [mode, setMode] = useState<TranslatorMode>('both');
  const [englishText, setEnglishText] = useState('');
  const [result, setResult] = useState<TranslationApiResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedField, setCopiedField] = useState<'telugu' | 'gondi' | null>(null);

  // Voice Assistant state
  const [voiceName, setVoiceName] = useState<VoiceName>('Kore');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [autoSpeak, setAutoSpeak] = useState<AutoSpeakMode>('off');
  const [assistantPhase, setAssistantPhase] = useState<'idle' | 'loading' | 'speaking'>('idle');
  const [activeSpeechLang, setActiveSpeechLang] = useState<TargetLanguage | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const sequenceCancelledRef = useRef<boolean>(false);
  const geminiTtsQuotaReachedRef = useRef<boolean>(false);

  const includesGondi = mode === 'both' || mode === 'gondi';
  const includesTelugu = mode === 'both' || mode === 'telugu';
  const wordCount = useMemo(() => countWords(englishText), [englishText]);

  const stopVoiceAssistant = useCallback(() => {
    sequenceCancelledRef.current = true;
    stopBrowserSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    setAssistantPhase('idle');
    setActiveSpeechLang(null);
  }, []);

  useEffect(() => {
    if (initialPrompt) {
      stopVoiceAssistant();
      setMode(initialPrompt.targetLanguage);
      setEnglishText(initialPrompt.text);
      setResult(null);
      setError(null);
      setSaved(false);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt, onClearInitialPrompt, stopVoiceAssistant]);

  useEffect(() => {
    return () => {
      stopVoiceAssistant();
    };
  }, [stopVoiceAssistant]);

  const playLanguageAudio = useCallback(
    async (
      scriptText: string,
      romanizedText: string,
      language: TargetLanguage,
      selectedVoice: VoiceName,
      speed: number
    ): Promise<void> => {
      const cleanScript = scriptText.trim();
      const cleanRomanized = romanizedText.trim();
      const primaryText = cleanScript || cleanRomanized;
      if (!primaryText) return;

      const cacheKey = `${language}:${selectedVoice}:${primaryText}`;
      setActiveSpeechLang(language);
      setTtsError(null);

      let audioUrl = audioCacheRef.current.get(cacheKey);
      if (!audioUrl && !geminiTtsQuotaReachedRef.current) {
        setAssistantPhase('loading');
        try {
          audioUrl = await synthesizeSpeech(primaryText, language, selectedVoice);
          audioCacheRef.current.set(cacheKey, audioUrl);
        } catch (err) {
          if (err instanceof SpeechQuotaError) {
            geminiTtsQuotaReachedRef.current = true;
          }
          if (!isBrowserSpeechSupported()) {
            throw err;
          }
        }
      }

      if (sequenceCancelledRef.current) return;

      setAssistantPhase('speaking');

      if (audioUrl) {
        await new Promise<void>((resolve, reject) => {
          const audio = new Audio(audioUrl);
          audio.playbackRate = speed;
          audioRef.current = audio;

          audio.onended = () => {
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            audioRef.current = null;
            reject(new Error('Audio playback could not start in this browser.'));
          };

          audio.play().catch((err) => {
            audioRef.current = null;
            reject(err instanceof Error ? err : new Error('Browser blocked audio playback.'));
          });
        });
        return;
      }

      await speakWithBrowserVoice({
        scriptText: cleanScript,
        romanizedText: cleanRomanized,
        language,
        speed,
      });
    },
    []
  );

  const handleSpeakSingle = useCallback(
    async (language: TargetLanguage, sourceResult?: TranslationApiResult) => {
      const target = sourceResult ?? result;
      if (!target) return;

      const scriptText =
        language === 'telugu' ? target.teluguText ?? '' : target.gondiScript ?? '';
      const romanizedText =
        language === 'telugu' ? target.teluguRomanized ?? '' : target.gondiText ?? '';
      if (!scriptText.trim() && !romanizedText.trim()) return;

      stopVoiceAssistant();
      sequenceCancelledRef.current = false;

      try {
        await playLanguageAudio(scriptText, romanizedText, language, voiceName, playbackSpeed);
      } catch (err) {
        if (!sequenceCancelledRef.current) {
          setTtsError(err instanceof Error ? err.message : 'Speech synthesis failed.');
        }
      } finally {
        if (!sequenceCancelledRef.current) {
          setAssistantPhase('idle');
          setActiveSpeechLang(null);
        }
      }
    },
    [result, voiceName, playbackSpeed, playLanguageAudio, stopVoiceAssistant]
  );

  const handleSpeakSequence = useCallback(
    async (sourceResult: TranslationApiResult) => {
      stopVoiceAssistant();
      sequenceCancelledRef.current = false;

      try {
        if (sourceResult.teluguText) {
          await playLanguageAudio(
            sourceResult.teluguText,
            sourceResult.teluguRomanized ?? '',
            'telugu',
            voiceName,
            playbackSpeed
          );
        }
        if (sequenceCancelledRef.current) return;
        if (sourceResult.gondiScript || sourceResult.gondiText) {
          await playLanguageAudio(
            sourceResult.gondiScript ?? '',
            sourceResult.gondiText ?? '',
            'gondi',
            voiceName,
            playbackSpeed
          );
        }
      } catch (err) {
        if (!sequenceCancelledRef.current) {
          setTtsError(err instanceof Error ? err.message : 'Speech synthesis failed.');
        }
      } finally {
        if (!sequenceCancelledRef.current) {
          setAssistantPhase('idle');
          setActiveSpeechLang(null);
        }
      }
    },
    [voiceName, playbackSpeed, playLanguageAudio, stopVoiceAssistant]
  );

  const switchMode = (nextMode: TranslatorMode) => {
    if (nextMode === mode) return;
    stopVoiceAssistant();
    setMode(nextMode);
    setResult(null);
    setError(null);
    setTtsError(null);
    setSaved(false);
  };

  const handleInputChange = (value: string) => {
    setError(null);
    setEnglishText(value);
  };

  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = englishText.trim();
    if (!trimmed) {
      setError('Enter English text to translate.');
      return;
    }

    stopVoiceAssistant();
    setLoading(true);
    setError(null);
    setTtsError(null);
    setSaved(false);

    try {
      const translated = await translateText(trimmed, mode);
      setResult(translated);

      // Optional auto-speak right after translating
      if (autoSpeak === 'telugu' && translated.teluguText) {
        void handleSpeakSingle('telugu', translated);
      } else if (autoSpeak === 'gondi' && (translated.gondiScript || translated.gondiText)) {
        void handleSpeakSingle('gondi', translated);
      } else if (autoSpeak === 'both') {
        void handleSpeakSequence(translated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, field: 'telugu' | 'gondi') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1600);
    } catch {
      // Ignore clipboard failure in restricted iframes
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);
    setError(null);
    try {
      const cleanEnglish = englishText.trim();
      const newlySaved: TranslationRecord[] = [];
      if (result.teluguText) {
        const rec = await saveTranslationRecord({
          targetLanguage: 'telugu',
          englishText: cleanEnglish,
          translatedText: result.teluguText,
          secondaryText: result.teluguRomanized ?? '',
        });
        newlySaved.push(rec);
      }
      if (result.gondiText) {
        const rec = await saveTranslationRecord({
          targetLanguage: 'gondi',
          englishText: cleanEnglish,
          translatedText: result.gondiText,
          secondaryText: result.gondiScript ?? '',
        });
        newlySaved.push(rec);
      }
      onRecordsSaved?.(newlySaved);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save translation.');
    } finally {
      setSaving(false);
    }
  };

  const hasTeluguOutput = Boolean(result?.teluguText);
  const hasGondiOutput = Boolean(result?.gondiText);
  const isBusySpeaking = assistantPhase !== 'idle';

  const voiceStatusLabel =
    assistantPhase === 'loading'
      ? `Synthesizing ${activeSpeechLang === 'gondi' ? 'Gondi' : 'Telugu'} speech...`
      : assistantPhase === 'speaking'
        ? `Speaking ${activeSpeechLang === 'gondi' ? 'Gondi' : 'Telugu'} out loud`
        : 'Ready · Select Telugu or Gondi to speak out loud';

  return (
    <div className="space-y-6">
      {/* Header & Target Language Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            English to Telugu &amp; Gondi Translation
          </h1>
        </div>

        <div
          className="inline-flex items-center rounded-lg bg-slate-200/70 p-1 self-start"
          role="group"
          aria-label="Target language"
        >
          {(
            [
              { id: 'both', label: 'Both (Telugu & Gondi)' },
              { id: 'telugu', label: 'Telugu Only' },
              { id: 'gondi', label: 'Gondi Only' },
            ] as { id: TranslatorMode; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchMode(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === item.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Translator */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 items-stretch">
          {/* English Input Pane */}
          <form onSubmit={handleTranslate} className="p-6 flex flex-col justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">English</span>
                <span className="font-mono tabular-nums">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>
              </div>

              <textarea
                value={englishText}
                onChange={(e) => handleInputChange(e.target.value)}
                rows={7}
                placeholder="Enter English text to translate and speak aloud..."
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0F5257] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5257]/20 leading-relaxed"
              />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>Try a sample:</span>
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setEnglishText(sample.text);
                      setError(null);
                    }}
                    className="text-[#0F5257] hover:underline font-medium whitespace-nowrap"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    stopVoiceAssistant();
                    setEnglishText('');
                    setResult(null);
                    setError(null);
                    setTtsError(null);
                    setSaved(false);
                  }}
                  disabled={!englishText && !result}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-40 transition-colors"
                >
                  Clear
                </button>

                <button
                  type="submit"
                  disabled={loading || !englishText.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0F5257] rounded-lg hover:bg-[#0B3E42] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Translating...' : 'Translate'}
                </button>
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  {error}
                </p>
              )}
            </div>
          </form>

          {/* Translation Output & Voice Assistant Pane */}
          <div className="p-6 flex flex-col justify-between gap-6 bg-slate-50/40">
            {!result && !loading && (
              <div className="my-auto py-14 text-center space-y-1.5">
                <p className="text-sm font-medium text-slate-700">
                  Translations and Voice Assistant controls will appear here
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Translate English text on the left, then play Telugu and Gondi speech out loud
                  separately.
                </p>
              </div>
            )}

            {loading && (
              <div className="my-auto py-8 space-y-5" aria-busy="true">
                {includesTelugu && (
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                    <div className="h-6 w-5/6 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                  </div>
                )}
                {includesGondi && (
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
                    <div className="h-6 w-4/5 bg-slate-200 rounded animate-pulse" />
                    <div className="h-4 w-3/5 bg-slate-100 rounded animate-pulse" />
                  </div>
                )}
              </div>
            )}

            {result && !loading && (
              <div className="space-y-5">
                {/* Telugu Translation Block */}
                {hasTeluguOutput && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600">
                        Telugu · తెలుగు
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.teluguText ?? '', 'telugu')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 hover:text-slate-900 transition-colors whitespace-nowrap"
                      >
                        {copiedField === 'telugu' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedField === 'telugu' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="font-telugu text-lg font-medium text-slate-900 leading-relaxed">
                      {result.teluguText}
                    </p>
                    {result.teluguRomanized && (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {result.teluguRomanized}
                      </p>
                    )}
                  </div>
                )}

                {hasTeluguOutput && hasGondiOutput && <hr className="border-slate-200" />}

                {/* Gondi Translation Block */}
                {hasGondiOutput && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-600">
                        Gondi · గోండి (Adilabad / Koyang)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.gondiText ?? '', 'gondi')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 hover:text-slate-900 transition-colors whitespace-nowrap"
                      >
                        {copiedField === 'gondi' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedField === 'gondi' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-lg font-medium text-slate-900 leading-relaxed">
                      {result.gondiText}
                    </p>
                    {result.gondiScript && (
                      <p className="font-telugu text-sm text-slate-600 leading-relaxed">
                        {result.gondiScript}
                      </p>
                    )}
                  </div>
                )}

                {/* Dedicated Voice Assistant Controls */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xs font-semibold text-slate-900">Voice Assistant</h2>
                      <p className="text-xs text-slate-500">{voiceStatusLabel}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value as VoiceName)}
                        aria-label="Voice assistant persona"
                        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-[#0F5257] focus:outline-none"
                      >
                        {VOICE_OPTIONS.map((v) => (
                          <option key={v.value} value={v.value}>
                            {v.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        aria-label="Speech playback speed"
                        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-mono tabular-nums text-slate-800 focus:border-[#0F5257] focus:outline-none"
                      >
                        {SPEED_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Separate Telugu & Gondi Speak Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {hasTeluguOutput && (
                      <button
                        type="button"
                        onClick={() => handleSpeakSingle('telugu')}
                        disabled={assistantPhase === 'loading'}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                          activeSpeechLang === 'telugu' && isBusySpeaking
                            ? 'bg-[#0F5257] text-white border-[#0F5257]'
                            : 'bg-white text-slate-900 border-slate-300 hover:border-[#0F5257] hover:text-[#0F5257]'
                        } disabled:opacity-50`}
                      >
                        {activeSpeechLang === 'telugu' && assistantPhase === 'loading' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        {activeSpeechLang === 'telugu' && assistantPhase === 'speaking'
                          ? 'Speaking Telugu...'
                          : 'Speak Telugu'}
                      </button>
                    )}

                    {hasGondiOutput && (
                      <button
                        type="button"
                        onClick={() => handleSpeakSingle('gondi')}
                        disabled={assistantPhase === 'loading'}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                          activeSpeechLang === 'gondi' && isBusySpeaking
                            ? 'bg-[#0F5257] text-white border-[#0F5257]'
                            : 'bg-white text-slate-900 border-slate-300 hover:border-[#0F5257] hover:text-[#0F5257]'
                        } disabled:opacity-50`}
                      >
                        {activeSpeechLang === 'gondi' && assistantPhase === 'loading' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        {activeSpeechLang === 'gondi' && assistantPhase === 'speaking'
                          ? 'Speaking Gondi...'
                          : 'Speak Gondi'}
                      </button>
                    )}

                    {isBusySpeaking && (
                      <button
                        type="button"
                        onClick={stopVoiceAssistant}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop
                      </button>
                    )}
                  </div>

                  {ttsError && (
                    <p
                      role="alert"
                      className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                    >
                      {ttsError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Footer Row inside Output Pane: Auto-speak setting + Save to History */}
            <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <span>Auto-speak after translating</span>
                <select
                  value={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.value as AutoSpeakMode)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-[#0F5257] focus:outline-none"
                >
                  <option value="off">Off (Manual)</option>
                  <option value="telugu">Telugu</option>
                  <option value="gondi">Gondi</option>
                  <option value="both">Telugu then Gondi</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleSave}
                disabled={!result || saving || saved}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {saved ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5" />
                )}
                {saved ? 'Saved to History' : saving ? 'Saving...' : 'Save to History'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
