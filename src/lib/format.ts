import { format } from "date-fns";
import type { WineWithRelations } from "@/lib/types";

export function formatVintage(vintage: number | null | undefined): string {
  return vintage ? String(vintage) : "NV";
}

export function formatConsumedAt(value: string): string {
  return format(new Date(value), "d MMM yyyy");
}

export function formatWineLabel(wine: {
  name: string;
  vintage?: number | null;
  producer?: { name: string } | null;
}): string {
  const vintage = formatVintage(wine.vintage ?? null);
  const producer = wine.producer?.name;
  return producer ? `${vintage} ${producer} ${wine.name}` : `${vintage} ${wine.name}`;
}

export function formatWineMeta(wine: WineWithRelations): string {
  const grapes = wine.grapes.map((grape) => grape.name).join(", ");
  return [wine.region?.name || wine.country, wine.appellation, wine.vineyard, grapes, wine.classification]
    .filter(Boolean)
    .join(" · ");
}

export function joinMeta(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ");
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
