import { Router, type Response } from 'express';
import {
  deleteTranslationById,
  insertTranslation,
  queryTranslations,
  type TargetLanguage,
} from '../database.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const translationRouter = Router();

translationRouter.use('/translations', requireAuth);

translationRouter.get('/translations', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const rawTarget = req.query.targetLanguage;
  const targetLanguage: TargetLanguage | 'all' =
    rawTarget === 'telugu' || rawTarget === 'gondi' ? rawTarget : 'all';

  const records = queryTranslations({ userId, search, targetLanguage });
  res.json({ records });
});

translationRouter.post('/translations', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const body = (req.body ?? {}) as {
      targetLanguage?: unknown;
      englishText?: unknown;
      translatedText?: unknown;
      secondaryText?: unknown;
    };

    if (body.targetLanguage !== 'telugu' && body.targetLanguage !== 'gondi') {
      res.status(400).json({ error: 'Target language must be telugu or gondi.' });
      return;
    }
    if (typeof body.englishText !== 'string' || typeof body.translatedText !== 'string') {
      res.status(400).json({ error: 'English text and translated text are required.' });
      return;
    }

    const record = insertTranslation(userId, {
      targetLanguage: body.targetLanguage,
      englishText: body.englishText,
      translatedText: body.translatedText,
      secondaryText: typeof body.secondaryText === 'string' ? body.secondaryText : '',
    });

    res.status(201).json({ record });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save translation.';
    res.status(400).json({ error: message });
  }
});

translationRouter.delete('/translations/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const rawId = req.params.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!id || id.length > 128) {
    res.status(400).json({ error: 'Invalid translation ID.' });
    return;
  }

  const deleted = deleteTranslationById(userId, id);
  if (!deleted) {
    res.status(404).json({ error: 'Translation record not found.' });
    return;
  }

  res.json({ ok: true });
});
