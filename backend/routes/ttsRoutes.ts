import { Router, type Request, type Response } from 'express';
import { createTtsAiClient, formatGeminiApiError } from '../services/geminiService.ts';

const ALLOWED_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);

export const ttsRouter = Router();

ttsRouter.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, language, voiceName } = req.body ?? {};
    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }
    if (text.trim().length > 600) {
      return res.status(400).json({ error: 'Speech text must be 600 characters or fewer.' });
    }

    const safeVoice =
      typeof voiceName === 'string' && ALLOWED_VOICES.has(voiceName) ? voiceName : 'Kore';

    const promptPrefix =
      language === 'gondi'
        ? 'Speak clearly and naturally with authentic Indian Dravidian Gondi pronunciation: '
        : 'Speak clearly and naturally in Telugu: ';

    const ai = createTtsAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${promptPrefix}${text.trim()}`,
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
    if (!base64Audio) {
      return res.status(502).json({ error: 'Text-to-speech synthesis returned no audio data.' });
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: unknown) {
    console.error('TTS API error:', error);
    const formatted = formatGeminiApiError(
      error,
      'Speech synthesis failed.',
      'Daily free-tier Gemini speech quota reached. Please retry later or select a billing-enabled API key in Settings > Secrets.'
    );
    return res.status(formatted.status).json({ error: formatted.error });
  }
});
