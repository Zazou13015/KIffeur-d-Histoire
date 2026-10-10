# Bilan Cabinet de curiosités · issue #96

Maquettes de validation artistique uniquement, sur `issue-96-refonte-bilan`, partie du `main` `6f2242fa25c195c90e4f87d33a1feb9e8f354fa1` le 10 octobre 2026. Aucune modification des composants de production, de l’authentification, du score, du contenu historique ou de Supabase. Aucune PR d’implémentation à ce stade.

## Direction actuelle : A+

**Décision artistique : A retenue comme base, B écartée.** La version raffinée se trouve dans `cabinet-plus.html` : même papier, même palette et mêmes typographies, avec un score en sceau, une frise centrale interactive et un carnet de réponses plus net. Voir `A-plus.md` pour les améliorations précises et les captures desktop/mobile. Cette version attend sa validation avant toute modification de `Bilan.tsx`.

Pour préparer les livrables et vérifier A+ : `node docs/maquettes/issue-96/preparer-plus.mjs`, puis `node docs/maquettes/issue-96/verifier-plus.mjs`.

## Première étude conservée en référence

- **A · Cabinet de curiosités premium** : ouvrir `cabinet.html`. Papier mat, score à l’oxyde, mise en page de folio et cartel de collection. La meilleure réponse est mise en avant ; les autres se feuillettent une à une. La mini-frise donne une vue d’ensemble au bas de l’écran.
- **B · La traversée du temps** : ouvrir `immersif.html`. Salle de nuit dans les couleurs de la charte, chiffre monumental en laiton, révélation courte du score et frise au cœur de la scène. Les réponses se parcourent dans un panneau compact ; le moment fort de la partie reste accessible.

Les deux HTML sont autonomes et s’ouvrent directement dans un navigateur, sans serveur ni compte ; chacun peut être partagé seul. Les sources `bilan.css`, `bilan.js` et `polices.css` restent à côté pour les retouches ; `preparer.mjs` les embarque dans les livrables. Les polices de la charte sont embarquées depuis le build Next.js local : Young Serif, Atkinson Hyperlegible, Big Shoulders et JetBrains Mono. Aucune dépendance réseau à l’exécution.

La barre « MAQUETTE · DÉMO » fait partie de l’outil de comparaison, pas de l’interface envisagée en production. Son sélecteur propose : classique, inversé, score nul, test pédagogique, invité, sauvegarde en cours, sauvegarde indisponible. Toutes les actions sont locales et annoncent leur simulation.

Les anciennes propositions ne constituent plus un choix ouvert : la DA de A est retenue et seule A+ est désormais soumise à validation. Les appellations valorisantes sont des propositions éditoriales, sans nouveau rang ni nouveau calcul de performance.

## Audit des données disponibles

Sources lues : `CLAUDE.md`, `AGENTS.md`, `docs/prd.md`, `docs/architecture.md`, l’issue #96, `Bilan.tsx`, `Partie.tsx`, `PartieInverse.tsx`, `src/lib/game/solo.ts`, la page de partie, `SaveGame.tsx`, `EnregistrerTest.tsx`, `Frise.tsx`, les styles de partie, `globals.css`, `layout.tsx`, la page `/charte` et les motifs existants. La documentation Next.js locale sur l’accessibilité a été lue. Le lien externe de charte n’est pas accessible via l’outil de lecture ; la déclinaison complète présente dans le dépôt sert de référence.

| Donnée | Source actuelle | Usage dans les maquettes |
| --- | --- | --- |
| Score total | `SoloResult.total_points` | Chiffre dominant |
| Score maximal | `question_count * 100`, convention déjà utilisée par Bilan | Dénominateur explicite |
| Précision moyenne | `average_accuracy` | Seconde information, intitulée « bonnes réponses » en inversé |
| Questions, ordre, titres, points | `questions`, `position`, `title`, `points` | Navigation numérotée ; une seule fiche affichée |
| Dates attendues | `correct_date`, `unit` | Date lisible et repère chronologique |
| Réponse datée du joueur | Branche `direction: "date"`, `answer.{year,month,day}` nullable | Date du joueur dans la fiche, losange relié à la date attendue sur la vue générale |
| Réponse en inversé | Branche `direction: "inverse"`, `answer: string \| null`, `correct` | Événement attendu et texte saisi ; aucune fausse date du joueur |
| Temps écoulé sur une question | `expired` | « Temps écoulé · aucune réponse », 0 point, pas de marqueur de réponse |
| Durée totale / durée de chaque réponse | Absentes de `SoloResult` ; les horodatages sont disponibles pendant le jeu seulement | Aucune durée, aucun record de vitesse inventé |
| Mode de jeu | `direction`; sélection d’origine par `relance` / `lireChoix` | Habillage commun dates/inversé ; contexte de chapitre si présent |
| Compte et sauvegarde | Props `connecte`, `anonyme` ; `SaveGame` pour le rattachement | États connecté, invité, en cours et échec présentés par des scénarios fictifs |
| Origine pédagogique | `relance`, `origine.test`, chapitre dans `CHAPITRES` ; `EnregistrerTest` | Action « Revoir le chapitre » et statut de progression prévus |
| Meilleure réponse de cette partie | Maximum des `questions[].points` | Mise en avant dérivée des données disponibles |
| Dates exactes | Égalité des dates à la précision demandée ; en inversé `correct` | Résumé dérivé, sans nouveau score |
| Record personnel global | Non transmis à Bilan ; autre parcours du profil | Aucune comparaison avec une ancienne partie inventée |

Les données de démonstration représentent une **partie fictive**, explicitement identifiée. La partie classique affiche 726/1000 points, 82 % de précision, trois dates exactes et une réponse expirée. Le mode inversé utilise un autre jeu de réponses fictives : sept correctes, 579/1000 points, 70 %. Aucun événement du dataset ni résultat réel n’est écrit. Les exemples à l’année ne préjugent pas du formatage final mois/jour.

## Frise et intégration envisagée

La maquette utilise un SVG de présentation, sans zoom, avec positions temporelles proportionnelles aux années, repères attendus et réponses du joueur. Les dates voisines restent voisines ; les étiquettes denses sont masquées plutôt que déplacées, les dix boutons permettent de consulter chaque question. Les cercles et losanges restent distinguables sans dépendre seulement de la couleur. En inversé, seule la date donnée est montrée ; l’écart se lit dans les textes de la fiche.

L’intégration éventuelle devra réutiliser le composant `Frise` existant en lecture (`marqueurs`, `correction`, `reponse`, `onMarqueur`) et ses fonctions de date et de regroupement, plutôt que copier ce SVG de démonstration ou recréer un moteur. Pour les événements très proches, zoom sur la réponse sélectionnée ou regroupement existant ; la présentation de maquette illustre la vue d’ensemble. Le formatage historique existant doit rester la référence pour mois/jours et années avant J.-C.

Le câblage de production devra conserver `lancer` et le champ `c` du formulaire de relance, les chemins de retour actuels, `SaveGame`, l’invitation à se connecter avec `next`, et `EnregistrerTest`. Ces mécanismes ne sont ni modifiés ni exécutés par les maquettes.

## Vérification et captures reproductibles

```powershell
npx playwright install chromium
node docs/maquettes/issue-96/preparer.mjs
node docs/maquettes/issue-96/verifier.mjs
node --check docs/maquettes/issue-96/bilan.js
git diff --check
```

Le vérificateur ouvre les vrais HTML dans Chromium, valide l’absence d’erreur JavaScript et de débordement horizontal, le score et Rejouer sans défilement à 1366×768, 1024×768, 390×844, 375×667 et 320×568. Sur desktop, l’ensemble du bilan doit tenir dans la hauteur disponible. Il vérifie aussi les sept scénarios, les dates avant J.-C., la réponse expirée, la navigation, la meilleure réponse et toutes les actions simulées. Il teste la fin du compteur animé et le rendu avec réduction des animations. Les résultats et les quatre captures sont enregistrés dans `captures/`.

- A desktop : `captures/cabinet-1366.png`
- A mobile : `captures/cabinet-390.png`
- B desktop : `captures/immersif-1366.png`
- B mobile : `captures/immersif-390.png`

Les captures mobiles montrent le premier écran (pas une longue capture déroulée). Les détails se consultent plus bas, sans imposer les dix réponses à la suite. Les animations sont désactivées avec `prefers-reduced-motion` et le compteur passe directement à sa valeur finale.

Après la validation spécifique de A+ seulement : implémenter la direction retenue, tester les flux réels, lancer `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`, fournir les captures puis ouvrir une PR avec `Closes #96`. Aucune fusion automatique.
