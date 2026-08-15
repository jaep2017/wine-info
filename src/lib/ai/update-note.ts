import { AIUnavailableError, parseStructuredOutput } from "@/lib/ai/client";
import { EXPERT_NOTE_SYSTEM, NOTE_UPDATE_REQUIREMENTS } from "@/lib/ai/prompts";
import { noteUpdateSchema, type NoteUpdateParsed } from "@/lib/ai/schemas";
import type { EntityType } from "@/lib/types";

export type NoteUpdateInput = {
  entityType: EntityType;
  entityName: string;
  entityContext: string;
  existingNote: string | null;
  newWine: string;
  relatedWines: string;
  userExperience: string;
};

function fallbackNote(input: NoteUpdateInput): NoteUpdateParsed {
  const heading = input.entityName;
  const preserved = input.existingNote?.trim();
  const addition = `## Update from a recent bottle

${input.newWine}

This entry was added without model assistance. The bottle should be used to deepen the discussion of ${heading} once enrichment is available.

## Your Experience

${input.userExperience}

## What to Explore Next

Use the next bottle to test one variable — site, producer, vintage, or a neighboring appellation — rather than repeating the same reference point.`;

  return {
    title: heading,
    summary: `Working note on ${heading}, updated after a newly logged bottle.`,
    contentMarkdown: preserved
      ? `${preserved}\n\n${addition}`
      : `# ${heading}\n\n${input.entityContext}\n\n${addition}`,
    changeSummary: `Recorded ${input.newWine} against the ${heading} note. Full expert expansion was unavailable.`,
    depth: preserved ? 2 : 1,
  };
}

export async function updatePersistentNote(
  input: NoteUpdateInput,
): Promise<NoteUpdateParsed> {
  try {
    return await parseStructuredOutput<NoteUpdateParsed>(
      noteUpdateSchema,
      "note_update",
      [
        { role: "system", content: EXPERT_NOTE_SYSTEM },
        {
          role: "user",
          content: `Entity:
${input.entityType}: ${input.entityName}

Entity context:
${input.entityContext}

Existing note:
${input.existingNote || "(none — create the first version)"}

New wine consumed:
${input.newWine}

User's previous related wines:
${input.relatedWines}

Summarized user experience:
${input.userExperience}

${NOTE_UPDATE_REQUIREMENTS}

For region notes, use these headings where they are warranted rather than forcing every section:
Regional Thesis, History, Geography, Geology, Climate, Appellation Structure, Important Vineyards, Viticulture, Winemaking, Producer Landscape, Vintage Variation, Aging, Comparative Context, Debates and Misconceptions, Your Experience, What to Explore Next.`,
        },
      ],
    );
  } catch (error) {
    if (!(error instanceof AIUnavailableError)) {
      console.error("Note update failed, using fallback note.", error);
    }
    return fallbackNote(input);
  }
}
