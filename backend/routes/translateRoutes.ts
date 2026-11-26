import { Router, type Request, type Response } from 'express';
import { Type } from '@google/genai';
import { GONDI_LEXICON_100 } from '../../dataset/gondiLexicon100.ts';
import { createTextAiClient, formatGeminiApiError } from '../services/geminiService.ts';

const MAX_GONDI_WORDS = 100;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
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
    if (combined.length >= 25) break;
  }

  return combined.map((e) => `${e.english} = ${e.gondi} (${e.gondiScript})`).join('; ');
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
    if (trimmed.length > 1000) {
      return res.status(400).json({ error: 'Input must be 1000 characters or fewer.' });
    }

    if ((mode === 'gondi' || mode === 'both') && countWords(trimmed) > MAX_GONDI_WORDS) {
      return res.status(400).json({
        error: `English to Gondi translation supports up to ${MAX_GONDI_WORDS} words per request.`,
      });
    }

    const ai = createTextAiClient();

    if (mode === 'both') {
      const lexicalHints = getRelevantGondiLexiconHints(trimmed);
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          `Reference Adilabad Gondi (Koyang) vocabulary: ${lexicalHints}`,
          '',
          'Translate the following English text into BOTH:',
          '1. Natural, idiomatic Telugu (Unicode script + phonetic Latin romanization).',
          '2. Natural Adilabad Gondi / Koyang dialect (readable Latin romanization + Telugu-script phonetic rendering).',
          '',
          `Source English: "${trimmed}"`,
        ].join('\n'),
        config: {
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
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Translation model returned an empty response.' });
      }

      const parsed = JSON.parse(rawText);
      return res.json({
        teluguText: String(parsed.teluguText ?? '').slice(0, 1200),
        teluguRomanized: String(parsed.teluguRomanized ?? '').slice(0, 1200),
        gondiText: String(parsed.gondiText ?? '').slice(0, 1200),
        gondiScript: String(parsed.gondiScript ?? '').slice(0, 1200),
      });
    }

    if (mode === 'gondi') {
      const lexicalHints = getRelevantGondiLexiconHints(trimmed);
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          `Reference Adilabad Gondi (Koyang) vocabulary: ${lexicalHints}`,
          '',
          'Translate the following English text (up to 100 words) into natural Adilabad Gondi (Koyang dialect):',
          `"${trimmed}"`,
        ].join('\n'),
        config: {
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
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Translation model returned an empty response.' });
      }

      const parsed = JSON.parse(rawText);
      return res.json({
        gondiText: String(parsed.gondiText ?? '').slice(0, 1200),
        gondiScript: String(parsed.gondiScript ?? '').slice(0, 1200),
      });
    }

    // English -> Telugu only
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Translate the following English text into natural, accurate Telugu:\n\n"${trimmed}"`,
      config: {
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
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return res.status(502).json({ error: 'Translation model returned an empty response.' });
    }

    const parsed = JSON.parse(rawText);
    return res.json({
      teluguText: String(parsed.teluguText ?? '').slice(0, 1200),
      teluguRomanized: String(parsed.teluguRomanized ?? '').slice(0, 1200),
    });
  } catch (error: unknown) {
    console.error('Translation API error:', error);
    const formatted = formatGeminiApiError(
      error,
      'Translation request failed.',
      'Daily free-tier Gemini API quota reached. Please wait and retry later, or select a billing-enabled API key in Settings > Secrets for higher limits.'
    );
    return res.status(formatted.status).json({ error: formatted.error });
  }
});
