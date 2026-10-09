-- #26 : indicateurs de réussite sur des données de test. Local/CI uniquement.
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

-- Parties laissées par d'autres tests : sorties des fenêtres (annulé par le rollback).
update histoire.kpi_games set created_at = created_at - interval '1 year', finished_at = finished_at - interval '1 year';

-- Deux comptes : U1 administrateur, U2 joueur. Deux navigateurs anonymes : V1 et V2.
insert into auth.users(id) values ('00000000-0000-4000-8000-0000000000d1'), ('00000000-0000-4000-8000-0000000000d2');
insert into histoire.players(id) values ('00000000-0000-4000-8000-0000000000d1'), ('00000000-0000-4000-8000-0000000000d2');
insert into histoire.admins(user_id, note) values ('00000000-0000-4000-8000-0000000000d1', 'fixture');
insert into histoire.chapters(id, level_id, school_year, program_scope, title) values
  ('KPI-CHAP', '3e', '2026-2027', 'Tronc commun', 'Fixture indicateurs');
insert into histoire.events(id, title, event_type, precision, date_status, playable, playable_mode, importance, difficulty)
select 'EVT-97' || lpad(i::text, 2, '0'), 'Indicateur ' || i, 'POINT', 'DAY', 'EXACT', true, 'DAY', 1, 1 from generate_series(1, 6) i;
insert into histoire.event_answers(event_id, start_year, start_month, start_day)
select 'EVT-97' || lpad(i::text, 2, '0'), 1800 + i, 3, 4 from generate_series(1, 6) i;
insert into histoire.event_chapters(event_id, chapter_id, curriculum_status)
select 'EVT-97' || lpad(i::text, 2, '0'), 'KPI-CHAP', 'REPERE_EDUSCOL' from generate_series(1, 6) i;
insert into histoire.chapter_cards(card_id, chapter_id, event_id, start_year, start_month, start_day,
  date_text, date_precision, date_status, title, body, takeaway, key_concepts, official_wording, sources, sort_order)
select 'CARD-kpi-' || i, 'KPI-CHAP', 'EVT-97' || lpad(i::text, 2, '0'), 1800 + i, 3, 4,
  '4 mars ' || (1800 + i), 'DAY', 'EXACT', 'Carte ' || i,
  repeat('Texte pédagogique pour vérifier les indicateurs de réussite. ', 8),
  'À retenir : un repère.', array['repère'], 'Libellé', array['https://example.invalid'], i
from generate_series(1, 6) i;

create temp table parties(nom text primary key, id uuid);
grant all on parties to anon, authenticated;

-- Test de chapitre sans compte (V1) : 5 questions, rattaché au visiteur, saisies notées.
set local role anon;
set local request.jwt.claim.sub = '';
insert into parties select 'A', (histoire.start_chapter_test(repeat('a', 64), 'KPI-CHAP', 'DAY', 5)->>'game_id')::uuid;
select histoire.kpi_noter_visiteur((select id from parties where nom = 'A'), '00000000-0000-4000-8000-0000000000f1', repeat('a', 64));
-- Un second appel ne change pas le visiteur.
select histoire.kpi_noter_visiteur((select id from parties where nom = 'A'), '00000000-0000-4000-8000-0000000000f2', repeat('a', 64));
-- Mauvais jeton : partie inaccessible.
select pg_temp.refuser($q$select histoire.kpi_noter_visiteur((select id from parties where nom = 'A'), gen_random_uuid(), repeat('b', 64))$q$, '42501');
reset role;
-- Les réponses sont corrigées par submit_answer (testé ailleurs) : on les simule ici.
update histoire.game_questions set asked_at = now() - interval '10 seconds', deadline = now() + interval '20 seconds',
  answered_at = now(), expired = position = 5, accuracy = 40, points = 30
  where game_id = (select id from parties where nom = 'A');
create temp table questions_a as select id, position from histoire.game_questions where game_id = (select id from parties where nom = 'A');
grant select on questions_a to anon;
set local role anon;
select histoire.kpi_noter_saisie((select id from parties where nom = 'A'), q.id,
  case when q.position <= 3 then 'frise' else 'clavier' end, repeat('a', 64)) from questions_a q;
-- Une seconde saisie sur la même question n'est pas recomptée ; méthode inconnue refusée.
select histoire.kpi_noter_saisie((select id from parties where nom = 'A'), (select id from questions_a where position = 1), 'clavier', repeat('a', 64));
select pg_temp.refuser($q$select histoire.kpi_noter_saisie((select id from parties where nom = 'A'), (select id from questions_a where position = 2), 'souris', repeat('a', 64))$q$, '22023');
reset role;
select pg_temp.verifier((select count(*) filter (where input_method = 'frise') = 3 and count(*) filter (where input_method = 'clavier') = 1
  and count(*) filter (where input_method is null) = 1 from histoire.game_questions where game_id = (select id from parties where nom = 'A')),
  'méthode notée sur chaque réponse, une seule fois, jamais sur une question expirée');
update histoire.games set state = 'finished', finished_at = now(), average_accuracy = 40, total_points = 120
  where id = (select id from parties where nom = 'A');

-- U2 sauvegarde cette partie sur son compte, puis refait le test connecté depuis le même navigateur.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000d2';
select histoire.claim_anonymous_game((select id from parties where nom = 'A'), repeat('a', 64));
insert into parties select 'B', (histoire.start_chapter_test(null, 'KPI-CHAP', 'DAY', 5)->>'game_id')::uuid;
select histoire.kpi_noter_visiteur((select id from parties where nom = 'B'), '00000000-0000-4000-8000-0000000000f1');
-- U2 n'est pas administrateur, et personne ne lit le journal ni les vues directement.
select pg_temp.refuser('select histoire.admin_indicateurs()', '42501');
select pg_temp.refuser('select * from histoire.kpi_games', '42501');
select pg_temp.refuser('select * from histoire.kpi_retour_semaine', '42501');
select pg_temp.refuser('select * from histoire.admins', '42501');
reset role;
update histoire.games set state = 'finished', finished_at = now() + interval '1 minute', average_accuracy = 70, total_points = 300
  where id = (select id from parties where nom = 'B');

-- U1 : une partie libre et une inversée aujourd'hui, une partie libre il y a 3 jours, une scolaire il y a 20 jours.
insert into histoire.games(user_id, difficulty, question_count, direction, context)
select '00000000-0000-4000-8000-0000000000d1', 'YEAR', 10, d, jsonb_build_object('mode', m)
from (values ('date', 'solo_libre'), ('inverse', 'solo_libre'), ('date', 'solo_libre'), ('date', 'solo_scolaire')) v(d, m);
update histoire.kpi_games set created_at = now() - interval '3 days'
  where game_id = (select id from histoire.games where user_id = '00000000-0000-4000-8000-0000000000d1' and direction = 'date' and context->>'mode' = 'solo_libre' order by id limit 1);
update histoire.kpi_games set created_at = now() - interval '20 days'
  where game_id = (select id from histoire.games where user_id = '00000000-0000-4000-8000-0000000000d1' and context->>'mode' = 'solo_scolaire');

-- V2 : joue sans compte, sans jamais se connecter.
set local role anon;
set local request.jwt.claim.sub = '';
insert into parties select 'C', (histoire.start_chapter_test(repeat('c', 64), 'KPI-CHAP', 'YEAR', 5)->>'game_id')::uuid;
select histoire.kpi_noter_visiteur((select id from parties where nom = 'C'), '00000000-0000-4000-8000-0000000000f2', repeat('c', 64));
select pg_temp.refuser('select histoire.admin_indicateurs()', '42501');
reset role;

-- Les parties anonymes expirées sont purgées : le journal, lui, reste.
update histoire.games set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour'
  where id = (select id from parties where nom = 'C');
select histoire.purge_expired_anonymous_games();
select pg_temp.verifier(not exists (select 1 from histoire.games where id = (select id from parties where nom = 'C'))
  and exists (select 1 from histoire.kpi_games where game_id = (select id from parties where nom = 'C')), 'journal conservé après la purge');

-- Lecture par l'administrateur.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-0000000000d1';
create temp table kpi as select histoire.admin_indicateurs() as k;
reset role;
select pg_temp.verifier((select jsonb_array_length(k->'parties_par_session') = 2 from kpi), 'deux fenêtres : 7 et 30 jours');
-- Sessions sur 7 jours : U2 (A puis B), U1 aujourd'hui, U1 il y a 3 jours, V2 = 4 ; 6 parties, 2 terminées (A et B).
select pg_temp.verifier((select (v->>'sessions')::int = 4 and (v->>'parties_lancees')::int = 6 and (v->>'parties_terminees')::int = 2
  and (v->>'parties_terminees_par_session')::numeric = 0.5
  from kpi, jsonb_array_elements(k->'parties_par_session') v where (v->>'jours')::int = 7), 'parties terminées par session sur 7 jours');
select pg_temp.verifier((select (v->>'sessions')::int = 5 and (v->>'parties_lancees')::int = 7
  from kpi, jsonb_array_elements(k->'parties_par_session') v where (v->>'jours')::int = 30), 'sur 30 jours, la partie d''il y a 20 jours compte');
-- Retour : U1 (il y a 3 jours puis aujourd'hui) revient ; U2 et V2 non.
select pg_temp.verifier((select (v->>'joueurs')::int = 3 and (v->>'joueurs_revenus')::int = 1 and (v->>'part_revenus')::numeric = 33.3
  from kpi, jsonb_array_elements(k->'retour_semaine') v where (v->>'jours')::int = 7), 'retour dans la semaine');
-- Modes sur 7 jours : 3 tests de chapitre, 2 libres, 1 inversée ; sur 30 jours, + 1 scolaire.
select pg_temp.verifier((select (v->>'pedagogique')::int = 3 and (v->>'libre')::int = 2 and (v->>'inverse')::int = 1
  and (v->>'scolaire')::int = 0 and (v->>'part_scolaire_pedagogique')::numeric = 50
  from kpi, jsonb_array_elements(k->'repartition_modes') v where (v->>'jours')::int = 7), 'répartition des modes sur 7 jours');
select pg_temp.verifier((select (v->>'scolaire')::int = 1 and (v->>'parties')::int = 7
  from kpi, jsonb_array_elements(k->'repartition_modes') v where (v->>'jours')::int = 30), 'répartition des modes sur 30 jours');
-- Conversion : V1 a joué sans compte puis s'est connecté (U2) ; V2 non.
select pg_temp.verifier((select (v->>'joueurs_sans_compte')::int = 2 and (v->>'joueurs_convertis')::int = 1 and (v->>'part_convertis')::numeric = 50
  from kpi, jsonb_array_elements(k->'conversion_compte') v where (v->>'jours')::int = 7), 'conversion sans compte vers compte');
-- Saisie : 3 frise, 1 clavier, aucun calendrier.
select pg_temp.verifier((select (v->>'frise')::int = 3 and (v->>'clavier')::int = 1 and (v->>'calendrier')::int = 0
  and (v->>'part_frise')::numeric = 75
  from kpi, jsonb_array_elements(k->'methodes_saisie') v where (v->>'jours')::int = 7), 'répartition frise / clavier / calendrier');
-- Progression : U2 passe de 40 à 70 sur le même chapitre.
select pg_temp.verifier((select (v->>'joueurs_chapitres')::int = 1 and (v->>'en_progres')::int = 1 and (v->>'gain_moyen')::numeric = 30
  from kpi, jsonb_array_elements(k->'progression_chapitre') v where (v->>'jours')::int = 7), 'progression du score sur un même chapitre');
rollback;
