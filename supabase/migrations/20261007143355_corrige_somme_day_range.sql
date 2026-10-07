-- Correction canonique dédiée : aucun import global, aucun changement de droits.
-- KFFR : uniquement après GO CORRECTION SOMME PROD, exécuter ce fichier exact.
-- L'historique supabase_migrations.schema_migrations n'est jamais modifié.
begin;

do $$
begin
  -- Verrou court : empêcher un import concurrent de changer l'état contrôlé.
  lock table histoire.migrations_appliquees, histoire.events, histoire.event_answers,
    histoire.chapter_cards, histoire.event_tags in share row exclusive mode;

  if exists (select 1 from histoire.migrations_appliquees where version = '20261007143355') then
    raise exception 'Somme : migration déjà enregistrée, ne pas réappliquer';
  end if;
  if (select count(*) from histoire.migrations_appliquees) <> 9
    or not exists (select 1 from histoire.migrations_appliquees
      where version = '20261007102922' and nom = 'chapter_cards') then
    raise exception 'Somme : registre Histoire antérieur inattendu';
  end if;

  -- Initialisation locale/CI : migrations avant seed/import, aucun contenu encore.
  -- L'import du CSV corrigé fournit alors directement la plage. Un état partiel
  -- ou une base peuplée sans la Somme ne bénéficie jamais de cette exception.
  if not exists (select 1 from histoire.events)
    and not exists (select 1 from histoire.chapters)
    and not exists (select 1 from histoire.chapter_cards) then
    return;
  end if;

  if (select count(*) from histoire.events) <> 2001
    or (select count(*) from histoire.chapters) <> 41
    or (select count(*) from histoire.chapter_cards) <> 325 then
    raise exception 'Somme : attendu 2001 événements, 41 chapitres, 325 cartes';
  end if;
  if not exists (select 1 from histoire.events where id = 'EVT-0210'
    and title = 'bataille de la Somme' and event_type = 'POINT'
    and precision = 'DAY' and date_status = 'EXACT' and playable and playable_mode = 'DAY') then
    raise exception 'Somme : métadonnées canoniques antérieures inattendues';
  end if;
  if not exists (select 1 from histoire.event_answers where event_id = 'EVT-0210'
    and (start_year, start_month, start_day) = (1916, 11, 18)
    and end_year is null and end_month is null and end_day is null
    and date_text = '1er juillet - 18 novembre 1916') then
    raise exception 'Somme : réponse canonique antérieure inattendue';
  end if;
  if (select count(*) from histoire.chapter_cards where event_id = 'EVT-0210') <> 1
    or not exists (select 1 from histoire.chapter_cards
      where card_id = 'CARD-027-somme-guerre-usure' and chapter_id = 'THM-027' and event_id = 'EVT-0210'
      and (start_year, start_month, start_day) = (1916, 11, 18)
      and end_year is null and end_month is null and end_day is null
      and date_text = '1er juillet - 18 novembre 1916'
      and date_precision = 'DAY' and date_status = 'EXACT' and sort_order = 4) then
    raise exception 'Somme : carte dérivée antérieure inattendue';
  end if;
  if (select count(*) from histoire.event_tags where event_id = 'EVT-0210'
      and tag_id in ('TAG-0064', 'TAG-0071')) <> 2
    or exists (select 1 from histoire.event_tags where event_id = 'EVT-0210'
      and tag_id in ('TAG-0067', 'TAG-0069'))
    or not exists (select 1 from histoire.tags where id = 'TAG-0067' and slug = 'gameplay-range')
    or not exists (select 1 from histoire.tags where id = 'TAG-0069' and slug = 'event-type-event') then
    raise exception 'Somme : tags de mode/type antérieurs inattendus';
  end if;

  update histoire.events set event_type = 'EVENT', precision = 'DAY_RANGE', playable_mode = 'RANGE'
    where id = 'EVT-0210';
  update histoire.event_answers set start_year = 1916, start_month = 7, start_day = 1,
    end_year = 1916, end_month = 11, end_day = 18 where event_id = 'EVT-0210';
  update histoire.chapter_cards set start_year = 1916, start_month = 7, start_day = 1,
    end_year = 1916, end_month = 11, end_day = 18, date_precision = 'DAY_RANGE'
    where card_id = 'CARD-027-somme-guerre-usure';
  -- Ces deux classifications sont dérivées du canon ; leur confiance est conservée.
  update histoire.event_tags set tag_id = case tag_id
    when 'TAG-0064' then 'TAG-0067' when 'TAG-0071' then 'TAG-0069' end
    where event_id = 'EVT-0210' and tag_id in ('TAG-0064', 'TAG-0071');
end;
$$;

insert into histoire.migrations_appliquees(version, nom)
values ('20261007143355', 'corrige_somme_day_range');

commit;
