# Administration des packs — #87

`/admin/packs` permet à Maxou et Antonin de relire les packs existants et de retirer
ou remettre leurs questions. Le lien se trouve sur `/admin/indicateurs`.
Les comptes autorisés restent exclusivement ceux de `histoire.admins` ; aucune
nouvelle liste de comptes ni permission fondée sur les métadonnées du navigateur.

## Relecture des 24 packs

1. Se connecter avec un compte administrateur et ouvrir le lien des indicateurs.
2. Choisir un pack dans la colonne gauche. L’URL `?pack=<id>` permet de partager
   cette sélection entre administrateurs et de la retrouver après rechargement.
3. Lire chaque question : titre, identifiant, date (y compris les plages et les
   dates antiques), niveau éditorial et statut. Tous les événements associés sont
   présents, même ceux non jouables ou sans date exploitable.
4. Rechercher un titre, sélectionner un niveau exact, ou afficher uniquement les
   questions retirées/jouables. Ces filtres se combinent. Ils ne font aucun appel
   à la base. Le niveau de relecture est exact ; en jeu, Intermédiaire inclut
   aussi Débutant et Expert inclut les trois niveaux, comme auparavant.
5. Cliquer « Retirer », saisir éventuellement un motif (1 000 caractères maximum),
   puis confirmer. « Annuler » ou Échap ferme la confirmation sans rien écrire.
6. Une question retirée garde sa ligne, une étiquette « Retirée », et l’action
   « Remettre ». La dernière modification précise l’heure Europe/Paris,
   l’identifiant du compte administrateur et le motif. L’historique complet reste
   conservé en base, même après réintégration ; cette issue ne crée pas de CMS
   ni d’écran général d’historique.
7. Cliquer « Remettre » pour annuler un retrait. Une question globalement non
   jouable ne devient pas jouable par cette action. Les titres, dates, niveaux
   et packs ne sont pas éditables dans cette interface.

En cas d’erreur, la page garde l’état précédemment confirmé et propose de
réessayer. Le motif reste dans la confirmation. Une coupure après validation SQL
peut laisser le résultat incertain : réessayer la même opération actualise l’état
sans ajouter une seconde entrée d’audit. Un succès actualise questions et
décomptes ensemble. Les autres onglets se mettent à jour au rechargement ou au
prochain changement de pack ; aucun abonnement ou sondage permanent.

## Portée du retrait et décomptes

Le retrait porte sur `(pack_id,event_id)` uniquement. Ni événement ni association
ne sont supprimés. Un événement retiré du pack A reste disponible dans B,
dans ses thèmes, en sélection générale et dans ses chapitres scolaires ou cartes
pédagogiques. Les parties déjà lancées conservent leur tirage et leur correction.
Les nouveaux lancements lisent les retraits validés en base au moment du tirage.

`solo_candidates` exclut les associations retirées lorsque `p_pack_id` est fourni.
Les deux signatures de `start_game`, les sens date/inverse, `available_questions`
et les relances classiques partagent donc le même état. La déduplication des dates
inversées et le plafond de 100 questions pour Tout sont inchangés.
`start_mystery_game` filtre aussi les associations de packs **avant** ses décomptes
et son tirage : un pack vide ou insuffisant après retrait n’entre pas dans la
roulette. Ses thèmes restent éligibles indépendamment. « Rejouer ce thème »
revalide le pack annoncé ; « Relancer la roulette » repart des candidats actuels.

La colonne de packs donne le total associé, le nombre retiré et les questions
réellement jouables à l’année, tous niveaux ; un pack inactif affiche zéro jouable.
Le choix 5/10/20/Tout utilise déjà les trois disponibilités dynamiques de #93 :
aucune régénération de `catalogue.json` n’est nécessaire après relecture. Ce
catalogue conserve seulement son rôle éditorial et ses bornes de frise.
`start_chapter_test`, qui sélectionne les événements des cartes et aucun pack,
reste inchangé. Les retraits ne touchent pas les apprentissages ni progressions.

## SQL, sécurité et coût

Migration préparée : `20261010210813_admin_packs.sql`, créée avec `npm run db:new`.
Elle dépend des fichiers #93 et #95, ne modifie aucune ancienne migration et
s’inscrit dans `histoire.migrations_appliquees` dans sa transaction.

- `pack_event_status` : état privé, clé primaire d’association. La RPC vérifie
  et verrouille l’association réelle. Il n’y a pas de cascade depuis le contenu :
  les imports par upsert ou suppression/réinsertion d’association gardent les
  retraits. Une association disparue conserve son état privé pour son éventuel
  retour, sans influer sur les décomptes tant qu’elle est absente.
- `pack_event_audit` : journal des transitions, compte issu de `auth.uid()`, date
  serveur, opération et motif. Pas de cascade vers ce journal.
- Les deux tables ont la RLS active, aucun droit ni policy pour les rôles API ;
  aucune écriture directe, même depuis un compte administrateur authentifié.
- `admin_list_packs` et `admin_pack_questions` contrôlent `auth.uid()` et
  l’appartenance à `admins` avant toute lecture privée. Les wrappers de retrait
  et réintégration exécutent le helper interne qui fait le même contrôle **avant**
  tout accès aux associations. Les fonctions ont un `search_path` vide et leurs
  droits EXECUTE sont retirés à PUBLIC/anon ; les quatre RPC sont accordées à
  authenticated avec autorisation réelle en SQL. Le helper n’a aucun EXECUTE API.
- Le verrou `FOR UPDATE` sur l’association sérialise les opérations concurrentes.
  Seules les transitions effectives écrivent un audit ; état et audit sont atomiques.
- Les réponses privées passent uniquement dans la projection administrateur.
  Un visiteur est redirigé vers la connexion ; un joueur reçoit 404. Une révocation
  de droits est contrôlée de nouveau sur chaque lecture/action. `no-store` évite
  tout cache de données administrateur partagé. Aucune clé privilégiée nécessaire.
- Deux RPC métier pour ouvrir un pack : décomptes de l’ensemble, puis questions
  du seul pack sélectionné. Les liens n’ont pas de préchargement des 24 packs.
  Une mutation fait un seul aller-retour et renvoie questions/décomptes actualisés.
  Les scans de candidats sont groupés ; l’audit récent utilise un index par
  association. Pas d’appel par ligne, ni de recalcul sur la saisie des filtres.

## Mise en service : décisions humaines

**Migration non appliquée. Aucun SQL distant exécuté.** Antonin doit donner un GO
explicite séparé, après revue et vérification des migrations #93/#95 nécessaires.
Ne pas fusionner avant cette étape ; ne pas utiliser `db push`/`apply_migration`.

Le dépôt contient déjà [l’audit du décompte public](audit-decompte-93.md) : les
décomptes exacts avec bornes libres et les refus de lancement peuvent permettre
d’inférer les années. Cette PR protège ses nouvelles dates/RPC mais ne résout pas
ce contrat public préexistant. La confidentialité globale ne doit pas être
déclarée validée avant une décision produit et une correction de ce sujet.
Cela reste un prérequis de production, même si #101 et #102 sont fusionnées.

Maxou et Antonin devront tester avec leurs vrais comptes sur l’aperçu après le
GO SQL, puis réaliser la relecture éditoriale des 24 packs (#88).

## Vérifications

Tests ajoutés : `supabase/tests/admin_packs.sql` (automatiquement pris par la CI
SQL sur Postgres vide), trois fichiers Vitest `admin-packs-*` et le parcours
Playwright `e2e/admin-packs.spec.ts`. Les suites existantes de scolaire,
pédagogique, longueurs et mystère restent actives.

Le SQL vérifie comptes admin/joueur/anonyme, accès direct refusé, dates réservées,
état/audit/idempotence, deux signatures de tirage et deux sens, 5/10/20/Tout,
roulette vide/insuffisante, réintégration, autres packs/thèmes/chapitres et
instantanés. Il utilise les comptes du simulateur existant, sans toucher auth.
`scripts/tests-admin-packs-concurrence.sh` vérifie deux retraits puis deux remises
simultanées : une seule transition par opération et une seule ligne d’état.
Vitest vérifie aussi les refus de page, les actions, les erreurs SQL/réseau,
recherche/filtres, confirmation/annulation, double clic et décomptes actualisés.
Playwright couvre le parcours administrateur et le refus non administrateur,
le rechargement, l’audit, Échap et une coupure réseau.

Vérifications exécutées : 15 tests Vitest ciblés réussis, lint des fichiers TS/TSX
modifiés, `tsc --noEmit` et `git diff --check`. Pas de suite longue, build,
pile SQL locale ou test distant ; pas
d’attente de GitHub Actions/Vercel. Les résultats complets restent à relire avant
mise en service ; leur réussite n’est pas présumée.
