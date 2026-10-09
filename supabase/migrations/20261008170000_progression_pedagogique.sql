-- #23 : progression du mode pédagogique (chapitres découverts, meilleur test par chapitre).
-- Table privée de chaque joueur : lecture de ses seules lignes (RLS), écriture uniquement
-- par les deux RPC ci-dessous. Rien ici n'est lisible ni modifiable pour un autre joueur.
create table histoire.learning_progress (
  user_id uuid not null references histoire.players (id) on delete cascade,
  chapter_id text not null references histoire.chapters (id) on delete cascade,
  discovered_at timestamptz,
  best_accuracy numeric(5, 2) check (best_accuracy between 0 and 100),
  best_difficulty text check (best_difficulty in ('YEAR', 'MONTH', 'DAY')),
  best_tested_at timestamptz,
  tests_count integer not null default 0 check (tests_count >= 0),
  -- Dernière partie comptée : rejouer le même bilan n'ajoute pas un test.
  last_game_id uuid,
  primary key (user_id, chapter_id)
);
comment on table histoire.learning_progress is
  'Progression pédagogique du joueur connecté. Écriture par RPC uniquement ; aucun lien avec les réponses des questions.';

alter table histoire.learning_progress enable row level security;
create policy "le joueur lit sa progression" on histoire.learning_progress
  for select to authenticated using (user_id = auth.uid());
revoke all on histoire.learning_progress from public, anon, authenticated;
grant select on histoire.learning_progress to authenticated;

-- Ouverture d'un chapitre sur /apprendre : marque « découvert » (une seule fois).
create function histoire.mark_chapter_discovered(p_chapter_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare player_id uuid := auth.uid();
begin
  if player_id is null then
    raise exception using errcode = '42501', message = 'Connexion requise';
  end if;
  if p_chapter_id is null or not exists (select 1 from histoire.chapters where id = p_chapter_id) then
    raise exception using errcode = '22023', message = 'Chapitre inconnu';
  end if;
  perform histoire.ensure_player();
  insert into histoire.learning_progress(user_id, chapter_id, discovered_at)
  values (player_id, p_chapter_id, now())
  on conflict (user_id, chapter_id) do update
    set discovered_at = coalesce(histoire.learning_progress.discovered_at, excluded.discovered_at);
end;
$$;

-- Fin d'un test de chapitre : la précision vient de la partie terminée du joueur, jamais du navigateur.
-- Un test est une partie de dates terminée, d'au moins 5 questions, filtrée sur un seul chapitre.
create function histoire.record_chapter_test(p_game_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  player_id uuid := auth.uid();
  g histoire.games;
  chapter text;
  row_after histoire.learning_progress;
  previous numeric;
begin
  if player_id is null then
    raise exception using errcode = '42501', message = 'Connexion requise';
  end if;
  select * into g from histoire.games
    where id = p_game_id and user_id = player_id and state = 'finished' and direction = 'date';
  if not found then
    raise exception using errcode = '42501', message = 'Partie inaccessible';
  end if;
  if g.question_count < 5 or g.average_accuracy is null
    or jsonb_array_length(coalesce(g.context->'chapters', '[]'::jsonb)) <> 1 then
    raise exception using errcode = '22023', message = 'Cette partie n''est pas un test de chapitre';
  end if;
  chapter := g.context->'chapters'->0->>'key';
  if not exists (select 1 from histoire.chapters where id = chapter) then
    raise exception using errcode = '22023', message = 'Chapitre inconnu';
  end if;
  perform histoire.ensure_player();
  select best_accuracy into previous from histoire.learning_progress
    where user_id = player_id and chapter_id = chapter;
  insert into histoire.learning_progress as lp(user_id, chapter_id, best_accuracy, best_difficulty,
    best_tested_at, tests_count, last_game_id)
  values (player_id, chapter, g.average_accuracy, g.difficulty, g.finished_at, 1, g.id)
  on conflict (user_id, chapter_id) do update set
    best_accuracy = case when lp.last_game_id is distinct from g.id
      and (lp.best_accuracy is null or g.average_accuracy > lp.best_accuracy)
      then g.average_accuracy else lp.best_accuracy end,
    best_difficulty = case when lp.last_game_id is distinct from g.id
      and (lp.best_accuracy is null or g.average_accuracy > lp.best_accuracy)
      then g.difficulty else lp.best_difficulty end,
    best_tested_at = case when lp.last_game_id is distinct from g.id
      and (lp.best_accuracy is null or g.average_accuracy > lp.best_accuracy)
      then g.finished_at else lp.best_tested_at end,
    tests_count = lp.tests_count + case when lp.last_game_id is distinct from g.id then 1 else 0 end,
    last_game_id = g.id
  returning * into row_after;
  return jsonb_build_object(
    'chapter_id', row_after.chapter_id,
    'best_accuracy', row_after.best_accuracy,
    'best_difficulty', row_after.best_difficulty,
    'tests_count', row_after.tests_count,
    'improved', previous is null or row_after.best_accuracy > previous);
end;
$$;

revoke all on function histoire.mark_chapter_discovered(text), histoire.record_chapter_test(uuid)
  from public, anon, authenticated;
grant execute on function histoire.mark_chapter_discovered(text), histoire.record_chapter_test(uuid)
  to authenticated;

insert into histoire.migrations_appliquees(version, nom) values ('20261008170000', 'progression_pedagogique');
