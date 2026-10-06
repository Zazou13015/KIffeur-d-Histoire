# Contenu du jeu

Données historiques fournies par Antonin, à importer dans le schéma `histoire` de Supabase. Ce dossier n'est jamais servi au navigateur : les dates et les variantes de titres ne doivent être lisibles qu'en base, via les fonctions de correction (voir `CLAUDE.md`).

## Importer le contenu dans la base

```bash
npm run content:import -- --dossier content/dataset-v18
```

- Le script (`scripts/import-dataset.ts`) lit les CSV et écrit dans le schéma `histoire` : événements (partie publique et réponses), alias, chapitres, niveaux, liens événement ↔ chapitre, packs et tags.
- Il est **idempotent** : on peut le relancer autant de fois qu'on veut, il met à jour sans créer de doublon. Pour chaque événement et chaque pack du dataset, il retire aussi les liens qui ont disparu de la nouvelle version (alias, tags, chapitres, contenu d'un pack). Il ne supprime jamais d'événement.
- Les variantes de titres ajoutées par l'équipe (`kiffeurs-alias-additions-v18.csv`, issue 1.3) sont fusionnées avec les alias d'Antonin ; son fichier d'événements n'est pas modifié. Contrôle avant import : `python3 scripts/verifier-alias.py` (couverture, doublons, collisions avec les autres événements).
- Les événements `playable=FALSE` sont importés (utiles pour la frise pédagogique) mais marqués non jouables : le jeu ne les pose jamais en question.
- Les identifiants fusionnés par Antonin (`kiffeurs-event-redirects`) sont remplacés par l'identifiant canonique.
- À la fin, un tableau résume ce qui a été créé, mis à jour, retiré ou ignoré.

Connexion : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`, lus dans l'environnement ou dans `.env.local` (voir `.env.example`). La clé secrète donne tous les droits sur la base : jamais dans Git, jamais dans le code du site, jamais préfixée par `NEXT_PUBLIC_`.

| Base | `SUPABASE_URL` | `SUPABASE_SERVICE_ROLE_KEY` |
| --- | --- | --- |
| Locale (`npm run db:start`) | `http://127.0.0.1:54321` | « Secret key » affichée par `npx supabase start` |
| Test (Maxou) | `https://baezxgddyoweryeivivs.supabase.co` | Tableau de bord du projet de test, *Settings → API Keys → Secret keys* |
| Production (KFFR) | URL du projet KFFR | Même endroit sur le projet KFFR ; import lancé par Maxou ou Antonin, après accord des deux |

## `dataset-v18/` (reçu le 5 octobre 2026)

2 000 événements : 507 rattachés au programme d'histoire du CM1 à la terminale, 1 493 de culture générale. Lire d'abord `kiffeurs-dataset-v18-README.md`. Les CSV sont en UTF-8 avec BOM, séparateur virgule ; les listes dans une cellule (alias, niveaux) sont séparées par `;`.

| Fichier | Contenu |
| --- | --- |
| `kiffeurs-events-v18.csv` | Les 2 000 événements : titre, dates structurées (`start_year`, `start_month`, `start_day`, années négatives avant J.-C.), précision, importance et difficulté (1 à 5), `playable` et `playable_mode`, alias, description, niveaux scolaires |
| `kiffeurs-themes-v18.csv` | Les 46 chapitres du programme (CM1 à terminale) |
| `kiffeurs-curriculum-links-v18.csv` | Liens événement ↔ chapitre |
| `kiffeurs-ready-collections-v18.csv`, `kiffeurs-ready-collection-events-v18.csv` | Les 24 packs prêts à jouer et leurs événements |
| `kiffeurs-tags-v18.csv`, `kiffeurs-event-tags-v18.csv` | Tags (thème, géographie, siècle, série) et leur attribution |
| `kiffeurs-sources-v18.csv`, `kiffeurs-event-sources-v18.csv` | Sources et rattachement aux événements |
| `kiffeurs-gameplay-rules-v18.csv` | Définition des champs importance, difficulté, alias, `playable` |
| Autres `*-audit-*`, `*-qa-*`, `*-redirects-*` | Historique de qualité et de dédoublonnage, utile pour Antonin, pas pour l'import |

Le JSON (24 Mo) et le classeur Excel du pack d'origine ne sont pas versionnés : ils reprennent les mêmes données que les CSV.

Points connus (voir `docs/prd.md`, Questions ouvertes) : les 394 événements scolaires sans alias ont maintenant des variantes ajoutées (issue 1.3, relecture d'Antonin en attente), 304 sans description, 8 chapitres sans événement, aucune illustration, 1 000 ajouts encore à relire.

## Propositions de nettoyage des chapitres (issue #9)

Les huit décisions sont préparées dans `dataset-v18/kiffeurs-chapter-fixes-v18.csv`, avec leurs événements détaillés dans `kiffeurs-chapter-event-proposals-v18.csv` et les nouveaux candidats dans `kiffeurs-chapter-new-events-v18.csv`. Lire le [dossier de validation](dataset-v18/kiffeurs-chapter-fixes-v18-README.md) pour les sources officielles, les limites et les arbitrages d'Antonin.

Ces fichiers ne sont pas importés et ne modifient pas le dataset canonique. Les colonnes `antonin_validation` restent vides jusqu'à la relecture humaine. Contrôle local sans base : `python3 scripts/verifier-chapitres.py` (Windows : `py -3 scripts/verifier-chapitres.py`).
