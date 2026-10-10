-- #93 : PRÉPARÉE UNIQUEMENT. Autorisation d'Antonin requise avant KFFR et fusion.
-- Aucun score enregistré, schéma public/auth, budget ou test pédagogique modifié.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Projection INTERNE commune au décompte et aux deux signatures de start_game.
-- INVOKER : seuls les wrappers propriétaires des tables peuvent la lire.
create function histoire.solo_candidates(
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
      where pe.event_id = e.id and p.id = p_pack_id and p.active))
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
revoke all on function histoire.solo_candidates(integer, text, text, integer, integer, text, text[], text)
  from public, anon, authenticated;

-- Seuls trois nombres sortent. Aucun candidat, date, titre, alias ou identifiant privé.
create function histoire.available_questions(
  p_niveau integer default null, p_pack_id text default null, p_tag_id text default null,
  p_year_min integer default null, p_year_max integer default null,
  p_level_id text default null, p_chapter_ids text[] default null, p_direction text default 'date'
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if (p_niveau is not null and p_niveau not between 1 and 3)
    or p_direction is null or p_direction not in ('date', 'inverse')
    or p_year_min = 0 or p_year_max = 0 or p_year_min > p_year_max then
    raise exception using errcode = '22023', message = 'Paramètres de partie invalides';
  end if;
  return (with candidates as materialized (
    select * from histoire.solo_candidates(p_niveau, p_pack_id, p_tag_id, p_year_min,
      p_year_max, p_level_id, p_chapter_ids, 'YEAR')
  ) select jsonb_build_object(
    'YEAR', case when p_direction = 'date' then count(*) else count(distinct start_year) end,
    'MONTH', case when p_direction = 'date' then count(*) filter (where start_month is not null)
      else count(distinct (start_year, start_month)) filter (where start_month is not null) end,
    'DAY', case when p_direction = 'date' then count(*) filter (where start_month is not null and start_day is not null)
      else count(distinct (start_year, start_month, start_day)) filter (where start_month is not null and start_day is not null) end
  ) from candidates);
end;
$$;
revoke all on function histoire.available_questions(integer, text, text, integer, integer, text, text[], text)
  from public, anon, authenticated;
grant execute on function histoire.available_questions(integer, text, text, integer, integer, text, text[], text)
  to anon, authenticated;

-- 0 demande Tout ; la longueur STOCKÉE reste dans [1,100].
-- Déduplication, tirage et instantané restent dans la même requête.
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
  wanted integer;
  player_id uuid := auth.uid();
begin
  if p_direction is null or p_direction not in ('date', 'inverse')
    or p_difficulty is null or p_difficulty not in ('YEAR', 'MONTH', 'DAY')
    or p_question_count is null or p_question_count not between 0 and 100
    or p_year_min = 0 or p_year_max = 0 or p_year_min > p_year_max
    or (player_id is null and (p_token is null or p_token !~ '^[a-f0-9]{64}$'))
    or (p_tag_id is not null and not exists (
      select 1 from histoire.tags where id = p_tag_id and active and tag_type <> 'CENTURY'))
  then
    raise exception using errcode = '22023', message = 'Paramètres de partie invalides';
  end if;

  wanted := case when p_question_count = 0 then 100 else p_question_count end;
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
    from histoire.solo_candidates(null, p_pack_id, p_tag_id, p_year_min,
      p_year_max, p_level_id, p_chapter_ids, p_difficulty) e
    cross join lateral (select e.start_year, e.start_month, e.start_day, e.description) a
  )
  -- Tirage et instantané dans la même lecture : un import concurrent ne peut
  -- remplacer les dates entre la déduplication et l'enregistrement des questions.
  select jsonb_agg(to_jsonb(selected)) into picked from (
    select * from candidates where date_rank = 1 order by random() limit wanted
  ) selected;
  if coalesce(jsonb_array_length(picked), 0) = 0
    or (p_question_count > 0 and jsonb_array_length(picked) < p_question_count) then
    raise exception using errcode = '22023', message = 'Pas assez de questions pour ces filtres';
  end if;

  wanted := jsonb_array_length(picked);
  -- Le trigger #13 conserve purge, plafond global et expiration 24 h des anonymes.
  insert into histoire.games(user_id, anonymous_token_hash, difficulty, question_count, direction, context)
  values (player_id, case when player_id is null then sha256(convert_to(p_token, 'UTF8')) end,
    p_difficulty, wanted, p_direction,
    jsonb_build_object(
      'replay_filters', jsonb_strip_nulls(jsonb_build_object(
        'difficulty', p_difficulty, 'direction', p_direction, 'niveau', null,
        'questionCount', p_question_count, 'packId', p_pack_id, 'tagId', p_tag_id,
        'yearMin', p_year_min, 'yearMax', p_year_max, 'levelId', p_level_id, 'chapterIds', p_chapter_ids)),
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

create or replace function histoire.start_game(
  p_niveau integer,
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
  wanted integer;
  player_id uuid := auth.uid();
begin
  if p_niveau is null or p_niveau not between 1 and 3
    or p_direction is null or p_direction not in ('date', 'inverse')
    or p_difficulty is null or p_difficulty not in ('YEAR', 'MONTH', 'DAY')
    or p_question_count is null or p_question_count not between 0 and 100
    or p_year_min = 0 or p_year_max = 0 or p_year_min > p_year_max
    or (player_id is null and (p_token is null or p_token !~ '^[a-f0-9]{64}$'))
    or (p_tag_id is not null and not exists (
      select 1 from histoire.tags where id = p_tag_id and active and tag_type <> 'CENTURY'))
  then
    raise exception using errcode = '22023', message = 'Paramètres de partie invalides';
  end if;

  wanted := case when p_question_count = 0 then 100 else p_question_count end;
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
    from histoire.solo_candidates(p_niveau, p_pack_id, p_tag_id, p_year_min,
      p_year_max, p_level_id, p_chapter_ids, p_difficulty) e
    cross join lateral (select e.start_year, e.start_month, e.start_day, e.description) a
  )
  -- Tirage et instantané dans la même lecture : un import concurrent ne peut
  -- remplacer les dates entre la déduplication et l'enregistrement des questions.
  select jsonb_agg(to_jsonb(selected)) into picked from (
    select * from candidates where date_rank = 1 order by random() limit wanted
  ) selected;
  if coalesce(jsonb_array_length(picked), 0) = 0
    or (p_question_count > 0 and jsonb_array_length(picked) < p_question_count) then
    raise exception using errcode = '22023', message = 'Pas assez de questions pour ces filtres';
  end if;

  wanted := jsonb_array_length(picked);
  -- Le trigger #13 conserve purge, plafond global et expiration 24 h des anonymes.
  insert into histoire.games(user_id, anonymous_token_hash, difficulty, question_count, direction, context)
  values (player_id, case when player_id is null then sha256(convert_to(p_token, 'UTF8')) end,
    p_difficulty, wanted, p_direction,
    jsonb_build_object(
      'replay_filters', jsonb_strip_nulls(jsonb_build_object(
        'difficulty', p_difficulty, 'direction', p_direction, 'niveau', p_niveau,
        'questionCount', p_question_count, 'packId', p_pack_id, 'tagId', p_tag_id,
        'yearMin', p_year_min, 'yearMax', p_year_max, 'levelId', p_level_id, 'chapterIds', p_chapter_ids)),
      'mode', case when p_level_id is not null or cardinality(p_chapter_ids) > 0 then 'solo_scolaire' else 'solo_libre' end,
      'niveau', p_niveau,
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

-- Longueur réelle dans chaque question, y compris les bilans relus sans URL de lancement.
create or replace function histoire.next_question(p_game_id uuid, p_token text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games := histoire.lock_solo_game(p_game_id, p_token);
  q histoire.game_questions;
  duration numeric;
  server_time timestamptz;
  payload jsonb;
begin
  if g.state = 'finished' then return null; end if;
  select * into q from histoire.game_questions
    where game_id = g.id and answered_at is null order by position limit 1;
  if not found then return null; end if;
  if q.asked_at is null then
    select timer_seconds into strict duration from histoire.scoring_settings;
    server_time := clock_timestamp();
    update histoire.game_questions set asked_at = server_time, timer_seconds = duration,
      deadline = server_time + duration * interval '1 second'
    where id = q.id returning * into q;
  end if;
  payload := jsonb_build_object('question_id', q.id, 'position', q.position,
    'difficulty', q.difficulty, 'question_count', g.question_count, 'asked_at', q.asked_at, 'deadline', q.deadline,
    'server_time', clock_timestamp());
  if g.direction = 'inverse' then
    -- Aucune illustration autorisée explicitement dans le PRD inverse.
    return payload || histoire.question_date(q.expected_year, q.expected_month, q.expected_day, q.difficulty);
  end if;
  return payload || jsonb_build_object(
    -- Titre rédigé pour la question quand il existe ; sinon chiffres, mois et siècles masqués.
    'title', coalesce((select e.titre_question from histoire.events e where e.id = q.event_id),
      trim(regexp_replace(regexp_replace(q.title, '[0-9]+', '…', 'g'),
      '\m(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|[IVXLCDM]+e?\s+siècle)\M', '…', 'gi'))),
    'image_path', case when q.image_path = q.event_id || '.svg' then q.image_path end);
end;
$$;

-- Filtres de relance privés, uniquement après toutes les corrections.
create or replace function histoire.finish_game(p_game_id uuid, p_token text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games := histoire.lock_solo_game(p_game_id, p_token);
  recap jsonb;
begin
  if exists (select 1 from histoire.game_questions where game_id = g.id and answered_at is null) then
    raise exception using errcode = '22023', message = 'Il reste des questions sans réponse';
  end if;
  if g.state <> 'finished' then
    update histoire.games set state = 'finished', finished_at = clock_timestamp(),
      average_accuracy = (select round(avg(accuracy), 2) from histoire.game_questions where game_id = g.id),
      total_points = (select sum(points) from histoire.game_questions where game_id = g.id)
    where id = g.id returning * into g;
  end if;
  select jsonb_agg(jsonb_build_object('question_id', q.id, 'position', q.position,
    'title', q.title, 'answer', case when g.direction = 'inverse' then to_jsonb(q.answer_text)
      else jsonb_build_object('year', q.answer_year, 'month', q.answer_month, 'day', q.answer_day) end,
    'correct_date', jsonb_build_object('year', q.expected_year, 'month', q.expected_month, 'day', q.expected_day),
    'description', q.correction_description, 'gap', q.gap, 'unit', q.unit,
    'accuracy', q.accuracy, 'points', q.points, 'expired', q.expired)
    || case when g.direction = 'inverse' then jsonb_build_object('direction', g.direction, 'correct', q.accuracy = 100)
      else '{}'::jsonb end order by q.position)
  into recap from histoire.game_questions q where q.game_id = g.id;
  return jsonb_build_object('game_id', g.id, 'state', g.state, 'question_count', g.question_count,
    'direction', g.direction, 'average_accuracy', g.average_accuracy, 'total_points', g.total_points, 'questions', recap,
    -- La partie est terminée et lock_solo_game a contrôlé son propriétaire/jeton.
    'replay_filters', case when g.context->>'origin' = 'test_chapitre' then
      jsonb_build_object('chapterTest', true, 'difficulty', g.difficulty,
        'chapterIds', jsonb_build_array(g.context->'chapters'->0->>'key'))
      else g.context->'replay_filters' end);
end;
$$;

-- Agrégats normalisés en lecture ; champs bruts historiques conservés.
create or replace function histoire.player_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare player_id uuid := auth.uid(); result jsonb;
begin
  if player_id is null then
    raise exception using errcode = '42501', message = 'Connexion requise';
  end if;
  with completed as materialized (
    select total_points, total_points::numeric / nullif(question_count, 0) as points_per_question, average_accuracy, finished_at, context,
      case when direction = 'inverse' then 'inverse' else coalesce(context->>'mode', 'solo_date') end as mode
    from histoire.games where user_id = player_id and state = 'finished'
  ), modes as (
    select mode, count(*) as games, round(avg(average_accuracy), 2) as average_accuracy,
      round(avg(total_points), 2) as average_score, max(total_points) as best_score,
      round(avg(points_per_question), 2) as average_points_per_question, round(max(points_per_question), 2) as best_points_per_question
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
      count(*) as games, round(avg(average_accuracy), 2) as average_accuracy, max(total_points) as best_score,
      round(max(points_per_question), 2) as best_points_per_question
    from contexts group by kind, item->>'key'
  ), months as (
    select date_trunc('month', finished_at at time zone 'Europe/Paris')::date as month,
      count(*) as games, round(avg(average_accuracy), 2) as average_accuracy
    from completed group by 1 order by 1 desc limit 12
  )
  select jsonb_build_object(
    'games', count(*), 'average_accuracy', round(avg(average_accuracy), 2),
    'average_score', round(avg(total_points), 2), 'best_score', max(total_points),
    'average_points_per_question', round(avg(points_per_question), 2),
    'best_points_per_question', round(max(points_per_question), 2),
    'modes', coalesce((select jsonb_agg(to_jsonb(m) order by mode) from modes m), '[]'::jsonb),
    'contexts', coalesce((select jsonb_agg(jsonb_build_object(
      'kind', kind, 'label', label, 'level', level, 'games', games,
      'average_accuracy', average_accuracy, 'best_score', best_score,
      'best_points_per_question', best_points_per_question
    ) order by kind, label, key) from per_context), '[]'::jsonb),
    'accuracy_over_time', coalesce((select jsonb_agg(to_jsonb(m) order by month) from months m), '[]'::jsonb),
    'games_without_context', count(*) filter (where context is null)
  ) into result from completed;
  return result;
end;
$$;

revoke all on function histoire.player_stats() from public, anon, authenticated;
grant execute on function histoire.player_stats() to authenticated;
-- CREATE OR REPLACE conserve les ACL de start_game. Aucun nouveau droit sur les tables.
insert into histoire.migrations_appliquees(version, nom) values ('20261010160346', 'longueur_parties');
notify pgrst, 'reload schema';
commit;
