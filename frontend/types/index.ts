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

export interface TranslationApiResult {
  teluguText?: string;
  teluguRomanized?: string;
  gondiText?: string;
  gondiScript?: string;
}
