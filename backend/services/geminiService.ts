import { GoogleGenAI } from '@google/genai';

const USER_AGENT_HEADERS = {
  'User-Agent': 'aistudio-build',
};

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return apiKey;
}

export function createTextAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: getApiKey(),
    httpOptions: {
      headers: USER_AGENT_HEADERS,
    },
  });
}

export function createTtsAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: getApiKey(),
    apiVersion: 'v1beta',
    httpOptions: {
      headers: USER_AGENT_HEADERS,
    },
  });
}

export function formatGeminiApiError(
  error: unknown,
  fallbackMessage: string,
  quotaMessage: string
): { status: number; error: string } {
  const rawMessage = error instanceof Error ? error.message : fallbackMessage;
  if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return { status: 429, error: quotaMessage };
  }
  if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      error: 'Gemini API key error. Please check your API key in Settings > Secrets.',
    };
  }
  return { status: 500, error: rawMessage };
}
