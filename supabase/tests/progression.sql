-- #23 : progression pédagogique. Jeu connu et identités simulées, transaction locale/CI.
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

insert into auth.users(id) values ('00000000-0000-4000-8000-00000000000a'), ('00000000-0000-4000-8000-00000000000b');
insert into histoire.games(id, user_id, difficulty, question_count, state, direction, finished_at, average_accuracy, total_points, context) values
 -- A : deux tests du chapitre THM-003 (70 % puis 90 % puis 60 %), un test inversé, une partie multichapitre, une partie en cours, un test trop court.
 ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'finished', 'date', '2026-10-08T10:00:00Z', 70, 700,
  '{"mode":"solo_scolaire","chapters":[{"key":"THM-003","label":"Thème 3","level":"CM2"}]}'),
 ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-00000000000a', 'MONTH', 10, 'finished', 'date', '2026-10-08T11:00:00Z', 90, 900,
  '{"mode":"solo_scolaire","chapters":[{"key":"THM-003","label":"Thème 3","level":"CM2"}]}'),
 ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'finished', 'date', '2026-10-08T12:00:00Z', 60, 600,
  '{"mode":"solo_scolaire","chapters":[{"key":"THM-003","label":"Thème 3","level":"CM2"}]}'),
 ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-00000000000a', 'DAY', 10, 'finished', 'inverse', '2026-10-08T12:00:00Z', 100, 1000,
  '{"mode":"solo_scolaire","chapters":[{"key":"THM-003","label":"Thème 3","level":"CM2"}]}'),
 ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'finished', 'date', '2026-10-08T12:00:00Z', 100, 1000,
  '{"mode":"solo_scolaire","chapters":[{"key":"THM-003","label":"a","level":"CM2"},{"key":"THM-005","label":"b","level":"6e"}]}'),
 ('00000000-0000-4000-8000-0000000000a6', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'playing', 'date', null, null, null,
  '{"mode":"solo_scolaire","chapters":[{"key":"THM-003","label":"Thème 3","level":"CM2"}]}'),
 ('00000000-0000-4000-8000-0000000000a7', '00000000-0000-4000-8000-00000000000a', 'YEAR', 3, 'finished', 'date', '2026-10-08T12:00:00Z', 100, 300,
  '{"mode":"solo_scolaire","chapters":[{"key":"THM-003","label":"Thème 3","level":"CM2"}]}'),
 ('00000000-0000-4000-8000-0000000000a8', '00000000-0000-4000-8000-00000000000a', 'YEAR', 10, 'finished', 'date', '2026-10-08T12:00:00Z', 100, 1000, null),
 ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'YEAR', 10, 'finished', 'date', '2026-10-08T12:00:00Z', 100, 1000,
  '{"mode":"solo_scolaire","chapters":[{"key":"THM-003","label":"Thème 3","level":"CM2"}]}');

-- Visiteur sans identité : tout est refusé, aucune lecture.
set local role authenticated;
set local request.jwt.claim.sub = '';
select pg_temp.refuser($q$select histoire.mark_chapter_discovered('THM-003')$q$, '42501');
select pg_temp.refuser($q$select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a1')$q$, '42501');
select pg_temp.verifier((select count(*) from histoire.learning_progress) = 0, 'sans identité, aucune ligne lisible');
reset role;
set local role anon;
select pg_temp.refuser('select * from histoire.learning_progress', '42501');
select pg_temp.refuser($q$select histoire.mark_chapter_discovered('THM-003')$q$, '42501');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a';
select histoire.mark_chapter_discovered('THM-003');
select histoire.mark_chapter_discovered('THM-003');
select pg_temp.verifier((select count(*) = 1 and bool_and(discovered_at is not null and best_accuracy is null and tests_count = 0)
  from histoire.learning_progress), 'découverte idempotente, une seule ligne, sans score');
select pg_temp.refuser($q$select histoire.mark_chapter_discovered('THM-999')$q$, '22023');
select pg_temp.refuser($q$select histoire.mark_chapter_discovered(null)$q$, '22023');

-- Le score vient de la partie terminée du joueur.
select pg_temp.verifier((histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a1')->>'improved')::boolean, 'premier test = amélioration');
select pg_temp.verifier((select best_accuracy = 70 and best_difficulty = 'YEAR' and tests_count = 1 and discovered_at is not null
  from histoire.learning_progress where chapter_id = 'THM-003'), 'premier test enregistré, découverte conservée');
select pg_temp.verifier((histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a2')->>'improved')::boolean, 'meilleur test = amélioration');
select pg_temp.verifier((select best_accuracy = 90 and best_difficulty = 'MONTH' and tests_count = 2 from histoire.learning_progress where chapter_id = 'THM-003'), 'meilleur test retenu');
select pg_temp.verifier(not (histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a3')->>'improved')::boolean, 'test plus faible = pas d''amélioration');
select pg_temp.verifier((select best_accuracy = 90 and best_difficulty = 'MONTH' and tests_count = 3 from histoire.learning_progress where chapter_id = 'THM-003'), 'un test plus faible ne baisse pas le meilleur');
select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a3');
select pg_temp.verifier((select tests_count = 3 from histoire.learning_progress where chapter_id = 'THM-003'), 'recharger le bilan ne compte pas deux fois');
select pg_temp.refuser($q$select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a4')$q$, '42501');
select pg_temp.refuser($q$select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a5')$q$, '22023');
select pg_temp.refuser($q$select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a6')$q$, '42501');
select pg_temp.refuser($q$select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a7')$q$, '22023');
select pg_temp.refuser($q$select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a8')$q$, '22023');
select pg_temp.refuser($q$select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000b1')$q$, '42501');
select pg_temp.refuser($q$select histoire.record_chapter_test(null)$q$, '42501');

-- Aucune écriture directe.
select pg_temp.refuser($q$insert into histoire.learning_progress(user_id, chapter_id, best_accuracy) values ('00000000-0000-4000-8000-00000000000a', 'THM-005', 100)$q$, '42501');
select pg_temp.refuser($q$update histoire.learning_progress set best_accuracy = 100$q$, '42501');
select pg_temp.refuser($q$delete from histoire.learning_progress$q$, '42501');

-- B ne voit ni n'écrit rien chez A.
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000b';
select pg_temp.verifier((select count(*) from histoire.learning_progress) = 0, 'B ne lit pas la progression de A');
select pg_temp.refuser($q$select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000a2')$q$, '42501');
select histoire.record_chapter_test('00000000-0000-4000-8000-0000000000b1');
select histoire.mark_chapter_discovered('THM-005');
select pg_temp.verifier((select count(*) = 2 and bool_and(user_id = '00000000-0000-4000-8000-00000000000b') from histoire.learning_progress), 'B ne voit que ses lignes');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a';
select pg_temp.verifier((select count(*) = 1 and bool_and(best_accuracy = 90) from histoire.learning_progress), 'A garde sa progression, sans celle de B');
reset role;
select pg_temp.verifier(has_table_privilege('authenticated', 'histoire.learning_progress', 'select')
  and not has_table_privilege('authenticated', 'histoire.learning_progress', 'insert')
  and not has_table_privilege('anon', 'histoire.learning_progress', 'select'), 'droits minimaux sur la table');
select pg_temp.verifier(exists (select 1 from histoire.migrations_appliquees where version = '20261008170000'), 'migration inscrite au registre');
rollback;
