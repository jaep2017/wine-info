import { EmptyState } from "@/components/empty-state";
import { LibraryBrowser } from "@/components/library/library-browser";
import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/auth";
import { fetchNotesForUser } from "@/lib/db/queries";
import { regionNoteItems } from "@/lib/library/region-tree";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Region } from "@/lib/types";

export const metadata = {
  title: "Library",
};

export default async function LibraryPage() {
  const profile = await requireProfile();
  const supabase = await createServerSupabaseClient();
  const notes = await fetchNotesForUser(supabase, profile.id, 80);
  const regionIds = notes
    .filter((note) => note.entity_type === "region")
    .map((note) => note.entity_id);

  let regionRows: Region[] = [];
  if (regionIds.length > 0) {
    const { data } = await supabase.from("regions").select("*");
    regionRows = (data ?? []) as Region[];
  }

  const regions = regionNoteItems(notes, regionRows);
  const grapes = notes
    .filter((note) => note.entity_type === "grape")
    .map((note) => ({
      id: note.id,
      title: note.title,
      href: `/library/grapes/${note.entity_id}`,
      summary: note.summary,
    }));
  const producers = notes
    .filter((note) => note.entity_type === "producer")
    .map((note) => ({
      id: note.id,
      title: note.title,
      href: `/library/producers/${note.entity_id}`,
      summary: note.summary,
    }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Library"
        title="Notes you have earned"
        description="The library is built from wines you have consumed. It is not a global encyclopedia."
      />
      {notes.length === 0 ? (
        <EmptyState
          title="The library is empty"
          description="Persistent notes appear after the first confirmed bottle — typically a region, a grape, a producer, and the wine itself."
        />
      ) : (
        <LibraryBrowser regions={regions} grapes={grapes} producers={producers} />
      )}
    </div>
  );
}
