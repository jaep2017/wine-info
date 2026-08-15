import { AIUnavailableError, ENRICH_MODEL, parseStructuredOutput } from "@/lib/ai/client";
import { ENRICH_SYSTEM } from "@/lib/ai/prompts";
import { wineIdentificationSchema, type WineIdentificationParsed } from "@/lib/ai/schemas";
import type { WineIdentification } from "@/lib/types";

export type EnrichWineInput = {
  producer: string;
  wine: string;
  vintage?: string | number | null;
  extraContext?: string;
};

function fallbackIdentification(input: EnrichWineInput): WineIdentification {
  const vintage =
    typeof input.vintage === "number"
      ? input.vintage
      : input.vintage
        ? Number.parseInt(String(input.vintage), 10) || null
        : null;

  return {
    producer: input.producer.trim(),
    canonicalWineName: input.wine.trim(),
    vintage,
    country: "",
    region: "",
    subregion: "",
    appellation: "",
    vineyard: "",
    classification: "",
    grapes: [],
    wineType: "",
    confidence: 0.2,
    ambiguities: [
      "Automatic identification was unavailable. Confirm or complete the fields manually before saving.",
    ],
    shortIdentificationExplanation:
      "The wine was recorded from your entry only. Review producer, cuvée, and place names before confirming.",
  };
}

export async function enrichWine(
  input: EnrichWineInput,
): Promise<{ identification: WineIdentification; usedAI: boolean }> {
  try {
    const identification = await parseStructuredOutput<WineIdentificationParsed>(
      wineIdentificationSchema,
      "wine_identification",
      [
        { role: "system", content: ENRICH_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            producer: input.producer,
            wine: input.wine,
            vintage: input.vintage ?? null,
            extraContext: input.extraContext ?? null,
          }),
        },
      ],
      ENRICH_MODEL,
    );

    return { identification, usedAI: true };
  } catch (error) {
    if (!(error instanceof AIUnavailableError)) {
      console.error("Wine enrichment failed, falling back to manual entry.", error);
    }
    return { identification: fallbackIdentification(input), usedAI: false };
  }
}
