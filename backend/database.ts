import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { TRANSLATION_DATASETS } from '../dataset/datasetsCatalog.ts';

export type TargetLanguage = 'telugu' | 'gondi';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface TranslationRecord {
  id: string;
  userId: string;
  targetLanguage: TargetLanguage;
  englishText: string;
  translatedText: string;
  secondaryText: string;
  createdAt: string;
}

const DB_PATH = path.resolve(process.cwd(), 'database/vanigondi.db');
const SCHEMA_PATH = path.resolve(process.cwd(), 'database/schema.sql');
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);

  seedDatabase(db);
  dbInstance = db;
  return db;
}

function seedDatabase(db: DatabaseSync): void {
  const upsertDataset = db.prepare(`
    INSERT INTO datasets (
      id, name, role, size_label, source_platform, benchmark_status
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      size_label = excluded.size_label,
      source_platform = excluded.source_platform,
      benchmark_status = excluded.benchmark_status
  `);

  for (const d of TRANSLATION_DATASETS) {
    upsertDataset.run(
      d.id,
      d.name,
      d.role,
      d.sizeLabel,
      d.sourcePlatform,
      d.benchmarkStatus
    );
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createUser(input: {
  name: string;
  email: string;
  password: string;
}): UserProfile {
  const db = getDatabase();
  const cleanName = typeof input.name === 'string' ? input.name.trim() : '';
  const cleanEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const rawPassword = typeof input.password === 'string' ? input.password : '';

  if (cleanName.length < 2 || cleanName.length > 100) {
    throw new Error('Please enter your name (2 to 100 characters).');
  }
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  if (rawPassword.length < 6 || rawPassword.length > 128) {
    throw new Error('Password must be between 6 and 128 characters.');
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(cleanEmail) as { id: string } | undefined;
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const id = `usr_${crypto.randomUUID()}`;
  const passwordHash = hashPassword(rawPassword);
  const createdAt = new Date().toISOString();

  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cleanName, cleanEmail, passwordHash, createdAt);

  return {
    id,
    name: cleanName,
    email: cleanEmail,
    createdAt,
  };
}

export function authenticateUser(input: {
  email: string;
  password: string;
}): UserProfile | null {
  const db = getDatabase();
  const cleanEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const rawPassword = typeof input.password === 'string' ? input.password : '';
  if (!cleanEmail || !rawPassword) return null;

  const row = db
    .prepare('SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?')
    .get(cleanEmail) as
    | {
        id: string;
        name: string;
        email: string;
        password_hash: string;
        created_at: string;
      }
    | undefined;

  if (!row || !verifyPassword(rawPassword, row.password_hash)) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function createSession(userId: string): {
  token: string;
  expiresAt: string;
} {
  const db = getDatabase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString());

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(tokenHash, userId, expiresAt, now.toISOString());

  return { token, expiresAt };
}

export function getUserBySessionToken(token: string): UserProfile | null {
  if (!token) return null;
  const db = getDatabase();
  const tokenHash = hashToken(token);
  const nowIso = new Date().toISOString();

  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(tokenHash, nowIso) as
    | {
        id: string;
        name: string;
        email: string;
        created_at: string;
      }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function deleteSessionByToken(token: string): void {
  if (!token) return;
  const db = getDatabase();
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function insertTranslation(
  userId: string,
  input: {
    targetLanguage: TargetLanguage;
    englishText: string;
    translatedText: string;
    secondaryText: string;
  }
): TranslationRecord {
  if (!userId) {
    throw new Error('User ID is required to save translation.');
  }
  const db = getDatabase();
  const id = `tr_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();

  const targetLanguage: TargetLanguage = input.targetLanguage === 'gondi' ? 'gondi' : 'telugu';
  const englishText = input.englishText.trim();
  const translatedText = input.translatedText.trim();
  const secondaryText = input.secondaryText.trim();

  if (!englishText || !translatedText) {
    throw new Error('English text and translated text are required.');
  }

  db.prepare(
    `INSERT INTO translations (
      id, user_id, target_language, english_text, translated_text, secondary_text, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, targetLanguage, englishText, translatedText, secondaryText, createdAt);

  return {
    id,
    userId,
    targetLanguage,
    englishText,
    translatedText,
    secondaryText,
    createdAt,
  };
}

export function queryTranslations(options: {
  userId: string;
  search?: string;
  targetLanguage?: TargetLanguage | 'all';
}): TranslationRecord[] {
  if (!options.userId) return [];
  const db = getDatabase();
  const search = options.search?.trim() ?? '';
  const targetLanguage = options.targetLanguage ?? 'all';

  const conditions: string[] = ['user_id = ?'];
  const params: Array<string | number> = [options.userId];

  if (targetLanguage === 'telugu' || targetLanguage === 'gondi') {
    conditions.push('target_language = ?');
    params.push(targetLanguage);
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push('(english_text LIKE ? OR translated_text LIKE ? OR secondary_text LIKE ?)');
    params.push(pattern, pattern, pattern);
  }

  const sql = `
    SELECT id, user_id, target_language, english_text, translated_text, secondary_text, created_at
    FROM translations
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
  `;

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    user_id: string;
    target_language: TargetLanguage;
    english_text: string;
    translated_text: string;
    secondary_text: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    targetLanguage: r.target_language,
    englishText: r.english_text,
    translatedText: r.translated_text,
    secondaryText: r.secondary_text,
    createdAt: r.created_at,
  }));
}

export function deleteTranslationById(userId: string, id: string): boolean {
  if (!userId || !id) return false;
  const db = getDatabase();
  const res = db
    .prepare('DELETE FROM translations WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return Number(res.changes) > 0;
}

export function getCachedTranslation<T>(cacheKey: string): T | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT result_json FROM translation_cache WHERE cache_key = ?')
    .get(cacheKey) as { result_json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.result_json) as T;
  } catch {
    return null;
  }
}

export function setCachedTranslation(cacheKey: string, result: unknown): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO translation_cache (cache_key, result_json, created_at)
     VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       result_json = excluded.result_json,
       created_at = excluded.created_at`
  ).run(cacheKey, JSON.stringify(result), new Date().toISOString());
}

export function listDatasetsFromDb() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM datasets').all() as Array<{
    id: string;
    name: string;
    role: string;
    size_label: string;
    source_platform: string;
    benchmark_status: string;
  }>;
}
