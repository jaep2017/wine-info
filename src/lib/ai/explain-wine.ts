import { AIUnavailableError, parseStructuredOutput } from "@/lib/ai/client";
import { WINE_EXPLANATION_SYSTEM } from "@/lib/ai/prompts";
import {
  wineExplanationSchema,
  type WineExplanationParsed,
} from "@/lib/ai/schemas";

export type ExplainWineInput = {
  wine: string;
  structuredFacts: string;
  userExperience: string;
  relatedWines: string;
};

export async function explainWine(
  input: ExplainWineInput,
): Promise<WineExplanationParsed> {
  try {
    return await parseStructuredOutput<WineExplanationParsed>(
      wineExplanationSchema,
      "wine_explanation",
      [
        { role: "system", content: WINE_EXPLANATION_SYSTEM },
        {
          role: "user",
          content: `Wine:
${input.wine}

Structured facts:
${input.structuredFacts}

User experience:
${input.userExperience}

Related wines:
${input.relatedWines}`,
        },
      ],
    );
  } catch (error) {
    if (!(error instanceof AIUnavailableError)) {
      console.error("Wine explanation failed.", error);
    }

    return {
      whyItMatters: `${input.wine} is worth understanding as a specific point in a larger regional and producer argument, not as an isolated tasting object.`,
      thePlace:
        "Confirm the appellation hierarchy, neighboring sites, and what the name legally does and does not guarantee.",
      theProducer:
        "Read the estate through decisions — vineyard holdings, élevage, and how it sits in the local producer landscape — rather than reputation alone.",
      theVineyard:
        input.structuredFacts.includes("vineyard")
          ? "Treat the site as a historical and administrative unit first. Any sensory expectation should be framed as professional interpretation, not geological destiny."
          : "No specific vineyard was identified. The educational value is in the appellation and producer until a site is confirmed.",
      theVintage:
        "Vintage comments should stay tied to growing-season structure — timing of ripening, disease pressure, yields — and how that producer typically responds.",
      whatThisBottleTeachesYou: input.userExperience,
    };
  }
}
