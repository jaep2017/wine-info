-- Wine intelligence schema
-- UUID primary keys, hierarchical regions, living notes, educational recommendations.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Regions (recursive geography)
-- ---------------------------------------------------------------------------

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (
    type in ('country', 'region', 'subregion', 'appellation', 'commune', 'vineyard', 'climat')
  ),
  parent_id uuid references public.regions (id) on delete set null,
  country text not null,
  latitude double precision,
  longitude double precision,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index regions_parent_id_idx on public.regions (parent_id);
create index regions_country_type_idx on public.regions (country, type);
create unique index regions_identity_idx
  on public.regions (lower(name), type, country, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'));

create trigger regions_set_updated_at
  before update on public.regions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Producers
-- ---------------------------------------------------------------------------

create table public.producers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  region_id uuid references public.regions (id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index producers_name_idx on public.producers (lower(name));

create trigger producers_set_updated_at
  before update on public.producers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grapes
-- ---------------------------------------------------------------------------

create table public.grapes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  description text,
  created_at timestamptz not null default now()
);

create unique index grapes_name_unique on public.grapes (lower(name));

-- ---------------------------------------------------------------------------
-- Wines
-- ---------------------------------------------------------------------------

create table public.wines (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producers (id) on delete restrict,
  name text not null,
  vintage integer,
  region_id uuid references public.regions (id) on delete set null,
  appellation text,
  vineyard text,
  classification text,
  country text,
  wine_type text,
  alcohol numeric,
  canonical_name text not null,
  enrichment_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index wines_canonical_unique
  on public.wines (producer_id, lower(canonical_name), coalesce(vintage, -1));

create index wines_region_id_idx on public.wines (region_id);
create index wines_producer_id_idx on public.wines (producer_id);

create trigger wines_set_updated_at
  before update on public.wines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Wine grapes
-- ---------------------------------------------------------------------------

create table public.wine_grapes (
  wine_id uuid not null references public.wines (id) on delete cascade,
  grape_id uuid not null references public.grapes (id) on delete restrict,
  percentage numeric,
  primary key (wine_id, grape_id)
);

-- ---------------------------------------------------------------------------
-- Consumptions
-- ---------------------------------------------------------------------------

create table public.consumptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  wine_id uuid not null references public.wines (id) on delete restrict,
  consumed_at timestamptz not null default now(),
  personal_notes text,
  rating numeric,
  price_paid numeric,
  location text,
  label_image_path text,
  learning_insight text,
  comparisons_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consumptions_user_consumed_idx
  on public.consumptions (user_id, consumed_at desc);
create index consumptions_wine_id_idx on public.consumptions (wine_id);

create trigger consumptions_set_updated_at
  before update on public.consumptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('region', 'grape', 'producer', 'wine')),
  entity_id uuid not null,
  title text not null,
  summary text,
  content_markdown text not null default '',
  depth integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index notes_user_updated_idx on public.notes (user_id, updated_at desc);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Note versions
-- ---------------------------------------------------------------------------

create table public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  version_number integer not null,
  content_markdown text not null,
  trigger_consumption_id uuid references public.consumptions (id) on delete set null,
  change_summary text,
  created_at timestamptz not null default now()
);

create unique index note_versions_unique on public.note_versions (note_id, version_number);

-- ---------------------------------------------------------------------------
-- Recommendations
-- ---------------------------------------------------------------------------

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_consumption_id uuid references public.consumptions (id) on delete set null,
  recommendation_type text not null check (
    recommendation_type in ('continue', 'compare', 'deepen', 'new_branch')
  ),
  title text not null,
  wine_query text not null,
  explanation text not null,
  learning_goal text,
  compare_against text,
  status text not null default 'active' check (status in ('active', 'consumed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index recommendations_user_status_idx
  on public.recommendations (user_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- Entity relationships
-- ---------------------------------------------------------------------------

create table public.entity_relationships (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid not null,
  relationship text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index entity_relationships_unique
  on public.entity_relationships (source_type, source_id, relationship, target_type, target_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.producers enable row level security;
alter table public.grapes enable row level security;
alter table public.wines enable row level security;
alter table public.wine_grapes enable row level security;
alter table public.consumptions enable row level security;
alter table public.notes enable row level security;
alter table public.note_versions enable row level security;
alter table public.recommendations enable row level security;
alter table public.entity_relationships enable row level security;

-- Profiles: own row only
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- Shared catalog: authenticated users may read and write reference data
create policy regions_authenticated_all on public.regions
  for all to authenticated using (true) with check (true);
create policy producers_authenticated_all on public.producers
  for all to authenticated using (true) with check (true);
create policy grapes_authenticated_all on public.grapes
  for all to authenticated using (true) with check (true);
create policy wines_authenticated_all on public.wines
  for all to authenticated using (true) with check (true);
create policy wine_grapes_authenticated_all on public.wine_grapes
  for all to authenticated using (true) with check (true);
create policy entity_relationships_authenticated_all on public.entity_relationships
  for all to authenticated using (true) with check (true);

-- User-scoped records
create policy consumptions_own on public.consumptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notes_own on public.notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy note_versions_own on public.note_versions
  for all to authenticated
  using (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

create policy recommendations_own on public.recommendations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: private label images
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('labels', 'labels', false)
on conflict (id) do nothing;

create policy labels_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

create policy labels_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

create policy labels_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

create policy labels_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);
