# Correction dédiée — EVT-0210, bataille de la Somme

Préparation depuis `main` après merge de #59, séparée de #22 et de #18.
Après `GO CORRECTION SOMME PROD`, la migration revue a été appliquée le
7 octobre 2026 via SQL brut dans sa transaction ; PR #63 fusionnée en
`c5cf9b5d19ce30986262a23aff73e1b6803c27c2`, CI main et Vercel verts.
Production vérifiée : Somme et carte en plage, 2 001 événements / 325 cartes /
41 chapitres, Histoire à 10 (version unique), historique KFFR inchangé à
35 / max 20261001172833. Empreintes des lignes non concernées, alias et
historique KFFR identiques avant/après ; textes et statuts conservés.

## Canon et convention vérifiés

Le [Ministère des Armées](https://www.defense.gouv.fr/chemins-memoire/histoire-memoires/ressources-historiques/premiere-guerre-mondiale/combattre-combats/fronts-32)
et la [source institutionnelle déjà liée à EVT-0210](https://www.cheminsdememoire.gouv.fr/fr/necropole-nationale-d-albert)
donnent les bornes du 1er juillet au 18 novembre 1916. `EVT-0482` (Verdun)
fournit la convention existante : EVENT / DAY_RANGE / EXACT / RANGE.

| Champ EVT-0210 | Avant | Après |
| --- | --- | --- |
| event_type | POINT | EVENT |
| start_year / start_month / start_day | 1916 / 11 / 18 | 1916 / 7 / 1 |
| end_year / end_month / end_day | vides | 1916 / 11 / 18 |
| precision | DAY | DAY_RANGE |
| playable_mode | DAY | RANGE |
| playable_reason | Jouable au jour. | Jouable comme plage/période. |
| date_text | 1er juillet - 18 novembre 1916 | inchangé |
| date_status | EXACT | inchangé |

`CARD-027-somme-guerre-usure` reste liée à EVT-0210 dans THM-027, à l’ordre 4.
Ses six champs de date et sa précision recopient la plage corrigée. Titre,
body, takeaway, notions, sources et libellé scolaire sont inchangés.

## Occurrences et dépendances

- `kiffeurs-events-v18.csv` : une ligne canonique corrigée ; aucune autre date modifiée.
- `kiffeurs-gameplay-v18.csv` : précision, mode et note synchronisés.
- `kiffeurs-collection-events-v18.csv` : les neuf copies de playable_mode passent à RANGE.
- `kiffeurs-ready-collection-events-v18.csv` : les quatre copies de playable_mode passent à RANGE.
- `kiffeurs-event-tags-v18.csv` : les deux classifications dérivées changent, DAY (`TAG-0064`) vers RANGE (`TAG-0067`) et POINT (`TAG-0071`) vers EVENT (`TAG-0069`). Identifiants d’affectation, méthodes et confiance conservés.
- `cartes-v1.csv` et `relecture-v1.md` : seule la plage structurée de la Somme change ; aucun texte pédagogique réécrit.
- Liens scolaires, alias, sources, descriptions, tags thématiques/géographiques, couverture sémantique et composition des collections : déjà cohérents, inchangés.
- Aucune fixture ni donnée de démo ne duplique un ancien point de la Somme ; la démo lit le CSV corrigé au build. Les anciennes valeurs présentes dans les tests sont des régressions volontairement injectées, pas des données utilisées par le produit.

Les contrôles des chapitres et des descriptions conservent leurs empreintes
historiques. Leur exception commune vérifie d’abord la nouvelle Somme, puis
reconstruit seulement ses anciens champs autorisés sur une copie pour comparer
ces empreintes. Toute autre date, tout statut, toute jouabilité et toute prose
restent contrôlés, sans remplacer les hashes ni masquer une correction partielle.

## Migration revue et appliquée

`supabase/migrations/20261007143355_corrige_somme_day_range.sql` contient une
transaction explicite et contrôle intégralement les préconditions avant les
updates : registre Histoire à 9, 2 001 événements, 41 chapitres, 325 cartes,
ancien point canonique, copie pédagogique et tags attendus. Un écart ou une
réapplication provoque un échec et un rollback.

Sur une base locale/CI entièrement vide, les migrations précèdent le seed :
la migration inscrit sa version sans inventer de données. L’import corrigé
remplit ensuite les tables. Cette exception ne s’applique jamais à une base
partiellement peuplée ni à une base peuplée sans la Somme.

Les seules modifications sont dans `histoire.events`, `histoire.event_answers`,
`histoire.chapter_cards`, les deux liens `histoire.event_tags` et le registre
`histoire.migrations_appliquees`. Aucun changement de droits/RPC, du moteur,
du scoring, des alias, des descriptions, des autres événements ou des autres cartes.
Le baseline KFFR reste **35 / 20261001172833** ; aucun SQL ne modifie
`supabase_migrations.schema_migrations`.

## Contrôles

- `npm run content:audit-plages -- --strict` : **0 anomalie** pour les règles couvertes ; algorithme inchangé.
- Tests Somme : bornes canoniques et carte, cohérence des copies et des tags ; l’ancien point réinjecté reste détecté.
- `scripts/verifier-chapitres.py --exiger-validation --exiger-cinq-partout` : empreinte historique et 41 chapitres protégés.
- `npm run content:relecture-cartes -- --check` : relecture synchronisée.
- `npm run content:test-cartes-local` après reset local : deux imports identiques, 2 001 événements / 325 cartes / 41 chapitres, dates privées et carte conformes, sécurité anon/authenticated conservée.
- Ce test rejoue aussi le corps exact de la migration dans des transactions annulées : comparaison de tous les champs de cinq tables, registre unique, refus de la réapplication, d’une réponse ou carte inattendue et d’un lot incomplet, rollback intégral.
- `npm test`, lint, typecheck, build et contrôle de la démo complètent la validation.

Le HEAD et le SHA-256 ont été revérifiés avant application. Aucun `db push`,
`apply_migration` ou `migration repair`. La migration appliquée ne doit pas être
rejouée. #22 a démarré après les contrôles et le merge de #63.
