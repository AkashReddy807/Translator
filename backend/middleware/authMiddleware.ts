import type { NextFunction, Request, Response } from 'express';
import { getUserBySessionToken, type UserProfile } from '../database.ts';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  authToken?: string;
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+([a-fA-F0-9]{64})$/);
  return match ? match[1] : null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const user = getUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  req.user = user;
  req.authToken = token;
  next();
}
