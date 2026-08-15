import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  DismissRecommendation,
  RecommendationBlock,
} from "@/components/recommendations/recommendation-block";
import { requireProfile } from "@/lib/auth";
import {
  fetchActiveRecommendations,
  fetchConsumptionsForUser,
} from "@/lib/db/queries";
import { analyzeExposure, describeGaps } from "@/lib/learning/exposure";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Discover",
};

export default async function DiscoverPage() {
  const profile = await requireProfile();
  const supabase = await createServerSupabaseClient();
  const [recommendations, consumptions] = await Promise.all([
    fetchActiveRecommendations(supabase, profile.id),
    fetchConsumptionsForUser(supabase, profile.id, 200),
  ]);

  const next =
    recommendations.find((item) => item.recommendation_type === "continue") ??
    recommendations[0];
  const comparison = recommendations.find((item) => item.recommendation_type === "compare");
  const branch = recommendations.find((item) => item.recommendation_type === "new_branch");
  const exposure = analyzeExposure(consumptions);
  const gapLines = describeGaps(exposure).split("\n").filter(Boolean);

  if (consumptions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          eyebrow="Discover"
          title="What to drink next"
          description="Recommendations optimize for educational increment, not taste similarity."
        />
        <EmptyState
          title="No learning threads yet"
          description="Log a first bottle. Discover becomes useful once there is a history to continue, compare, or branch from."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-16">
      <PageHeader
        eyebrow="Discover"
        title="What to drink next"
        description="Each suggestion is a pedagogical move: continue a thread, change one variable, or open a new branch."
      />

      {next ? (
        <div>
          <RecommendationBlock
            recommendation={next}
            eyebrow="Best next bottle"
            featured
          />
          <div className="mt-3">
            <DismissRecommendation id={next.id} />
          </div>
        </div>
      ) : null}

      {comparison ? (
        <RecommendationBlock
          recommendation={comparison}
          eyebrow="Best comparison"
        />
      ) : null}

      {branch ? (
        <RecommendationBlock
          recommendation={branch}
          eyebrow="Open a new branch"
        />
      ) : null}

      <section>
        <h2 className="font-serif text-2xl">Current Learning Threads</h2>
        <div className="mt-6 space-y-6">
          {exposure.regions.slice(0, 5).map((region, index) => (
            <div key={region.key}>
              <h3 className="font-serif text-xl">{region.label}</h3>
              <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
                {gapLines[index] ||
                  `${region.level} exposure from ${region.count} wines and ${region.producers.length} producers.`}
              </p>
            </div>
          ))}
          {exposure.grapes.slice(0, 2).map((grape) => (
            <div key={grape.key}>
              <h3 className="font-serif text-xl">{grape.label}</h3>
              <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
                {grape.level} exposure across {grape.count} wines
                {grape.wines.length ? `, including ${grape.wines.slice(0, 3).join("; ")}` : ""}.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
