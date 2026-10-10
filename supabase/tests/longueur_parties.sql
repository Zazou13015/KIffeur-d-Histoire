-- #93 : données et identités simulées, transaction locale/CI exclusivement.
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

-- Références autonomes : aucun chapitre du dataset complet n'est supposé importé.
insert into histoire.levels(id,name,cycle,position)
values ('LONG-93','Niveau longueur de test','lycee',30093);
insert into histoire.chapters(id,level_id,school_year,program_scope,title) values
  ('LONG-93-CH1','LONG-93','2026-2027','Tronc commun','Chapitre commun A'),
  ('LONG-93-CH2','LONG-93','2026-2027','Tronc commun','Chapitre commun B'),
  ('LONG-93-CH3','LONG-93','2026-2027','Tronc commun','Chapitre complet');
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau)
select 'EVT-' || (9800+i), 'Événement longueur ' || i, 'POINT', 'DAY', 'EXACT', true, 'DAY', 1, 1,
  case when i <= 30 then 1 when i <= 60 then 2 else 3 end from generate_series(1,120) i;
insert into histoire.event_answers(event_id,start_year,start_month,start_day)
select 'EVT-' || (9800+i), 1800+(i-1)/2, 1, 1 from generate_series(1,120) i;
insert into histoire.packs(id,slug,title) values ('LONG-93','long-93','Longueurs de test');
insert into histoire.pack_events(pack_id,event_id,position)
select 'LONG-93','EVT-' || (9800+i),i from generate_series(1,120) i;
insert into histoire.event_levels(event_id,level_id)
select 'EVT-' || (9800+i),'LONG-93' from generate_series(1,120) i;
-- Chaque événement est lié à deux chapitres : EXISTS doit le compter une fois.
insert into histoire.event_chapters(event_id,chapter_id)
select 'EVT-' || (9800+i),c from generate_series(1,3) i cross join unnest(array['LONG-93-CH1','LONG-93-CH2']) c;
insert into histoire.event_chapters(event_id,chapter_id)
select 'EVT-' || (9800+i),'LONG-93-CH3' from generate_series(1,120) i;
create temporary table tirages(id uuid, attendu integer, sens text);
grant all on tirages to anon;
set local role anon;
do $$ declare r jsonb; c jsonb; n integer; begin
  c := histoire.available_questions(p_pack_id=>'LONG-93');
  perform pg_temp.verifier(c = '{"YEAR":120,"MONTH":120,"DAY":120}'::jsonb, 'décompte daté exact');
  perform pg_temp.verifier(histoire.available_questions(p_pack_id=>'LONG-93',p_direction=>'inverse')
    = '{"YEAR":60,"MONTH":60,"DAY":60}'::jsonb, 'déduplication des dates inversées');
  perform pg_temp.verifier(histoire.available_questions(p_niveau=>1,p_pack_id=>'LONG-93')->>'YEAR'='30', 'niveau');
  perform pg_temp.verifier(histoire.available_questions(p_pack_id=>'LONG-93',p_year_min=>1800,p_year_max=>1800)->>'YEAR'='2', 'période libre exacte');
  perform pg_temp.verifier(histoire.available_questions(p_pack_id=>'LONG-93',p_chapter_ids=>array['LONG-93-CH1','LONG-93-CH2','LONG-93-CH1'])->>'YEAR'='3', 'chapitres et identifiants répétés sans doublons');
  perform pg_temp.verifier(histoire.available_questions(p_pack_id=>'LONG-93',p_level_id=>'LONG-93',p_chapter_ids=>array['LONG-93-CH3'])->>'YEAR'='120', 'niveau et chapitre de test valides');
  perform pg_temp.verifier((select array_agg(k order by k) from jsonb_object_keys(c) k)=array['DAY','MONTH','YEAR'], 'trois nombres seulement');
  perform pg_temp.refuser('select * from histoire.solo_candidates(null,null,null,null,null,null,null,''YEAR'')', '42501');
  perform pg_temp.refuser('select * from histoire.event_answers', '42501');
  perform pg_temp.refuser('select histoire.available_questions(p_year_min=>0)', '22023');
  foreach n in array array[5,10,20,100] loop
    r := histoire.start_game(p_token=>repeat('e',64),p_pack_id=>'LONG-93',p_question_count=>n);
    perform pg_temp.verifier((r->>'question_count')::integer=n, 'longueur fixe ' || n);
    insert into tirages values ((r->>'game_id')::uuid,n,'date');
  end loop;
  r := histoire.start_game(p_token=>repeat('e',64),p_pack_id=>'LONG-93',p_question_count=>0);
  insert into tirages values ((r->>'game_id')::uuid,100,'date');
  r := histoire.start_game(p_token=>repeat('e',64),p_pack_id=>'LONG-93',p_question_count=>0,p_direction=>'inverse',p_difficulty=>'DAY');
  insert into tirages values ((r->>'game_id')::uuid,60,'inverse');
  r := histoire.start_game(p_niveau=>1,p_token=>repeat('e',64),p_pack_id=>'LONG-93',p_question_count=>0);
  insert into tirages values ((r->>'game_id')::uuid,30,'date');
  r := histoire.start_game(p_token=>repeat('e',64),p_pack_id=>'LONG-93',p_chapter_ids=>array['LONG-93-CH3'],p_question_count=>20);
  insert into tirages values ((r->>'game_id')::uuid,20,'date');
  r := histoire.start_game(p_token=>repeat('e',64),p_pack_id=>'LONG-93',p_chapter_ids=>array['LONG-93-CH3'],p_question_count=>20,p_direction=>'inverse',p_difficulty=>'DAY');
  insert into tirages values ((r->>'game_id')::uuid,20,'inverse');
  -- Ancienne signature/choix sans longueur : dix questions.
  r := histoire.start_game(p_token=>repeat('e',64),p_pack_id=>'LONG-93');
  perform pg_temp.verifier(r->>'question_count'='10', 'défaut historique');
  -- Tout avec moins de cinq événements ; les longueurs fixes restent refusées.
  r := histoire.start_game(p_token=>repeat('e',64),p_pack_id=>'LONG-93',p_chapter_ids=>array['LONG-93-CH1','LONG-93-CH2'],p_question_count=>0);
  perform pg_temp.verifier(r->>'question_count'='3', 'petite sélection Tout');
  perform pg_temp.verifier(histoire.next_question((r->>'game_id')::uuid,repeat('e',64))->>'question_count'='3', 'progression réelle sans URL');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''e'',64),p_pack_id=>''LONG-93'',p_year_min=>1800,p_year_max=>1800,p_question_count=>5)', '22023');
  perform pg_temp.refuser('select histoire.start_game(p_token=>repeat(''e'',64),p_pack_id=>''LONG-93'',p_year_min=>1700,p_year_max=>1700,p_question_count=>0)', '22023');
end $$;
reset role;
select pg_temp.verifier((select bool_and(g.question_count=t.attendu and
  (select count(*) from histoire.game_questions q where q.game_id=g.id)=t.attendu)
  from tirages t join histoire.games g on g.id=t.id), 'longueurs stockées réelles, jamais zéro');
select pg_temp.verifier((select bool_and((select count(distinct q.event_id)=count(*) from histoire.game_questions q where q.game_id=t.id)) from tirages t), 'événements uniques');
select pg_temp.verifier((select bool_and((select count(*)=count(distinct (expected_year,expected_month,expected_day))
  from histoire.game_questions q where q.game_id=t.id)) from tirages t where t.sens='inverse'), 'dates inversées uniques');
select pg_temp.verifier((select bool_and(g.context->'replay_filters'->>'questionCount' in ('0','5','10','20','100'))
  from tirages t join histoire.games g on g.id=t.id), 'choix de longueur enregistré');
-- Terminer un vrai tirage de cent questions par le correcteur existant (test local uniquement).
set local request.jwt.claim.sub='';
do $$ declare id uuid; q jsonb; correction record; resultat jsonb; begin
  select t.id into id from tirages t where t.attendu=100 limit 1;
  for i in 1..100 loop
    q := histoire.next_question(id,repeat('e',64));
    perform pg_temp.verifier(not q ? 'replay_filters', 'aucun filtre de bilan avant correction');
    select * into correction from histoire.game_questions where game_id=id and position=i;
    perform histoire.submit_answer(p_game_id=>id,p_question_id=>(q->>'question_id')::uuid,
      p_year=>correction.expected_year,p_month=>correction.expected_month,p_day=>correction.expected_day,p_token=>repeat('e',64));
  end loop;
  resultat := histoire.finish_game(id,repeat('e',64));
  perform pg_temp.verifier(resultat->>'question_count'='100' and jsonb_array_length(resultat->'questions')=100, 'bilan complet à cent questions');
  perform pg_temp.verifier(resultat->'replay_filters' is not null and not (resultat->'replay_filters') ? 'p_token', 'relance disponible au bilan, sans secret');
end $$;

-- Les limites anonymes existantes utilisent la longueur réellement insérée, jamais le zéro Tout.
update histoire.solo_anonymous_limits set max_questions=(select coalesce(sum(question_count),0)+2 from histoire.games where user_id is null);
set local role anon;
select pg_temp.refuser('select histoire.start_game(p_token=>repeat(''e'',64),p_pack_id=>''LONG-93'',p_question_count=>0)', '53400');
reset role;

-- Lecture normalisée de scores existants : aucune mise à jour des scores.
insert into histoire.games(user_id,difficulty,question_count,state,direction,finished_at,average_accuracy,total_points,context)
select '00000000-0000-4000-8000-000000000093','YEAR',n,'finished','date',clock_timestamp(),80,p,
  '{"mode":"solo_libre","pack":{"key":"LONG-93","label":"Longueurs"},"chapters":[]}'::jsonb
from (values (5,400),(20,1500),(100,7000)) x(n,p);
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000093';
select pg_temp.verifier((histoire.player_stats()->>'average_points_per_question')::numeric=75, 'moyenne des ratios 80,75,70');
select pg_temp.verifier((histoire.player_stats()->>'best_points_per_question')::numeric=80, 'record normalisé, petite partie meilleure');
select pg_temp.verifier(histoire.player_stats()->>'best_score'='7000', 'agrégat brut historique conservé');
select pg_temp.verifier((histoire.player_stats()->'modes'->0->>'best_points_per_question')::numeric=80, 'mode normalisé');
select pg_temp.verifier((histoire.player_stats()->'contexts'->0->>'best_points_per_question')::numeric=80, 'contexte normalisé');
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000094';
select pg_temp.verifier(histoire.player_stats()->'best_points_per_question'='null'::jsonb, 'aucun résultat A visible par B');
reset role;
select pg_temp.verifier((select sum(total_points)=8900 from histoire.games where user_id='00000000-0000-4000-8000-000000000093'), 'scores inchangés');
rollback;
