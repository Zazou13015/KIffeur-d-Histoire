-- #89 : PRÉPARÉE UNIQUEMENT ; GO SQL séparé avant KFFR et fusion.
-- Dépend de #87/#93/#95/#104. Aucun contenu éditorial ajouté.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table histoire.packs add column parent_id text
  references histoire.packs(id) on delete restrict;
alter table histoire.packs add constraint packs_parent_distinct check (parent_id is distinct from id);
create index packs_parent_idx on histoire.packs(parent_id);

-- Une écriture réelle sérialise les mutations, y compris sous REPEATABLE READ
-- (où une transaction concurrente périmée sera refusée). Aucun accès API.
create table histoire.pack_hierarchy_lock (
  singleton boolean primary key default true check (singleton), revision bigint not null default 0
);
insert into histoire.pack_hierarchy_lock default values;
alter table histoire.pack_hierarchy_lock enable row level security;
revoke all on histoire.pack_hierarchy_lock from public,anon,authenticated;
create function histoire.check_pack_parent() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  update histoire.pack_hierarchy_lock set revision = revision + 1 where singleton;
  if exists (
    with recursive ancestors(id,parent_id) as (
      select id,parent_id from histoire.packs where id = new.parent_id
      union
      select p.id,p.parent_id from histoire.packs p join ancestors a on p.id = a.parent_id
    ) select 1 from ancestors where id = new.id
  ) then
    raise exception using errcode = '23514', message = 'Cycle de parenté interdit';
  end if;
  return new;
end;
$$;
revoke all on function histoire.check_pack_parent() from public,anon,authenticated;
create trigger packs_check_parent before insert or update of parent_id on histoire.packs
  for each row execute function histoire.check_pack_parent();

-- Arbre actif, déduplication par événement. Un retrait sur un chemin masque
-- cette branche ; le retrait du pack demandé masque toute son union.
-- Un enfant reste jouable directement si son parent est inactif.
create function histoire.pack_scope_events(p_pack_id text) returns table(event_id text)
language sql stable security invoker set search_path = '' as $$
  with recursive scope(id,path) as (
    select p.id,array[p.id] from histoire.packs p where p.id = p_pack_id and p.active
    union all
    select p.id,s.path || p.id from histoire.packs p join scope s on p.parent_id = s.id
      where p.active and not p.id = any(s.path)
  ) select distinct pe.event_id from scope s join histoire.pack_events pe on pe.pack_id = s.id
    where not exists (select 1 from histoire.pack_event_status status
      where status.pack_id = any(s.path) and status.event_id = pe.event_id and status.removed);
$$;
revoke all on function histoire.pack_scope_events(text) from public,anon,authenticated;

create or replace function histoire.solo_candidates(
  p_niveau integer, p_pack_id text, p_tag_id text, p_year_min integer, p_year_max integer,
  p_level_id text, p_chapter_ids text[], p_difficulty text
) returns table(id text, title text, image_path text, start_year integer, start_month integer,
  start_day integer, description text)
language sql stable security invoker set search_path = '' as $$
  select e.id, e.title, e.image_path, a.start_year, a.start_month::integer, a.start_day::integer, a.description
  from histoire.events e join histoire.event_answers a on a.event_id = e.id
  where e.playable and a.start_year is not null
    and (p_niveau is null or e.niveau <= p_niveau)
    and e.playable_mode in ('YEAR', 'MONTH', 'DAY', 'RANGE')
    and (p_difficulty = 'YEAR' or a.start_month is not null)
    and (p_difficulty <> 'DAY' or a.start_day is not null)
    and (p_year_min is null or a.start_year >= p_year_min)
    and (p_year_max is null or a.start_year <= p_year_max)
    and (p_pack_id is null or exists (
      select 1 from histoire.pack_scope_events(p_pack_id) scope where scope.event_id = e.id))
    and (p_tag_id is null or exists (
      select 1 from histoire.event_tags et join histoire.tags t on t.id = et.tag_id
      where et.event_id = e.id and t.id = p_tag_id and t.active and t.tag_type <> 'CENTURY'))
    and (p_level_id is null or exists (
      select 1 from histoire.event_levels el where el.event_id = e.id and el.level_id = p_level_id))
    and (p_chapter_ids is null or exists (
      select 1 from histoire.event_chapters ec join histoire.chapters c on c.id = ec.chapter_id
      where ec.event_id = e.id and ec.chapter_id = any(p_chapter_ids)
        and (p_level_id is null or c.level_id = p_level_id)))
$$;
revoke all on function histoire.solo_candidates(integer,text,text,integer,integer,text,text[],text)
  from public,anon,authenticated;

-- Métadonnées et agrégats seulement : aucune date précise, candidat ni alias.
create function histoire.playable_packs(p_niveau integer default 1,
  p_direction text default 'date',p_pack_id text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if p_niveau is null or p_niveau not between 1 and 3
    or p_direction is null or p_direction not in ('date','inverse') then
    raise exception using errcode = '22023', message = 'Paramètres invalides';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'titre',p.title,'description',coalesce(p.description,''),'parent_id',p.parent_id,
    'comptes',histoire.available_questions(p_niveau=>p_niveau,p_pack_id=>p.id,p_direction=>p_direction),
    'b',bounds.b) order by p.position nulls last,p.title,p.id),'[]'::jsonb)
    from histoire.packs p cross join lateral (
      select case when count(*) = 0 then null else jsonb_build_array(
        least(2000,greatest(-3500,floor((min(case when c.start_year < 0 then c.start_year + 1 else c.start_year end)-10)/10.0)*10)),
        greatest(-3470,least(2030,ceil((max(case when c.start_year < 0 then c.start_year + 1 else c.start_year end)+11)/10.0)*10))) end as b
      from histoire.solo_candidates(p_niveau,p.id,null,null,null,null,null,'YEAR') c
    ) bounds where p.active and (p_pack_id is null or p.id = p_pack_id));
end;
$$;
revoke all on function histoire.playable_packs(integer,text,text) from public,anon,authenticated;
grant execute on function histoire.playable_packs(integer,text,text) to anon,authenticated;

-- L'administration garde les associations directes et leurs actions #87/#104.
-- Le total de l'union est explicitement distinct de l'inventaire direct.
create or replace function histoire.admin_list_packs()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from histoire.admins where user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Accès réservé';
  end if;
  return (with playable as materialized (
    select id from histoire.solo_candidates(null,null,null,null,null,null,null,'YEAR')
  ), counts as (
    select p.id,p.title,p.active,p.position,p.parent_id,
      count(pe.event_id)::integer as total,
      count(pe.event_id) filter (where coalesce(s.removed,false))::integer as retired,
      count(c.id) filter (where p.active and not coalesce(s.removed,false))::integer as playable
    from histoire.packs p left join histoire.pack_events pe on pe.pack_id = p.id
      left join histoire.pack_event_status s on s.pack_id = pe.pack_id and s.event_id = pe.event_id
      left join playable c on c.id = pe.event_id group by p.id
  ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'active',active,
    'parent_id',parent_id,'total',total,'retired',retired,'playable',playable,
    'scope_playable',(histoire.available_questions(p_pack_id=>id)->>'YEAR')::integer)
    order by position nulls last,title,id),'[]'::jsonb) from counts);
end;
$$;

create or replace function histoire.start_mystery_game(
  p_token text default null, p_niveau integer default 1,
  p_difficulty text default 'YEAR', p_question_count integer default 10,
  p_direction text default 'date', p_pack_id text default null, p_tag_id text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  eligible jsonb;
  winner jsonb;
  game jsonb;
begin
  if p_niveau is null or p_niveau not between 1 and 3
    or p_difficulty is null or p_difficulty not in ('YEAR','MONTH','DAY')
    or p_question_count is null or p_question_count not in (0,5,10,20)
    or p_direction is null or p_direction not in ('date','inverse')
    or (p_pack_id is not null and p_tag_id is not null)
    or (auth.uid() is null and (p_token is null or p_token !~ '^[a-f0-9]{64}$')) then
    raise exception using errcode = '22023', message = 'Paramètres de partie invalides';
  end if;
  with candidates as materialized (
    select id,start_year,start_month,start_day
    from histoire.solo_candidates(p_niveau,null,null,null,null,null,null,p_difficulty)
  ), memberships as (
    select 'pack'::text as mode, p.id, p.title as titre,
      c.id as event_id, c.start_year, c.start_month, c.start_day
    from histoire.packs p
      cross join lateral histoire.pack_scope_events(p.id) scope
      join candidates c on c.id = scope.event_id
    where p.active
    union all
    select 'theme', t.id, t.name, c.id, c.start_year, c.start_month, c.start_day
    from candidates c join histoire.event_tags et on et.event_id = c.id
      join histoire.tags t on t.id = et.tag_id and t.active and t.tag_type = 'SEMANTIC_TOPIC'
  ), counts as (
    select mode,id,titre,
      case when p_direction = 'date' then count(distinct event_id)
        else count(distinct (start_year,
          case when p_difficulty in ('MONTH','DAY') then start_month end,
          case when p_difficulty = 'DAY' then start_day end)) end as n
    from memberships group by mode,id,titre
  )
  select jsonb_agg(jsonb_build_object('mode',mode,'id',id,'titre',titre) order by mode,id)
    into eligible from counts where n >= case when p_question_count = 0 then 1 else p_question_count end;
  select x into winner from jsonb_array_elements(coalesce(eligible,'[]'::jsonb)) as items(x)
    where (p_pack_id is null or (x->>'mode' = 'pack' and x->>'id' = p_pack_id))
      and (p_tag_id is null or (x->>'mode' = 'theme' and x->>'id' = p_tag_id))
    order by random() limit 1;
  if winner is null then
    raise exception using errcode = '22023', message = 'Pas assez de questions pour ces filtres';
  end if;
  game := histoire.start_game(p_niveau=>p_niveau,p_token=>p_token,
    p_pack_id=>case when winner->>'mode' = 'pack' then winner->>'id' end,
    p_tag_id=>case when winner->>'mode' = 'theme' then winner->>'id' end,
    p_difficulty=>p_difficulty,p_question_count=>p_question_count,p_direction=>p_direction);
  update histoire.games set context = jsonb_set(context, '{replay_filters}',
    context->'replay_filters' || jsonb_build_object('mystery',true,'mysteryLabel',winner->>'titre'))
    where id = (game->>'game_id')::uuid;
  return game || jsonb_build_object('mystery',jsonb_build_object('winner',winner,'candidates',eligible));
end;
$$;
-- CREATE OR REPLACE conserve les droits de #95 ; les rappeler explicitement.
revoke all on function histoire.start_mystery_game(text,integer,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function histoire.start_mystery_game(text,integer,text,integer,text,text,text) to anon,authenticated;

insert into histoire.migrations_appliquees(version,nom) values ('20261010235740','sous_packs');
notify pgrst, 'reload schema';
commit;
