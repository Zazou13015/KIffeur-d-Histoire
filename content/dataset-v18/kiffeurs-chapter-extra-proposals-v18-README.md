# Issue #9 — compléments supplémentaires en attente de validation

Recherche du 6 octobre 2026, après application des huit décisions validées dans la PR #38. **Ces sept propositions ne sont pas validées par Antonin et ne sont pas appliquées au dataset canonique.** Les sept cellules `antonin_validation` restent vides dans `kiffeurs-chapter-extra-proposals-v18.csv`. Les trois fichiers de propositions initiales et leurs 37 validations sont conservés intacts.

L'objectif général de l'issue est cinq événements jouables pour chaque chapitre. Le contrôle strict trouve quatre écarts préexistants, hors des huit cas initiaux. Ce dossier rend la suite examinable : six rattachements permettraient à trois chapitres d'atteindre cinq ; un septième, plus discutable, apporterait seulement un complément à la 6e. **Même l'acceptation des sept ne satisferait pas encore l'objectif global.**

| Chapitre | Niveau / sujet | Jouables actuels | Propositions existantes | Jouables si tous ces liens étaient validés puis appliqués |
| --- | --- | --- | --- | --- |
| THM-002 | CM2 — L'âge industriel en France | 2 | EVT-0453 ; EVT-0192 ; EVT-0476 | 5 |
| THM-004 | 6e — La longue histoire de l'humanité et des migrations | 3 | EVT-0553, choix pédagogique à discuter | 4, encore insuffisant |
| THM-039 | Première HGGSP — S'informer | 3 | EVT-0083 ; EVT-0084 | 5 |
| THM-044 | Terminale HGGSP — Patrimoine | 4 | EVT-0200 | 5 |

Les identifiants, titres, dates structurées, précisions, statuts et modes de jeu sont copiés du canonique. Aucun lien proposé n'existe déjà pour le chapitre ciblé ; chaque événement existe et porte `playable=TRUE`. Les sources historiques initiales sont distinguées des sources consultées. Une consultation supplémentaire ne modifie pas automatiquement `source_status`.

## Rattachements proposés

- **CM2 : EVT-0453, première révolte des canuts (21–24 novembre 1831)**. Exemple du travail à l'atelier et du conflit salarial. Les [Archives de Lyon](https://www.archives-lyon.fr/pages/1831-1834-la-revolte-des-canuts) situent le début de l'insurrection ; leur [chronologie](https://www.archives-lyon.fr/arrive-a-lyon?day=&end_year=&month=&op=Rechercher&page=170&search=&start_year=&year=) indique le retour au calme le 24. Complément éditorial à adapter au CM2, pas date obligatoire.
- **CM2 : EVT-0192, Paris haussmannien (1853–1870 environ)**. La [ressource Éduscol CM2, page 4](https://eduscol.education.gouv.fr/sites/default/files/document/ra16c3higecm2th2ageindustrielfrance619875pdf-77118.pdf) rattache explicitement ces travaux aux transformations urbaines de l'âge industriel. Le [Sénat](https://www.senat.fr/connaitre-le-senat/lhistoire-du-senat/dossiers-dhistoire/le-senat-sous-le-second-empire-et-napoleon-iii/le-baron-haussmann.html) documente les bornes de sa préfecture. Conserver `YEAR_RANGE`, `APPROXIMATE` et `RANGE`.
- **CM2 : EVT-0476, loi autorisant les syndicats professionnels (21 mars 1884)**. Proposition éditoriale pour les transformations sociales du monde du travail. Le [Journal officiel du 22 mars](https://www.legifrance.gouv.fr/jorf/jo/id/JORFCONT000000007155) répertorie la loi du 21. Ce choix de date n'est pas imposé au CM2 ; ne pas confondre liberté syndicale et droit de grève.
- **Première HGGSP : EVT-0083, J'accuse (13 janvier 1898), et EVT-0084, réhabilitation de Dreyfus (12 juillet 1906)**. La [ressource Éduscol, page 9](https://eduscol.education.gouv.fr/sites/default/files/document/ra20lyceeg1histgeogeopolitique-sciencespotheme4-sinformer-regard-critique1293847pdf-83259.pdf) propose l'analyse de corpus de presse en 1894, 1898 et 1906. La [BnF](https://catalogue.bnf.fr/ark:/12148/cb180498819) et la [Cour de cassation](https://www.courdecassation.fr/toutes-les-actualites/2026/07/12/journee-de-commemoration-nationale-de-la-reconnaissance-de) documentent les deux événements. Le jalon porte sur une étude critique des sources, pas une liste de dates isolées.
- **Terminale HGGSP : EVT-0200, proclamation de Guillaume Ier à Versailles (18 janvier 1871)**. La [ressource Éduscol de novembre 2025, page 13](https://eduscol.education.gouv.fr/sites/default/files/document/ra25lyceegthggspidentifierprotegervaloriserpatrimoine-enjeuxgeopolitiques0pdf-121241.pdf) étudie cet usage politique et symbolique de la galerie des Glaces. Le [Château de Versailles](https://www.chateauversailles.fr/decouvrir/histoire/grandes-dates/proclamation-empire-allemand) confirme la date. L'ancrage sert le jalon sur les usages de Versailles de l'Empire à nos jours.

## Choix restant pour THM-004

**EVT-0553, Sargon d'Akkad (2334 av. J.-C., `CONVENTIONAL`)** peut être discuté comme prolongement sur le pouvoir territorial au IIIe millénaire. Il est postérieur aux premières cités-États ; ce rattachement est un choix éditorial, pas un repère obligatoire du [thème de 6e](https://eduscol.education.gouv.fr/sites/default/files/document/ra16c3his6eth1lalonguehistoiredelhumaniteetdesmigrations-dm619971pdf-77124.pdf). Le [Louvre](https://collections.louvre.fr/en/ark:/53355/cl010171737) utilise 2334–2279 pour le règne ; le [Met](https://www.metmuseum.org/es/essays/the-akkadian-period-ca-2350-2150-b-c) donne environ 2340–2285. La borne de 2334 ne certifie pas une fondation exactement cette année-là. Aucune correction canonique ni promotion vers `EXACT` n'est proposée ici.

Ce lien ne suffirait pas : il manquerait encore **un** événement jouable, ou **deux** si Sargon est écarté. EVT-0338, EVT-0339, EVT-0342, EVT-0368 et EVT-0549 restent non jouables selon leurs métadonnées actuelles. Leurs datations/processus ne sont pas forcés en dates exactes et leur statut n'est pas modifié pour satisfaire le compteur. Les dates modernes de découvertes archéologiques ne sont pas ajoutées comme substituts aux repères de la période étudiée.

Antonin doit donc arbitrer une étape contenu sourcée avec datations et modes de jeu adaptés pour la 6e, ou une exception explicite au seuil global pour ce thème. Aucune des deux décisions n'est présumée acquise. Les six candidats `PROP-*` déjà validés pour THM-030/037/040 restent différés et ne comblent pas ce manque.

## Vérification et application ultérieure

Les sept paires proposées sont distinctes, absentes des liens canoniques, et les métadonnées sont identiques aux événements existants. Le contrôle ordinaire reste vert pour l'application des décisions initiales ; `--exiger-cinq-partout` continue à échouer sur les quatre chapitres actuels. L'importeur sélectionne explicitement ses fichiers canoniques : ce CSV de proposition n'est pas importé.

Après une validation humaine explicite, consigner les réponses dans ce nouveau CSV avant toute application. La suite devra reprendre le contrôle des collections/tags/résumés et l'import Supabase strictement local, puis les tests projet. PR #38 en brouillon ; aucun merge ni accès distant/prod.
