import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchActiveRecommendations,
  fetchConsumptionsForUser,
  fetchNotesForUser,
} from "@/lib/db/queries";
import { formatWineLabel } from "@/lib/format";
import { analyzeExposure, describeGaps } from "@/lib/learning/exposure";

export async function buildAskContext(
  supabase: SupabaseClient,
  userId: string,
  question: string,
): Promise<string> {
  const [consumptions, notes, recommendations] = await Promise.all([
    fetchConsumptionsForUser(supabase, userId, 80),
    fetchNotesForUser(supabase, userId, 30),
    fetchActiveRecommendations(supabase, userId),
  ]);

  const exposure = analyzeExposure(consumptions);
  const tokens = tokenize(question);

  const relevantNotes = notes
    .filter((note) =>
      tokens.some(
        (token) =>
          note.title.toLowerCase().includes(token) ||
          note.content_markdown.toLowerCase().includes(token) ||
          (note.summary ?? "").toLowerCase().includes(token),
      ),
    )
    .slice(0, 6);

  const notesToUse = relevantNotes.length > 0 ? relevantNotes : notes.slice(0, 4);

  const wineLines = consumptions.slice(0, 25).map((item) => {
    const wine = item.wine;
    return `- ${formatWineLabel(wine)} · ${[wine.region?.name, wine.appellation, wine.vineyard, wine.grapes.map((g) => g.name).join("/")].filter(Boolean).join(" · ")}`;
  });

  const noteLines = notesToUse.map((note) => {
    const excerpt = (note.summary || note.content_markdown).slice(0, 800);
    return `### ${note.title} (${note.entity_type})\n${excerpt}`;
  });

  const recLines = recommendations.slice(0, 3).map(
    (item) => `- ${item.recommendation_type}: ${item.title} — ${item.learning_goal ?? item.wine_query}`,
  );

  return [
    "Consumption history:",
    wineLines.join("\n") || "(none)",
    "",
    "Exposure gaps:",
    describeGaps(exposure),
    "",
    "Persistent notes:",
    noteLines.join("\n\n") || "(none)",
    "",
    "Active recommendations:",
    recLines.join("\n") || "(none)",
  ].join("\n");
}

function tokenize(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-z0-9àâäéèêëïîôùûüçœ-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}
