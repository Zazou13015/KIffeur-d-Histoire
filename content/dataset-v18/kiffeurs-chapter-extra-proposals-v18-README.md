# Issue #9 — sept compléments validés et appliqués localement

**État final actualisé : Çatalhöyük est ensuite validé et intégré comme EVT-2042. THM-004 atteint cinq jouables, 41/41 chapitres atteignent le minimum et le dataset compte 2 001 événements / 534 liens.** [Dossier final](kiffeurs-chapter-thm004-candidates-v18-README.md). Le bilan ci-dessous documente l'étape historique des sept rattachements (avant cette création), dont les 44 validations et les paires appliquées restent conservées.

**Antonin a validé les sept rattachements supplémentaires dans son message de suivi après relecture avec ChatGPT.** Ils sont maintenant appliqués aux CSV canoniques. `antonin_validation` contient six `VALIDE` et un `VALIDE_SOUS_CONDITION` pour Sargon. Les trois traces initiales et leurs 37 validations restent intactes ; les quatre fichiers consignent désormais 44 validations.

| Chapitre | Jouables avant cette étape | Rattachements appliqués | Jouables après cette étape |
| --- | --- | --- | --- |
| THM-002 | 2 | EVT-0453 ; EVT-0192 ; EVT-0476 | 5 |
| THM-004 | 3 | EVT-0553, ANCRAGE_COMPLEMENTAIRE uniquement | 4 |
| THM-039 | 3 | EVT-0083 ; EVT-0084 | 5 |
| THM-044 | 4 | EVT-0200 | 5 |

À cette étape historique, THM-004 restait à quatre, conformément à la demande d'Antonin. Le dernier événement a ensuite été validé séparément et intégré dans le dossier final lié ci-dessus.

Les identifiants, titres, dates structurées, précisions, statuts et modes de jeu sont copiés du canonique. Avant application, aucun de ces liens n'existait dans le fichier canonique des chapitres ; chaque événement existe et porte `playable=TRUE`. Les sources historiques initiales sont distinguées des sources consultées. Une consultation supplémentaire ne modifie pas automatiquement `source_status`.

## Rattachements validés

- **CM2 : EVT-0453, première révolte des canuts (21–24 novembre 1831)**. Exemple du travail à l'atelier et du conflit salarial. Les [Archives de Lyon](https://www.archives-lyon.fr/pages/1831-1834-la-revolte-des-canuts) situent le début de l'insurrection ; leur [chronologie](https://www.archives-lyon.fr/arrive-a-lyon?day=&end_year=&month=&op=Rechercher&page=170&search=&start_year=&year=) indique le retour au calme le 24. Complément éditorial à adapter au CM2, pas date obligatoire.
- **CM2 : EVT-0192, Paris haussmannien (1853–1870 environ)**. La [ressource Éduscol CM2, page 4](https://eduscol.education.gouv.fr/sites/default/files/document/ra16c3higecm2th2ageindustrielfrance619875pdf-77118.pdf) rattache explicitement ces travaux aux transformations urbaines de l'âge industriel. Le [Sénat](https://www.senat.fr/connaitre-le-senat/lhistoire-du-senat/dossiers-dhistoire/le-senat-sous-le-second-empire-et-napoleon-iii/le-baron-haussmann.html) documente les bornes de sa préfecture. Conserver `YEAR_RANGE`, `APPROXIMATE` et `RANGE`.
- **CM2 : EVT-0476, loi autorisant les syndicats professionnels (21 mars 1884)**. Proposition éditoriale pour les transformations sociales du monde du travail. Le [Journal officiel du 22 mars](https://www.legifrance.gouv.fr/jorf/jo/id/JORFCONT000000007155) répertorie la loi du 21. Ce choix de date n'est pas imposé au CM2 ; ne pas confondre liberté syndicale et droit de grève.
- **Première HGGSP : EVT-0083, J'accuse (13 janvier 1898), et EVT-0084, réhabilitation de Dreyfus (12 juillet 1906)**. La [ressource Éduscol, page 9](https://eduscol.education.gouv.fr/sites/default/files/document/ra20lyceeg1histgeogeopolitique-sciencespotheme4-sinformer-regard-critique1293847pdf-83259.pdf) propose l'analyse de corpus de presse en 1894, 1898 et 1906. La [BnF](https://catalogue.bnf.fr/ark:/12148/cb180498819) et la [Cour de cassation](https://www.courdecassation.fr/toutes-les-actualites/2026/07/12/journee-de-commemoration-nationale-de-la-reconnaissance-de) documentent les deux événements. Le jalon porte sur une étude critique des sources, pas une liste de dates isolées.
- **Terminale HGGSP : EVT-0200, proclamation de Guillaume Ier à Versailles (18 janvier 1871)**. La [ressource Éduscol de novembre 2025, page 13](https://eduscol.education.gouv.fr/sites/default/files/document/ra25lyceegthggspidentifierprotegervaloriserpatrimoine-enjeuxgeopolitiques0pdf-121241.pdf) étudie cet usage politique et symbolique de la galerie des Glaces. Le [Château de Versailles](https://www.chateauversailles.fr/decouvrir/histoire/grandes-dates/proclamation-empire-allemand) confirme la date. L'ancrage sert le jalon sur les usages de Versailles de l'Empire à nos jours.

## Réserves de Sargon et choix alors restant pour THM-004 (historique)

**EVT-0553, Sargon d'Akkad (2334 av. J.-C., `CONVENTIONAL`)** est validé seulement comme prolongement complémentaire sur le pouvoir territorial au IIIe millénaire. Il est postérieur aux premières cités-États ; ce rattachement demeure un choix éditorial, pas un repère obligatoire du [thème de 6e](https://eduscol.education.gouv.fr/sites/default/files/document/ra16c3his6eth1lalonguehistoiredelhumaniteetdesmigrations-dm619971pdf-77124.pdf). Le [Louvre](https://collections.louvre.fr/en/ark:/53355/cl010171737) utilise 2334–2279 pour le règne ; le [Met](https://www.metmuseum.org/es/essays/the-akkadian-period-ca-2350-2150-b-c) donne environ 2340–2285. La borne de 2334 ne certifie pas une fondation exactement cette année-là. Aucune correction canonique ni promotion vers `EXACT` n'est proposée ici.

Après ce lien validé, il manque encore **un** événement jouable. EVT-0338, EVT-0339, EVT-0342, EVT-0368 et EVT-0549 restent non jouables selon leurs métadonnées actuelles. Leurs datations/processus ne sont pas forcés en dates exactes et leur statut n'est pas modifié pour satisfaire le compteur. Les dates modernes de découvertes archéologiques ne sont pas ajoutées comme substituts aux repères de la période étudiée.

Antonin a demandé une dernière proposition solide pour la 6e, sans forcer la jouabilité d'un événement existant. Le candidat Çatalhöyük est soumis séparément avec une plage archéologique approximative et un mode RANGE envisagé. Les six candidats `PROP-*` initiaux pour THM-030/037/040 restent différés.

## Application et vérifications locales de cette étape (historique)

Les sept paires validées sont ajoutées à `curriculum-links` : 533 liens uniques au total (503 initiaux + 23 + 7). Quatre appartenances manquantes sont ajoutées dans `collection-events` et quatre dans `event-tags`. Les associations de J'accuse, de la réhabilitation de Dreyfus et de la proclamation de 1871 étaient déjà présentes via les objets de programme ; elles ne sont pas dupliquées. Les autres appartenances utiles de ces collections restent conservées.

Les résumés de THM-002 et THM-004 sont recalculés ; ceux de THM-039 et THM-044 sont déjà cohérents et restent inchangés. Les nombres de membres des collections peuvent dépasser les liens canoniques de chapitre, car les résolutions d'objets curriculaires contribuent aussi à ces collections. Le décompte scolaire après import est fondé sur `event_chapters`, sans gonfler le résultat avec ces appartenances préexistantes.

La note d'EVT-0553 est enrichie dans `events` pour que ses réserves soient importables : borne chronologique conventionnelle, variantes Louvre / Met, jamais une fondation exacte ni un repère obligatoire. Sa date, CONVENTIONAL, son titre et ses autres métadonnées restent inchangés. Le lien conserve ANCRAGE_COMPLEMENTAIRE, transcrit en COMPLEMENT_SCHOOL_CORPUS. Aucun `official_wording` littéral du BO n'est inventé.

Reset Supabase strictement local avec les trois migrations existantes, import complet puis second import : 41 chapitres titrés/non vides, 533 liens, 2 000 événements. Le second import crée zéro ligne et retire zéro ligne ; empreintes des données identiques dans les 13 tables histoire, hors timestamps. Dates, statuts, note de Sargon et statuts pédagogiques sont comparés au canonique. Les tests existants anon/authenticated passent.

`py -3 scripts/verifier-chapitres.py --exiger-validation` contrôle les 44 validations et les sept liens supplémentaires. `py -3 scripts/verifier-import-chapitres-local.py` vérifie l'import et la sécurité. Les variantes `--exiger-cinq-partout` échouent uniquement sur THM-004 (4), conformément à l'état demandé avant le choix final. Ces résultats historiques sont remplacés par le contrôle final strict vert avec EVT-2042, documenté dans le dossier final.

Lint, typecheck, build et diff contrôlés avant push ; avertissement existant de fallback Big Shoulders au build. PR #38 en brouillon, sans merge. Aucun Supabase distant/KFFR/prod, aucune nouvelle migration, aucun changement de variables Vercel.
