import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Consumption,
  ConsumptionWithWine,
  Grape,
  Note,
  Producer,
  Recommendation,
  Region,
  Wine,
  WineWithRelations,
} from "@/lib/types";

type WineRow = Wine & {
  producer: Producer | Producer[] | null;
  region: Region | Region[] | null;
  wine_grapes:
    | Array<{
        percentage: number | null;
        grape: Grape | Grape[] | null;
      }>
    | null;
};

const WINE_SELECT = `
  *,
  producer:producers(*),
  region:regions(*),
  wine_grapes (
    percentage,
    grape:grapes(*)
  )
`;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapWine(row: WineRow): WineWithRelations {
  return {
    ...row,
    producer: first(row.producer),
    region: first(row.region),
    grapes: (row.wine_grapes ?? []).flatMap((entry) => {
      const grape = first(entry.grape);
      if (!grape) return [];
      return [{ ...grape, percentage: entry.percentage }];
    }),
  };
}

export async function fetchWineById(
  supabase: SupabaseClient,
  wineId: string,
): Promise<WineWithRelations | null> {
  const { data, error } = await supabase
    .from("wines")
    .select(WINE_SELECT)
    .eq("id", wineId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapWine(data as WineRow) : null;
}

export async function fetchConsumptionsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<ConsumptionWithWine[]> {
  const { data, error } = await supabase
    .from("consumptions")
    .select(
      `
      *,
      wine:wines (
        *,
        producer:producers(*),
        region:regions(*),
        wine_grapes (
          percentage,
          grape:grapes(*)
        )
      )
    `,
    )
    .eq("user_id", userId)
    .order("consumed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const wineRow = first(
      (row as Consumption & { wine: WineRow | WineRow[] | null }).wine,
    );
    if (!wineRow) return [];
    return [
      {
        ...(row as Consumption),
        wine: mapWine(wineRow),
      },
    ];
  });
}

export async function fetchNotesForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 40,
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function fetchActiveRecommendations(
  supabase: SupabaseClient,
  userId: string,
): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Recommendation[];
}

export async function fetchRegionAncestors(
  supabase: SupabaseClient,
  regionId: string | null,
): Promise<Region[]> {
  if (!regionId) return [];

  const chain: Region[] = [];
  let currentId: string | null = regionId;
  const seen = new Set<string>();

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const { data, error } = await supabase
      .from("regions")
      .select("*")
      .eq("id", currentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) break;
    const region = data as Region;
    chain.push(region);
    currentId = region.parent_id;
  }

  return chain;
}

export async function fetchNote(
  supabase: SupabaseClient,
  userId: string,
  entityType: Note["entity_type"],
  entityId: string,
): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) throw error;
  return (data as Note | null) ?? null;
}
