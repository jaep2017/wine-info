import type { Grape, Region, WineWithRelations } from "@/lib/types";

export type NoteTarget = {
  entityType: "region" | "grape" | "producer" | "wine";
  entityId: string;
  title: string;
  context: string;
};

const MAJOR_REGION_TYPES: Region["type"][] = ["region", "subregion"];
const SPECIFIC_REGION_TYPES: Region["type"][] = [
  "appellation",
  "subregion",
  "region",
  "commune",
];

export function selectNoteEntities(input: {
  wine: WineWithRelations;
  regions: Region[];
  relatedWineCountInParent: number;
}): NoteTarget[] {
  const targets: NoteTarget[] = [];
  const wine = input.wine;

  targets.push({
    entityType: "wine",
    entityId: wine.id,
    title: `${wine.vintage ?? "NV"} ${wine.producer?.name ?? ""} ${wine.name}`.replace(
      /\s+/g,
      " ",
    ).trim(),
    context: [
      wine.country,
      wine.appellation,
      wine.vineyard,
      wine.classification,
      wine.wine_type,
    ]
      .filter(Boolean)
      .join(" · "),
  });

  if (wine.producer) {
    targets.push({
      entityType: "producer",
      entityId: wine.producer.id,
      title: wine.producer.name,
      context: [wine.producer.country, wine.appellation].filter(Boolean).join(" · "),
    });
  }

  const primaryGrape = pickPrimaryGrape(wine.grapes);
  if (primaryGrape) {
    targets.push({
      entityType: "grape",
      entityId: primaryGrape.id,
      title: primaryGrape.name,
      context: `Primary grape in ${wine.name}`,
    });
  }

  const specific = [...input.regions]
    .reverse()
    .find(
      (region) =>
        SPECIFIC_REGION_TYPES.includes(region.type) && region.type !== "country",
    );

  if (specific) {
    targets.push({
      entityType: "region",
      entityId: specific.id,
      title: specific.name,
      context: `${specific.type} in ${specific.country}`,
    });
  }

  const vineyardRegion = input.regions.find((region) => region.type === "vineyard" || region.type === "climat");
  if (vineyardRegion && targets.length < 5) {
    targets.push({
      entityType: "region",
      entityId: vineyardRegion.id,
      title: vineyardRegion.name,
      context: `${vineyardRegion.type} associated with ${specific?.name ?? wine.appellation ?? wine.name}`,
    });
  }

  const parent = input.regions.find((region) => MAJOR_REGION_TYPES.includes(region.type));
  const alreadyHasParent = parent && targets.some((target) => target.entityId === parent.id);
  if (
    parent &&
    !alreadyHasParent &&
    !vineyardRegion &&
    input.relatedWineCountInParent >= 3 &&
    targets.length < 5
  ) {
    targets.push({
      entityType: "region",
      entityId: parent.id,
      title: parent.name,
      context: `Parent ${parent.type} in ${parent.country}`,
    });
  }

  return targets;
}

export function pickPrimaryGrape(
  grapes: Array<Grape & { percentage: number | null }>,
): (Grape & { percentage: number | null }) | null {
  if (grapes.length === 0) return null;
  return [...grapes].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))[0] ?? null;
}
