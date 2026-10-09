-- #23 : le test d'un chapitre ne tire que parmi les événements de ses cartes. Local/CI uniquement.
begin;
create function pg_temp.verifier(condition boolean, description text) returns void
language plpgsql as $$ begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
end $$;
create function pg_temp.refuser(query text, expected_state text) returns void
language plpgsql as $$ begin
  begin execute query;
  exception when others then if sqlstate = expected_state then return; end if; raise; end;
  raise exception 'ÉCHEC : requête acceptée : %', query;
end $$;

insert into auth.users(id) values ('00000000-0000-4000-8000-0000000000c1');
insert into histoire.chapters(id, level_id, school_year, program_scope, title) values
  ('TC-CHAP', '3e', '2026-2027', 'Tronc commun', 'Fixture test de chapitre');
-- 8 événements jouables au jour dans le chapitre, dont 6 seulement ont une carte (EVT-9807 et 9808 : hors cartes).
insert into histoire.events(id, title, event_type, precision, date_status, playable, playable_mode, importance, difficulty)
select 'EVT-98' || lpad(i::text, 2, '0'), 'Test chapitre ' || i, 'POINT', 'DAY', 'EXACT', true, 'DAY', 1, 1 from generate_series(1, 8) i;
insert into histoire.event_answers(event_id, start_year, start_month, start_day)
select 'EVT-98' || lpad(i::text, 2, '0'), 1900 + i, 5, 8 from generate_series(1, 8) i;
insert into histoire.event_chapters(event_id, chapter_id, curriculum_status)
select 'EVT-98' || lpad(i::text, 2, '0'), 'TC-CHAP', 'REPERE_EDUSCOL' from generate_series(1, 8) i;
insert into histoire.chapter_cards(card_id, chapter_id, event_id, start_year, start_month, start_day,
  date_text, date_precision, date_status, title, body, takeaway, key_concepts, official_wording, sources, sort_order)
select 'CARD-tc-' || i, 'TC-CHAP', 'EVT-98' || lpad(i::text, 2, '0'), 1900 + i, 5, 8,
  '8 mai ' || (1900 + i), 'DAY', 'EXACT', 'Carte ' || i,
  repeat('Texte pédagogique pour vérifier les accès de lecture publics. ', 8),
  'À retenir : un repère.', array['repère'], 'Libellé', array['https://example.invalid'], i
from generate_series(1, 6) i;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c1';
create temp table lancement(res jsonb);
grant all on lancement to authenticated;
insert into lancement select histoire.start_chapter_test(null, 'TC-CHAP', 'DAY', 6);
select pg_temp.verifier((select res->>'question_count' = '6' and res->>'direction' = 'date' and res->>'anonymous' = 'false' from lancement), 'test lancé : 6 questions, dates, connecté');
-- Pas assez de cartes pour 7 questions, bornes de 5 à 10, chapitre ou difficulté inconnus.
select pg_temp.refuser($q$select histoire.start_chapter_test(null, 'TC-CHAP', 'DAY', 7)$q$, '22023');
select pg_temp.refuser($q$select histoire.start_chapter_test(null, 'TC-CHAP', 'DAY', 4)$q$, '22023');
select pg_temp.refuser($q$select histoire.start_chapter_test(null, 'TC-CHAP', 'DAY', 11)$q$, '22023');
select pg_temp.refuser($q$select histoire.start_chapter_test(null, 'TC-INCONNU', 'DAY', 5)$q$, '22023');
select pg_temp.refuser($q$select histoire.start_chapter_test(null, 'TC-CHAP', 'HOUR', 5)$q$, '22023');
select pg_temp.refuser($q$select histoire.start_chapter_test(null, null, 'DAY', 5)$q$, '22023');
select pg_temp.refuser('select * from histoire.game_questions', '42501');
-- Anonyme : jeton obligatoire.
set local request.jwt.claim.sub = '';
select pg_temp.refuser($q$select histoire.start_chapter_test(null, 'TC-CHAP', 'DAY', 5)$q$, '22023');
select pg_temp.verifier((histoire.start_chapter_test(repeat('a', 64), 'TC-CHAP', 'DAY', 5)->>'anonymous')::boolean, 'test anonyme avec jeton');
reset role;

-- Les questions viennent uniquement des cartes ; la partie est marquée test de chapitre.
select pg_temp.verifier((select count(*) = 6 and bool_and(event_id <= 'EVT-9806') from histoire.game_questions
  where game_id = (select (res->>'game_id')::uuid from lancement)), 'questions tirées parmi les 6 événements des cartes, jamais 9807 ni 9808');
select pg_temp.verifier((select context->>'origin' = 'test_chapitre' and context->'chapters'->0->>'key' = 'TC-CHAP' and context->>'mode' = 'solo_scolaire'
  from histoire.games where id = (select (res->>'game_id')::uuid from lancement)), 'contexte : test de chapitre, un seul chapitre');
-- Même partie terminée : elle compte pour la progression du joueur, et pour lui seul.
update histoire.games set state = 'finished', finished_at = now(), average_accuracy = 75, total_points = 450
  where id = (select (res->>'game_id')::uuid from lancement);
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000c1';
select histoire.record_chapter_test((select (res->>'game_id')::uuid from lancement));
select pg_temp.verifier((select best_accuracy = 75 and best_difficulty = 'DAY' and chapter_id = 'TC-CHAP' from histoire.learning_progress), 'test enregistré sur le chapitre testé');
reset role;
rollback;
