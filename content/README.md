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
| `kiffeurs-themes-v18.csv` | Les 41 chapitres actifs du programme (CM1 à terminale), après les 5 fusions validées de l’issue #9 |
| `kiffeurs-curriculum-links-v18.csv` | Liens événement ↔ chapitre |
| `kiffeurs-ready-collections-v18.csv`, `kiffeurs-ready-collection-events-v18.csv` | Les 24 packs prêts à jouer et leurs événements |
| `kiffeurs-tags-v18.csv`, `kiffeurs-event-tags-v18.csv` | Tags (thème, géographie, siècle, série) et leur attribution |
| `kiffeurs-sources-v18.csv`, `kiffeurs-event-sources-v18.csv` | Sources et rattachement aux événements |
| `kiffeurs-gameplay-rules-v18.csv` | Définition des champs importance, difficulté, alias, `playable` |
| Autres `*-audit-*`, `*-qa-*`, `*-redirects-*` | Historique de qualité et de dédoublonnage, utile pour Antonin, pas pour l'import |

Le JSON (24 Mo) et le classeur Excel du pack d'origine ne sont pas versionnés : ils reprennent les mêmes données que les CSV.

Points connus (voir `docs/prd.md`, Questions ouvertes) : les 394 événements scolaires sans alias ont maintenant des variantes ajoutées (issue 1.3, relecture d'Antonin en attente), 304 sans description, aucune illustration, 1 000 ajouts encore à relire.

## Nettoyage des chapitres (issue #9)

Antonin a validé les 8 décisions, les 23 rattachements et les 6 nouveaux candidats le 6 octobre 2026. Les trois fichiers `kiffeurs-chapter-fixes-v18.csv`, `kiffeurs-chapter-event-proposals-v18.csv` et `kiffeurs-chapter-new-events-v18.csv` restent intacts comme trace de validation ; ils ne sont pas lus directement par l'importeur. Lire le [dossier d'application et de validation](dataset-v18/kiffeurs-chapter-fixes-v18-README.md).

Les cinq fusions et les 23 + 7 rattachements validés sont appliqués aux CSV canoniques locaux : 41 chapitres titrés/non vides, 533 liens, THM-030/037/040 complétés avec 10/8/5 événements jouables. THM-028 et ses 11 liens erronés sont corrigés vers Terminale générale, sans remplacement global des niveaux des événements. EVT-0905 conserve sa date, CONVENTIONAL et la distinction du 17/19 octobre. Les six nouveaux événements restent des candidats validés pour une étape contenu dédiée, sans création d'EVT arbitraire.

Contrôle local : `python3 scripts/verifier-chapitres.py --exiger-validation`. Après reset/import Supabase strictement local : `python3 scripts/verifier-import-chapitres-local.py` (Windows : `py -3`). La CI exécute le contrôle CSV. L'import réel et les tests de sécurité passent sur la pile locale ; aucune base distante/KFFR, migration nouvelle ou variable Vercel n'est touchée. La PR #38 reste en brouillon, sans merge.

Les sept compléments sont maintenant validés et appliqués : THM-002/004/039/044 ont 5/4/5/5 jouables. Sargon reste ANCRAGE_COMPLEMENTAIRE, CONVENTIONAL et annoté avec ses variantes chronologiques. [Dossier des compléments](dataset-v18/kiffeurs-chapter-extra-proposals-v18-README.md). Les quatre CSV de validation consignent 44 décisions ; leurs notes restent traçables.

Seul THM-004 reste sous cinq. [Un candidat final pour Çatalhöyük](dataset-v18/kiffeurs-chapter-thm004-candidates-v18-README.md) est soumis dans un CSV distinct, avec validation vide et mode RANGE envisagé : aucun nouvel EVT ni modification de jouabilité. L'objectif général de l'issue #9 reste incomplet jusqu'au choix humain et à une intégration future autorisée. Le contrôle strict `--exiger-cinq-partout` échoue pour ce seul cas.
