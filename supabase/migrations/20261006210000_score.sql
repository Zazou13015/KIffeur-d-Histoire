-- Calcul du score côté serveur (issue #12, étape 2.1).
-- Une seule formule pour tous les modes, réglable sans toucher au code (table scoring_settings).
-- Rappel du PRD (« Score et chrono ») :
--   précision P = 100 × max(0, 1 − écart / E₀)
--   points      = P × (0,7 + 0,3 × temps restant / 30), 0 si la réponse arrive après le chrono
--   mode inversé : P = 100 si bonne réponse, 0 sinon, même bonus de rapidité.
--
-- Unités : on reprend les codes du dataset (playable_mode) : YEAR = Facile, MONTH = Moyen, DAY = Difficile.

-- ---------------------------------------------------------------------------
-- Réglages (une seule ligne)
-- ---------------------------------------------------------------------------

-- Pour recalibrer, une simple mise à jour suffit, par exemple :
--   update histoire.scoring_settings set max_gap_years = 40;
-- (en production, comme toute écriture en base : via une migration relue à deux).
create table histoire.scoring_settings (
  id boolean primary key default true check (id),            -- garantit une seule ligne
  max_gap_years numeric not null default 50 check (max_gap_years > 0),    -- E₀ en Facile
  max_gap_months numeric not null default 36 check (max_gap_months > 0),  -- E₀ en Moyen
  max_gap_days numeric not null default 90 check (max_gap_days > 0),      -- E₀ en Difficile
  accuracy_weight numeric not null default 0.7 check (accuracy_weight >= 0),  -- part garantie à la précision
  speed_weight numeric not null default 0.3 check (speed_weight >= 0),        -- part du bonus de rapidité
  timer_seconds numeric not null default 30 check (timer_seconds > 0),        -- durée du chrono en solo
  updated_at timestamptz not null default now()
);

insert into histoire.scoring_settings default values;

-- Rien de secret : le navigateur peut lire les réglages (durée du chrono à afficher), pas les modifier.
alter table histoire.scoring_settings enable row level security;
grant select on histoire.scoring_settings to anon, authenticated;
create policy "réglages lisibles par tous" on histoire.scoring_settings for select using (true);

-- ---------------------------------------------------------------------------
-- Écart entre deux dates
-- ---------------------------------------------------------------------------

-- Écart (toujours positif) entre la réponse et la date attendue, en années (YEAR), mois (MONTH)
-- ou jours (DAY). Années négatives = av. J.-C., sans année 0 : 1 av. J.-C. (-1) et 1 apr. J.-C. (1)
-- sont consécutives. Seuls les champs utiles à l'unité sont lus : en YEAR, mois et jour sont ignorés.
-- En DAY, le calcul suit le calendrier grégorien (type date de Postgres, valable jusqu'en 4713 av. J.-C.).
create function histoire.date_gap(
  p_answer_year integer, p_answer_month integer, p_answer_day integer,
  p_expected_year integer, p_expected_month integer, p_expected_day integer,
  p_unit text
) returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  -- Année « astronomique » : 1 av. J.-C. = 0, 2 av. J.-C. = -1… pour que les écarts tombent juste.
  a_year integer := case when p_answer_year < 0 then p_answer_year + 1 else p_answer_year end;
  e_year integer := case when p_expected_year < 0 then p_expected_year + 1 else p_expected_year end;
begin
  if p_unit not in ('YEAR', 'MONTH', 'DAY') then
    raise exception 'Unité inconnue : % (attendu YEAR, MONTH ou DAY)', p_unit;
  end if;
  if p_answer_year is null or p_expected_year is null or p_answer_year = 0 or p_expected_year = 0 then
    raise exception 'Année manquante ou égale à 0 (il n''y a pas d''année 0)';
  end if;

  if p_unit = 'YEAR' then
    return abs(a_year - e_year);
  end if;

  if p_answer_month is null or p_expected_month is null then
    raise exception 'Mois manquant pour un écart en %', p_unit;
  end if;
  if p_unit = 'MONTH' then
    return abs((a_year * 12 + p_answer_month) - (e_year * 12 + p_expected_month));
  end if;

  if p_answer_day is null or p_expected_day is null then
    raise exception 'Jour manquant pour un écart en jours';
  end if;
  -- make_date accepte les années négatives (av. J.-C.) et refuse les dates impossibles (30 février).
  return abs(make_date(p_answer_year, p_answer_month, p_answer_day)
           - make_date(p_expected_year, p_expected_month, p_expected_day));
end;
$$;

-- ---------------------------------------------------------------------------
-- Points : formule commune à tous les modes
-- ---------------------------------------------------------------------------

-- Points d'une réponse à partir de sa précision (0 à 100) et du temps mis à répondre.
-- Le mode inversé l'appelle directement avec 100 (bonne réponse) ou 0.
-- Réponse absente ou arrivée après le chrono : 0 point.
create function histoire.score_points(p_accuracy numeric, p_elapsed_seconds numeric)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_accuracy is null or p_elapsed_seconds is null or p_elapsed_seconds > s.timer_seconds then 0
    else round(
      greatest(0, least(100, p_accuracy))
      * (s.accuracy_weight
         + s.speed_weight * (s.timer_seconds - greatest(0, p_elapsed_seconds)) / s.timer_seconds)
    )::integer
  end
  from histoire.scoring_settings s;
$$;

-- ---------------------------------------------------------------------------
-- Score d'une réponse datée (modes Solo libre, Solo scolaire, pédagogique)
-- ---------------------------------------------------------------------------

-- Événement connu moins précisément que la difficulté demandée (ex. connu à l'année, posé en Difficile) :
-- l'écart est compté dans l'unité disponible (ici l'année) avec l'E₀ de cette unité, et `unit` renvoie
-- l'unité réellement utilisée pour que l'écran l'affiche. Le tirage des questions (étape 2.2) évite
-- de toute façon de poser ces questions : c'est un filet de sécurité, pas le cas normal.
--
-- Pour une période (date de fin renseignée), passer la date de début : le choix de la date attendue
-- revient au tirage de la question (étape 2.2).
--
-- Renvoie l'unité utilisée, l'écart dans cette unité, la précision (0 à 100, deux décimales) et les points.
-- Sans réponse (année nulle) ou après le chrono : précision 0 et 0 point.
create function histoire.score_answer(
  p_answer_year integer, p_answer_month integer, p_answer_day integer,
  p_expected_year integer, p_expected_month integer, p_expected_day integer,
  p_unit text,
  p_elapsed_seconds numeric
) returns table (unit text, gap integer, accuracy numeric, points integer)
language plpgsql
stable
set search_path = ''
as $$
declare
  s histoire.scoring_settings;
  max_gap numeric;
  p numeric;
begin
  if p_unit not in ('YEAR', 'MONTH', 'DAY') then
    raise exception 'Unité inconnue : % (attendu YEAR, MONTH ou DAY)', p_unit;
  end if;

  -- Unité la plus fine que la date attendue permet, sans dépasser celle demandée.
  unit := case
    when p_unit = 'DAY' and p_expected_day is not null then 'DAY'
    when p_unit in ('DAY', 'MONTH') and p_expected_month is not null then 'MONTH'
    else 'YEAR'
  end;

  select * into s from histoire.scoring_settings;

  if p_answer_year is null or p_elapsed_seconds is null or p_elapsed_seconds > s.timer_seconds then
    gap := null;
    accuracy := 0;
    points := 0;
    return next;
    return;
  end if;

  gap := histoire.date_gap(p_answer_year, p_answer_month, p_answer_day,
                           p_expected_year, p_expected_month, p_expected_day, unit);
  max_gap := case unit when 'YEAR' then s.max_gap_years when 'MONTH' then s.max_gap_months else s.max_gap_days end;
  p := 100 * greatest(0, 1 - gap / max_gap);
  accuracy := round(p, 2);
  points := histoire.score_points(p, p_elapsed_seconds);
  return next;
end;
$$;

-- Fonctions internes : le navigateur ne les appelle pas lui-même. Les fonctions de partie
-- (étape 2.2, `security definer`) s'en servent pour corriger et enregistrer.
revoke execute on function histoire.date_gap(integer, integer, integer, integer, integer, integer, text)
  from public, anon, authenticated;
revoke execute on function histoire.score_points(numeric, numeric) from public, anon, authenticated;
revoke execute on function histoire.score_answer(integer, integer, integer, integer, integer, integer, text, numeric)
  from public, anon, authenticated;

insert into histoire.migrations_appliquees (version, nom) values ('20261006210000', 'score');
