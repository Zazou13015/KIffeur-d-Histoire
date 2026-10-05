@AGENTS.md

# Kiffeurs d'Histoire

- Langue du projet : français (interface, commentaires, commits).
- Le projet Supabase de production est **partagé avec KFFR contrée** (mêmes comptes joueurs).
  Toutes les tables de ce jeu vivent dans le schéma `histoire` ; ne jamais créer ni modifier quoi que ce soit dans `public` ou `auth`.
- Toute modification de base passe par un fichier dans `supabase/migrations/` (`npm run db:new <nom>`), jamais par le tableau de bord.
- Les réponses aux questions (dates, alias) ne doivent jamais être lisibles depuis le navigateur : la correction se fait en SQL (`security definer`).
- Périmètre produit (ce que fait la V1, ce qui vient après) : `docs/prd.md`. Le lire avant de développer une fonctionnalité ; ne rien construire hors du périmètre V1 sans accord.
- Architecture détaillée : `docs/architecture.md`.
- Charte graphique « Cabinet de curiosités » : https://claude.ai/artifact/SGJG157QiCPsPsM3vRKTUQ. Couleurs et polices dans `src/app/globals.css` (classes `bg-encre`, `text-oxyde`, `font-date`…), motifs dans `public/motifs.svg`, écran de partie dans `src/components/partie/` (aperçu sur `/apercu`).

## Traiter une issue

1. Lire l'issue en entier, puis ses dépendances (« Dépend de ») : si l'une n'est pas fermée, le signaler avant de commencer.
2. Lire `docs/prd.md` et `docs/architecture.md` pour la partie concernée ; ne rien ajouter hors du périmètre de l'issue.
3. Une branche par issue, partie de `main` à jour : `issue-<numéro>-<slug>` (ex. `issue-12-frise-zoom`).
4. Respecter chaque critère d'acceptation ; ce qui relève de la « Partie humaine » est signalé, pas fait à la place de l'humain.
5. Ne jamais créer ni modifier quoi que ce soit dans les schémas `public` ou `auth` (ils appartiennent à KFFR contrée).
6. Avant de pousser : `npm run lint`, `npm run typecheck`, `npm run build`.
7. Ouvrir une PR avec le modèle du dépôt, qui contient `Closes #<numéro>`, et la mener jusqu'à une CI verte.
