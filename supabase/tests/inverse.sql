-- Postgres local/CI uniquement. Identités simulées par claims, aucun compte auth écrit.
begin;
create function pg_temp.verifier(condition boolean, description text) returns void
language plpgsql as $$ begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
end $$;
create function pg_temp.refuser(query text, expected_state text, expected_message text default null) returns void
language plpgsql as $$ begin
  begin execute query;
  exception when others then
    if sqlstate = expected_state and (expected_message is null or sqlerrm = expected_message) then return; end if;
    raise;
  end;
  raise exception 'ÉCHEC : requête acceptée : %', query;
end $$;

insert into histoire.packs(id,slug,title) values
  ('INV-TEST','inv-test','Fixture inverse'), ('INV-COLD','inv-cold','Guerre froide'),
  ('INV-COLLISION','inv-collision','Dates communes'), ('INV-BC','inv-bc','Antiquité'),
  ('INV-BLOCK','inv-block','Blocus de Berlin');
insert into histoire.tags(id,slug,name,tag_type) values
  ('INV-THEME','inv-theme','Fixture','SEMANTIC_TOPIC'), ('INV-CENTURY','inv-century','Siècle','CENTURY');
insert into histoire.chapters(id,level_id,school_year,program_scope,title) values
  ('INV-CHAPTER','3e','2026-2027','Tronc commun','Fixture');
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,image_path)
select 'EVT-'||(9800+i), 'Événement '||(1947+i), 'POINT','DAY','EXACT',true,'DAY',1,1,'EVT-'||(9800+i)||'.svg'
from generate_series(1,12) i;
insert into histoire.event_answers(event_id,start_year,start_month,start_day,description)
select 'EVT-'||(9800+i),1947+i,2,3,'Correction privée' from generate_series(1,12) i;
insert into histoire.pack_events(pack_id,event_id,position)
select 'INV-TEST','EVT-'||(9800+i),i from generate_series(1,12) i;
insert into histoire.event_tags(event_id,tag_id)
select 'EVT-'||(9800+i),'INV-THEME' from generate_series(1,10) i;
insert into histoire.event_levels(event_id,level_id)
select 'EVT-'||(9800+i),'3e' from generate_series(1,10) i;
insert into histoire.event_chapters(event_id,chapter_id)
select 'EVT-'||(9800+i),'INV-CHAPTER' from generate_series(1,10) i;

insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty) values
  ('EVT-9820','Guerre froide','PERIOD','YEAR_RANGE','EXACT',true,'RANGE',1,1),
  ('EVT-9821','Mort de César','POINT','DAY','EXACT',true,'DAY',1,1),
  ('EVT-0111','Début du blocus de Berlin','POINT','DAY','EXACT',true,'DAY',1,1),
  ('EVT-0112','Fin du blocus de Berlin','POINT','DAY','EXACT',true,'DAY',1,1),
  ('EVT-9830','Collision A','POINT','DAY','EXACT',true,'DAY',1,1),
  ('EVT-9831','Collision B','POINT','DAY','EXACT',true,'DAY',1,1),
  ('EVT-9832','Autre jour','POINT','DAY','EXACT',true,'DAY',1,1),
  ('EVT-9833','Autre mois','POINT','DAY','EXACT',true,'DAY',1,1),
  ('EVT-9834','Autre année','POINT','DAY','EXACT',true,'DAY',1,1),
  ('EVT-9835','Année seule','POINT','YEAR','EXACT',true,'YEAR',1,1),
  ('EVT-9836','Mois seul','POINT','MONTH','EXACT',true,'MONTH',1,1),
  ('EVT-9837','Injouable','PERIOD','CENTURY','APPROXIMATE',false,'NOT_AUTOMATIC',1,1);
insert into histoire.event_answers(event_id,start_year,start_month,start_day,end_year,description) values
  ('EVT-9820',1947,null,null,1991,'Explication de la Guerre froide'),
  ('EVT-9821',-44,3,15,null,'Correction antique'),
  ('EVT-0111',1948,6,24,null,null), ('EVT-0112',1949,5,12,null,null),
  ('EVT-9830',1800,1,1,null,null), ('EVT-9831',1800,1,1,null,null),
  ('EVT-9832',1800,1,2,null,null), ('EVT-9833',1800,2,1,null,null),
  ('EVT-9834',1801,1,1,null,null), ('EVT-9835',1802,null,null,null,null),
  ('EVT-9836',1803,3,null,null,null), ('EVT-9837',1804,null,null,null,null);
insert into histoire.event_aliases(event_id,alias) values
  ('EVT-9820','Cold War'), ('EVT-9820','Alias strictement privé');
insert into histoire.pack_events(pack_id,event_id,position) values
  ('INV-COLD','EVT-9820',1), ('INV-BC','EVT-9821',1),
  ('INV-BLOCK','EVT-0111',1), ('INV-BLOCK','EVT-0112',2);
insert into histoire.pack_events(pack_id,event_id,position)
select 'INV-COLLISION','EVT-'||(9830+i),i+1 from generate_series(0,7) i;

-- Seuil 0,75 : faute légère conservée, confusion début/fin refusée dans les deux sens.
-- Ces deux titres/dates sont ceux du dataset v18.
do $$ begin
  perform pg_temp.verifier(abs(extensions.similarity(histoire.normalize_answer('Début du blocus de Berlin'),
    histoire.normalize_answer('Fin du blocus de Berlin')) - 0.72) < 0.00001
    and not histoire.check_event_answer('EVT-0111','Fin du blocus de Berlin')
    and not histoire.check_event_answer('EVT-0112','Début du blocus de Berlin'), 'début/fin refusés dans les deux sens');
  perform pg_temp.verifier(abs(extensions.similarity(histoire.normalize_answer('Guerre froide'),
    histoire.normalize_answer('guere froide')) - 0.80) < 0.00001
    and histoire.normalize_answer('Guerre froide') = histoire.normalize_answer('la guerre froide'), 'normalisation et faute légère inchangées');
  perform pg_temp.verifier((select prosecdef and proconfig @> array['search_path=""']
    from pg_proc where oid='histoire.check_event_answer(text,text)'::regprocedure)
    and not has_function_privilege('anon','histoire.check_event_answer(text,text)','EXECUTE')
    and not has_function_privilege('authenticated','histoire.check_event_answer(text,text)','EXECUTE'),
    'correcteur SECURITY DEFINER, search_path vide et EXECUTE interne');
end $$;

create temporary table contexte(kind text primary key, game_id uuid, active_id uuid, future_id uuid, snapshot jsonb);
grant all on contexte to anon, authenticated;
create function pg_temp.partie_complete(token text) returns uuid language plpgsql as $$
declare g jsonb; q jsonb; r jsonb; id uuid; begin
  g := histoire.start_game(p_token=>token,p_direction=>'inverse',p_pack_id=>'INV-TEST',p_tag_id=>'INV-THEME',
    p_year_min=>1948,p_year_max=>1957,p_level_id=>'3e',p_chapter_ids=>array['INV-CHAPTER'],p_difficulty=>'DAY');
  id := (g->>'game_id')::uuid;
  perform pg_temp.verifier(g->>'direction'='inverse' and g->>'question_count'='10' and not g ? 'questions', 'création inverse sans tirage');
  for i in 1..10 loop
    q := histoire.next_question(id,token);
    perform pg_temp.verifier((select array_agg(k order by k) from jsonb_object_keys(q) k) =
      array['asked_at','date','date_label','date_precision','deadline','difficulty','position','question_id','server_time'], 'liste blanche inverse exacte, sans titre/alias/image/event_id');
    perform pg_temp.verifier(q->>'date_precision'='DAY' and (q->>'position')::int=i
      and extract(epoch from ((q->>'deadline')::timestamptz-(q->>'asked_at')::timestamptz))=30, 'ordre et chrono communs');
    perform pg_temp.verifier(histoire.next_question(id,token)->>'deadline'=q->>'deadline', 'chrono stable');
    perform pg_temp.refuser(format('select histoire.finish_game(%L,%L)',id,token),'22023','Il reste des questions sans réponse');
    r := histoire.submit_answer(id,(q->>'question_id')::uuid,p_token=>token,p_answer_text=>'Événement '||(q->'date'->>'year'));
    perform pg_temp.verifier(r->>'correct'='true' and (r->>'accuracy')::numeric=100 and r->>'points'='100'
      and r->>'title'='Événement '||(q->'date'->>'year') and r->>'description'='Correction privée', 'correction inverse après réponse');
    perform pg_temp.verifier(not r ? 'alias' and not r ? 'event_id', 'pas de liste privée à la correction');
    perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L,p_answer_text=>''Autre'')',id,q->>'question_id',token),
      '22023','Question inactive ou déjà répondue');
  end loop;
  r := histoire.finish_game(id,token);
  perform pg_temp.verifier(r->>'direction'='inverse' and r->>'state'='finished' and r->>'total_points'='1000'
    and (r->>'average_accuracy')::numeric=100 and jsonb_array_length(r->'questions')=10, 'fin inverse et agrégats');
  perform pg_temp.verifier(r->'questions'->0->>'correct'='true' and jsonb_typeof(r->'questions'->0->'answer')='string', 'récapitulatif texte');
  perform pg_temp.verifier(histoire.finish_game(id,token)=r and histoire.next_question(id,token) is null, 'fin idempotente');
  return id;
end $$;

set local role anon;
insert into contexte(kind,game_id) values ('complete-anon',pg_temp.partie_complete(repeat('a',64)));
-- Tolérance à 0,75 ; chaque essai consomme une nouvelle question.
do $$ declare g jsonb; q jsonb; r jsonb; answer text; begin
  foreach answer in array array['Guerre froide','la guerre froide','guere froide','LA GUÈRRE FROIDE!','Cold War','Prise de la Bastille'] loop
    g := histoire.start_game(p_token=>repeat('a',64),p_direction=>'inverse',p_pack_id=>'INV-COLD',p_question_count=>1);
    q := histoire.next_question((g->>'game_id')::uuid,repeat('a',64));
    perform pg_temp.verifier(q->>'date_label'='1947' and q->'date'->>'month' is null, 'début de plage à l’année');
    r := histoire.submit_answer((g->>'game_id')::uuid,(q->>'question_id')::uuid,p_token=>repeat('a',64),p_answer_text=>answer);
    perform pg_temp.verifier((r->>'correct')::boolean = (answer <> 'Prise de la Bastille')
      and (r->>'accuracy')::numeric = case when answer='Prise de la Bastille' then 0 else 100 end,
      'tolérance et mauvais événement : '||answer);
    perform pg_temp.verifier(r->>'title'='Guerre froide' and r->>'description'='Explication de la Guerre froide', 'titre et correction attendus');
    if answer='Prise de la Bastille' then perform pg_temp.verifier(r->>'points'='0','mauvaise réponse sans bonus'); end if;
    perform histoire.finish_game((g->>'game_id')::uuid,repeat('a',64));
  end loop;
end $$;
-- Les deux confusions sont aussi refusées par la RPC réelle de partie autorisée.
do $$ declare g jsonb; q jsonb; r jsonb; expected text; answer text; begin
  for question_year in 1948..1949 loop
    expected := case question_year when 1948 then 'Début du blocus de Berlin' else 'Fin du blocus de Berlin' end;
    answer := case question_year when 1948 then 'Fin du blocus de Berlin' else 'Début du blocus de Berlin' end;
    g := histoire.start_game(p_token=>repeat('a',64),p_direction=>'inverse',p_pack_id=>'INV-BLOCK',
      p_year_min=>question_year,p_year_max=>question_year,p_question_count=>1);
    q := histoire.next_question((g->>'game_id')::uuid,repeat('a',64));
    r := histoire.submit_answer((g->>'game_id')::uuid,(q->>'question_id')::uuid,p_token=>repeat('a',64),p_answer_text=>answer);
    perform pg_temp.verifier(r->>'correct'='false' and r->>'accuracy'='0' and r->>'points'='0'
      and r->>'expired'='false' and r->>'title'=expected, 'RPC refuse la confusion : '||answer);
    perform histoire.finish_game((g->>'game_id')::uuid,repeat('a',64));
  end loop;
end $$;
insert into contexte(kind,game_id)
select 'active',(histoire.start_game(p_token=>repeat('b',64),p_direction=>'inverse',p_pack_id=>'INV-TEST',p_question_count=>2)->>'game_id')::uuid;
insert into contexte(kind,game_id)
select 'foreign',(histoire.start_game(p_token=>repeat('c',64),p_direction=>'inverse',p_pack_id=>'INV-TEST',p_question_count=>1)->>'game_id')::uuid;
update contexte set active_id=(histoire.next_question(game_id,case kind when 'active' then repeat('b',64) else repeat('c',64) end)->>'question_id')::uuid
where kind in ('active','foreign');
reset role;
update contexte set future_id=(select id from histoire.game_questions where game_id=contexte.game_id and position=2) where kind='active';
set local role anon;
do $$ declare c contexte; f contexte; begin
  select * into c from contexte where kind='active'; select * into f from contexte where kind='foreign';
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L,p_answer_text=>''Test'')',c.game_id,c.future_id,repeat('b',64)),
    '22023','Question inactive ou déjà répondue');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L,p_answer_text=>''Test'')',c.game_id,f.active_id,repeat('b',64)),
    '22023','Question inactive ou déjà répondue');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L,p_answer_text=>''Test'')',c.game_id,c.active_id,repeat('c',64)),
    '42501','Partie inaccessible');
  perform pg_temp.refuser(format('select histoire.next_question(%L,%L)',c.game_id,repeat('c',64)),'42501','Partie inaccessible');
  perform pg_temp.refuser(format('select histoire.finish_game(%L,%L)',c.game_id,repeat('c',64)),'42501','Partie inaccessible');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L)',c.game_id,c.active_id,repeat('b',64)),'22023','Réponse invalide');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L,p_answer_text=>''!!!'')',c.game_id,c.active_id,repeat('b',64)),'22023','Réponse invalide');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L,p_answer_text=>repeat(''x'',1001))',c.game_id,c.active_id,repeat('b',64)),'22023','Réponse invalide');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_year=>1947,p_token=>%L,p_answer_text=>''Guerre froide'')',c.game_id,c.active_id,repeat('b',64)),'22023','Réponse invalide');
  -- Aucun paramètre event_id n’existe sur la RPC de partie.
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L,p_answer_text=>''Test'',p_event_id=>''EVT-9820'')',c.game_id,c.active_id,repeat('b',64)),'42883');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''a'',64),p_direction=>''secret'')','22023','Paramètres de partie invalides');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''a'',64),p_direction=>null)','22023','Paramètres de partie invalides');
end $$;
reset role;

-- Anonymes et comptes : mêmes RPC, isolation et permissions réelles.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000014',true);
set local role authenticated;
insert into contexte(kind,game_id) values ('complete-connected',pg_temp.partie_complete(null));
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000015',true);
set local role authenticated;
do $$ declare id uuid := (select game_id from contexte where kind='complete-connected'); begin
  perform pg_temp.refuser(format('select histoire.next_question(%L)',id),'42501','Partie inaccessible');
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,null,p_answer_text=>''Test'')',id),'42501','Partie inaccessible');
  perform pg_temp.refuser(format('select histoire.finish_game(%L,%L)',id,repeat('a',64)),'42501','Partie inaccessible');
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    execute format('set local role %I',role_name);
    perform pg_temp.refuser('select histoire.check_event_answer(''EVT-9820'',''Guerre froide'')','42501');
    perform pg_temp.refuser('select alias from histoire.event_aliases','42501');
    perform pg_temp.refuser('select title from histoire.game_questions','42501');
    perform pg_temp.refuser('select * from histoire.games','42501');
    perform pg_temp.refuser('select * from histoire.event_answers','42501');
    perform pg_temp.refuser('update histoire.games set direction=''inverse''','42501');
    perform pg_temp.refuser('select histoire.score_points(100,0)','42501');
    perform pg_temp.refuser('select histoire.question_date(1947,null,null,''YEAR'')','42501');
    execute 'reset role';
  end loop;
end $$;

-- Précision et ambiguïtés : plusieurs événements par année/mois/jour dans les candidats.
do $$ declare g jsonb; selected_game uuid; d text; n integer; q jsonb; before_count integer; begin
  foreach d in array array['YEAR','MONTH','DAY'] loop
    for i in 1..5 loop
      g := histoire.start_game(p_token=>repeat('d',64),p_direction=>'inverse',p_pack_id=>'INV-COLLISION',p_difficulty=>d,p_question_count=>4);
      selected_game := (g->>'game_id')::uuid;
      select count(distinct (expected_year,
        case when d in ('MONTH','DAY') then expected_month end,
        case when d='DAY' then expected_day end)) into n from histoire.game_questions where game_id=selected_game;
      perform pg_temp.verifier(n=4,'quatre dates affichées distinctes en '||d);
      perform pg_temp.verifier(not exists(select 1 from histoire.game_questions where game_id=selected_game
        and (event_id='EVT-9837' or (d in ('MONTH','DAY') and expected_month is null) or (d='DAY' and expected_day is null))), 'précision suffisante et jouable');
      q := histoire.next_question(selected_game,repeat('d',64));
      perform pg_temp.verifier(q->>'date_precision'=d and (d='DAY' or q->'date'->>'day' is null)
        and (d<>'YEAR' or q->'date'->>'month' is null), 'aucune précision supplémentaire publiée');
    end loop;
    select count(*) into before_count from histoire.games;
    perform pg_temp.refuser(format('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''INV-COLLISION'',p_difficulty=>%L,p_question_count=>5)',d),
      '22023','Pas assez de questions pour ces filtres');
    perform pg_temp.verifier((select count(*) from histoire.games)=before_count,'aucune partie laissée après manque de dates');
    g := histoire.start_game(p_token=>repeat('d',64),p_direction=>'inverse',p_pack_id=>'INV-BC',p_difficulty=>d,p_question_count=>1);
    q := histoire.next_question((g->>'game_id')::uuid,repeat('d',64));
    perform pg_temp.verifier(q->'date'->>'year'='-44' and q->>'date_label'=case d when 'YEAR' then '44 av. J.-C.' when 'MONTH' then 'mars 44 av. J.-C.' else '15 mars 44 av. J.-C.' end,'format antique '||d);
  end loop;
  perform pg_temp.verifier(histoire.question_date(1947,2,3,'YEAR')->>'date_label'='1947'
    and histoire.question_date(1947,2,3,'MONTH')->>'date_label'='février 1947'
    and histoire.question_date(1947,2,3,'DAY')->>'date_label'='3 février 1947', 'formats après J.-C.');
  perform pg_temp.refuser('select histoire.question_date(0,null,null,''YEAR'')','22023','Date invalide');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''INV-COLD'',p_difficulty=>''MONTH'',p_question_count=>1)','22023','Pas assez de questions pour ces filtres');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_level_id=>''6e'',p_chapter_ids=>array[''INV-CHAPTER''],p_question_count=>1)','22023','Pas assez de questions pour ces filtres');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_chapter_ids=>array[]::text[],p_question_count=>1)','22023','Pas assez de questions pour ces filtres');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_tag_id=>''INV-CENTURY'',p_question_count=>1)','22023','Paramètres de partie invalides');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''UNKNOWN'',p_question_count=>1)','22023','Pas assez de questions pour ces filtres');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''INV-TEST'',p_year_min=>2000,p_question_count=>1)','22023','Pas assez de questions pour ces filtres');
  -- Chaque filtre doit agir seul, même lorsque les autres seraient suffisants.
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''INV-TEST'',p_tag_id=>''INV-THEME'',p_question_count=>11)','22023','Pas assez de questions pour ces filtres');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''INV-TEST'',p_level_id=>''3e'',p_question_count=>11)','22023','Pas assez de questions pour ces filtres');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''INV-TEST'',p_chapter_ids=>array[''INV-CHAPTER''],p_question_count=>11)','22023','Pas assez de questions pour ces filtres');
  g := histoire.start_game(p_token=>repeat('d',64),p_direction=>'inverse',p_pack_id=>'INV-TEST',p_year_min=>1948,p_year_max=>1948,p_question_count=>1);
  perform pg_temp.verifier(histoire.next_question((g->>'game_id')::uuid,repeat('d',64))->'date'->>'year'='1948','période inclusive');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''INV-TEST'',p_year_min=>1948,p_year_max=>1948,p_question_count=>2)','22023','Pas assez de questions pour ces filtres');
  update histoire.packs set active=false where id='INV-COLLISION';
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_pack_id=>''INV-COLLISION'',p_question_count=>1)','22023','Pas assez de questions pour ces filtres');
  update histoire.packs set active=true where id='INV-COLLISION';
  update histoire.tags set active=false where id='INV-THEME';
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''d'',64),p_direction=>''inverse'',p_tag_id=>''INV-THEME'',p_question_count=>1)','22023','Paramètres de partie invalides');
  update histoire.tags set active=true where id='INV-THEME';
  insert into histoire.chapters(id,level_id,school_year,program_scope,title) values ('INV-CHAPTER-2','3e','2026-2027','Tronc commun','Second chapitre');
  insert into histoire.event_chapters(event_id,chapter_id) values ('EVT-9811','INV-CHAPTER-2'),('EVT-9812','INV-CHAPTER-2');
  g := histoire.start_game(p_token=>repeat('d',64),p_direction=>'inverse',p_pack_id=>'INV-TEST',p_chapter_ids=>array['INV-CHAPTER','INV-CHAPTER-2'],p_question_count=>12);
  perform pg_temp.verifier(g->>'question_count'='12','plusieurs chapitres combinés en OU');
end $$;

-- Chrono de la question figé, formule #12 utilisée avec précision 100/0.
update histoire.scoring_settings set timer_seconds=5;
insert into contexte(kind,game_id)
select 'timer',(histoire.start_game(p_token=>repeat('e',64),p_direction=>'inverse',p_pack_id=>'INV-TEST',p_question_count=>3)->>'game_id')::uuid;
update contexte set active_id=(histoire.next_question(game_id,repeat('e',64))->>'question_id')::uuid where kind='timer';
update histoire.scoring_settings set timer_seconds=30;
update histoire.game_questions set asked_at=clock_timestamp()-interval '1 second',deadline=clock_timestamp()+interval '4 seconds'
where id=(select active_id from contexte where kind='timer');
set local role anon;
do $$ declare c contexte; q jsonb; r jsonb; begin
  select * into c from contexte where kind='timer'; q := histoire.next_question(c.game_id,repeat('e',64));
  r := histoire.submit_answer(c.game_id,c.active_id,p_token=>repeat('e',64),p_answer_text=>'Événement '||(q->'date'->>'year'));
  perform pg_temp.verifier((r->>'accuracy')::numeric=100 and (r->>'points')::int between 92 and 94 and r->>'expired'='false','bonus commun et fraction chrono figé');
  update contexte set active_id=(histoire.next_question(game_id,repeat('e',64))->>'question_id')::uuid where kind='timer';
end $$;
reset role;
update histoire.game_questions set asked_at=clock_timestamp()-interval '31 seconds',deadline=clock_timestamp()-interval '1 second'
where id=(select active_id from contexte where kind='timer');
set local role anon;
do $$ declare c contexte; q jsonb; r jsonb; begin
  select * into c from contexte where kind='timer'; q := histoire.next_question(c.game_id,repeat('e',64));
  r := histoire.submit_answer(c.game_id,c.active_id,p_token=>repeat('e',64),p_answer_text=>'Événement '||(q->'date'->>'year'));
  perform pg_temp.verifier(r->>'correct'='false' and r->>'points'='0' and r->>'accuracy'='0' and r->>'expired'='true','bonne réponse tardive vaut zéro');
  update contexte set active_id=(histoire.next_question(game_id,repeat('e',64))->>'question_id')::uuid where kind='timer';
end $$;
reset role;
update histoire.game_questions set asked_at=clock_timestamp()-interval '31 seconds',deadline=clock_timestamp()-interval '1 second'
where id=(select active_id from contexte where kind='timer');
set local role anon;
do $$ declare c contexte; r jsonb; begin
  select * into c from contexte where kind='timer';
  r := histoire.submit_answer(c.game_id,c.active_id,p_token=>repeat('e',64));
  perform pg_temp.verifier(r->>'points'='0' and r->>'expired'='true','null après deadline vaut zéro');
  r := histoire.finish_game(c.game_id,repeat('e',64));
  perform pg_temp.verifier((r->>'average_accuracy')::numeric=33.33 and (r->>'total_points')::int between 92 and 94,'agrégats 100/0/0');
end $$;
reset role;

-- Rétention inverse et cascade ; le bilan connecté reste strictement intact.
update histoire.games set created_at=created_at-interval '25 hours',expires_at=created_at-interval '1 hour'
where id in (select game_id from contexte where kind in ('active','complete-anon'));
update histoire.games set created_at=created_at-interval '72 hours' where id=(select game_id from contexte where kind='complete-connected');
update contexte set snapshot=(select to_jsonb(g) from histoire.games g where g.id=contexte.game_id) where kind='complete-connected';
set local role anon;
do $$ declare c contexte; begin
  for c in select * from contexte where kind in ('active','complete-anon') loop
    perform pg_temp.refuser(format('select histoire.next_question(%L,%L)',c.game_id,case c.kind when 'active' then repeat('b',64) else repeat('a',64) end),'42501','Partie inaccessible');
    perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_token=>%L,p_answer_text=>''Test'')',c.game_id,c.active_id,case c.kind when 'active' then repeat('b',64) else repeat('a',64) end),'42501','Partie inaccessible');
    perform pg_temp.refuser(format('select histoire.finish_game(%L,%L)',c.game_id,case c.kind when 'active' then repeat('b',64) else repeat('a',64) end),'42501','Partie inaccessible');
  end loop;
  perform histoire.purge_expired_anonymous_games();
end $$;
reset role;
do $$ begin
  perform pg_temp.verifier(not exists(select 1 from histoire.games where id in (select game_id from contexte where kind in ('active','complete-anon')))
    and not exists(select 1 from histoire.game_questions where game_id in (select game_id from contexte where kind in ('active','complete-anon'))),'purge inverse et cascade');
  perform pg_temp.verifier((select to_jsonb(g)=c.snapshot and g.expires_at is null from histoire.games g join contexte c on c.game_id=g.id where c.kind='complete-connected'),'connectée inchangée');
  perform pg_temp.verifier(exists(select 1 from histoire.games where id=(select game_id from contexte where kind='foreign')),'anonyme courante conservée');
end $$;
update histoire.solo_anonymous_limits set max_games=1;
set local role anon;
select pg_temp.refuser('select histoire.start_game(p_token=>repeat(''f'',64),p_direction=>''inverse'',p_question_count=>1)','53400','Capacité des parties anonymes atteinte');
reset role;
-- Le sens enregistré vient du moteur ; un client ne peut changer de sens pour sonder un titre.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000014',true);
set local role authenticated;
do $$ declare g jsonb; q jsonb; begin
  g := histoire.start_game(p_pack_id=>'INV-COLD',p_question_count=>1);
  perform pg_temp.verifier(g->>'direction'='date','date par défaut malgré plafond anonyme');
  q := histoire.next_question((g->>'game_id')::uuid);
  perform pg_temp.refuser(format('select histoire.submit_answer(%L,%L,p_answer_text=>''Guerre froide'')',g->>'game_id',q->>'question_id'),'22023','Réponse invalide');
  perform histoire.submit_answer((g->>'game_id')::uuid,(q->>'question_id')::uuid,1947);
  perform pg_temp.verifier(histoire.finish_game((g->>'game_id')::uuid)->>'direction'='date','fin date compatible');
end $$;
reset role;
do $$ begin raise notice 'OK : inverse complet anonyme/connecté, tolérance, dates distinctes, chrono, score, sécurité et rétention'; end $$;
rollback;
