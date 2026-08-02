export interface AIDetectionResult {
  aiProbability: number;
  risk: "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH";
  penalty: number;
  lexicalScore: number;
  burstinessScore: number;
  repetitionScore: number;
  stylometryScore: number;
  vocabularyScore: number;
  sentenceVariationScore: number;
  transitionScore: number;
  punctuationScore: number;
}

const TRANSITION_WORDS = new Set([
  "however", "therefore", "moreover", "furthermore",
  "thus", "hence", "consequently", "additionally",
  "overall", "finally", "firstly", "secondly",
  "thirdly", "in conclusion"
]);

export function detectAIContent(text: string): AIDetectionResult {
  const cleanText = (text || "").trim();
  if (!cleanText) {
    return {
      aiProbability: 0,
      risk: "LOW",
      penalty: 0,
      lexicalScore: 0,
      burstinessScore: 0,
      repetitionScore: 0,
      stylometryScore: 0,
      vocabularyScore: 0,
      sentenceVariationScore: 0,
      transitionScore: 0,
      punctuationScore: 0,
    };
  }

  // Find all alphabetic words
  const words = cleanText.toLowerCase().match(/\b[a-z]+\b/g) || [];
  if (words.length === 0) {
    return {
      aiProbability: 0,
      risk: "LOW",
      penalty: 0,
      lexicalScore: 0,
      burstinessScore: 0,
      repetitionScore: 0,
      stylometryScore: 0,
      vocabularyScore: 0,
      sentenceVariationScore: 0,
      transitionScore: 0,
      punctuationScore: 0,
    };
  }

  // 1. Sentences
  const sentences = cleanText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const sentenceLengths = sentences.map(s => {
    const sWords = s.toLowerCase().match(/\b[a-z]+\b/g) || [];
    return sWords.length;
  });

  // 2. Lexical Diversity
  const distinctWords = new Set(words);
  const lexicalDiversity = distinctWords.size / words.length;
  const lexicalScore = lexicalDiversity * 100;

  // 3. Vocabulary Richness (percentage of words >= 7 letters)
  const longWords = words.filter(w => w.length >= 7);
  const vocabularyScore = (longWords.length / words.length) * 100;

  // 4. Repetition Score
  const counts: Record<string, number> = {};
  for (const w of words) {
    counts[w] = (counts[w] || 0) + 1;
  }

  let repeated = 0;
  for (const count of Object.values(counts)) {
    if (count > 1) {
      repeated += (count - 1);
    }
  }
  const repetitionScore = Math.max(0, 100 - repeated * 2);

  // 5. Stylometry Score
  const totalWordChars = words.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength = totalWordChars / words.length;
  const stylometryScore = Math.min(avgWordLength * 15, 100);

  // 6. Burstiness and Sentence Length Variation
  let burstinessScore = 50;
  let sentenceVariationScore = 50;

  if (sentenceLengths.length > 1) {
    const totalSentenceLengths = sentenceLengths.reduce((sum, len) => sum + len, 0);
    const mean = totalSentenceLengths / sentenceLengths.length;

    if (mean > 0) {
      const varianceSum = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0);
      const variance = varianceSum / sentenceLengths.length;
      const std = Math.sqrt(variance);
      const cv = std / mean;
      sentenceVariationScore = Math.min(cv * 100, 100);
      burstinessScore = sentenceVariationScore;
    }
  }

  // 7. Transition Words Usage
  const transitionCount = words.filter(w => TRANSITION_WORDS.has(w)).length;
  const transitionRatio = (transitionCount / words.length) * 100;
  const transitionScore = Math.max(0, 100 - transitionRatio * 10);

  // 8. Punctuation Diversity
  const punctuationMatches = cleanText.match(/[,:;!?()]/g) || [];
  const uniquePunctuation = new Set(punctuationMatches).size;
  const punctuationScore = Math.min(uniquePunctuation * 20, 100);

  // Calculate Weighted AI Probability
  let aiProbability = (
    (100 - lexicalScore) * 0.20 +
    (100 - vocabularyScore) * 0.10 +
    (100 - burstinessScore) * 0.15 +
    (100 - repetitionScore) * 0.15 +
    (100 - stylometryScore) * 0.10 +
    (100 - sentenceVariationScore) * 0.10 +
    (100 - transitionScore) * 0.10 +
    (100 - punctuationScore) * 0.10
  );

  aiProbability = Math.max(0, Math.min(aiProbability, 100));
  aiProbability = Math.round(aiProbability * 100) / 100; // round to 2 decimal places

  // Establish Risk Level & Grading Penalty
  let risk: "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH" = "LOW";
  let penalty = 0;

  if (aiProbability < 30) {
    risk = "LOW";
    penalty = 0;
  } else if (aiProbability < 55) {
    risk = "MEDIUM";
    penalty = 0.5;
  } else if (aiProbability < 75) {
    risk = "HIGH";
    penalty = 1;
  } else {
    risk = "VERY HIGH";
    penalty = 2;
  }

  return {
    aiProbability,
    risk,
    penalty,
    lexicalScore: Math.round(lexicalScore * 100) / 100,
    burstinessScore: Math.round(burstinessScore * 100) / 100,
    repetitionScore: Math.round(repetitionScore * 100) / 100,
    stylometryScore: Math.round(stylometryScore * 100) / 100,
    vocabularyScore: Math.round(vocabularyScore * 100) / 100,
    sentenceVariationScore: Math.round(sentenceVariationScore * 100) / 100,
    transitionScore: Math.round(transitionScore * 100) / 100,
    punctuationScore: Math.round(punctuationScore * 100) / 100,
  };
}
