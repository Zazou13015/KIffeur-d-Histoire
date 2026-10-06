-- Tests exclusivement locaux/CI, fixtures dans histoire, aucune écriture auth.
begin;
create function pg_temp.verifier(condition boolean, description text) returns void
language plpgsql as $$ begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
end $$;
-- La requête testée est exécutée avec les privilèges du rôle courant.
create function pg_temp.refuser(query text, expected_state text) returns void
language plpgsql as $$ begin
  begin
    execute query;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'ÉCHEC : requête acceptée : %', query;
end $$;

insert into histoire.packs(id, slug, title) values ('SOLO-TEST', 'solo-test', 'Fixture solo');
insert into histoire.tags(id, slug, name, tag_type) values
  ('SOLO-THEME', 'solo-theme', 'Thème sûr', 'SEMANTIC_TOPIC'),
  ('SOLO-CENTURY', 'solo-century', 'XXIe siècle', 'CENTURY');
insert into histoire.chapters(id, level_id, school_year, program_scope, title) values
  ('SOLO-CHAPTER', '3e', '2026-2027', 'Tronc commun', 'Fixture solo');
insert into histoire.events(id, title, event_type, precision, date_status, playable, playable_mode, importance, difficulty, image_path)
select 'EVT-' || (9900 + i), 'Question ' || chr(64 + i), 'POINT', 'DAY', 'EXACT', true, 'DAY', 1, 1, 'EVT-' || (9900 + i) || '.svg'
from generate_series(1, 12) i;
insert into histoire.events(id, title, event_type, precision, date_status, playable, playable_mode, importance, difficulty) values
  ('EVT-9913', 'Année seulement', 'POINT', 'YEAR', 'EXACT', true, 'YEAR', 1, 1),
  ('EVT-9914', 'Mois seulement', 'POINT', 'MONTH', 'EXACT', true, 'MONTH', 1, 1),
  ('EVT-9915', 'Injouable', 'PERIOD', 'CENTURY', 'APPROXIMATE', false, 'NOT_AUTOMATIC', 1, 1),
  ('EVT-9916', 'Plage', 'PERIOD', 'DAY_RANGE', 'EXACT', true, 'RANGE', 1, 1),
  ('EVT-9917', 'Appel du 18 juin 1940', 'POINT', 'DAY', 'EXACT', true, 'DAY', 1, 1);
insert into histoire.event_answers(event_id, start_year, start_month, start_day, description)
select 'EVT-' || (9900 + i), 2001, 2, 3, 'Correction privée : 3 février 2001' from generate_series(1,12) i;
insert into histoire.event_answers(event_id, start_year, start_month, start_day, end_year) values
  ('EVT-9913', 2002, null, null, null), ('EVT-9914', 2003, 2, null, null),
  ('EVT-9915', null, null, null, null), ('EVT-9916', 2004, 2, 3, 2005),
  ('EVT-9917', 1940, 6, 18, null);
insert into histoire.event_aliases(event_id, alias) values ('EVT-9901', 'Alias privé du 3 février 2001');
insert into histoire.pack_events(pack_id, event_id, position)
select 'SOLO-TEST', 'EVT-' || (9900 + i), i from generate_series(1,16) i;
insert into histoire.event_tags(event_id, tag_id)
select 'EVT-' || (9900 + i), t from generate_series(1,12) i, unnest(array['SOLO-THEME','SOLO-CENTURY']) t;
insert into histoire.event_levels(event_id, level_id)
select 'EVT-' || (9900 + i), '3e' from generate_series(1,12) i;
insert into histoire.event_chapters(event_id, chapter_id)
select 'EVT-' || (9900 + i), 'SOLO-CHAPTER' from generate_series(1,12) i;

-- Fonctions de test invoker : vraie partie de dix questions avec les droits API.
create function pg_temp.partie_complete(token text) returns uuid
language plpgsql as $$
declare g jsonb; q jsonb; r jsonb; game_id uuid; first_deadline text;
begin
  g := histoire.start_game(p_token => token, p_pack_id => 'SOLO-TEST', p_tag_id => 'SOLO-THEME',
    p_year_min => 2000, p_year_max => 2001, p_level_id => '3e', p_chapter_ids => array['SOLO-CHAPTER'], p_difficulty => 'DAY');
  game_id := (g->>'game_id')::uuid;
  perform pg_temp.verifier(g->>'question_count' = '10' and not g ? 'questions' and not g ? 'token', 'start sans tirage ni secret');
  perform pg_temp.refuser(format('select histoire.finish_game(%L, %L)', game_id, token), '22023');
  for i in 1..10 loop
    q := histoire.next_question(game_id, token);
    -- Ensemble EXACT des clés autorisées avant réponse.
    perform pg_temp.verifier((select array_agg(k order by k) from jsonb_object_keys(q) k) =
      array['asked_at','deadline','difficulty','image_path','position','question_id','server_time','title'], 'liste blanche avant réponse');
    perform pg_temp.verifier(not q ? 'description' and (q->>'position')::int = i,
      'description privée absente et ordre séquentiel');
    perform pg_temp.verifier(extract(epoch from ((q->>'deadline')::timestamptz - (q->>'asked_at')::timestamptz)) = 30, 'chrono 30 secondes');
    first_deadline := q->>'deadline';
    perform pg_temp.verifier(histoire.next_question(game_id, token)->>'deadline' = first_deadline, 'relire ne relance pas le chrono');
    r := histoire.submit_answer(game_id, (q->>'question_id')::uuid, 2001, 2, 3, token);
    perform pg_temp.verifier(r->'correct_date'->>'year' = '2001' and r->>'gap' = '0'
      and r->>'unit' = 'DAY' and (r->>'accuracy')::numeric = 100 and r->>'points' = '100'
      and r->>'description' = 'Correction privée : 3 février 2001', 'correction et score exact après réponse');
    perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,2001,2,3,%L)', game_id, q->>'question_id', token), '22023');
  end loop;
  perform pg_temp.verifier(histoire.next_question(game_id, token) is null, 'tirage épuisé');
  r := histoire.finish_game(game_id, token);
  perform pg_temp.verifier(r->>'state' = 'finished' and r->>'total_points' = '1000'
    and (r->>'average_accuracy')::numeric = 100 and jsonb_array_length(r->'questions') = 10, 'fin 1000 points et récapitulatif');
  perform pg_temp.verifier(histoire.finish_game(game_id, token) = r, 'fin idempotente');
  return game_id;
end;
$$;
create temporary table contexte(anonymous_id uuid, connected_id uuid, timed_id uuid, timed_question uuid);
grant all on contexte to anon, authenticated;
insert into contexte default values;
set local role anon;
update contexte set anonymous_id = pg_temp.partie_complete(repeat('a',64));
do $$ begin
  perform pg_temp.refuser('select * from histoire.event_answers', '42501');
  perform pg_temp.refuser('select * from histoire.event_aliases', '42501');
  perform pg_temp.refuser('select histoire.check_event_answer(''EVT-9901'',''3 février 2001'')', '42501');
  perform pg_temp.refuser('select * from histoire.games', '42501');
  perform pg_temp.refuser('select * from histoire.game_questions', '42501');
  perform pg_temp.refuser('update histoire.games set total_points = 1000', '42501');
  perform pg_temp.refuser('update histoire.game_questions set points = 100', '42501');
  perform pg_temp.refuser('select histoire.lock_solo_game(null,null)', '42501');
  perform pg_temp.refuser('select histoire.start_game()', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => ''weak'')', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''a'',64), p_question_count => 0)', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''a'',64), p_question_count => 101)', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''a'',64), p_difficulty => ''BAD'')', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''a'',64), p_year_min => 2002, p_year_max => 2001)', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''a'',64), p_pack_id => ''UNKNOWN'')', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''a'',64), p_tag_id => ''SOLO-CENTURY'')', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''a'',64), p_pack_id => ''SOLO-TEST'', p_question_count => 20)', '22023');
  perform pg_temp.verifier(not exists(select 1 from histoire.event_tags where tag_id = 'SOLO-CENTURY'), 'filtres sans liens de siècle privés');
  perform pg_temp.refuser(format('select histoire.next_question(%L)', (select anonymous_id from contexte)), '42501');
  perform pg_temp.refuser(format('select histoire.next_question(%L,%L)', (select anonymous_id from contexte),repeat('b',64)), '42501');
  perform pg_temp.refuser(format('select histoire.finish_game(%L)', (select anonymous_id from contexte)), '42501');
  perform pg_temp.refuser(format('select histoire.finish_game(%L,%L)', (select anonymous_id from contexte),repeat('b',64)), '42501');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,null,2001)', (select anonymous_id from contexte)), '42501');
  perform pg_temp.refuser('select histoire.next_question(''00000000-0000-0000-0000-000000000000'')', '42501');
end $$;
reset role;

-- Comptes simulés par claims uniquement : aucun insert/update dans auth.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
set local role authenticated;
update contexte set connected_id = pg_temp.partie_complete(null);
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000014', true);
set local role authenticated;
do $$ declare id uuid := (select connected_id from contexte); begin
  perform pg_temp.refuser(format('select histoire.next_question(%L)', id), '42501');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,null,2001)', id), '42501');
  perform pg_temp.refuser(format('select histoire.finish_game(%L,%L)', id, repeat('a',64)), '42501');
  perform pg_temp.refuser('select * from histoire.games', '42501');
  perform pg_temp.refuser('select * from histoire.game_questions', '42501');
  perform pg_temp.refuser('update histoire.games set user_id = null', '42501');
  perform pg_temp.refuser('select * from histoire.event_answers', '42501');
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', true);

-- Filtres, précision disponible, aucune duplication, instantanés privés.
do $$ declare g jsonb; selected_game uuid; n integer; q jsonb; r jsonb; begin
  g := histoire.start_game(p_token => repeat('c',64), p_pack_id => 'SOLO-TEST', p_difficulty => 'YEAR', p_question_count => 15);
  selected_game := (g->>'game_id')::uuid;
  select count(distinct event_id) into n from histoire.game_questions where game_id = selected_game;
  perform pg_temp.verifier(n = 15 and not exists(select 1 from histoire.game_questions where game_id = selected_game and event_id = 'EVT-9915'), '15 événements uniques et jouables');
  g := histoire.start_game(p_token => repeat('c',64), p_pack_id => 'SOLO-TEST', p_difficulty => 'MONTH', p_question_count => 14);
  perform pg_temp.verifier(not exists(select 1 from histoire.game_questions where game_id = (g->>'game_id')::uuid and expected_month is null), 'MONTH exclut les années seules');
  g := histoire.start_game(p_token => repeat('c',64), p_pack_id => 'SOLO-TEST', p_difficulty => 'DAY', p_question_count => 13);
  perform pg_temp.verifier(not exists(select 1 from histoire.game_questions where game_id = (g->>'game_id')::uuid and expected_day is null), 'DAY exclut les mois seuls');
  g := histoire.start_game(p_token => repeat('c',64), p_pack_id => 'SOLO-TEST', p_year_min => 2004, p_year_max => 2004, p_question_count => 1);
  perform pg_temp.verifier((select event_id from histoire.game_questions where game_id = (g->>'game_id')::uuid) = 'EVT-9916', 'période inclusive et début des plages');
  g := histoire.start_game(p_token => repeat('c',64), p_pack_id => 'SOLO-TEST', p_year_min => 2002, p_year_max => 2002, p_question_count => 1);
  perform pg_temp.verifier((select event_id from histoire.game_questions where game_id = (g->>'game_id')::uuid) = 'EVT-9913', 'filtre période seul');
  g := histoire.start_game(p_token => repeat('c',64), p_tag_id => 'SOLO-THEME', p_level_id => '3e', p_chapter_ids => array['SOLO-CHAPTER']);
  perform pg_temp.verifier(not exists(select 1 from histoire.game_questions where game_id = (g->>'game_id')::uuid and event_id not between 'EVT-9901' and 'EVT-9912'), 'thème/niveau/chapitre');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''c'',64), p_chapter_ids => array[''SOLO-CHAPTER''], p_level_id => ''6e'')', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token => repeat(''c'',64), p_chapter_ids => array[]::text[])', '22023');
  -- Seule la fixture à titre daté est dans ce chapitre temporaire.
  insert into histoire.packs(id,slug,title) values ('SOLO-TITLE','solo-title','Titre');
  insert into histoire.pack_events values ('SOLO-TITLE','EVT-9917',1);
  g := histoire.start_game(p_token => repeat('c',64), p_pack_id => 'SOLO-TITLE', p_question_count => 1);
  perform pg_temp.verifier(histoire.next_question((g->>'game_id')::uuid,repeat('c',64))->>'title' = 'Appel du … … …', 'titre sans date explicite');
  update histoire.events set image_path = 'secret-1940-06-18.svg' where id = 'EVT-9917';
  g := histoire.start_game(p_token => repeat('c',64), p_pack_id => 'SOLO-TITLE', p_question_count => 1);
  perform pg_temp.verifier(histoire.next_question((g->>'game_id')::uuid,repeat('c',64))->>'image_path' is null, 'chemin daté non publié');
  -- L'import d'une autre date après le tirage ne change pas la correction.
  g := histoire.start_game(p_token => repeat('c',64), p_pack_id => 'SOLO-TITLE', p_question_count => 1);
  update histoire.event_answers set start_year = 1941 where event_id = 'EVT-9917';
  q := histoire.next_question((g->>'game_id')::uuid,repeat('c',64));
  r := histoire.submit_answer((g->>'game_id')::uuid,(q->>'question_id')::uuid,1940,p_token => repeat('c',64));
  perform pg_temp.verifier(r->'correct_date'->>'year' = '1940' and (r->>'accuracy')::numeric = 100, 'correction figée au tirage');
end $$;

-- Heure réelle et réglage chrono. Le fixture déplace asked_at/deadline, jamais d'attente de 30 s.
update histoire.scoring_settings set timer_seconds = 5;
set local role anon;
update contexte set timed_id = (histoire.start_game(p_token => repeat('d',64), p_tag_id => 'SOLO-THEME', p_difficulty => 'DAY', p_question_count => 2)->>'game_id')::uuid;
update contexte set timed_question = (histoire.next_question(timed_id,repeat('d',64))->>'question_id')::uuid;
reset role;
do $$ begin
  perform pg_temp.verifier((select extract(epoch from (deadline-asked_at)) from histoire.game_questions where id = (select timed_question from contexte)) = 5, 'chrono réglable');
end $$;
-- Nouveau réglage pendant une question : conserver le chrono actif et sa fraction écoulée.
update histoire.scoring_settings set timer_seconds = 30;
update histoire.game_questions set asked_at = clock_timestamp()-interval '1 second', deadline = clock_timestamp()+interval '4 seconds'
where id = (select timed_question from contexte);
set local role anon;
do $$ declare c contexte; r jsonb; begin
  select * into c from contexte;
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,2001,null,null,%L)',c.timed_id,c.timed_question,repeat('d',64)), '22023');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,0,2,3,%L)',c.timed_id,c.timed_question,repeat('d',64)), '22023');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,2001,13,3,%L)',c.timed_id,c.timed_question,repeat('d',64)), '22023');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,2001,2,30,%L)',c.timed_id,c.timed_question,repeat('d',64)), '22008');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,2001,2,3,%L)',c.anonymous_id,c.timed_question,repeat('a',64)), '22023');
  r := histoire.submit_answer(c.timed_id,c.timed_question,2001,2,4,repeat('d',64));
  perform pg_temp.verifier(r->>'gap' = '1' and (r->>'accuracy')::numeric = 98.89
    and (r->>'points')::int between 90 and 93 and r->>'expired' = 'false', 'réponse imprécise et fraction du chrono figé');
end $$;
reset role;
-- Interdire la réponse à une question future, même avec son UUID connu par la fixture.
update contexte set timed_question = (select id from histoire.game_questions where game_id = contexte.timed_id and position = 2);
set local role anon;
do $$ declare c contexte; begin
  select * into c from contexte;
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,2001,2,3,%L)',c.timed_id,c.timed_question,repeat('d',64)), '22023');
  perform histoire.next_question(c.timed_id,repeat('d',64));
end $$;
reset role;
update histoire.game_questions set asked_at = clock_timestamp()-interval '31 seconds', deadline = clock_timestamp()-interval '1 second'
where id = (select timed_question from contexte);
set local role anon;
do $$ declare c contexte; r jsonb; g jsonb; q jsonb; begin
  select * into c from contexte;
  r := histoire.submit_answer(c.timed_id,c.timed_question,2001,2,3,repeat('d',64));
  perform pg_temp.verifier(r->>'points' = '0' and r->>'accuracy' = '0' and r->>'expired' = 'true'
    and r->'correct_date'->>'year' = '2001', 'après deadline = zéro et correction');
  r := histoire.finish_game(c.timed_id,repeat('d',64));
  perform pg_temp.verifier((r->>'average_accuracy')::numeric = 49.45 and (r->>'total_points')::int between 90 and 93, 'agrégation en SQL');
  g := histoire.start_game(p_token => repeat('e',64), p_tag_id => 'SOLO-THEME', p_question_count => 1);
  q := histoire.next_question((g->>'game_id')::uuid,repeat('e',64));
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token => %L)',g->>'game_id',q->>'question_id',repeat('e',64)), '22023');
  update contexte set timed_id = (g->>'game_id')::uuid, timed_question = (q->>'question_id')::uuid;
end $$;
reset role;
update histoire.game_questions set asked_at = clock_timestamp()-interval '31 seconds', deadline = clock_timestamp()-interval '1 second'
where id = (select timed_question from contexte);
set local role anon;
do $$ declare c contexte; r jsonb; begin
  select * into c from contexte;
  r := histoire.submit_answer(c.timed_id,c.timed_question,p_token => repeat('e',64));
  perform pg_temp.verifier(r->>'accuracy' = '0' and r->>'points' = '0' and r->>'expired' = 'true', 'absence de réponse après expiration = zéro');
  perform histoire.finish_game(c.timed_id,repeat('e',64));
end $$;
reset role;
do $$ begin
  perform pg_temp.verifier((select user_id from histoire.games where id = (select connected_id from contexte)) = '00000000-0000-0000-0000-000000000013'::uuid, 'identité du JWT');
  perform pg_temp.verifier((select anonymous_token_hash = sha256(convert_to(repeat('a',64),'UTF8')) from histoire.games where id = (select anonymous_id from contexte)), 'empreinte uniquement');
  raise notice 'OK : solo anonyme/connecté, filtres, absence de fuite, chrono, score, fin et autorisations';
end $$;
rollback;
