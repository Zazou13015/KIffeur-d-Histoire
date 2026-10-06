# Partie solo côté serveur (issue #13)

Migration : `20261006214244_solo_server.sql`, après celle du score de #12.
Cette livraison est testée uniquement en local et en CI. Aucune migration ni
écriture Supabase distante n'est exécutée par ce travail.

## Stockage et autorisation

`histoire.games` conserve le propriétaire, la difficulté (`YEAR`, `MONTH`, `DAY`),
le nombre de questions, l'état et le résultat final. `histoire.game_questions`
conserve le tirage ordonné, les horodatages serveur et les réponses/scorings.
Les contraintes uniques empêchent de tirer deux fois le même événement.
Un instantané privé de la date et de la description garantit que les imports
ultérieurs ne changent pas la correction d'une partie existante.

Les deux tables ont la RLS active, aucun droit pour `anon`/`authenticated` et
aucune policy. Toutes les lectures et mutations passent par les quatre RPC
`security definer`, avec `search_path = ''`. Le helper `lock_solo_game` est interne.
Il verrouille la partie (`FOR UPDATE`), contrôle l'accès et sérialise ses
transitions, y compris les appels simultanés.

- Connecté : `user_id = auth.uid()`, déterminé par le JWT Supabase validé ; aucun
  identifiant utilisateur n'est accepté comme paramètre. Le jeton anonyme ne
  permet jamais de contourner cette vérification sur une partie connectée.
- Anonyme : `startGame` génère 32 octets aléatoires avec `node:crypto`, les envoie
  à la RPC et les conserve dans un cookie `histoire-solo-<uuid>` de session,
  `httpOnly`, `sameSite=strict`, `secure` en production, sans domaine partagé.
  La base conserve uniquement SHA-256. Chaque RPC vérifie cette capacité ;
  connaître l'UUID ne donne aucun accès. Le secret n'est jamais renvoyé par une
  action, stocké côté JavaScript ni journalisé. Le cookie par partie permet
  plusieurs onglets et la relecture du bilan pendant la session.

Les RPC sont appelables avec la clé publique et la session normale : aucun
`service_role` requis. En usage direct par script, le secret est fourni par le
client serveur appelant ; l'interface web utilise exclusivement le cookie.
Une connexion pendant une partie anonyme ne la transfère pas automatiquement
au compte : le secret reste nécessaire. Les parties connectées restent privées
après déconnexion. L'expiration/purge des lignes anonymes sera à prévoir avant
la mise en production : un cookie de session ne supprime pas les lignes SQL.

Le correcteur inversé historique `check_event_answer(text,text)` devient
**interne** : il permettait de tester librement des alias qui contiennent parfois
une date, sans jouer une question. Le moteur inversé de #14 pourra le réutiliser
à travers une RPC autorisée, après validation de la question.

## Contrat RPC et actions

Les exports de `src/app/solo/actions.ts` servent de point d'intégration pour la
future interface #18. Aucune page ni aucun composant graphique n'est ajouté.

| Action | RPC / paramètres | Résultat |
| --- | --- | --- |
| `startGame(filters?)` | `start_game(p_token, p_pack_id, p_tag_id, p_year_min, p_year_max, p_level_id, p_chapter_ids, p_difficulty, p_question_count)` | UUID de partie, longueur, difficulté, état, indicateur anonyme |
| `nextQuestion(gameId)` | `next_question(p_game_id, p_token)` | Question active ou `null` quand le tirage est épuisé |
| `submitAnswer(gameId, questionId, dateOrNull)` | `submit_answer(p_game_id, p_question_id, p_year, p_month, p_day, p_token)` | Bonne date, écart, unité, précision, points, expiration, description de correction |
| `finishGame(gameId)` | `finish_game(p_game_id, p_token)` | État terminé, longueur, précision moyenne, total et récapitulatif des questions |

Les filtres se combinent avec **ET** ; plusieurs chapitres se combinent avec
**OU**, dans le niveau demandé. Packs/tags inactifs et tags `CENTURY` sont exclus.
La période porte sur l'année de début, bornes inclusives, sans année 0.
La difficulté désigne l'unité de saisie, pas la difficulté éditoriale 1–5 du dataset.
Le nombre de questions vaut 10 par défaut, entre 1 et 100. Une sélection
insuffisante est refusée sans liste de candidats, dates ou décompte disponible.
Les événements non jouables ou connus moins précisément que l'unité demandée
sont exclus. Les événements de type plage sont datés par leur **début**.

Avant réponse, seules les clés `question_id`, `position`, `title`, `description`,
`image_path`, `difficulty`, `asked_at`, `deadline`, `server_time` sont renvoyées.
`description` est `null` : il n'existe pas de description de question garantie
sans date dans le modèle actuel. Les chiffres, mois et mentions de siècle sont
masqués dans le titre de question. Les illustrations suivent la convention
existante `<event_id>.svg` ; les autres chemins sont masqués. Aucun alias,
identifiant d'événement, tag, date secondaire ou date attendue n'est ajouté.
Le contenu public existant et les connaissances historiques du joueur restent
des indices naturels ; les filtres de période sont eux-mêmes un choix du joueur.
Un texte descriptif avant réponse nécessiterait un champ éditorial distinct,
explicitement relu sans date.

`next_question` active uniquement la première question non répondue et conserve
son chrono sur tous les rappels. La durée vient de `scoring_settings` au moment
d'activer la question (30 s par défaut). L'heure `clock_timestamp()` fait foi,
prise après acquisition du verrou. La durée active est figée ; si le réglage
change entre-temps, le temps écoulé est converti en fraction du chrono courant
avant l'appel de `score_answer`, sans dupliquer la formule. Les autres réglages
du score utilisent leur valeur actuelle. Les points sont bornés à 100 par
question, donc 1 000 pour dix questions.

Après la deadline, la réponse est enregistrée avec précision/points à zéro et
la correction est disponible. Une date `null` permet de constater l'expiration :
elle vaut zéro et est refusée avant la deadline. L'expiration ne révèle rien
automatiquement ; l'interface doit appeler `submitAnswer(..., null)` à la fin du
chrono. Aucun appel ne peut répondre à une question future ou déjà répondue.
Les mois/jours requis dépendent de la difficulté et les dates impossibles sont
refusées avant expiration. `finish_game` refuse toute question non répondue,
calcule en SQL les agrégats et devient idempotente. `next_question` renvoie ensuite
`null` ; le récapitulatif permet de relire les corrections.

## Vérification locale / CI

`scripts/tests-sql.sh` attend un **Postgres vide**, recrée le strict simulateur
Supabase déjà utilisé en CI puis applique les migrations et le seed. Les claims
JWT sont simulés sans insérer de compte dans `auth.users`. Ce script ne doit
jamais viser une base Supabase distante ni une base existante.

```sh
# Postgres local vide (variables PG* configurées), jamais une URL distante :
bash scripts/tests-sql.sh
# Supabase local déjà migré :
npm run db:test-securite
npm run db:test-score
npm run db:test-solo
npm test
npm run lint
npm run typecheck
npm run build
```

La CI exécute automatiquement `supabase/tests/solo.sql` et le test de deux
transactions concurrentes `scripts/tests-solo-concurrence.sh`. Couverture :
parties complètes de dix questions anonymes et connectées simulées, 1 000 points,
filtres, précision disponible, plages, tirage unique, chrono/configuration,
réponses exactes/imprécises/absentes/tardives, fin/récapitulatif, instant de
validation, accès étrangers, absence de colonnes privées et de correction sans
partie. `tests/soloActions.test.ts` vérifie les cookies, les paramètres RPC,
l'absence de fuite de secret/erreur et le fonctionnement avec session connectée.
