-- Modèle de données aligné sur le dataset v18 d'Antonin (issue #5).
-- Remplace les tables de contenu de la première version (events, event_aliases, themes, event_themes) :
-- elles ne contenaient que les 10 événements de test, que l'import du dataset (issue #6) remplacera.
-- Les joueurs (histoire.players) ne sont pas touchés.
--
-- Règle de sécurité : tout ce qui donne la réponse (dates, alias, description qui cite souvent la date)
-- vit dans des tables sans aucun droit pour le navigateur. Seules des fonctions `security definer`
-- peuvent les lire.

drop function if exists histoire.check_event_answer(bigint, text);
drop table if exists histoire.event_themes;
drop table if exists histoire.themes;
drop table if exists histoire.event_aliases;
drop table if exists histoire.events;
drop type if exists histoire.date_precision;

-- ---------------------------------------------------------------------------
-- Événements : partie lisible par le navigateur
-- ---------------------------------------------------------------------------

-- Codes repris tels quels du dataset (voir content/dataset-v18/kiffeurs-gameplay-rules-v18.csv).
create table histoire.events (
  id text primary key check (id ~ '^EVT-[0-9]+$'),           -- identifiant d'Antonin, ex. EVT-0173
  title text not null,
  event_type text not null check (event_type in ('POINT', 'EVENT', 'PERIOD', 'PROCESS')),
  -- Précision connue de la date : DAY, MONTH, YEAR, DAY_RANGE, YEAR_RANGE, CENTURY, PERIOD_TEXT, MIXED_RANGE.
  precision text not null check (precision in
    ('DAY', 'MONTH', 'YEAR', 'DAY_RANGE', 'YEAR_RANGE', 'CENTURY', 'PERIOD_TEXT', 'MIXED_RANGE')),
  date_status text not null check (date_status in ('EXACT', 'CONVENTIONAL', 'APPROXIMATE', 'DISPUTED', 'TRADITIONAL')),
  playable boolean not null,
  -- Comment poser la question : au jour, au mois, à l'année, sur une plage, ou pas de question automatique.
  playable_mode text not null check (playable_mode in ('DAY', 'MONTH', 'YEAR', 'RANGE', 'NOT_AUTOMATIC')),
  importance smallint not null check (importance between 1 and 5),
  difficulty smallint not null check (difficulty between 1 and 5),
  image_path text,
  source_status text,                                         -- CERTIFIED_A, SUPPORTED_B, SUPPORTED_C
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (playable = (playable_mode <> 'NOT_AUTOMATIC'))
);

create index events_playable_idx on histoire.events (playable, importance desc);

-- ---------------------------------------------------------------------------
-- Événements : réponses, jamais lisibles par le navigateur
-- ---------------------------------------------------------------------------

-- Dates en entiers (année négative = av. J.-C., pas d'année 0) pour gérer l'Antiquité et les dates
-- connues seulement à l'année. Début obligatoire sauf pour les événements non jouables (« VIIIe siècle »…).
create table histoire.event_answers (
  event_id text primary key references histoire.events (id) on delete cascade,
  start_year integer check (start_year <> 0),
  start_month smallint check (start_month between 1 and 12),
  start_day smallint check (start_day between 1 and 31),
  end_year integer check (end_year <> 0),
  end_month smallint check (end_month between 1 and 12),
  end_day smallint check (end_day between 1 and 31),
  date_text text,                                             -- date en toutes lettres, ex. « 14 juillet 1789 »
  secondary_dates text,
  calendar_system text,
  -- La description courte cite la date dans 3 cas sur 4 : elle n'est montrée qu'à la correction.
  description text,
  notes text,
  check (start_month is not null or start_day is null),
  check (end_month is not null or end_day is null),
  check (end_year is null or start_year is not null)
);

-- Formulations acceptées pour le mode inversé (« Guerre froide », « Cold War »…).
create table histoire.event_aliases (
  event_id text not null references histoire.events (id) on delete cascade,
  alias text not null,
  primary key (event_id, alias)
);

-- ---------------------------------------------------------------------------
-- Programme scolaire
-- ---------------------------------------------------------------------------

create table histoire.levels (
  id text primary key,                                        -- ex. 3e, terminale-hggsp
  name text not null unique,                                  -- libellé du dataset, ex. « Terminale HGGSP »
  cycle text not null check (cycle in ('primaire', 'college', 'lycee')),
  position smallint not null unique                           -- ordre d'affichage, du CM1 à la terminale
);

-- Niveaux où l'événement est au programme (colonne levels_seen du dataset).
create table histoire.event_levels (
  event_id text not null references histoire.events (id) on delete cascade,
  level_id text not null references histoire.levels (id) on delete cascade,
  primary key (event_id, level_id)
);

create index event_levels_level_idx on histoire.event_levels (level_id);

-- Chapitres (« thèmes » du programme dans le dataset), ex. THM-001.
create table histoire.chapters (
  id text primary key,
  level_id text not null references histoire.levels (id),
  school_year text not null,                                  -- ex. 2026-2027
  program_scope text not null,                                -- Tronc commun, HGGSP
  title text not null
);

create index chapters_level_idx on histoire.chapters (level_id);

create table histoire.event_chapters (
  event_id text not null references histoire.events (id) on delete cascade,
  chapter_id text not null references histoire.chapters (id) on delete cascade,
  curriculum_status text,                                     -- PROGRAMME_BO, REPERE_EDUSCOL, PPO_BO…
  primary key (event_id, chapter_id)
);

create index event_chapters_chapter_idx on histoire.event_chapters (chapter_id);

-- ---------------------------------------------------------------------------
-- Packs prêts à jouer et tags
-- ---------------------------------------------------------------------------

create table histoire.packs (
  id text primary key,                                        -- ex. COL-0059
  slug text not null unique,
  title text not null,
  description text,
  target_size integer,
  active boolean not null default true,
  position smallint
);

create table histoire.pack_events (
  pack_id text not null references histoire.packs (id) on delete cascade,
  event_id text not null references histoire.events (id) on delete cascade,
  position integer not null,
  primary key (pack_id, event_id)
);

create index pack_events_event_idx on histoire.pack_events (event_id);

-- Tags : thème, géographie, siècle, série (JO, Coupes du monde…), niveau…
create table histoire.tags (
  id text primary key,                                        -- ex. TAG-0001
  slug text not null unique,
  name text not null,
  tag_type text not null,                                     -- GEOGRAPHY, CENTURY, SERIES, SEMANTIC_TOPIC…
  description text,
  active boolean not null default true
);

create table histoire.event_tags (
  event_id text not null references histoire.events (id) on delete cascade,
  tag_id text not null references histoire.tags (id) on delete cascade,
  confidence text not null default 'HIGH' check (confidence in ('HIGH', 'MEDIUM')),
  primary key (event_id, tag_id)
);

create index event_tags_tag_idx on histoire.event_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Sécurité (RLS)
-- ---------------------------------------------------------------------------

alter table histoire.events enable row level security;
alter table histoire.event_answers enable row level security;
alter table histoire.event_aliases enable row level security;
alter table histoire.levels enable row level security;
alter table histoire.event_levels enable row level security;
alter table histoire.chapters enable row level security;
alter table histoire.event_chapters enable row level security;
alter table histoire.packs enable row level security;
alter table histoire.pack_events enable row level security;
alter table histoire.tags enable row level security;
alter table histoire.event_tags enable row level security;

-- Réponses : aucun droit ni aucune policy pour le navigateur.
revoke all on histoire.event_answers, histoire.event_aliases from anon, authenticated;

grant select on
  histoire.events, histoire.levels, histoire.event_levels, histoire.chapters, histoire.event_chapters,
  histoire.packs, histoire.pack_events, histoire.tags, histoire.event_tags
to anon, authenticated;

create policy "contenu lisible par tous" on histoire.events for select using (true);
create policy "contenu lisible par tous" on histoire.levels for select using (true);
create policy "contenu lisible par tous" on histoire.event_levels for select using (true);
create policy "contenu lisible par tous" on histoire.chapters for select using (true);
create policy "contenu lisible par tous" on histoire.event_chapters for select using (true);
create policy "contenu lisible par tous" on histoire.packs for select using (true);
create policy "contenu lisible par tous" on histoire.pack_events for select using (true);
create policy "contenu lisible par tous" on histoire.tags for select using (true);
-- Un tag de siècle sur un événement donne presque la réponse : on ne publie que les autres.
create policy "tags sans indice de date lisibles par tous" on histoire.event_tags for select using (
  exists (select 1 from histoire.tags t where t.id = tag_id and t.tag_type <> 'CENTURY')
);

-- ---------------------------------------------------------------------------
-- Niveaux scolaires (liste fixe, libellés identiques à ceux du dataset)
-- ---------------------------------------------------------------------------

insert into histoire.levels (id, name, cycle, position) values
  ('cm1', 'CM1', 'primaire', 1),
  ('cm2', 'CM2', 'primaire', 2),
  ('6e', '6e', 'college', 3),
  ('5e', '5e', 'college', 4),
  ('4e', '4e', 'college', 5),
  ('3e', '3e', 'college', 6),
  ('seconde', 'Seconde générale et technologique', 'lycee', 7),
  ('premiere', 'Première générale', 'lycee', 8),
  ('premiere-hggsp', 'Première HGGSP', 'lycee', 9),
  ('terminale', 'Terminale générale', 'lycee', 10),
  ('terminale-hggsp', 'Terminale HGGSP', 'lycee', 11);

-- ---------------------------------------------------------------------------
-- Correction tolérante du mode inversé (identifiant texte désormais)
-- ---------------------------------------------------------------------------

-- Vrai si la réponse correspond au titre ou à un alias de l'événement, fautes de frappe tolérées.
-- security definer : peut lire event_aliases sans que le navigateur y ait accès.
create function histoire.check_event_answer(p_event_id text, p_answer text)
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

grant execute on function histoire.check_event_answer(text, text) to anon, authenticated;

insert into histoire.migrations_appliquees (version, nom) values ('20261006084353', 'modele_dataset_v18');
