# Contenu du jeu

Données historiques fournies par Antonin, à importer dans le schéma `histoire` de Supabase. Ce dossier n'est jamais servi au navigateur : les dates et les variantes de titres ne doivent être lisibles qu'en base, via les fonctions de correction (voir `CLAUDE.md`).

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

Points connus (voir `docs/prd.md`, Questions ouvertes) : 394 événements scolaires sans alias, 304 sans description, 8 chapitres sans événement, aucune illustration, 1 000 ajouts encore à relire.
