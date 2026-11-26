import { Router, type Request, type Response } from 'express';
import {
  authenticateUser,
  createSession,
  createUser,
  deleteSessionByToken,
} from '../database.ts';
import {
  extractBearerToken,
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/authMiddleware.ts';

export const authRouter = Router();

authRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password } = (req.body ?? {}) as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
    };

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const user = createUser({ name, email, password });
    const session = createSession(user.id);
    res.status(201).json({
      user,
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Account creation failed.';
    const status = message.includes('already exists') ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

authRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = (req.body ?? {}) as {
      email?: unknown;
      password?: unknown;
    };

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = authenticateUser({ email, password });
    if (!user) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    const session = createSession(user.id);
    res.json({
      user,
      token: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to sign in right now. Please try again.' });
  }
});

authRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

authRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (token) {
    deleteSessionByToken(token);
  }
  res.json({ ok: true });
});
