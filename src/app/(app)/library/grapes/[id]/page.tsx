import { notFound } from "next/navigation";
import { EntityNotePage } from "@/components/notes/entity-note-page";
import { requireProfile } from "@/lib/auth";
import { fetchConsumptionsForUser, fetchNote } from "@/lib/db/queries";
import { analyzeExposure, inferPerspective } from "@/lib/learning/exposure";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Grape } from "@/lib/types";

export default async function GrapeNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createServerSupabaseClient();

  const { data: grape } = await supabase.from("grapes").select("*").eq("id", id).maybeSingle();
  if (!grape) notFound();
  const record = grape as Grape;

  const [note, consumptions] = await Promise.all([
    fetchNote(supabase, profile.id, "grape", id),
    fetchConsumptionsForUser(supabase, profile.id, 200),
  ]);

  const related = consumptions.filter((item) =>
    item.wine.grapes.some((entry) => entry.id === id),
  );
  const exposure = analyzeExposure(related);
  const bucket = exposure.grapes[0];

  return (
    <EntityNotePage
      title={record.name}
      subtitle={`${related.length} wine${related.length === 1 ? "" : "s"} consumed`}
      perspective={inferPerspective(bucket, record.name)}
      note={note}
      wines={related}
    />
  );
}
