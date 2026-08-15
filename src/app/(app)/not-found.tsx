import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg">
      <EmptyState
        title="Not found"
        description="That page is not in the library. Return home or log a bottle to continue."
        actionHref="/"
        actionLabel="Back home"
      />
    </div>
  );
}
