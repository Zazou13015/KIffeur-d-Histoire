-- #87 : simulateur LOCAL/CI de scripts/tests-sql.sh, aucune base distante.
-- Réutilise les deux comptes fictifs de kffr_profiles.sql, sans écriture hors histoire.
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
insert into histoire.players(id) values
  ('00000000-0000-0000-0000-000000000024'),('00000000-0000-0000-0000-000000000025') on conflict do nothing;
insert into histoire.admins(user_id,note) values ('00000000-0000-0000-0000-000000000024','fixture #87');
update histoire.packs set active = false;
update histoire.tags set active = false;
insert into histoire.packs(id,slug,title) values ('A87','a87','Pack relu'),('B87','b87','Autre pack');
insert into histoire.tags(id,slug,name,tag_type) values ('T87','t87','Autre thème','SEMANTIC_TOPIC');
insert into histoire.chapters(id,level_id,school_year,program_scope,title)
  values ('C87','3e','2026-2027','Tronc commun','Chapitre préservé');
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau)
select 'EVT-' || (87000+i),'Question administration ' || i,'POINT','DAY','EXACT',i <> 21,case when i=21 then 'NOT_AUTOMATIC' else 'DAY' end,1,1,
  case when i <= 6 then 1 when i <= 12 then 2 else 3 end from generate_series(1,22) i;
insert into histoire.event_answers(event_id,start_year,start_month,start_day)
select 'EVT-' || (87000+i),1900+i,1,2 from generate_series(1,21) i;
insert into histoire.pack_events(pack_id,event_id,position)
select 'A87','EVT-' || (87000+i),i from generate_series(1,22) i;
insert into histoire.pack_events(pack_id,event_id,position)
select 'B87','EVT-' || (87000+i),i from generate_series(1,20) i;
insert into histoire.event_tags(event_id,tag_id) select 'EVT-' || (87000+i),'T87' from generate_series(1,20) i;
insert into histoire.event_levels(event_id,level_id) select 'EVT-' || (87000+i),'3e' from generate_series(1,20) i;
insert into histoire.event_chapters(event_id,chapter_id) select 'EVT-' || (87000+i),'C87' from generate_series(1,20) i;
insert into histoire.chapter_cards(card_id,chapter_id,event_id,start_year,start_month,start_day,
  date_text,date_precision,date_status,title,body,takeaway,key_concepts,official_wording,sources,sort_order)
select 'CARD-a87-' || i,'C87','EVT-' || (87000+i),1900+i,1,2,'2 janvier ' || (1900+i),'DAY','EXACT',
  'Carte ' || i,repeat('Texte pédagogique pour vérifier la préservation des chapitres. ',8),
  'À retenir : un repère.',array['repère'],'Libellé',array['https://example.invalid'],i from generate_series(1,20) i;
create temp table tirages(id uuid,pack text,sens text);
grant all on tirages to anon,authenticated;

-- Aucun anonyme (y compris une session authenticated sans auth.uid) ne peut lire les dates.
set local role anon;
select pg_temp.refuser('select histoire.admin_list_packs()','42501');
select pg_temp.refuser('select histoire.admin_pack_questions(''A87'')','42501');
select pg_temp.refuser('select histoire.admin_remove_pack_event(''A87'',''EVT-87001'')','42501');
select pg_temp.refuser('select histoire.admin_restore_pack_event(''A87'',''EVT-87001'')','42501');
reset role;
set local role authenticated;
select pg_temp.refuser('select histoire.admin_pack_questions(''A87'')','42501');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000025';
do $$ declare query text; begin
  foreach query in array array['select histoire.admin_list_packs()',
    'select histoire.admin_pack_questions(''A87'')',
    'select histoire.admin_remove_pack_event(''A87'',''EVT-87001'')',
    'select histoire.admin_restore_pack_event(''A87'',''EVT-87001'')',
    'select * from histoire.event_answers','select * from histoire.pack_event_status',
    'select * from histoire.pack_event_audit',
    'select histoire.admin_change_pack_event(''A87'',''EVT-87001'',true,null)'] loop
    perform pg_temp.refuser(query,'42501');
  end loop;
end $$;

-- Un compte autorisé voit toutes les questions, même non jouables et sans réponse.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
do $$ declare qs jsonb; r jsonb; p jsonb; begin
  qs := histoire.admin_pack_questions('A87');
  perform pg_temp.verifier(jsonb_array_length(qs)=22,'toutes les questions');
  perform pg_temp.verifier(qs->0->>'start_year'='1901' and qs->0->>'niveau'='1','dates et niveaux admin');
  perform pg_temp.verifier(qs->20->>'playable'='false' and qs->21->>'start_year' is null,'questions non jouables');
  perform pg_temp.refuser('select histoire.admin_pack_questions(''inconnu'')','22023');
  perform pg_temp.refuser('select histoire.admin_remove_pack_event(''A87'',''inconnu'')','22023');
  perform pg_temp.refuser('select histoire.admin_remove_pack_event(''A87'',''EVT-87001'',repeat(''x'',1001))','22023');
  r := histoire.admin_remove_pack_event('A87','EVT-87001','  Hors thème  ');
  perform pg_temp.verifier(r->>'changed'='true' and r->'questions'->0->>'removed'='true','retrait effectif');
  select x into p from jsonb_array_elements(r->'packs') x where x->>'id'='A87';
  perform pg_temp.verifier(p->>'playable'='19' and p->>'retired'='1' and p->>'total'='22','décomptes réels admin');
  perform pg_temp.verifier(histoire.admin_remove_pack_event('A87','EVT-87001','double clic')->>'changed'='false','retrait idempotent');
  perform pg_temp.verifier(histoire.admin_pack_questions('B87')->0->>'removed'='false','autre pack préservé');
end $$;
-- Même l'administrateur ne peut contourner les RPC ni effacer l'historique.
select pg_temp.refuser('update histoire.pack_event_status set removed=false','42501');
select pg_temp.refuser('delete from histoire.pack_event_audit','42501');
reset role;
select pg_temp.verifier((select count(*)=1 and min(reason)='Hors thème'
  and bool_and(admin_id='00000000-0000-0000-0000-000000000024'::uuid and occurred_at is not null)
  from histoire.pack_event_audit where pack_id='A87'),'audit conservé et attribué');

-- Les deux signatures du moteur, dates/inverse, longueurs et relances utilisent l'état actuel.
set local request.jwt.claim.sub = '';
set local role anon;
do $$ declare sens text; n integer; r jsonb; begin
  foreach sens in array array['date','inverse'] loop
    perform pg_temp.verifier(histoire.available_questions(p_pack_id=>'A87',p_direction=>sens)
      = '{"YEAR":19,"MONTH":19,"DAY":19}'::jsonb,'décompte exact ' || sens);
    perform pg_temp.verifier(histoire.available_questions(p_niveau=>1,p_pack_id=>'A87',p_direction=>sens)->>'YEAR'='5','niveau après retrait');
    foreach n in array array[5,10,0] loop
      r := histoire.start_game(p_token=>repeat('a',64),p_pack_id=>'A87',p_question_count=>n,p_direction=>sens,p_difficulty=>'DAY');
      perform pg_temp.verifier((r->>'question_count')::integer=case when n=0 then 19 else n end,'longueur réelle');
      insert into tirages values ((r->>'game_id')::uuid,'A87',sens);
      r := histoire.start_game(p_niveau=>3,p_token=>repeat('a',64),p_pack_id=>'A87',p_question_count=>n,p_direction=>sens,p_difficulty=>'DAY');
      insert into tirages values ((r->>'game_id')::uuid,'A87',sens);
    end loop;
    perform pg_temp.refuser(format('select histoire.start_game(p_token=>repeat(''a'',64),p_pack_id=>''A87'',p_question_count=>20,p_direction=>%L)',sens),'22023');
    r := histoire.start_mystery_game(p_token=>repeat('a',64),p_niveau=>3,p_question_count=>20,p_direction=>sens);
    perform pg_temp.verifier(not exists (select 1 from jsonb_array_elements(r->'mystery'->'candidates') x
      where x->>'id'='A87'),'roulette exclut pack insuffisant');
    perform pg_temp.refuser(format('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_niveau=>3,p_pack_id=>''A87'',p_question_count=>20,p_direction=>%L)',sens),'22023');
    r := histoire.start_mystery_game(p_token=>repeat('a',64),p_niveau=>3,p_pack_id=>'A87',p_question_count=>0,p_direction=>sens);
    insert into tirages values ((r->>'game_id')::uuid,'A87',sens);
  end loop;
  perform pg_temp.verifier(histoire.available_questions(p_pack_id=>'B87')->>'YEAR'='20','disponible dans un autre pack');
  perform pg_temp.verifier(histoire.available_questions(p_tag_id=>'T87')->>'YEAR'='20','disponible dans un thème');
  perform pg_temp.verifier(histoire.available_questions(p_level_id=>'3e',p_chapter_ids=>array['C87'])->>'YEAR'='20','scolaire préservé');
  r := histoire.start_game(p_token=>repeat('a',64),p_level_id=>'3e',p_chapter_ids=>array['C87'],p_question_count=>20);
  insert into tirages values ((r->>'game_id')::uuid,'scolaire','date');
  r := histoire.start_chapter_test(p_token=>repeat('a',64),p_chapter_id=>'C87',p_question_count=>10);
  insert into tirages values ((r->>'game_id')::uuid,'pedagogique','date');
  r := histoire.next_question((select id from tirages where pack='A87' and sens='date' limit 1),repeat('a',64));
  perform pg_temp.verifier(not (r ?| array['date','start_year','expected_year','event_id','last_change']),'aucune date privée avant correction classique');
  perform pg_temp.refuser('select * from histoire.solo_candidates(null,''A87'',null,null,null,null,null,''YEAR'')','42501');
end $$;
reset role;
select pg_temp.verifier(not exists (select 1 from tirages t join histoire.game_questions q on q.game_id=t.id
  where t.pack='A87' and q.event_id='EVT-87001'),'aucun tirage du retrait');
select pg_temp.verifier(exists (select 1 from tirages t join histoire.game_questions q on q.game_id=t.id
  where t.pack='scolaire' and q.event_id='EVT-87001'),'retrait limité au pack');

-- Retirer tout : même Tout ne doit plus proposer le pack à la roulette.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
do $$ begin
  for i in 2..20 loop perform histoire.admin_remove_pack_event('A87','EVT-' || (87000+i)); end loop;
end $$;
reset role;
set local role anon;
set local request.jwt.claim.sub = '';
do $$ declare r jsonb; begin
  r := histoire.start_mystery_game(p_token=>repeat('a',64),p_niveau=>3,p_question_count=>0);
  perform pg_temp.verifier(not exists (select 1 from jsonb_array_elements(r->'mystery'->'candidates') x
    where x->>'id'='A87'),'pack vide exclu pour Tout');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_niveau=>3,p_pack_id=>''A87'',p_question_count=>0)','22023');
end $$;
reset role;

-- Réintégration de l'ensemble : audit antérieur intact, doublons inactifs impossibles.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
do $$ begin
  for i in 1..20 loop perform histoire.admin_restore_pack_event('A87','EVT-' || (87000+i),'Relecture validée'); end loop;
  perform pg_temp.verifier(histoire.admin_restore_pack_event('A87','EVT-87001')->>'changed'='false','remise idempotente');
  perform histoire.admin_remove_pack_event('A87','EVT-87021');
  perform histoire.admin_restore_pack_event('A87','EVT-87021');
  perform pg_temp.verifier(histoire.admin_pack_questions('A87')->20->>'playable'='false','remettre ne force pas la jouabilité globale');
end $$;
reset role;
select pg_temp.verifier((select array_agg(operation order by id)=array['retirer','remettre']
  from histoire.pack_event_audit where pack_id='A87' and event_id='EVT-87001'),'historique des deux opérations');
select pg_temp.verifier((select count(*)=21 and not bool_or(removed) from histoire.pack_event_status where pack_id='A87'),'une seule ligne par association');
set local role anon;
set local request.jwt.claim.sub = '';
select pg_temp.verifier(histoire.available_questions(p_pack_id=>'A87')->>'YEAR'='20','disponibilité restaurée');
do $$ declare r jsonb; begin
  r := histoire.start_game(p_token=>repeat('a',64),p_pack_id=>'A87',p_question_count=>20,p_direction=>'inverse');
  insert into tirages values ((r->>'game_id')::uuid,'restaure','inverse');
  r := histoire.start_mystery_game(p_token=>repeat('a',64),p_niveau=>3,p_pack_id=>'A87',p_question_count=>20);
  perform pg_temp.verifier(r->'mystery'->'winner'->>'id'='A87','roulette et relance restaurées');
end $$;
reset role;
select pg_temp.verifier(exists (select 1 from tirages t join histoire.game_questions q on q.game_id=t.id
  where t.pack='restaure' and q.event_id='EVT-87001'),'question de nouveau tirée');
-- Les parties lancées avant les derniers retraits gardent leur instantané privé.
select pg_temp.verifier((select bool_and(q.expected_year is not null) from tirages t
  join histoire.game_questions q on q.game_id=t.id),'instantanés existants conservés');
-- La synchronisation d'un import ne réactive pas silencieusement un retrait.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000024';
select histoire.admin_remove_pack_event('A87','EVT-87001');
reset role;
delete from histoire.pack_events where pack_id='A87' and event_id='EVT-87001';
insert into histoire.pack_events(pack_id,event_id,position) values ('A87','EVT-87001',1);
select pg_temp.verifier((select removed from histoire.pack_event_status where pack_id='A87' and event_id='EVT-87001'),
  'retrait conservé après synchronisation du dataset');
select pg_temp.verifier((select count(*)=3 from histoire.pack_event_audit where pack_id='A87' and event_id='EVT-87001'),
  'audit conservé après import');
-- Deux événements partagent une date : retirer le premier ne retire pas le groupe
-- tant que le second reste jouable, puis la réintégration recrée ce groupe.
update histoire.event_answers set start_year=1901 where event_id='EVT-87002';
set local role authenticated;
select histoire.admin_restore_pack_event('A87','EVT-87001');
select pg_temp.verifier(histoire.available_questions(p_pack_id=>'A87',p_direction=>'inverse')->>'DAY'='19',
  'dates distinctes après restauration');
select histoire.admin_remove_pack_event('A87','EVT-87001');
select pg_temp.verifier(histoire.available_questions(p_pack_id=>'A87')->>'DAY'='19'
  and histoire.available_questions(p_pack_id=>'A87',p_direction=>'inverse')->>'DAY'='19','collision conservée par autre événement');
select histoire.admin_remove_pack_event('A87','EVT-87002');
select pg_temp.verifier(histoire.available_questions(p_pack_id=>'A87',p_direction=>'inverse')->>'DAY'='18','groupe entièrement retiré');
select histoire.admin_restore_pack_event('A87','EVT-87001');
select pg_temp.verifier(histoire.available_questions(p_pack_id=>'A87',p_direction=>'inverse')->>'DAY'='19','groupe réintégré');
reset role;
rollback;
