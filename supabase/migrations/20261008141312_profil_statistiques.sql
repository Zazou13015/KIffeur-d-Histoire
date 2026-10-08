-- #25 : migration préparée uniquement ; GO explicite requis avant production.
-- Instantané des filtres réellement choisis. NULL = contexte ancien inconnu.
alter table histoire.games add column context jsonb;
comment on column histoire.games.context is 'Filtres choisis au lancement ; aucun rattachement reconstruit pour les anciennes parties.';

create or replace function histoire.start_game(
  p_token text default null,
  p_pack_id text default null,
  p_tag_id text default null,
  p_year_min integer default null,
  p_year_max integer default null,
  p_level_id text default null,
  p_chapter_ids text[] default null,
  p_difficulty text default 'YEAR',
  p_question_count integer default 10,
  p_direction text default 'date'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games;
  picked jsonb;
  player_id uuid := auth.uid();
begin
  if p_direction is null or p_direction not in ('date', 'inverse')
    or p_difficulty is null or p_difficulty not in ('YEAR', 'MONTH', 'DAY')
    or p_question_count is null or p_question_count not between 1 and 100
    or p_year_min = 0 or p_year_max = 0 or p_year_min > p_year_max
    or (player_id is null and (p_token is null or p_token !~ '^[a-f0-9]{64}$'))
    or (p_tag_id is not null and not exists (
      select 1 from histoire.tags where id = p_tag_id and active and tag_type <> 'CENTURY'))
  then
    raise exception using errcode = '22023', message = 'Paramètres de partie invalides';
  end if;

  with candidates as (
    select e.id, e.title, e.image_path, a.start_year, a.start_month, a.start_day, a.description,
      row_number() over (
      partition by
        case when p_direction = 'date' then e.id end,
        a.start_year,
        case when p_direction = 'inverse' and p_difficulty in ('MONTH','DAY') then a.start_month end,
        case when p_direction = 'inverse' and p_difficulty = 'DAY' then a.start_day end
      order by random()
    ) as date_rank
    from histoire.events e join histoire.event_answers a on a.event_id = e.id
    where e.playable and a.start_year is not null
      and e.playable_mode in ('YEAR', 'MONTH', 'DAY', 'RANGE')
      and (p_difficulty = 'YEAR' or a.start_month is not null)
      and (p_difficulty <> 'DAY' or a.start_day is not null)
      and (p_year_min is null or a.start_year >= p_year_min)
      and (p_year_max is null or a.start_year <= p_year_max)
      and (p_pack_id is null or exists (
        select 1 from histoire.pack_events pe join histoire.packs p on p.id = pe.pack_id
        where pe.event_id = e.id and p.id = p_pack_id and p.active))
      and (p_tag_id is null or exists (
        select 1 from histoire.event_tags et where et.event_id = e.id and et.tag_id = p_tag_id))
      and (p_level_id is null or exists (
        select 1 from histoire.event_levels el where el.event_id = e.id and el.level_id = p_level_id))
      and (p_chapter_ids is null or exists (
        select 1 from histoire.event_chapters ec join histoire.chapters c on c.id = ec.chapter_id
        where ec.event_id = e.id and ec.chapter_id = any(p_chapter_ids)
          and (p_level_id is null or c.level_id = p_level_id)))
  )
  -- Tirage et instantané dans la même lecture : un import concurrent ne peut
  -- remplacer les dates entre la déduplication et l'enregistrement des questions.
  select jsonb_agg(to_jsonb(selected)) into picked from (
    select * from candidates where date_rank = 1 order by random() limit p_question_count
  ) selected;
  if coalesce(jsonb_array_length(picked), 0) < p_question_count then
    raise exception using errcode = '22023', message = 'Pas assez de questions pour ces filtres';
  end if;

  -- Le trigger #13 conserve purge, plafond global et expiration 24 h des anonymes.
  insert into histoire.games(user_id, anonymous_token_hash, difficulty, question_count, direction, context)
  values (player_id, case when player_id is null then sha256(convert_to(p_token, 'UTF8')) end,
    p_difficulty, p_question_count, p_direction,
    jsonb_build_object(
      'mode', case when p_level_id is not null or cardinality(p_chapter_ids) > 0 then 'solo_scolaire' else 'solo_libre' end,
      'level', (select name from histoire.levels where id = p_level_id),
      'pack', (select jsonb_build_object('key', id, 'label', title) from histoire.packs where id = p_pack_id),
      'theme', (select jsonb_build_object('key', id, 'label', name) from histoire.tags where id = p_tag_id),
      'chapters', coalesce((select jsonb_agg(jsonb_build_object('key', c.id, 'label', c.title, 'level', l.name) order by c.id)
        from histoire.chapters c join histoire.levels l on l.id = c.level_id
        where c.id = any(p_chapter_ids) and (p_level_id is null or c.level_id = p_level_id)), '[]'::jsonb)
    )) returning * into g;
  insert into histoire.game_questions(game_id, event_id, position, difficulty, title, image_path,
    expected_year, expected_month, expected_day, correction_description)
  select g.id, chosen.event->>'id', chosen.position, p_difficulty,
    chosen.event->>'title', chosen.event->>'image_path',
    (chosen.event->>'start_year')::integer, (chosen.event->>'start_month')::integer,
    (chosen.event->>'start_day')::integer, chosen.event->>'description'
  from jsonb_array_elements(picked) with ordinality chosen(event, position);
  return jsonb_build_object('game_id', g.id, 'question_count', g.question_count,
    'difficulty', g.difficulty, 'direction', g.direction, 'state', g.state, 'anonymous', player_id is null);
end;
$$;

-- Les tables gardent leurs RLS et restent sans droits de lecture directe.
-- SECURITY DEFINER est nécessaire pour lire les parties : identité obligatoire,
-- prédicat propriétaire systématique, search_path vide, aucun user_id en entrée.
create function histoire.player_history(p_cursor uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  player_id uuid := auth.uid();
  cursor_time timestamptz;
  result jsonb;
begin
  if player_id is null then
    raise exception using errcode = '42501', message = 'Connexion requise';
  end if;
  if p_cursor is not null then
    select finished_at into cursor_time from histoire.games
      where id = p_cursor and user_id = player_id and state = 'finished';
    if not found then
      raise exception using errcode = '42501', message = 'Historique inaccessible';
    end if;
  end if;
  with page as (
    select g.*, row_number() over (order by finished_at desc, id desc) as position
    from histoire.games g
    where user_id = player_id and state = 'finished'
      and (p_cursor is null or (finished_at, id) < (cursor_time, p_cursor))
    order by finished_at desc, id desc limit 21
  )
  select jsonb_build_object(
    'games', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'finished_at', finished_at, 'difficulty', difficulty,
      'mode', case when direction = 'inverse' then 'inverse' else coalesce(context->>'mode', 'solo_date') end,
      'question_count', question_count, 'total_points', total_points,
      'average_accuracy', average_accuracy,
      'pack', context->'pack'->>'label', 'theme', context->'theme'->>'label',
      'level', context->>'level',
      'chapters', coalesce((select jsonb_agg(jsonb_build_object('label', c->>'label', 'level', c->>'level'))
        from jsonb_array_elements(context->'chapters') c), '[]'::jsonb)
    ) order by finished_at desc, id desc) filter (where position <= 20), '[]'::jsonb),
    'next_cursor', case when count(*) > 20 then
      (select id from page where position = 20) else null end
  ) into result from page;
  return result;
end;
$$;

create function histoire.player_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare player_id uuid := auth.uid(); result jsonb;
begin
  if player_id is null then
    raise exception using errcode = '42501', message = 'Connexion requise';
  end if;
  with completed as materialized (
    select total_points, average_accuracy, finished_at, context,
      case when direction = 'inverse' then 'inverse' else coalesce(context->>'mode', 'solo_date') end as mode
    from histoire.games where user_id = player_id and state = 'finished'
  ), modes as (
    select mode, count(*) as games, round(avg(average_accuracy), 2) as average_accuracy,
      round(avg(total_points), 2) as average_score, max(total_points) as best_score
    from completed group by mode
  ), contexts as (
    select g.*, x.kind, x.item from completed g cross join lateral (
      select 'pack' as kind, context->'pack' as item where context->'pack'->>'key' is not null
      union all
      select 'theme', context->'theme' where context->'theme'->>'key' is not null
      union all
      select 'chapter', c from jsonb_array_elements(context->'chapters') c
    ) x
  ), per_context as (
    select kind, item->>'key' as key, max(item->>'label') as label, max(item->>'level') as level,
      count(*) as games, round(avg(average_accuracy), 2) as average_accuracy, max(total_points) as best_score
    from contexts group by kind, item->>'key'
  ), months as (
    select date_trunc('month', finished_at at time zone 'Europe/Paris')::date as month,
      count(*) as games, round(avg(average_accuracy), 2) as average_accuracy
    from completed group by 1 order by 1 desc limit 12
  )
  select jsonb_build_object(
    'games', count(*), 'average_accuracy', round(avg(average_accuracy), 2),
    'average_score', round(avg(total_points), 2), 'best_score', max(total_points),
    'modes', coalesce((select jsonb_agg(to_jsonb(m) order by mode) from modes m), '[]'::jsonb),
    'contexts', coalesce((select jsonb_agg(jsonb_build_object(
      'kind', kind, 'label', label, 'level', level, 'games', games,
      'average_accuracy', average_accuracy, 'best_score', best_score
    ) order by kind, label, key) from per_context), '[]'::jsonb),
    'accuracy_over_time', coalesce((select jsonb_agg(to_jsonb(m) order by month) from months m), '[]'::jsonb),
    'games_without_context', count(*) filter (where context is null)
  ) into result from completed;
  return result;
end;
$$;

revoke all on function histoire.player_history(uuid), histoire.player_stats() from public, anon, authenticated;
grant execute on function histoire.player_history(uuid), histoire.player_stats() to authenticated;
-- start_game garde exactement la signature et les permissions existantes.
insert into histoire.migrations_appliquees(version, nom) values ('20261008141312', 'profil_statistiques');
