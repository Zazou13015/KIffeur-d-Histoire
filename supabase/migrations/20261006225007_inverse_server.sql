-- #14 : un seul moteur, deux sens. Migration à déployer séparément après les GO.
alter table histoire.games add column direction text not null default 'date'
  check (direction in ('date', 'inverse'));
alter table histoire.game_questions add column answer_text text
  check (char_length(answer_text) <= 1000);

-- Format déterministe, sans dépendre de la locale ni de date_text (texte éditorial).
-- Les composantes plus précises que la difficulté ne quittent pas la base.
create function histoire.question_date(p_year integer, p_month integer, p_day integer, p_precision text)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  months text[] := array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  label text;
begin
  if p_year is null or p_year = 0 or p_precision is null or p_precision not in ('YEAR','MONTH','DAY')
    or (p_precision in ('MONTH','DAY') and (p_month is null or p_month not between 1 and 12))
    or (p_precision = 'DAY' and (p_day is null or p_day not between 1 and 31)) then
    raise exception using errcode = '22023', message = 'Date invalide';
  end if;
  label := abs(p_year::bigint)::text || case when p_year < 0 then ' av. J.-C.' else '' end;
  if p_precision in ('MONTH','DAY') then label := months[p_month] || ' ' || label; end if;
  if p_precision = 'DAY' then label := p_day::text || ' ' || label; end if;
  return jsonb_build_object('date', jsonb_build_object('year', p_year,
    'month', case when p_precision in ('MONTH','DAY') then p_month end,
    'day', case when p_precision = 'DAY' then p_day end),
    'date_label', label, 'date_precision', p_precision);
end;
$$;
revoke all on function histoire.question_date(integer, integer, integer, text) from public, anon, authenticated;

-- Remplacer les signatures, sans surcharge ambiguë pour PostgREST. Les paramètres
-- ajoutés à la fin ont des valeurs par défaut : les anciens appels date restent valides.
drop function histoire.start_game(text, text, text, integer, integer, text, text[], text, integer);
create function histoire.start_game(
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
  insert into histoire.games(user_id, anonymous_token_hash, difficulty, question_count, direction)
  values (player_id, case when player_id is null then sha256(convert_to(p_token, 'UTF8')) end,
    p_difficulty, p_question_count, p_direction) returning * into g;
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
    'difficulty', q.difficulty, 'asked_at', q.asked_at, 'deadline', q.deadline,
    'server_time', clock_timestamp());
  if g.direction = 'inverse' then
    -- Aucune illustration autorisée explicitement dans le PRD inverse.
    return payload || histoire.question_date(q.expected_year, q.expected_month, q.expected_day, q.difficulty);
  end if;
  return payload || jsonb_build_object(
    'title', trim(regexp_replace(regexp_replace(q.title, '[0-9]+', '…', 'g'),
      '\m(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|[IVXLCDM]+e?\s+siècle)\M', '…', 'gi')),
    'image_path', case when q.image_path = q.event_id || '.svg' then q.image_path end);
end;
$$;

drop function histoire.submit_answer(uuid, uuid, integer, integer, integer, text);
create function histoire.submit_answer(
  p_game_id uuid, p_question_id uuid,
  p_year integer default null, p_month integer default null, p_day integer default null,
  p_token text default null, p_answer_text text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games := histoire.lock_solo_game(p_game_id, p_token);
  q histoire.game_questions;
  r record;
  server_time timestamptz;
  elapsed numeric;
  current_duration numeric;
  timed_out boolean;
  accepted boolean;
  precision_value numeric;
  points_value integer;
  payload jsonb;
begin
  select * into q from histoire.game_questions where id = p_question_id and game_id = g.id;
  if not found or q.asked_at is null or q.answered_at is not null or g.state <> 'playing'
    or exists (select 1 from histoire.game_questions where game_id = g.id
      and position < q.position and answered_at is null) then
    raise exception using errcode = '22023', message = 'Question inactive ou déjà répondue';
  end if;
  server_time := clock_timestamp();
  timed_out := server_time > q.deadline;
  select timer_seconds into strict current_duration from histoire.scoring_settings;
  elapsed := extract(epoch from (server_time - q.asked_at)) / q.timer_seconds * current_duration;

  if g.direction = 'inverse' then
    if p_year is not null or p_month is not null or p_day is not null
      or char_length(p_answer_text) > 1000
      or (not timed_out and (p_answer_text is null or histoire.normalize_answer(p_answer_text) = '')) then
      raise exception using errcode = '22023', message = 'Réponse invalide';
    end if;
    -- Le seul event_id vient de la question active privée. Pas d'oracle indépendant.
    accepted := false;
    if not timed_out then
      accepted := histoire.check_event_answer(q.event_id, p_answer_text);
    end if;
    precision_value := case when accepted then 100 else 0 end;
    points_value := case when timed_out then 0 else histoire.score_points(precision_value, elapsed) end;
    update histoire.game_questions set answered_at = server_time, answer_text = p_answer_text,
      expired = timed_out, gap = null, unit = q.difficulty, accuracy = precision_value,
      points = least(100, greatest(0, points_value))
    where id = q.id returning * into q;
  else
    if p_answer_text is not null then
      raise exception using errcode = '22023', message = 'Réponse invalide';
    end if;
    if not timed_out then
      if p_year is null or p_year = 0 or p_year not between -10000000 and 10000000
        or (p_month is not null and p_month not between 1 and 12)
        or (p_day is not null and (p_month is null or p_day not between 1 and 31))
        or (q.difficulty in ('MONTH', 'DAY') and p_month is null)
        or (q.difficulty = 'DAY' and p_day is null)
      then raise exception using errcode = '22023', message = 'Date invalide'; end if;
      if p_day is not null then perform make_date(p_year, p_month, p_day); end if;
    end if;
    select * into r from histoire.score_answer(
      case when timed_out then null else p_year end, p_month, p_day,
      q.expected_year, q.expected_month, q.expected_day, q.difficulty, elapsed);
    update histoire.game_questions set answered_at = server_time,
      answer_year = p_year, answer_month = p_month, answer_day = p_day,
      expired = timed_out, gap = r.gap, unit = r.unit, accuracy = r.accuracy,
      points = least(100, greatest(0, r.points))
    where id = q.id returning * into q;
  end if;
  payload := jsonb_build_object('question_id', q.id,
    'correct_date', jsonb_build_object('year', q.expected_year, 'month', q.expected_month, 'day', q.expected_day),
    'gap', q.gap, 'unit', q.unit, 'accuracy', q.accuracy, 'points', q.points,
    'expired', q.expired, 'description', q.correction_description);
  if g.direction = 'inverse' then
    payload := payload || jsonb_build_object('direction', g.direction, 'title', q.title, 'correct', accepted);
  end if;
  return payload;
end;
$$;

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
    'direction', g.direction, 'average_accuracy', g.average_accuracy, 'total_points', g.total_points, 'questions', recap);
end;
$$;

-- Réaffirmer la fermeture du correcteur. Pas de nouvelle policy ni de droit de table.
revoke all on function histoire.check_event_answer(text, text) from public, anon, authenticated;
revoke all on function histoire.start_game(text, text, text, integer, integer, text, text[], text, integer, text),
  histoire.next_question(uuid, text), histoire.submit_answer(uuid, uuid, integer, integer, integer, text, text),
  histoire.finish_game(uuid, text) from public, anon, authenticated;
grant execute on function histoire.start_game(text, text, text, integer, integer, text, text[], text, integer, text),
  histoire.next_question(uuid, text), histoire.submit_answer(uuid, uuid, integer, integer, integer, text, text),
  histoire.finish_game(uuid, text) to anon, authenticated;

insert into histoire.migrations_appliquees(version, nom) values ('20261006225007', 'inverse_server');
