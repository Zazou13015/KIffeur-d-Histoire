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
- Charte graphique « Cabinet de curiosités » : https://claude.ai/artifact/SGJG157QiCPsPsM3vRKTUQ. Couleurs et polices dans `src/app/globals.css` (classes `bg-encre`, `text-oxyde`, `font-date`…), motifs dans `public/motifs.svg`, écran de partie dans `src/components/partie/` (aperçu sur `/apercu`).

## Traiter une issue

1. **Vérifier que personne ne la traite déjà** : l'issue ne doit pas porter le label `en cours`, ni être assignée à quelqu'un, et aucune PR ouverte ne doit la viser (`Closes #<numéro>` ou branche `issue-<numéro>-…`). Si c'est le cas, ne pas la prendre : le dire à Maxou.
2. **Se déclarer** dès le démarrage : poser le label `en cours` sur l'issue et s'y assigner (Maxou ou Antonin, selon pour qui travaille l'agent). Le label reste jusqu'à la fusion ou la fermeture de la PR (voir « Libérer l'issue » plus bas).
3. Lire l'issue en entier, puis ses dépendances (« Dépend de ») : si l'une n'est pas fermée, le signaler avant de commencer.
4. Lire `docs/prd.md` et `docs/architecture.md` pour la partie concernée ; ne rien ajouter hors du périmètre de l'issue.
5. Une branche par issue, partie de `main` à jour : `issue-<numéro>-<slug>` (ex. `issue-12-frise-zoom`).
6. Respecter chaque critère d'acceptation ; ce qui relève de la « Partie humaine » est signalé, pas fait à la place de l'humain.
7. Ne jamais créer ni modifier quoi que ce soit dans les schémas `public` ou `auth` (ils appartiennent à KFFR contrée).
8. Avant de pousser : `npm run lint`, `npm run typecheck`, `npm run build`.
9. Ouvrir une PR avec le modèle du dépôt, qui contient `Closes #<numéro>`, et la mener jusqu'à une CI verte.

## Libérer l'issue

- PR fusionnée : l'issue se ferme toute seule (`Closes #…`) ; retirer alors le label `en cours` et cocher l'étape dans l'issue de suivi #31.
- PR fermée sans fusion, ou travail abandonné : retirer le label `en cours` et l'assignation, et dire en commentaire pourquoi.
- Une issue qui garde `en cours` sans PR ni activité depuis plusieurs jours est probablement oubliée : demander à Maxou ou Antonin avant de la reprendre.
