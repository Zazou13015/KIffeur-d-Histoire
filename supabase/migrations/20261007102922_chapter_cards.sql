-- Issue #21 : contenu de révision public. Préparée et testée LOCAL uniquement.
-- Aucun accès supplémentaire aux réponses/alias du moteur de jeu.
create table histoire.chapter_cards (
  card_id text primary key check (card_id ~ '^CARD-[a-z0-9-]+$'),
  chapter_id text not null references histoire.chapters(id),
  event_id text references histoire.events(id),
  -- Copie exacte des repères v18 pour les événements ; bornes du libellé officiel
  -- pour le contexte. Les périodes purement textuelles restent sans fausse année.
  start_year integer check (start_year <> 0),
  start_month smallint check (start_month between 1 and 12),
  start_day smallint check (start_day between 1 and 31),
  end_year integer check (end_year <> 0),
  end_month smallint check (end_month between 1 and 12),
  end_day smallint check (end_day between 1 and 31),
  date_text text not null check (btrim(date_text) <> ''),
  date_precision text not null check (date_precision in
    ('DAY', 'MONTH', 'YEAR', 'DAY_RANGE', 'YEAR_RANGE', 'CENTURY', 'PERIOD_TEXT', 'MIXED_RANGE')),
  date_status text not null check (date_status in
    ('EXACT', 'CONVENTIONAL', 'APPROXIMATE', 'DISPUTED', 'TRADITIONAL')),
  title text not null check (btrim(title) <> ''),
  body text not null check (cardinality(regexp_split_to_array(btrim(body), E'\\s+')) between 60 and 120),
  takeaway text not null check (takeaway ~ '^À retenir : .+'),
  key_concepts text[] not null check (cardinality(key_concepts) between 1 and 6
    and array_position(key_concepts, null) is null and array_position(key_concepts, '') is null),
  -- Certains rattachements canoniques complémentaires n'ont pas de libellé.
  -- Conserver leur cellule vide plutôt qu'inventer un texte officiel.
  official_wording text not null,
  sources text[] not null check (cardinality(sources) > 0
    and array_position(sources, null) is null and array_position(sources, '') is null),
  sort_order integer not null check (sort_order > 0),
  unique (chapter_id, sort_order),
  foreign key (event_id, chapter_id) references histoire.event_chapters(event_id, chapter_id),
  check (start_month is null or start_year is not null),
  check (start_day is null or start_month is not null),
  check (end_month is null or end_year is not null),
  check (end_day is null or end_month is not null),
  check (end_year is null or (start_year is not null and
    (end_year, coalesce(end_month, 12), coalesce(end_day, 31)) >=
    (start_year, coalesce(start_month, 1), coalesce(start_day, 1)))),
  check (event_id is not null or btrim(official_wording) <> ''),
  check (event_id is not null or (
    start_month is null and start_day is null and end_month is null and end_day is null and (
      (date_precision = 'YEAR_RANGE' and date_status = 'CONVENTIONAL' and start_year is not null and end_year is not null)
      or (date_precision = 'PERIOD_TEXT' and date_status = 'APPROXIMATE' and start_year is null and end_year is null)
    )
  )),
  check (date_precision not in ('YEAR', 'MONTH', 'DAY', 'YEAR_RANGE', 'DAY_RANGE', 'MIXED_RANGE') or start_year is not null),
  check (date_precision <> 'MONTH' or start_month is not null),
  check (date_precision <> 'DAY' or start_day is not null),
  check (date_precision not in ('YEAR_RANGE', 'DAY_RANGE', 'MIXED_RANGE') or end_year is not null),
  check (date_precision <> 'DAY_RANGE' or (start_day is not null and end_day is not null))
);

create index chapter_cards_event_idx on histoire.chapter_cards(event_id);
alter table histoire.chapter_cards enable row level security;
revoke all on histoire.chapter_cards from public, anon, authenticated;
grant all on histoire.chapter_cards to service_role;

-- Table interne : aucune policy ni lecture directe anon/authenticated.
-- La projection publique ne permet pas la jointure event_id -> bonne date.
-- Aucune entrée par événement, aucun accès aux réponses ou alias du jeu.
create function histoire.get_chapter_cards(p_chapter_id text)
returns table (
  card_id text, chapter_id text, title text, body text, takeaway text,
  key_concepts text[], start_year integer, start_month smallint, start_day smallint,
  end_year integer, end_month smallint, end_day smallint, date_text text,
  sort_order integer
)
language sql stable security definer set search_path = '' as $$
  select c.card_id, c.chapter_id, c.title, c.body, c.takeaway, c.key_concepts,
    c.start_year, c.start_month, c.start_day, c.end_year, c.end_month, c.end_day,
    c.date_text, c.sort_order
  from histoire.chapter_cards c
  where c.chapter_id = p_chapter_id
  order by c.sort_order;
$$;
revoke all on function histoire.get_chapter_cards(text) from public, anon, authenticated;
grant execute on function histoire.get_chapter_cards(text) to anon, authenticated, service_role;

-- Une transaction pour les suppressions + insertions : pas de contenu partiel,
-- et les permutations de sort_order restent possibles lors des relectures.
-- Invoker, appelable uniquement par le rôle d'import (aucun privilège élevé).
create function histoire.replace_chapter_cards(p_cards jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_cards) is distinct from 'array' or jsonb_array_length(p_cards) = 0 then
    raise exception 'Lot de cartes vide ou invalide';
  end if;
  -- Sérialise deux imports simultanés sans laisser un lot mélangé.
  lock table histoire.chapter_cards in share row exclusive mode;
  delete from histoire.chapter_cards where chapter_id in
    (select c->>'chapter_id' from jsonb_array_elements(p_cards) c);
  insert into histoire.chapter_cards
    select * from jsonb_populate_recordset(null::histoire.chapter_cards, p_cards);
end;
$$;
revoke all on function histoire.replace_chapter_cards(jsonb) from public, anon, authenticated;
grant execute on function histoire.replace_chapter_cards(jsonb) to service_role;

insert into histoire.migrations_appliquees(version, nom)
values ('20261007102922', 'chapter_cards');
