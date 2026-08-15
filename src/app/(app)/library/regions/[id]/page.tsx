import { notFound } from "next/navigation";
import { EntityNotePage } from "@/components/notes/entity-note-page";
import { requireProfile } from "@/lib/auth";
import {
  fetchConsumptionsForUser,
  fetchNote,
  fetchRegionAncestors,
} from "@/lib/db/queries";
import { analyzeExposure, inferPerspective } from "@/lib/learning/exposure";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Region } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Region ${id.slice(0, 8)}` };
}

export default async function RegionNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createServerSupabaseClient();

  const { data: region, error } = await supabase
    .from("regions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!region) notFound();
  const record = region as Region;

  const [note, consumptions] = await Promise.all([
    fetchNote(supabase, profile.id, "region", id),
    fetchConsumptionsForUser(supabase, profile.id, 200),
  ]);

  let changeSummary: string | null = null;
  if (note) {
    const { data: versions } = await supabase
      .from("note_versions")
      .select("change_summary")
      .eq("note_id", note.id)
      .order("version_number", { ascending: false })
      .limit(1);
    changeSummary = versions?.[0]?.change_summary ?? null;
  }

  const related = [];
  for (const item of consumptions) {
    const ancestors = await fetchRegionAncestors(supabase, item.wine.region_id);
    const matches =
      item.wine.region_id === id ||
      ancestors.some((ancestor) => ancestor.id === id) ||
      item.wine.appellation?.toLowerCase() === record.name.toLowerCase() ||
      item.wine.vineyard?.toLowerCase() === record.name.toLowerCase();
    if (matches) related.push(item);
  }

  const exposure = analyzeExposure(related);
  const bucket = exposure.regions[0] ?? exposure.appellations[0];
  const premier = related.filter((item) =>
    /premier|1er/i.test(item.wine.classification ?? ""),
  ).length;
  const grand = related.filter((item) =>
    /grand cru/i.test(item.wine.classification ?? ""),
  ).length;
  const producers = new Set(
    related.map((item) => item.wine.producer?.name).filter(Boolean),
  );

  const subtitle = `${related.length} wine${related.length === 1 ? "" : "s"} consumed · ${producers.size} producer${producers.size === 1 ? "" : "s"}${
    premier ? ` · ${premier} Premier Cru` : ""
  }${grand ? ` · ${grand} Grand Cru` : ""}`;

  return (
    <EntityNotePage
      title={record.name}
      subtitle={subtitle}
      perspective={inferPerspective(bucket, record.name)}
      note={note}
      wines={related}
      changeSummary={changeSummary}
    />
  );
}
