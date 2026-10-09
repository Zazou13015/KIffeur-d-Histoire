-- #83 : niveaux Débutant / Intermédiaire / Expert et titres de question. Tests locaux/CI uniquement.
begin;
create function pg_temp.verifier(condition boolean, description text) returns void
language plpgsql as $$ begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
end $$;
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

-- 9 événements par niveau, dates toutes différentes ; un titre de question sur le niveau 1.
insert into histoire.events(id, title, event_type, precision, date_status, playable, playable_mode, importance, difficulty, niveau, titre_question)
select 'EVT-' || (9700 + i), i || 'e édition du Tournoi', 'POINT', 'DAY', 'EXACT', true, 'DAY', 1, 1, 1 + (i - 1) / 9,
  case when i = 1 then '1re édition du Tournoi' end
from generate_series(1, 27) i;
insert into histoire.event_answers(event_id, start_year, start_month, start_day)
select 'EVT-' || (9700 + i), 1900 + i, 1, 1 from generate_series(1, 27) i;
insert into histoire.packs(id, slug, title) values ('NIV-TEST', 'niv-test', 'Fixture niveaux');
insert into histoire.pack_events(pack_id, event_id, position)
select 'NIV-TEST', 'EVT-' || (9700 + i), i from generate_series(1, 27) i;

create temporary table tirages(niveau integer, game_id uuid);
grant all on tirages to anon;
set local role anon;
do $$
declare
  r jsonb;
  q jsonb;
  titres text[] := '{}';
begin
  -- Débutant : 9 événements de niveau 1 seulement ; 10 questions impossibles.
  perform pg_temp.refuser('select histoire.start_game(p_niveau => 1, p_token => repeat(''b'',64), p_pack_id => ''NIV-TEST'', p_question_count => 10)', '22023');
  r := histoire.start_game(p_niveau => 1, p_token => repeat('b',64), p_pack_id => 'NIV-TEST', p_question_count => 9, p_difficulty => 'DAY');
  insert into tirages values (1, (r->>'game_id')::uuid);
  -- Intermédiaire : niveaux 1 et 2 ; Expert : tout.
  r := histoire.start_game(p_niveau => 2, p_token => repeat('b',64), p_pack_id => 'NIV-TEST', p_question_count => 18);
  insert into tirages values (2, (r->>'game_id')::uuid);
  perform pg_temp.refuser('select histoire.start_game(p_niveau => 2, p_token => repeat(''b'',64), p_pack_id => ''NIV-TEST'', p_question_count => 19)', '22023');
  r := histoire.start_game(p_niveau => 3, p_token => repeat('b',64), p_pack_id => 'NIV-TEST', p_question_count => 27);
  insert into tirages values (3, (r->>'game_id')::uuid);
  perform pg_temp.refuser('select histoire.start_game(p_niveau => 4, p_token => repeat(''b'',64))', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_niveau => null, p_token => repeat(''b'',64))', '22023');
  -- L'ancienne signature (site en ligne, mode scolaire) répond toujours, sans filtre de niveau.
  r := histoire.start_game(p_token => repeat('b',64), p_pack_id => 'NIV-TEST', p_question_count => 27);
  perform pg_temp.verifier((r->>'question_count')::integer = 27, 'ancienne signature');

  -- Titres : le titre rédigé remplace le masquage ; les autres restent masqués.
  for i in 1..9 loop
    q := histoire.next_question((select game_id from tirages where niveau = 1), repeat('b',64));
    titres := titres || (q->>'title');
    perform histoire.submit_answer((select game_id from tirages where niveau = 1), (q->>'question_id')::uuid,
      1900, 1, 1, repeat('b',64));
  end loop;
  perform pg_temp.verifier('1re édition du Tournoi' = any(titres), 'titre de question rédigé');
  perform pg_temp.verifier('…e édition du Tournoi' = any(titres), 'titre masqué sans titre rédigé');
end $$;
reset role;
do $$ begin
  perform pg_temp.verifier((select bool_and(e.niveau = 1) from histoire.game_questions q join histoire.events e on e.id = q.event_id
    where q.game_id = (select game_id from tirages where niveau = 1)), 'Débutant : niveau 1 seulement');
  perform pg_temp.verifier((select bool_and(e.niveau <= 2) from histoire.game_questions q join histoire.events e on e.id = q.event_id
    where q.game_id = (select game_id from tirages where niveau = 2)), 'Intermédiaire : niveaux 1 et 2');
  perform pg_temp.verifier((select count(distinct e.niveau) = 3 from histoire.game_questions q join histoire.events e on e.id = q.event_id
    where q.game_id = (select game_id from tirages where niveau = 3)), 'Expert : tous les niveaux');
  perform pg_temp.verifier((select context->>'niveau' from histoire.games where id = (select game_id from tirages where niveau = 2)) = '2',
    'niveau gardé dans le contexte de la partie');
  raise notice 'OK : niveaux cumulatifs, paramètres refusés, ancienne signature, titres de question';
end $$;
rollback;
