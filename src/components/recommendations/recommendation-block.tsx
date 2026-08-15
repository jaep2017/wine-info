"use client";

import { useState } from "react";
import type { Recommendation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RecommendationBlock({
  recommendation,
  eyebrow = "Drink next",
  featured = false,
}: {
  recommendation: Recommendation;
  eyebrow?: string;
  featured?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={featured ? "max-w-2xl" : "max-w-xl"}>
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className={`mt-2 font-serif tracking-tight ${featured ? "text-3xl" : "text-2xl"}`}>
        {recommendation.title}
      </h2>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        {recommendation.explanation}
      </p>
      <dl className="mt-5 space-y-2 text-sm">
        {recommendation.learning_goal ? (
          <div>
            <dt className="text-muted-foreground">Learning goal</dt>
            <dd className="mt-1">{recommendation.learning_goal}</dd>
          </div>
        ) : null}
        {recommendation.compare_against ? (
          <div>
            <dt className="text-muted-foreground">Compare against</dt>
            <dd className="mt-1">{recommendation.compare_against}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">Look for</dt>
          <dd className="mt-1">{recommendation.wine_query}</dd>
        </div>
      </dl>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="mt-5 inline-flex h-8 items-center rounded-md border border-border px-3 text-sm hover:bg-muted">
          Why this wine?
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why this wine?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-[15px] leading-7">
            <p>{recommendation.explanation}</p>
            {recommendation.learning_goal ? (
              <p>
                <span className="text-muted-foreground">What it teaches: </span>
                {recommendation.learning_goal}
              </p>
            ) : null}
            {recommendation.compare_against ? (
              <p>
                <span className="text-muted-foreground">Compare with: </span>
                {recommendation.compare_against}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              The recommendation is for educational increment, not taste similarity.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function DismissRecommendation({ id }: { id: string }) {
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="text-sm text-muted-foreground">Dismissed.</p>;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch(`/api/recommendations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "dismissed" }),
        });
        setDone(true);
      }}
    >
      Dismiss
    </Button>
  );
}
