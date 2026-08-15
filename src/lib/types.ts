export const REGION_TYPES = [
  "country",
  "region",
  "subregion",
  "appellation",
  "commune",
  "vineyard",
  "climat",
] as const;

export type RegionType = (typeof REGION_TYPES)[number];

export const ENTITY_TYPES = ["region", "grape", "producer", "wine"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const RECOMMENDATION_TYPES = [
  "continue",
  "compare",
  "deepen",
  "new_branch",
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

export const RECOMMENDATION_STATUSES = [
  "active",
  "consumed",
  "dismissed",
] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const EXPOSURE_LEVELS = [
  "unexplored",
  "limited",
  "moderate",
  "strong",
] as const;
export type ExposureLevel = (typeof EXPOSURE_LEVELS)[number];

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

export type Region = {
  id: string;
  name: string;
  type: RegionType;
  parent_id: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Producer = {
  id: string;
  name: string;
  country: string | null;
  region_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Grape = {
  id: string;
  name: string;
  aliases: string[];
  description: string | null;
  created_at: string;
};

export type Wine = {
  id: string;
  producer_id: string;
  name: string;
  vintage: number | null;
  region_id: string | null;
  appellation: string | null;
  vineyard: string | null;
  classification: string | null;
  country: string | null;
  wine_type: string | null;
  alcohol: number | null;
  canonical_name: string;
  enrichment_json: WineEnrichmentJson | null;
  created_at: string;
  updated_at: string;
};

export type WineGrape = {
  wine_id: string;
  grape_id: string;
  percentage: number | null;
};

export type Consumption = {
  id: string;
  user_id: string;
  wine_id: string;
  consumed_at: string;
  personal_notes: string | null;
  rating: number | null;
  price_paid: number | null;
  location: string | null;
  label_image_path: string | null;
  learning_insight: string | null;
  comparisons_json: WineComparison[] | null;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  title: string;
  summary: string | null;
  content_markdown: string;
  depth: number;
  created_at: string;
  updated_at: string;
};

export type NoteVersion = {
  id: string;
  note_id: string;
  version_number: number;
  content_markdown: string;
  trigger_consumption_id: string | null;
  change_summary: string | null;
  created_at: string;
};

export type Recommendation = {
  id: string;
  user_id: string;
  source_consumption_id: string | null;
  recommendation_type: RecommendationType;
  title: string;
  wine_query: string;
  explanation: string;
  learning_goal: string | null;
  compare_against: string | null;
  status: RecommendationStatus;
  created_at: string;
};

export type EntityRelationship = {
  id: string;
  source_type: string;
  source_id: string;
  relationship: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type IdentifiedGrape = {
  name: string;
  percentage: number | null;
};

export type WineIdentification = {
  producer: string;
  canonicalWineName: string;
  vintage: number | null;
  country: string;
  region: string;
  subregion: string;
  appellation: string;
  vineyard: string;
  classification: string;
  grapes: IdentifiedGrape[];
  wineType: string;
  confidence: number;
  ambiguities: string[];
  shortIdentificationExplanation: string;
};

export type WineEnrichmentJson = {
  identification?: WineIdentification;
  explanation?: {
    whyItMatters?: string;
    thePlace?: string;
    theProducer?: string;
    theVineyard?: string;
    theVintage?: string;
  };
  rawInput?: {
    producer: string;
    wine: string;
    vintage: string | number | null;
  };
};

export type WineComparison = {
  wineId: string;
  title: string;
  comparison: string;
};

export type GeneratedRecommendation = {
  type: RecommendationType;
  title: string;
  wineQuery: string;
  learningGoal: string;
  explanation: string;
  compareAgainst: string;
};

export type WineWithRelations = Wine & {
  producer: Producer | null;
  region: Region | null;
  grapes: Array<Grape & { percentage: number | null }>;
};

export type ConsumptionWithWine = Consumption & {
  wine: WineWithRelations;
};

export type RegionWithParent = Region & {
  parent?: Region | null;
};
