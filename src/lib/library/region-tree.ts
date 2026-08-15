import type { Note, Region } from "@/lib/types";
import type { LibraryItem } from "@/components/library/library-browser";

export function regionNoteItems(
  notes: Note[],
  regions: Region[],
): LibraryItem[] {
  const byId = new Map(regions.map((region) => [region.id, region]));

  const pathFor = (region: Region): string => {
    const names = [region.name];
    let current = region.parent_id ? byId.get(region.parent_id) : undefined;
    const seen = new Set<string>([region.id]);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (current.type !== "country") {
        names.unshift(current.name);
      } else {
        names.unshift(current.name);
        break;
      }
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return names.join(" → ");
  };

  return notes
    .filter((note) => note.entity_type === "region")
    .map((note) => {
      const region = byId.get(note.entity_id);
      return {
        id: note.id,
        title: region ? pathFor(region) : note.title,
        href: `/library/regions/${note.entity_id}`,
        summary: note.summary,
        meta: region?.type,
      };
    });
}
