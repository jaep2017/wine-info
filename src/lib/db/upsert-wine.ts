import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Grape,
  Producer,
  Region,
  RegionType,
  Wine,
  WineIdentification,
} from "@/lib/types";

type HierarchyStep = {
  name: string;
  type: RegionType;
};

function stepsFromIdentification(identification: WineIdentification): HierarchyStep[] {
  const steps: HierarchyStep[] = [];
  if (identification.country) {
    steps.push({ name: identification.country, type: "country" });
  }
  if (identification.region && identification.region !== identification.country) {
    steps.push({ name: identification.region, type: "region" });
  }
  if (
    identification.subregion &&
    identification.subregion !== identification.region
  ) {
    steps.push({ name: identification.subregion, type: "subregion" });
  }
  if (
    identification.appellation &&
    identification.appellation !== identification.subregion &&
    identification.appellation !== identification.region
  ) {
    steps.push({ name: identification.appellation, type: "appellation" });
  }
  if (
    identification.vineyard &&
    identification.vineyard !== identification.appellation
  ) {
    steps.push({ name: identification.vineyard, type: "vineyard" });
  }
  return steps;
}

export async function upsertRegionHierarchy(
  supabase: SupabaseClient,
  identification: WineIdentification,
): Promise<Region[]> {
  const steps = stepsFromIdentification(identification);
  const created: Region[] = [];
  let parentId: string | null = null;
  const country = identification.country || steps[0]?.name || "Unknown";

  for (const step of steps) {
    let query = supabase
      .from("regions")
      .select("*")
      .ilike("name", step.name)
      .eq("type", step.type)
      .eq("country", country);

    query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

    const { data: existing, error: lookupError } = await query.maybeSingle();
    if (lookupError && lookupError.code !== "PGRST116") {
      throw lookupError;
    }

    if (existing) {
      const region = existing as Region;
      created.push(region);
      parentId = region.id;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("regions")
      .insert({
        name: step.name,
        type: step.type,
        parent_id: parentId,
        country,
      })
      .select("*")
      .single();

    if (error) throw error;
    const region = inserted as Region;
    created.push(region);
    parentId = region.id;
  }

  return created;
}

export async function upsertProducer(
  supabase: SupabaseClient,
  name: string,
  country: string | null,
  regionId: string | null,
): Promise<Producer> {
  const { data: existing, error: lookupError } = await supabase
    .from("producers")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (lookupError && lookupError.code !== "PGRST116") {
    throw lookupError;
  }

  if (existing) {
    const producer = existing as Producer;
    if ((!producer.region_id && regionId) || (!producer.country && country)) {
      const { data: updated, error } = await supabase
        .from("producers")
        .update({
          region_id: producer.region_id ?? regionId,
          country: producer.country ?? country,
        })
        .eq("id", producer.id)
        .select("*")
        .single();
      if (error) throw error;
      return updated as Producer;
    }
    return producer;
  }

  const { data, error } = await supabase
    .from("producers")
    .insert({
      name,
      country,
      region_id: regionId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Producer;
}

export async function upsertGrape(
  supabase: SupabaseClient,
  name: string,
): Promise<Grape> {
  const { data: existing, error: lookupError } = await supabase
    .from("grapes")
    .select("*")
    .or(`name.ilike.${name},aliases.cs.{${name}}`)
    .maybeSingle();

  if (!lookupError && existing) {
    return existing as Grape;
  }

  const { data: byName } = await supabase
    .from("grapes")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (byName) {
    return byName as Grape;
  }

  const { data, error } = await supabase
    .from("grapes")
    .insert({ name, aliases: [] })
    .select("*")
    .single();

  if (error) {
    const { data: retry } = await supabase
      .from("grapes")
      .select("*")
      .ilike("name", name)
      .maybeSingle();
    if (retry) return retry as Grape;
    throw error;
  }

  return data as Grape;
}

export async function findOrCreateWine(
  supabase: SupabaseClient,
  input: {
    producer: Producer;
    identification: WineIdentification;
    regionId: string | null;
    enrichmentJson: Wine["enrichment_json"];
  },
): Promise<{ wine: Wine; created: boolean }> {
  const canonical = input.identification.canonicalWineName.trim();
  const vintage = input.identification.vintage;

  let query = supabase
    .from("wines")
    .select("*")
    .eq("producer_id", input.producer.id)
    .ilike("canonical_name", canonical);

  query = vintage == null ? query.is("vintage", null) : query.eq("vintage", vintage);

  const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError && lookupError.code !== "PGRST116") {
    throw lookupError;
  }

  if (existing) {
    const { data: updated, error } = await supabase
      .from("wines")
      .update({
        region_id: existing.region_id ?? input.regionId,
        appellation: existing.appellation || input.identification.appellation || null,
        vineyard: existing.vineyard || input.identification.vineyard || null,
        classification:
          existing.classification || input.identification.classification || null,
        country: existing.country || input.identification.country || null,
        wine_type: existing.wine_type || input.identification.wineType || null,
        enrichment_json: input.enrichmentJson ?? existing.enrichment_json,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return { wine: updated as Wine, created: false };
  }

  const { data, error } = await supabase
    .from("wines")
    .insert({
      producer_id: input.producer.id,
      name: input.identification.canonicalWineName,
      vintage: input.identification.vintage,
      region_id: input.regionId,
      appellation: input.identification.appellation || null,
      vineyard: input.identification.vineyard || null,
      classification: input.identification.classification || null,
      country: input.identification.country || null,
      wine_type: input.identification.wineType || null,
      canonical_name: canonical,
      enrichment_json: input.enrichmentJson,
    })
    .select("*")
    .single();

  if (error) throw error;
  return { wine: data as Wine, created: true };
}

export async function replaceWineGrapes(
  supabase: SupabaseClient,
  wineId: string,
  grapes: Array<{ grapeId: string; percentage: number | null }>,
) {
  const { error: deleteError } = await supabase
    .from("wine_grapes")
    .delete()
    .eq("wine_id", wineId);
  if (deleteError) throw deleteError;

  if (grapes.length === 0) return;

  const { error } = await supabase.from("wine_grapes").insert(
    grapes.map((grape) => ({
      wine_id: wineId,
      grape_id: grape.grapeId,
      percentage: grape.percentage,
    })),
  );
  if (error) throw error;
}

export async function upsertRelationship(
  supabase: SupabaseClient,
  input: {
    sourceType: string;
    sourceId: string;
    relationship: string;
    targetType: string;
    targetId: string;
  },
) {
  const { error } = await supabase.from("entity_relationships").upsert(
    {
      source_type: input.sourceType,
      source_id: input.sourceId,
      relationship: input.relationship,
      target_type: input.targetType,
      target_id: input.targetId,
      metadata: {},
    },
    {
      onConflict: "source_type,source_id,relationship,target_type,target_id",
      ignoreDuplicates: true,
    },
  );
  if (error && error.code !== "23505") {
    throw error;
  }
}
