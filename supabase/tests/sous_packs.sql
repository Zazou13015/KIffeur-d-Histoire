-- #89 : simulateur local/CI uniquement ; toutes les fixtures sont annulées.
begin;
set local request.jwt.claim.sub = '';
create function pg_temp.verifier(condition boolean, description text) returns void language plpgsql as $$ begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
end $$;
create function pg_temp.refuser(query text, expected_state text) returns void language plpgsql as $$ begin
  begin execute query;
  exception when others then if sqlstate = expected_state then return; end if; raise; end;
  raise exception 'ÉCHEC : requête acceptée : %', query;
end $$;
update histoire.packs set active=false;
update histoire.tags set active=false;
insert into histoire.packs(id,slug,title) values ('P89','parent89','Guerres et batailles'),('F89','plat89','Pack sans enfant');
insert into histoire.packs(id,slug,title,parent_id) values
  ('C89','enfant89','Conflits du XXe siècle','P89'),('V89','vide89','Sous-pack vide','P89');
insert into histoire.packs(id,slug,title,parent_id) values ('G89','petit89','Batailles européennes','C89');
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau)
  select 'EVT-' || (89000+i),'Bataille de test ' || i,'POINT','DAY','EXACT',true,'DAY',1,1,
    case when i<=5 then 1 when i<=15 then 2 else 3 end from generate_series(1,25) i;
insert into histoire.event_answers(event_id,start_year,start_month,start_day)
  select 'EVT-' || (89000+i),1900+least(i,24),case when i<=22 then 1 end,
    case when i<=21 then 2 end from generate_series(1,25) i;
-- Une plage garde son début comme date jouable.
update histoire.events set precision='DAY_RANGE',playable_mode='RANGE',event_type='EVENT' where id='EVT-89001';
update histoire.event_answers set end_year=1902,end_month=1,end_day=3 where event_id='EVT-89001';
insert into histoire.pack_events(pack_id,event_id,position)
  select 'P89','EVT-' || (89000+i),i from generate_series(1,10) i;
insert into histoire.pack_events(pack_id,event_id,position)
  select p,'EVT-' || (89000+i),i from generate_series(6,25) i cross join unnest(array['C89','F89']) p;
insert into histoire.pack_events(pack_id,event_id,position) values ('G89','EVT-89011',1);

select pg_temp.verifier(histoire.available_questions(p_pack_id=>'P89')='{"YEAR":25,"MONTH":22,"DAY":21}'::jsonb,'union sans doublons et précisions');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'C89')->>'YEAR')::int=20,'périmètre enfant');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'F89')->>'YEAR')::int=20,'ancien pack plat');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'V89')->>'YEAR')::int=0,'enfant vide');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'P89',p_niveau=>1)->>'YEAR')::int=5,'niveau débutant');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'P89',p_niveau=>2)->>'YEAR')::int=15,'niveau intermédiaire cumulatif');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'P89',p_direction=>'inverse')->>'YEAR')::int=24,'déduplication des dates inversées');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'P89',p_year_min=>1901,p_year_max=>1901)->>'DAY')::int=1,'début de plage et filtre temporel');
select pg_temp.refuser($q$update histoire.packs set parent_id='P89' where id='P89'$q$,'23514');
select pg_temp.refuser($q$update histoire.packs set parent_id='G89' where id='P89'$q$,'23514');
select pg_temp.refuser($q$update histoire.packs set parent_id='absent89' where id='P89'$q$,'23503');
select pg_temp.refuser($q$update histoire.packs set parent_id=case id when 'P89' then 'F89' else 'P89' end where id in ('P89','F89')$q$,'23514');

insert into histoire.pack_event_status values ('P89','EVT-89006',true),('C89','EVT-89011',true);
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'P89')->>'YEAR')::int=23,'retraits parent et branche, y compris petit-enfant');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'C89')->>'YEAR')::int=19,'retrait parent ne change pas enfant direct');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'F89')->>'YEAR')::int=20,'autre pack intact');
delete from histoire.pack_event_status where pack_id in ('P89','C89');
update histoire.packs set active=false where id='C89';
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'P89')->>'YEAR')::int=10,'branche inactive non héritée');
select pg_temp.verifier((histoire.available_questions(p_pack_id=>'G89')->>'YEAR')::int=1,'petit-enfant directement actif');
update histoire.packs set active=true where id='C89';

do $$ declare g jsonb; direction text; precision text; longueur int; pack text; n int; available int;
begin
  foreach pack in array array['P89','C89','F89'] loop
    foreach direction in array array['date','inverse'] loop
      foreach precision in array array['YEAR','MONTH','DAY'] loop
      foreach longueur in array array[5,10,20,0] loop
        available := (histoire.available_questions(p_pack_id=>pack,p_direction=>direction)->>precision)::int;
        if longueur > available then
          perform pg_temp.refuser(format('select histoire.start_game(p_niveau=>3,p_token=>%L,p_pack_id=>%L,p_direction=>%L,p_difficulty=>%L,p_question_count=>%s)',
            repeat('b',64),pack,direction,precision,longueur),'22023');
          continue;
        end if;
        g := histoire.start_game(p_niveau=>3,p_token=>repeat('b',64),p_pack_id=>pack,
          p_direction=>direction,p_difficulty=>precision,p_question_count=>longueur);
        n := case when longueur=0 then available else longueur end;
        perform pg_temp.verifier((g->>'question_count')::int=n,'longueur exacte');
        perform pg_temp.verifier((select count(distinct event_id)=n from histoire.game_questions where game_id=(g->>'game_id')::uuid),'tirage unique');
        perform pg_temp.verifier((select context->'replay_filters'->>'packId'=pack and
          (context->'replay_filters'->>'questionCount')::int=longueur from histoire.games where id=(g->>'game_id')::uuid),'choix de relance figé');
      end loop;
      end loop;
    end loop;
  end loop;
end $$;

-- Corrections globales, retraits et hiérarchie survivent à un upsert d'import.
insert into histoire.players(id) values ('00000000-0000-0000-0000-000000000024'),
  ('00000000-0000-0000-0000-000000000025') on conflict do nothing;
insert into histoire.admins(user_id,note) values ('00000000-0000-0000-0000-000000000024','Fixture #89') on conflict do nothing;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
select histoire.admin_edit_event('C89','EVT-89006','Bataille corrigée',1,'Relecture #89');
select histoire.admin_remove_pack_event('C89','EVT-89006','Retrait #89');
select histoire.admin_restore_pack_event('C89','EVT-89006');
select pg_temp.verifier(jsonb_array_length(histoire.admin_event_history('EVT-89006'))=1,'historique global');
select pg_temp.verifier(exists (select 1 from jsonb_array_elements(histoire.admin_list_packs()) p
  where p->>'id'='P89' and (p->>'scope_playable')::int=25 and (p->>'total')::int=10),'inventaire direct et union');
insert into histoire.packs(id,slug,title) values ('C89','enfant89','Conflits importés')
  on conflict(id) do update set slug=excluded.slug,title=excluded.title;
update histoire.events set title='Titre du dataset',niveau=3 where id='EVT-89006';
select pg_temp.verifier((select parent_id='P89' from histoire.packs where id='C89'),'parent conservé par import sans parent_id');
select pg_temp.verifier((select title='Bataille corrigée' and niveau=1 from histoire.events where id='EVT-89006'),'correction globale conservée');
select pg_temp.verifier(not exists (select 1 from histoire.game_questions where event_id='EVT-89006' and title='Bataille corrigée'),'instantanés des parties antérieures inchangés');
select pg_temp.verifier((select count(*)=2 from histoire.pack_event_audit where pack_id='C89' and event_id='EVT-89006'),'audit retrait/remise conservé');
set local request.jwt.claim.sub = '';

-- Les mêmes projections et contrôles de partie s'appliquent aux descendants.
do $$ declare g jsonb; q jsonb; sens text;
begin
  foreach sens in array array['date','inverse'] loop
    g := histoire.start_game(p_niveau=>3,p_pack_id=>'G89',p_token=>repeat('d',64),p_question_count=>1,p_direction=>sens);
    q := histoire.next_question((g->>'game_id')::uuid,repeat('d',64));
    perform pg_temp.verifier(not q ? 'event_id' and not q ? 'aliases' and not q ? 'description','question sans réponses privées');
    if sens='date' then
      perform pg_temp.verifier(not q ? 'date' and not q ? 'expected_year','classique sans date');
    else
      perform pg_temp.verifier(not q ? 'title' and not q ? 'image_path','inverse sans événement attendu');
    end if;
    perform pg_temp.refuser(format('select histoire.next_question(%L::uuid,%L)',g->>'game_id',repeat('e',64)),'42501');
  end loop;
end $$;

-- Roulette : le parent est éligible par son union et un enfant peut être rejoué.
do $$ declare g jsonb; pack text;
begin
  foreach pack in array array['P89','C89'] loop
    g := histoire.start_mystery_game(p_token=>repeat('c',64),p_niveau=>3,p_pack_id=>pack,p_question_count=>20);
    perform pg_temp.verifier(g->'mystery'->'winner'->>'id'=pack,'mystère parent/enfant');
    perform pg_temp.verifier(not exists (select 1 from jsonb_array_elements(g->'mystery'->'candidates') c where c->>'id'='V89'),'vide exclu roulette');
  end loop;
end $$;

set local role anon;
select pg_temp.refuser('select * from histoire.pack_hierarchy_lock','42501');
select pg_temp.refuser($q$select * from histoire.pack_scope_events('P89')$q$,'42501');
select pg_temp.refuser($q$update histoire.packs set parent_id=null where id='C89'$q$,'42501');
select pg_temp.refuser('select histoire.admin_list_packs()','42501');
select pg_temp.refuser('select * from histoire.event_answers','42501');
select pg_temp.refuser('select * from histoire.event_aliases','42501');
select pg_temp.verifier(not exists (select 1 from jsonb_array_elements(histoire.playable_packs(3)) p
  where p ? 'event_id' or p ? 'start_year' or p ? 'alias'),'catalogue sans réponses');
reset role;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000025';
set local role authenticated;
select pg_temp.refuser('select histoire.admin_list_packs()','42501');
select pg_temp.refuser($q$select histoire.admin_remove_pack_event('C89','EVT-89006')$q$,'42501');
select pg_temp.refuser($q$select histoire.admin_edit_event('C89','EVT-89006','Pirate',1)$q$,'42501');
reset role;
rollback;
