# Cellar Notes

A personal wine intelligence and learning application.

The product is not a cellar manager, tasting game, or rating network. It turns bottles you drink into a cumulative, expert-level reference library, then recommends what to drink next for educational value.

## 1. Installation

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
```

## 2. Supabase setup

Create a Supabase project.

In the project settings, copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY`

Enable Email authentication under Authentication → Providers.

In Authentication → URL configuration, add:

- Site URL: `http://localhost:3000`
- Redirect: `http://localhost:3000/auth/callback`

## 3. Migrations

The schema lives in `supabase/migrations/20240815120000_initial_schema.sql`.

**Option A — SQL editor**

Paste and run that migration in the Supabase SQL editor.

**Option B — Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The migration creates tables, indexes, triggers, Row Level Security policies, and a private `labels` storage bucket.

## 4. Environment variables

`.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

Optional, for attaching demo consumptions and notes:

```bash
SEED_USER_EMAIL=
SEED_USER_PASSWORD=
```

The app remains usable without `OPENAI_API_KEY`: identification falls back to the user’s typed fields, and notes/recommendations use conservative placeholders. Expert writing requires the OpenAI key.

## 5. Running locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and log a bottle.

## 6. Seed data

```bash
npm run seed
```

This upserts about ten serious wines (Dauvissat La Forest, Raveneau Montée de Tonnerre, Fèvre Les Clos, Huet Le Mont, Jamet Côte-Rôtie, Produttori del Barbaresco, Rinaldi Brunate, Roulot Meursault, J.J. Prüm Sonnenuhr, López de Heredia Tondonia).

If `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` are set, the script also creates that user, attaches consumptions, writes starter notes for Chablis / Chardonnay / Dauvissat, and inserts three educational recommendations.

## 7. Architectural overview

```
src/
  app/(app)           Authenticated pages: home, log, wines, library, discover, ask
  app/(auth)          Email sign-in and sign-up
  app/api             Enrichment, confirmation, ask, recommendation status
  components          Layout, log flow, notes, ask, recommendations
  lib/ai              OpenAI client, structured outputs, prompts
  lib/db              Queries and upserts
  lib/learning        Exposure model and processNewConsumption pipeline
  lib/supabase        Browser, server, and service-role clients
```

### Core loop

1. `/log` collects producer, cuvée, vintage, and an optional label image.
2. `POST /api/wines/enrich` identifies the wine with OpenAI structured output (Zod-validated).
3. The confirmation screen is editable. Uncertain fields are never saved silently.
4. `POST /api/wines/confirm` upserts producer, region hierarchy, grapes, and wine; creates a consumption; then runs `processNewConsumption`.
5. The pipeline updates a small set of living notes (wine, producer, primary grape, most specific region, and sometimes a parent region or vineyard), stores `note_versions`, and writes three recommendations: continue, compare, new branch.
6. `/wines/[id]` is the editorial bottle page. `/library` holds persistent notes. `/discover` shows the learning logic. `/ask` answers from consumption history and notes.

### Design choices

- Server Components by default; client components only for forms, navigation, and chat.
- Shared catalog tables (wines, regions, producers, grapes) are readable/writable by authenticated users. Consumptions, notes, and recommendations are user-scoped via RLS.
- Notes are updated, not regenerated from scratch.
- Recommendations optimize for incremental educational value, not taste similarity.
- No social features, cellar inventory, quizzes, or badges.

## Scripts

| Command        | Purpose                          |
| -------------- | -------------------------------- |
| `npm run dev`  | Next.js development server       |
| `npm run build`| Production build                 |
| `npm run lint` | ESLint                           |
| `npm run seed` | Catalog and optional demo user   |
