-- Simulateur CI vide uniquement, juste avant la migration #104 ; jamais sur KFFR.
insert into histoire.packs(id,slug,title) values ('BACK104','back104','Fixture backfill');
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau,titre_question)
  values ('EVT-88990','Ouverture du musée royal','POINT','DAY','EXACT',true,'DAY',1,1,1,'Le musée ouvre ses portes');
insert into histoire.event_answers(event_id,start_year,start_month,start_day) values ('EVT-88990',1850,3,4);
insert into histoire.event_aliases(event_id,alias) values ('EVT-88990','Le musée central');
insert into histoire.pack_events(pack_id,event_id,position) values ('BACK104','EVT-88990',1);
set role anon;
select histoire.start_game(p_token=>repeat('c',64),p_pack_id=>'BACK104',p_question_count=>1);
select histoire.start_game(p_token=>repeat('c',64),p_pack_id=>'BACK104',p_question_count=>1,p_direction=>'inverse');
reset role;
