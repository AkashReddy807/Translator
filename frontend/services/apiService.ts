import type {
  TargetLanguage,
  TranslationApiResult,
  TranslationRecord,
  TranslatorMode,
  UserProfile,
  VoiceName,
} from '../types';

// Keep session bearer token strictly in JS memory (never in localStorage or sessionStorage)
let sessionToken: string | null = null;

export function setAuthToken(token: string | null): void {
  sessionToken = token;
}

export function getAuthToken(): string | null {
  return sessionToken;
}

function buildHeaders(includeJson = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  return headers;
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: UserProfile; token: string }> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(input),
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not create account.');
  }
  const token = String(data.token ?? '');
  setAuthToken(token || null);
  return { user: data.user as UserProfile, token };
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile; token: string }> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(input),
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Invalid email or password.');
  }
  const token = String(data.token ?? '');
  setAuthToken(token || null);
  return { user: data.user as UserProfile, token };
}

export async function logoutAccount(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: buildHeaders(false),
    });
  } finally {
    setAuthToken(null);
  }
}

export async function fetchTranslationHistory(search?: string): Promise<TranslationRecord[]> {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set('search', search.trim());
  }
  const qs = params.toString();
  const response = await fetch(`/api/translations${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: buildHeaders(false),
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load history.');
  }
  return Array.isArray(data.records) ? (data.records as TranslationRecord[]) : [];
}

export async function saveTranslationRecord(input: {
  targetLanguage: TargetLanguage;
  englishText: string;
  translatedText: string;
  secondaryText: string;
}): Promise<TranslationRecord> {
  const response = await fetch('/api/translations', {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(input),
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save translation.');
  }
  return data.record as TranslationRecord;
}

export async function deleteTranslationRecord(recordId: string): Promise<void> {
  const response = await fetch(`/api/translations/${encodeURIComponent(recordId)}`, {
    method: 'DELETE',
    headers: buildHeaders(false),
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Failed to delete translation.');
  }
}

export async function translateText(
  englishText: string,
  targetLanguage: TranslatorMode
): Promise<TranslationApiResult> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ englishText, targetLanguage }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Translation request failed.'
    );
  }
  return data as TranslationApiResult;
}

export class SpeechQuotaError extends Error {
  quotaExceeded = true;
  constructor(message: string) {
    super(message);
    this.name = 'SpeechQuotaError';
  }
}

export async function synthesizeSpeech(
  text: string,
  language: TargetLanguage = 'telugu',
  voiceName: VoiceName = 'Kore'
): Promise<string> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ text, language, voiceName }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const message =
      typeof data.error === 'string' ? data.error : 'Speech synthesis failed.';
    if (response.status === 429 || data.quotaExceeded === true) {
      throw new SpeechQuotaError(message);
    }
    throw new Error(message);
  }

  return `data:${typeof data.mimeType === 'string' ? data.mimeType : 'audio/wav'};base64,${String(data.audioBase64 ?? '')}`;
}
