-- #26 : indicateurs de réussite du PRD, consultables sur /admin/indicateurs.
-- Les parties anonymes sont purgées au bout de 24 h : les indicateurs s'appuient donc sur un
-- journal durable, une ligne par partie, sans titre, date ni réponse, et sans donnée personnelle
-- (identifiants seulement : compte ou visiteur anonyme tiré au hasard).
-- Rien ici n'est lisible depuis le navigateur, sauf par la fonction réservée aux administrateurs.
-- Aucune signature existante ne change : le site en ligne continue de fonctionner avant la fusion.

-- 1. Méthode de saisie de chaque réponse datée (le calendrier n'existe pas en V1 ; il reste prévu).
alter table histoire.game_questions add column input_method text
  check (input_method in ('frise', 'clavier', 'calendrier'));

-- 2. Comptes autorisés à voir les indicateurs (Maxou et Antonin), vérifiés côté serveur.
create table histoire.admins (
  user_id uuid primary key references histoire.players (id),
  note text
);
alter table histoire.admins enable row level security;
revoke all on histoire.admins from public, anon, authenticated;
-- Seuls les comptes déjà présents sont ajoutés : une base locale ou de CI n'en reçoit aucun.
insert into histoire.admins (user_id, note)
select id, note from (values
  ('8a2a4ca2-7a72-48c8-b8a2-bdc6c108d7fb'::uuid, 'Maxou'),
  ('9c2bce3a-ab9b-407a-8bf6-cef34a97bdbb'::uuid, 'Antonin'),
  ('ac038699-3d5b-4e88-bb80-fb4209db7a62'::uuid, 'Antonin (second compte)')
) as a(id, note)
where exists (select 1 from histoire.players p where p.id = a.id)
on conflict (user_id) do nothing;

-- 3. Journal durable des parties. Pas de clé étrangère vers games : la ligne survit à la purge.
create table histoire.kpi_games (
  game_id uuid primary key,
  created_at timestamptz not null,
  finished_at timestamptz,
  -- Compte au lancement ou après sauvegarde d'une partie anonyme.
  user_id uuid,
  started_anonymous boolean not null,
  -- Identifiant aléatoire du navigateur (cookie de mesure d'audience, 13 mois au plus).
  visitor_id uuid,
  mode text not null check (mode in ('libre', 'scolaire', 'pedagogique', 'inverse', 'inconnu')),
  chapter_id text,
  difficulty text not null,
  question_count integer not null,
  average_accuracy numeric,
  answers_frise integer not null default 0,
  answers_clavier integer not null default 0,
  answers_calendrier integer not null default 0
);
create index kpi_games_created_idx on histoire.kpi_games (created_at);
create index kpi_games_visitor_idx on histoire.kpi_games (visitor_id) where visitor_id is not null;
alter table histoire.kpi_games enable row level security;
revoke all on histoire.kpi_games from public, anon, authenticated;

create function histoire.kpi_mode(p_direction text, p_context jsonb)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_direction = 'inverse' then 'inverse'
    when p_context->>'origin' = 'test_chapitre' then 'pedagogique'
    when p_context->>'mode' = 'solo_scolaire' then 'scolaire'
    when p_context->>'mode' = 'solo_libre' then 'libre'
    else 'inconnu' end;
$$;
revoke all on function histoire.kpi_mode(text, jsonb) from public, anon, authenticated;

-- Tenu à jour par la base elle-même : lancement, fin de partie, sauvegarde sur un compte.
create function histoire.kpi_suivre_partie()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into histoire.kpi_games (game_id, created_at, user_id, started_anonymous, mode,
      chapter_id, difficulty, question_count)
    values (new.id, new.created_at, new.user_id, new.user_id is null,
      histoire.kpi_mode(new.direction, new.context),
      case when new.context->>'origin' = 'test_chapitre' then new.context->'chapters'->0->>'key' end,
      new.difficulty, new.question_count)
    on conflict (game_id) do nothing;
  else
    update histoire.kpi_games set
      finished_at = new.finished_at,
      average_accuracy = new.average_accuracy,
      user_id = coalesce(new.user_id, user_id)
    where game_id = new.id;
  end if;
  return null;
end;
$$;
revoke all on function histoire.kpi_suivre_partie() from public, anon, authenticated;
create trigger kpi_suivre_partie after insert or update of state, user_id on histoire.games
for each row execute function histoire.kpi_suivre_partie();

-- Parties déjà jouées : reprises telles quelles (sans visiteur, inconnu à l'époque).
insert into histoire.kpi_games (game_id, created_at, finished_at, user_id, started_anonymous, mode,
  chapter_id, difficulty, question_count, average_accuracy, answers_frise, answers_clavier)
select g.id, g.created_at, g.finished_at, g.user_id, g.user_id is null,
  histoire.kpi_mode(g.direction, g.context),
  case when g.context->>'origin' = 'test_chapitre' then g.context->'chapters'->0->>'key' end,
  g.difficulty, g.question_count, g.average_accuracy, 0, 0
from histoire.games g
on conflict (game_id) do nothing;

-- 4. Le serveur Next.js rattache la partie au visiteur anonyme du navigateur, une seule fois.
create function histoire.kpi_noter_visiteur(p_game_id uuid, p_visitor uuid, p_token text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare g histoire.games := histoire.lock_solo_game(p_game_id, p_token);
begin
  update histoire.kpi_games set visitor_id = p_visitor
    where game_id = g.id and visitor_id is null and p_visitor is not null;
end;
$$;

-- Méthode de saisie d'une réponse déjà corrigée : une seule fois par question, parties de dates.
-- Fonction à part plutôt qu'un paramètre de submit_answer, pour ne pas changer sa signature.
create function histoire.kpi_noter_saisie(p_game_id uuid, p_question_id uuid, p_method text,
  p_token text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games := histoire.lock_solo_game(p_game_id, p_token);
  updated integer;
begin
  if p_method is null or p_method not in ('frise', 'clavier', 'calendrier') then
    raise exception using errcode = '22023', message = 'Méthode de saisie invalide';
  end if;
  update histoire.game_questions set input_method = p_method
    where id = p_question_id and game_id = g.id and g.direction = 'date'
      and answered_at is not null and not coalesce(expired, false) and input_method is null;
  get diagnostics updated = row_count;
  if updated = 1 then
    update histoire.kpi_games set
      answers_frise = answers_frise + (p_method = 'frise')::integer,
      answers_clavier = answers_clavier + (p_method = 'clavier')::integer,
      answers_calendrier = answers_calendrier + (p_method = 'calendrier')::integer
    where game_id = g.id;
  end if;
end;
$$;
revoke all on function histoire.kpi_noter_visiteur(uuid, uuid, text),
  histoire.kpi_noter_saisie(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function histoire.kpi_noter_visiteur(uuid, uuid, text),
  histoire.kpi_noter_saisie(uuid, uuid, text, text) to anon, authenticated;

-- 5. Vues des six indicateurs, chacune sur 7 et 30 jours (colonne jours). security_invoker :
-- elles n'ont aucun droit propre et ne servent qu'à admin_indicateurs.
-- Joueur = compte, sinon visiteur anonyme ; une partie sans l'un ni l'autre compte pour elle seule.
create view histoire.kpi_fenetres with (security_invoker = true) as
select jours, now() - make_interval(days => jours) as depuis from (values (7), (30)) f(jours);

-- Parties terminées par session. Session = parties d'un même joueur espacées de moins de 30 min.
create view histoire.kpi_parties_par_session with (security_invoker = true) as
with parties as (
  select f.jours, k.*, coalesce(k.user_id, k.visitor_id, k.game_id) as joueur
  from histoire.kpi_fenetres f join histoire.kpi_games k on k.created_at >= f.depuis
), marquees as (
  select *, case when lag(created_at) over w is null
    or created_at - lag(created_at) over w > interval '30 minutes' then 1 else 0 end as nouvelle
  from parties window w as (partition by jours, joueur order by created_at)
)
select f.jours,
  coalesce(sum(m.nouvelle), 0)::integer as sessions,
  count(m.game_id)::integer as parties_lancees,
  count(m.finished_at)::integer as parties_terminees,
  round(count(m.finished_at)::numeric / nullif(sum(m.nouvelle), 0), 2) as parties_terminees_par_session
from histoire.kpi_fenetres f left join marquees m on m.jours = f.jours
group by f.jours;

-- Joueurs qui reviennent dans la semaine : rejouent un autre jour (heure de Paris), au plus
-- 7 jours après leur première partie de la période.
create view histoire.kpi_retour_semaine with (security_invoker = true) as
with parties as (
  select f.jours, k.created_at, coalesce(k.user_id, k.visitor_id) as joueur
  from histoire.kpi_fenetres f join histoire.kpi_games k on k.created_at >= f.depuis
  where coalesce(k.user_id, k.visitor_id) is not null
), premieres as (
  select jours, joueur, min(created_at) as premiere from parties group by jours, joueur
), retours as (
  select p.jours, p.joueur, exists (
    select 1 from parties x where x.jours = p.jours and x.joueur = p.joueur
      and x.created_at <= p.premiere + interval '7 days'
      and (x.created_at at time zone 'Europe/Paris')::date > (p.premiere at time zone 'Europe/Paris')::date
  ) as revenu
  from premieres p
)
select f.jours,
  count(r.joueur)::integer as joueurs,
  count(r.joueur) filter (where r.revenu)::integer as joueurs_revenus,
  round(100.0 * count(r.joueur) filter (where r.revenu) / nullif(count(r.joueur), 0), 1) as part_revenus
from histoire.kpi_fenetres f left join retours r on r.jours = f.jours
group by f.jours;

-- Part des parties jouées en scolaire et en pédagogique (test de chapitre).
create view histoire.kpi_repartition_modes with (security_invoker = true) as
select f.jours,
  count(k.game_id)::integer as parties,
  count(k.game_id) filter (where k.mode = 'libre')::integer as libre,
  count(k.game_id) filter (where k.mode = 'scolaire')::integer as scolaire,
  count(k.game_id) filter (where k.mode = 'pedagogique')::integer as pedagogique,
  count(k.game_id) filter (where k.mode = 'inverse')::integer as inverse,
  count(k.game_id) filter (where k.mode = 'inconnu')::integer as inconnu,
  round(100.0 * count(k.game_id) filter (where k.mode in ('scolaire', 'pedagogique'))
    / nullif(count(k.game_id), 0), 1) as part_scolaire_pedagogique
from histoire.kpi_fenetres f left join histoire.kpi_games k on k.created_at >= f.depuis
group by f.jours;

-- Joueurs sans compte qui passent à un compte : visiteurs ayant joué sans compte pendant la
-- période, puis vus connectés depuis le même navigateur (nouvelle partie ou partie sauvegardée).
create view histoire.kpi_conversion_compte with (security_invoker = true) as
with anonymes as (
  select f.jours, k.visitor_id, min(k.created_at) as premiere
  from histoire.kpi_fenetres f join histoire.kpi_games k on k.created_at >= f.depuis
  where k.started_anonymous and k.visitor_id is not null
  group by f.jours, k.visitor_id
), convertis as (
  select a.jours, a.visitor_id, exists (
    select 1 from histoire.kpi_games c where c.visitor_id = a.visitor_id and c.user_id is not null
      and (c.started_anonymous or c.created_at >= a.premiere)
  ) as converti
  from anonymes a
)
select f.jours,
  count(c.visitor_id)::integer as joueurs_sans_compte,
  count(c.visitor_id) filter (where c.converti)::integer as joueurs_convertis,
  round(100.0 * count(c.visitor_id) filter (where c.converti) / nullif(count(c.visitor_id), 0), 1) as part_convertis
from histoire.kpi_fenetres f left join convertis c on c.jours = f.jours
group by f.jours;

-- Répartition des réponses datées entre frise, clavier et calendrier.
create view histoire.kpi_methodes_saisie with (security_invoker = true) as
with totaux as (
  select f.jours,
    coalesce(sum(k.answers_frise), 0)::integer as frise,
    coalesce(sum(k.answers_clavier), 0)::integer as clavier,
    coalesce(sum(k.answers_calendrier), 0)::integer as calendrier
  from histoire.kpi_fenetres f left join histoire.kpi_games k on k.created_at >= f.depuis
  group by f.jours
)
select jours, frise, clavier, calendrier, frise + clavier + calendrier as reponses,
  round(100.0 * frise / nullif(frise + clavier + calendrier, 0), 1) as part_frise,
  round(100.0 * clavier / nullif(frise + clavier + calendrier, 0), 1) as part_clavier,
  round(100.0 * calendrier / nullif(frise + clavier + calendrier, 0), 1) as part_calendrier
from totaux;

-- Progression du score sur un même chapitre : premier et dernier test terminés d'un joueur
-- sur un chapitre, pendant la période (au moins deux tests).
create view histoire.kpi_progression_chapitre with (security_invoker = true) as
with tests as (
  select f.jours, coalesce(k.user_id, k.visitor_id) as joueur, k.chapter_id, k.average_accuracy,
    row_number() over (partition by f.jours, coalesce(k.user_id, k.visitor_id), k.chapter_id order by k.finished_at) as rang,
    count(*) over (partition by f.jours, coalesce(k.user_id, k.visitor_id), k.chapter_id) as nombre
  from histoire.kpi_fenetres f join histoire.kpi_games k on k.finished_at >= f.depuis
  where k.mode = 'pedagogique' and k.chapter_id is not null and k.average_accuracy is not null
    and coalesce(k.user_id, k.visitor_id) is not null
), paires as (
  select jours, joueur, chapter_id,
    max(average_accuracy) filter (where rang = 1) as premier,
    max(average_accuracy) filter (where rang = nombre) as dernier
  from tests where nombre >= 2 group by jours, joueur, chapter_id
)
select f.jours,
  count(p.joueur)::integer as joueurs_chapitres,
  count(p.joueur) filter (where p.dernier > p.premier)::integer as en_progres,
  round(avg(p.premier), 1) as precision_premier_test,
  round(avg(p.dernier), 1) as precision_dernier_test,
  round(avg(p.dernier - p.premier), 1) as gain_moyen
from histoire.kpi_fenetres f left join paires p on p.jours = f.jours
group by f.jours;

revoke all on histoire.kpi_fenetres, histoire.kpi_parties_par_session, histoire.kpi_retour_semaine,
  histoire.kpi_repartition_modes, histoire.kpi_conversion_compte, histoire.kpi_methodes_saisie,
  histoire.kpi_progression_chapitre from public, anon, authenticated;

-- 6. Seule porte d'accès : réservée aux comptes de histoire.admins.
create function histoire.admin_indicateurs()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from histoire.admins where user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'Accès réservé';
  end if;
  return jsonb_build_object(
    'parties_par_session', (select jsonb_agg(to_jsonb(v) order by jours) from histoire.kpi_parties_par_session v),
    'retour_semaine', (select jsonb_agg(to_jsonb(v) order by jours) from histoire.kpi_retour_semaine v),
    'repartition_modes', (select jsonb_agg(to_jsonb(v) order by jours) from histoire.kpi_repartition_modes v),
    'conversion_compte', (select jsonb_agg(to_jsonb(v) order by jours) from histoire.kpi_conversion_compte v),
    'methodes_saisie', (select jsonb_agg(to_jsonb(v) order by jours) from histoire.kpi_methodes_saisie v),
    'progression_chapitre', (select jsonb_agg(to_jsonb(v) order by jours) from histoire.kpi_progression_chapitre v),
    'calcule_le', now());
end;
$$;
revoke all on function histoire.admin_indicateurs() from public, anon, authenticated;
grant execute on function histoire.admin_indicateurs() to authenticated;

insert into histoire.migrations_appliquees (version, nom) values ('20261009100000', 'indicateurs');
