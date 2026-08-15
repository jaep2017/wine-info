import Link from "next/link";
import { NoteContent } from "@/components/markdown/note-content";
import { formatWineLabel } from "@/lib/format";
import type { ConsumptionWithWine, Note } from "@/lib/types";

export function EntityNotePage({
  title,
  subtitle,
  perspective,
  note,
  wines,
  changeSummary,
}: {
  title: string;
  subtitle?: string;
  perspective?: string;
  note: Note | null;
  wines: ConsumptionWithWine[];
  changeSummary?: string | null;
}) {
  return (
    <article className="mx-auto max-w-2xl">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        Persistent note
      </p>
      <h1 className="mt-3 font-serif text-5xl tracking-tight">{title}</h1>
      {subtitle ? (
        <p className="mt-4 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
      {perspective ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">Your Current Perspective</h2>
          <p className="mt-3 text-[17px] leading-8 text-foreground/90">{perspective}</p>
        </section>
      ) : null}
      {changeSummary ? (
        <p className="mt-8 border-l border-border pl-4 text-sm leading-6 text-muted-foreground">
          {changeSummary}
        </p>
      ) : null}
      <div className="mt-12">
        {note?.content_markdown ? (
          <NoteContent markdown={note.content_markdown} />
        ) : (
          <p className="text-[15px] leading-7 text-muted-foreground">
            This note has not been written yet. It will deepen the next time a related bottle is logged.
          </p>
        )}
      </div>
      {wines.length > 0 ? (
        <section className="mt-16 border-t border-border pt-8">
          <h2 className="font-serif text-2xl">Wines in this note</h2>
          <ul className="mt-4 divide-y divide-border">
            {wines.map((item) => (
              <li key={item.id} className="py-3">
                <Link href={`/wines/${item.wine.id}`} className="text-[15px] hover:underline">
                  {formatWineLabel(item.wine)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
