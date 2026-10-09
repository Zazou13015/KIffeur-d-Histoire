# Se tester sur un chapitre et suivre sa progression (#23)

Boucle du mode pédagogique : **découvrir** un chapitre (`/apprendre/...`), **se tester**
(partie solo scolaire sur ce chapitre), **voir sa progression** (`/apprendre` et `/profil`).

## Se tester

Sur la page d'un chapitre, « Me tester sur ce chapitre » lance `lancer` → `start_chapter_test` → écran de
partie, avec le choix compact `mode=scolaire&difficulte=…&chapitres=THM-…&test=chapitre`.

- **Le test ne porte que sur les cartes du chapitre** : ce que le joueur vient d'apprendre. (Première
  version : tout le chapitre, soit 55 événements pour 12 cartes en 3e thème 1 ; relevé par Maxou le
  9 oct. 2026.) Les 325 cartes couvrent 288 événements jouables.
- La difficulté se choisit à côté du bouton (Facile par défaut). Le test compte autant de questions que
  de cartes jouables, de 5 à 10 ; une difficulté sans assez de cartes est grisée. 38 chapitres sur 41
  ont un test (THM-004, THM-005 et THM-046 n'ont que 4 cartes jouables à l'année : bouton grisé).
- `src/lib/solo/catalogue.json` porte ces décomptes (`t`, `tb`), générés par `npm run content:catalogue-solo`
  depuis `content/pedagogie/cartes-v1.csv`. Le serveur retire les mêmes événements de `histoire.chapter_cards`.
- `lireChoix` n'accepte `test=chapitre` que pour **un seul chapitre**, en jeu de dates, avec au moins
  5 questions jouables. Le bilan propose « Rejouer » (même test) et « Revoir le chapitre ».
- `start_game` est inchangé : la fonction dédiée `histoire.start_chapter_test(p_token, p_chapter_id,
  p_difficulty, p_question_count)` tire parmi les événements des cartes et inscrit
  `context.origin = 'test_chapitre'` dans la partie.

## Base de données (migration `20261008170000_progression_pedagogique.sql`)

Table `histoire.learning_progress` (une ligne par joueur et par chapitre) : `discovered_at`,
`best_accuracy`, `best_difficulty`, `best_tested_at`, `tests_count`, `last_game_id`.

- **Lecture** : RLS `user_id = auth.uid()`, seul `SELECT` accordé à `authenticated` ; `anon` n'a rien.
- **Écriture** : uniquement par deux RPC `SECURITY DEFINER` (`search_path` vide, identité obligatoire,
  aucun `user_id` en paramètre, `EXECUTE` réservé à `authenticated`) :
  - `mark_chapter_discovered(p_chapter_id)` : marque « découvert » une seule fois ;
  - `record_chapter_test(p_game_id)` : relit la **partie terminée du joueur** (propriétaire, jeu de
    dates, au moins 5 questions, un seul chapitre, `context.origin = 'test_chapitre'`) et en tire la précision. Le
    navigateur ne fournit ni score ni chapitre. Garde la meilleure précision (avec sa difficulté) ;
    rejouer le même bilan ne compte pas deux fois (`last_game_id`).
- La précision comparée est celle de la partie, toutes difficultés confondues : l'interface affiche la
  difficulté à côté du meilleur test.
- Une partie scolaire d'un seul chapitre lancée depuis `/scolaire` ne compte pas : seul `start_chapter_test` pose le marqueur d'origine.
- Tests : `supabase/tests/progression.sql` et `supabase/tests/test_chapitre.sql` (tirage limité aux cartes, bornes, anonyme ; identités A/B/visiteur, idempotence, meilleur test,
  refus des parties d'autrui, inversées, en cours, trop courtes, sans contexte ; aucune écriture directe).

## Cache et données personnelles

`/apprendre` et les 41 pages de chapitre **restent statiques et anonymes** (point à réévaluer
laissé par #22) : aucun pseudo ni progression dans le HTML partagé. La progression arrive après coup :

- `lireProgression`, `marquerChapitreDecouvert`, `enregistrerTestChapitre` sont des Server Actions
  (POST, jamais mises en cache, client `no-store`), appelées depuis des composants client ;
- elles lisent l'identité dans la session, valident le chapitre (catalogue) ou l'UUID de partie avant
  la RPC, et ne renvoient jamais de message SQL ;
- sans réponse du serveur, la page garde simplement la progression de la session.

## Sans compte

La progression (chapitres découverts, meilleur test) est gardée dans `sessionStorage`, le temps de
l'onglet. Elle n'est pas transférée au compte à la connexion. Si le stockage est indisponible, le jeu
continue sans.

## Affichage

- `/apprendre` : pastilles « Découvert » et « Meilleur test : 85 % · Facile » par chapitre, en toutes
  lettres ; note « sans compte… » avec lien de connexion pour un visiteur.
- `/profil` (onglet Statistiques) : « Ton parcours pédagogique » : chapitres découverts et testés,
  détail par niveau. Lecture indisponible : message dédié, le reste du carnet s'affiche.

## Migration : appliquée sur KFFR le 8 octobre 2026

Appliquée avant la fusion (règle de `CLAUDE.md`), en une transaction SQL avec délais bornés, uniquement
dans le schéma `histoire` (aucun `db push` ni `apply_migration`, aucune écriture dans l'historique de
Contrée). SHA-256 du fichier : `e2a772faa190d2984de47b36abbde145904e4ac25f1ae112cf49a01ff7d67282`.
Contrôlé après coup : version inscrite dans `histoire.migrations_appliquees`, RLS active, `authenticated`
peut lire la table mais pas y écrire, `anon` n'a aucun droit, `EXECUTE` des deux RPC réservé à
`authenticated`.

Seconde migration, `20261009080000_test_chapitre_cartes.sql` (fonction `start_chapter_test` et
`record_chapter_test` resserrée sur le marqueur d'origine) : appliquée sur KFFR le 9 octobre 2026, même
procédure. SHA-256 : `241ef080a0858c2eb16dabd78fef1c8dc8485a7acbada6862c6c005f95376775`. Contrôlé : version
au registre, `EXECUTE` de `start_chapter_test` pour `anon` et `authenticated` (comme `start_game`),
`record_chapter_test` réservé à `authenticated`, 11 événements jouables pour les cartes de THM-016, comme
le catalogue.

## Limite assumée pour la V1 (décision de Maxou, 9 oct. 2026)

Les cartes ne couvrent qu'une partie du programme (288 événements jouables sur 517 rattachés, 12 cartes
pour 55 événements en 3e thème 1). La V1 s'en tient à ces cartes et le test est borné à elles. À prévoir
après la V1 : compléter les cartes, quitte à subdiviser les thèmes en chapitres plus fins.
