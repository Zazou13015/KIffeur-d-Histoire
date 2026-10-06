-- Moteur solo (issue #13). Toutes les données de partie sont privées, y compris
-- le tirage futur. Les quatre RPC sont les seules portes d'entrée du navigateur.
create table histoire.games (
  id uuid primary key default gen_random_uuid(),
  -- Pas de modification ni de fixture dans auth : identité issue du JWT validé par Supabase.
  user_id uuid,
  anonymous_token_hash bytea,
  difficulty text not null check (difficulty in ('YEAR', 'MONTH', 'DAY')),
  question_count integer not null check (question_count between 1 and 100),
  state text not null default 'playing' check (state in ('playing', 'finished')),
  created_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  average_accuracy numeric,
  total_points integer,
  check ((user_id is null) = (anonymous_token_hash is not null))
);

create table histoire.game_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references histoire.games(id) on delete cascade,
  event_id text not null references histoire.events(id),
  position integer not null check (position > 0),
  difficulty text not null check (difficulty in ('YEAR', 'MONTH', 'DAY')),
  -- Instantané privé : un import ultérieur ne change pas la correction du tirage.
  title text not null,
  image_path text,
  expected_year integer not null,
  expected_month integer,
  expected_day integer,
  correction_description text,
  asked_at timestamptz,
  deadline timestamptz,
  timer_seconds numeric,
  answered_at timestamptz,
  answer_year integer,
  answer_month integer,
  answer_day integer,
  expired boolean,
  gap integer,
  unit text,
  accuracy numeric check (accuracy between 0 and 100),
  points integer check (points between 0 and 100),
  unique (game_id, position),
  unique (game_id, event_id),
  check ((asked_at is null) = (deadline is null)),
  check (deadline is null or deadline > asked_at)
);
create index games_user_idx on histoire.games(user_id) where user_id is not null;
alter table histoire.games enable row level security;
alter table histoire.game_questions enable row level security;
revoke all on histoire.games, histoire.game_questions from public, anon, authenticated;
-- Aucune policy : même le propriétaire utilise les RPC et ne choisit jamais son score.
-- L'ancien correcteur inversé sans partie permet de sonder les alias (certains
-- contiennent une date). Il devient interne ; #14 l'utilisera après autorisation.
revoke execute on function histoire.check_event_answer(text, text) from public, anon, authenticated;

-- Verrou commun : l'autorisation et toutes les transitions sont atomiques.
create function histoire.lock_solo_game(p_game_id uuid, p_token text)
returns histoire.games
language plpgsql security definer set search_path = '' as $$
declare g histoire.games;
begin
  select * into g from histoire.games where id = p_game_id for update;
  if not found or not coalesce(
    (g.user_id is not null and g.user_id = auth.uid())
    or (g.user_id is null and g.anonymous_token_hash = sha256(convert_to(p_token, 'UTF8'))), false)
  then
    raise exception using errcode = '42501', message = 'Partie inaccessible';
  end if;
  return g;
end;
$$;

create function histoire.start_game(
  p_token text default null,
  p_pack_id text default null,
  p_tag_id text default null,
  p_year_min integer default null,
  p_year_max integer default null,
  p_level_id text default null,
  p_chapter_ids text[] default null,
  p_difficulty text default 'YEAR',
  p_question_count integer default 10
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games;
  picked text[];
  player_id uuid := auth.uid();
begin
  if p_difficulty is null or p_difficulty not in ('YEAR', 'MONTH', 'DAY')
    or p_question_count is null or p_question_count not between 1 and 100
    or p_year_min = 0 or p_year_max = 0 or p_year_min > p_year_max
    or (player_id is null and (p_token is null or p_token !~ '^[a-f0-9]{64}$'))
    -- Les tags de siècle sont privés sur un événement. Ils ne servent pas de filtre/oracle.
    or (p_tag_id is not null and not exists (
      select 1 from histoire.tags where id = p_tag_id and active and tag_type <> 'CENTURY'))
  then
    raise exception using errcode = '22023', message = 'Paramètres de partie invalides';
  end if;

  select array_agg(id) into picked from (
    select e.id from histoire.events e join histoire.event_answers a on a.event_id = e.id
    where e.playable and a.start_year is not null
      -- Les plages utilisent leur début. Jamais de précision inventée.
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
    order by random() limit p_question_count
  ) candidates;
  if coalesce(cardinality(picked), 0) < p_question_count then
    -- Ne renvoie ni dates ni liste de candidats ni décompte privé.
    raise exception using errcode = '22023', message = 'Pas assez de questions pour ces filtres';
  end if;

  insert into histoire.games(user_id, anonymous_token_hash, difficulty, question_count)
  values (player_id, case when player_id is null then sha256(convert_to(p_token, 'UTF8')) end,
    p_difficulty, p_question_count) returning * into g;
  insert into histoire.game_questions(game_id, event_id, position, difficulty, title, image_path,
    expected_year, expected_month, expected_day, correction_description)
  select g.id, e.id, chosen.position, p_difficulty, e.title, e.image_path,
    a.start_year, a.start_month, a.start_day, a.description
  from unnest(picked) with ordinality chosen(event_id, position)
  join histoire.events e on e.id = chosen.event_id
  join histoire.event_answers a on a.event_id = e.id;
  return jsonb_build_object('game_id', g.id, 'question_count', g.question_count,
    'difficulty', g.difficulty, 'state', g.state, 'anonymous', player_id is null);
end;
$$;

create function histoire.next_question(p_game_id uuid, p_token text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games := histoire.lock_solo_game(p_game_id, p_token);
  q histoire.game_questions;
  duration numeric;
  server_time timestamptz;
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
  -- Liste blanche. Pas d'event_id, de tags, de date, d'alias, ni de description privée.
  -- Les titres publics peuvent citer une date (« Appel du 18 juin ») : masquer
  -- les chiffres, mois et indications de siècle dans le libellé de question.
  return jsonb_build_object('question_id', q.id, 'position', q.position,
    'title', trim(regexp_replace(regexp_replace(q.title, '[0-9]+', '…', 'g'),
      '\m(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|[IVXLCDM]+e?\s+siècle)\M', '…', 'gi')),
    'description', null,
    -- Convention de l'import existant, jamais de nom de fichier daté ou d'URL arbitraire.
    'image_path', case when q.image_path = q.event_id || '.svg' then q.image_path end,
    'difficulty', q.difficulty,
    'asked_at', q.asked_at, 'deadline', q.deadline, 'server_time', clock_timestamp());
end;
$$;

create function histoire.submit_answer(
  p_game_id uuid, p_question_id uuid,
  p_year integer default null, p_month integer default null, p_day integer default null,
  p_token text default null
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
begin
  select * into q from histoire.game_questions where id = p_question_id and game_id = g.id;
  if not found or q.asked_at is null or q.answered_at is not null or g.state <> 'playing' then
    raise exception using errcode = '22023', message = 'Question inactive ou déjà répondue';
  end if;
  -- Prendre l'heure après le verrou : attendre une transaction ne prolonge pas le chrono.
  server_time := clock_timestamp();
  timed_out := server_time > q.deadline;
  if not timed_out then
    if p_year is null or p_year = 0 or p_year not between -10000000 and 10000000
      or (p_month is not null and p_month not between 1 and 12)
      or (p_day is not null and (p_month is null or p_day not between 1 and 31))
      or (q.difficulty in ('MONTH', 'DAY') and p_month is null)
      or (q.difficulty = 'DAY' and p_day is null)
    then raise exception using errcode = '22023', message = 'Date invalide'; end if;
    if p_day is not null then perform make_date(p_year, p_month, p_day); end if;
  end if;
  -- Le chrono actif est figé à asked_at. En cas de recalibrage pendant la question,
  -- convertir le temps en fraction du chrono actuel, puis laisser #12 calculer les points.
  select timer_seconds into strict current_duration from histoire.scoring_settings;
  elapsed := extract(epoch from (server_time - q.asked_at)) / q.timer_seconds * current_duration;
  select * into r from histoire.score_answer(
    case when timed_out then null else p_year end, p_month, p_day,
    q.expected_year, q.expected_month, q.expected_day, q.difficulty, elapsed);
  update histoire.game_questions set answered_at = server_time,
    answer_year = p_year, answer_month = p_month, answer_day = p_day,
    expired = timed_out, gap = r.gap, unit = r.unit, accuracy = r.accuracy,
    points = least(100, greatest(0, r.points))
  where id = q.id returning * into q;
  return jsonb_build_object('question_id', q.id,
    'correct_date', jsonb_build_object('year', q.expected_year, 'month', q.expected_month, 'day', q.expected_day),
    'gap', q.gap, 'unit', q.unit, 'accuracy', q.accuracy, 'points', q.points,
    'expired', q.expired, 'description', q.correction_description);
end;
$$;

create function histoire.finish_game(p_game_id uuid, p_token text default null)
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
    'title', q.title, 'answer', jsonb_build_object('year', q.answer_year, 'month', q.answer_month, 'day', q.answer_day),
    'correct_date', jsonb_build_object('year', q.expected_year, 'month', q.expected_month, 'day', q.expected_day),
    'description', q.correction_description, 'gap', q.gap, 'unit', q.unit,
    'accuracy', q.accuracy, 'points', q.points, 'expired', q.expired) order by q.position)
  into recap from histoire.game_questions q where q.game_id = g.id;
  return jsonb_build_object('game_id', g.id, 'state', g.state, 'question_count', g.question_count,
    'average_accuracy', g.average_accuracy, 'total_points', g.total_points, 'questions', recap);
end;
$$;

-- Les privilèges par défaut du schéma accordent EXECUTE : les révoquer explicitement.
revoke all on function histoire.lock_solo_game(uuid, text) from public, anon, authenticated;
revoke all on function histoire.start_game(text, text, text, integer, integer, text, text[], text, integer) from public, anon, authenticated;
revoke all on function histoire.next_question(uuid, text) from public, anon, authenticated;
revoke all on function histoire.submit_answer(uuid, uuid, integer, integer, integer, text) from public, anon, authenticated;
revoke all on function histoire.finish_game(uuid, text) from public, anon, authenticated;
grant execute on function histoire.start_game(text, text, text, integer, integer, text, text[], text, integer),
  histoire.next_question(uuid, text), histoire.submit_answer(uuid, uuid, integer, integer, integer, text),
  histoire.finish_game(uuid, text) to anon, authenticated;

insert into histoire.migrations_appliquees(version, nom) values ('20261006214244', 'solo_server');
