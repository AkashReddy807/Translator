import { Router, type Request, type Response } from 'express';
import { createTtsAiClient, formatGeminiApiError } from '../services/geminiService.ts';

const ALLOWED_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);
const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'] as const;
const MAX_CACHE_ENTRIES = 100;

const ttsAudioCache = new Map<string, string>();

function setCachedAudio(key: string, base64: string) {
  if (ttsAudioCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsAudioCache.keys().next().value;
    if (oldestKey) ttsAudioCache.delete(oldestKey);
  }
  ttsAudioCache.set(key, base64);
}

function isRateLimitError(error: unknown): boolean {
  const errObj = error as { status?: number; code?: number; message?: string };
  const msg = String(errObj?.message ?? error ?? '');
  return errObj?.status === 429 || errObj?.code === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

export const ttsRouter = Router();

ttsRouter.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, language, voiceName } = req.body ?? {};
    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }
    const cleanText = text.trim();
    if (cleanText.length > 600) {
      return res.status(400).json({ error: 'Speech text must be 600 characters or fewer.' });
    }

    const safeLang = language === 'gondi' ? 'gondi' : 'telugu';
    const safeVoice =
      typeof voiceName === 'string' && ALLOWED_VOICES.has(voiceName) ? voiceName : 'Kore';

    const cacheKey = `${safeLang}:${safeVoice}:${cleanText}`;
    const cached = ttsAudioCache.get(cacheKey);
    if (cached) {
      return res.json({
        audioBase64: cached,
        mimeType: 'audio/wav',
        cached: true,
      });
    }

    const promptPrefix =
      safeLang === 'gondi'
        ? 'Speak clearly and naturally with authentic Indian Dravidian Gondi pronunciation: '
        : 'Speak clearly and naturally in Telugu: ';

    const ai = createTtsAiClient();
    let lastError: unknown = null;

    for (const model of TTS_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${promptPrefix}${cleanText}`,
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: safeVoice },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          setCachedAudio(cacheKey, base64Audio);
          return res.json({
            audioBase64: base64Audio,
            mimeType: 'audio/wav',
          });
        }
      } catch (err) {
        lastError = err;
        // If quota/rate-limited on the first TTS model, automatically try the fallback TTS model
        if (isRateLimitError(err)) {
          continue;
        }
        throw err;
      }
    }

    if (lastError) {
      throw lastError;
    }

    return res.status(502).json({ error: 'Text-to-speech synthesis returned no audio data.' });
  } catch (error: unknown) {
    console.error('TTS API error:', error);
    const quotaExceeded = isRateLimitError(error);
    const formatted = formatGeminiApiError(
      error,
      'Speech synthesis failed.',
      'Daily free-tier Gemini speech quota reached.'
    );
    return res.status(formatted.status).json({
      error: formatted.error,
      quotaExceeded,
    });
  }
});
