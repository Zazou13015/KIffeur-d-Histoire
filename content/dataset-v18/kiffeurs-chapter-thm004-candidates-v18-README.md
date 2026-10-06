# Issue #9 — dernier candidat pour THM-004, en attente du choix d'Antonin

Après les sept rattachements validés, **THM-004 a quatre événements jouables**. Antonin demande de soumettre le dernier repère avant toute création canonique. Le fichier `kiffeurs-chapter-thm004-candidates-v18.csv` contient **un seul candidat**, avec `antonin_validation` vide et `integration_status=PROPOSITION_NON_APPLIQUEE`. Aucun nouvel EVT ni changement de jouabilité n'a été fait.

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

## Candidat recommandé : PROP-CATALHOYUK

| Champ | Proposition à valider |
| --- | --- |
| Titre canonique | Occupation du village agricole de Çatalhöyük (tertre oriental) |
| Date défendable | **Environ 7100 à 5950 av. J.-C.**, années calendaires calibrées |
| Bornes structurées envisagées | start_year = -7100 ; end_year = -5950 ; aucun mois/jour |
| Type / précision | PERIOD / YEAR_RANGE |
| date_status | APPROXIMATE |
| playable_mode envisagé | RANGE, seulement après validation éditoriale |
| Axe officiel | Révolution néolithique |
| Relation pédagogique | ANCRAGE_COMPLEMENTAIRE, pas repère obligatoire du BO |

La [ressource officielle Éduscol de 6e, pages 3–4](https://eduscol.education.gouv.fr/sites/default/files/document/ra16c3his6eth1lalonguehistoiredelhumaniteetdesmigrations-dm619971pdf-77124.pdf) aborde agriculture/élevage, habitat et transformations sociales. Notre proposition est un choix éditorial d'exemple archéologique pour cet axe : le programme ne prescrit pas une date unique de Çatalhöyük. Ce site nommé est distinct du processus général déjà porté par EVT-0340 et apporte une entrée concrète plus centrale pour le néolithique que l'expansion de Sargon.

L'étude primaire de **Larsen et al., PNAS, 2019**, [texte et données contextuelles](https://pmc.ncbi.nlm.nih.gov/articles/PMC6601267/) ([DOI](https://doi.org/10.1073/pnas.1904345116)), situe l'occupation étudiée vers **7100–5950 cal BCE**. Ce référentiel détermine la plage proposée. La [notice UNESCO](https://whc.unesco.org/en/list/1405/) décrit le tertre oriental comme un établissement agricole sédentaire et affiche **7400–6200 av. J.-C.** pour ses niveaux néolithiques. Cette variante reste documentée dans le CSV : les chronologies publiées ne doivent pas être masquées ni assemblées en une plage hybride 7400–5950.

Les bornes sont des estimations archéologiques calibrées, pas une fondation ou un abandon connus à l'année exacte. Le titre désigne une occupation sur la durée. Il ne date pas l'invention mondiale de l'agriculture, ne dit pas « première ville du monde » et ne doit pas devenir une question exacte au jour. Exemple de formulation envisagée : « Sur quelle période le village agricole du tertre oriental de Çatalhöyük a-t-il été occupé ? », avec une réponse en plage approximative. La validation du repère ne dispense pas de vérifier l'adaptation de son mode RANGE au jeu lors d'une future création complète.

Un second candidat n'est pas nécessaire pour ce choix : Çatalhöyük répond directement à la piste néolithique demandée. Aucun doublon d'Uruk ni repère moins solide n'est ajouté pour multiplier les options.

## Suite après le choix humain

Consigner la décision d'Antonin dans ce fichier séparé, puis seulement préparer une création canonique complète selon le workflow contenu, dédoublonner et attribuer un EVT autorisé. À cette étape, **THM-004 reste volontairement à quatre** et le contrôle strict global continue à échouer pour ce seul chapitre. Aucune exception au seuil de cinq n'est considérée comme validée. Les six candidats initiaux pour THM-030/037/040 restent différés.

La PR #38 reste en brouillon, sans merge. L'étape présente est terminée lorsque les sept rattachements et leurs dérivés sont vérifiés localement et que ce dossier est poussé pour le choix humain ; elle ne clôt pas l'objectif global de l'issue #9.
