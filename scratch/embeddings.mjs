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

console.log(`Total sentences: ${sentences.length}`);
console.table(sentences);
