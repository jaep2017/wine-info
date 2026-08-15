import { AIUnavailableError, parseStructuredOutput } from "@/lib/ai/client";
import { RECOMMEND_SYSTEM } from "@/lib/ai/prompts";
import {
  recommendationSetSchema,
  type RecommendationSetParsed,
} from "@/lib/ai/schemas";
import type { GeneratedRecommendation } from "@/lib/types";

export type RecommendInput = {
  newWine: string;
  userExperience: string;
  relatedWines: string;
  gaps: string;
};

function fallbackRecommendations(input: RecommendInput): GeneratedRecommendation[] {
  return [
    {
      type: "continue",
      title: "A neighboring site or classification in the same appellation",
      wineQuery: `A different vineyard or classification near ${input.newWine}`,
      learningGoal:
        "Hold grape and region relatively constant while changing site or rank.",
      explanation:
        "The highest-value next bottle is usually a controlled contrast inside the same appellation. It teaches how site, producer, or classification changes the wine without abandoning the thread you just opened.",
      compareAgainst: input.newWine,
    },
    {
      type: "compare",
      title: "Same grape, different geology or climate",
      wineQuery: "The same grape from a contrasting but related region",
      learningGoal:
        "Separate variety character from place by changing one major variable.",
      explanation:
        "A comparison bottle should change one important variable — region, producer, or vintage — so the contrast is readable. Use it against the wine you just drank rather than as an isolated new experience.",
      compareAgainst: input.newWine,
    },
    {
      type: "new_branch",
      title: "An unexplored structure or grape family",
      wineQuery: "A serious wine from a region or grape you have not yet logged",
      learningGoal: "Open a new learning thread instead of deepening the current one.",
      explanation:
        "A new branch is useful when the current thread is already established enough that another similar bottle would mostly repeat. Choose a region whose structure will later compare productively with what you already know.",
      compareAgainst: input.gaps || "your least-developed region or grape",
    },
  ];
}

export async function generateRecommendations(
  input: RecommendInput,
): Promise<GeneratedRecommendation[]> {
  try {
    const parsed: RecommendationSetParsed = await parseStructuredOutput(
      recommendationSetSchema,
      "recommendation_set",
      [
        { role: "system", content: RECOMMEND_SYSTEM },
        {
          role: "user",
          content: `Newly consumed wine:
${input.newWine}

User experience:
${input.userExperience}

Related wines already consumed:
${input.relatedWines}

Current gaps:
${input.gaps}

Return exactly three recommendations: one continue, one compare, and one new_branch.`,
        },
      ],
    );

    const byType = new Map(parsed.recommendations.map((item) => [item.type, item]));
    const ordered: GeneratedRecommendation[] = [];
    for (const type of ["continue", "compare", "new_branch"] as const) {
      const match = byType.get(type);
      if (match) {
        ordered.push(match);
      }
    }

    return ordered.length === 3 ? ordered : fallbackRecommendations(input);
  } catch (error) {
    if (!(error instanceof AIUnavailableError)) {
      console.error("Recommendation generation failed.", error);
    }
    return fallbackRecommendations(input);
  }
}
