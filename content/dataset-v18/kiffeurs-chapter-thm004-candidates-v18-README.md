# Issue #9 — Çatalhöyük validé par Antonin et intégré au canonique

**PROP-CATALHOYUK est VALIDE et INTEGRE_CANONIQUE, sous l'identifiant EVT-2042.** Antonin a autorisé sa création complète avec les contraintes documentées ci-dessous. Le CSV de proposition reste une trace historique et porte `canonical_event_id=EVT-2042`. THM-004 passe de quatre à **cinq événements jouables** ; les 41 chapitres atteignent tous ce minimum. Dataset : **2 001 événements et 534 liens uniques**. Toutes les validations humaines nécessaires à l'issue #9 sont terminées (45/45). PR #38 en brouillon pour dernière revue, sans merge.

## Résultat de la recherche dans les 2 000 événements

Les 2 000 lignes ont été parcourues (titres, dates, notes, descriptions et liens), avec normalisation des accents et recherche des noms/sites et mots-clés des trois axes. Tous les événements structurés antérieurs à 1500 av. J.-C. ont aussi été examinés, ainsi que les repères préhistoriques à datation textuelle. Aucun événement existant **à la fois jouable, non déjà lié et assez central** n'a été retenu pour ce dernier rattachement.

| Piste / événement existant | Résultat |
| --- | --- |
| Çatalhöyük / variantes de graphie | Aucun événement/site équivalent dans le corpus |
| Uruk / premiers témoignages d'écriture | Pas d'événement Uruk distinct ; EVT-0341, premières écritures mésopotamiennes, est déjà lié à THM-004. Créer un second repère générique sur la même apparition risquerait un doublon |
| Migrations humaines / Homo / hominines | Pas de repère existant jouable et distinct directement utilisable pour cet axe |
| EVT-0340, agriculture/sédentarisation ; EVT-0369, Hammurabi ; EVT-0553, Sargon | Jouables, mais déjà liés après application ; Sargon reste complémentaire et CONVENTIONAL |
| EVT-0338, outils ; EVT-0339, début de la préhistoire ; EVT-0342, premiers États | Déjà liés mais non jouables ; statuts conservés |
| EVT-0368, pyramide de Gizeh | Déjà lié et non jouable ; aucune activation forcée |
| EVT-0549, unification égyptienne ; EVT-0569, civilisation de l'Indus | Non jouables ; aucune activation forcée |
| EVT-0570, Santorin | Non jouable, datation discutée et moins directement relié aux trois axes |
| Dates modernes de découvertes / événements antiques plus tardifs | Écartées comme substituts aux repères de la période étudiée |

## Candidat validé et intégré : PROP-CATALHOYUK → EVT-2042

| Champ | Métadonnée validée |
| --- | --- |
| Titre canonique | Occupation du village agricole de Çatalhöyük (tertre oriental) |
| Date défendable | **Environ 7100 à 5950 av. J.-C.**, années calendaires calibrées |
| Bornes structurées canoniques | start_year = -7100 ; end_year = -5950 ; aucun mois/jour |
| Type / précision | PERIOD / YEAR_RANGE |
| date_status | APPROXIMATE |
| playable_mode | RANGE, validé par Antonin |
| Axe officiel | Révolution néolithique |
| Relation pédagogique | ANCRAGE_COMPLEMENTAIRE, pas repère obligatoire du BO |

La [ressource officielle Éduscol de 6e, pages 3–4](https://eduscol.education.gouv.fr/sites/default/files/document/ra16c3his6eth1lalonguehistoiredelhumaniteetdesmigrations-dm619971pdf-77124.pdf) aborde agriculture/élevage, habitat et transformations sociales. Notre proposition est un choix éditorial d'exemple archéologique pour cet axe : le programme ne prescrit pas une date unique de Çatalhöyük. Ce site nommé est distinct du processus général déjà porté par EVT-0340 et apporte une entrée concrète plus centrale pour le néolithique que l'expansion de Sargon.

L'étude primaire de **Larsen et al., PNAS, 2019**, [texte et données contextuelles](https://pmc.ncbi.nlm.nih.gov/articles/PMC6601267/) ([DOI](https://doi.org/10.1073/pnas.1904345116)), situe l'occupation étudiée vers **7100–5950 cal BCE**. Ce référentiel détermine la plage canonique validée. La [notice UNESCO](https://whc.unesco.org/en/list/1405/) décrit le tertre oriental comme un établissement agricole sédentaire et affiche **7400–6200 av. J.-C.** pour ses niveaux néolithiques. Cette variante reste documentée dans le CSV : les chronologies publiées ne doivent pas être masquées ni assemblées en une plage hybride 7400–5950.

Les bornes sont des estimations archéologiques calibrées, pas une fondation ou un abandon connus à l'année exacte. Le titre désigne une occupation sur la durée. Il ne date pas l'invention mondiale de l'agriculture, ne dit pas « première ville du monde » et ne doit pas devenir une question exacte au jour. Exemple de formulation pédagogique : « Sur quelle période le village agricole du tertre oriental de Çatalhöyük a-t-il été occupé ? », avec une réponse en plage approximative. L'import conserve les deux bornes et RANGE dans les réponses privées. Le mécanisme existant de correction des titres/alias ne constitue pas un nouveau moteur de correction de dates ; aucune fonctionnalité de jeu n'est ajoutée ici.

Un second candidat n'est pas nécessaire pour ce choix : Çatalhöyük répond directement à la piste néolithique demandée. Aucun doublon d'Uruk ni repère moins solide n'est ajouté pour multiplier les options.

## Création complète et conventions appliquées

L'identifiant suit les références réelles du corpus : les événements actifs et les CSV historiques/réservés vont jusqu'à EVT-2041, avec des trous issus de fusions. Aucun allocateur spécifique n'existe dans le dépôt ; **EVT-2042** est donc le suivant, sans réutilisation. Le titre validé est conservé.

- `playable=TRUE`, `playable_mode=RANGE`, `importance=3`, `difficulty=4`. Les repères complémentaires de 6e comparables, notamment Hammurabi (EVT-0369), utilisent importance 3/difficulté 4 ; une période néolithique spécialisée justifie ce classement.
- `source_status=SUPPORTED_B`, `source_confidence=B` : la datation retenue provient d'une étude académique, classée ACADEMIC/B selon la convention des sources du corpus. Éduscol et UNESCO sont PRIMARY_OR_OFFICIAL/CURRICULUM_OFFICIAL, niveau A ; leurs rôles pédagogiques/contextuels ne transforment pas la plage PNAS en certification de niveau A.
- SRC-0941 : ressource officielle Éduscol, rôle CURRICULUM ; SRC-0942 : DOI PNAS, rôle HISTORICAL, miroir PMC dans les notes sans double comptage de la même étude ; SRC-0943 : UNESCO, rôle CONTEXT pour la chronologie alternative. Trois mappings ESRC-2632 à ESRC-2634, compteurs 1/1/1 et 3 sources liées.
- Trois alias : « Occupation néolithique de Çatalhöyük Est », « Village agricole de Çatal Höyük (tertre oriental) », « Çatalhöyük Est ». Description courte sans date, consacrée à l'agriculture, l'élevage, l'habitat et l'organisation sociale d'un établissement néolithique sédentaire d'Anatolie.
- LNK14-0705 relie THM-004 à EVT-2042 : axe Révolution néolithique, ANCRAGE_COMPLEMENTAIRE transcrit en COMPLEMENT_SCHOOL_CORPUS. `official_wording` vide : pas de citation officielle inventée ni de repère obligatoire. Les notes intégrales de date et la justification pédagogique accompagnent le lien.
- 14 tags : curriculum/niveau/thème, période/plage/statut/pédagogie, deux siècles de bornes, agriculture/histoire sociale et trois tags géographiques HIGH. TAG-0287/TAG-0288 représentent les LXXIe/LXe siècles avant J.-C., selon la convention de tags des deux extrémités d'une YEAR_RANGE. Le tag historique combiné `geography-turkey-ottoman` désigne ici uniquement la localisation actuelle en Anatolie/Turquie ; aucune appartenance à l'époque ottomane.

Les notes de l'événement et du lien préservent explicitement : **bornes archéologiques approximatives, jamais fondation/abandon exacts, variante UNESCO 7400–6200, pas de plage hybride, pas de réduction à -7100, pas de jour/mois fictif**. La description ne révèle pas la réponse. L'événement est une occupation prolongée, jamais une première ville du monde ni l'invention de l'agriculture.

## Dérivés et collections

`events`, `sources`, `event-sources`, `curriculum-links`, `tags`, `event-tags`, `gameplay`, `semantic-tag-assignments`, `semantic-tag-summary`, `semantic-coverage`, `collections`, `collection-events`, `collection-summary`, `ready-collections`, `ready-collection-events`, `school-enrichment`, `school-quality-audit` et `quality` sont actualisés. Les fichiers d'extraction historique ne sont pas inventés ni réécrits. Les cinq affectations sémantiques HIGH et leurs compteurs correspondent aux event-tags ; les alias et modes correspondent au canonique.

Appartenances structurelles : COL-0001 scolaire (508), COL-0005 6e (51), COL-0016 THM-004 (9 membres de collection, dont 5 jouables) et COL-0086 maître (2 001). Les collections peuvent inclure des résolutions d'objets curriculaires supplémentaires : THM-004 possède cinq jouables dans les **liens canoniques de chapitre**, pas seulement dans une collection. Le titre maître est actualisé ; son slug historique est conservé pour stabilité.

Le pack Expert COL-0077 garde exactement 50 événements, avec la formule existante `difficulty*100 + importance*15 + curriculum_level_count*3 + source_bonus`. Score de Çatalhöyük : **451** (400 + 45 + 3 + 3). À égalité, l'ordre chronologique observé place -7100 en position 27 ; EVT-0437 quitte ce seul pack. Cet événement reste dans le canonique et ses autres appartenances. Positions, ready-pack et collection sont synchronisés ; la version de sélection porte V18.1 / issue #9. Les 23 autres packs restent inchangés.

## Preuve finale et reproduction

```bash
python3 scripts/verifier-chapitres.py --exiger-validation --exiger-cinq-partout
python3 scripts/verifier-alias.py
python3 scripts/verifier-import-chapitres-local.py --exiger-cinq-partout
```

Sous Windows : `py -3`. Le contrôle CSV strict est requis en CI : 41 chapitres titrés/non vides, tous ≥5 jouables, 534 liens sans doublon ni orphelin, cinq anciens IDs absents des fichiers actifs, THM-028 Terminale et 11 corrections, 30 rattachements validés conservés, nouveau lien complet. Une empreinte figée au commit d316374 protège les dates/statuts/jouabilités des 2 000 événements antérieurs. Les réserves, sources, tags, collections et validation de Çatalhöyük sont contrôlés.

Reset Supabase **LOCAL uniquement**, trois migrations existantes et seed, import complet : 2 001 événements/réponses, 41 chapitres et 534 liens. Les deux bornes, RANGE/APPROXIMATE, description, notes, trois alias, 283 tags, 21 907 associations uniques et 24 packs sont comparés au canonique. Second import : **0 création et 0 retrait**, données identiques dans les 13 tables `histoire`, hors timestamps. Tests existants anon/authenticated réussis : dates, alias et descriptions invisibles.

Contrôles dataset, alias, lint, typecheck, build et `git diff --check` passent avant push. Les 2 000 anciennes lignes complètes d'events/gameplay/couverture sont intactes, ainsi que les quatre traces antérieures. Le recalcul indépendant du pack Expert concorde ; les 23 autres packs sont inchangés. Les trois alias natifs n'ont aucune collision exacte/floue (similarité maximale 0,298, seuil 0,6). Onze contrôles négatifs sur copies temporaires refusent les mutations de statut antérieur, plage hybride, réponse réduite à l'année, faux jour, réserve perdue, validation/trace erronée, source manquante, lien dupliqué, appartenance absente et résumé sémantique périmé. Avertissement préexistant de fallback Big Shoulders au build.

Aucun Supabase distant/KFFR/prod, aucune migration nouvelle/distante ni variable Vercel modifiée. Les six candidats initiaux pour THM-030/037/040 restent validés et différés, sans création d'EVT. **L'issue #9 atteint son objectif de contenu ; la PR reste en brouillon, sans merge, en attente de la dernière revue d'Antonin.**
