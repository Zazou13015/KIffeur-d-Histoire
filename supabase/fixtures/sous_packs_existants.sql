-- EXEMPLE LOCAL/CI seulement : aucun événement ni date ajoutés.
-- Guerres et batailles (#89), découpage démonstratif sans décision éditoriale.
insert into histoire.packs(id,slug,title,parent_id,position) values
  ('E2E89-ancien','e2e89-ancien','Conflits avant 1800 (démo)','COL-0069',101),
  ('E2E89-moderne','e2e89-moderne','Conflits depuis 1800 (démo)','COL-0069',102),
  ('E2E89-vide','e2e89-vide','Sous-pack vide (démo)','COL-0069',103)
  on conflict(id) do update set parent_id=excluded.parent_id,active=true;
insert into histoire.pack_events(pack_id,event_id,position)
  select case when a.start_year < 1800 then 'E2E89-ancien' else 'E2E89-moderne' end,pe.event_id,pe.position
  from histoire.pack_events pe join histoire.event_answers a on a.event_id=pe.event_id
  where pe.pack_id='COL-0069' and a.start_year is not null
  on conflict(pack_id,event_id) do nothing;
-- Pack du dataset existant : vérifie la préservation de parent_id au réimport.
update histoire.packs set parent_id='COL-0069' where id='COL-0063';
