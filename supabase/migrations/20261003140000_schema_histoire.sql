-- Schéma dédié à Kiffeurs d'Histoire.
-- Ce projet Supabase est partagé avec KFFR contrée : on ne touche jamais au schéma public.

create schema if not exists histoire;

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

grant usage on schema histoire to anon, authenticated, service_role;
alter default privileges in schema histoire grant all on tables to service_role;
alter default privileges in schema histoire grant all on sequences to service_role;
alter default privileges in schema histoire grant execute on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Contenu historique
-- ---------------------------------------------------------------------------

create type histoire.date_precision as enum ('annee', 'mois', 'jour');

-- Les dates sont stockées en entiers (année négative = av. J.-C.) plutôt qu'en type date,
-- pour gérer simplement l'Antiquité et les événements connus seulement à l'année.
create table histoire.events (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  description text,
  year integer not null check (year <> 0),
  month smallint check (month between 1 and 12),
  day smallint check (day between 1 and 31),
  precision histoire.date_precision not null default 'annee',
  image_path text,
  difficulty smallint not null default 2 check (difficulty between 1 and 5),
  created_at timestamptz not null default now(),
  check (day is null or month is not null),
  check (precision <> 'mois' or month is not null),
  check (precision <> 'jour' or day is not null)
);

-- Formulations acceptées pour le mode inversé (« Guerre froide », « la guerre froide », …).
create table histoire.event_aliases (
  id bigint generated always as identity primary key,
  event_id bigint not null references histoire.events (id) on delete cascade,
  alias text not null,
  unique (event_id, alias)
);

create table histoire.themes (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text
);

create table histoire.event_themes (
  event_id bigint not null references histoire.events (id) on delete cascade,
  theme_id bigint not null references histoire.themes (id) on delete cascade,
  primary key (event_id, theme_id)
);

create index event_themes_theme_idx on histoire.event_themes (theme_id);
create index events_year_idx on histoire.events (year);

-- ---------------------------------------------------------------------------
-- Joueurs
-- ---------------------------------------------------------------------------

-- Profil propre à ce jeu. L'identité (email, mot de passe) vient de auth.users, partagée avec KFFR.
create table histoire.players (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sécurité (RLS)
-- ---------------------------------------------------------------------------

alter table histoire.events enable row level security;
alter table histoire.event_aliases enable row level security;
alter table histoire.themes enable row level security;
alter table histoire.event_themes enable row level security;
alter table histoire.players enable row level security;

grant select on histoire.events, histoire.themes, histoire.event_themes to anon, authenticated;
grant select, insert, update on histoire.players to authenticated;

create policy "contenu lisible par tous" on histoire.events for select using (true);
create policy "contenu lisible par tous" on histoire.themes for select using (true);
create policy "contenu lisible par tous" on histoire.event_themes for select using (true);
-- event_aliases : aucune policy, donc illisible depuis le navigateur (sinon on donnerait les réponses).

create policy "le joueur lit son profil" on histoire.players
  for select to authenticated using ((select auth.uid()) = id);
create policy "le joueur crée son profil" on histoire.players
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "le joueur modifie son profil" on histoire.players
  for update to authenticated using ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Correction tolérante du mode inversé
-- ---------------------------------------------------------------------------

-- Minuscules, sans accents, sans article en tête, sans ponctuation.
create or replace function histoire.normalize_answer(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(input, ''))), '[^a-z0-9 ]', ' ', 'g'),
      '^\s*(le|la|les|l|un|une|des)\s+', ''),
    '\s+', ' ', 'g'));
$$;

-- Vrai si la réponse correspond au titre ou à un alias de l'événement, fautes de frappe tolérées.
-- security definer : peut lire event_aliases sans que le navigateur y ait accès.
create or replace function histoire.check_event_answer(p_event_id bigint, p_answer text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select title as label from histoire.events where id = p_event_id
    union all
    select alias from histoire.event_aliases where event_id = p_event_id
  )
  select coalesce(bool_or(
    histoire.normalize_answer(label) = histoire.normalize_answer(p_answer)
    -- Seuil de tolérance aux fautes, à ajuster avec de vrais joueurs (0.6 accepte une faute sur « guerre froide »).
    or extensions.similarity(histoire.normalize_answer(label), histoire.normalize_answer(p_answer)) >= 0.6
  ), false)
  from candidates;
$$;

grant execute on function histoire.normalize_answer(text) to anon, authenticated;
grant execute on function histoire.check_event_answer(bigint, text) to anon, authenticated;
