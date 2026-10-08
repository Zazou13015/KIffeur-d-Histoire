-- Jeu connu et identités simulées : transaction locale/CI, jamais en production.
begin;
create function pg_temp.verifier(condition boolean, description text) returns void
language plpgsql as $$ begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
end $$;
create function pg_temp.refuser(query text, expected_state text) returns void
language plpgsql as $$ begin
  begin execute query;
  exception when others then if sqlstate = expected_state then return; end if; raise; end;
  raise exception 'ÉCHEC : requête acceptée';
end $$;

insert into histoire.games(id, user_id, difficulty, question_count, state, direction, finished_at, average_accuracy, total_points, context) values
 ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'finished', 'date', '2026-10-08T12:00:00Z', 100, 900,
 '{"mode":"solo_libre","pack":{"key":"P","label":"Grands repères"},"theme":{"key":"T","label":"Révolutions"},"chapters":[]}'),
 ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'finished', 'date', '2026-10-08T12:00:00Z', 80, 800,
 '{"mode":"solo_libre","pack":{"key":"P","label":"Grands repères"},"chapters":[{"key":"C","label":"La Révolution française","level":"4e"}]}'),
 ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'finished', 'inverse', '2026-09-08T12:00:00Z', 60, 460, null),
 ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-00000000000b', 'YEAR', 10, 'finished', 'date', '2026-10-09T12:00:00Z', 10, 100, null),
 ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'playing', 'date', null, null, null, null);
insert into histoire.games(anonymous_token_hash, difficulty, question_count, state, direction, finished_at, average_accuracy, total_points)
 values (sha256(convert_to(repeat('a',64),'UTF8')), 'YEAR', 10, 'finished', 'date', clock_timestamp(), 99, 999);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a';
select pg_temp.verifier(histoire.player_stats()->>'games' = '3', 'exactement 3 parties A terminées, sans B ni anonyme ni partie en cours');
select pg_temp.verifier((histoire.player_stats()->>'average_accuracy')::numeric = 80, 'précision moyenne exacte');
select pg_temp.verifier((histoire.player_stats()->>'average_score')::numeric = 720, 'score moyen exact');
select pg_temp.verifier((histoire.player_stats()->>'best_score')::integer = 900, 'record exact');
select pg_temp.verifier(histoire.player_stats()->>'games_without_context' = '1', 'ancienne partie comptée sans contexte reconstruit');
select pg_temp.verifier((select count(*) = 2 and bool_and(case m->>'mode'
  when 'solo_libre' then m->>'games' = '2' and (m->>'average_accuracy')::numeric = 90 and (m->>'average_score')::numeric = 850 and m->>'best_score' = '900'
  when 'inverse' then m->>'games' = '1' and (m->>'average_accuracy')::numeric = 60 and m->>'best_score' = '460' else false end)
  from jsonb_array_elements(histoire.player_stats()->'modes') m), 'modes exacts');
select pg_temp.verifier((select count(*) = 3 and bool_and(case c->>'kind'
  when 'pack' then c->>'games' = '2' and (c->>'average_accuracy')::numeric = 90 and c->>'best_score' = '900'
  when 'theme' then c->>'games' = '1' and (c->>'average_accuracy')::numeric = 100 and c->>'best_score' = '900'
  when 'chapter' then c->>'games' = '1' and (c->>'average_accuracy')::numeric = 80 and c->>'best_score' = '800' else false end)
  from jsonb_array_elements(histoire.player_stats()->'contexts') c), 'pack, thème et chapitre exacts');
select pg_temp.verifier(histoire.player_stats()->'accuracy_over_time' =
 '[{"month":"2026-09-01","games":1,"average_accuracy":60},{"month":"2026-10-01","games":2,"average_accuracy":90}]'::jsonb,
 'évolution mensuelle ordonnée et exacte');
select pg_temp.verifier(histoire.player_history()->'games'->0->>'id' = '00000000-0000-4000-8000-000000000002'
 and histoire.player_history()->'games'->1->>'id' = '00000000-0000-4000-8000-000000000001', 'historique date puis UUID décroissants à date identique');
select pg_temp.verifier(jsonb_array_length(histoire.player_history('00000000-0000-4000-8000-000000000002')->'games') = 2, 'curseur exclusif sans doublon');
select pg_temp.verifier(histoire.player_history()::text !~ 'user_id|anonymous_token|expected_year|"key"'
 and histoire.player_stats()::text !~ 'user_id|anonymous_token|"key"', 'projection publique minimale, aucun identifiant de contexte ni réponse');
select pg_temp.refuser($q$select histoire.player_history('00000000-0000-4000-8000-000000000004')$q$, '42501');
select pg_temp.refuser($q$select histoire.player_stats('00000000-0000-4000-8000-00000000000b'::uuid)$q$, '42883');
select pg_temp.refuser('select * from histoire.games', '42501');
select pg_temp.refuser('select * from histoire.game_questions', '42501');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000b';
select pg_temp.verifier(histoire.player_stats()->>'games' = '1' and histoire.player_stats()->>'best_score' = '100', 'B voit uniquement B');
select pg_temp.refuser($q$select histoire.player_history('00000000-0000-4000-8000-000000000001')$q$, '42501');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000c';
select pg_temp.verifier(histoire.player_stats()->>'games' = '0' and histoire.player_stats()->'best_score' = 'null'::jsonb
 and histoire.player_stats()->'average_accuracy' = 'null'::jsonb and histoire.player_stats()->'modes' = '[]'::jsonb, 'statistiques sans partie, pas de moyenne inventée');
select pg_temp.verifier(histoire.player_history() = '{"games":[],"next_cursor":null}'::jsonb, 'historique vide');
set local request.jwt.claim.sub = '';
select pg_temp.refuser('select histoire.player_stats()', '42501');
select pg_temp.refuser('select histoire.player_history()', '42501');
set local role anon;
select pg_temp.refuser('select histoire.player_stats()', '42501');
select pg_temp.refuser('select histoire.player_history()', '42501');
reset role;

-- 22 parties de plus : pages bornées à 20, dates égales et aucun trou.
insert into histoire.games(user_id,difficulty,question_count,state,finished_at,average_accuracy,total_points)
 select '00000000-0000-4000-8000-00000000000a','YEAR',1,'finished','2026-10-10T12:00:00Z',0,0 from generate_series(1,22);
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a';
select pg_temp.verifier(jsonb_array_length(histoire.player_history()->'games') = 20, 'première page limitée à 20');
select pg_temp.verifier(jsonb_array_length(histoire.player_history((histoire.player_history()->>'next_cursor')::uuid)->'games') = 5, 'seconde page contient les 5 restantes');
select pg_temp.verifier(histoire.player_history((histoire.player_history()->>'next_cursor')::uuid)->'next_cursor' = 'null'::jsonb, 'pas de page fantôme');

-- La vraie RPC moteur écrit les filtres au lancement, sans changer le tirage.
create temporary table started(id uuid); grant all on started to authenticated;
insert into started select (histoire.start_game(p_pack_id=>'COL-0059',p_question_count=>1)->>'game_id')::uuid;
insert into started select (histoire.start_game(p_chapter_ids=>array['THM-007','THM-008','THM-007'],p_question_count=>1)->>'game_id')::uuid;
reset role;
select pg_temp.verifier((select context->'pack'->>'label' from histoire.games g join started s on g.id=s.id where context->'pack'->>'key'='COL-0059')='50 dates incontournables', 'instantané du vrai pack choisi');
select pg_temp.verifier((select jsonb_array_length(context->'chapters') from histoire.games g join started s on g.id=s.id where context->>'mode'='solo_scolaire')=2, 'chapitres choisis distincts, mode scolaire conservé');
rollback;
