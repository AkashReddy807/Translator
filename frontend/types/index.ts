import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'contributor' | 'reviewer' | 'admin';
export type TargetLanguage = 'telugu' | 'gondi';
export type TranslatorMode = 'both' | 'telugu' | 'gondi';
export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Zephyr';
export type AutoSpeakMode = 'off' | 'telugu' | 'gondi' | 'both';

export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  idMaxLength: 128,
  displayNameMaxLength: 100,
  emailMaxLength: 254,
  translationEnglishMaxLength: 1000,
  translationOutputMaxLength: 1200,
  gondiMaxWords: 100,
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt?: Timestamp | null;
}

export interface TranslationRecord {
  id: string;
  userId: string;
  targetLanguage: TargetLanguage;
  englishText: string;
  translatedText: string;
  secondaryText: string;
  createdAt?: Timestamp | null;
}

export interface TranslationApiResult {
  teluguText?: string;
  teluguRomanized?: string;
  gondiText?: string;
  gondiScript?: string;
}
