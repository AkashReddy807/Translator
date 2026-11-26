import React from 'react';

interface DatasetViewProps {
  savedCount: number;
}

const DATASET_ROWS = [
  {
    name: 'Samanantar (en-te split)',
    role: 'English–Telugu Training Corpus',
    size: '4,946,035 sentence pairs (~4.95M)',
    source: 'Hugging Face (ai4bharat/samanantar) · AI4Bharat, IIT Madras',
    benchmark:
      'Yes — Standard large-scale Indic MT training corpus (used to train IndicTrans / IndicTrans2).',
  },
  {
    name: 'FLORES-200 (eng_Latn–tel_Telu)',
    role: 'English–Telugu Evaluation Benchmark',
    size: '2,009 sentences (997 dev + 1,012 devtest)',
    source: 'Hugging Face (facebook/flores) · Meta AI',
    benchmark:
      'Yes — Universally recognized multilingual MT benchmark for BLEU and chrF++ evaluation.',
  },
  {
    name: 'IN22-Gen (en-te)',
    role: 'English–Telugu Evaluation Benchmark',
    size: '1,024 human-translated sentences',
    source: 'Hugging Face (ai4bharat/IN22-Gen) · AI4Bharat',
    benchmark:
      'Yes — Official India-centric benchmark suite for evaluating IndicTrans2 models.',
  },
  {
    name: 'Adilabad Gondi (Koyang) Dictionary',
    role: 'Best Open English–Gondi Lexical Source (Grounding Seed)',
    size: '~3,000–10,000+ dictionary entries (100 core words embedded for lexical grounding)',
    source: 'SIL International / Webonary & ITDA Utnoor (Gondi–English–Hindi–Telugu Dictionary)',
    benchmark:
      'No — Authoritative bilingual dictionary used to ground Phase 1 Gondi translations (up to 100 words/query).',
  },
  {
    name: 'Project ELLORA / CGNet Swara & Karya Gondi Corpus',
    role: 'Largest Documented Gondi Parallel Corpus (Reference)',
    size: '~60,000 Hindi–Gondi parallel sentences',
    source: 'Microsoft Research India, CGNet Swara & IIIT Naya Raipur (consortium / research access)',
    benchmark:
      'No open English–Gondi benchmark exists on Hugging Face yet — motivating Phase 2 community parallel corpus creation.',
  },
];

export const DatasetView: React.FC<DatasetViewProps> = ({ savedCount }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dataset &amp; Architecture Reference
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Documentation of the Phase 1 English–Telugu and English–Gondi (up to 100 words) datasets,
          sizes, source platforms, and benchmark status.
        </p>
      </div>

      {/* Live Phase 1 Architecture Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Current Phase 1 Proof-of-Concept Stack
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">English → Telugu Engine</p>
            <p className="font-medium text-slate-900">Gemini API (gemini-3.1-flash-lite)</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Runs real-time English → Telugu translation on the Express backend with Telugu speech
              synthesis via <span className="font-mono">gemini-3.8-flash-lite-tts</span>.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">English → Gondi Engine</p>
            <p className="font-medium text-slate-900">
              Up to <span className="font-mono tabular-nums">100</span> Words · Lexically Grounded
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Translates up to 100 English words per query into Adilabad Gondi (Koyang), grounded
              with curated Adilabad Gondi dictionary entries plus Telugu-script pronunciation.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">Cloud Database Integration</p>
            <p className="font-medium text-slate-900">
              Firebase Firestore (
              <span className="font-mono tabular-nums">{savedCount}</span> saved records)
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Persists authenticated user profiles and saved English → Telugu and English → Gondi
              translation history in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-1">
          <h2 className="text-base font-semibold text-slate-900">
            Datasets &amp; Benchmark Reference
          </h2>
          <p className="text-xs text-slate-600">
            Standard English–Telugu benchmark datasets alongside the best available Gondi lexical
            and parallel corpus resources.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-3 px-5">Dataset</th>
                <th className="py-3 px-5">Size</th>
                <th className="py-3 px-5">Source Platform</th>
                <th className="py-3 px-5">Benchmark Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {DATASET_ROWS.map((ds) => (
                <tr key={ds.name} className="align-top">
                  <td className="py-4 px-5">
                    <p className="font-medium text-slate-900">{ds.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ds.role}</p>
                  </td>
                  <td className="py-4 px-5 font-mono text-xs tabular-nums text-slate-800 whitespace-nowrap">
                    {ds.size}
                  </td>
                  <td className="py-4 px-5 text-xs text-slate-700 leading-relaxed">{ds.source}</td>
                  <td className="py-4 px-5 text-xs text-slate-700 leading-relaxed">
                    {ds.benchmark}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
