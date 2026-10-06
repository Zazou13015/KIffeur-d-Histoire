-- SIMULATEUR LOCAL/CI UNIQUEMENT, chargé par tests-sql.sh sur un Postgres vide.
-- Contrat existant de Contrée (20260916000000_account_profile_identity.sql).
-- Ceci n'est PAS une migration Histoire et ne doit jamais être appliqué à Supabase.
create table public.profiles (id uuid primary key references auth.users(id), username text);
create unique index profiles_username_unique_idx on public.profiles(username) where username is not null;
alter table public.profiles add constraint profiles_username_valid check (username is null or (
  length(btrim(username)) between 1 and 40 and username = btrim(username) and username !~ '[[:cntrl:]]'
)) not valid;
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.profiles from anon;
grant usage on schema public, auth to authenticated;
grant select on public.profiles to authenticated;
grant insert(id, username), update(username) on public.profiles to authenticated;
create function public.is_username_taken(p_username text) returns boolean
language sql security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where username = btrim(p_username));
$$;
revoke all on function public.is_username_taken(text) from public;
grant execute on function public.is_username_taken(text) to anon, authenticated;
-- Faux comptes nécessaires aux FK de players/profiles, dans ce seul simulateur.
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000024'), ('00000000-0000-0000-0000-000000000025');
