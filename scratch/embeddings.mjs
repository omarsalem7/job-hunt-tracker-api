import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  process.loadEnvFile('.env');
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing in environment and .env');
}

const sentences = [
  // 3 sentences about interviews
  {
    label: 'interview-1',
    text: 'The candidate practiced answering behavioral questions before meeting the hiring manager.',
  },
  {
    label: 'interview-2',
    text: 'We asked the applicant to sketch a system design diagram on the whiteboard.',
  },
  {
    label: 'interview-3',
    text: 'Recruiters evaluate how clearly engineers explain past project trade-offs during technical screens.',
  },

  // 3 sentences about cooking
  {
    label: 'cooking-1',
    text: 'Simmer the garlic and onions in olive oil until they turn golden and fragrant.',
  },
  {
    label: 'cooking-2',
    text: 'Preheat the oven to 200 degrees before sliding the seasoned chicken tray inside.',
  },
  {
    label: 'cooking-3',
    text: 'Whisk the egg yolks slowly into the warm sauce so the mixture thickens without scrambling.',
  },

  // 2 sentences with the same meaning, written in completely different words
  {
    label: 'same-1',
    text: 'Leaving my umbrella at the office left my coat completely soaked in the afternoon downpour.',
  },
  {
    label: 'same-2',
    text: 'Stepping out into the heavy storm without any rain gear got me drenched from head to toe.',
  },
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: sentences.map((s) => s.text),
  config: {
    outputDimensionality: 768,
  },
});

const embeddings = response.embeddings ?? [];
if (embeddings.length !== sentences.length) {
  throw new Error(
    `Expected ${sentences.length} embeddings, got ${embeddings.length}`,
  );
}

const embedded = sentences.map((sentence, index) => {
  const vector = embeddings[index]?.values;
  if (!vector) {
    throw new Error(`Missing embedding values for "${sentence.label}"`);
  }
  return { ...sentence, vector };
});

const first = embedded[0];
console.log(`First (${first.label}) vector.length:`, first.vector.length);
console.log(
  'First 5 numbers:',
  first.vector.slice(0, 5).map((n) => Number(n.toFixed(6))),
);

if (first.vector.length !== 768) {
  throw new Error(`Expected 768 dimensions, got ${first.vector.length}`);
}

console.table(
  embedded.map(({ label, vector }) => ({
    label,
    dimensions: vector.length,
  })),
);
