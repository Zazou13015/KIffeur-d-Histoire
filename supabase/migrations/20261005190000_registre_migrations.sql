-- Registre des migrations de Kiffeurs d'Histoire.
-- Sur la base de production (projet KFFR contrée), nos migrations ne sont PAS inscrites dans
-- supabase_migrations.schema_migrations : cette liste appartient au dépôt de KFFR, et y ajouter nos
-- versions bloquerait le prochain `supabase db push` d'Antonin (et inversement).
-- On garde donc notre propre registre ici. Procédure : README, « Mise en production de la base ».

create table histoire.migrations_appliquees (
  version text primary key,
  nom text not null,
  appliquee_le timestamptz not null default now()
);

-- Table interne : RLS active sans policy et aucun droit pour anon/authenticated.
alter table histoire.migrations_appliquees enable row level security;
revoke all on histoire.migrations_appliquees from anon, authenticated;

insert into histoire.migrations_appliquees (version, nom) values
  ('20261003140000', 'schema_histoire'),
  ('20261005190000', 'registre_migrations');
