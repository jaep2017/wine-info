import { LogBottleFlow } from "@/components/log/log-bottle-flow";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Log bottle",
};

export default function LogPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="New bottle"
        title="Log a wine"
        description="Identify the bottle first. Nothing uncertain is saved until you confirm the structured record."
      />
      <LogBottleFlow />
    </div>
  );
}
