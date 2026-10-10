-- #95 : PRÉPARÉE UNIQUEMENT, ne pas appliquer sans GO explicite.
-- Dépend de solo_candidates et du moteur de longueur #93.
-- Aucun changement de table, policy, moteur de score ou droit existant.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Une lecture groupée, puis le moteur existant. Aucun appel par pack/thème.
-- Aucun intervalle temporel ni événement/date/réponse n'est exposé.
create function histoire.start_mystery_game(
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

  -- Une relance explicite garde le même thème ; aucun remplacement silencieux.
  select x into winner from jsonb_array_elements(coalesce(eligible,'[]'::jsonb)) as items(x)
    where (p_pack_id is null or (x->>'mode' = 'pack' and x->>'id' = p_pack_id))
      and (p_tag_id is null or (x->>'mode' = 'theme' and x->>'id' = p_tag_id))
    order by random() limit 1;
  if winner is null then
    raise exception using errcode = '22023', message = 'Pas assez de questions pour ces filtres';
  end if;

  -- Le moteur revalide la disponibilité et fige les questions. En cas de retrait
  -- concurrent, la transaction échoue : aucune animation n'annonce un faux gagnant.
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
revoke all on function histoire.start_mystery_game(text,integer,text,integer,text,text,text)
  from public,anon,authenticated;
grant execute on function histoire.start_mystery_game(text,integer,text,integer,text,text,text)
  to anon,authenticated;

insert into histoire.migrations_appliquees(version,nom) values ('20261010184125','theme_mystere');
notify pgrst, 'reload schema';
commit;
