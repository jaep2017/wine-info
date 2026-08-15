"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type LibraryItem = {
  id: string;
  title: string;
  href: string;
  summary: string | null;
  meta?: string;
};

export function LibraryBrowser({
  regions,
  grapes,
  producers,
}: {
  regions: LibraryItem[];
  grapes: LibraryItem[];
  producers: LibraryItem[];
}) {
  return (
    <Tabs defaultValue="regions">
      <TabsList>
        <TabsTrigger value="regions">Regions</TabsTrigger>
        <TabsTrigger value="grapes">Grapes</TabsTrigger>
        <TabsTrigger value="producers">Producers</TabsTrigger>
      </TabsList>
      <TabsContent value="regions" className="mt-8">
        <EntityList items={regions} empty="No regional notes yet. Log a bottle to begin the monograph." />
      </TabsContent>
      <TabsContent value="grapes" className="mt-8">
        <EntityList items={grapes} empty="Grape notes appear after you drink wines tied to them." />
      </TabsContent>
      <TabsContent value="producers" className="mt-8">
        <EntityList items={producers} empty="Producer notes are written from estates you have actually consumed." />
      </TabsContent>
    </Tabs>
  );
}

function EntityList({ items, empty }: { items: LibraryItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-[15px] leading-7 text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <Link key={item.id} href={item.href} className="block py-5 hover:bg-muted/40">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-2xl tracking-tight">{item.title}</h2>
            {item.meta ? (
              <span className="text-xs text-muted-foreground">{item.meta}</span>
            ) : null}
          </div>
          {item.summary ? (
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              {item.summary}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
