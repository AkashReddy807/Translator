import type {
  TargetLanguage,
  TranslationApiResult,
  TranslatorMode,
  VoiceName,
} from '../types';

export async function translateText(
  englishText: string,
  targetLanguage: TranslatorMode
): Promise<TranslationApiResult> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ englishText, targetLanguage }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Translation request failed.');
  }
  return data as TranslationApiResult;
}

export async function synthesizeSpeech(
  text: string,
  language: TargetLanguage = 'telugu',
  voiceName: VoiceName = 'Kore'
): Promise<string> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, voiceName }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Speech synthesis failed.');
  }

  return `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
}
