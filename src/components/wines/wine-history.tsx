"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatConsumedAt, formatVintage } from "@/lib/format";
import type { ConsumptionWithWine } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WineHistory({ consumptions }: { consumptions: ConsumptionWithWine[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [grape, setGrape] = useState("all");
  const [producer, setProducer] = useState("all");

  const options = useMemo(() => {
    const regions = new Set<string>();
    const grapes = new Set<string>();
    const producers = new Set<string>();
    for (const item of consumptions) {
      if (item.wine.region?.name) regions.add(item.wine.region.name);
      else if (item.wine.appellation) regions.add(item.wine.appellation);
      if (item.wine.producer?.name) producers.add(item.wine.producer.name);
      for (const g of item.wine.grapes) grapes.add(g.name);
    }
    return {
      regions: [...regions].sort(),
      grapes: [...grapes].sort(),
      producers: [...producers].sort(),
    };
  }, [consumptions]);

  const filtered = consumptions.filter((item) => {
    const haystack = [
      item.wine.producer?.name,
      item.wine.name,
      item.wine.region?.name,
      item.wine.appellation,
      item.wine.vintage,
      ...item.wine.grapes.map((g) => g.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (region !== "all") {
      const value = item.wine.region?.name || item.wine.appellation;
      if (value !== region) return false;
    }
    if (producer !== "all" && item.wine.producer?.name !== producer) return false;
    if (grape !== "all" && !item.wine.grapes.some((g) => g.name === grape)) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search producer, wine, region…"
          aria-label="Search wines"
        />
        <FilterSelect
          label="Region"
          value={region}
          onChange={setRegion}
          options={options.regions}
        />
        <FilterSelect
          label="Grape"
          value={grape}
          onChange={setGrape}
          options={options.grapes}
        />
        <FilterSelect
          label="Producer"
          value={producer}
          onChange={setProducer}
          options={options.producers}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No wines match those filters.</p>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/wines/${item.wine.id}`}
              className="grid grid-cols-2 gap-2 py-4 text-sm transition-colors hover:bg-muted/50 sm:grid-cols-5"
            >
              <span className="text-muted-foreground">{formatVintage(item.wine.vintage)}</span>
              <span>{item.wine.producer?.name}</span>
              <span className="sm:col-span-1">{item.wine.name}</span>
              <span className="text-muted-foreground">
                {item.wine.region?.name || item.wine.appellation || "—"}
              </span>
              <span className="text-muted-foreground">{formatConsumedAt(item.consumed_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
