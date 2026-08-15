import type { SupabaseClient } from "@supabase/supabase-js";
import { compareWithPriorWines } from "@/lib/ai/compare";
import { explainWine } from "@/lib/ai/explain-wine";
import { generateRecommendations } from "@/lib/ai/recommend";
import { updatePersistentNote } from "@/lib/ai/update-note";
import {
  fetchConsumptionsForUser,
  fetchNote,
  fetchRegionAncestors,
  fetchWineById,
} from "@/lib/db/queries";
import { upsertRelationship } from "@/lib/db/upsert-wine";
import { formatWineLabel } from "@/lib/format";
import {
  analyzeExposure,
  describeGaps,
  summarizeEntityExperience,
} from "@/lib/learning/exposure";
import { selectNoteEntities } from "@/lib/learning/note-entities";
import type { Consumption, Note, WineWithRelations } from "@/lib/types";

export async function processNewConsumption(
  supabase: SupabaseClient,
  consumptionId: string,
): Promise<{ noteIds: string[]; recommendationIds: string[] }> {
  const { data: consumption, error: consumptionError } = await supabase
    .from("consumptions")
    .select("*")
    .eq("id", consumptionId)
    .single();

  if (consumptionError) throw consumptionError;
  const record = consumption as Consumption;

  const wine = await fetchWineById(supabase, record.wine_id);
  if (!wine) {
    throw new Error("Canonical wine could not be loaded for this consumption.");
  }

  const regions = await fetchRegionAncestors(supabase, wine.region_id);
  const history = await fetchConsumptionsForUser(supabase, record.user_id, 200);
  const regionIndex = new Map(regions.map((region) => [region.id, region]));
  const exposure = analyzeExposure(history, regionIndex);

  const parent = regions.find((region) => region.type === "region" || region.type === "subregion");
  const relatedWineCountInParent = parent
    ? history.filter((item) => {
        return item.wine.region_id === parent.id || item.wine.country === parent.country;
      }).length
    : 0;

  const targets = selectNoteEntities({
    wine,
    regions,
    relatedWineCountInParent,
  });

  await writeRelationships(supabase, wine, regions);

  const newWineLabel = formatWineLabel({
    name: wine.name,
    vintage: wine.vintage,
    producer: wine.producer,
  });
  const relatedWines = history
    .filter((item) => item.id !== record.id)
    .slice(0, 20)
    .map((item) => formatWineLabel(item.wine))
    .join("\n");

  const userExperience = summarizeEntityExperience(exposure, {
    regionName: wine.region?.name ?? wine.appellation,
    grapeName: wine.grapes[0]?.name,
    producerName: wine.producer?.name,
  });

  const explanation = await explainWine({
    wine: newWineLabel,
    structuredFacts: JSON.stringify({
      country: wine.country,
      region: wine.region?.name,
      appellation: wine.appellation,
      vineyard: wine.vineyard,
      classification: wine.classification,
      grapes: wine.grapes.map((grape) => grape.name),
      producer: wine.producer?.name,
      vintage: wine.vintage,
    }),
    userExperience,
    relatedWines,
  });

  const comparisonCandidates = pickComparisonCandidates(wine, history, record.id);
  const comparisons = await compareWithPriorWines({
    newWine: newWineLabel,
    candidates: comparisonCandidates,
  });

  await supabase
    .from("consumptions")
    .update({
      learning_insight: explanation.whatThisBottleTeachesYou,
      comparisons_json: comparisons,
    })
    .eq("id", record.id);

  await supabase
    .from("wines")
    .update({
      enrichment_json: {
        ...(wine.enrichment_json ?? {}),
        explanation: {
          whyItMatters: explanation.whyItMatters,
          thePlace: explanation.thePlace,
          theProducer: explanation.theProducer,
          theVineyard: explanation.theVineyard,
          theVintage: explanation.theVintage,
        },
      },
    })
    .eq("id", wine.id);

  const noteIds: string[] = [];

  for (const target of targets) {
    const existing = await fetchNote(
      supabase,
      record.user_id,
      target.entityType,
      target.entityId,
    );

    const relatedForEntity = history
      .filter((item) => relatesToTarget(item.wine, target.entityType, target.entityId, target.title))
      .map((item) => formatWineLabel(item.wine))
      .join("\n");

    const update = await updatePersistentNote({
      entityType: target.entityType,
      entityName: target.title,
      entityContext: target.context,
      existingNote: existing?.content_markdown ?? null,
      newWine: newWineLabel,
      relatedWines: relatedForEntity || relatedWines,
      userExperience: summarizeEntityExperience(exposure, {
        regionName: target.entityType === "region" ? target.title : wine.region?.name,
        grapeName: target.entityType === "grape" ? target.title : wine.grapes[0]?.name,
        producerName: target.entityType === "producer" ? target.title : wine.producer?.name,
      }),
    });

    const saved = await saveNoteVersion({
      supabase,
      existing,
      userId: record.user_id,
      target,
      update,
      consumptionId: record.id,
    });
    noteIds.push(saved.id);
  }

  const recommendations = await generateRecommendations({
    newWine: newWineLabel,
    userExperience,
    relatedWines,
    gaps: describeGaps(exposure),
  });

  await supabase
    .from("recommendations")
    .update({ status: "dismissed" })
    .eq("user_id", record.user_id)
    .eq("status", "active");

  const { data: insertedRecommendations, error: recError } = await supabase
    .from("recommendations")
    .insert(
      recommendations.map((item) => ({
        user_id: record.user_id,
        source_consumption_id: record.id,
        recommendation_type: item.type,
        title: item.title,
        wine_query: item.wineQuery,
        explanation: item.explanation,
        learning_goal: item.learningGoal,
        compare_against: item.compareAgainst,
        status: "active",
      })),
    )
    .select("id");

  if (recError) throw recError;

  return {
    noteIds,
    recommendationIds: (insertedRecommendations ?? []).map((row) => row.id as string),
  };
}

async function saveNoteVersion(input: {
  supabase: SupabaseClient;
  existing: Note | null;
  userId: string;
  target: {
    entityType: Note["entity_type"];
    entityId: string;
    title: string;
  };
  update: {
    title: string;
    summary: string;
    contentMarkdown: string;
    changeSummary: string;
    depth: number;
  };
  consumptionId: string;
}): Promise<Note> {
  if (input.existing) {
    const { data: versions } = await input.supabase
      .from("note_versions")
      .select("version_number")
      .eq("note_id", input.existing.id)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;

    const { error: versionError } = await input.supabase.from("note_versions").insert({
      note_id: input.existing.id,
      version_number: nextVersion,
      content_markdown: input.existing.content_markdown,
      trigger_consumption_id: input.consumptionId,
      change_summary: input.update.changeSummary,
    });
    if (versionError) throw versionError;

    const { data, error } = await input.supabase
      .from("notes")
      .update({
        title: input.update.title || input.target.title,
        summary: input.update.summary,
        content_markdown: input.update.contentMarkdown,
        depth: Math.max(input.existing.depth, input.update.depth || input.existing.depth + 1),
      })
      .eq("id", input.existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Note;
  }

  const { data, error } = await input.supabase
    .from("notes")
    .insert({
      user_id: input.userId,
      entity_type: input.target.entityType,
      entity_id: input.target.entityId,
      title: input.update.title || input.target.title,
      summary: input.update.summary,
      content_markdown: input.update.contentMarkdown,
      depth: input.update.depth || 1,
    })
    .select("*")
    .single();
  if (error) throw error;

  const { error: versionError } = await input.supabase.from("note_versions").insert({
    note_id: data.id,
    version_number: 1,
    content_markdown: input.update.contentMarkdown,
    trigger_consumption_id: input.consumptionId,
    change_summary: input.update.changeSummary,
  });
  if (versionError) throw versionError;

  return data as Note;
}

function relatesToTarget(
  wine: WineWithRelations,
  entityType: Note["entity_type"],
  entityId: string,
  title: string,
): boolean {
  if (entityType === "wine") return wine.id === entityId;
  if (entityType === "producer") return wine.producer_id === entityId;
  if (entityType === "grape") {
    return wine.grapes.some((grape) => grape.id === entityId || grape.name === title);
  }
  return (
    wine.region_id === entityId ||
    wine.appellation?.toLowerCase() === title.toLowerCase() ||
    wine.region?.name.toLowerCase() === title.toLowerCase() ||
    wine.vineyard?.toLowerCase() === title.toLowerCase()
  );
}

function pickComparisonCandidates(
  wine: WineWithRelations,
  history: Array<{ id: string; wine: WineWithRelations }>,
  currentConsumptionId: string,
) {
  const others = history.filter(
    (item) => item.id !== currentConsumptionId && item.wine.id !== wine.id,
  );

  const scored = others.map((item) => {
    let score = 0;
    if (item.wine.producer_id === wine.producer_id) score += 4;
    if (item.wine.appellation && item.wine.appellation === wine.appellation) score += 3;
    if (item.wine.region_id && item.wine.region_id === wine.region_id) score += 2;
    if (item.wine.grapes.some((grape) => wine.grapes.some((other) => other.id === grape.id))) {
      score += 2;
    }
    if (item.wine.vintage && wine.vintage && item.wine.vintage !== wine.vintage) score += 1;
    return { item, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ item }) => ({
      wineId: item.wine.id,
      label: formatWineLabel(item.wine),
      context: [
        item.wine.appellation,
        item.wine.vineyard,
        item.wine.classification,
        item.wine.producer?.name,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}

async function writeRelationships(
  supabase: SupabaseClient,
  wine: WineWithRelations,
  regions: import("@/lib/types").Region[],
) {
  for (let index = 0; index < regions.length - 1; index += 1) {
    const child = regions[index];
    const parent = regions[index + 1];
    if (child && parent) {
      await upsertRelationship(supabase, {
        sourceType: "region",
        sourceId: child.id,
        relationship: "part_of",
        targetType: "region",
        targetId: parent.id,
      });
    }
  }

  if (wine.producer && wine.region) {
    await upsertRelationship(supabase, {
      sourceType: "producer",
      sourceId: wine.producer.id,
      relationship: "produces_in",
      targetType: "region",
      targetId: wine.region.id,
    });
  }

  for (const grape of wine.grapes) {
    if (wine.region) {
      await upsertRelationship(supabase, {
        sourceType: "region",
        sourceId: wine.region.id,
        relationship: "associated_with",
        targetType: "grape",
        targetId: grape.id,
      });
    }
  }
}
