-- Local/CI uniquement : public.profiles est le contrat simulé de Contrée.
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

-- Compte existant de Contrée et profil privé B.
insert into public.profiles values
 ('00000000-0000-0000-0000-000000000024', 'Pseudo Contrée'),
 ('00000000-0000-0000-0000-000000000025', 'Pseudo privé B');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
select pg_temp.verifier((select username from public.profiles) = 'Pseudo Contrée', 'identité unique partagée, B invisible');
update public.profiles set username = 'Nouveau pseudo' where id = auth.uid();
select pg_temp.verifier((select username from public.profiles) = 'Nouveau pseudo', 'nouvelle lecture immédiate, sans synchronisation');
update public.profiles set username = 'Volé' where id = '00000000-0000-0000-0000-000000000025';
select pg_temp.refuser($q$insert into public.profiles values ('00000000-0000-0000-0000-000000000025','Volé')$q$, '42501');
select pg_temp.refuser($q$update public.profiles set username = 'Pseudo privé B' where id = auth.uid()$q$, '23505');
select pg_temp.refuser($q$update public.profiles set username = '' where id = auth.uid()$q$, '23514');
select pg_temp.refuser($q$update public.profiles set username = repeat('a',41) where id = auth.uid()$q$, '23514');
select pg_temp.refuser($q$update public.profiles set username = ' espaces ' where id = auth.uid()$q$, '23514');
select pg_temp.refuser($q$update public.profiles set username = 'x' || chr(127) where id = auth.uid()$q$, '23514');
select pg_temp.verifier(public.is_username_taken('Pseudo privé B'), 'unicité via RPC existante, sans lire le profil B');
select histoire.ensure_player();
select histoire.ensure_player();
select pg_temp.verifier((select count(*) from histoire.players) = 1, 'création idempotente');
select pg_temp.verifier((select display_name is null from histoire.players), 'aucun pseudo dans players');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000025';
select pg_temp.verifier((select username from public.profiles) = 'Pseudo privé B', 'B non modifié par A');
select pg_temp.verifier((select count(*) from histoire.players) = 0, 'players privé');
set local request.jwt.claim.sub = '';
select pg_temp.refuser('select histoire.ensure_player()', '42501');
reset role;

-- Parties réelles du moteur, dans les deux sens. Le claim ne change que 3 champs.
create function pg_temp.complete_game(direction text) returns uuid language plpgsql as $$
declare game_id uuid; question jsonb;
begin
  game_id := (histoire.start_game(p_token => repeat('a',64), p_question_count => 1, p_direction => direction)->>'game_id')::uuid;
  question := histoire.next_question(game_id, repeat('a',64));
  perform histoire.submit_answer(game_id, (question->>'question_id')::uuid,
    p_year => case when direction = 'date' then 2000 end,
    p_answer_text => case when direction = 'inverse' then 'Une réponse' end, p_token => repeat('a',64));
  perform histoire.finish_game(game_id, repeat('a',64));
  return game_id;
end $$;
create temporary table claim_cases(label text, id uuid, result jsonb, questions jsonb);
grant all on claim_cases to anon, authenticated;
set local role anon;
insert into claim_cases(label,id) values
 ('date',pg_temp.complete_game('date')), ('inverse',pg_temp.complete_game('inverse'));
insert into claim_cases(label,id) select 'playing',(histoire.start_game(p_token => repeat('a',64),p_question_count=>1)->>'game_id')::uuid;
select pg_temp.refuser(format('select histoire.claim_anonymous_game(%L,%L)', (select id from claim_cases where label='date'),repeat('a',64)), '42501');
reset role;
update claim_cases c set result = to_jsonb(g) - 'user_id' - 'anonymous_token_hash' - 'expires_at',
  questions = (select jsonb_agg(to_jsonb(q) order by position) from histoire.game_questions q where q.game_id=g.id)
from histoire.games g where g.id=c.id;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000025';
select pg_temp.refuser(format('select histoire.claim_anonymous_game(%L,null)', (select id from claim_cases where label='date')), '42501');
select pg_temp.refuser(format('select histoire.claim_anonymous_game(%L,%L)', (select id from claim_cases where label='date'),repeat('b',64)), '42501');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
select pg_temp.refuser(format('select histoire.claim_anonymous_game(%L,%L)', (select id from claim_cases where label='playing'),repeat('a',64)), '42501');
select histoire.claim_anonymous_game(id,repeat('a',64)) from claim_cases where label in ('date','inverse');
select pg_temp.refuser(format('select histoire.claim_anonymous_game(%L,%L)', (select id from claim_cases where label='date'),repeat('a',64)), '42501');
select pg_temp.verifier(histoire.finish_game((select id from claim_cases where label='date'))->>'state' = 'finished', 'bilan accessible au propriétaire sans token');
insert into claim_cases(label,id) select 'connected',(histoire.start_game(p_question_count=>1)->>'game_id')::uuid;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000025';
select pg_temp.refuser(format('select histoire.claim_anonymous_game(%L,%L)', (select id from claim_cases where label='date'),repeat('a',64)), '42501');
select pg_temp.refuser(format('select histoire.finish_game(%L)', (select id from claim_cases where label='date')), '42501');
reset role;
select pg_temp.verifier(bool_and(g.user_id='00000000-0000-0000-0000-000000000024' and g.anonymous_token_hash is null and g.expires_at is null), 'propriétaire Auth et disparition des secrets/expiration')
from histoire.games g join claim_cases c on c.id=g.id where c.label in ('date','inverse','connected');
select pg_temp.verifier(bool_and(c.result = to_jsonb(g)-'user_id'-'anonymous_token_hash'-'expires_at'
 and c.questions = (select jsonb_agg(to_jsonb(q) order by position) from histoire.game_questions q where q.game_id=g.id)), 'score, questions, sens et tous les instantanés conservés')
from histoire.games g join claim_cases c on c.id=g.id where c.label in ('date','inverse');

-- Expiration exacte à 24h, même pour une partie terminée avec le bon secret.
set local request.jwt.claim.sub = '';
insert into claim_cases(label,id) select 'expired',pg_temp.complete_game('date');
update histoire.games set created_at=statement_timestamp()-interval '25 hours', expires_at=statement_timestamp()-interval '1 hour'
where id=(select id from claim_cases where label='expired');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
select pg_temp.refuser(format('select histoire.claim_anonymous_game(%L,%L)', (select id from claim_cases where label='expired'),repeat('a',64)), '42501');
reset role;
select histoire.purge_expired_anonymous_games();
select pg_temp.verifier((select count(*) from histoire.games g join claim_cases c on c.id=g.id where c.label in ('date','inverse','connected'))=3, 'purge préserve les sauvegardes');
rollback;
