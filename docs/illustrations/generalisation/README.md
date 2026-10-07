# Généralisation des illustrations pédagogiques — issue #66

Les **211 événements manquants** ont chacun un SVG dédié. Ils remplacent les motifs de **227 cartes**, dans les **41 chapitres**. Les 120 SVG déjà validés (100 historiques + 20 pilotes de #65) sont inchangés, octet pour octet. Aucun contenu pédagogique, composant, route, marqueur de frise, gameplay, migration ou upload n'est modifié.

## Couverture et inventaires

| Mesure | Avant, pilote validé inclus | Après |
| --- | ---: | ---: |
| Cartes pédagogiques | 325 | 325 |
| SVG dans le stock | 120 | 331 |
| Cartes avec illustration dédiée | 76 | 303 |
| Cartes avec motif générique | 249 | 22 |
| Cartes avec événement encore sans SVG | 227 | 0 |
| Événements correspondants encore sans SVG | 211 | 0 |
| Cartes sans `event_id` canonique | 22 | 22 |

- [Inventaire des 211 nouveaux SVG](../../../content/illustrations/generalisation-inventaire.csv) : fichier, nombre de cartes, objets représentés, références graphiques validées, intention et vigilance historique.
- [Correspondances des 227 cartes](../../../content/illustrations/generalisation-cartes.csv) : `card_id`, `event_id`, titre exact, illustration existante avant = non, nouveau fichier SVG.
- [Correspondances complètes des 325 cartes](../../../content/illustrations/generalisation-couverture-cartes.csv) : chapitre, événement, titre, fichier et statut (référence intacte / nouvelle illustration / fallback).
- [Couverture par chapitre](couverture.md), avec les chiffres avant/après.
- [32 événements mutualisés](mutualisations.csv), anciens et nouveaux : chaque carte liée au même événement reçoit exactement le même fichier. **16 nouveaux SVG** servent deux cartes chacun ; les 195 autres servent une carte chacun : 16 × 2 + 195 = 227.
- [22 fallbacks restants](fallbacks.csv), tous sans événement dans le CSV canonique. Plusieurs titres évoquent une notion également abordée ailleurs, mais aucune jointure n'est inventée : changer leur rattachement est un travail éditorial distinct. Aucun événement lié à une carte ne reste sans dessin.

Le branchement est automatique par le mécanisme existant, réservé au serveur : `card_id → event_id canonique → content/illustrations/*.svg`. Le client reçoit seulement `/api/pedagogie/illustration/[cardId]`. Les fichiers sont inclus par le tracing Next déjà configuré. Le générateur d'atelier n'entre jamais dans l'application ni dans les réponses publiques.

## Comment la DA validée est respectée

Référence absolue : les 120 SVG du commit `c23173d54858e7e12c61ccde04553471bd3ff94f`, dont le pilote #65 validé par Antonin. L'[audit du pilote](../pilote-pedagogie.md) reste applicable. L'empreinte de chaque référence est conservée dans [reference-validee.json](../../../content/illustrations/reference-validee.json) et vérifiée automatiquement.

La règle `.gitattributes` impose LF aux SVG de ce dossier : un checkout Windows ne transforme ainsi pas leurs octets en CRLF et ne produit pas de fausses alertes d'intégrité. Aucun SVG de référence n'est modifié par cette règle.

- **Cadrage** : 160 × 120, fond papier opaque, sujet entier, composition en vis-à-vis déjà présente dans le stock ; sol sauge vers 108, espace vide conservé.
- **Formes et détail** : cercles, rectangles, ellipses et chemins courts ; personnages à tête ronde, corps géométrique et membres au trait, pas de portrait. Façades, livres et machines réduits à leurs pièces utiles. Un objet principal et un accessoire ; un troisième objet seulement quand nécessaire pour distinguer un propos.
- **Trait** : encre `#1d2a3a`, principal 2 px, extrémités/jonctions arrondies ; divisions secondaires 1–1,5 px. Les réductions compensent la largeur du trait.
- **Palette** : papier `#f3f2ec`, laiton `#b08a3e`, oxyde `#8a2f2b`, sauge `#7e8c7a` et encre uniquement. Aplats sans modelé, ombre, texture, lumière, filtre, image ou dégradé.
- **Batailles identifiées** : même bandeau de 19 px, drapeaux adaptés à la palette, armes croisées, scène à 0,72 et carte de 46 × 38 en bas à droite, comme EVT-0012 / EVT-0210. Les côtes proviennent de Natural Earth ; aucun front ni frontière politique contemporaine n'est inventé.
- **Sans texte** : les petites règles sur les livres et documents sont des traits abstraits, comme dans les références. Pas de lettres, dates, logos, noms ou identifiants embarqués.

Les formes d'atelier et leurs références sont explicites dans [objets.ts](../../../scripts/illustrations-pedagogiques/objets.ts) ; chaque choix de scène est consigné dans [catalogue.ts](../../../scripts/illustrations-pedagogiques/catalogue.ts). Aucun SVG validé n'est utilisé comme fichier à réécrire.

## Vigilances à relire humainement

La fidélité visuelle reste un jugement humain : les tests garantissent l'enveloppe, la sobriété technique et l'intégrité du stock, pas une identité esthétique parfaite. Les 18 planches permettent de décider sur des dessins concrets.

- L'essentiel du nouveau lot adopte les associations d'objets sobres déjà validées. Leur composition est plus régulièrement en deux objets que certaines scènes historiques du stock. Comparer en priorité les planches 1, 7, 14 et 18 ; le nombre de détails n'a pas été augmenté pour « embellir ».
- Les nouvelles minicartes de bataille montrent uniquement les côtes du théâtre, avec la même palette et le même cadrage. Elles sont moins détaillées que les cartes d'alliances de certaines références. C'est un arbitrage explicite pour éviter des frontières/fausses positions militaires, à relire sur les planches 9, 10 et 17.
- Les bâtiments sont des silhouettes scolaires, pas des restitutions documentaires : palais Han, portique de Constantinople, églises, fortifications, temples et mausolée de Tombouctou. Aucune silhouette n'est présentée comme un monument précisément relevé. Relire particulièrement EVT-0041 / 0139 / 0309 / 0310.
- Génocides, persécutions et massacres : famille, bagage, barreaux, bougie ; pas de victimes violentées ou de symboles nazis décoratifs. Relire l'adéquation de cette évocation retenue aux cartes EVT-0015 / 0090 / 0244 / 0303 / 0518.
- Anachronismes corrigés avant livraison : hache pour Charles Ier, barricade sans barbelés pour Juin 1848, képi pour l'entrée en guerre de 1914, artillerie et cuirassé pour les opérations du XXe siècle, pommes de terre pour la famine irlandaise, accès par le toit à Çatalhöyük. Le casque schématique et les objets d'atelier ne prétendent pas identifier un modèle militaire ou mécanique exact.
- Les lignes sur les documents anciens ne sont pas une transcription d'écriture. La plaque de Becquerel est une évocation de l'expérience photographique, sans rendre un faux résultat scientifique quantifié.

Chaque événement a sa propre ligne de vigilance dans l'inventaire, y compris quand il n'y a qu'une simplification conventionnelle à signaler.

Sources complémentaires vérifiées pour les détails particuliers : [architecture du projet de recherche Çatalhöyük](https://catalhoyuk.com/site/architecture) (maisons contiguës et accès par le toit, aucune image copiée) ; [présentation hébergée par l'AIEA](https://www.iaea.org/sites/default/files/lu-presentation200917.pdf), p. 3 (expérience photographique de Becquerel) ; [Natural Earth, domaine public](https://www.naturalearthdata.com/about/terms-of-use/) pour les côtes. Le fichier de préparation des cartes conserve la source et son SHA-256. Le propos historique de chaque scène vient d'abord de la carte canonique, qui garde ses sources intactes.

## Relecture manuelle

1. Ouvrir l'[index des 18 planches](planches.md) et les PNG à taille réelle. Les quatre premières vignettes de chaque planche sont des SVG validés inchangés ; les suivantes sont les nouvelles illustrations. Les 211 nouvelles images sont présentes une seule fois. Les étiquettes sont hors des SVG servis.
2. Comparer silhouette, occupation du cadre, épaisseur, espacement, palette, détails et abstraction. Chercher une rupture de grammaire visuelle, pas une image « plus jolie ».
3. Ouvrir `/apprendre` sur l'aperçu Vercel de cette PR. La [liste de 24 cartes contrôlées](echantillon.csv) donne leurs pages et titres, dans les dix niveaux disponibles. Choisir la carte dans la liste ; vérifier la nouvelle illustration dans le panneau, puis Précédente / Suivante. Comparer aussi le CNR, intact, et la carte nazisme, restée en fallback.
4. Refaire sur ordinateur et à **375 px** : image entière, texte lisible, aucun débordement horizontal. Captures conservées : [Çatalhöyük desktop](desktop-CARD-004-catalhoyuk.png) / [mobile](mobile-CARD-004-catalhoyuk.png), [Galilée desktop](desktop-CARD-022-galilee-observation.png) / [mobile](mobile-CARD-022-galilee-observation.png), [Verdun desktop](desktop-CARD-016-verdun.png) / [mobile](mobile-CARD-016-verdun.png).
5. Utiliser une origine d'aperçu fraîche : le cache existant est de 3 600 s côté navigateur et 86 400 s côté CDN. Une ancienne réponse sur le même hôte peut temporairement montrer un motif. Aucun comportement de cache n'est changé ici.
6. Signaler les ajustements graphiques/historiques souhaités sur les fichiers précis. **Pas de fusion ni de fermeture de #66 avant le GO humain final.**

## Vérifications et reproduction locale

- `npm test` : 210 tests Vitest et 6 tests d'import verts, incluant les 325 réponses exactes de la route et les mutualisations.
- `npm run lint`, `npm run typecheck`, `npm run build` verts. Build exécuté avec la fixture HTTP publique locale du script existant, sans appel KFFR. Avertissement préexistant de fallback de police Big Shoulders ; pas d'erreur.
- `python scripts/verifier-illustrations.py` : 331 SVG, zéro problème XML/palette/poids/élément interdit ; 120 SHA-256 intacts. Nouveaux SVG : **635 à 3 573 octets**, 210 266 octets au total, tous sous 8 Kio.
- `npx tsx scripts/verifier-apprendre.ts` et `npm run content:test-demo-pedagogie` : 41 chapitres, 325 cartes, HTML/RSC sans événement, source ni métadonnée interne.
- Contrôles HTTP réels sur le build démarré : 325 routes, réponses exactes, aucune redirection/fuite ; traçage des 331 SVG dans le bundle de la route.
- [Relevé navigateur](verification-navigateur.json) : 24 cartes × 2 largeurs (1280 / 375 px), toutes les images chargées et aucun débordement horizontal ; six captures conservées et relues.
- CI et déploiement d'aperçu : voir les checks sur la PR, rattachés à son HEAD exact.

Pour régénérer seulement le lot nouveau : `npx tsx scripts/illustrations-pedagogiques/generer.ts`, puis `npx tsx scripts/illustrations-pedagogiques/planches.mjs`. Le générateur refuse d'écrire sur les 120 références et refuse toute divergence de couverture. Les cartes de côtes sont déjà préparées et versionnées : aucune connexion réseau n'est nécessaire pour régénérer les SVG ou les planches. Ne pas lancer le script d'upload Storage pour cette PR.
