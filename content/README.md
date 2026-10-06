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

2 001 événements après validation de Çatalhöyük (issue #9) : 508 rattachés au programme d'histoire du CM1 à la terminale, 1 493 de culture générale. Lire d'abord `kiffeurs-dataset-v18-README.md`. Les CSV sont en UTF-8 avec BOM, séparateur virgule ; les listes dans une cellule (alias, niveaux) sont séparées par `;`.

| Fichier | Contenu |
| --- | --- |
| `kiffeurs-events-v18.csv` | Les 2 001 événements : titre, dates structurées (`start_year`, `start_month`, `start_day`, années négatives avant J.-C.), précision, importance et difficulté (1 à 5), `playable` et `playable_mode`, alias, description, niveaux scolaires |
| `kiffeurs-themes-v18.csv` | Les 41 chapitres actifs du programme (CM1 à terminale), après les 5 fusions validées de l’issue #9 |
| `kiffeurs-curriculum-links-v18.csv` | Liens événement ↔ chapitre |
| `kiffeurs-ready-collections-v18.csv`, `kiffeurs-ready-collection-events-v18.csv` | Les 24 packs prêts à jouer et leurs événements |
| `kiffeurs-tags-v18.csv`, `kiffeurs-event-tags-v18.csv` | Tags (thème, géographie, siècle, série) et leur attribution |
| `kiffeurs-sources-v18.csv`, `kiffeurs-event-sources-v18.csv` | Sources et rattachement aux événements |
| `kiffeurs-gameplay-rules-v18.csv` | Définition des champs importance, difficulté, alias, `playable` |
| Autres `*-audit-*`, `*-qa-*`, `*-redirects-*` | Historique de qualité et de dédoublonnage, utile pour Antonin, pas pour l'import |

Le JSON (24 Mo) et le classeur Excel du pack d'origine ne sont pas versionnés : ils reprennent les mêmes données que les CSV.

Points connus (voir `docs/prd.md`, Questions ouvertes) : les 394 événements scolaires sans alias ont maintenant des variantes ajoutées (issue 1.3, relecture d'Antonin en attente), 304 descriptions désormais produites et validées dans les propositions, aucune illustration, 1 000 ajouts encore à relire.

## Descriptions scolaires proposées (issue #8)

Les **304 descriptions scolaires (287 jouables et 17 non jouables) sont produites et validées par Antonin le 6 octobre 2026** dans `kiffeurs-description-additions-v18.csv` : 304 `VALIDE`, zéro description restant à vérifier, zéro date révélée et zéro doublon. Aucun CSV canonique ni métadonnée de gameplay n'est modifié ; les 17 restent non jouables et aucune explication préexistante n'est écrasée. Le [CSV de revue](dataset-v18/kiffeurs-description-source-review-v18.csv) conserve les raisons, sources et notes des 120 réserves initiales (116 levées documentalement, 4 conservées comme trace historique), plus les 17 ajouts et la validation humaine. Trois suivis différés restent : date canonique de Villers-Cotterêts, qualification de l'acte EVT-0153 et coexistence des deux repères Michael dans une même partie. Lire le [dossier validé et les 50 exemples](dataset-v18/kiffeurs-description-additions-v18-README.md).

Contrôle : `python3 scripts/verifier-descriptions.py --exiger-revue-documentaire` ; tests anti-date : `python3 scripts/test-verifier-descriptions.py`. Les dates explicites sont interdites ; les nombres suspects sont signalés pour relecture sans suppression automatique. Le contrôle et les tests de fusion sont requis en CI.

L'importeur lit ce fichier facultatif, complète uniquement les descriptions vides et conserve une explication différente déjà présente en base. **Les propositions non validées sont fusionnées uniquement en local** ; à distance elles sont ignorées tant qu'Antonin n'a pas renseigné VALIDE. L'import et sa sécurité sont testés uniquement sur la pile locale. Les descriptions restent dans `histoire.event_answers`, invisibles pour anon/authenticated avant correction. Aucune base distante n'est utilisée pour cette issue ; la PR reste en brouillon, avec validation humaine faite et sans merge.

## Nettoyage des chapitres (issue #9)

**Toutes les validations humaines nécessaires à l'issue #9 sont faites par Antonin.** Les cinq traces de propositions consignent 45 décisions : huit structures, 23 + 7 rattachements existants, six candidats initiaux différés et le dernier candidat Çatalhöyük validé et intégré. Lire le [dossier d'application et de validation](dataset-v18/kiffeurs-chapter-fixes-v18-README.md).

Le canonique contient **2 001 événements, 41 chapitres titrés/non vides et 534 liens uniques ; 41/41 chapitres ont au moins cinq événements jouables**. THM-028 et ses 11 liens erronés sont corrigés vers Terminale générale ; les cinq IDs fusionnés n'ont plus de référence active. Les 30 rattachements validés restent présents. EVT-0905 conserve CONVENTIONAL et la distinction du 17/19 octobre ; Sargon conserve CONVENTIONAL et ses réserves Louvre/Met.

[Çatalhöyük, EVT-2042](dataset-v18/kiffeurs-chapter-thm004-candidates-v18-README.md), complète THM-004 à cinq jouables : PERIOD, -7100 à -5950, YEAR_RANGE, APPROXIMATE, RANGE, sans jour/mois. Les variantes chronologiques et les réserves validées restent dans les notes privées. Les sources, alias, tags, collections et tables dérivées sont complets ; le pack Expert conserve 50 membres après recalcul. Les six candidats initiaux restent validés et différés pour une étape contenu distincte.

Contrôle strict CSV : `python3 scripts/verifier-chapitres.py --exiger-validation --exiger-cinq-partout`, aussi exécuté en CI. Après reset et import Supabase **LOCAL uniquement** : `python3 scripts/verifier-import-chapitres-local.py --exiger-cinq-partout` (Windows : `py -3`). Import complet, second import idempotent et tests anon/authenticated vérifiés ; aucun Supabase distant/KFFR/prod, nouvelle migration ni variable Vercel touché. **La PR #38 a été fusionnée dans main le 6 octobre 2026 ; les dossiers de validation conservent la trace de sa préparation avant merge.** Avec les propositions de l'issue #8 importées localement, ajouter les options de comparaison décrites dans leur dossier.
