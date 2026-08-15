import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SEED_NOTES, SEED_WINES } from "./seed-data";

function loadEnvFile(filename: string) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local first.`);
  }
  return value;
}

type SeedClient = {
  from: (table: string) => {
    select: (columns: string) => SeedQuery;
    insert: (values: Record<string, unknown> | Record<string, unknown>[]) => SeedQuery;
    delete: () => SeedQuery;
    upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => SeedQuery;
  };
  auth: {
    admin: {
      createUser: (input: Record<string, unknown>) => Promise<{
        data: { user: { id: string } | null };
        error: { message: string } | null;
      }>;
      listUsers: () => Promise<{ data: { users: Array<{ id: string; email?: string }> } }>;
    };
  };
};

type SeedQuery = {
  ilike: (column: string, value: string) => SeedQuery;
  eq: (column: string, value: unknown) => SeedQuery;
  is: (column: string, value: null) => SeedQuery;
  maybeSingle: () => Promise<{ data: { id?: string } | null }>;
  single: () => Promise<{ data: { id: string }; error: { message: string } | null }>;
  select: (columns: string) => SeedQuery;
};

async function upsertRegion(
  supabase: SeedClient,
  input: {
    name: string;
    type: "country" | "region" | "subregion" | "appellation" | "vineyard";
    country: string;
    parentId: string | null;
  },
): Promise<string> {
  let query = supabase
    .from("regions")
    .select("id")
    .ilike("name", input.name)
    .eq("type", input.type)
    .eq("country", input.country);
  query = input.parentId ? query.eq("parent_id", input.parentId) : query.is("parent_id", null);
  const { data: existing } = await query.maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("regions")
    .insert({
      name: input.name,
      type: input.type,
      country: input.country,
      parent_id: input.parentId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function main() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SeedClient;

  console.log("Seeding catalog wines…");

  const wineIds: string[] = [];

  for (const wine of SEED_WINES) {
    const countryId = await upsertRegion(supabase, {
      name: wine.country,
      type: "country",
      country: wine.country,
      parentId: null,
    });
    const regionId = await upsertRegion(supabase, {
      name: wine.region,
      type: "region",
      country: wine.country,
      parentId: countryId,
    });
    let parentId = regionId;
    if (wine.subregion) {
      parentId = await upsertRegion(supabase, {
        name: wine.subregion,
        type: "subregion",
        country: wine.country,
        parentId,
      });
    }
    const appellationId = await upsertRegion(supabase, {
      name: wine.appellation,
      type: "appellation",
      country: wine.country,
      parentId,
    });
    let leafId = appellationId;
    if (wine.vineyard) {
      leafId = await upsertRegion(supabase, {
        name: wine.vineyard,
        type: "vineyard",
        country: wine.country,
        parentId: appellationId,
      });
    }

    const { data: existingProducer } = await supabase
      .from("producers")
      .select("id")
      .ilike("name", wine.producer)
      .maybeSingle();

    let producerId = existingProducer?.id as string | undefined;
    if (!producerId) {
      const { data, error } = await supabase
        .from("producers")
        .insert({
          name: wine.producer,
          country: wine.producerCountry,
          region_id: appellationId,
        })
        .select("id")
        .single();
      if (error) throw error;
      producerId = data.id as string;
    }

    const grapeIds: Array<{ id: string; percentage: number | null }> = [];
    for (const grape of wine.grapes) {
      const { data: existingGrape } = await supabase
        .from("grapes")
        .select("id")
        .ilike("name", grape.name)
        .maybeSingle();
      if (existingGrape?.id) {
        grapeIds.push({ id: existingGrape.id as string, percentage: grape.percentage });
        continue;
      }
      const { data, error } = await supabase
        .from("grapes")
        .insert({ name: grape.name, aliases: [] })
        .select("id")
        .single();
      if (error) throw error;
      grapeIds.push({ id: data.id as string, percentage: grape.percentage });
    }

    const { data: existingWine } = await supabase
      .from("wines")
      .select("id")
      .eq("producer_id", producerId)
      .ilike("canonical_name", wine.name)
      .eq("vintage", wine.vintage)
      .maybeSingle();

    let wineId = existingWine?.id as string | undefined;
    if (!wineId) {
      const { data, error } = await supabase
        .from("wines")
        .insert({
          producer_id: producerId,
          name: wine.name,
          vintage: wine.vintage,
          region_id: leafId,
          appellation: wine.appellation,
          vineyard: wine.vineyard ?? null,
          classification: wine.classification ?? null,
          country: wine.country,
          wine_type: wine.wineType,
          canonical_name: wine.name,
          enrichment_json: { seed: true },
        })
        .select("id")
        .single();
      if (error) throw error;
      wineId = data.id as string;
    }

    await supabase.from("wine_grapes").delete().eq("wine_id", wineId);
    await supabase.from("wine_grapes").insert(
      grapeIds.map((grape) => ({
        wine_id: wineId,
        grape_id: grape.id,
        percentage: grape.percentage,
      })),
    );

    wineIds.push(wineId);
    console.log(`  ${wine.vintage} ${wine.producer} ${wine.name}`);
  }

  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!email || !password) {
    console.log("Catalog seeded. Set SEED_USER_EMAIL and SEED_USER_PASSWORD to attach demo consumptions.");
    return;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Demo" },
  });

  let userId = created.user?.id;
  if (createError || !userId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list.users.find((user) => user.email === email)?.id;
  }
  if (!userId) {
    throw new Error("Could not create or find the seed user.");
  }

  await supabase.from("profiles").upsert({
    id: userId,
    email,
    display_name: "Demo",
  });

  console.log(`Attaching consumptions to ${email}…`);

  for (const [index, wine] of SEED_WINES.entries()) {
    const wineId = wineIds[index];
    if (!wineId) continue;
    const { data: existing } = await supabase
      .from("consumptions")
      .select("id")
      .eq("user_id", userId)
      .eq("wine_id", wineId)
      .maybeSingle();
    if (existing) continue;

    await supabase.from("consumptions").insert({
      user_id: userId,
      wine_id: wineId,
      consumed_at: wine.consumedAt,
      personal_notes: wine.personalNotes ?? null,
      learning_insight:
        index === 0
          ? "This is a first left-bank Chablis Premier Cru and the opening Dauvissat reference in the library."
          : null,
    });
  }

  const { data: chablis } = await supabase
    .from("regions")
    .select("id")
    .eq("name", "Chablis")
    .eq("type", "subregion")
    .maybeSingle();
  const { data: chardonnay } = await supabase
    .from("grapes")
    .select("id")
    .eq("name", "Chardonnay")
    .maybeSingle();
  const { data: dauvissat } = await supabase
    .from("producers")
    .select("id")
    .eq("name", "Vincent Dauvissat")
    .maybeSingle();

  const noteTargets = [
    { note: SEED_NOTES[0], entityId: chablis?.id, type: "region" as const },
    { note: SEED_NOTES[1], entityId: chardonnay?.id, type: "grape" as const },
    { note: SEED_NOTES[2], entityId: dauvissat?.id, type: "producer" as const },
  ];

  for (const target of noteTargets) {
    if (!target.entityId || !target.note) continue;
    const { data: existing } = await supabase
      .from("notes")
      .select("id")
      .eq("user_id", userId)
      .eq("entity_type", target.type)
      .eq("entity_id", target.entityId)
      .maybeSingle();

    let noteId = existing?.id as string | undefined;
    if (!noteId) {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
          entity_type: target.type,
          entity_id: target.entityId,
          title: target.note.title,
          summary: target.note.summary,
          content_markdown: target.note.content,
          depth: target.note.depth,
        })
        .select("id")
        .single();
      if (error) throw error;
      noteId = data.id as string;
    }

    await supabase.from("note_versions").upsert(
      {
        note_id: noteId,
        version_number: 1,
        content_markdown: target.note.content,
        change_summary: "Seeded expert note for local development.",
      },
      { onConflict: "note_id,version_number" },
    );
  }

  await supabase.from("recommendations").delete().eq("user_id", userId);
  await supabase.from("recommendations").insert([
    {
      user_id: userId,
      recommendation_type: "continue",
      title: "Chablis Premier Cru Fourchaume",
      wine_query: "Chablis 1er Cru Fourchaume from a serious grower",
      learning_goal: "Add a northern right-bank Premier Cru to a record that already has La Forest, Montée de Tonnerre, and Les Clos.",
      explanation:
        "You already have left-bank Premier Cru, a Grand Cru-adjacent Premier Cru, and Les Clos. Fourchaume is the missing northern right-bank comparison and teaches a different part of the Chablis map without leaving the appellation.",
      compare_against: "Dauvissat La Forest and Raveneau Montée de Tonnerre",
      status: "active",
    },
    {
      user_id: userId,
      recommendation_type: "compare",
      title: "Same producer, different Dauvissat site",
      wine_query: "Vincent Dauvissat Chablis or Vaillons",
      learning_goal: "Hold producer and vintage range relatively still while changing site rank.",
      explanation:
        "A village Dauvissat or Vaillons isolates what La Forest is adding beyond house style. That is a cleaner comparison than another famous name from a different region.",
      compare_against: "2020 Dauvissat La Forest",
      status: "active",
    },
    {
      user_id: userId,
      recommendation_type: "new_branch",
      title: "Alto Piemonte Nebbiolo",
      wine_query: "Gattinara or Lessona from a traditional producer",
      learning_goal: "Open a Nebbiolo thread outside Barolo and Barbaresco.",
      explanation:
        "You already have a Barbaresco cooperative bottling and a Rinaldi Brunate. Alto Piemonte changes altitude, soils, and historical structure while keeping the grape recognizable.",
      compare_against: "Produttori del Barbaresco and Rinaldi Brunate",
      status: "active",
    },
  ]);

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
