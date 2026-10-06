# Issue #9 — propositions à relire par Antonin

Audit du 6 octobre 2026, sur `origin/main` au commit `c0ddb93`. **Aucune proposition n'est appliquée.** Les trois nouveaux CSV sont des documents de travail ; ils ne sont pas lus par l'importeur actuel. Tous les champs `antonin_validation` restent vides. Cette PR prépare la validation humaine ; elle ne satisfait pas encore les critères « Antonin valide » et « après import » de l'issue.

## Résultat et méthode

Les 46 thèmes et les 2 000 événements ont été lus avec les liens de programme, objets curriculaires, résolutions objet → événement et tables de sources. Le décompte porte sur les **`event_id` non vides et distincts** de `kiffeurs-curriculum-links-v18.csv`, pas sur le nombre brut de lignes. Il retrouve exactement **8 chapitres sans événement**, tous avec 0 événement jouable.

**5 entrées à fusionner** (4 intitulés génériques de Terminale et 1 commentaire parasite de Seconde), **3 vrais thèmes à compléter**, **23 rattachements proposés à 22 événements existants**, tous `playable=TRUE`. Les trois thèmes conservés reçoivent 10, 8 et 5 propositions : **aucun nouvel événement n'est nécessaire pour atteindre le seuil de 5**. En revanche, **les 3 thèmes bénéficieraient d'ajouts pour leur couverture pédagogique** : 6 candidats séparés sont proposés, sans inventer d'`EVT-xxxx`. Atteindre 5 dates ne couvre pas tout un programme.

Toutes les entrées étudiées portent `school_year=2026-2027`. Le scope des six premières est `Tronc commun` ; celui des deux dernières est `HGGSP`.

| ID | Niveau | Chapitre actuel | Situation | Proposition | Événements proposés |
| --- | --- | --- | --- | --- | --- |
| THM-023 | Seconde générale et technologique | Les autres PPO du thème 4 sont surtout des processus sociaux | 0 événement ; commentaire imbriqué dans 8.6 | `FUSIONNER_AVEC:THM-022` | Aucun ajout ; cible : 10 existants, 7 jouables |
| THM-030 | Terminale générale | Thème 3 — Les remises en cause économiques, politiques et sociales des années 1970 à 1991 | 0 événement ; vrai thème | `CONSERVER_ET_COMPLETER` | EVT-0905;EVT-0266;EVT-0132;EVT-0541;EVT-0542;EVT-0364;EVT-0133;EVT-0546;EVT-0114;EVT-0115 (10, dont EVT-0905 conditionnel) |
| THM-032 | Terminale générale | Thème 1 | 0 événement ; sous-section de contexte 10.6 | `FUSIONNER_AVEC:THM-028` | Aucun ajout ; cible : 20 jouables ; niveau à corriger avant fusion |
| THM-033 | Terminale générale | Thème 2 | 0 événement ; sous-section de contexte 10.6 | `FUSIONNER_AVEC:THM-029` | Aucun ajout ; cible : 6 jouables |
| THM-034 | Terminale générale | Thème 3 | 0 événement ; sous-section de contexte 10.6 | `FUSIONNER_AVEC:THM-030` | Les 10 propositions de THM-030, à valider avec la fusion |
| THM-035 | Terminale générale | Thème 4 | 0 événement ; sous-section de contexte 10.6 | `FUSIONNER_AVEC:THM-031` | Aucun ajout ; cible : 6 jouables |
| THM-037 | Première HGGSP | Thème 2 — Analyser les dynamiques des puissances internationales | 8 lignes de jalons, toutes sans event_id | `CONSERVER_ET_COMPLETER` | EVT-0062;EVT-0618;EVT-0235;EVT-0240;EVT-0115;EVT-1028;EVT-0943;EVT-1004 (8) |
| THM-040 | Première HGGSP | Thème 5 — Analyser les relations entre États et religions | 7 lignes de jalons, toutes sans event_id | `CONSERVER_ET_COMPLETER` | EVT-0044;EVT-0366;EVT-0005;EVT-0522;EVT-0862 (5) |

Les noms complets, scopes, chemins et nombres figurent dans `kiffeurs-chapter-fixes-v18.csv`. Les événements proposés, leurs titres canoniques, dates structurées, précisions, liens pédagogiques et sources sont détaillés dans `kiffeurs-chapter-event-proposals-v18.csv`. Les listes intrachamp sont séparées par `;`, les fichiers par des virgules (UTF-8 avec BOM).

## Pourquoi proposer ces cinq fusions ?

**THM-023** : `section_path` le place en 8.6.6 sous le thème 4, déjà représenté par THM-022. Son titre est une remarque éditoriale sur les points de passage et d'ouverture (PPO), pas un intitulé scolaire autonome. Le [programme de Seconde, page 10](https://eduscol.education.gouv.fr/sites/default/files/document/spe577annexe1corr1063699pdf-83007.pdf) décrit sciences et société d'ordres au sein de ce thème. Proposition : conserver cette matière pour les cartes de THM-022, puis fusionner l'entrée technique après validation. Ni les salons ni les processus sociaux ne doivent recevoir une date arbitraire pour devenir des questions.

**THM-032 à THM-035** : les quatre `section_path` se trouvent sous « 10.6 Événements de contexte explicitement demandés par le BO, hors PPO datés ». Les vrais intitulés existent déjà en 10.2 à 10.5, THM-028 à THM-031, dans le même millésime et le même tronc commun. Le [programme de Terminale, pages 4 à 9](https://eduscol.education.gouv.fr/sites/default/files/document/spe243annexe11159172pdf-83013.pdf) confirme quatre thèmes d'histoire ; aucune cinquième à huitième entrée autonome de contexte. La fusion est une proposition éditoriale fondée sur cette concordance, pas une redirection déjà active. En conservant une trace des anciens IDs, elle est préférable ici à une suppression sans correspondance.

**Anomalie à arbitrer absolument** : THM-028 a `level=Seconde générale et technologique`, malgré son titre sur 1929–1945 et son chemin de Terminale. Sur ses 20 liens, 11 ont aussi le niveau Seconde et 9 le niveau Terminale. Avant de valider THM-032 → THM-028, Antonin doit valider la correction du chapitre et des 11 lignes identifiées par `theme_id=THM-028` et `level=Seconde générale et technologique`. Les `levels_seen` des événements peuvent légitimement contenir plusieurs niveaux : ne pas y faire de remplacement global. Rien n'a été corrigé dans ces fichiers.

## Trois vrais thèmes : propositions et limites

**THM-030** est confirmé par le programme de Terminale, page 8, et sa [ressource Éduscol](https://eduscol.education.gouv.fr/sites/default/files/document/ra21lyceegthisttheme3remises-cause-economiques-politiques-sociales-1970-1991pdf-73092.pdf). La sélection de 10 événements relie économie mondiale, démocratisation, Iran, fin du bloc soviétique et réformes françaises. Les dates d'événements complémentaires sont des choix éditoriaux ; « année 1989 » ou « Reagan et Deng » n'imposent pas chacun une unique date à mémoriser. Reagan et la recherche sur le VIH font l'objet de deux nouveaux candidats. Le second choc pétrolier et les mutations audiovisuelles demeurent à approfondir ; les dix ancrages ne prétendent pas épuiser le thème.

**THM-037** est confirmé par le [programme HGGSP, page 6](https://eduscol.education.gouv.fr/sites/default/files/document/spe576annexe1062925pdf-83244.pdf) et sa [ressource Éduscol sur les puissances](https://eduscol.education.gouv.fr/sites/default/files/document/ra19lyceegspe1hggsptheme2puissancesinter1169460pdf-83253.pdf). Huit événements donnent des ancrages pour le parcours ottoman, la Russie et le numérique. Lépante ne signifie pas la disparition de l'empire ; Sèvres et Lausanne illustrent deux étapes différentes. La dissolution de l'URSS est déjà reliée à COBJ-0044 dans COE7-0073, mais ces résolutions ne remplissent pas le fichier canonique des liens de chapitre. Deux candidats complètent langue/francophonie et voies de communication. L'objet conclusif sur la puissance américaine doit encore recevoir des cartes ou des ancrages supplémentaires : aucun événement vaguement américain n'est ajouté pour gonfler le nombre.

**THM-040** est confirmé par le programme HGGSP, page 9, et sa [ressource Éduscol sur États et religions](https://eduscol.education.gouv.fr/sites/default/files/document/ra20lyceeg1histgeogeopolitique-sciencespoanalyser-relations-etats-religions1293914pdf-83262.pdf). Charlemagne et le califat sont déjà résolus via COBJ-0068/COE7-0091 et COBJ-0070/COE7-0092 ; les sept lignes de chapitre restent néanmoins sans événement. Deux jalons explicites, deux ancrages de la partition et un exemple français pour l'introduction constituent les cinq propositions. La loi de 1905 n'est pas présentée comme un jalon obligatoire ; l'indépendance n'est pas une date de fondation du sécularisme. Les candidats sur les États-Unis après 1945 et la Constitution indienne améliorent la couverture. Les minorités en Inde et les pouvoirs califal/byzantin des IXe–Xe siècles demandent encore des cartes ou une recherche spécifique. **Validation pédagogique humaine particulièrement nécessaire pour cette sélection minimale.**

## Dates et nouveaux événements, à valider séparément

Les dates des événements existants sont copiées **sans réduire leur précision ni modifier le canonique**. L'intervalle de Deng (18–22 décembre 1978) reste `DAY_RANGE`. Promulgation, élection, investiture ou dissolution formelle sont distinguées dans `review_notes`.

- **EVT-0905** porte `CONVENTIONAL` au 17 octobre 1973. La [Federal Reserve](https://www.federalreservehistory.org/essays/oil-shock-of-1973-74) date l'embargo contre les États-Unis du 19 octobre. Le titre actuel plus large et le repère du 17 demandent un arbitrage : ne pas transformer la convention en fait exact. Cette proposition est conditionnelle ; même exclue, THM-030 conserve neuf événements existants.
- **EVT-0943** porte `CONVENTIONAL` au 4 septembre 1998. [Google confirme l'incorporation ce jour-là](https://blog.google/company-news/inside-google/company-announcements/marking-20ish-years-google/), tout en célébrant son anniversaire le 27 septembre. Valider le sens « constitution juridique de Google Inc. » ; le statut canonique n'est pas modifié.
- **EVT-0862** conserve le 14 août 1947, jour national pakistanais. La [source secondaire consultée](https://en.wikipedia.org/wiki/Independence_Day_(Pakistan)) distingue le repère commémoratif de l'acte britannique prévu au 15 août. Annoter cette distinction avant usage pédagogique au jour près.

Les 6 candidats ci-dessous sont absents comme événements équivalents de la recherche par titres dans les 2 000 entrées. `PROP-*` est un identifiant de proposition, **jamais un event_id canonique**. Ils restent à dédoublonner éditorialement avant éventuelle création. Tous ont une précision `DAY` et une date exacte pour l'acte précisément nommé ; ils ne datent pas arbitrairement tout un processus.

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

Antonin doit valider les 8 décisions et les correspondances de chaque événement, puis arbitrer en particulier :

1. Les cinq fusions et la conservation du contenu social de THM-023.
2. Le niveau de THM-028 et ses 11 liens erronés avant fusion de THM-032.
3. Le couplage THM-034 → THM-030 avec le remplissage du thème réel.
4. Les ancrages choisis en HGGSP, surtout les cinq de THM-040 ; le seuil de jeu ne remplace pas la couverture de tous les jalons.
5. Les conventions de EVT-0905, EVT-0943 et la commémoration pakistanaise de EVT-0862, ainsi que les 6 nouveaux candidats séparés.

Après validation seulement : préparer un changement canonique explicite, contrôler les dépendances aux IDs fusionnés et décider de leur conservation comme trace/redirection. L'importeur actuel ne supprime pas automatiquement les anciens chapitres : une simple disparition dans `themes` ne suffit pas à garantir le résultat après import. La stratégie de retrait en base doit être décidée dans une étape ultérieure autorisée. **Cette PR ne lance aucun import, aucune migration et aucune opération Supabase.**

## Contrôle reproductible

```bash
python3 scripts/verifier-chapitres.py
```

Sous Windows : `py -3 scripts/verifier-chapitres.py`. Le script lit uniquement les CSV locaux : couverture exacte des huit cas, décisions/cibles, IDs existants et jouables, listes cohérentes, titres/dates/précisions intacts, 5 à 10 propositions par chapitre conservé, dates des nouveaux candidats et validations humaines vides. Il ne se connecte à aucun service et ne remplace pas la relecture historique/pédagogique.

Contrôler aussi le diff contre `origin/main` : seules les propositions, ce README, la documentation de contenu et le script de vérification doivent changer. Les CSV canoniques, fichiers Supabase, migrations, `auth`, `public`, `private` et paramètres Vercel restent inchangés. Les contrôles de l'application utilisent seulement l'URL locale factice et `ci-placeholder`, comme la CI ; aucune clé secrète n'est lue ni utilisée.
