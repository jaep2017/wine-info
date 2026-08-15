import { AIUnavailableError, parseStructuredOutput } from "@/lib/ai/client";
import { COMPARE_SYSTEM } from "@/lib/ai/prompts";
import {
  wineComparisonsSchema,
  type WineComparisonsParsed,
} from "@/lib/ai/schemas";
import type { WineComparison } from "@/lib/types";

export type CompareInput = {
  newWine: string;
  candidates: Array<{ wineId: string; label: string; context: string }>;
};

export async function compareWithPriorWines(
  input: CompareInput,
): Promise<WineComparison[]> {
  if (input.candidates.length === 0) {
    return [];
  }

  try {
    const parsed: WineComparisonsParsed = await parseStructuredOutput(
      wineComparisonsSchema,
      "wine_comparisons",
      [
        { role: "system", content: COMPARE_SYSTEM },
        {
          role: "user",
          content: `New wine:
${input.newWine}

Prior wines (use the provided wineId values):
${input.candidates
  .map((wine) => `- ${wine.wineId}: ${wine.label}\n  ${wine.context}`)
  .join("\n")}

Choose 1–3 of the most educational comparisons. Do not invent wine IDs.`,
        },
      ],
    );

    const allowed = new Set(input.candidates.map((wine) => wine.wineId));
    return parsed.comparisons.filter((item) => allowed.has(item.wineId));
  } catch (error) {
    if (!(error instanceof AIUnavailableError)) {
      console.error("Comparison generation failed.", error);
    }

    return input.candidates.slice(0, 3).map((wine) => ({
      wineId: wine.wineId,
      title: wine.label,
      comparison: `Compare site, producer decisions, and vintage conditions against ${wine.label}. The contrast is useful because it holds some variables relatively still while changing others.`,
    }));
  }
}
