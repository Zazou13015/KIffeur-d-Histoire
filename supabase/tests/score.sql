-- Tests du calcul du score (issue #12) : histoire.date_gap, histoire.score_points, histoire.score_answer.
-- Lancer sur la base locale : `npm run db:test-score` (Docker),
-- ou coller dans le SQL Editor de la base de test. N'écrit rien : tout est annulé à la fin.
-- Sortie attendue : « OK : … » ; une erreur « ÉCHEC : … » sinon.

begin;

create function pg_temp.verifier(condition boolean, description text) returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'ÉCHEC : %', description;
  end if;
end;
$$;

do $$
declare
  r record;
begin
  -- 1. Exemple du PRD : armistice du 11 novembre 1918 en Facile, réponse 1914 en 10 s → 92 % et 83 points.
  select * into r from histoire.score_answer(1914, null, null, 1918, 11, 11, 'YEAR', 10);
  perform pg_temp.verifier(r.unit = 'YEAR' and r.gap = 4, format('armistice : écart 4 ans attendu, obtenu %s %s', r.gap, r.unit));
  perform pg_temp.verifier(r.accuracy = 92, format('armistice : 92 %% attendu, obtenu %s', r.accuracy));
  perform pg_temp.verifier(r.points = 83, format('armistice : 83 points attendus, obtenu %s', r.points));

  -- 2. Dates av. J.-C., sans année 0.
  perform pg_temp.verifier(histoire.date_gap(-750, null, null, -753, 4, 21, 'YEAR') = 3,
    'fondation de Rome : 750 av. J.-C. contre 753 av. J.-C. = 3 ans');
  perform pg_temp.verifier(histoire.date_gap(1, null, null, -1, null, null, 'YEAR') = 1,
    '1 av. J.-C. et 1 apr. J.-C. sont consécutives (pas d''année 0)');
  perform pg_temp.verifier(histoire.date_gap(50, null, null, -44, null, null, 'YEAR') = 93,
    '44 av. J.-C. → 50 apr. J.-C. = 93 ans');
  perform pg_temp.verifier(histoire.date_gap(1, 1, null, -1, 12, null, 'MONTH') = 1,
    'décembre 1 av. J.-C. → janvier 1 apr. J.-C. = 1 mois');
  perform pg_temp.verifier(histoire.date_gap(1, 1, 1, -1, 12, 31, 'DAY') = 1,
    '31 décembre 1 av. J.-C. → 1er janvier 1 apr. J.-C. = 1 jour');
  perform pg_temp.verifier(histoire.date_gap(-44, 3, 14, -44, 3, 15, 'DAY') = 1,
    'Ides de mars 44 av. J.-C. : 1 jour d''écart');
  select * into r from histoire.score_answer(-760, null, null, -753, 4, 21, 'YEAR', 0);
  perform pg_temp.verifier(r.gap = 7 and r.accuracy = 86 and r.points = 86,
    format('Rome, réponse 760 av. J.-C. en 0 s : 86 %% et 86 points attendus, obtenu %s %% et %s', r.accuracy, r.points));

  -- 3. Mois et jours.
  perform pg_temp.verifier(histoire.date_gap(1789, 8, null, 1789, 7, 14, 'MONTH') = 1, 'juillet → août 1789 = 1 mois');
  perform pg_temp.verifier(histoire.date_gap(1790, 7, null, 1789, 7, 14, 'MONTH') = 12, 'juillet 1789 → juillet 1790 = 12 mois');
  perform pg_temp.verifier(histoire.date_gap(2024, 3, 1, 2024, 2, 28, 'DAY') = 2, '28 février → 1er mars 2024 (bissextile) = 2 jours');
  perform pg_temp.verifier(histoire.date_gap(1789, 7, 14, 1789, 7, 14, 'DAY') = 0, 'date exacte = 0');
  select * into r from histoire.score_answer(1789, 10, null, 1789, 7, 14, 'MONTH', 0);
  perform pg_temp.verifier(r.unit = 'MONTH' and r.gap = 3 and r.accuracy = 91.67 and r.points = 92,
    format('Bastille en Moyen, octobre : 91,67 %% et 92 points attendus, obtenu %s %% et %s', r.accuracy, r.points));
  select * into r from histoire.score_answer(1789, 8, 3, 1789, 7, 14, 'DAY', 15);
  perform pg_temp.verifier(r.unit = 'DAY' and r.gap = 20 and r.accuracy = 77.78 and r.points = 66,
    format('Bastille en Difficile, 3 août en 15 s : 77,78 %% et 66 points attendus, obtenu %s %% et %s', r.accuracy, r.points));

  -- 4. Au-delà de E₀ : 0 %.
  select * into r from histoire.score_answer(1850, null, null, 1918, 11, 11, 'YEAR', 0);
  perform pg_temp.verifier(r.accuracy = 0 and r.points = 0, 'écart de 68 ans en Facile : 0 % et 0 point');

  -- 5. Chrono : réponse exacte immédiate = 100, à 30 s pile = 70, après 30 s ou sans réponse = 0.
  select * into r from histoire.score_answer(1918, null, null, 1918, 11, 11, 'YEAR', 0);
  perform pg_temp.verifier(r.accuracy = 100 and r.points = 100, 'réponse exacte en 0 s : 100 points');
  select * into r from histoire.score_answer(1918, null, null, 1918, 11, 11, 'YEAR', 30);
  perform pg_temp.verifier(r.points = 70, format('réponse exacte à 30 s : 70 points attendus, obtenu %s', r.points));
  select * into r from histoire.score_answer(1918, null, null, 1918, 11, 11, 'YEAR', 30.5);
  perform pg_temp.verifier(r.accuracy = 0 and r.points = 0, 'réponse après le chrono : 0');
  select * into r from histoire.score_answer(null, null, null, 1918, 11, 11, 'YEAR', 12);
  perform pg_temp.verifier(r.accuracy = 0 and r.points = 0 and r.gap is null, 'sans réponse : 0');

  -- 6. Événement connu moins précisément que la difficulté : écart compté dans l'unité disponible.
  select * into r from histoire.score_answer(1460, 5, 1, 1455, null, null, 'DAY', 0);
  perform pg_temp.verifier(r.unit = 'YEAR' and r.gap = 5 and r.accuracy = 90,
    format('Bible de Gutenberg (connue à l''année) en Difficile : 5 ans et 90 %% attendus, obtenu %s %s et %s %%', r.gap, r.unit, r.accuracy));
  select * into r from histoire.score_answer(843, 10, 2, 843, 8, null, 'DAY', 0);
  perform pg_temp.verifier(r.unit = 'MONTH' and r.gap = 2,
    format('traité de Verdun (connu au mois) en Difficile : 2 mois attendus, obtenu %s %s', r.gap, r.unit));

  -- 7. Mode inversé : même bonus de rapidité, 100 % ou 0 %.
  perform pg_temp.verifier(histoire.score_points(100, 15) = 85, 'mode inversé, bonne réponse en 15 s : 85 points');
  perform pg_temp.verifier(histoire.score_points(0, 1) = 0, 'mode inversé, mauvaise réponse : 0 point');
  perform pg_temp.verifier(histoire.score_points(100, 31) = 0, 'mode inversé, après le chrono : 0 point');

  -- 8. Les réglages se changent par une simple mise à jour (annulée en fin de test).
  update histoire.scoring_settings set max_gap_years = 40;
  select * into r from histoire.score_answer(1914, null, null, 1918, 11, 11, 'YEAR', 10);
  perform pg_temp.verifier(r.accuracy = 90 and r.points = 81,
    format('E₀ = 40 ans : 90 %% et 81 points attendus, obtenu %s %% et %s', r.accuracy, r.points));
  update histoire.scoring_settings set max_gap_years = 50;

  -- 9. Entrées invalides refusées.
  begin
    perform histoire.date_gap(0, null, null, 1918, null, null, 'YEAR');
    raise exception 'ÉCHEC : l''année 0 devrait être refusée';
  exception when raise_exception then
    if sqlerrm like 'ÉCHEC%' then raise; end if;
  end;
  begin
    perform histoire.date_gap(1918, 2, 30, 1918, 11, 11, 'DAY');
    raise exception 'ÉCHEC : le 30 février devrait être refusé';
  exception when datetime_field_overflow then null;
  end;

  raise notice 'OK : calcul du score (exemple du PRD, av. J.-C., chrono, précision réduite, mode inversé, réglages)';
end;
$$;

-- 10. Le navigateur lit les réglages mais ne peut pas appeler les fonctions de score lui-même.
set local role anon;
do $$
begin
  perform pg_temp.verifier((select timer_seconds from histoire.scoring_settings) = 30, 'anon doit lire la durée du chrono');
  begin
    perform histoire.score_answer(1914, null, null, 1918, 11, 11, 'YEAR', 10);
    raise exception 'ÉCHEC : anon ne doit pas pouvoir appeler score_answer';
  exception when insufficient_privilege then null;
  end;
  begin
    update histoire.scoring_settings set timer_seconds = 999;
    raise exception 'ÉCHEC : anon ne doit pas pouvoir modifier les réglages';
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK : droits du navigateur (réglages en lecture seule, fonctions de score fermées)';
end;
$$;
reset role;

rollback;
