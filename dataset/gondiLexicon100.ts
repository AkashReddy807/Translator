export type GondiWordCategory =
  | 'Greetings & Everyday'
  | 'Pronouns & People'
  | 'Numbers'
  | 'Nature & Elements'
  | 'Body & Health'
  | 'Home, Food & Civic'
  | 'Verbs & Adjectives';

export interface GondiLexiconEntry {
  english: string;
  gondi: string;
  gondiScript: string;
  category: GondiWordCategory;
}

/**
 * Curated 100-word English to Adilabad Gondi (Koyang) pilot lexicon for Phase 1 demonstration.
 */
export const GONDI_LEXICON_100: GondiLexiconEntry[] = [
  // 1. Greetings & Everyday (10)
  { english: 'hello', gondi: 'Seva Johar', gondiScript: 'సేవా జోహార్', category: 'Greetings & Everyday' },
  { english: 'goodbye', gondi: 'Johar', gondiScript: 'జోహార్', category: 'Greetings & Everyday' },
  { english: 'yes', gondi: 'Inge', gondiScript: 'ఇంగె', category: 'Greetings & Everyday' },
  { english: 'no', gondi: 'Hille', gondiScript: 'హిల్లె', category: 'Greetings & Everyday' },
  { english: 'thank you', gondi: 'Bhale Johar', gondiScript: 'భలే జోహార్', category: 'Greetings & Everyday' },
  { english: 'name', gondi: 'Porol', gondiScript: 'పొరోల్', category: 'Greetings & Everyday' },
  { english: 'today', gondi: 'Nend', gondiScript: 'నేండ్', category: 'Greetings & Everyday' },
  { english: 'tomorrow', gondi: 'Nari', gondiScript: 'నారి', category: 'Greetings & Everyday' },
  { english: 'yesterday', gondi: 'Ninne', gondiScript: 'నిన్నె', category: 'Greetings & Everyday' },
  { english: 'day', gondi: 'Piyyal', gondiScript: 'పియ్యాల్', category: 'Greetings & Everyday' },

  // 2. Pronouns & People (15)
  { english: 'i', gondi: 'Nanna', gondiScript: 'నన్నా', category: 'Pronouns & People' },
  { english: 'you', gondi: 'Imma', gondiScript: 'ఇమ్మ', category: 'Pronouns & People' },
  { english: 'we', gondi: 'Marat', gondiScript: 'మరట్', category: 'Pronouns & People' },
  { english: 'he', gondi: 'Oor', gondiScript: 'ఓర్', category: 'Pronouns & People' },
  { english: 'she', gondi: 'Ad', gondiScript: 'అద్', category: 'Pronouns & People' },
  { english: 'they', gondi: 'Oork', gondiScript: 'ఓర్క్', category: 'Pronouns & People' },
  { english: 'mother', gondi: 'Awwal', gondiScript: 'అవ్వల్', category: 'Pronouns & People' },
  { english: 'father', gondi: 'Babol', gondiScript: 'బాబోల్', category: 'Pronouns & People' },
  { english: 'brother', gondi: 'Tammur', gondiScript: 'తమ్ముర్', category: 'Pronouns & People' },
  { english: 'sister', gondi: 'Selar', gondiScript: 'సెలార్', category: 'Pronouns & People' },
  { english: 'child', gondi: 'Pilla', gondiScript: 'పిల్ల', category: 'Pronouns & People' },
  { english: 'man', gondi: 'Manval', gondiScript: 'మన్వాల్', category: 'Pronouns & People' },
  { english: 'woman', gondi: 'Ar', gondiScript: 'ఆర్', category: 'Pronouns & People' },
  { english: 'friend', gondi: 'Sangi', gondiScript: 'సంగి', category: 'Pronouns & People' },
  { english: 'family', gondi: 'Rona Lok', gondiScript: 'రోనా లోక్', category: 'Pronouns & People' },

  // 3. Numbers (10)
  { english: 'one', gondi: 'Undi', gondiScript: 'ఉందీ', category: 'Numbers' },
  { english: 'two', gondi: 'Rand', gondiScript: 'రండ్', category: 'Numbers' },
  { english: 'three', gondi: 'Mund', gondiScript: 'మూండ్', category: 'Numbers' },
  { english: 'four', gondi: 'Nalu', gondiScript: 'నాలూ', category: 'Numbers' },
  { english: 'five', gondi: 'Sayyu', gondiScript: 'సయ్యూ', category: 'Numbers' },
  { english: 'six', gondi: 'Saru', gondiScript: 'సారు', category: 'Numbers' },
  { english: 'seven', gondi: 'Eru', gondiScript: 'ఏరూ', category: 'Numbers' },
  { english: 'eight', gondi: 'Aru', gondiScript: 'ఆరూ', category: 'Numbers' },
  { english: 'nine', gondi: 'Naru', gondiScript: 'నరూ', category: 'Numbers' },
  { english: 'ten', gondi: 'Pad', gondiScript: 'పద్', category: 'Numbers' },

  // 4. Nature & Elements (15)
  { english: 'water', gondi: 'Yer', gondiScript: 'యేర్', category: 'Nature & Elements' },
  { english: 'fire', gondi: 'Kis', gondiScript: 'కిస్', category: 'Nature & Elements' },
  { english: 'sun', gondi: 'Pord', gondiScript: 'పోర్డ్', category: 'Nature & Elements' },
  { english: 'moon', gondi: 'Nella', gondiScript: 'నెల్ల', category: 'Nature & Elements' },
  { english: 'star', gondi: 'Sukka', gondiScript: 'సుక్క', category: 'Nature & Elements' },
  { english: 'sky', gondi: 'Badal', gondiScript: 'బాదల్', category: 'Nature & Elements' },
  { english: 'earth', gondi: 'Dhartri', gondiScript: 'ధర్త్రి', category: 'Nature & Elements' },
  { english: 'rain', gondi: 'Pirr', gondiScript: 'పిర్ర్', category: 'Nature & Elements' },
  { english: 'wind', gondi: 'Vadi', gondiScript: 'వాది', category: 'Nature & Elements' },
  { english: 'tree', gondi: 'Mara', gondiScript: 'మర', category: 'Nature & Elements' },
  { english: 'forest', gondi: 'Keda', gondiScript: 'కేడ', category: 'Nature & Elements' },
  { english: 'river', gondi: 'Doda', gondiScript: 'దొడ', category: 'Nature & Elements' },
  { english: 'mountain', gondi: 'Dongar', gondiScript: 'దొంగర్', category: 'Nature & Elements' },
  { english: 'stone', gondi: 'Kal', gondiScript: 'కల్', category: 'Nature & Elements' },
  { english: 'flower', gondi: 'Pungar', gondiScript: 'పుంగార్', category: 'Nature & Elements' },

  // 5. Body & Health (15)
  { english: 'head', gondi: 'Talla', gondiScript: 'తల్ల', category: 'Body & Health' },
  { english: 'eye', gondi: 'Kan', gondiScript: 'కణ్', category: 'Body & Health' },
  { english: 'ear', gondi: 'Kavi', gondiScript: 'కవి', category: 'Body & Health' },
  { english: 'nose', gondi: 'Massor', gondiScript: 'మస్సోర్', category: 'Body & Health' },
  { english: 'mouth', gondi: 'Toddi', gondiScript: 'తొడ్డి', category: 'Body & Health' },
  { english: 'hand', gondi: 'Kai', gondiScript: 'కై', category: 'Body & Health' },
  { english: 'leg', gondi: 'Kal', gondiScript: 'కాల్', category: 'Body & Health' },
  { english: 'heart', gondi: 'Jiva', gondiScript: 'జీవ', category: 'Body & Health' },
  { english: 'blood', gondi: 'Nattur', gondiScript: 'నత్తుర్', category: 'Body & Health' },
  { english: 'bone', gondi: 'Boka', gondiScript: 'బొక', category: 'Body & Health' },
  { english: 'pain', gondi: 'Noy', gondiScript: 'నోయ్', category: 'Body & Health' },
  { english: 'fever', gondi: 'Erki', gondiScript: 'ఎర్కి', category: 'Body & Health' },
  { english: 'cough', gondi: 'Kasa', gondiScript: 'కాస', category: 'Body & Health' },
  { english: 'medicine', gondi: 'Davayi', gondiScript: 'దవాయీ', category: 'Body & Health' },
  { english: 'hospital', gondi: 'Davakhana', gondiScript: 'దవాఖాన', category: 'Body & Health' },

  // 6. Home, Food & Civic (15)
  { english: 'house', gondi: 'Ron', gondiScript: 'రోన్', category: 'Home, Food & Civic' },
  { english: 'village', gondi: 'Nar', gondiScript: 'నార్', category: 'Home, Food & Civic' },
  { english: 'road', gondi: 'Sarri', gondiScript: 'సర్రి', category: 'Home, Food & Civic' },
  { english: 'school', gondi: 'Pathasala', gondiScript: 'పాఠశాల', category: 'Home, Food & Civic' },
  { english: 'teacher', gondi: 'Guruji', gondiScript: 'గురుజీ', category: 'Home, Food & Civic' },
  { english: 'book', gondi: 'Pustak', gondiScript: 'పుస్తక్', category: 'Home, Food & Civic' },
  { english: 'food', gondi: 'Gato', gondiScript: 'గాటో', category: 'Home, Food & Civic' },
  { english: 'rice', gondi: 'Nuka', gondiScript: 'నూక', category: 'Home, Food & Civic' },
  { english: 'milk', gondi: 'Pal', gondiScript: 'పాల్', category: 'Home, Food & Civic' },
  { english: 'salt', gondi: 'Savar', gondiScript: 'సవర్', category: 'Home, Food & Civic' },
  { english: 'fruit', gondi: 'Kaya', gondiScript: 'కాయ', category: 'Home, Food & Civic' },
  { english: 'grain', gondi: 'Dan', gondiScript: 'దాన్', category: 'Home, Food & Civic' },
  { english: 'market', gondi: 'Bajar', gondiScript: 'బజార్', category: 'Home, Food & Civic' },
  { english: 'meeting', gondi: 'Bethak', gondiScript: 'బేఠక్', category: 'Home, Food & Civic' },
  { english: 'work', gondi: 'Kamm', gondiScript: 'కమ్మ్', category: 'Home, Food & Civic' },

  // 7. Verbs & Adjectives (20)
  { english: 'go', gondi: 'Handana', gondiScript: 'హందానా', category: 'Verbs & Adjectives' },
  { english: 'come', gondi: 'Vayana', gondiScript: 'వాయానా', category: 'Verbs & Adjectives' },
  { english: 'eat', gondi: 'Tindana', gondiScript: 'తిందానా', category: 'Verbs & Adjectives' },
  { english: 'drink', gondi: 'Undana', gondiScript: 'ఉందానా', category: 'Verbs & Adjectives' },
  { english: 'sleep', gondi: 'Sunjana', gondiScript: 'సుంజానా', category: 'Verbs & Adjectives' },
  { english: 'speak', gondi: 'Vankana', gondiScript: 'వంకానా', category: 'Verbs & Adjectives' },
  { english: 'read', gondi: 'Vachana', gondiScript: 'వాచానా', category: 'Verbs & Adjectives' },
  { english: 'write', gondi: 'Lihana', gondiScript: 'లిహానా', category: 'Verbs & Adjectives' },
  { english: 'see', gondi: 'Hurdana', gondiScript: 'హుర్దానా', category: 'Verbs & Adjectives' },
  { english: 'hear', gondi: 'Kenjana', gondiScript: 'కెంజానా', category: 'Verbs & Adjectives' },
  { english: 'give', gondi: 'Siyana', gondiScript: 'సియానా', category: 'Verbs & Adjectives' },
  { english: 'take', gondi: 'Yettana', gondiScript: 'యెత్తానా', category: 'Verbs & Adjectives' },
  { english: 'walk', gondi: 'Takana', gondiScript: 'తకానా', category: 'Verbs & Adjectives' },
  { english: 'run', gondi: 'Vittana', gondiScript: 'విత్తానా', category: 'Verbs & Adjectives' },
  { english: 'good', gondi: 'Baga', gondiScript: 'బాగ', category: 'Verbs & Adjectives' },
  { english: 'bad', gondi: 'Kharab', gondiScript: 'ఖరాబ్', category: 'Verbs & Adjectives' },
  { english: 'big', gondi: 'Pedor', gondiScript: 'పెదోర్', category: 'Verbs & Adjectives' },
  { english: 'small', gondi: 'Chudoor', gondiScript: 'చుదూర్', category: 'Verbs & Adjectives' },
  { english: 'hot', gondi: 'Kasa', gondiScript: 'కాస', category: 'Verbs & Adjectives' },
  { english: 'cold', gondi: 'Pini', gondiScript: 'పిని', category: 'Verbs & Adjectives' },
];

export const GONDI_CATEGORIES: GondiWordCategory[] = [
  'Greetings & Everyday',
  'Pronouns & People',
  'Numbers',
  'Nature & Elements',
  'Body & Health',
  'Home, Food & Civic',
  'Verbs & Adjectives',
];

const LEXICON_MAP = new Map<string, GondiLexiconEntry>(
  GONDI_LEXICON_100.map((entry) => [entry.english.toLowerCase(), entry])
);

export interface GondiLookupResult {
  supported: boolean;
  exactMatch: boolean;
  gondiText: string;
  gondiScript: string;
  matchedEntries: GondiLexiconEntry[];
  unsupportedWords: string[];
}

function normalizePhrase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function translateEnglishToGondi100(rawInput: string): GondiLookupResult {
  const normalized = normalizePhrase(rawInput);
  if (!normalized) {
    return {
      supported: false,
      exactMatch: false,
      gondiText: '',
      gondiScript: '',
      matchedEntries: [],
      unsupportedWords: [],
    };
  }

  // 1. Exact single-word or two-word lexicon match (e.g., "water", "thank you")
  const exact = LEXICON_MAP.get(normalized);
  if (exact) {
    return {
      supported: true,
      exactMatch: true,
      gondiText: exact.gondi,
      gondiScript: exact.gondiScript,
      matchedEntries: [exact],
      unsupportedWords: [],
    };
  }

  // 2. Token-by-token lookup strictly limited to the 100-word pilot vocabulary
  const tokens = normalized.split(' ');
  const matchedEntries: GondiLexiconEntry[] = [];
  const unsupportedWords: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    // Check two-word phrase "thank you"
    if (i + 1 < tokens.length) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      const bigramMatch = LEXICON_MAP.get(bigram);
      if (bigramMatch) {
        matchedEntries.push(bigramMatch);
        i += 1;
        continue;
      }
    }

    const token = tokens[i];
    const match = LEXICON_MAP.get(token);
    if (match) {
      matchedEntries.push(match);
    } else {
      unsupportedWords.push(token);
    }
  }

  if (matchedEntries.length === 0) {
    return {
      supported: false,
      exactMatch: false,
      gondiText: '',
      gondiScript: '',
      matchedEntries: [],
      unsupportedWords,
    };
  }

  return {
    supported: true,
    exactMatch: unsupportedWords.length === 0,
    gondiText: matchedEntries.map((m) => m.gondi).join(' '),
    gondiScript: matchedEntries.map((m) => m.gondiScript).join(' '),
    matchedEntries,
    unsupportedWords,
  };
}
