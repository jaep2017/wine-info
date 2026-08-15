import { AskInterface } from "@/components/ask/ask-interface";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Ask",
};

export default function AskPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Research"
        title="Ask"
        description="Grounded in your consumption history, living notes, and structured wine metadata."
      />
      <AskInterface />
    </div>
  );
}
