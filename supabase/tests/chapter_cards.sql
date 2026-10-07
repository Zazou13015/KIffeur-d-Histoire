-- Tests transactionnels après seed OU dataset complet. Tout est annulé.
begin;

insert into histoire.chapter_cards(card_id, chapter_id, event_id, start_year, start_month, start_day,
  date_text, date_precision, date_status, title, body, takeaway, key_concepts, official_wording, sources, sort_order)
values ('CARD-test-rome', 'THM-005', 'EVT-0024', -753, 4, 21,
  '21 avril 753 av. J.-C.', 'DAY', 'TRADITIONAL', 'Rome (fixture)',
  repeat('Texte pédagogique pour vérifier les accès de lecture publics. ', 8),
  'À retenir : une date traditionnelle.', array['tradition'], 'Fondation traditionnelle de Rome', array['https://example.invalid'], 999);

create function pg_temp.verifier_cartes() returns text language plpgsql as $$
declare resultat jsonb;
begin
  select to_jsonb(c) into resultat from histoire.get_chapter_cards('THM-005') c
    where c.card_id = 'CARD-test-rome';
  if resultat is null or resultat->>'date_text' <> '21 avril 753 av. J.-C.' then
    raise exception 'Lecture pédagogique refusée à %', current_user;
  end if;
  if (select array_agg(k order by k) from jsonb_object_keys(resultat) k) is distinct from
    array['body', 'card_id', 'chapter_id', 'date_text', 'end_day', 'end_month', 'end_year',
      'key_concepts', 'sort_order', 'start_day', 'start_month', 'start_year', 'takeaway', 'title'] then
    raise exception 'Projection publique incorrecte à % : %', current_user, resultat;
  end if;
  if exists (select 1 from histoire.get_chapter_cards('EVT-0024')) then
    raise exception 'RPC sondable par event_id';
  end if;
  begin
    perform event_id, date_text from histoire.chapter_cards where event_id = 'EVT-0024';
    raise exception 'Oracle event_id -> date accessible à %', current_user;
  exception when insufficient_privilege then null; end;
  begin
    perform * from histoire.chapter_cards;
    raise exception 'Table interne lisible à %', current_user;
  exception when insufficient_privilege then null; end;
  begin
    perform c.event_id from histoire.get_chapter_cards('THM-005') c;
    raise exception 'event_id exposé par la RPC à %', current_user;
  exception when undefined_column then null; end;
  begin
    perform c.sources from histoire.get_chapter_cards('THM-005') c;
    raise exception 'Sources exposées par la RPC à %', current_user;
  exception when undefined_column then null; end;
  begin
    insert into histoire.chapter_cards select * from histoire.chapter_cards where card_id = 'CARD-test-rome';
    raise exception 'Écriture pédagogique autorisée à %', current_user;
  exception when insufficient_privilege then null; end;
  begin
    update histoire.chapter_cards set title = 'Interdit' where card_id = 'CARD-test-rome';
    raise exception 'Modification pédagogique autorisée à %', current_user;
  exception when insufficient_privilege then null; end;
  begin
    delete from histoire.chapter_cards where card_id = 'CARD-test-rome';
    raise exception 'Suppression pédagogique autorisée à %', current_user;
  exception when insufficient_privilege then null; end;
  begin
    perform histoire.replace_chapter_cards('[]'::jsonb);
    raise exception 'RPC d''import autorisée à %', current_user;
  exception when insufficient_privilege then null; end;
  begin
    perform * from histoire.event_answers limit 1;
    raise exception 'Réponses historiques exposées à %', current_user;
  exception when insufficient_privilege then null; end;
  begin
    perform * from histoire.event_aliases limit 1;
    raise exception 'Alias historiques exposés à %', current_user;
  exception when insufficient_privilege then null; end;
  return format('OK : %s lit la RPC sans event_id ni sources ; table interne, oracle, écritures, réponses et alias refusés.', current_user);
end;
$$;
grant execute on function pg_temp.verifier_cartes() to anon, authenticated;
set local role anon;
select pg_temp.verifier_cartes();
set local role authenticated;
select pg_temp.verifier_cartes();
reset role;

do $$
declare modification text;
begin
  if not (select relrowsecurity from pg_class where oid = 'histoire.chapter_cards'::regclass) then
    raise exception 'RLS absente';
  end if;
  -- Vérifie les contraintes sur une carte existante, sans fausser le résultat
  -- par une violation de clé primaire.
  foreach modification in array array[
    'chapter_id = ''THM-INCONNU''', 'event_id = ''EVT-INCONNU''',
    'event_id = ''EVT-0173''', 'body = ''''', 'takeaway = ''''', 'title = ''''',
    'key_concepts = array[]::text[]', 'start_year = 0', 'start_month = null',
    'start_month = 13', 'end_year = -754', 'event_id = null', 'sort_order = 0'
  ] loop
    begin
      execute 'update histoire.chapter_cards set ' || modification || ' where card_id = ''CARD-test-rome''';
      raise exception 'Contrainte manquante : %', modification;
    exception when check_violation or foreign_key_violation then null; end;
  end loop;
  begin
    perform histoire.replace_chapter_cards('[]'::jsonb);
    raise exception 'Lot vide accepté';
  exception when raise_exception then
    if sqlerrm = 'Lot vide accepté' then raise; end if;
  end;
end;
$$;

-- Même avec des grants accidentels, aucune ligne interne n'est visible/modifiable.
grant select, insert, update, delete on histoire.chapter_cards to anon, authenticated;
create function pg_temp.verifier_rls_cartes() returns text language plpgsql as $$ begin
  if exists (select event_id from histoire.chapter_cards) then
    raise exception 'RLS autorise SELECT %', current_user;
  end if;
  update histoire.chapter_cards set title = 'Interdit' where card_id = 'CARD-test-rome';
  if found then raise exception 'RLS autorise UPDATE %', current_user; end if;
  delete from histoire.chapter_cards where card_id = 'CARD-test-rome';
  if found then raise exception 'RLS autorise DELETE %', current_user; end if;
  begin
    insert into histoire.chapter_cards(card_id, chapter_id, event_id, start_year, start_month, start_day,
      date_text, date_precision, date_status, title, body, takeaway, key_concepts, official_wording, sources, sort_order)
    select 'CARD-test-insertion', c.chapter_id, 'EVT-0024', c.start_year, c.start_month, c.start_day,
      c.date_text, 'DAY', 'TRADITIONAL', c.title, c.body, c.takeaway, c.key_concepts,
      'Fondation traditionnelle de Rome', array['https://example.invalid'], 998
    from histoire.get_chapter_cards('THM-005') c where c.card_id = 'CARD-test-rome';
    raise exception 'RLS autorise INSERT %', current_user;
  exception when insufficient_privilege then null; end;
  return format('OK : RLS %s bloque la table même avec des grants accidentels.', current_user);
end $$;
grant execute on function pg_temp.verifier_rls_cartes() to anon, authenticated;
set local role anon;
select pg_temp.verifier_rls_cartes();
set local role authenticated;
select pg_temp.verifier_rls_cartes();
reset role;
rollback;
