import type {
  ConsumptionWithWine,
  ExposureLevel,
  Region,
} from "@/lib/types";

export type ExposureBucket = {
  key: string;
  label: string;
  count: number;
  level: ExposureLevel;
  producers: string[];
  vineyards: string[];
  vintages: number[];
  classifications: string[];
  wines: string[];
};

export type ExposureReport = {
  regions: ExposureBucket[];
  appellations: ExposureBucket[];
  grapes: ExposureBucket[];
  producers: ExposureBucket[];
  vineyards: ExposureBucket[];
  vintages: ExposureBucket[];
  subregions: ExposureBucket[];
};

function levelForCount(count: number): ExposureLevel {
  if (count <= 0) return "unexplored";
  if (count <= 2) return "limited";
  if (count <= 5) return "moderate";
  return "strong";
}

function upsert(
  map: Map<string, ExposureBucket>,
  key: string,
  label: string,
  extra: {
    producer?: string | null;
    vineyard?: string | null;
    vintage?: number | null;
    classification?: string | null;
    wine?: string;
  },
) {
  const existing = map.get(key) ?? {
    key,
    label,
    count: 0,
    level: "unexplored" as ExposureLevel,
    producers: [],
    vineyards: [],
    vintages: [],
    classifications: [],
    wines: [],
  };

  existing.count += 1;
  if (extra.producer && !existing.producers.includes(extra.producer)) {
    existing.producers.push(extra.producer);
  }
  if (extra.vineyard && !existing.vineyards.includes(extra.vineyard)) {
    existing.vineyards.push(extra.vineyard);
  }
  if (extra.vintage && !existing.vintages.includes(extra.vintage)) {
    existing.vintages.push(extra.vintage);
  }
  if (
    extra.classification &&
    !existing.classifications.includes(extra.classification)
  ) {
    existing.classifications.push(extra.classification);
  }
  if (extra.wine && !existing.wines.includes(extra.wine)) {
    existing.wines.push(extra.wine);
  }
  existing.level = levelForCount(existing.count);
  map.set(key, existing);
}

export function analyzeExposure(
  consumptions: ConsumptionWithWine[],
  regionIndex?: Map<string, Region>,
): ExposureReport {
  const regions = new Map<string, ExposureBucket>();
  const appellations = new Map<string, ExposureBucket>();
  const grapes = new Map<string, ExposureBucket>();
  const producers = new Map<string, ExposureBucket>();
  const vineyards = new Map<string, ExposureBucket>();
  const vintages = new Map<string, ExposureBucket>();
  const subregions = new Map<string, ExposureBucket>();

  for (const consumption of consumptions) {
    const wine = consumption.wine;
    const producerName = wine.producer?.name ?? "Unknown producer";
    const wineLabel = `${wine.vintage ?? "NV"} ${producerName} ${wine.name}`;
    const extra = {
      producer: producerName,
      vineyard: wine.vineyard,
      vintage: wine.vintage,
      classification: wine.classification,
      wine: wineLabel,
    };

    if (wine.region) {
      upsert(regions, wine.region.id, wine.region.name, extra);
      const parent = wine.region.parent_id
        ? regionIndex?.get(wine.region.parent_id)
        : null;
      if (parent && (parent.type === "region" || parent.type === "subregion")) {
        upsert(subregions, parent.id, parent.name, extra);
      }
    } else if (wine.appellation) {
      upsert(appellations, wine.appellation.toLowerCase(), wine.appellation, extra);
    }

    if (wine.appellation) {
      upsert(appellations, wine.appellation.toLowerCase(), wine.appellation, extra);
    }
    if (wine.vineyard) {
      upsert(vineyards, wine.vineyard.toLowerCase(), wine.vineyard, extra);
    }
    if (wine.producer) {
      upsert(producers, wine.producer.id, wine.producer.name, extra);
    }
    if (wine.vintage) {
      upsert(vintages, String(wine.vintage), String(wine.vintage), extra);
    }
    for (const grape of wine.grapes) {
      upsert(grapes, grape.id, grape.name, extra);
    }
  }

  const sort = (items: Map<string, ExposureBucket>) =>
    [...items.values()].sort((a, b) => b.count - a.count);

  return {
    regions: sort(regions),
    appellations: sort(appellations),
    grapes: sort(grapes),
    producers: sort(producers),
    vineyards: sort(vineyards),
    vintages: sort(vintages),
    subregions: sort(subregions),
  };
}

export function summarizeEntityExperience(
  report: ExposureReport,
  options: {
    regionName?: string | null;
    grapeName?: string | null;
    producerName?: string | null;
  },
): string {
  const lines: string[] = [];

  const region = options.regionName
    ? report.regions.find(
        (item) => item.label.toLowerCase() === options.regionName!.toLowerCase(),
      ) ??
      report.appellations.find(
        (item) => item.label.toLowerCase() === options.regionName!.toLowerCase(),
      )
    : report.regions[0];

  if (region) {
    const premier = region.classifications.filter((value) =>
      /premier|1er/i.test(value),
    ).length;
    const grand = region.classifications.filter((value) =>
      /grand cru/i.test(value),
    ).length;
    lines.push(
      `User has consumed ${region.count} wine${region.count === 1 ? "" : "s"} from ${region.label}.`,
    );
    lines.push(`${region.producers.length} producer${region.producers.length === 1 ? "" : "s"}.`);
    if (premier || grand) {
      lines.push(
        `${premier} classified as Premier Cru / 1er, ${grand} as Grand Cru among recorded classifications.`,
      );
    }
    if (region.vineyards.length) {
      lines.push(`Sites encountered: ${region.vineyards.join(", ")}.`);
    }
    if (region.wines.length) {
      lines.push(`Wines: ${region.wines.slice(0, 8).join("; ")}.`);
    }
  }

  if (options.grapeName) {
    const grape = report.grapes.find(
      (item) => item.label.toLowerCase() === options.grapeName!.toLowerCase(),
    );
    if (grape) {
      lines.push(
        `${grape.count} wine${grape.count === 1 ? "" : "s"} from ${grape.label} (${grape.level} exposure).`,
      );
    }
  }

  if (options.producerName) {
    const producer = report.producers.find(
      (item) => item.label.toLowerCase() === options.producerName!.toLowerCase(),
    );
    if (producer) {
      lines.push(
        `${producer.count} wine${producer.count === 1 ? "" : "s"} from ${producer.label}.`,
      );
    }
  }

  return lines.join("\n") || "This is among the user's first recorded wines.";
}

export function inferPerspective(bucket: ExposureBucket | undefined, name: string): string {
  if (!bucket || bucket.count === 0) {
    return `You have not yet built a drinking record in ${name}.`;
  }

  const classification = bucket.classifications.join(", ");
  const missing = [];
  if (!bucket.classifications.some((value) => /grand cru/i.test(value))) {
    missing.push("Grand Cru or equivalent top-tier sites");
  }
  if (bucket.producers.length < 3) {
    missing.push("producer variation");
  }
  if (bucket.vineyards.length < 3) {
    missing.push("site-level contrast");
  }

  return `Your experience with ${name} is currently ${bucket.level}, based on ${bucket.count} wine${bucket.count === 1 ? "" : "s"} and ${bucket.producers.length} producer${bucket.producers.length === 1 ? "" : "s"}${classification ? `, including ${classification}` : ""}. ${
    missing.length
      ? `The clearest gaps are ${missing.join(", ")}.`
      : "You now have enough bottles to support finer intra-regional comparison."
  }`;
}

export function describeGaps(report: ExposureReport): string {
  const threads = report.regions.slice(0, 4).map((region) => {
    const missing: string[] = [];
    if (!region.classifications.some((value) => /grand cru/i.test(value))) {
      missing.push("top-tier / Grand Cru exposure");
    }
    if (region.producers.length < 4) {
      missing.push("broader producer range");
    }
    if (region.vineyards.length < 3) {
      missing.push("additional sites");
    }
    return `${region.label}: ${region.level} exposure (${region.count} wines). Missing: ${missing.join(", ") || "finer vintage and lieu-dit comparison"}.`;
  });

  if (report.grapes.length <= 2) {
    threads.push(
      "Grape coverage is still narrow; a new branch in another major family would expand the map.",
    );
  }

  return threads.join("\n") || "No consumption history yet — any serious first bottle opens the first thread.";
}
