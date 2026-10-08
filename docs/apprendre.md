# Découvrir un chapitre — #22

`/apprendre` propose les dix niveaux canoniques et leurs 41 chapitres. Le
catalogue public ne contient que titres, niveaux, identifiants de chapitre et
slugs. Les slugs de `src/lib/apprendre/catalogue.json` sont figés : conserver
un slug existant si un libellé change. Ils incluent THM, sans index fragile.
Un test compare les noms et la couverture au CSV canonique.

## Serveur, données et cache

`/apprendre/[niveau]/[chapitre]` génère les 41 routes au build avec
`generateStaticParams`, `dynamicParams=false`, `force-static` et ISR horaire.
Niveau inconnu, chapitre inconnu, mauvais rattachement ou RPC vide : 404.
Une erreur de chargement affiche le panneau de reprise Next sans message
technique Supabase. Une erreur au build fait échouer le build, sans fallback.

Le serveur lit seulement `histoire.get_chapter_cards(p_chapter_id)`, avec un GET
sur cette RPC STABLE, la clé publique et `Accept-Profile: histoire`. Aucun cookie
ou service_role. Le fetch utilise le Data Cache Next pour 3 600 secondes, avec
tags de contenu et de chapitre. Chaque page transmet uniquement ses 5 à 12
cartes au composant interactif, via les 14 champs explicites de `cartePublique`,
complétés du seul booléen `illustrationDediee` pour `/apprendre`. Calculé côté
serveur depuis le lookup et la validation de l'API SVG, il ne dépend pas d'un
champ amont et refuse aussi les SVG absents, trop grands ou actifs. Aucun
identifiant d'événement ni chemin de contenu ne traverse la projection.
L'accueil ne transmet aucune carte.

Les routes pédagogiques publiques passent le proxy sans rafraîchissement de
session. Comme la démo existante, leur en-tête est anonyme dans le cache : aucun
pseudo ni donnée de compte dans le HTML partagé. Le lien Connexion reste
disponible. Aucun suivi de progression.

## Frise et lecture

`DecouvrirChapitre` réutilise `<Frise mode="lecture">`, ses marqueurs, son
regroupement, son zoom tactile et `useVue`. Aucune réponse de jeu ni saisie.
Le marqueur porte `card_id` ; une plage est ancrée à son **début**. Le panneau
affiche toujours le `date_text` complet, sans précision/statut techniques.
La Somme est ancrée au **1er juillet 1916** et sa carte affiche
**1er juillet - 18 novembre 1916** après la correction production de #63.

Le cadrage inclut les débuts et fins structurés, avec une marge de 12 % et un
minimum adapté aux jours. `borner` et `useVue` acceptent désormais des bornes et
une vue initiale optionnelles ; leurs valeurs par défaut restent celles du jeu.
Cela permet de voir -10000 (agriculture) et -7100/-5950 (Çatalhöyük) sans les
ramener à -3500. Aucun changement du moteur ou du scoring.
Les cartes PERIOD_TEXT sans début structuré restent accessibles par la liste
et le panneau : aucune position ou date n'est inventée.

La variante `presentationMarqueurs="illustree"` est activée uniquement par
`DecouvrirChapitre` (#68). Une miniature entière de 48 × 36 px, sans recadrage,
sur papier avec filet, accompagne le titre dans un marqueur de 140 × 52 px.
Son URL reste `/api/pedagogie/illustration/<card_id>` et son `alt` est vide :
le bouton porte déjà le titre et la date accessibles. Le motif fallback reste
en 28 × 28 px dans le marqueur existant de 108 × 44 px.

La variante conserve l'axe et les périodes du `main` courant, mais utilise un
seuil de regroupement de 144 px et les couloirs 6/62/118 px. Les tiges restent
ancrées aux dates réelles ; seul le cartel est borné pour rester entièrement
visible. Un clic sur un grand groupe réduit toujours la plage visible, y
compris lorsque tout le chapitre est regroupé à 375 px. La sélection reste
visible dans le groupe. Les usages sans cette option gardent les dimensions
du `main` courant (128 × 52 px), le seuil de 132 px, les couloirs 10/62/114 et
leur comportement. Ces dimensions partagées viennent de #18 fusionnée pendant
#68 ; les règles de #68 sont uniquement des ajouts opt-in, sans retouche de #18.

Le stock permet 303 miniatures et 22 motifs sur les 325 cartes. Parmi les
303 cartes avec date structurée, 290 ont une miniature et 13 un motif ; les
22 cartes sans date structurée restent dans la liste et le panneau (13 avec
illustration, 9 sans). Les 331 SVG et les 325 cartes sont inchangés.
Les [comparaisons avant/après et consignes de relecture](relecture-marqueurs-frise/README.md)
couvrent le desktop, le chapitre dense THM-016, son fallback et le mobile.

Première carte ouverte initialement, liste et navigation suivant `sort_order`,
état actif visible, boutons précédent/suivant bornés. Dans le panneau : flèches
gauche/droite, Escape pour fermer et rendre le focus à la liste. Un marqueur
hors vue recentre la frise en conservant le zoom. Les animations respectent
`prefers-reduced-motion`. Un panneau ouvert hors écran est amené dans la vue,
notamment à 375 px. Boutons de 44 px et charte existante, sans geste réservé au
survol. « Me tester sur ce chapitre » reste désactivé avec une explication :
son branchement et la progression relèvent de #23.

## Audit des solutions d'illustration

- URL Storage ou `image_path` dans une carte : rejetés, car le nom EVT relierait
  la carte à l'événement et à la réponse privée.
- Lookup privilégié en base puis proxy Storage : possible, mais demanderait
  une clé serveur ou un nouvel accès SQL pour un contenu déjà dans le dépôt.
- Route serveur fondée sur `card_id`, lisant les SVG du dépôt : retenue.
  Aucun nouvel accès SQL, aucune modification Storage ni duplication d'images.

`/api/pedagogie/illustration/[cardId]` retrouve le lien interne dans le CSV
commité, dans un module `server-only`, puis sert les octets du SVG existant.
Sans illustration, elle assemble le pictogramme du chapitre depuis
`public/motifs.svg`. La correspondance interne n'entre jamais dans les props
ou les modules client. Le lookup exact refuse un identifiant inconnu, EVT ou
un chemin arbitraire. Les assets sont inclus dans le traçage serveur Next.
Les images suivent la version déployée ; un nouvel asset/rattachement nécessite
un déploiement du dépôt.

Aucun redirect, JSON, nom de fichier, `event_id`, URL Storage ou en-tête amont.
Les seuls headers applicatifs sont le type SVG, le cache, nosniff et la CSP.
Un SVG dépassant 8 Ko ou contenant un identifiant EVT/contenu actif est remplacé
par le motif. Erreur serveur : 503 vide ; identifiant inconnu : 404 vide.
Cache navigateur d'une heure et CDN d'un jour. `chapter_cards`, `event_answers`
et `event_aliases` conservent tous leurs droits. Aucune migration supplémentaire.

## Vérifications

- `npm test` : catalogue, routes, dates/périodes, navigation, contrat RPC,
  filtrage de champs et 325 réponses SVG/fallback sans identifiant interne.
- Lint, typecheck et build avec la vraie RPC de la base Supabase locale importée.
- `npx tsx scripts/verifier-apprendre.ts` : 41 HTML/RSC, 325 cartes, 303 booléens
  dédiés / 22 fallbacks, aucune source ou donnée EVT, aucune carte d'un autre
  chapitre, manifeste ISR à 3 600 s et 331 SVG tracés pour la régénération.
- CI sans base distante : `scripts/build-apprendre-local.ts` lance une fixture
  HTTP éphémère de la seule RPC publique pendant le build. Le site n'utilise
  jamais cette fixture ni un fallback au CSV.
- Chromium à 375 px : tous les niveaux et 41 chapitres, pas de débordement,
  images chargées, Somme via marqueur tactile, navigation/clavier, 404 et aucune
  requête navigateur Supabase/EVT. Contrôle supplémentaire à 1 280 px et captures
  relues.

#18 n'est pas modifiée. Aucun autre mode, progression, statistique ou espace
professeur n'est développé dans cette PR.
