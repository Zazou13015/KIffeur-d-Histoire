-- Démonstration de l'oracle, NON une garantie de sécurité : Postgres LOCAL uniquement.
-- Aucune migration appliquée ici. Toutes les fixtures sont annulées à la fin.
begin;
do $$ begin
  if inet_server_addr() is not null and inet_server_addr() not in ('127.0.0.1'::inet,'::1'::inet) then
    raise exception 'Démonstration réservée à une connexion locale';
  end if;
end $$;
insert into histoire.levels(id,name,cycle,position)
values ('AUDIT-93','Niveau audit fictif','lycee',30094);
insert into histoire.chapters(id,level_id,school_year,program_scope,title)
values ('AUDIT-93-CH','AUDIT-93','2026-2027','Tronc commun','Chapitre audit fictif');
insert into histoire.packs(id,slug,title) values ('AUDIT-93','audit-93','Pack audit fictif');
insert into histoire.tags(id,slug,name,tag_type)
values ('AUDIT-93','audit-93','Thème audit fictif','SEMANTIC_TOPIC');
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau)
values ('EVT-9979','Événement fictif sans année dans le titre','POINT','DAY','EXACT',true,'DAY',1,1,1);
insert into histoire.event_answers(event_id,start_year,start_month,start_day)
values ('EVT-9979',1807,2,3);
insert into histoire.pack_events(pack_id,event_id,position) values ('AUDIT-93','EVT-9979',1);
insert into histoire.event_tags(event_id,tag_id) values ('EVT-9979','AUDIT-93');
insert into histoire.event_levels(event_id,level_id) values ('EVT-9979','AUDIT-93');
insert into histoire.event_chapters(event_id,chapter_id) values ('EVT-9979','AUDIT-93-CH');

-- INVOKER : aucun accès privilégié à event_answers pour déduire l'année.
create function pg_temp.deduire_annee(filtre text) returns integer language plpgsql as $$
declare bas integer := 1; haut integer := 3000; milieu integer; n integer; appels integer := 0;
begin
  while bas < haut loop
    milieu := (bas+haut)/2;
    n := (histoire.available_questions(
      p_pack_id=>case when filtre='pack' then 'AUDIT-93' end,
      p_tag_id=>case when filtre='theme' then 'AUDIT-93' end,
      p_chapter_ids=>case when filtre='chapitre' then array['AUDIT-93-CH'] end,
      p_year_min=>1,p_year_max=>milieu)->>'YEAR')::integer;
    if n > 0 then haut := milieu; else bas := milieu+1; end if;
    appels := appels+1;
  end loop;
  if bas <> 1807 or appels > 12 then raise exception 'Démonstration non reproduite'; end if;
  raise notice 'ORACLE : rôle %, filtre %, année déduite % en % appels', current_user,filtre,bas,appels;
  return bas;
end $$;
set local role anon;
select pg_temp.deduire_annee('pack'), pg_temp.deduire_annee('theme'), pg_temp.deduire_annee('chapitre');
reset role;
set local role authenticated;
select pg_temp.deduire_annee('pack'), pg_temp.deduire_annee('theme'), pg_temp.deduire_annee('chapitre');
reset role;
rollback;
