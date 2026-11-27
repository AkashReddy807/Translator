import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { Type } from '@google/genai';
import { GONDI_LEXICON_100 } from '../../dataset/gondiLexicon100.ts';
import { getCachedTranslation, setCachedTranslation } from '../database.ts';
import { createTextAiClient, formatGeminiApiError } from '../services/geminiService.ts';

const TRANSLATION_MODELS = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'] as const;

function isRateLimitError(error: unknown): boolean {
  const errObj = error as { status?: number; code?: number; message?: string };
  const msg = String(errObj?.message ?? error ?? '');
  return errObj?.status === 429 || errObj?.code === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

function makeCacheKey(mode: string, text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(`${mode}:${normalized}`).digest('hex');
}

function getRelevantGondiLexiconHints(englishText: string): string {
  const lower = englishText.toLowerCase();
  const matched = GONDI_LEXICON_100.filter((entry) => {
    const escaped = entry.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  });

  const coreAnchorWords = GONDI_LEXICON_100.slice(0, 18);
  const combined = [...matched];
  for (const anchor of coreAnchorWords) {
    if (!combined.some((m) => m.english === anchor.english)) {
      combined.push(anchor);
    }
    if (combined.length >= 40) break;
  }

  return combined.map((e) => `${e.english} = ${e.gondi} (${e.gondiScript})`).join('; ');
}

async function generateWithModelFallback(
  contents: string,
  config: Record<string, unknown>
): Promise<string> {
  const ai = createTextAiClient();
  let lastError: unknown = null;

  for (const model of TRANSLATION_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      const rawText = (response.text ?? '').trim();
      if (rawText) {
        return rawText;
      }
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err)) {
        continue;
      }
      throw err;
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('Translation model returned an empty response.');
}

export const translateRouter = Router();

translateRouter.post('/translate', async (req: Request, res: Response) => {
  try {
    const { englishText, targetLanguage } = req.body ?? {};
    const mode =
      targetLanguage === 'gondi'
        ? 'gondi'
        : targetLanguage === 'telugu'
          ? 'telugu'
          : 'both';

    if (typeof englishText !== 'string' || englishText.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter English text to translate.' });
    }

    const trimmed = englishText.trim();
    const cacheKey = makeCacheKey(mode, trimmed);
    const cached = getCachedTranslation<Record<string, string>>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    if (mode === 'both') {
      const lexicalHints = getRelevantGondiLexiconHints(trimmed);
      const rawText = await generateWithModelFallback(
        [
          `Reference Adilabad Gondi (Koyang) vocabulary: ${lexicalHints}`,
          '',
          'Translate the following English text into BOTH:',
          '1. Natural, idiomatic Telugu (Unicode script + phonetic Latin romanization).',
          '2. Natural Adilabad Gondi / Koyang dialect (readable Latin romanization + Telugu-script phonetic rendering).',
          '',
          `Source English: "${trimmed}"`,
        ].join('\n'),
        {
          systemInstruction:
            'You are a computational linguistics English-to-Telugu and English-to-Gondi translator for Telangana/Andhra Pradesh Dravidian languages. Produce accurate Telugu in Telugu Unicode script with phonetic romanization, and natural Adilabad Gondi (Koyang) grounded in the provided vocabulary with Telugu-script pronunciation.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              teluguText: {
                type: Type.STRING,
                description: 'Natural Telugu translation in Telugu Unicode script.',
              },
              teluguRomanized: {
                type: Type.STRING,
                description: 'Phonetic Latin transliteration of the Telugu translation.',
              },
              gondiText: {
                type: Type.STRING,
                description: 'Natural Adilabad Gondi translation in readable Latin romanization.',
              },
              gondiScript: {
                type: Type.STRING,
                description: 'Phonetic Telugu-script rendering of the Gondi translation.',
              },
            },
            required: ['teluguText', 'teluguRomanized', 'gondiText', 'gondiScript'],
          },
        }
      );

      const parsed = JSON.parse(rawText);
      const payload = {
        teluguText: String(parsed.teluguText ?? ''),
        teluguRomanized: String(parsed.teluguRomanized ?? ''),
        gondiText: String(parsed.gondiText ?? ''),
        gondiScript: String(parsed.gondiScript ?? ''),
      };
      setCachedTranslation(cacheKey, payload);
      return res.json(payload);
    }

    if (mode === 'gondi') {
      const lexicalHints = getRelevantGondiLexiconHints(trimmed);
      const rawText = await generateWithModelFallback(
        [
          `Reference Adilabad Gondi (Koyang) vocabulary: ${lexicalHints}`,
          '',
          'Translate the following English text into natural Adilabad Gondi (Koyang dialect):',
          `"${trimmed}"`,
        ].join('\n'),
        {
          systemInstruction:
            'You are a computational linguistics English-to-Gondi translator focused on Telangana/Adilabad Gondi (Koyang, South-Central Dravidian). Use the provided Adilabad Gondi lexical entries accurately wherever applicable and produce natural Gondi grammar. Return clean readable Romanized Gondi in gondiText and phonetic Telugu-script Gondi in gondiScript.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              gondiText: {
                type: Type.STRING,
                description: 'Natural Adilabad Gondi translation in readable Latin romanization.',
              },
              gondiScript: {
                type: Type.STRING,
                description: 'Phonetic Telugu-script rendering of the Gondi translation.',
              },
            },
            required: ['gondiText', 'gondiScript'],
          },
        }
      );

      const parsed = JSON.parse(rawText);
      const payload = {
        gondiText: String(parsed.gondiText ?? ''),
        gondiScript: String(parsed.gondiScript ?? ''),
      };
      setCachedTranslation(cacheKey, payload);
      return res.json(payload);
    }

    // English -> Telugu only
    const rawText = await generateWithModelFallback(
      `Translate the following English text into natural, accurate Telugu:\n\n"${trimmed}"`,
      {
        systemInstruction:
          'You are a precise English-to-Telugu neural translation engine. Return natural, grammatically accurate Telugu written in Telugu Unicode script in teluguText along with a clear phonetic Latin transliteration in teluguRomanized.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teluguText: {
              type: Type.STRING,
              description: 'Natural Telugu translation in Telugu Unicode script.',
            },
            teluguRomanized: {
              type: Type.STRING,
              description: 'Phonetic Latin transliteration of the Telugu translation.',
            },
          },
          required: ['teluguText', 'teluguRomanized'],
        },
      }
    );

    const parsed = JSON.parse(rawText);
    const payload = {
      teluguText: String(parsed.teluguText ?? ''),
      teluguRomanized: String(parsed.teluguRomanized ?? ''),
    };
    setCachedTranslation(cacheKey, payload);
    return res.json(payload);
  } catch (error: unknown) {
    console.error('Translation API error:', error);
    const formatted = formatGeminiApiError(
      error,
      'Translation request failed.',
      'Your Gemini API key has reached its free-tier rate/daily limit across available models. Retry shortly or attach a billing-enabled key in .env / Settings > Secrets.'
    );
    return res.status(formatted.status).json({ error: formatted.error });
  }
});
