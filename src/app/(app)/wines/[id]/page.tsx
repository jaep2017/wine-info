import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { RecommendationBlock } from "@/components/recommendations/recommendation-block";
import { requireProfile } from "@/lib/auth";
import {
  fetchActiveRecommendations,
  fetchConsumptionsForUser,
  fetchNote,
  fetchNotesForUser,
  fetchRegionAncestors,
  fetchWineById,
} from "@/lib/db/queries";
import { formatVintage, formatWineLabel, joinMeta } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Wine ${id.slice(0, 8)}` };
}

export default async function WineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createServerSupabaseClient();
  const wine = await fetchWineById(supabase, id);
  if (!wine) notFound();

  const [consumptions, notes, recommendations, ancestors] = await Promise.all([
    fetchConsumptionsForUser(supabase, profile.id, 100),
    fetchNotesForUser(supabase, profile.id, 40),
    fetchActiveRecommendations(supabase, profile.id),
    fetchRegionAncestors(supabase, wine.region_id),
  ]);

  const thisWineConsumptions = consumptions.filter((item) => item.wine.id === wine.id);
  if (thisWineConsumptions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="This wine is not in your history"
          description="Wine pages are written from bottles you have consumed. Log this wine to generate a personalized explanation."
        />
      </div>
    );
  }

  const latest = thisWineConsumptions[0];
  const explanation = wine.enrichment_json?.explanation;
  const wineNote = await fetchNote(supabase, profile.id, "wine", wine.id);
  const recommendation =
    recommendations.find((item) => item.source_consumption_id === latest.id) ??
    recommendations.find((item) => item.recommendation_type === "continue") ??
    recommendations[0];

  const relatedNotes = notes.filter((note) => {
    if (note.entity_type === "wine" && note.entity_id === wine.id) return true;
    if (note.entity_type === "producer" && note.entity_id === wine.producer_id) return true;
    if (note.entity_type === "grape" && wine.grapes.some((grape) => grape.id === note.entity_id)) {
      return true;
    }
    if (note.entity_type === "region" && ancestors.some((region) => region.id === note.entity_id)) {
      return true;
    }
    return false;
  });

  const comparisons = latest.comparisons_json ?? [];
  const grapes = wine.grapes.map((grape) => grape.name).join(", ");

  return (
    <article className="mx-auto max-w-2xl">
      <p className="text-sm text-muted-foreground">{wine.producer?.name}</p>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">
        {wine.name}
      </h1>
      <p className="mt-2 font-serif text-2xl text-muted-foreground">
        {formatVintage(wine.vintage)}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        {joinMeta([
          wine.region?.name || wine.country,
          wine.appellation,
          wine.vineyard,
          grapes,
          wine.classification,
        ])}
      </p>

      <Editorial
        title="Why This Wine Matters"
        body={explanation?.whyItMatters}
      />
      <Editorial title="The Place" body={explanation?.thePlace} />
      <Editorial title="The Producer" body={explanation?.theProducer} />
      {wine.vineyard || explanation?.theVineyard ? (
        <Editorial title="The Vineyard / Site" body={explanation?.theVineyard} />
      ) : null}
      <Editorial title="The Vintage" body={explanation?.theVintage} />
      <Editorial
        title="What This Bottle Teaches You"
        body={latest.learning_insight}
      />

      {comparisons.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Compare With Wines You&apos;ve Had</h2>
          <div className="mt-4 space-y-6">
            {comparisons.map((item) => (
              <div key={item.wineId}>
                <Link
                  href={`/wines/${item.wineId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {item.title}
                </Link>
                <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
                  {item.comparison}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {relatedNotes.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Continue Learning</h2>
          <ul className="mt-4 space-y-2">
            {relatedNotes
              .filter((note) => note.entity_type !== "wine")
              .map((note) => (
                <li key={note.id}>
                  <Link
                    href={
                      note.entity_type === "region"
                        ? `/library/regions/${note.entity_id}`
                        : note.entity_type === "grape"
                          ? `/library/grapes/${note.entity_id}`
                          : `/library/producers/${note.entity_id}`
                    }
                    className="text-[15px] underline-offset-4 hover:underline"
                  >
                    {note.title}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {recommendation ? (
        <div className="mt-16 border-t border-border pt-10">
          <RecommendationBlock recommendation={recommendation} />
        </div>
      ) : null}

      {wineNote?.summary ? (
        <p className="mt-12 text-sm text-muted-foreground">{wineNote.summary}</p>
      ) : null}

      {latest.personal_notes ? (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-serif text-2xl">Your note</h2>
          <p className="mt-3 text-[15px] leading-7">{latest.personal_notes}</p>
        </section>
      ) : null}

      <p className="mt-12 text-sm text-muted-foreground">
        Logged as {formatWineLabel(wine)}.
      </p>
    </article>
  );
}

function Editorial({ title, body }: { title: string; body?: string | null }) {
  if (!body) return null;
  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-[17px] leading-8">{body}</p>
    </section>
  );
}
