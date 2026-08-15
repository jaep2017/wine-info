import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { RecommendationBlock } from "@/components/recommendations/recommendation-block";
import { requireProfile } from "@/lib/auth";
import {
  fetchActiveRecommendations,
  fetchConsumptionsForUser,
  fetchNotesForUser,
} from "@/lib/db/queries";
import { formatConsumedAt, formatVintage } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Home",
};

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createServerSupabaseClient();
  const [consumptions, notes, recommendations] = await Promise.all([
    fetchConsumptionsForUser(supabase, profile.id, 8),
    fetchNotesForUser(supabase, profile.id, 8),
    fetchActiveRecommendations(supabase, profile.id),
  ]);

  const continueNote = notes.find((note) => note.entity_type !== "wine") ?? notes[0];
  const primaryRecommendation =
    recommendations.find((item) => item.recommendation_type === "continue") ??
    recommendations[0];
  const recentWines = consumptions.slice(0, 5);
  const expandedNotes = notes.filter((note) => note.entity_type !== "wine").slice(0, 6);

  if (consumptions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Continue learning
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">
          {profile.display_name ? `Welcome, ${profile.display_name}` : "Begin the library"}
        </h1>
        <EmptyState
          title="No bottles yet"
          description="Log the first wine. The application will identify it, explain it, and open the first persistent notes — regions, grapes, and producers you have actually encountered."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-16">
      {continueNote ? (
        <section>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            Continue learning
          </p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">{continueNote.title}</h2>
          <p className="mt-4 max-w-2xl text-[17px] leading-8 text-muted-foreground">
            {continueNote.summary ||
              "Your most recent bottle expanded this note. Continue from the living document rather than starting over."}
          </p>
          <Link
            href={noteHref(continueNote.entity_type, continueNote.entity_id)}
            className="mt-5 inline-flex h-8 items-center rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            Continue reading
          </Link>
        </section>
      ) : null}

      {primaryRecommendation ? (
        <RecommendationBlock
          recommendation={primaryRecommendation}
          eyebrow="Drink next"
          featured
        />
      ) : null}

      <section>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
          Recent wines
        </p>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {recentWines.map((item) => (
            <Link
              key={item.id}
              href={`/wines/${item.wine.id}`}
              className="grid grid-cols-2 gap-2 py-3.5 text-sm hover:bg-muted/40 sm:grid-cols-5"
            >
              <span>{item.wine.producer?.name}</span>
              <span>{item.wine.name}</span>
              <span className="text-muted-foreground">{formatVintage(item.wine.vintage)}</span>
              <span className="text-muted-foreground">
                {item.wine.region?.name || item.wine.appellation || "—"}
              </span>
              <span className="text-muted-foreground">{formatConsumedAt(item.consumed_at)}</span>
            </Link>
          ))}
        </div>
      </section>

      {expandedNotes.length > 0 ? (
        <section>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            Recently expanded
          </p>
          <ul className="mt-4 space-y-3">
            {expandedNotes.map((note) => (
              <li key={note.id}>
                <Link
                  href={noteHref(note.entity_type, note.entity_id)}
                  className="font-serif text-xl tracking-tight hover:underline"
                >
                  {note.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function noteHref(entityType: string, entityId: string): string {
  if (entityType === "region") return `/library/regions/${entityId}`;
  if (entityType === "grape") return `/library/grapes/${entityId}`;
  if (entityType === "producer") return `/library/producers/${entityId}`;
  return `/wines/${entityId}`;
}
