-- #104 : PRÉPARÉE UNIQUEMENT. Aucun GO SQL, ne pas appliquer sur KFFR.
-- Dépend de #87/#93/#95. Tables, triggers et fonctions dans histoire uniquement.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table histoire.event_editorial_overrides (
  event_id text primary key references histoire.events(id),
  title text check (char_length(title) between 1 and 500 and title = btrim(title)),
  niveau smallint check (niveau between 1 and 3),
  check (title is not null or niveau is not null)
);
create table histoire.event_editorial_audit (
  id bigint generated always as identity primary key,
  event_id text not null,
  admin_id uuid not null,
  occurred_at timestamptz not null default clock_timestamp(),
  old_title text not null,
  new_title text not null,
  old_niveau smallint not null,
  new_niveau smallint not null,
  reason text check (char_length(reason) <= 1000)
);
create index event_editorial_audit_event_idx on histoire.event_editorial_audit(event_id,id desc);
-- Instantanés privés ; les alias ne traversent jamais une RPC de lecture joueur.
create table histoire.game_question_editorial_snapshots (
  question_id uuid primary key references histoire.game_questions(id) on delete cascade,
  display_title text not null,
  accepted_labels text[] not null
);
alter table histoire.event_editorial_overrides enable row level security;
alter table histoire.event_editorial_audit enable row level security;
alter table histoire.game_question_editorial_snapshots enable row level security;
revoke all on histoire.event_editorial_overrides,histoire.event_editorial_audit,
  histoire.game_question_editorial_snapshots from public,anon,authenticated;
revoke all on sequence histoire.event_editorial_audit_id_seq from public,anon,authenticated;

-- Identique au masquage historique ; aucune nouvelle date avant correction.
create function histoire.mask_question_title(p_title text)
returns text language sql immutable security invoker set search_path = '' as $$
  select trim(regexp_replace(regexp_replace(p_title, '[0-9]+', '…', 'g'),
    '\m(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|[IVXLCDM]+e?\s+siècle)\M', '…', 'gi'))
$$;
revoke all on function histoire.mask_question_title(text) from public,anon,authenticated;

-- L'import reste inchangé : BEFORE INSERT/UPDATE couvre aussi son upsert.
-- Le trigger réapplique seulement les champs corrigés. Un titre rédigé du CSV
-- ne doit pas masquer le nouveau titre canonique : utiliser le masquage standard.
create function histoire.preserve_editorial_overrides()
returns trigger language plpgsql security definer set search_path = '' as $$
declare correction histoire.event_editorial_overrides;
begin
  select * into correction from histoire.event_editorial_overrides where event_id = new.id;
  if correction.title is not null then new.title := correction.title; new.titre_question := null; end if;
  if correction.niveau is not null then new.niveau := correction.niveau; end if;
  return new;
end;
$$;
revoke all on function histoire.preserve_editorial_overrides() from public,anon,authenticated;
create trigger preserve_editorial_overrides before insert or update on histoire.events
  for each row execute function histoire.preserve_editorial_overrides();

-- Le titre canonique vient de l'instantané du tirage, jamais d'une relecture
-- qui pourrait avoir changé entre la sélection et l'insertion des questions.
create function histoire.snapshot_question_editorial_content()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into histoire.game_question_editorial_snapshots(question_id,display_title,accepted_labels)
    select new.id,
      coalesce(case when e.title = new.title then e.titre_question end,histoire.mask_question_title(new.title)),
      case when (select g.direction from histoire.games g where g.id = new.game_id) = 'inverse'
        then array[new.title] || coalesce((select array_agg(a.alias order by a.alias)
          from histoire.event_aliases a where a.event_id = new.event_id),'{}'::text[])
        else '{}'::text[] end
    from histoire.events e where e.id = new.event_id;
  return new;
end;
$$;
revoke all on function histoire.snapshot_question_editorial_content() from public,anon,authenticated;
create trigger snapshot_question_editorial_content after insert on histoire.game_questions
  for each row execute function histoire.snapshot_question_editorial_content();

-- Figer les parties présentes avant la première correction. Aucun UPDATE de
-- titre, date, réponse, score ou état d'une question/partie déjà enregistrée.
insert into histoire.game_question_editorial_snapshots(question_id,display_title,accepted_labels)
  select q.id,coalesce(case when e.title = q.title then e.titre_question end,histoire.mask_question_title(q.title)),
    case when (select g.direction from histoire.games g where g.id = q.game_id) = 'inverse'
      then array[q.title] || coalesce((select array_agg(a.alias order by a.alias)
        from histoire.event_aliases a where a.event_id = q.event_id),'{}'::text[])
      else '{}'::text[] end
  from histoire.game_questions q join histoire.events e on e.id = q.event_id
    join histoire.games g on g.id = q.game_id where g.state = 'playing';

create function histoire.admin_event_history(p_event_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from histoire.admins where user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Accès réservé';
  end if;
  if not exists (select 1 from histoire.events where id = p_event_id) then
    raise exception using errcode = '22023', message = 'Question inconnue';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'event_id',a.event_id,
    'admin_id',a.admin_id,'occurred_at',a.occurred_at,'old_title',a.old_title,'new_title',a.new_title,
    'old_niveau',a.old_niveau,'new_niveau',a.new_niveau,'reason',a.reason) order by a.id desc)
    from histoire.event_editorial_audit a where a.event_id = p_event_id),'[]'::jsonb);
end;
$$;

create function histoire.admin_edit_event(
  p_pack_id text,p_event_id text,p_title text,p_niveau integer,p_reason text default null,
  p_expected_title text default null,p_expected_niveau integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  player_id uuid := auth.uid();
  original histoire.events;
  wanted_title text := btrim(p_title);
  changed boolean;
begin
  if player_id is null or not exists (select 1 from histoire.admins where user_id = player_id) then
    raise exception using errcode = '42501', message = 'Accès réservé';
  end if;
  if wanted_title is null or char_length(wanted_title) not between 1 and 500
    or wanted_title ~ '[[:cntrl:]]' or p_niveau is null or p_niveau not between 1 and 3
    or char_length(p_reason) > 1000 then
    raise exception using errcode = '22023', message = 'Titre, niveau ou motif invalide';
  end if;
  -- Verrou global d'événement : deux packs ne peuvent corriger la même question
  -- simultanément en perdant l'ancien état réel ou l'audit.
  select * into original from histoire.events where id = p_event_id for update;
  if not found or not exists (select 1 from histoire.pack_events
    where pack_id = p_pack_id and event_id = p_event_id) then
    raise exception using errcode = '22023', message = 'Question absente du pack';
  end if;
  changed := original.title <> wanted_title or original.niveau <> p_niveau;
  -- Un retry après coupure réseau peut confirmer la modification déjà faite.
  if changed and ((p_expected_title is not null and p_expected_title <> original.title)
    or (p_expected_niveau is not null and p_expected_niveau <> original.niveau)) then
    raise exception using errcode = '40001', message = 'Question modifiée depuis son ouverture';
  end if;
  if changed then
    insert into histoire.event_editorial_overrides as o(event_id,title,niveau)
      values (p_event_id,case when original.title <> wanted_title then wanted_title end,
        case when original.niveau <> p_niveau then p_niveau end)
      on conflict (event_id) do update set
        title = case when original.title <> wanted_title then wanted_title else o.title end,
        niveau = case when original.niveau <> p_niveau then p_niveau else o.niveau end;
    update histoire.events set title = wanted_title,niveau = p_niveau,updated_at = clock_timestamp()
      where id = p_event_id;
    insert into histoire.event_editorial_audit(event_id,admin_id,old_title,new_title,old_niveau,new_niveau,reason)
      values (p_event_id,player_id,original.title,wanted_title,original.niveau,p_niveau,nullif(btrim(p_reason),''));
  end if;
  return jsonb_build_object('changed',changed,'packs',histoire.admin_list_packs(),
    'questions',histoire.admin_pack_questions(p_pack_id),'history',histoire.admin_event_history(p_event_id));
end;
$$;
revoke all on function histoire.admin_edit_event(text,text,text,integer,text,text,integer),
  histoire.admin_event_history(text) from public,anon,authenticated;
grant execute on function histoire.admin_edit_event(text,text,text,integer,text,text,integer),
  histoire.admin_event_history(text) to authenticated;
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
    'title', coalesce((select s.display_title from histoire.game_question_editorial_snapshots s where s.question_id = q.id), histoire.mask_question_title(q.title)),
    'image_path', case when q.image_path = q.event_id || '.svg' then q.image_path end);
end;
$$;

create or replace function histoire.submit_answer(
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
    -- Seuls les libellés figés de la question active privée sont comparés.
    accepted := false;
    if not timed_out then
      select coalesce(bool_or(
        histoire.normalize_answer(label) = histoire.normalize_answer(p_answer_text)
        or extensions.similarity(histoire.normalize_answer(label), histoire.normalize_answer(p_answer_text)) >= 0.75
      ),false) into accepted
      from histoire.game_question_editorial_snapshots s
        cross join lateral unnest(s.accepted_labels) labels(label)
      where s.question_id = q.id;
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


-- Même verrou propriétaire/session, mêmes projections et signatures ; les scores
-- et bilans enregistrés ne sont pas réécrits. CREATE OR REPLACE garde les ACL.
revoke all on function histoire.next_question(uuid,text),
  histoire.submit_answer(uuid,uuid,integer,integer,integer,text,text) from public,anon,authenticated;
grant execute on function histoire.next_question(uuid,text),
  histoire.submit_answer(uuid,uuid,integer,integer,integer,text,text) to anon,authenticated;
insert into histoire.migrations_appliquees(version,nom) values ('20261010232237','corrections_editoriales');
notify pgrst, 'reload schema';
commit;
