-- Les jeux ont réellement été insérés AVANT le trigger et son backfill.
begin;
do $$ begin
  if (select count(*) from histoire.game_question_editorial_snapshots s join histoire.game_questions q
    on q.id=s.question_id where q.event_id='EVT-88990' and s.display_title='Le musée ouvre ses portes') <> 2 then
    raise exception 'Backfill : titre rédigé non conservé';
  end if;
  if exists (select 1 from histoire.game_questions where event_id='EVT-88990'
    and (title<>'Ouverture du musée royal' or expected_year<>1850 or answered_at is not null or points is not null)) then
    raise exception 'Backfill : question existante modifiée';
  end if;
end $$;
update histoire.events set title='Création de la bibliothèque municipale',titre_question='Nouvelle question' where id='EVT-88990';
delete from histoire.event_aliases where event_id='EVT-88990';
do $$ declare v_game uuid; v_q jsonb; v_result jsonb; begin
  select g.id into v_game from histoire.games g join histoire.game_questions q on q.game_id=g.id
    where q.event_id='EVT-88990' and g.direction='date';
  v_q := histoire.next_question(v_game,repeat('c',64));
  if v_q->>'title'<>'Le musée ouvre ses portes' then raise exception 'Backfill : affichage changé'; end if;
  select g.id into v_game from histoire.games g join histoire.game_questions q on q.game_id=g.id
    where q.event_id='EVT-88990' and g.direction='inverse';
  v_q := histoire.next_question(v_game,repeat('c',64));
  v_result := histoire.submit_answer(v_game,(v_q->>'question_id')::uuid,p_token=>repeat('c',64),p_answer_text=>'Le musée central');
  if v_result->>'correct'<>'true' or v_result->>'title'<>'Ouverture du musée royal' then
    raise exception 'Backfill : anciennes réponses acceptées perdues';
  end if;
end $$;
rollback;
-- Nettoyage avant les autres suites et le seed.
delete from histoire.games where id in (select game_id from histoire.game_questions where event_id='EVT-88990');
delete from histoire.pack_events where pack_id='BACK104';
delete from histoire.packs where id='BACK104';
delete from histoire.events where id='EVT-88990';
