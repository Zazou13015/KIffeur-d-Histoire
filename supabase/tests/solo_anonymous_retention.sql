-- Rétention/budget : Postgres local et CI uniquement, aucun compte écrit dans auth.
begin;
create function pg_temp.verifier(condition boolean, description text) returns void
language plpgsql as $$ begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
end $$;
create function pg_temp.refuser(query text, expected_state text) returns void
language plpgsql as $$ begin
  begin execute query;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'ÉCHEC : requête acceptée : %', query;
end $$;
create temporary table retention_fixture(kind text primary key, game_id uuid, question_id uuid, snapshot jsonb);
grant all on retention_fixture to anon, authenticated;
set local role anon;
insert into retention_fixture(kind,game_id)
select kind, (histoire.start_game(p_token => repeat('a',64), p_question_count => 1)->>'game_id')::uuid
from unnest(array['expired-playing','expired-finished','current']) kind;
update retention_fixture set question_id = (histoire.next_question(game_id,repeat('a',64))->>'question_id')::uuid;
select histoire.submit_answer(game_id,question_id,2000,p_token => repeat('a',64))
from retention_fixture where kind = 'expired-finished';
select histoire.finish_game(game_id,repeat('a',64)) from retention_fixture where kind = 'expired-finished';
reset role;
do $$ begin
  perform pg_temp.verifier(not exists(select 1 from histoire.games where user_id is null
    and (expires_at is null or expires_at-created_at <> interval '24 hours')), 'expiration fixée à 24 heures');
end $$;
update histoire.games set created_at = created_at-interval '25 hours',
  expires_at = created_at-interval '1 hour'
where id in (select game_id from retention_fixture where kind like 'expired-%');
-- Borne inclusive : expire à 24 h, sans attendre 24 h + une seconde.
update histoire.games set created_at = transaction_timestamp()-interval '24 hours',
  expires_at = transaction_timestamp()
where id = (select game_id from retention_fixture where kind='expired-finished');
set local role anon;
do $$ declare f record; begin
  for f in select * from retention_fixture where kind like 'expired-%' loop
    perform pg_temp.refuser(format('select histoire.next_question(%L,%L)', f.game_id,repeat('a',64)), '42501');
    perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,2000,p_token => %L)', f.game_id,f.question_id,repeat('a',64)), '42501');
    perform pg_temp.refuser(format('select histoire.finish_game(%L,%L)', f.game_id,repeat('a',64)), '42501');
  end loop;
  -- L'utilisateur ne peut prolonger sa rétention, augmenter le budget ou appeler le trigger.
  perform pg_temp.refuser('update histoire.games set expires_at = clock_timestamp()+interval ''1 year''', '42501');
  perform pg_temp.refuser('select * from histoire.solo_anonymous_limits', '42501');
  perform pg_temp.refuser('update histoire.solo_anonymous_limits set max_games=1000000', '42501');
  perform pg_temp.refuser('select histoire.guard_anonymous_game_creation()', '42501');
end $$;
reset role;

-- Connexion simulée : aucune expiration et conservation des données après purge.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000013',true);
set local role authenticated;
insert into retention_fixture(kind,game_id)
select kind, (histoire.start_game(p_question_count => 1)->>'game_id')::uuid
from unnest(array['connected-playing','connected-finished']) kind;
update retention_fixture set question_id = (histoire.next_question(game_id)->>'question_id')::uuid
where kind like 'connected-%';
select histoire.submit_answer(game_id,question_id,2000) from retention_fixture where kind = 'connected-finished';
select histoire.finish_game(game_id) from retention_fixture where kind = 'connected-finished';
reset role;
update histoire.games set created_at = clock_timestamp()-interval '72 hours'
where id in (select game_id from retention_fixture where kind like 'connected-%');
update retention_fixture f set snapshot = jsonb_build_object('game',to_jsonb(g),
  'questions',(select jsonb_agg(to_jsonb(q) order by q.position) from histoire.game_questions q where q.game_id = g.id))
from histoire.games g where f.game_id = g.id and f.kind like 'connected-%';
set local role authenticated;
select histoire.purge_expired_anonymous_games();
do $$ declare f record; begin
  for f in select * from retention_fixture where kind like 'connected-%' loop
    if f.kind = 'connected-playing' then
      perform pg_temp.verifier(histoire.next_question(f.game_id)->>'question_id' = f.question_id::text, 'ancienne partie connectée encore accessible');
    else
      perform pg_temp.verifier(histoire.finish_game(f.game_id)->>'state' = 'finished', 'ancien bilan connecté accessible');
    end if;
  end loop;
end $$;
reset role;
do $$ begin
  perform pg_temp.verifier(not exists(select 1 from histoire.games where id in
    (select game_id from retention_fixture where kind like 'expired-%')), 'purge des anonymes en cours et terminées');
  perform pg_temp.verifier(not exists(select 1 from histoire.game_questions where game_id in
    (select game_id from retention_fixture where kind like 'expired-%')), 'suppression des questions par cascade');
  perform pg_temp.verifier(exists(select 1 from histoire.games where id =
    (select game_id from retention_fixture where kind='current')), 'anonyme non expirée conservée');
  perform pg_temp.verifier(not exists(select 1 from retention_fixture f join histoire.games g on g.id=f.game_id
    where f.kind like 'connected-%' and (g.expires_at is not null or f.snapshot <> jsonb_build_object('game',to_jsonb(g),
      'questions',(select jsonb_agg(to_jsonb(q) order by q.position) from histoire.game_questions q where q.game_id=g.id)))), 'parties connectées strictement inchangées');
end $$;

-- Budget : jouer sur des limites réduites, jamais sur le réglage réel en production.
select set_config('request.jwt.claim.sub','',true);
update histoire.solo_anonymous_limits set max_games=1, max_questions=10000;
set local role anon;
select pg_temp.refuser('select histoire.start_game(p_token=>repeat(''b'',64),p_question_count=>1)', '53400');
reset role;
update histoire.solo_anonymous_limits set max_games=1000,max_questions=1;
set local role anon;
select pg_temp.refuser('select histoire.start_game(p_token=>repeat(''c'',64),p_question_count=>1)', '53400');
reset role;
-- Capacité libérée automatiquement par une création directe, sans passer par Next.js.
update histoire.games set created_at = created_at-interval '25 hours',
  expires_at = created_at-interval '1 hour' where user_id is null;
update histoire.solo_anonymous_limits set max_games=1,max_questions=1;
set local role anon;
select histoire.start_game(p_token=>repeat('d',64),p_question_count=>1);
select pg_temp.refuser('select histoire.start_game(p_token=>repeat(''e'',64),p_question_count=>1)', '53400');
-- Une purge publique est sans effet sur les parties encore valides.
select histoire.purge_expired_anonymous_games();
select pg_temp.refuser('select histoire.start_game(p_token=>repeat(''f'',64),p_question_count=>1)', '53400');
reset role;
do $$ begin
  perform pg_temp.verifier((select count(*) from histoire.games where user_id is null)=1, 'budget global malgré les jetons distincts');
  perform pg_temp.verifier(not exists(select 1 from histoire.game_questions where game_id =
    (select game_id from retention_fixture where kind='current')), 'purge automatique du trigger et cascade');
end $$;
-- Le quota anonyme n'empêche pas les comptes de créer ou de finir leurs parties.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000013',true);
set local role authenticated;
select histoire.start_game(p_question_count=>1);
reset role;
do $$ begin
  raise notice 'OK : expiration 24 h, accès refusés, purge/cascade, budget global et comptes inchangés';
end $$;
rollback;
