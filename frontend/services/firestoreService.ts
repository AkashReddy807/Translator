import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  BLUEPRINT_LIMITS,
  type TargetLanguage,
  type TranslationRecord,
  type UserProfile,
} from '../types';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, BLUEPRINT_LIMITS.idMaxLength);
  return cleaned.length > 0 ? cleaned : `id_${Date.now()}`;
}

function generateValidDocId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return sanitizeId(`${prefix}_${Date.now()}_${randomPart}`);
}

function clampString(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function getTimestampMillis(ts: { toMillis?: () => number } | null | undefined): number {
  if (ts && typeof ts.toMillis === 'function') {
    return ts.toMillis();
  }
  return 0;
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      return existingSnap.data() as UserProfile;
    }

    const displayName = clampString(
      user.displayName || user.email?.split('@')[0] || 'User',
      BLUEPRINT_LIMITS.displayNameMaxLength
    );
    const email = clampString(user.email || 'user@example.com', BLUEPRINT_LIMITS.emailMaxLength);

    await setDoc(ref, {
      uid: user.uid,
      displayName,
      email,
      role: 'contributor' as const,
      createdAt: serverTimestamp(),
    });

    return {
      uid: user.uid,
      displayName,
      email,
      role: 'contributor',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeTranslationHistory(
  userId: string,
  onUpdate: (records: TranslationRecord[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'translations'),
    where('userId', '==', userId),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: TranslationRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const englishText = typeof data.englishText === 'string' ? data.englishText : '';
        const translatedText =
          typeof data.translatedText === 'string'
            ? data.translatedText
            : typeof data.teluguText === 'string'
              ? data.teluguText
              : '';
        const secondaryText =
          typeof data.secondaryText === 'string'
            ? data.secondaryText
            : typeof data.teluguRomanized === 'string'
              ? data.teluguRomanized
              : '';
        const targetLanguage: TargetLanguage =
          data.targetLanguage === 'gondi' ? 'gondi' : 'telugu';

        if (englishText && translatedText) {
          records.push({
            id: docSnap.id,
            userId: String(data.userId ?? userId),
            targetLanguage,
            englishText,
            translatedText,
            secondaryText,
            createdAt: data.createdAt ?? null,
          });
        }
      });
      records.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
      onUpdate(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'translations');
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveTranslationRecord(
  user: User,
  data: {
    targetLanguage: TargetLanguage;
    englishText: string;
    translatedText: string;
    secondaryText: string;
  }
): Promise<string> {
  const id = generateValidDocId('tr');
  const path = `translations/${id}`;

  const payload = {
    userId: user.uid,
    targetLanguage: data.targetLanguage,
    englishText: clampString(data.englishText, BLUEPRINT_LIMITS.translationEnglishMaxLength),
    translatedText: clampString(data.translatedText, BLUEPRINT_LIMITS.translationOutputMaxLength),
    secondaryText: clampString(data.secondaryText, BLUEPRINT_LIMITS.translationOutputMaxLength),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'translations', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteTranslationRecord(recordId: string): Promise<void> {
  const safeId = sanitizeId(recordId);
  const path = `translations/${safeId}`;
  try {
    await deleteDoc(doc(db, 'translations', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
