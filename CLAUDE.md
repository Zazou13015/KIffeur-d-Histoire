@AGENTS.md

# Kiffeurs d'Histoire

- Langue du projet : français (interface, commentaires, commits).
- Le projet Supabase de production est **partagé avec KFFR contrée** (mêmes comptes joueurs).
  Toutes les tables de ce jeu vivent dans le schéma `histoire` ; ne jamais créer ni modifier quoi que ce soit dans `public` ou `auth`.
- Toute modification de base passe par un fichier dans `supabase/migrations/` (`npm run db:new <nom>`), jamais par le tableau de bord.
- Les réponses aux questions (dates, alias) ne doivent jamais être lisibles depuis le navigateur : la correction se fait en SQL (`security definer`).
- Architecture détaillée : `docs/architecture.md`.
