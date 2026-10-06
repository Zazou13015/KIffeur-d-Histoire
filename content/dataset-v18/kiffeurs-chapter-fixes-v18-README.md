# Issue #9 — propositions validées par Antonin, application en attente

Audit du 6 octobre 2026, sur `origin/main` au commit `c0ddb93`. **Validation humaine faite par Antonin le 6 octobre 2026**, dans son message de suivi après relecture de la PR #38 avec ChatGPT : les 8 décisions de structure, les 23 rattachements existants et les 6 nouveaux candidats sont validés. PROP-INDE et PROP-DEVISE sont aussi explicitement souhaités. EVT-0905 est validé sous condition de conserver `CONVENTIONAL` et la note distinguant le 17 du 19 octobre 1973.

**Aucune proposition n'est appliquée.** Les trois CSV restent des documents de travail ignorés par l'importeur actuel. Le critère « Antonin valide chaque proposition » est rempli ; le résultat « après import » reste en attente. Antonin demande de laisser la PR en brouillon, sans merge, sans changement canonique ni accès Supabase ou production.

Les 37 cellules `antonin_validation` sont renseignées : `VALIDE` pour les 8 structures, 22 rattachements et 4 nouveaux candidats ; `VALIDE_SOUS_CONDITION` pour le rattachement EVT-0905 ; `VALIDE_ET_SOUHAITE` pour PROP-INDE et PROP-DEVISE. Ces valeurs consignent la décision humaine ; elles n'autorisent pas l'application canonique.

## Résultat et méthode

Les 46 thèmes et les 2 000 événements ont été lus avec les liens de programme, objets curriculaires, résolutions objet → événement et tables de sources. Le décompte porte sur les **`event_id` non vides et distincts** de `kiffeurs-curriculum-links-v18.csv`, pas sur le nombre brut de lignes. Il retrouve exactement **8 chapitres sans événement**, tous avec 0 événement jouable.

**5 entrées à fusionner** (4 intitulés génériques de Terminale et 1 commentaire parasite de Seconde), **3 vrais thèmes à compléter**, **23 rattachements validés à 22 événements existants**, tous `playable=TRUE`. Les trois thèmes conservés ont 10, 8 et 5 rattachements validés : **aucun nouvel événement n'est nécessaire pour atteindre le seuil de 5**. En revanche, **les 3 thèmes bénéficieraient d'ajouts pour leur couverture pédagogique** : les 6 candidats séparés sont validés, sans inventer d'`EVT-xxxx`. Atteindre 5 dates ne couvre pas tout un programme.

Toutes les entrées étudiées portent `school_year=2026-2027`. Le scope des six premières est `Tronc commun` ; celui des deux dernières est `HGGSP`.

| ID | Niveau | Chapitre actuel | Situation | Proposition | Événements proposés |
| --- | --- | --- | --- | --- | --- |
| THM-023 | Seconde générale et technologique | Les autres PPO du thème 4 sont surtout des processus sociaux | 0 événement ; commentaire imbriqué dans 8.6 | `FUSIONNER_AVEC:THM-022` | Aucun ajout ; cible : 10 existants, 7 jouables |
| THM-030 | Terminale générale | Thème 3 — Les remises en cause économiques, politiques et sociales des années 1970 à 1991 | 0 événement ; vrai thème | `CONSERVER_ET_COMPLETER` | EVT-0905;EVT-0266;EVT-0132;EVT-0541;EVT-0542;EVT-0364;EVT-0133;EVT-0546;EVT-0114;EVT-0115 (10, dont EVT-0905 conditionnel) |
| THM-032 | Terminale générale | Thème 1 | 0 événement ; sous-section de contexte 10.6 | `FUSIONNER_AVEC:THM-028` | Aucun ajout ; cible : 20 jouables ; niveau à corriger avant fusion |
| THM-033 | Terminale générale | Thème 2 | 0 événement ; sous-section de contexte 10.6 | `FUSIONNER_AVEC:THM-029` | Aucun ajout ; cible : 6 jouables |
| THM-034 | Terminale générale | Thème 3 | 0 événement ; sous-section de contexte 10.6 | `FUSIONNER_AVEC:THM-030` | Les 10 rattachements validés de THM-030, à appliquer avec la fusion |
| THM-035 | Terminale générale | Thème 4 | 0 événement ; sous-section de contexte 10.6 | `FUSIONNER_AVEC:THM-031` | Aucun ajout ; cible : 6 jouables |
| THM-037 | Première HGGSP | Thème 2 — Analyser les dynamiques des puissances internationales | 8 lignes de jalons, toutes sans event_id | `CONSERVER_ET_COMPLETER` | EVT-0062;EVT-0618;EVT-0235;EVT-0240;EVT-0115;EVT-1028;EVT-0943;EVT-1004 (8) |
| THM-040 | Première HGGSP | Thème 5 — Analyser les relations entre États et religions | 7 lignes de jalons, toutes sans event_id | `CONSERVER_ET_COMPLETER` | EVT-0044;EVT-0366;EVT-0005;EVT-0522;EVT-0862 (5) |

Les noms complets, scopes, chemins et nombres figurent dans `kiffeurs-chapter-fixes-v18.csv`. Les événements proposés, leurs titres canoniques, dates structurées, précisions, liens pédagogiques et sources sont détaillés dans `kiffeurs-chapter-event-proposals-v18.csv`. Les listes intrachamp sont séparées par `;`, les fichiers par des virgules (UTF-8 avec BOM).

## Pourquoi proposer ces cinq fusions ?

**THM-023** : `section_path` le place en 8.6.6 sous le thème 4, déjà représenté par THM-022. Son titre est une remarque éditoriale sur les points de passage et d'ouverture (PPO), pas un intitulé scolaire autonome. Le [programme de Seconde, page 10](https://eduscol.education.gouv.fr/sites/default/files/document/spe577annexe1corr1063699pdf-83007.pdf) décrit sciences et société d'ordres au sein de ce thème. Proposition : conserver cette matière pour les cartes de THM-022, puis fusionner l'entrée technique après validation. Ni les salons ni les processus sociaux ne doivent recevoir une date arbitraire pour devenir des questions.

**THM-032 à THM-035** : les quatre `section_path` se trouvent sous « 10.6 Événements de contexte explicitement demandés par le BO, hors PPO datés ». Les vrais intitulés existent déjà en 10.2 à 10.5, THM-028 à THM-031, dans le même millésime et le même tronc commun. Le [programme de Terminale, pages 4 à 9](https://eduscol.education.gouv.fr/sites/default/files/document/spe243annexe11159172pdf-83013.pdf) confirme quatre thèmes d'histoire ; aucune cinquième à huitième entrée autonome de contexte. La fusion est une proposition éditoriale fondée sur cette concordance, pas une redirection déjà active. En conservant une trace des anciens IDs, elle est préférable ici à une suppression sans correspondance.

**Correction obligatoire lors de l'application canonique, confirmée par Antonin** : THM-028 a `level=Seconde générale et technologique`, malgré son titre sur 1929–1945 et son chemin de Terminale. Sur ses 20 liens, 11 ont aussi le niveau Seconde et 9 le niveau Terminale. Lors de l'application de THM-032 → THM-028, corriger le chapitre et les 11 lignes identifiées par `theme_id=THM-028` et `level=Seconde générale et technologique` vers `Terminale générale`. Les `levels_seen` des événements peuvent légitimement contenir plusieurs niveaux : ne pas y faire de remplacement global. Cette obligation est consignée, mais aucune correction canonique n'est appliquée dans cette PR.

## Trois vrais thèmes : propositions et limites

**THM-030** est confirmé par le programme de Terminale, page 8, et sa [ressource Éduscol](https://eduscol.education.gouv.fr/sites/default/files/document/ra21lyceegthisttheme3remises-cause-economiques-politiques-sociales-1970-1991pdf-73092.pdf). La sélection de 10 événements relie économie mondiale, démocratisation, Iran, fin du bloc soviétique et réformes françaises. Les dates d'événements complémentaires sont des choix éditoriaux ; « année 1989 » ou « Reagan et Deng » n'imposent pas chacun une unique date à mémoriser. Reagan et la recherche sur le VIH font l'objet de deux nouveaux candidats. Le second choc pétrolier et les mutations audiovisuelles demeurent à approfondir ; les dix ancrages ne prétendent pas épuiser le thème.

**THM-037** est confirmé par le [programme HGGSP, page 6](https://eduscol.education.gouv.fr/sites/default/files/document/spe576annexe1062925pdf-83244.pdf) et sa [ressource Éduscol sur les puissances](https://eduscol.education.gouv.fr/sites/default/files/document/ra19lyceegspe1hggsptheme2puissancesinter1169460pdf-83253.pdf). Huit événements donnent des ancrages pour le parcours ottoman, la Russie et le numérique. Lépante ne signifie pas la disparition de l'empire ; Sèvres et Lausanne illustrent deux étapes différentes. La dissolution de l'URSS est déjà reliée à COBJ-0044 dans COE7-0073, mais ces résolutions ne remplissent pas le fichier canonique des liens de chapitre. Deux candidats complètent langue/francophonie et voies de communication. L'objet conclusif sur la puissance américaine doit encore recevoir des cartes ou des ancrages supplémentaires : aucun événement vaguement américain n'est ajouté pour gonfler le nombre.

**THM-040** est confirmé par le programme HGGSP, page 9, et sa [ressource Éduscol sur États et religions](https://eduscol.education.gouv.fr/sites/default/files/document/ra20lyceeg1histgeogeopolitique-sciencespoanalyser-relations-etats-religions1293914pdf-83262.pdf). Charlemagne et le califat sont déjà résolus via COBJ-0068/COE7-0091 et COBJ-0070/COE7-0092 ; les sept lignes de chapitre restent néanmoins sans événement. Deux jalons explicites, deux ancrages de la partition et un exemple français pour l'introduction constituent les cinq rattachements validés par Antonin. La loi de 1905 n'est pas présentée comme un jalon obligatoire ; l'indépendance n'est pas une date de fondation du sécularisme. Les candidats sur les États-Unis après 1945 et la Constitution indienne sont validés et souhaités. Les minorités en Inde et les pouvoirs califal/byzantin des IXe–Xe siècles demandent encore des cartes ou une recherche spécifique. **La sélection minimale est validée ; ses limites de couverture restent documentées.**

## Dates et nouveaux événements validés séparément

Les dates des événements existants sont copiées **sans réduire leur précision ni modifier le canonique**. L'intervalle de Deng (18–22 décembre 1978) reste `DAY_RANGE`. Promulgation, élection, investiture ou dissolution formelle sont distinguées dans `review_notes`.

- **EVT-0905** porte `CONVENTIONAL` au 17 octobre 1973. La [Federal Reserve](https://www.federalreservehistory.org/essays/oil-shock-of-1973-74) date l'embargo contre les États-Unis du 19 octobre. **Antonin valide ce rattachement sous condition de conserver `CONVENTIONAL` et la note distinguant le 17 du 19 octobre 1973** : ne pas transformer la convention en fait exact. La condition doit rester satisfaite lors de toute application future.
- **EVT-0943** porte `CONVENTIONAL` au 4 septembre 1998. [Google confirme l'incorporation ce jour-là](https://blog.google/company-news/inside-google/company-announcements/marking-20ish-years-google/), tout en célébrant son anniversaire le 27 septembre. Le rattachement est validé avec le sens « constitution juridique de Google Inc. » ; le statut canonique n'est pas modifié.
- **EVT-0862** conserve le 14 août 1947, jour national pakistanais. La [source secondaire consultée](https://en.wikipedia.org/wiki/Independence_Day_(Pakistan)) distingue le repère commémoratif de l'acte britannique prévu au 15 août. Annoter cette distinction avant usage pédagogique au jour près.

Les 6 candidats ci-dessous sont validés par Antonin. Ils sont absents comme événements équivalents de la recherche par titres dans les 2 000 entrées. `PROP-*` est un identifiant de proposition, **jamais un event_id canonique**. Ils restent à dédoublonner éditorialement lors d'une future étape de création autorisée. Tous ont une précision `DAY` et une date exacte pour l'acte précisément nommé ; ils ne datent pas arbitrairement tout un processus.

| Proposition | Thème | Titre proposé | Date | Source consultée |
| --- | --- | --- | --- | --- |
| PROP-REAGAN | THM-030 | Première investiture de Ronald Reagan | 20/01/1981 | [Bibliothèque présidentielle Reagan, discours](https://www.reaganlibrary.gov/archives/speech/inaugural-address-1981) |
| PROP-VIH | THM-030 | Publication de la première description du rétrovirus identifié ensuite comme VIH | 20/05/1983 | [Institut Pasteur](https://www.pasteur.fr/fr/en-ce-moment/espace-presse/communiques-et-dossiers-de-presse/40-ans-apres-la-decouverte-du-vih) |
| PROP-ACCT | THM-037 | Convention de Niamey créant l'ACCT | 20/03/1970 | [OIF, histoire de la Francophonie](https://www.francophonie.org/une-histoire-de-la-francophonie-23) |
| PROP-SOIE | THM-037 | Annonce de la ceinture économique de la route de la Soie à Astana | 07/09/2013 | [Ministère chinois des Affaires étrangères, discours de Xi Jinping](https://www.fmprc.gov.cn/web/ziliao_674904/zt_674979/dnzt_674981/qtzt/ydyl_675049/zyxw_675051/201309/t20130907_7951524.shtml) |
| PROP-INDE | THM-040 | Entrée en vigueur générale de la Constitution indienne et naissance de la République | 26/01/1950 | [MyGov, gouvernement indien](https://secure.mygov.in/campaigns/constitution-day/) |
| PROP-DEVISE | THM-040 | Approbation de la devise nationale américaine « In God We Trust » | 30/07/1956 | [Texte primaire, Public Law 84-851](https://www.govinfo.gov/content/pkg/STATUTE-70/pdf/STATUTE-70-Pg732.pdf) |

Les justifications et distinctions de dates se trouvent dans `kiffeurs-chapter-new-events-v18.csv` : publication du VIH ≠ premières observations ; ACCT ≠ dénomination actuelle OIF ; annonce terrestre ≠ annonce maritime ; adoption constitutionnelle en 1949 ≠ entrée en vigueur en 1950. Le sécularisme indien ne commence pas avec l'ajout du mot au préambule en 1976. Le fac-similé américain est préférable à son OCR, qui confond parfois 1956 et 1966.

## Sources et validation humaine

Les pages Éduscol [tronc commun](https://eduscol.education.gouv.fr/5799/programmes-et-ressources-en-histoire-geographie-voie-gt) et [HGGSP](https://eduscol.education.gouv.fr/5802/programmes-et-ressources-en-histoire-geographie-geopolitique-et-sciences-politiques-voie-g), consultées le 6 octobre 2026, répertorient ces textes parmi les programmes en vigueur. Aucun programme d'option internationale ou adaptation territoriale n'a servi de substitut.

Le dossier d'événements distingue `curriculum_sources` (correspondance pédagogique vérifiée dans BO/Éduscol), `dataset_source_ids` et `dataset_historical_sources` (provenance initiale, non renforcée automatiquement), et `consulted_historical_sources` (pages effectivement consultées pour vérifier ou nuancer l'événement/date). Wikipédia sert uniquement au recoupement historique secondaire. Un lien de programme proposé ne certifie pas soudainement une date de niveau A ; les `source_status` d'origine sont conservés. Les sources annuelles B de plusieurs événements de culture générale restent une limite du dataset, même lorsqu'une page plus précise a été consultée.

La validation d'Antonin est consignée dans les trois fichiers de propositions. Les consignes suivantes restent à respecter lors d'une future application autorisée :

1. Appliquer les cinq fusions validées en conservant le contenu social de THM-023.
2. Corriger obligatoirement le niveau de THM-028 et de ses 11 liens erronés lors de la fusion de THM-032.
3. Coupler THM-034 → THM-030 avec les rattachements validés du thème réel.
4. Conserver les limites pédagogiques des ancrages HGGSP validés ; le seuil de jeu ne remplace pas tous les jalons.
5. Préserver la condition d'EVT-0905, les notes d'EVT-0943 et d'EVT-0862, et distinguer les 6 nouveaux candidats validés des événements canoniques. PROP-INDE et PROP-DEVISE sont explicitement souhaités.

La validation humaine des propositions est faite, mais **l'application canonique reste expressément non autorisée à ce stade**. Dans une étape ultérieure autorisée : préparer un changement canonique explicite, contrôler les dépendances aux IDs fusionnés et décider de leur conservation comme trace/redirection. L'importeur actuel ne supprime pas automatiquement les anciens chapitres : une simple disparition dans `themes` ne suffit pas à garantir le résultat après import. La stratégie de retrait en base reste à décider séparément. **Cette PR reste en brouillon : aucun merge, import, migration ou accès Supabase/production.**

## Contrôle reproductible

```bash
python3 scripts/verifier-chapitres.py
python3 scripts/verifier-chapitres.py --exiger-validation
```

Sous Windows : `py -3 scripts/verifier-chapitres.py --exiger-validation`. Le script lit uniquement les CSV locaux : couverture exacte des huit cas, décisions/cibles, IDs existants et jouables, listes cohérentes, titres/dates/précisions intacts, 5 à 10 propositions par chapitre conservé, dates des nouveaux candidats et statuts de validation reconnus. L'option `--exiger-validation` refuse une cellule encore vide ; attendu : **37/37 validations renseignées**. Le contrôle protège aussi `CONVENTIONAL` et la note du 17/19 octobre d'EVT-0905. Il ne se connecte à aucun service et contrôle la transcription des validations, sans se substituer à Antonin.

Contrôler aussi le diff contre `origin/main` : seules les propositions, ce README, la documentation de contenu et le script de vérification doivent changer. Les CSV canoniques, fichiers Supabase, migrations, `auth`, `public`, `private` et paramètres Vercel restent inchangés. Les contrôles de l'application utilisent seulement l'URL locale factice et `ci-placeholder`, comme la CI ; aucune clé secrète n'est lue ni utilisée.
