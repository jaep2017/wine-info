"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">Something went wrong</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        {error.message || "The page could not be loaded."}
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
