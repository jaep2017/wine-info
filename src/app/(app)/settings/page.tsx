import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireProfile } from "@/lib/auth";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="This is a private library. There are no public profiles or social features."
      />
      <SettingsForm profile={profile} />
    </div>
  );
}
