import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { WineHistory } from "@/components/wines/wine-history";
import { requireProfile } from "@/lib/auth";
import { fetchConsumptionsForUser } from "@/lib/db/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Wines",
};

export default async function WinesPage() {
  const profile = await requireProfile();
  const supabase = await createServerSupabaseClient();
  const consumptions = await fetchConsumptionsForUser(supabase, profile.id, 200);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="History"
        title="Wines"
        description="A chronological record of bottles you have actually drunk. Search and filter without leaving the list."
      />
      {consumptions.length === 0 ? (
        <EmptyState
          title="No wines logged"
          description="The history fills as you drink. Start with a bottle you can discuss seriously."
        />
      ) : (
        <WineHistory consumptions={consumptions} />
      )}
    </div>
  );
}
