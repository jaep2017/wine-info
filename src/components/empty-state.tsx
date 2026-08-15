import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref = "/log",
  actionLabel = "Log a bottle",
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="max-w-lg border-t border-border pt-8">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{description}</p>
      <Button nativeButton={false} render={<Link href={actionHref} />} className="mt-6">
        {actionLabel}
      </Button>
    </div>
  );
}
