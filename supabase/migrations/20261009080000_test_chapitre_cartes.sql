-- #23 (suite) : le test d'un chapitre ne porte que sur les événements de ses cartes pédagogiques,
-- c'est-à-dire sur ce que le joueur vient d'apprendre. start_game reste inchangé (même signature,
-- mêmes droits) : une fonction dédiée tire les questions et marque la partie comme test de chapitre.
create function histoire.start_chapter_test(
  p_token text default null,
  p_chapter_id text default null,
  p_difficulty text default 'YEAR',
  p_question_count integer default 10
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games;
  picked jsonb;
  player_id uuid := auth.uid();
begin
  if p_difficulty is null or p_difficulty not in ('YEAR', 'MONTH', 'DAY')
    or p_question_count is null or p_question_count not between 5 and 10
    or p_chapter_id is null or not exists (select 1 from histoire.chapters where id = p_chapter_id)
    or (player_id is null and (p_token is null or p_token !~ '^[a-f0-9]{64}$'))
  then
    raise exception using errcode = '22023', message = 'Paramètres de partie invalides';
  end if;

  select jsonb_agg(to_jsonb(selected)) into picked from (
    select e.id, e.title, e.image_path, a.start_year, a.start_month, a.start_day, a.description
    from histoire.events e join histoire.event_answers a on a.event_id = e.id
    where e.playable and a.start_year is not null
      and e.playable_mode in ('YEAR', 'MONTH', 'DAY', 'RANGE')
      and (p_difficulty = 'YEAR' or a.start_month is not null)
      and (p_difficulty <> 'DAY' or a.start_day is not null)
      and e.id in (select cc.event_id from histoire.chapter_cards cc where cc.chapter_id = p_chapter_id)
    order by random() limit p_question_count
  ) selected;
  if coalesce(jsonb_array_length(picked), 0) < p_question_count then
    raise exception using errcode = '22023', message = 'Pas assez de questions pour ces filtres';
  end if;

  -- Le trigger #13 conserve purge, plafond global et expiration 24 h des anonymes.
  insert into histoire.games(user_id, anonymous_token_hash, difficulty, question_count, direction, context)
  values (player_id, case when player_id is null then sha256(convert_to(p_token, 'UTF8')) end,
    p_difficulty, p_question_count, 'date',
    jsonb_build_object(
      'mode', 'solo_scolaire',
      'origin', 'test_chapitre',
      'chapters', (select jsonb_agg(jsonb_build_object('key', c.id, 'label', c.title, 'level', l.name))
        from histoire.chapters c join histoire.levels l on l.id = c.level_id where c.id = p_chapter_id)
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
revoke all on function histoire.start_chapter_test(text, text, text, integer) from public, anon, authenticated;
grant execute on function histoire.start_chapter_test(text, text, text, integer) to anon, authenticated;

-- Seule une partie lancée par start_chapter_test compte comme test de chapitre.
create or replace function histoire.record_chapter_test(p_game_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  player_id uuid := auth.uid();
  g histoire.games;
  chapter text;
  row_after histoire.learning_progress;
  previous numeric;
begin
  if player_id is null then
    raise exception using errcode = '42501', message = 'Connexion requise';
  end if;
  select * into g from histoire.games
    where id = p_game_id and user_id = player_id and state = 'finished' and direction = 'date';
  if not found then
    raise exception using errcode = '42501', message = 'Partie inaccessible';
  end if;
  if g.question_count < 5 or g.average_accuracy is null
    or g.context->>'origin' is distinct from 'test_chapitre'
    or jsonb_array_length(coalesce(g.context->'chapters', '[]'::jsonb)) <> 1 then
    raise exception using errcode = '22023', message = 'Cette partie n''est pas un test de chapitre';
  end if;
  chapter := g.context->'chapters'->0->>'key';
  if not exists (select 1 from histoire.chapters where id = chapter) then
    raise exception using errcode = '22023', message = 'Chapitre inconnu';
  end if;
  perform histoire.ensure_player();
  select best_accuracy into previous from histoire.learning_progress
    where user_id = player_id and chapter_id = chapter;
  insert into histoire.learning_progress as lp(user_id, chapter_id, best_accuracy, best_difficulty,
    best_tested_at, tests_count, last_game_id)
  values (player_id, chapter, g.average_accuracy, g.difficulty, g.finished_at, 1, g.id)
  on conflict (user_id, chapter_id) do update set
    best_accuracy = case when lp.last_game_id is distinct from g.id
      and (lp.best_accuracy is null or g.average_accuracy > lp.best_accuracy)
      then g.average_accuracy else lp.best_accuracy end,
    best_difficulty = case when lp.last_game_id is distinct from g.id
      and (lp.best_accuracy is null or g.average_accuracy > lp.best_accuracy)
      then g.difficulty else lp.best_difficulty end,
    best_tested_at = case when lp.last_game_id is distinct from g.id
      and (lp.best_accuracy is null or g.average_accuracy > lp.best_accuracy)
      then g.finished_at else lp.best_tested_at end,
    tests_count = lp.tests_count + case when lp.last_game_id is distinct from g.id then 1 else 0 end,
    last_game_id = g.id
  returning * into row_after;
  return jsonb_build_object(
    'chapter_id', row_after.chapter_id,
    'best_accuracy', row_after.best_accuracy,
    'best_difficulty', row_after.best_difficulty,
    'tests_count', row_after.tests_count,
    'improved', previous is null or row_after.best_accuracy > previous);
end;
$$;

insert into histoire.migrations_appliquees(version, nom) values ('20261009080000', 'test_chapitre_cartes');
