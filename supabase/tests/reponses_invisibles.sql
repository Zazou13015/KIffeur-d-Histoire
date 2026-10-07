-- Vérifie qu'un visiteur (clé publique : rôle anon) ou un joueur connecté (rôle authenticated)
-- ne peut lire ni les dates, ni les alias, ni les descriptions des événements.
-- Lancer après `npm run db:reset` : `npm run db:test-securite` (base locale, Docker)
-- (ou coller dans le SQL Editor de la base de test). N'écrit rien : tout est annulé à la fin.
-- Sortie attendue : « OK : ... » pour chaque rôle ; une erreur « ÉCHEC : ... » sinon.

begin;

create function pg_temp.verifier_reponses_invisibles() returns text
language plpgsql
as $$
declare
  role_courant text := current_user;
  nb integer;
begin
  -- 1. Les tables de réponses sont fermées.
  begin
    perform 1 from histoire.event_answers limit 1;
    raise exception 'ÉCHEC (%) : histoire.event_answers (dates) est lisible', role_courant;
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from histoire.event_aliases limit 1;
    raise exception 'ÉCHEC (%) : histoire.event_aliases est lisible', role_courant;
  exception when insufficient_privilege then null;
  end;

  -- 2. Aucune table ou vue lisible du schéma ne contient de colonne de date ou de description.
  select count(*) into nb
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'histoire'
    and c.relkind in ('r', 'v', 'm')
    and a.attnum > 0 and not a.attisdropped
    and has_column_privilege(role_courant, c.oid, a.attnum, 'SELECT')
    and a.attname ~ '(^(start|end)_|^(year|month|day)$|date_text|secondary_dates|alias|^description$)'
    and not (c.relname in ('packs', 'tags') and a.attname = 'description')
    -- Exception explicite de l'issue #21 : repères éditoriaux publics de révision.
    -- Aucune jointure ni ouverture de event_answers/event_aliases.
    and not (c.relname = 'chapter_cards' and a.attname in
      ('start_year', 'start_month', 'start_day', 'end_year', 'end_month', 'end_day',
       'date_text', 'date_precision', 'date_status'));
  if nb > 0 then
    raise exception 'ÉCHEC (%) : % colonne(s) de date, d''alias ou de description lisible(s)', role_courant, nb;
  end if;

  -- 3. Les tags de siècle (indice de date) ne sont pas publiés sur les événements.
  select count(*) into nb
  from histoire.event_tags et join histoire.tags t on t.id = et.tag_id
  where t.tag_type = 'CENTURY';
  if nb > 0 then
    raise exception 'ÉCHEC (%) : % tag(s) de siècle visibles sur des événements', role_courant, nb;
  end if;

  -- 4. Le contenu public reste lisible. Le correcteur sans partie est désormais
  -- interne : des alias contiennent des dates, le sonder permettrait de tricher.
  select count(*) into nb from histoire.events;
  if nb = 0 then
    raise exception 'ÉCHEC (%) : aucun événement lisible (base vide ou droits manquants)', role_courant;
  end if;
  begin
    perform histoire.check_event_answer('EVT-0173', 'La prise de la Bastile');
    raise exception 'ÉCHEC (%) : le correcteur sans partie est appelable', role_courant;
  exception when insufficient_privilege then null;
  end;

  return format('OK : %s ne voit ni dates, ni alias, ni descriptions (%s événements lisibles)', role_courant, nb);
end;
$$;

grant execute on function pg_temp.verifier_reponses_invisibles() to anon, authenticated;

do $$ begin
  if not histoire.check_event_answer('EVT-0173', 'La prise de la Bastile') then
    raise exception 'ÉCHEC : le correcteur interne ne reconnaît pas « La prise de la Bastile »';
  end if;
end $$;

set local role anon;
select pg_temp.verifier_reponses_invisibles() as resultat;
reset role;

set local role authenticated;
select pg_temp.verifier_reponses_invisibles() as resultat;
reset role;

rollback;
