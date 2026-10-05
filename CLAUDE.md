@AGENTS.md

# Kiffeurs d'Histoire

- Langue du projet : français (interface, commentaires, commits).
- Le projet Supabase de production est **partagé avec KFFR contrée** (mêmes comptes joueurs).
  Toutes les tables de ce jeu vivent dans le schéma `histoire` ; ne jamais créer ni modifier quoi que ce soit dans `public` ou `auth`.
- Toute modification de base passe par un fichier dans `supabase/migrations/` (`npm run db:new <nom>`), jamais par le tableau de bord.
- Base de test : projet Supabase de Maxou (`baezxgddyoweryeivivs`). Toute migration y est appliquée et vérifiée avant la production.
- Production (projet KFFR) : jamais de `supabase db push` ni d'`apply_migration` (ils écrivent dans l'historique de migrations de KFFR). Chaque migration s'inscrit elle-même dans `histoire.migrations_appliquees` et s'exécute en SQL, après feu vert écrit de Maxou et Antonin. Procédure : `README.md`.
- Les réponses aux questions (dates, alias) ne doivent jamais être lisibles depuis le navigateur : la correction se fait en SQL (`security definer`).
- Périmètre produit (ce que fait la V1, ce qui vient après) : `docs/prd.md`. Le lire avant de développer une fonctionnalité ; ne rien construire hors du périmètre V1 sans accord.
- Architecture détaillée : `docs/architecture.md`.
