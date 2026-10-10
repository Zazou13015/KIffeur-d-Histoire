-- #104 : LOCAL/CI uniquement. Aucun compte créé ni modifié dans auth/public.
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
insert into histoire.admins(user_id,note) values ('00000000-0000-0000-0000-000000000024','Fixture #104');
update histoire.packs set active=false;
update histoire.tags set active=false;
insert into histoire.packs(id,slug,title) values ('A104','a104','Premier pack'),('B104','b104','Second pack'),('S104','s104','Une question');
insert into histoire.tags(id,slug,name,tag_type) values ('T104','t104','Thème des corrections','SEMANTIC_TOPIC');
insert into histoire.chapters(id,level_id,school_year,program_scope,title)
  values ('C104','3e','2026-2027','Tronc commun','Chapitre des corrections');
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau,titre_question)
select 'EVT-' || (88000+i),case when i=1 then 'Ouverture du musée royal' else 'Titre de test ' || i end,
  'POINT','DAY','EXACT',true,'DAY',1,1,case when i<=6 then 1 when i<=12 then 2 else 3 end,
  case when i=1 then 'Le musée ouvre ses portes' end from generate_series(1,20) i;
insert into histoire.event_answers(event_id,start_year,start_month,start_day)
  select 'EVT-' || (88000+i),1800+i,3,4 from generate_series(1,20) i;
insert into histoire.event_aliases(event_id,alias) values ('EVT-88001','Le musée central');
insert into histoire.pack_events(pack_id,event_id,position)
  select p,'EVT-' || (88000+i),i from generate_series(1,20) i cross join unnest(array['A104','B104']) p;
insert into histoire.pack_events(pack_id,event_id,position) values ('S104','EVT-88001',1);
insert into histoire.event_tags(event_id,tag_id) select 'EVT-' || (88000+i),'T104' from generate_series(1,20) i;
insert into histoire.event_levels(event_id,level_id) select 'EVT-' || (88000+i),'3e' from generate_series(1,20) i;
insert into histoire.event_chapters(event_id,chapter_id) select 'EVT-' || (88000+i),'C104' from generate_series(1,20) i;
insert into histoire.chapter_cards(card_id,chapter_id,event_id,start_year,start_month,start_day,
  date_text,date_precision,date_status,title,body,takeaway,key_concepts,official_wording,sources,sort_order)
select 'CARD-ed104-' || i,'C104','EVT-' || (88000+i),1800+i,3,4,'4 mars ' || (1800+i),'DAY','EXACT',
  'Carte pédagogique ' || i,repeat('Texte pédagogique pour préserver les chapitres après une correction. ',8),
  'À retenir : un repère.',array['repère'],'Libellé',array['https://example.invalid'],i from generate_series(1,10) i;
create temp table parties_editoriales(nom text primary key,id uuid,question uuid);
grant all on parties_editoriales to anon,authenticated;

-- Simuler des parties commencées avant toute correction, y compris un titre déjà affiché.
set local role anon;
do $$ declare v_nom text; v_game jsonb; v_question jsonb; begin
  foreach v_nom in array array['date','inverse-titre','inverse-alias','inverse-refus'] loop
    v_game := histoire.start_game(p_token=>repeat('b',64),p_pack_id=>'S104',p_question_count=>1,
      p_direction=>case when v_nom='date' then 'date' else 'inverse' end);
    v_question := histoire.next_question((v_game->>'game_id')::uuid,repeat('b',64));
    insert into parties_editoriales values (v_nom,(v_game->>'game_id')::uuid,(v_question->>'question_id')::uuid);
    if v_nom='date' then perform pg_temp.verifier(v_question->>'title'='Le musée ouvre ses portes','titre rédigé initial'); end if;
  end loop;
  perform pg_temp.refuser('select histoire.admin_edit_event(''A104'',''EVT-88001'',''Titre interdit'',2)','42501');
  perform pg_temp.refuser('select histoire.admin_event_history(''EVT-88001'')','42501');
  perform pg_temp.refuser('select * from histoire.game_question_editorial_snapshots','42501');
  perform pg_temp.refuser('select histoire.mask_question_title(''Titre privé'')','42501');
end $$;
reset role;
set local role authenticated;
select pg_temp.refuser('select histoire.admin_edit_event(''A104'',''EVT-88001'',''Titre interdit'',2)','42501');
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000025';
select pg_temp.refuser('select histoire.admin_edit_event(''A104'',''EVT-88001'',''Titre interdit'',2)','42501');
select pg_temp.refuser('select histoire.admin_event_history(''EVT-88001'')','42501');
select pg_temp.refuser('select * from histoire.event_editorial_overrides','42501');
select pg_temp.refuser('select * from histoire.event_editorial_audit','42501');
select pg_temp.refuser('select * from histoire.game_question_editorial_snapshots','42501');

set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000024';
do $$ declare v_result jsonb; v_history jsonb; begin
  perform pg_temp.refuser('select histoire.admin_edit_event(''A104'',''EVT-88001'','' '',2)','22023');
  perform pg_temp.refuser('select histoire.admin_edit_event(''A104'',''EVT-88001'',repeat(''x'',501),2)','22023');
  perform pg_temp.refuser('select histoire.admin_edit_event(''A104'',''EVT-88001'',''Titre'',4)','22023');
  perform pg_temp.refuser('select histoire.admin_edit_event(''A104'',''EVT-88001'',''Titre'',2,repeat(''x'',1001))','22023');
  perform pg_temp.refuser('select histoire.admin_edit_event(''absent'',''EVT-88001'',''Titre'',2)','22023');
  v_result := histoire.admin_edit_event('A104','EVT-88001','Création de la bibliothèque municipale',3,'  Relecture  ',
    'Ouverture du musée royal',1);
  perform pg_temp.verifier(v_result->>'changed'='true','titre et niveau modifiés');
  perform pg_temp.verifier(v_result->'questions'->0->>'title'='Création de la bibliothèque municipale'
    and v_result->'questions'->0->>'niveau'='3','liste actualisée dans la transaction');
  perform pg_temp.verifier(histoire.admin_pack_questions('B104')->0->>'title'='Création de la bibliothèque municipale','tous les packs');
  v_history := histoire.admin_event_history('EVT-88001');
  perform pg_temp.verifier(jsonb_array_length(v_history)=1 and v_history->0->>'old_title'='Ouverture du musée royal'
    and v_history->0->>'new_title'='Création de la bibliothèque municipale'
    and v_history->0->>'old_niveau'='1' and v_history->0->>'new_niveau'='3'
    and v_history->0->>'reason'='Relecture' and v_history->0->>'admin_id'='00000000-0000-0000-0000-000000000024'
    and v_history->0->>'occurred_at' is not null,'audit complet');
  perform pg_temp.verifier(histoire.admin_edit_event('A104','EVT-88001',' Création de la bibliothèque municipale ',3,
    'retry','Ouverture du musée royal',1)->>'changed'='false','retry sans audit dupliqué');
  perform pg_temp.verifier(jsonb_array_length(histoire.admin_event_history('EVT-88001'))=1,'aucune modification sans changement réel');
  perform pg_temp.refuser('select histoire.admin_edit_event(''A104'',''EVT-88001'',''Ancien onglet'',2,null,''Ouverture du musée royal'',1)','40001');
  perform histoire.admin_edit_event('A104','EVT-88002','Titre de test 2',3);
  perform histoire.admin_edit_event('A104','EVT-88003','Titre corrigé uniquement',1);
  perform pg_temp.refuser('delete from histoire.event_editorial_audit','42501');
end $$;
reset role;
select pg_temp.verifier((select o.title is null and o.niveau=3 from histoire.event_editorial_overrides o
  where o.event_id='EVT-88002'),'niveau seul ne fige pas le titre');
select pg_temp.verifier((select o.title='Titre corrigé uniquement' and o.niveau is null from histoire.event_editorial_overrides o
  where o.event_id='EVT-88003'),'titre seul ne fige pas le niveau');

-- Même upsert que scripts/import-dataset.ts : champs corrigés préservés et autres champs importés.
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau,titre_question)
values ('EVT-88001','Ancien CSV','POINT','DAY','EXACT',true,'DAY',2,2,1,'Ancienne question du CSV'),
  ('EVT-88002','Titre du CSV actualisé','POINT','DAY','EXACT',true,'DAY',2,2,1,null),
  ('EVT-88003','Ancien titre CSV','POINT','DAY','EXACT',true,'DAY',2,2,2,null)
on conflict (id) do update set title=excluded.title,niveau=excluded.niveau,titre_question=excluded.titre_question,
  importance=excluded.importance;
select pg_temp.verifier((select e.title='Création de la bibliothèque municipale' and e.niveau=3
  and e.titre_question is null and e.importance=2 from histoire.events e where e.id='EVT-88001'),'surcharges après réimport');
select pg_temp.verifier((select e.title='Titre du CSV actualisé' and e.niveau=3 from histoire.events e
  where e.id='EVT-88002'),'import du titre jamais corrigé');
select pg_temp.verifier((select e.title='Titre corrigé uniquement' and e.niveau=2 from histoire.events e
  where e.id='EVT-88003'),'import du niveau jamais corrigé');
select pg_temp.verifier((select count(*)=3 from histoire.event_editorial_audit),'import sans faux audit administrateur');

set local request.jwt.claim.sub='';
set local role anon;
do $$ declare v_result jsonb; v_game jsonb; v_sens text; v_count integer; v_question jsonb; begin
  -- Q1/Q2 quittent Débutant ; Q3 devient Intermédiaire via l'import autorisé.
  foreach v_sens in array array['date','inverse'] loop
    perform pg_temp.verifier(histoire.available_questions(p_niveau=>1,p_pack_id=>'A104',p_direction=>v_sens)->>'YEAR'='3','décompte Débutant actuel');
    perform pg_temp.verifier(histoire.available_questions(p_niveau=>2,p_pack_id=>'B104',p_direction=>v_sens)->>'YEAR'='10','décompte Intermédiaire global');
    perform pg_temp.verifier(histoire.available_questions(p_niveau=>3,p_pack_id=>'A104',p_direction=>v_sens)->>'DAY'='20','Expert inchangé');
    foreach v_count in array array[5,10,20,0] loop
      v_game := histoire.start_game(p_niveau=>3,p_token=>repeat('b',64),p_pack_id=>'A104',p_question_count=>v_count,p_direction=>v_sens);
      perform pg_temp.verifier((v_game->>'question_count')::integer=case when v_count=0 then 20 else v_count end,'5/10/20/Tout');
    end loop;
    v_result := histoire.start_mystery_game(p_token=>repeat('b',64),p_niveau=>1,p_question_count=>0,p_direction=>v_sens);
    perform pg_temp.verifier(not exists (select 1 from jsonb_array_elements(v_result->'mystery'->'candidates') c
      where c->>'id'='S104'),'mystère respecte nouveau niveau');
  end loop;
  v_question := histoire.next_question((select p.id from parties_editoriales p where p.nom='date'),repeat('b',64));
  perform pg_temp.verifier(v_question->>'title'='Le musée ouvre ses portes','partie classique déjà commencée figée');
  perform pg_temp.verifier(not(v_question ?| array['expected_year','accepted_labels','start_year','event_id']),'aucune réponse privée exposée');
  v_result := histoire.submit_answer((select p.id from parties_editoriales p where p.nom='inverse-titre'),
    (select p.question from parties_editoriales p where p.nom='inverse-titre'),p_token=>repeat('b',64),p_answer_text=>'Ouverture du musée royal');
  perform pg_temp.verifier(v_result->>'correct'='true' and v_result->>'title'='Ouverture du musée royal','ancienne réponse canonique acceptée');
  v_result := histoire.submit_answer((select p.id from parties_editoriales p where p.nom='inverse-alias'),
    (select p.question from parties_editoriales p where p.nom='inverse-alias'),p_token=>repeat('b',64),p_answer_text=>'Le musée central');
  perform pg_temp.verifier(v_result->>'correct'='true','alias explicite conservé');
  v_result := histoire.submit_answer((select p.id from parties_editoriales p where p.nom='inverse-refus'),
    (select p.question from parties_editoriales p where p.nom='inverse-refus'),p_token=>repeat('b',64),p_answer_text=>'Création de la bibliothèque municipale');
  perform pg_temp.verifier(v_result->>'correct'='false','nouveau titre ne change pas une ancienne correction');
  -- Nouvelle partie inversée : nouveau titre canonique et alias existants.
  v_game := histoire.start_game(p_token=>repeat('b',64),p_pack_id=>'S104',p_question_count=>1,p_direction=>'inverse');
  v_question := histoire.next_question((v_game->>'game_id')::uuid,repeat('b',64));
  v_result := histoire.submit_answer((v_game->>'game_id')::uuid,(v_question->>'question_id')::uuid,
    p_token=>repeat('b',64),p_answer_text=>'Création de la bibliothèque municipale');
  perform pg_temp.verifier(v_result->>'correct'='true','nouveau titre accepté dans une nouvelle partie');
  v_game := histoire.start_game(p_token=>repeat('b',64),p_pack_id=>'S104',p_question_count=>1);
  v_question := histoire.next_question((v_game->>'game_id')::uuid,repeat('b',64));
  perform pg_temp.verifier(v_question->>'title'='Création de la bibliothèque municipale','nouveau titre classique');
  -- Le niveau éditorial ne modifie pas le programme scolaire ni les cartes.
  perform pg_temp.verifier(histoire.available_questions(p_level_id=>'3e',p_chapter_ids=>array['C104'])->>'YEAR'='20','scolaire');
  v_game := histoire.start_chapter_test(p_token=>repeat('b',64),p_chapter_id=>'C104',p_question_count=>10);
  insert into parties_editoriales values ('pedagogique',(v_game->>'game_id')::uuid,null);
  perform pg_temp.verifier((select count(*)=10 from histoire.get_chapter_cards('C104')),'cartes pédagogiques conservées');
  perform pg_temp.verifier((select title='Carte pédagogique 1' from histoire.get_chapter_cards('C104')
    where card_id='CARD-ed104-1'),'titre propre de la carte non réécrit');
  perform histoire.finish_game((select p.id from parties_editoriales p where p.nom='inverse-titre'),repeat('b',64));
end $$;
reset role;
create temp table scores_avant as select q.id,to_jsonb(q) as original from histoire.game_questions q
  join parties_editoriales p on p.id=q.game_id where p.nom='inverse-titre';
create temp table bilans_avant as select g.id,to_jsonb(g) as original from histoire.games g
  join parties_editoriales p on p.id=g.id where p.nom='inverse-titre';
select pg_temp.verifier(exists (select 1 from histoire.game_questions q join parties_editoriales p on p.id=q.game_id
  where p.nom='pedagogique' and q.title='Création de la bibliothèque municipale'),'test pédagogique prend le titre corrigé');

-- Correction répétée, historique complet et scores déjà stockés intacts.
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000024';
select histoire.admin_edit_event('B104','EVT-88001','Bibliothèque inaugurée en mars 1900',2,'Nouvelle précision');
select pg_temp.verifier(jsonb_array_length(histoire.admin_event_history('EVT-88001'))=2,'historique complet');
-- #87 reste indépendant, même après édition globale.
select histoire.admin_remove_pack_event('A104','EVT-88001','Retrait limité au pack');
select pg_temp.verifier(histoire.admin_pack_questions('A104')->0->>'removed'='true'
  and histoire.admin_pack_questions('B104')->0->>'removed'='false','retrait isolé');
select histoire.admin_restore_pack_event('A104','EVT-88001');
reset role;
select pg_temp.verifier((select bool_and(to_jsonb(q)=s.original) from scores_avant s
  join histoire.game_questions q on q.id=s.id),'aucune modification rétroactive des réponses ou scores');
select pg_temp.verifier((select bool_and(to_jsonb(g)=b.original) from bilans_avant b
  join histoire.games g on g.id=b.id),'bilan et score agrégé existants intacts');
set local role anon;
set local request.jwt.claim.sub='';
do $$ declare v_game jsonb; v_question jsonb; begin
  v_game := histoire.start_game(p_token=>repeat('b',64),p_pack_id=>'S104',p_question_count=>1);
  v_question := histoire.next_question((v_game->>'game_id')::uuid,repeat('b',64));
  perform pg_temp.verifier(v_question->>'title' not like '%1900%' and v_question->>'title' not like '%mars%','masquage du titre corrigé');
end $$;
rollback;
