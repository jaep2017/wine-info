import { z } from "zod";

export const identifiedGrapeSchema = z.object({
  name: z.string(),
  percentage: z.number().nullable(),
});

export const wineIdentificationSchema = z.object({
  producer: z.string(),
  canonicalWineName: z.string(),
  vintage: z.number().int().nullable(),
  country: z.string(),
  region: z.string(),
  subregion: z.string(),
  appellation: z.string(),
  vineyard: z.string(),
  classification: z.string(),
  grapes: z.array(identifiedGrapeSchema),
  wineType: z.string(),
  confidence: z.number(),
  ambiguities: z.array(z.string()),
  shortIdentificationExplanation: z.string(),
});

export const noteUpdateSchema = z.object({
  title: z.string(),
  summary: z.string(),
  contentMarkdown: z.string(),
  changeSummary: z.string(),
  depth: z.number().int(),
});

export const generatedRecommendationSchema = z.object({
  type: z.enum(["continue", "compare", "deepen", "new_branch"]),
  title: z.string(),
  wineQuery: z.string(),
  learningGoal: z.string(),
  explanation: z.string(),
  compareAgainst: z.string(),
});

export const recommendationSetSchema = z.object({
  recommendations: z.array(generatedRecommendationSchema).min(1).max(4),
});

export const wineExplanationSchema = z.object({
  whyItMatters: z.string(),
  thePlace: z.string(),
  theProducer: z.string(),
  theVineyard: z.string(),
  theVintage: z.string(),
  whatThisBottleTeachesYou: z.string(),
});

export const wineComparisonSchema = z.object({
  wineId: z.string(),
  title: z.string(),
  comparison: z.string(),
});

export const wineComparisonsSchema = z.object({
  comparisons: z.array(wineComparisonSchema).max(3),
});

export const askResponseSchema = z.object({
  answerMarkdown: z.string(),
});

export type WineIdentificationParsed = z.infer<typeof wineIdentificationSchema>;
export type NoteUpdateParsed = z.infer<typeof noteUpdateSchema>;
export type RecommendationSetParsed = z.infer<typeof recommendationSetSchema>;
export type WineExplanationParsed = z.infer<typeof wineExplanationSchema>;
export type WineComparisonsParsed = z.infer<typeof wineComparisonsSchema>;
