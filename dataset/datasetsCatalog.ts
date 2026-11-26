export interface DatasetCatalogEntry {
  id: string;
  name: string;
  role: string;
  sizeLabel: string;
  sourcePlatform: string;
  benchmarkStatus: string;
}

export const TRANSLATION_DATASETS: DatasetCatalogEntry[] = [
  {
    id: 'samanantar-en-te',
    name: 'Samanantar (en-te split)',
    role: 'English–Telugu Training Corpus',
    sizeLabel: '4,946,035 sentence pairs (~4.95M)',
    sourcePlatform: 'Hugging Face (ai4bharat/samanantar) · AI4Bharat, IIT Madras',
    benchmarkStatus:
      'Yes — Standard large-scale Indic MT training corpus (used to train IndicTrans / IndicTrans2).',
  },
  {
    id: 'flores-200-en-te',
    name: 'FLORES-200 (eng_Latn–tel_Telu)',
    role: 'English–Telugu Evaluation Benchmark',
    sizeLabel: '2,009 sentences (997 dev + 1,012 devtest)',
    sourcePlatform: 'Hugging Face (facebook/flores) · Meta AI',
    benchmarkStatus:
      'Yes — Universally recognized multilingual MT benchmark for BLEU and chrF++ evaluation.',
  },
  {
    id: 'in22-gen-en-te',
    name: 'IN22-Gen (en-te)',
    role: 'English–Telugu Evaluation Benchmark',
    sizeLabel: '1,024 human-translated sentences',
    sourcePlatform: 'Hugging Face (ai4bharat/IN22-Gen) · AI4Bharat',
    benchmarkStatus:
      'Yes — Official India-centric benchmark suite for evaluating IndicTrans2 models.',
  },
  {
    id: 'adilabad-gondi-dict',
    name: 'Adilabad Gondi (Koyang) Dictionary',
    role: 'English–Gondi Lexical Grounding Seed',
    sizeLabel: '~3,000–10,000+ dictionary entries (100 core words embedded)',
    sourcePlatform: 'SIL International / Webonary & ITDA Utnoor',
    benchmarkStatus:
      'No — Authoritative bilingual dictionary used to ground Gondi translations (up to 100 words/query).',
  },
  {
    id: 'ellora-cgnet-gondi',
    name: 'Project ELLORA / CGNet Swara & Karya Gondi Corpus',
    role: 'Documented Gondi Parallel Corpus Reference',
    sizeLabel: '~60,000 Hindi–Gondi parallel sentences',
    sourcePlatform: 'Microsoft Research India, CGNet Swara & IIIT Naya Raipur',
    benchmarkStatus:
      'No open English–Gondi MT benchmark exists yet — motivating community parallel corpus creation.',
  },
];
