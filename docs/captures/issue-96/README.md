# Intégration du bilan A+ — #96

A+ a été validée par Antonin. La décision et l'assouplissement de la double validation avec Maxou sont [consignés dans l'issue](https://github.com/Zazou13015/KIffeur-d-Histoire/issues/96#issuecomment-6091865712) ; aucune revue GitHub de Maxou n'a eu lieu. Les maquettes A, B et A+ restent archivées, A+ est la référence de cette implémentation.

## Résultat

Le bilan affiche le vrai `SoloResult` : score, maximum `question_count × 100`, appréciation proportionnée, précision moyenne, réponses exactes, meilleure réponse et détail sélectionné. Le carnet est dynamique ; numéros, flèches, clavier et groupes de repères partagent la même sélection. La frise représente les dates attendues et données à leur précision, en utilisant les conversions historiques de `src/lib/game/frise.ts`. Le cadrage de l'écart inclut les deux dates, sans limite héritée de la frise du gameplay. Les dates identiques occupent deux lignes ; expiration, absence et mode inverse n'inventent aucune date du joueur.

`Bilan` conserve le formulaire de relance et le choix d'origine, les liens, `SaveGame` et `EnregistrerTest`. Leur emplacement est stable pendant la navigation. Les actions serveur, RPC, sauvegardes, authentification et données partagées sont inchangées.

## Vérification reproductible

```powershell
npm ci
npx playwright install chromium
npm test
npm run lint
npm run typecheck
npm run test:bilan-browser
git diff --check
```

`test:bilan-browser` lance **`npm run build`**, puis la vraie route `/partie/[id]` en production locale, derrière une API HTTP éphémère sur `127.0.0.1`. Il n'utilise aucune base ni clé réelle. Les structures de test sont uniquement dans `tests/fixtures/bilan.ts`. Elles ne sont jamais importées par l'application.

La suite couvre les formats 320×568, 390×844, 768×1024, 1024×768, 1366×768 et 1920×1080 ; neuf résultats par format, puis les parcours pédagogie, invité, rattachement, erreur et relance. Elle vérifie les clics, le clavier, la synchronisation, le retour à la vue globale, les marqueurs visibles, l'absence de débordement et Rejouer au premier écran mobile. Les tests Vitest couvrent aussi l'absence de sauvegarde répétée, la progression invitée, l'attente du rattachement, l'année sans zéro, les trois précisions et les résultats de zéro à maximum.

Les fixtures simulent les réponses du serveur ; elles vérifient le rendu et les interactions, pas la formule SQL. Les parcours existants de CI gardent leur vérification sur leur pile locale. La relecture navigateur du bilan est ajoutée au job de vérification existant.

## Captures de la vraie application

- [Desktop 1366×768](bilan-1366.png)
- [Mobile 390×844, page complète](bilan-390.png)
- [Vue rapprochée desktop](ecart-1366.png)
- [Vue rapprochée mobile](ecart-390.png)
- [Test pédagogique](pedagogie-390.png)
- [Erreur de sauvegarde](erreur-390.png)
- [Invité](invite-390.png)
- [Mesures automatiques](mesures.json)

## Écarts nécessaires par rapport à la maquette

L'en-tête conserve le logo et les vrais contrôles de compte du produit, au lieu du profil fictif et de la barre de démonstration. L'appréciation, les compteurs, les dates et les messages varient avec la partie. Les messages de sauvegarde et de progression gardent les formulations existantes. Le cadrage et les graduations suivent la chronologie réelle, donc leurs bornes diffèrent du dessin annuel de démonstration. Les animations se limitent à une apparition discrète de 220 ms ; la valeur serveur du score est immédiatement lisible, sans compteur provisoire. Le mode de réduction des animations les désactive.

La construction Next émet l'avertissement préexistant sur les valeurs de police de secours de Big Shoulders ; la police principale est bien chargée. Aucune réserve fonctionnelle connue après les vérifications consignées.
