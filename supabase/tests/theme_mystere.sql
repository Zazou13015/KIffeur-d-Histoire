-- #95 : fixtures et identités locales uniquement, aucune exécution distante.
begin;
set local request.jwt.claim.sub = '';
create function pg_temp.verifier(condition boolean, description text) returns void
language plpgsql as $$ begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
end $$;
create function pg_temp.refuser(query text) returns void language plpgsql as $$ begin
  begin execute query;
  exception when sqlstate '22023' then return; end;
  raise exception 'ÉCHEC : requête acceptée';
end $$;

-- Isoler le tirage du contenu de seed, sans dépendre du catalogue statique.
update histoire.packs set active = false;
update histoire.tags set active = false;
insert into histoire.packs(id,slug,title,active) values
  ('M95-PACK','m95-pack','Pack ajouté en base',true),
  ('M95-VIDE','m95-vide','Pack vide',true),
  ('M95-PETIT','m95-petit','Quatre événements',true),
  ('M95-DOUBLONS','m95-doublons','Huit événements, quatre dates',true),
  ('M95-INACTIF','m95-inactif','Pack inactif',false);
insert into histoire.tags(id,slug,name,tag_type,active) values
  ('M95-THEME','m95-theme','Thème ajouté en base','SEMANTIC_TOPIC',true),
  ('M95-SIECLE','m95-siecle','Ne doit jamais être tiré','CENTURY',true),
  ('M95-GEO','m95-geo','Géographie hors thèmes','GEOGRAPHY',true);
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau)
select 'EVT-' || (970000+i),'Question mystère ' || i,'POINT','DAY','EXACT',true,'DAY',1,1,
  case when i <= 12 then 1 when i <= 40 then 2 else 3 end from generate_series(1,120) i;
insert into histoire.event_answers(event_id,start_year,start_month,start_day)
select 'EVT-' || (970000+i),1800+(i-1)/2,1,1 from generate_series(1,120) i;
insert into histoire.pack_events(pack_id,event_id,position)
select p,'EVT-' || (970000+i),i from generate_series(1,120) i cross join unnest(array['M95-PACK','M95-INACTIF']) p;
insert into histoire.pack_events(pack_id,event_id,position)
select 'M95-PETIT','EVT-' || (970000+i),i from generate_series(1,4) i;
insert into histoire.pack_events(pack_id,event_id,position)
select 'M95-DOUBLONS','EVT-' || (970000+i),i from generate_series(1,8) i;
insert into histoire.event_tags(event_id,tag_id)
select 'EVT-' || (970000+i),t from generate_series(1,120) i cross join unnest(array['M95-THEME','M95-SIECLE','M95-GEO']) t;
create temporary table tirages_mystere(reponse jsonb, longueur integer, sens text, niveau integer);
grant all on tirages_mystere to anon;
set local role anon;
do $$ declare r jsonb; n integer; sens text; lvl integer; begin
  foreach n in array array[5,10,20,0] loop
    foreach sens in array array['date','inverse'] loop
      foreach lvl in array array[1,2,3] loop
        -- Douze événements Débutant, mais seulement six dates distinctes.
        if (lvl=1 and n=20) or (lvl=1 and sens='inverse' and n=10) then
          perform pg_temp.refuser(format('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_niveau=>%s,p_difficulty=>''DAY'',p_question_count=>%s,p_direction=>%L)',lvl,n,sens));
        else
          r := histoire.start_mystery_game(p_token=>repeat('a',64),p_niveau=>lvl,
            p_difficulty=>'DAY',p_question_count=>n,p_direction=>sens);
          insert into tirages_mystere values (r,n,sens,lvl);
          perform pg_temp.verifier(r->'mystery'->'candidates' @> jsonb_build_array(r->'mystery'->'winner'), 'gagnant issu des candidats');
          perform pg_temp.verifier(not (r::text like '%M95-VIDE%' or r::text like '%M95-INACTIF%'
            or r::text like '%M95-SIECLE%' or r::text like '%M95-GEO%'), 'aucun contenu vide, inactif ou hors thèmes');
          if n>0 then perform pg_temp.verifier(not (r::text like '%M95-PETIT%'), 'petit thème insuffisant'); end if;
          if sens='inverse' and n>0 then perform pg_temp.verifier(not (r::text like '%M95-DOUBLONS%'), 'dates uniques, pas événements bruts'); end if;
        end if;
      end loop;
    end loop;
  end loop;
  -- Rejouer le gagnant ne remplace jamais le contenu demandé.
  r := histoire.start_mystery_game(p_token=>repeat('a',64),p_pack_id=>'M95-PACK',p_question_count=>5);
  perform pg_temp.verifier(r->'mystery'->'winner'->>'id'='M95-PACK', 'rejouer le même pack');
  insert into tirages_mystere values(r,5,'date',1);
  r := histoire.start_mystery_game(p_token=>repeat('a',64),p_tag_id=>'M95-THEME',p_question_count=>5);
  perform pg_temp.verifier(r->'mystery'->'winner'->>'mode'='theme', 'rejouer le même thème');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_pack_id=>''M95-VIDE'')');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_pack_id=>''M95-INACTIF'')');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_pack_id=>''M95-PETIT'',p_question_count=>5)');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_pack_id=>''M95-DOUBLONS'',p_direction=>''inverse'',p_question_count=>5)');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_niveau=>0)');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>''secret'')');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_question_count=>100)');
  perform pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_difficulty=>null)');
end $$;
reset role;

select pg_temp.verifier((select bool_and(g.question_count between 1 and 100
  and (t.longueur=0 or g.question_count=t.longueur)
  and g.context->'replay_filters'->>'mystery'='true'
  and g.context->'replay_filters'->>'mysteryLabel'=t.reponse->'mystery'->'winner'->>'titre'
  and case when t.reponse->'mystery'->'winner'->>'mode'='pack'
    then g.context->'replay_filters'->>'packId'=t.reponse->'mystery'->'winner'->>'id'
    else g.context->'replay_filters'->>'tagId'=t.reponse->'mystery'->'winner'->>'id' end)
  from tirages_mystere t join histoire.games g on g.id=(t.reponse->>'game_id')::uuid), 'contexte et longueur réels');
select pg_temp.verifier((select bool_and(q.asked_at is null and e.niveau<=t.niveau and
  case when t.reponse->'mystery'->'winner'->>'mode'='pack' then exists (
    select 1 from histoire.pack_events pe where pe.event_id=q.event_id and pe.pack_id=t.reponse->'mystery'->'winner'->>'id')
  else exists (select 1 from histoire.event_tags et where et.event_id=q.event_id and et.tag_id=t.reponse->'mystery'->'winner'->>'id') end)
  from tirages_mystere t join histoire.game_questions q on q.game_id=(t.reponse->>'game_id')::uuid
    join histoire.events e on e.id=q.event_id), 'questions du gagnant, niveau respecté, chrono non démarré');
select pg_temp.verifier((select bool_and((select count(*)=count(distinct (expected_year,expected_month,expected_day))
  from histoire.game_questions q where q.game_id=(t.reponse->>'game_id')::uuid))
  from tirages_mystere t where t.sens='inverse'), 'dates inversées uniques');

-- La lecture finale du moteur restitue le contexte sans dépendre de l'URL.
do $$ declare v_game_id uuid; q jsonb; attendu record; bilan jsonb; begin
  select (reponse->>'game_id')::uuid into v_game_id from tirages_mystere
    where longueur=5 and sens='date' limit 1;
  for i in 1..5 loop
    q := histoire.next_question(v_game_id,repeat('a',64));
    select * into attendu from histoire.game_questions gq where gq.game_id=v_game_id and gq.position=i;
    perform histoire.submit_answer(p_game_id=>v_game_id,p_question_id=>(q->>'question_id')::uuid,
      p_year=>attendu.expected_year,p_month=>attendu.expected_month,p_day=>attendu.expected_day,p_token=>repeat('a',64));
  end loop;
  bilan := histoire.finish_game(v_game_id,repeat('a',64));
  perform pg_temp.verifier(bilan->'replay_filters'->>'mystery'='true'
    and bilan->'replay_filters'->>'mysteryLabel' is not null, 'bilan rouvert avec le vrai gagnant');
end $$;

-- Précision : un pack de dates à l'année n'est jamais annoncé pour une partie au jour.
update histoire.event_answers set start_month=null,start_day=null where event_id like 'EVT-970%';
set local role anon;
select pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_difficulty=>''DAY'')');
select pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_difficulty=>''MONTH'')');
select pg_temp.verifier(histoire.start_mystery_game(p_token=>repeat('a',64),p_difficulty=>'YEAR')->>'question_count'='10', 'années encore jouables');
reset role;
update histoire.events set playable=false,playable_mode='NOT_AUTOMATIC' where id like 'EVT-970%';
set local role anon;
select pg_temp.refuser('select histoire.start_mystery_game(p_token=>repeat(''a'',64),p_question_count=>0)');
reset role;
rollback;
