# A+ · Raffinement du Cabinet de curiosités

> **Décision du 10 octobre 2026 : A+ validée par Antonin pour implémentation.** La double validation systématique avec Maxou a été assouplie d'un commun accord ; aucune revue GitHub de Maxou n'est revendiquée. [Décision consignée dans #96](https://github.com/Zazou13015/KIffeur-d-Histoire/issues/96#issuecomment-6091865712). Le texte ci-dessous décrit la maquette au moment de sa proposition et reste conservé comme référence. Voir [la relecture de l'intégration](../../captures/issue-96/README.md).

La décision artistique retient **A comme base**. A+ conserve son fond papier `#f3f2ec`, la palette encre/laiton/oxyde, les quatre polices du produit et les cartels clairs. Aucun thème de nuit ni nouvelle ambiance dominante. La production reste inchangée ; cette version est proposée pour validation, avant intégration.

## Ce qui change par rapport à A

1. **Score mis en scène comme un sceau de collection.** Le total à l’oxyde domine un médaillon de papier à double filet laiton. Une montée courte de 650 ms accompagne sa révélation ; elle est supprimée avec `prefers-reduced-motion`. L’ornement n’est pas une médaille, un niveau ou une statistique supplémentaire.
2. **Performance plus lisible.** Précision moyenne et nombre de dates exactes ont chacun une hiérarchie nette, à côté du score. La meilleure réponse de cette partie est directement accessible depuis la frise. Aucun record personnel ou temps de jeu n’est inventé.
3. **Frise devenue centrale.** Elle prend toute la largeur entre résultat et carnet, au lieu de rester une miniature en pied de page. La vue « Tout le parcours » regroupe les repères dont les étiquettes se chevaucheraient ; leurs dates restent à leur vraie position. « Voir l’écart » rapproche la réponse sélectionnée et la date attendue sur le même axe.
4. **Carnet plus clair.** Le choix actif est identifié par un fond résultat, un filet laiton et un trait oxyde. Les dix questions restent accessibles ; les actions Précédente/Suivante sont explicites. La fiche rapproche événement, date attendue, réponse et points. La sélection est synchronisée avec la frise, y compris depuis les groupes et la meilleure réponse.
5. **Composition adaptée au jeu.** Sur desktop, résultat, actions, frise et fiche tiennent dans le premier écran. Sur mobile, score, performance et les deux CTA précèdent la frise ; les détails se consultent ensuite, sans longue liste de dix réponses. Le raffinement vient des proportions et de la navigation, avec les composants et les matières clairs de A.

## Livrables

- `cabinet-plus.html` : HTML autonome, avec styles, polices et interactions embarqués, ouvrable sans serveur ni accès réseau.
- `captures/cabinet-plus-1366.png` : premier écran desktop, 1366×768.
- `captures/cabinet-plus-390.png` : premier écran mobile, 390×844.
- `captures/cabinet-plus-mobile-complet.png` : parcours mobile entier, pour inspecter la fiche et la navigation.
- `captures/cabinet-plus-ecart-1366.png` : détail de l’écart sur desktop.

## Données et périmètre

La partie fictive reprend exactement les exemples de A : **726/1000 points, 82 % de précision, trois dates exactes**, une réponse expirée, meilleure réponse à 95 points. Le scénario inversé affiche 579/1000 et sept bonnes réponses sur dix. Les valeurs proviennent des données de démonstration explicitement identifiées ; aucune donnée réelle n’est lue ou écrite.

Les sept scénarios restent inspectables : classique, inversé, score nul, test pédagogique, invité, sauvegarde en cours et indisponible. En inversé, aucune date de réponse du joueur n’est affichée. En cas d’expiration, la date attendue reste visible, sans réponse inventée ; la vue de l’écart est indisponible. Les actions de sauvegarde, connexion, relance et retour au chapitre sont des simulations locales.

La frise annuelle demeure un SVG de maquette, sans moteur de jeu, zoom libre ou accès aux données de production. L’intégration future devra réutiliser `Frise` et ses fonctions existantes, notamment pour les précisions mois/jour, les années avant J.-C. et le regroupement. Aucun changement dans `Bilan.tsx`, les scores, l’authentification ou Supabase. Aucune PR finale à ce stade.

## Validation reproductible

```powershell
node docs/maquettes/issue-96/preparer-plus.mjs
node docs/maquettes/issue-96/verifier-plus.mjs
node --check docs/maquettes/issue-96/cabinet-plus.js
git diff --check
```

Le navigateur vérifie 1366×768, 1024×768, 736×900, 390×844, 375×667 et 320×568. Les sept scénarios, score et CTA au premier écran, absence de débordement, navigation dans les groupes et les questions, vue de l’écart, dates avant J.-C., expiration, score nul et réduction des animations sont couverts. Il confirme aussi le fond papier exact, les totaux des scénarios, l’absence d’erreur JavaScript et de requête réseau. Les mesures figurent dans `captures/mesures-cabinet-plus.json`.

Les anciennes maquettes A et B restent des références archivées de la première étude. **A+ est la seule direction actuelle à valider.**
