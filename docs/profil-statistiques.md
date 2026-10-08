# Profil et statistiques (#25)

`/profil` conserve le pseudo global KFFR, l’onboarding `?next=…` et la
déconnexion. Deux rubriques navigables au clavier : Historique et Statistiques.
Le compte sans session revient à `/connexion` avec sa destination conservée.

## Données et calculs

- `histoire.player_history(p_cursor uuid default null)` : 20 parties terminées
  sauvegardées, ordre `(finished_at DESC, id DESC)`. Le curseur est l’UUID du
  dernier bilan affiché ; il doit appartenir au joueur. La page suivante est
  exclusive et reste stable quand de nouvelles parties sont terminées.
- `histoire.player_stats()` : nombre de parties terminées, moyenne arithmétique
  des précisions de partie, moyenne des points, meilleur total de points, mêmes
  agrégats par mode ; nombre/précision/record par contexte enregistré.
- Les scores sont des points bruts et peuvent concerner des longueurs ou des
  difficultés différentes. L’historique donne le nombre de questions et le
  maximum possible. L’interface explique cette limite de comparaison.
- Courbe SVG : les 12 derniers mois **avec des parties**, moyenne par partie,
  mois calculés en Europe/Paris. L’axe horizontal respecte les intervalles
  calendaires ; un mois sans partie ne devient jamais un zéro. Alternative
  tabulaire disponible, y compris pour un seul point.
- Les parties en cours ne sont pas des parties abandonnées : le moteur ne
  possède pas cet état. Elles ne comptent pas dans les résultats terminés.

## Contextes réellement disponibles

Le moteur #24 conservait les questions et les résultats, mais pas les filtres
de lancement. Aucune tentative de reconstruction depuis les associations
actuelles des événements : les anciennes parties gardent `context = NULL`.
Leur précision, leur score et leur sens date/inverse restent exploitables.
Le mode des anciennes parties datées est donc « Solo · datation » : libre et
scolaire ne peuvent pas être distingués sans information enregistrée.

La migration ajoute un instantané privé `games.context` au lancement des
**nouvelles** parties, y compris anonymes qui seront ensuite revendiquées :
mode libre/scolaire, pack, tag choisi comme thème/filtre, niveau et chapitres
choisis, avec les libellés existants. Le sens inverse prime pour le mode affiché.
Une sélection multichapitre compte une fois par chapitre distinct sélectionné,
avec le résultat global de la partie, **pas** une précision de ses seules
questions. Ce sens est expliqué dans l’interface. Les clés de contexte restent
en SQL ; seul le game_id utile au lien de bilan et au curseur sort de la RPC.

## Sécurité

Les deux RPC sont `SECURITY DEFINER`, avec `search_path = ''`, vérifient
`auth.uid() IS NOT NULL` et filtrent chaque lecture sur ce propriétaire. Aucun
paramètre user_id. Seul `authenticated` a EXECUTE ; `anon` et PUBLIC sont
révoqués. Les RLS et les interdictions de lecture directe de `games` et
`game_questions` restent inchangées. Aucune clé service_role, réponse de
question, empreinte anonyme, identifiant de joueur ou profil B dans la projection.

Le module de lecture est `server-only`, vérifie `getUser()` et utilise la clé
publique sous session utilisateur, avec `cache: 'no-store'` explicitement pour
ces lectures. Seuls les agrégats et les 20 bilans nécessaires à l’onglet actif
sont chargés. Les erreurs SQL sont remplacées par un message public ; un bouton
rafraîchit la route. Aucune statistique persistée ou calculée depuis un historique
exhaustif envoyé au navigateur.

## Migration : appliquée en production le 8 octobre 2026

`supabase/migrations/20261008141312_profil_statistiques.sql` :

1. ajoute `histoire.games.context`, nullable, sans mise à jour des anciennes
   parties ;
2. remplace `histoire.start_game` avec exactement la même signature, le même
   tirage/correcteur et les permissions conservées, en ajoutant l’instantané à
   l’INSERT ;
3. crée les deux RPC privées et leurs permissions ;
4. inscrit sa version dans `histoire.migrations_appliquees`.

Cette migration est nécessaire : les tables privées n’offrent aucune lecture
directe et les RPC de jeu ne fournissent ni historique ni agrégat. Les contextes
de lancement n’étaient pas enregistrés. Utiliser une clé privilégiée
ou copier toutes les parties côté client pour éviter le DDL compromettrait ce
contrat. Aucun autre schéma, trigger Auth ni policy existante ne change.

**Appliquée après GO explicite d’Antonin le 8 octobre 2026 à 16 h 54 (Paris).**
La CLI `supabase db query --linked --project-ref bskyfdjwcdvzhlugtknb --file …`
a exécuté le fichier exact dans `BEGIN / COMMIT`, avec délais de verrou et
d’exécution bornés, contrôle du corps de `start_game` avant application et
contrôles des objets/permissions avant COMMIT. Notification de rechargement du
cache PostgREST dans la même transaction. Aucun `db push` global,
`apply_migration` ni écriture dans l’historique de migrations de Contrée.

SHA-256 du fichier appliqué :
`241577a6b697394d7a10aa66708b3614ba8e45854c1330dcf81d2ba086321b4c`.

Vérifications réelles après COMMIT :

- version `20261008141312` présente dans `histoire.migrations_appliquees` ;
- colonne `games.context` JSONB, RPC `player_history(uuid)` et `player_stats()` ;
- EXECUTE accordé à `authenticated`, refusé à `anon`, et refus explicite des
  deux RPC sous rôle authenticated sans identité ;
- RLS/droits de `games` et `game_questions`, signature et droits de
  `start_game` inchangés ; lecture directe des tables refusée au joueur ;
- `/profil` sur l’aperçu sous session réelle : états vides corrects, puis
  historique et statistiques renseignés après une partie réelle de dix questions
  sur le pack « 50 dates incontournables » ;
- contexte sélectionné effectivement stocké, questions toutes répondues,
  précision/points du bilan conformes aux agrégats des questions et aux RPC ;
- chrono, expiration d’une question, corrections, transitions et sauvegarde
  contrôlés dans ce parcours complet ; aucun rattachement fabriqué ;
- visiteur sans session redirigé, aucune statistique privée dans sa réponse.

Un curseur extérieur est refusé en production. Aucun autre joueur n’y possédait
de partie terminée lors du contrôle : le cas A/B réel reste couvert par la suite
SQL locale/CI, sans créer de faux compte ou de fausses parties en production.
La partie jouée pour le contrôle est un vrai résultat conservé dans le compte,
sans suppression ni modification manuelle de score.

Les fixtures/tests SQL complets ci-dessous ne vont jamais sur KFFR. #77 n’est
pas fusionnée : l’application SQL n’autorise pas la fusion de la PR.

## Après #23

`ProgressionPedagogique.tsx` est un bloc isolé, sans données factices. Il reste à
brancher le contrat réel de #23 : chapitres découverts, meilleur test par
chapitre et niveau. Lire ces données sous l’identité Auth et ajouter les tests
de sécurité et les états vide/erreur correspondants. Ne pas déduire des visites
ou un test pédagogique à partir des parties scolaires historiques. Aucun modèle
de progression parallèle ni modification de #23 dans cette PR. #25 reste ouverte.

## Validation reproductible

- `npm test` : chargeurs, formats, page/onboarding/redirection, composants, vide,
  graphique accessible et erreurs publiques, en plus de la suite existante.
- `scripts/tests-sql.sh` sur Postgres **local vide jetable** : toutes les
  migrations et tous les tests, dont `supabase/tests/profil.sql`. Jeu connu de
  3 parties A (80 % moyen, 720 points moyens, record 900), plus B, anonyme et
  partie en cours ; modes/contextes/mois exacts, pagination à dates identiques,
  accès A/B/visiteur, absence de lecture directe, vrais filtres de `start_game`.
- `npm run lint`, `npm run typecheck`, build Next.js autonome.
- `npm run test:profil-browser` construit le site contre une API HTTP éphémère
  **127.0.0.1**, puis lance `next start` avec Playwright. Aucun fallback ni compte
  fictif dans l’application. Chrome installé sur Windows ; Chromium installé par
  `npx playwright install --with-deps chromium` en CI. Canal optionnel via
  `PROFIL_BROWSER_CHANNEL`. Le script vérifie desktop 1440 et mobile 375 px,
  navigation, absence de débordement, état vide, erreur sans fuite, bouton
  Réessayer, ouverture du compte et redirection sans session. Captures et mesures
  dans `docs/relecture-profil/`.

La CI exécute aussi ce contrôle navigateur. Cette relecture valide le rendu et
le contrat HTTP ; les autorisations et les calculs réels sont validés séparément
sur Postgres par les tests SQL. Le parcours réel sur KFFR a également été validé
après l’application autorisée, comme décrit ci-dessus.

Le test local de la migration Somme reconstitue désormais le registre à sa date,
en retirant les versions ultérieures uniquement dans sa transaction annulée.
Il vérifie ensuite que le registre complet est restauré : une nouvelle migration
ne doit pas empêcher de rejouer la simulation de cette correction historique.
