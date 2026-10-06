-- Rétention et budget des parties anonymes (#13). Aucun planificateur distant.
alter table histoire.games add column expires_at timestamptz;
update histoire.games set expires_at = created_at + interval '24 hours' where user_id is null;
alter table histoire.games add constraint games_anonymous_expiry
  check ((user_id is null) = (expires_at is not null));
alter table histoire.games add constraint games_anonymous_lifetime
  check (expires_at is null or expires_at = created_at + interval '24 hours');
create index games_anonymous_expiry_idx on histoire.games(expires_at) where user_id is null;

-- Budget global : un appelant qui change de jeton ne peut pas multiplier les
-- lignes indéfiniment. La ligne singleton sert aussi de verrou pour les créations.
create table histoire.solo_anonymous_limits (
  id boolean primary key default true check (id),
  max_games integer not null default 1000 check (max_games > 0),
  max_questions integer not null default 10000 check (max_questions > 0)
);
insert into histoire.solo_anonymous_limits default values;
alter table histoire.solo_anonymous_limits enable row level security;
revoke all on histoire.solo_anonymous_limits from public, anon, authenticated;

-- RPC sans paramètre ni résultat privé. Seules les lignes anonymes déjà expirées
-- sont supprimées, sans prolongation possible. La FK game_questions cascade.
-- SKIP LOCKED évite d'attendre une partie utilisée par une autre transaction.
create function histoire.purge_expired_anonymous_games()
returns void language plpgsql security definer set search_path = '' as $$
declare cutoff timestamptz := clock_timestamp();
begin
  delete from histoire.games where id in (
    select id from histoire.games
    where user_id is null and expires_at <= cutoff
    order by expires_at, id limit 1000 for update skip locked
  );
end;
$$;
revoke all on function histoire.purge_expired_anonymous_games() from public, anon, authenticated;
grant execute on function histoire.purge_expired_anonymous_games() to anon, authenticated;

-- Trigger plutôt qu'un quota au seul niveau Next.js : les appels directs à
-- start_game sont aussi protégés. Aucun secret ni identifiant de navigateur
-- choisi par l'appelant ne sert de preuve de débit.
create function histoire.guard_anonymous_game_creation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  limits histoire.solo_anonymous_limits;
  stored_games bigint;
  stored_questions bigint;
begin
  if new.user_id is not null then return new; end if;
  select * into strict limits from histoire.solo_anonymous_limits where id for update;
  perform histoire.purge_expired_anonymous_games();
  -- Compter également les expirées encore verrouillées : le budget borne les
  -- lignes physiquement présentes, pas uniquement les parties accessibles.
  select count(*), coalesce(sum(question_count), 0) into stored_games, stored_questions
    from histoire.games where user_id is null;
  if stored_games >= limits.max_games or stored_questions + new.question_count > limits.max_questions then
    raise exception using errcode = '53400', message = 'Capacité des parties anonymes atteinte';
  end if;
  new.created_at := clock_timestamp();
  new.expires_at := new.created_at + interval '24 hours';
  return new;
end;
$$;
revoke all on function histoire.guard_anonymous_game_creation() from public, anon, authenticated;
create trigger guard_anonymous_game_creation before insert on histoire.games
for each row execute function histoire.guard_anonymous_game_creation();

create or replace function histoire.lock_solo_game(p_game_id uuid, p_token text)
returns histoire.games
language plpgsql security definer set search_path = '' as $$
declare g histoire.games;
begin
  select * into g from histoire.games where id = p_game_id for update;
  if not found or not coalesce(
    (g.user_id is not null and g.user_id = auth.uid())
    or (g.user_id is null and g.expires_at > clock_timestamp()
      and g.anonymous_token_hash = sha256(convert_to(p_token, 'UTF8'))), false)
  then
    raise exception using errcode = '42501', message = 'Partie inaccessible';
  end if;
  return g;
end;
$$;
revoke all on function histoire.lock_solo_game(uuid, text) from public, anon, authenticated;

-- Décision produit : aucun champ description avant réponse (même null).
create or replace function histoire.next_question(p_game_id uuid, p_token text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g histoire.games := histoire.lock_solo_game(p_game_id, p_token);
  q histoire.game_questions;
  duration numeric;
  server_time timestamptz;
begin
  if g.state = 'finished' then return null; end if;
  select * into q from histoire.game_questions
    where game_id = g.id and answered_at is null order by position limit 1;
  if not found then return null; end if;
  if q.asked_at is null then
    select timer_seconds into strict duration from histoire.scoring_settings;
    server_time := clock_timestamp();
    update histoire.game_questions set asked_at = server_time, timer_seconds = duration,
      deadline = server_time + duration * interval '1 second'
    where id = q.id returning * into q;
  end if;
  return jsonb_build_object('question_id', q.id, 'position', q.position,
    'title', trim(regexp_replace(regexp_replace(q.title, '[0-9]+', '…', 'g'),
      '\m(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|[IVXLCDM]+e?\s+siècle)\M', '…', 'gi')),
    'image_path', case when q.image_path = q.event_id || '.svg' then q.image_path end,
    'difficulty', q.difficulty, 'asked_at', q.asked_at, 'deadline', q.deadline,
    'server_time', clock_timestamp());
end;
$$;
revoke all on function histoire.next_question(uuid, text) from public, anon, authenticated;
grant execute on function histoire.next_question(uuid, text) to anon, authenticated;

-- Nettoyage initial de l'éventuel historique anonyme, jamais des comptes.
select histoire.purge_expired_anonymous_games();
insert into histoire.migrations_appliquees(version, nom) values ('20261006220620', 'solo_anonymous_retention');
