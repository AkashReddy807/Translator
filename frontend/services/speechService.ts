import type { TargetLanguage } from '../types';

export function isBrowserSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopBrowserSpeech(): void {
  if (isBrowserSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isBrowserSpeechSupported()) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 350);

    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): {
  voice: SpeechSynthesisVoice | null;
  supportsTeluguScript: boolean;
} {
  // 1. Native Telugu voice (reads both Telugu and Gondi Telugu-script phonetics accurately)
  const teluguVoice = voices.find((v) => v.lang.toLowerCase().startsWith('te'));
  if (teluguVoice) {
    return { voice: teluguVoice, supportsTeluguScript: true };
  }

  // 2. Indian English or Hindi voice for romanized fallback
  const indianEnglish = voices.find((v) => v.lang.toLowerCase() === 'en-in');
  if (indianEnglish) {
    return { voice: indianEnglish, supportsTeluguScript: false };
  }

  const hindiVoice = voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
  if (hindiVoice) {
    return { voice: hindiVoice, supportsTeluguScript: false };
  }

  const defaultVoice = voices.find((v) => v.default) || voices[0] || null;
  return { voice: defaultVoice, supportsTeluguScript: false };
}

export async function speakWithBrowserVoice(options: {
  scriptText: string;
  romanizedText?: string;
  language: TargetLanguage;
  speed?: number;
}): Promise<void> {
  if (!isBrowserSpeechSupported()) {
    throw new Error('Browser speech synthesis is not supported in this browser.');
  }

  const voices = await getAvailableVoices();
  const { voice, supportsTeluguScript } = pickBestVoice(voices);

  // If the OS/browser has a Telugu voice, speak Telugu script (also reads Gondi Telugu phonetics);
  // otherwise speak the romanized phonetic text so the browser voice always pronounces it audibly.
  const spokenText = supportsTeluguScript
    ? options.scriptText.trim() || options.romanizedText?.trim() || ''
    : options.romanizedText?.trim() || options.scriptText.trim() || '';

  if (!spokenText) return;

  window.speechSynthesis.cancel();

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(spokenText);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = supportsTeluguScript ? 'te-IN' : 'en-IN';
    }
    utterance.rate = options.speed ?? 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        resolve();
        return;
      }
      reject(new Error('Browser speech playback failed.'));
    };

    window.speechSynthesis.speak(utterance);
  });
}
