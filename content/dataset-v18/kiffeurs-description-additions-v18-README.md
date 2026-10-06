# Issue #8 — 304 descriptions scolaires, en attente de validation d'Antonin

**304/304 descriptions : 287 jouables et 17 non jouables. 120 réserves initiales revues, 116 levées avec preuve documentaire, 4 maintenues. Zéro date suspecte et zéro erreur objective.** `antonin_validation` reste vide sur les 304 lignes : une réserve documentaire levée ne vaut pas validation humaine.

## Périmètre et niveaux

La branche part de `main` au commit **4abeddb**, après l'issue #9 : 2 001 événements, 41 chapitres et 534 liens. La cible est chaque événement scolaire dont `description_short` canonique est vide, **quel que soit playable**. Les 17 événements non jouables ont aussi besoin d'une explication pédagogique ; ils restent non jouables, avec toutes leurs métadonnées conservées.

La sélection et le niveau minimal utilisent l'union de `levels_seen` et des liens canoniques de chapitre, dans l'ordre CM1 → Terminale HGGSP. Haussmann reste ainsi adapté au CM2 grâce au lien canonique. Le CSV est trié par niveau minimal puis ID. Un événement peut être lié à plusieurs chapitres : leurs compteurs ne s'additionnent pas pour retrouver les 304. Les sept événements liés sans `levels_seen` ont déjà une description et n'ajoutent aucune cible.

## Seconde passe documentaire : traçabilité complète

Le [CSV de revue](kiffeurs-description-source-review-v18.csv) contient **137 lignes** : les 120 `OUI` initiaux et les 17 ajouts. Pour chaque cas : raison initiale conservée, décision LEVEE/MAINTENUE/AJOUTEE, URLs consultées, passage ou faits documentaires pertinents, réserve éventuelle et date de revue. La colonne `recoupement_commit_51b2652` conserve aussi les notes de la revue parallèle déjà poussée sur cette branche, y compris la formulation alternative proposée pour EVT-0153. La réserve de Villers-Cotterêts est confirmée par deux références juridiques primaires. Aucun cas A_EXAMINER ne reste. Le contrôle CI vérifie la couverture, la cohérence des sources/réserves et l'existence d'une justification.

Les institutions, archives, textes originaux, musées, bibliothèques et publications académiques ont priorité. Une notice bibliographique ou une réponse HTTP ne suffit pas à confirmer toute une explication. Les remplacements sont dans les propositions ; les associations et statuts de sources canoniques restent intacts. Le texte accessible par l'index public est identifié comme tel lorsqu'un outil refuse la récupération directe, notamment UNISPAL.

Points résolus : **EVT-0087**, texte légal erroné remplacé par la Cour de cassation et le barreau ; références BnF sur Jérusalem retirées des propositions Justinien/Verdun/Bagdad ; **Genève**, textes militaires et déclaration finale distingués, EVT-0255 corrigé pour l'entrée en vigueur avec exception au calendrier du cessez-le-feu ; **Becquerel**, compte rendu original de l'Académie lu ; naissance constitutionnelle de l'Empire allemand distinguée de sa cérémonie ; reconnaissance française de l'Algérie distinguée de sa fête nationale. Les descriptions sur les croisades et l'Irak ont été resserrées sur les faits effectivement étayés.

Restent **4 arbitrages** : les deux repères Michael (lancement ponctuel et intervalle de la même opération, tous deux de type canonique POINT), la date exacte de Villers-Cotterêts selon les références juridiques et l'identification juridique précise de la déclaration sur les officiers investisseurs dans les compagnies des Indes. Les sources documentaires sont renforcées même pour ces cas ; la réserve réelle reste visible dans le tableau final.

## Formulations et contrôle anti-date

Les 304 textes ont une ou deux phrases, au maximum 280 caractères, une langue adaptée au plus petit niveau et une source. Ils expliquent l'action et son intérêt sans année, siècle, jour/mois ou plage chronologique. Aucun texte complet n'est dupliqué. Les faits traditionnels, approximatifs ou conventionnels sont qualifiés ; les dates et statuts canoniques ne sont jamais changés silencieusement. Colomb arrive sur une terre habitée ; Valladolid ne statue pas simplement sur une âme ; la loi coloniale ne rétablit pas seule uniformément l'esclavage ; les différentes étapes des accords restent distinctes.

Le vérificateur cible les **304**, contrôle IDs/titres/niveaux, longueur, phrases, sources, cohérence des réserves et validation vide. Les dates explicites sont des erreurs ; les nombres isolés suspects requièrent une réserve sans être supprimés automatiquement. **26 contrôles négatifs**, dont omission des 17 non-jouables, sont refusés ; un nombre de participants signalé reste accepté avec avertissement. Les sous-processus Python utilisent UTF-8 explicitement pour rendre ces tests fiables sous Windows.

## Import et vérifications

Le fichier de propositions est facultatif. L'importeur complète seulement les descriptions vides, conserve toute description différente déjà présente et ne mute pas les données d'entrée. **En local**, les 304 propositions non validées sont utilisables. **À distance**, seules les lignes `antonin_validation=VALIDE` sont éligibles. Les six tests de fusion vérifient conservation, facultatif, idempotence, filtre distant et métadonnées d'un événement non jouable (PROCESS/NOT_AUTOMATIC/APPROXIMATE).

Les descriptions restent dans `histoire.event_answers`, invisibles pour anon/authenticated. Le reset/import utilise exclusivement la pile Supabase LOCAL, ses trois migrations existantes et son seed. Aucun CSV canonique, date, précision, statut, niveau, playable, mode, difficulté ou importance n'est modifié par cette seconde passe. Aucun accès à une base distante/Maxou/KFFR/prod, nouveau schéma, migration, variable Vercel ou fichier d'environnement.

Commandes :

```bash
python3 scripts/verifier-descriptions.py --exiger-revue-documentaire
python3 scripts/test-verifier-descriptions.py
python3 scripts/verifier-chapitres.py --exiger-validation --exiger-cinq-partout
python3 scripts/verifier-alias.py
node node_modules/tsx/dist/cli.mjs --test scripts/import-descriptions.test.ts
npm run lint
npm run typecheck
npm run build
git diff --check
```

Sous Windows : `py -3 -X utf8`. Après reset local, capturer les descriptions du seed avant l'import : `py -3 scripts/verifier-import-chapitres-local.py --capturer-descriptions "$env:TEMP\issue8-descriptions-avant.json"`. Le JSON privé hors Git contient uniquement event_id → description, jamais une clé. Lancer l'import direct avec l'API HTTP de boucle locale et la clé locale générée, sans charger `.env.local`, puis :

```powershell
py -3 scripts/verifier-import-chapitres-local.py --exiger-cinq-partout --avec-descriptions-proposees --descriptions-existantes "$env:TEMP\issue8-descriptions-avant.json"
```

La description canonique a priorité, puis une description déjà en base dans cette capture, puis la proposition locale. Exécution locale vérifiée : premier import, **304 descriptions complétées** ; deuxième import, **zéro complétée et 304 identiques**, zéro événement créé ou supprimé. Les empreintes des **13 tables histoire hors timestamps sont identiques** avant et après le deuxième import. Les 2 descriptions préexistantes du seed et toutes les données canoniques sont conservées. Les contrôles anon/authenticated passent : événements lisibles, dates, alias et descriptions invisibles. Chapitres strict (41 chapitres, tous avec au moins 5 événements), alias, six tests d'import, lint et typecheck passent ; build réussi avec l'avertissement préexistant de police de secours Big Shoulders. Les 26 contrôles négatifs passent. Le diff est contrôlé avant commit ; la CI est suivie sur le commit final dans la PR.

**PR #39 DRAFT vers main, sans merge. Antonin doit encore relire les propositions, les 50 exemples et les 4 réserves, puis renseigner sa validation.**

## Répartition par niveau minimal

| Niveau minimal | Descriptions |
| --- | --- |
| CM1 | 14 |
| CM2 | 22 |
| 6e | 25 |
| 5e | 30 |
| 4e | 13 |
| 3e | 40 |
| Seconde générale et technologique | 29 |
| Première générale | 50 |
| Première HGGSP | 23 |
| Terminale générale | 18 |
| Terminale HGGSP | 40 |

## Répartition par chapitre

| Chapitre | Niveau | Titre | Événements ciblés |
| --- | --- | --- | --- |
| THM-001 | CM2 | Thème 1 — Le temps de la République | 8 |
| THM-002 | CM2 | Thème 2 — L’âge industriel en France | 4 |
| THM-003 | CM2 | Thème 3 — Guerres mondiales et construction européenne | 10 |
| THM-004 | 6e | Thème 1 — La longue histoire de l’humanité et des migrations | 5 |
| THM-005 | 6e | Thème 2 — Récits fondateurs, croyances et citoyenneté dans la Méditerranée antique | 9 |
| THM-006 | 6e | Thème 3 — L’Empire romain dans le monde antique | 11 |
| THM-007 | 5e | Thème 1 — Chrétientés et islam (VIe-XIIIe siècles), des mondes en contact | 5 |
| THM-008 | 5e | Événements complémentaires directement utiles au thème 1 | 6 |
| THM-009 | 5e | Thème 2 — Société, Église et pouvoir politique dans l'Occident féodal (XIe-XVe siècles) | 5 |
| THM-010 | 5e | Autres événements directement exploitables pour le thème 2 | 8 |
| THM-011 | 5e | Thème 3 — Transformations de l'Europe et ouverture sur le monde aux XVIe et XVIIe siècles | 6 |
| THM-012 | 5e | Événements complémentaires directement utiles au thème 3 | 12 |
| THM-013 | 4e | Thème 1 — Le XVIIIe siècle. Expansions, Lumières et révolutions | 2 |
| THM-014 | 4e | Thème 2 — L'Europe et le monde au XIXe siècle | 0 |
| THM-015 | 4e | Thème 3 — Société, culture et politique dans la France du XIXe siècle | 9 |
| THM-016 | 3e | Thème 1 — L'Europe, un théâtre majeur des guerres totales (1914-1945) | 22 |
| THM-017 | 3e | Thème 2 — Le monde depuis 1945 | 16 |
| THM-018 | 3e | Thème 3 — Françaises et Français dans une République repensée | 12 |
| THM-019 | Seconde générale et technologique | Thème 1 — Le monde méditerranéen : empreintes de l’Antiquité et du Moyen Âge | 9 |
| THM-020 | Seconde générale et technologique | Thème 2 — XVe-XVIe siècles : un nouveau rapport au monde, un temps de mutation intellectuelle | 10 |
| THM-021 | Seconde générale et technologique | Thème 3 — L’État à l’époque moderne : France et Angleterre | 12 |
| THM-022 | Seconde générale et technologique | Thème 4 — Dynamiques et ruptures dans les sociétés des XVIIe et XVIIIe siècles | 9 |
| THM-024 | Première générale | Thème 1 — L’Europe face aux révolutions | 14 |
| THM-025 | Première générale | Thème 2 — La France dans l’Europe des nationalités : politique et société (1848-1871) | 16 |
| THM-026 | Première générale | Thème 3 — La Troisième République avant 1914 : un régime politique, un empire colonial | 9 |
| THM-027 | Première générale | Thème 4 — La Première Guerre mondiale : le « suicide de l’Europe » et la fin des empires européens | 7 |
| THM-028 | Terminale générale | Thème 1 — Fragilités des démocraties, totalitarismes et Seconde Guerre mondiale (1929-1945) | 9 |
| THM-029 | Terminale générale | Thème 2 — La multiplication des acteurs internationaux dans un monde bipolaire (1945-début des années 1970) | 6 |
| THM-030 | Terminale générale | Thème 3 — Les remises en cause économiques, politiques et sociales des années 1970 à 1991 | 5 |
| THM-031 | Terminale générale | Thème 4 — Le monde, l’Europe et la France depuis les années 1990, entre coopérations et conflits | 6 |
| THM-036 | Première HGGSP | Thème 1 — Comprendre un régime politique : la démocratie | 11 |
| THM-037 | Première HGGSP | Thème 2 — Analyser les dynamiques des puissances internationales | 4 |
| THM-038 | Première HGGSP | Thème 3 — Étudier les divisions politiques du monde : les frontières | 10 |
| THM-039 | Première HGGSP | Thème 4 — S’informer : un regard critique sur les sources et modes de communication | 5 |
| THM-040 | Première HGGSP | Thème 5 — Analyser les relations entre États et religions | 2 |
| THM-041 | Terminale HGGSP | Thème 1 — De nouveaux espaces de conquête | 10 |
| THM-042 | Terminale HGGSP | Thème 2 — Faire la guerre, faire la paix : formes de conflits et modes de résolution | 8 |
| THM-043 | Terminale HGGSP | Thème 3 — Histoire et mémoires | 6 |
| THM-044 | Terminale HGGSP | Thème 4 — Identifier, protéger et valoriser le patrimoine : enjeux géopolitiques | 5 |
| THM-045 | Terminale HGGSP | Thème 5 — L’environnement, entre exploitation et protection : un enjeu planétaire | 9 |
| THM-046 | Terminale HGGSP | Thème 6 — L’enjeu de la connaissance | 5 |

## Les 17 événements non jouables désormais inclus

| ID non jouable | Titre | Niveau minimal |
| --- | --- | --- |
| EVT-0009 | Début de l’industrialisation en Angleterre | CM2 |
| EVT-0022 | Homère / composition de l’Iliade et de l’Odyssée | 6e |
| EVT-0025 | Développement de Rome archaïque | 6e |
| EVT-0026 | Rédaction de la Bible hébraïque | 6e |
| EVT-0027 | Prise de Jérusalem par les Babyloniens | 6e |
| EVT-0029 | Athènes au temps de Périclès | 6e |
| EVT-0053 | Forte croissance démographique de l'Europe médiévale | 5e |
| EVT-0142 | puissance maritime et commerciale médiévale | Seconde générale et technologique |
| EVT-0145 | développement atlantique de plantation et de traite | Seconde générale et technologique |
| EVT-0168 | structures sociales et pauvreté urbaine | Seconde générale et technologique |
| EVT-0169 | sociabilité des salons | Seconde générale et technologique |
| EVT-0170 | essor portuaire français lié au commerce colonial et à la traite | Seconde générale et technologique |
| EVT-0329 | Séjour de Léonard de Vinci en France | CM1 |
| EVT-0338 | Premiers outils de pierre connus | 6e |
| EVT-0339 | Début de la préhistoire | 6e |
| EVT-0342 | Premiers États | 6e |
| EVT-0345 | Le Creusot / Schneider | Première générale |

## Échantillon représentatif de 50 descriptions

Tous les 17 ajouts figurent dans cet échantillon, avec primaire, collège, lycée, HGGSP, les cinq contextes historiques et les difficultés présentes. Les textes sont exactement ceux du CSV.

| ID / titre | Niveau minimal | Contexte / difficulté | Description proposée |
| --- | --- | --- | --- |
| EVT-0009 — Début de l’industrialisation en Angleterre | CM2 | Époque contemporaine / 2 | En Angleterre, les machines et les usines prennent une place croissante dans la production. L'usage de la vapeur et du charbon transforme le travail et les transports. |
| EVT-0022 — Homère / composition de l’Iliade et de l’Odyssée | 6e | Époque contemporaine / 3 | L'Iliade et l'OdyssÃ©e, attribuÃ©es Ã  HomÃ¨re, racontent les exploits de hÃ©ros grecs, la guerre de Troie et le voyage d'Ulysse. Issues de rÃ©cits transmis oralement, ces Ã©popÃ©es occupent une place majeure dans la culture grecque. |
| EVT-0025 — Développement de Rome archaïque | 6e | Époque contemporaine / 4 | Rome se dÃ©veloppe progressivement Ã  partir d'habitats installÃ©s sur ses collines. Les vestiges de maisons, de remparts et de temples permettent de distinguer cette histoire des rÃ©cits lÃ©gendaires de sa fondation. |
| EVT-0026 — Rédaction de la Bible hébraïque | 6e | Époque contemporaine / 3 | La Bible hÃ©braÃ¯que se forme par la rÃ©daction et la transmission de plusieurs livres. Ses rÃ©cits, ses lois et ses traditions expriment les croyances et la mÃ©moire du peuple juif. |
| EVT-0027 — Prise de Jérusalem par les Babyloniens | 6e | Antiquité / 3 | Les Babyloniens prennent JÃ©rusalem, dÃ©truisent son temple et dÃ©portent une partie des habitants. Cette conquÃªte met fin au royaume de Juda et marque durablement la mÃ©moire des JudÃ©ens. |
| EVT-0029 — Athènes au temps de Périclès | 6e | Époque contemporaine / 3 | Sous l'influence de PÃ©riclÃ¨s, AthÃ¨nes dÃ©veloppe ses monuments et sa dÃ©mocratie. Les citoyens participent aux dÃ©cisions, mais les femmes, les esclaves et les Ã©trangers sont exclus de la vie politique. |
| EVT-0053 — Forte croissance démographique de l'Europe médiévale | 5e | Époque contemporaine / 3 | La population augmente dans de nombreuses rÃ©gions de l'Europe mÃ©diÃ©vale. Les villages s'agrandissent, des terres sont mises en culture et les villes se dÃ©veloppent, avec des rythmes diffÃ©rents selon les rÃ©gions. |
| EVT-0142 — puissance maritime et commerciale médiévale | Seconde générale et technologique | Époque contemporaine / 3 | Venise construit sa puissance grÃ¢ce Ã  sa flotte, Ã  ses comptoirs et au commerce mÃ©diterranÃ©en. Ses marchands Ã©changent avec les mondes byzantin et musulman, tandis que la citÃ© protÃ¨ge et organise ses routes maritimes. |
| EVT-0145 — développement atlantique de plantation et de traite | Seconde générale et technologique | Époque contemporaine / 4 | Les plantations amÃ©ricaines produisent pour les marchÃ©s europÃ©ens en exploitant le travail forcÃ© de personnes rÃ©duites en esclavage. La traite atlantique dÃ©porte des Africains et alimente cette Ã©conomie coloniale. |
| EVT-0168 — structures sociales et pauvreté urbaine | Seconde générale et technologique | Époque contemporaine / 4 | Les villes rÃ©unissent des groupes sociaux aux ressources trÃ¨s inÃ©gales. Ã€ Paris notamment, la pauvretÃ© et la prÃ©caritÃ© de nombreux habitants contrastent avec la richesse des Ã©lites et posent la question de l'assistance. |
| EVT-0169 — sociabilité des salons | Seconde générale et technologique | Époque contemporaine / 4 | Les salons rÃ©unissent Ã©crivains, artistes, savants et membres des Ã©lites autour de la conversation. Souvent organisÃ©s par des femmes, ils favorisent les Ã©changes intellectuels tout en restant des lieux de sociabilitÃ© mondaine. |
| EVT-0170 — essor portuaire français lié au commerce colonial et à la traite | Seconde générale et technologique | Époque contemporaine / 4 | Des ports franÃ§ais comme Nantes et Bordeaux prospÃ¨rent grÃ¢ce au commerce colonial. Une partie de leur activitÃ© repose sur la traite atlantique et sur les produits des plantations oÃ¹ travaillent des personnes rÃ©duites en esclavage. |
| EVT-0329 — Séjour de Léonard de Vinci en France | CM1 | Époque moderne / 3 | InvitÃ© par FranÃ§ois Ier, LÃ©onard de Vinci s'installe au Clos LucÃ©, prÃ¨s d'Amboise. Le roi soutient son travail de peintre, d'ingÃ©nieur et d'architecte. |
| EVT-0338 — Premiers outils de pierre connus | 6e | Époque contemporaine / 3 | Des hominines fabriquent des outils en frappant des pierres pour obtenir des Ã©clats. Ces objets retrouvÃ©s par les archÃ©ologues tÃ©moignent de techniques trÃ¨s anciennes, antÃ©rieures aux plus anciens fossiles connus du genre Homo. |
| EVT-0339 — Début de la préhistoire | 6e | Époque contemporaine / 3 | La prÃ©histoire dÃ©signe la longue histoire des sociÃ©tÃ©s humaines avant leurs premiers textes Ã©crits. Les archÃ©ologues l'Ã©tudient grÃ¢ce aux outils, aux ossements et aux autres traces conservÃ©es. |
| EVT-0342 — Premiers États | 6e | Époque contemporaine / 3 | En MÃ©sopotamie et en Ã‰gypte, des pouvoirs organisÃ©s apparaissent progressivement autour de villes et de royaumes. Des dirigeants et des administrations encadrent la vie collective, tandis que l'Ã©criture aide Ã  gÃ©rer les ressources. |
| EVT-0345 — Le Creusot / Schneider | Première générale | Époque contemporaine / 4 | Au Creusot, les usines Schneider dÃ©veloppent la mÃ©tallurgie et emploient de nombreux ouvriers. Les patrons organisent aussi logements et services sociaux, une politique paternaliste qui renforce leur influence sur la ville. |
| EVT-0151 — ordonnance de Villers-Cotterêts | Seconde générale et technologique | Époque moderne / 4 | L'ordonnance de Villers-Cotterêts impose le français dans les actes de justice et renforce la tenue des registres paroissiaux. Elle contribue à l'administration du royaume, sans interdire toutes les autres langues. |
| EVT-0153 — déclaration royale liée aux compagnies des Indes orientales et occidentales | Seconde générale et technologique | Époque moderne / 4 | Une dÃ©claration royale favorise les officiers qui investissent dans les compagnies des Indes. Elle montre comment la monarchie encourage la participation financiÃ¨re Ã  ses entreprises de commerce lointain. |
| EVT-0211 — début de l’opération Michael | Première générale | Époque contemporaine / 3 | L'armée allemande lance l'opération Michael sur le front occidental. Elle tente de rompre les lignes alliées et d'obtenir une victoire décisive avant l'arrivée de renforts américains plus nombreux. |
| EVT-0212 — première grande offensive de printemps | Première générale | Époque contemporaine / 3 | Pendant l'opÃ©ration Michael, l'armÃ©e allemande gagne du terrain sur le front occidental. L'Ã©puisement des troupes et les difficultÃ©s de ravitaillement empÃªchent ces avancÃ©es de devenir une victoire dÃ©cisive. |
| EVT-0078 — Première abolition de l'esclavage par la Convention nationale | 4e | Époque contemporaine / 3 | La Convention abolit l'esclavage dans les colonies françaises. Cette décision affirme que les personnes réduites en esclavage doivent être libres, mais son application reste inégale. |
| EVT-0089 — Déclaration de guerre de l'Autriche-Hongrie à la Serbie | 3e | Époque contemporaine / 3 | L'Autriche-Hongrie déclare la guerre à la Serbie après l'assassinat de l'archiduc à Sarajevo. La crise s'élargit avec les mobilisations et les alliances, conduisant à un conflit européen puis mondial. |
| EVT-0262 — Discours de Benjamin Constant, *De la liberté des Anciens comparée à celle des Modernes* | Première HGGSP | Époque contemporaine / 3 | Benjamin Constant distingue la participation politique des citoyens antiques des libertés individuelles modernes. Son discours interroge les moyens de protéger les droits dans un gouvernement représentatif. |
| EVT-0241 — Première investiture de Franklin D. Roosevelt / début de sa présidence | Terminale générale | Époque contemporaine / 3 | Franklin Roosevelt entre en fonction alors que les États-Unis connaissent une grave crise économique. Sa présidence lance une intervention fédérale plus forte pour secourir la population et relancer l'activité. |
| EVT-0286 — Lancement de Spoutnik 1 | Terminale HGGSP | Époque contemporaine / 2 | L'Union soviétique place Spoutnik en orbite, premier satellite artificiel de la Terre. Le succès ouvre l'ère spatiale et transforme la rivalité scientifique et stratégique entre les puissances. |
| EVT-0340 — Sédentarisation / débuts de l’agriculture | 6e | Préhistoire / 2 | Dans certaines régions, des groupes humains cultivent des plantes et élèvent des animaux. Avec la vie en villages, ces changements transforment progressivement le travail et l'organisation des sociétés. |
| EVT-0063 — Débarquement de l'expédition de Colomb à Guanahaní | CM1 | Moyen Âge / 1 | Colomb et son expédition atteignent une île des Caraïbes déjà habitée. Ce voyage ouvre des contacts durables avec l'Europe, suivis de conquêtes et de violences contre les peuples autochtones. |
| EVT-0117 — Entrée en vigueur du traité CECA | 3e | Époque contemporaine / 5 | Le traité de la CECA entre en vigueur et crée des institutions communes pour le charbon et l'acier. Les pays participants commencent à partager des décisions dans ces secteurs stratégiques. |
| EVT-0001 — Centenaire de la proclamation de la République | CM2 | Époque contemporaine / 3 | La France célèbre l'anniversaire de la naissance de la République. Cette fête montre l'importance des symboles républicains pour rassembler les citoyens. |
| EVT-0003 — Loi établissant la gratuité de l’enseignement primaire public | CM2 | Époque contemporaine / 2 | L'école primaire publique devient gratuite. Les familles n'ont plus à payer les frais de scolarité, ce qui facilite l'accès des enfants à l'instruction. |
| EVT-0004 — Loi du 28 mars 1882 : instruction primaire obligatoire et laïcisation de l’enseignement public | CM2 | Époque contemporaine / 2 | La loi rend l'instruction obligatoire et remplace l'enseignement religieux par un enseignement laïque dans les écoles publiques. Elle transforme la place de l'école dans la vie des enfants. |
| EVT-0006 — Ordonnance du 21 avril 1944 accordant aux femmes le droit de vote et d’éligibilité | CM2 | Époque contemporaine / 2 | Une ordonnance donne aux Françaises le droit de voter et de se présenter aux élections. Les femmes obtiennent ainsi les mêmes droits électoraux que les hommes. |
| EVT-0015 — Rafle du Vel d’Hiv | CM2 | Époque contemporaine / 3 | La police française arrête des familles juives à Paris à la demande des autorités nazies. Beaucoup sont ensuite déportées et assassinées, ce qui montre la participation du régime de Vichy aux persécutions. |
| EVT-0018 — Déclaration Schuman | CM2 | Époque contemporaine / 2 | Robert Schuman propose de gérer ensemble le charbon et l'acier de plusieurs pays européens. Cette coopération doit rendre une nouvelle guerre plus difficile et préparer une Europe unie. |
| EVT-0065 — Édit de Nantes | CM1 | Époque moderne / 1 | Henri IV accorde aux protestants des droits limités pour pratiquer leur religion. L'édit cherche à apaiser les guerres entre catholiques et protestants, sans établir une liberté religieuse générale. |
| EVT-0173 — prise de la Bastille | CM1 | Époque moderne / 1 | Des habitants de Paris prennent la Bastille, une prison royale, et cherchent des armes. L'événement devient un symbole de la lutte contre le pouvoir du roi. |
| EVT-0174 — Nuit du 4 août / abolition des privilèges | CM1 | Époque moderne / 2 | Les députés décident de supprimer les avantages de certains groupes et des droits des seigneurs. La décision remet en cause une société où les habitants n'ont pas les mêmes droits, même si tout ne change pas aussitôt. |
| EVT-0192 — Paris haussmannien | CM2 | Époque contemporaine / 3 | Des rues plus larges, des réseaux d'eau et des parcs transforment Paris sous la direction d'Haussmann. Ces travaux améliorent des équipements, mais obligent aussi des habitants à quitter leur quartier. |
| EVT-0333 — Code noir | CM1 | Époque moderne / 3 | Le Code noir fixe des règles qui organisent l'esclavage dans des colonies françaises. Il permet de vendre des personnes comme des biens et montre la violence du système colonial. |
| EVT-0337 — Marche des femmes sur Versailles | CM1 | Époque moderne / 3 | Des femmes et d'autres habitants marchent de Paris à Versailles pour réclamer du pain. Le roi et sa famille sont ramenés à Paris, où la population peut davantage peser sur leurs décisions. |
| EVT-0023 — Première date traditionnelle des Jeux olympiques antiques | 6e | Antiquité / 3 | Les Grecs organisent à Olympie des compétitions sportives en l'honneur de Zeus. Le repère traditionnel des premiers Jeux rappelle une pratique qui réunit des participants de différentes cités. |
| EVT-0024 — Fondation traditionnelle de Rome | 6e | Antiquité / 3 | La tradition attribue à Romulus la fondation de Rome. Ce récit donne à la cité une origine légendaire, qu'il faut distinguer des découvertes archéologiques sur ses débuts. |
| EVT-0034 — Édit de Caracalla / Constitutio Antoniniana | 6e | Antiquité / 3 | Caracalla accorde la citoyenneté romaine à presque tous les habitants libres de l'Empire. Cette mesure élargit l'appartenance politique commune sans mettre fin à l'esclavage. |
| EVT-0042 — Hégire, migration de Muhammad et de ses compagnons de La Mecque vers Médine | 5e | Moyen Âge / 2 | Muhammad et ses compagnons quittent La Mecque pour Médine. Cette migration permet à la communauté musulmane de s'organiser dans un nouveau cadre religieux et politique. |
| EVT-0045 — Échange de sentences d'excommunication entre les légats romains et le patriarcat de Constantinople | 5e | Moyen Âge / 3 | Des représentants du pape et le patriarcat de Constantinople échangent des excommunications. L'épisode révèle des tensions entre chrétiens d'Orient et d'Occident, sans constituer une rupture instantanée et définitive. |
| EVT-0048 — Traité de Verdun | 5e | Moyen Âge / 3 | Les petits-fils de Charlemagne partagent l'Empire carolingien par un traité. Ce partage fait apparaître plusieurs royaumes, sans créer d'un seul coup les pays actuels. |
| EVT-0054 — Bataille de Bouvines | 5e | Moyen Âge / 3 | À Bouvines, Philippe Auguste remporte une victoire contre une coalition de princes. Le succès renforce son autorité et la place du roi dans le royaume de France. |
| EVT-0061 — Grande peste / peste noire en Europe | 5e | Moyen Âge / 3 | Une épidémie de peste se propage en Europe et tue une grande partie de la population. Elle désorganise les communautés, le travail et les échanges. |
| EVT-0070 — Achèvement de la première circumnavigation par Elcano et la Victoria | 5e | Époque moderne / 3 | La Victoria revient en Espagne sous le commandement d'Elcano, après la mort de Magellan. Les survivants achèvent le premier tour du monde par mer et relient concrètement les océans. |

## Relecture humaine : liste complète des 4 réserves

| ID | Description proposée | Arbitrage restant |
| --- | --- | --- |
| EVT-0151 | L'ordonnance de Villers-Cotterêts impose le français dans les actes de justice et renforce la tenue des registres paroissiaux. Elle contribue à l'administration du royaume, sans interdire toutes les autres langues. | Le contenu des articles 50-53 et 111 confirme la description. Arbitrer séparément le sens du jour canonique : Légifrance intitule l'ordonnance du 25 août 1539, tandis qu'un arrêt de Douai publié sur Légifrance la cite au 10 août. Confirmer l'ancrage juridique retenu dans les documents d'adoption ; aucune date canonique n'est changée ici. |
| EVT-0153 | Une dÃ©claration royale favorise les officiers qui investissent dans les compagnies des Indes. Elle montre comment la monarchie encourage la participation financiÃ¨re Ã  ses entreprises de commerce lointain. | Confirmer dans le texte original que le repÃ¨re vise bien l'acte du 27 aoÃ»t en faveur des officiers investisseurs, distinct de la dÃ©claration de crÃ©ation. La notice rassemble plusieurs actes et le musÃ©e associe aussi des privilÃ¨ges Ã  cette date ; leur portÃ©e juridique prÃ©cise reste Ã  vÃ©rifier. |
| EVT-0211 | L'armée allemande lance l'opération Michael sur le front occidental. Elle tente de rompre les lignes alliées et d'obtenir une victoire décisive avant l'arrivée de renforts américains plus nombreux. | Antonin doit dÃ©cider si le lancement ponctuel de Michael (EVT-0211) et son dÃ©roulement sous le titre gÃ©nÃ©rique d'EVT-0212 sont deux repÃ¨res pÃ©dagogiques utiles, et s'ils peuvent apparaÃ®tre ensemble dans une partie. La source confirme une seule opÃ©ration, pas deux offensives distinctes. |
| EVT-0212 | Pendant l'opÃ©ration Michael, l'armÃ©e allemande gagne du terrain sur le front occidental. L'Ã©puisement des troupes et les difficultÃ©s de ravitaillement empÃªchent ces avancÃ©es de devenir une victoire dÃ©cisive. | Antonin doit confirmer l'intÃ©rÃªt du repÃ¨re en intervalle EVT-0212, portant sur le dÃ©roulement de Michael, face au lancement ponctuel EVT-0211. Il s'agit de la mÃªme opÃ©ration ; arbitrer leur coexistence et Ã©viter deux questions redondantes dans une partie. |
