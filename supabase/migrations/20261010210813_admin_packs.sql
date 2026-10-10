-- #87 : PRÉPARÉE UNIQUEMENT. GO explicite d'Antonin avant toute application sur KFFR.
-- Dépend des migrations #93 (solo_candidates) et #95 (start_mystery_game).
-- Aucun changement hors histoire, aucune nouvelle lecture publique de réponses.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- État privé séparé des associations publiques : pas de motif/compte exposé.
-- Une absence de ligne signifie que l'association n'a jamais été retirée.
create table histoire.pack_event_status (
  pack_id text not null,
  event_id text not null,
  removed boolean not null,
  primary key (pack_id, event_id)
);
-- Pas de FK/cascade : l'import synchronise et peut retirer des associations.
-- Un retour de la même association doit conserver son retrait. La RPC vérifie
-- et verrouille son existence avant de créer/modifier cet état privé.
create table histoire.pack_event_audit (
  id bigint generated always as identity primary key,
  pack_id text not null,
  event_id text not null,
  admin_id uuid not null,
  occurred_at timestamptz not null default clock_timestamp(),
  operation text not null check (operation in ('retirer', 'remettre')),
  reason text check (char_length(reason) <= 1000)
);
-- Pas de cascade vers l'audit : les identifiants survivent à un import ultérieur.
create index pack_event_audit_membership_idx
  on histoire.pack_event_audit(pack_id, event_id, id desc);
alter table histoire.pack_event_status enable row level security;
alter table histoire.pack_event_audit enable row level security;
revoke all on histoire.pack_event_status, histoire.pack_event_audit from public, anon, authenticated;
revoke all on sequence histoire.pack_event_audit_id_seq from public, anon, authenticated;

-- Même contrat et mêmes ACL que #93. Le retrait concerne uniquement le pack demandé.
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
      select 1 from histoire.pack_events pe join histoire.packs p on p.id = pe.pack_id
      where pe.event_id = e.id and p.id = p_pack_id and p.active
        and not exists (select 1 from histoire.pack_event_status s
          where s.pack_id = pe.pack_id and s.event_id = pe.event_id and s.removed)))
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

create function histoire.admin_list_packs()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from histoire.admins where user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Accès réservé';
  end if;
  return (with playable as materialized (
    select id from histoire.solo_candidates(null,null,null,null,null,null,null,'YEAR')
  ), counts as (
    select p.id,p.title,p.active,p.position,
      count(pe.event_id)::integer as total,
      count(pe.event_id) filter (where coalesce(s.removed,false))::integer as retired,
      count(c.id) filter (where p.active and not coalesce(s.removed,false))::integer as playable
    from histoire.packs p left join histoire.pack_events pe on pe.pack_id = p.id
      left join histoire.pack_event_status s on s.pack_id = pe.pack_id and s.event_id = pe.event_id
      left join playable c on c.id = pe.event_id
    group by p.id
  ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'active',active,
    'total',total,'retired',retired,'playable',playable) order by position nulls last,title,id),'[]'::jsonb)
    from counts);
end;
$$;

create function histoire.admin_pack_questions(p_pack_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from histoire.admins where user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Accès réservé';
  end if;
  if p_pack_id is null or not exists (select 1 from histoire.packs where id = p_pack_id) then
    raise exception using errcode = '22023', message = 'Pack inconnu';
  end if;
  return (with playable as materialized (
    select id from histoire.solo_candidates(null,p_pack_id,null,null,null,null,null,'YEAR')
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'title',e.title,'niveau',e.niveau,'date_text',a.date_text,
    'start_year',a.start_year,'start_month',a.start_month,'start_day',a.start_day,
    'end_year',a.end_year,'end_month',a.end_month,'end_day',a.end_day,
    'removed',coalesce(s.removed,false),'playable',c.id is not null,
    'last_change',case when audit.id is not null then jsonb_build_object(
      'admin_id',audit.admin_id,'occurred_at',audit.occurred_at,
      'operation',audit.operation,'reason',audit.reason) end
  ) order by pe.position,e.id),'[]'::jsonb)
    from histoire.pack_events pe join histoire.events e on e.id = pe.event_id
      left join histoire.event_answers a on a.event_id = e.id
      left join histoire.pack_event_status s on s.pack_id = pe.pack_id and s.event_id = pe.event_id
      left join playable c on c.id = e.id
      left join lateral (select * from histoire.pack_event_audit h
        where h.pack_id = pe.pack_id and h.event_id = pe.event_id order by h.id desc limit 1) audit on true
    where pe.pack_id = p_pack_id);
end;
$$;

-- Helper interne : contrôle réel de l'identité, verrou par association, audit atomique.
-- INVOKER : accessible seulement depuis les wrappers DEFINER, pas par les rôles API.
create function histoire.admin_change_pack_event(
  p_pack_id text,p_event_id text,p_removed boolean,p_reason text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  player_id uuid := auth.uid();
  was_removed boolean;
  changed boolean;
begin
  if player_id is null or not exists (select 1 from histoire.admins where user_id = player_id) then
    raise exception using errcode = '42501', message = 'Accès réservé';
  end if;
  if p_removed is null or char_length(p_reason) > 1000 then
    raise exception using errcode = '22023', message = 'Paramètres invalides';
  end if;
  perform 1 from histoire.pack_events where pack_id = p_pack_id and event_id = p_event_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'Question absente du pack';
  end if;
  select removed into was_removed from histoire.pack_event_status
    where pack_id = p_pack_id and event_id = p_event_id;
  changed := coalesce(was_removed,false) <> p_removed;
  if changed then
    insert into histoire.pack_event_status(pack_id,event_id,removed) values (p_pack_id,p_event_id,p_removed)
      on conflict (pack_id,event_id) do update set removed = excluded.removed;
    insert into histoire.pack_event_audit(pack_id,event_id,admin_id,operation,reason)
      values (p_pack_id,p_event_id,player_id,case when p_removed then 'retirer' else 'remettre' end,
        nullif(btrim(p_reason),''));
  end if;
  -- Un seul aller-retour réseau ; état et décomptes sont relus après l'écriture.
  return jsonb_build_object('changed',changed,'packs',histoire.admin_list_packs(),
    'questions',histoire.admin_pack_questions(p_pack_id));
end;
$$;

create function histoire.admin_remove_pack_event(p_pack_id text,p_event_id text,p_reason text default null)
returns jsonb language sql security definer set search_path = '' as $$
  select histoire.admin_change_pack_event(p_pack_id,p_event_id,true,p_reason)
$$;
create function histoire.admin_restore_pack_event(p_pack_id text,p_event_id text,p_reason text default null)
returns jsonb language sql security definer set search_path = '' as $$
  select histoire.admin_change_pack_event(p_pack_id,p_event_id,false,p_reason)
$$;

revoke all on function histoire.admin_change_pack_event(text,text,boolean,text) from public,anon,authenticated;
revoke all on function histoire.admin_list_packs(), histoire.admin_pack_questions(text),
  histoire.admin_remove_pack_event(text,text,text), histoire.admin_restore_pack_event(text,text,text)
  from public,anon,authenticated;
grant execute on function histoire.admin_list_packs(), histoire.admin_pack_questions(text),
  histoire.admin_remove_pack_event(text,text,text), histoire.admin_restore_pack_event(text,text,text)
  to authenticated;

-- La roulette commence avec des candidats globaux : filtrer les associations
-- de packs ici aussi, sans exclure les mêmes événements de leurs autres thèmes.
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
    from candidates c join histoire.pack_events pe on pe.event_id = c.id
      join histoire.packs p on p.id = pe.pack_id and p.active
    where not exists (select 1 from histoire.pack_event_status s
      where s.pack_id = pe.pack_id and s.event_id = pe.event_id and s.removed)
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

insert into histoire.migrations_appliquees(version,nom) values ('20261010210813','admin_packs');
notify pgrst, 'reload schema';
commit;
