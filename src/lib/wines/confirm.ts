import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findOrCreateWine,
  replaceWineGrapes,
  upsertGrape,
  upsertProducer,
  upsertRegionHierarchy,
} from "@/lib/db/upsert-wine";
import { processNewConsumption } from "@/lib/learning/process-consumption";
import type { WineIdentification } from "@/lib/types";

export type ConfirmWineInput = {
  identification: WineIdentification;
  personalNotes?: string | null;
  consumedAt?: string | null;
  location?: string | null;
  rating?: number | null;
  pricePaid?: number | null;
  labelImagePath?: string | null;
  rawInput?: {
    producer: string;
    wine: string;
    vintage: string | number | null;
  };
};

export async function confirmAndLearn(
  supabase: SupabaseClient,
  userId: string,
  input: ConfirmWineInput,
): Promise<{ wineId: string; consumptionId: string }> {
  const identification = input.identification;
  const regions = await upsertRegionHierarchy(supabase, identification);
  const mostSpecific = [...regions].reverse()[0] ?? null;
  const appellationOrRegion =
    [...regions].reverse().find((region) => region.type !== "vineyard" && region.type !== "climat") ??
    mostSpecific;

  const producer = await upsertProducer(
    supabase,
    identification.producer || input.rawInput?.producer || "Unknown producer",
    identification.country || null,
    appellationOrRegion?.id ?? null,
  );

  const grapes = [];
  for (const grape of identification.grapes) {
    if (!grape.name.trim()) continue;
    const saved = await upsertGrape(supabase, grape.name.trim());
    grapes.push({ grapeId: saved.id, percentage: grape.percentage });
  }

  const { wine } = await findOrCreateWine(supabase, {
    producer,
    identification,
    regionId: mostSpecific?.id ?? appellationOrRegion?.id ?? null,
    enrichmentJson: {
      identification,
      rawInput: input.rawInput,
    },
  });

  await replaceWineGrapes(supabase, wine.id, grapes);

  const { data: consumption, error } = await supabase
    .from("consumptions")
    .insert({
      user_id: userId,
      wine_id: wine.id,
      consumed_at: input.consumedAt || new Date().toISOString(),
      personal_notes: input.personalNotes || null,
      rating: input.rating ?? null,
      price_paid: input.pricePaid ?? null,
      location: input.location || null,
      label_image_path: input.labelImagePath || null,
    })
    .select("id")
    .single();

  if (error) throw error;

  try {
    await processNewConsumption(supabase, consumption.id as string);
  } catch (pipelineError) {
    console.error("Learning pipeline failed after consumption was saved.", pipelineError);
  }

  return {
    wineId: wine.id,
    consumptionId: consumption.id as string,
  };
}
