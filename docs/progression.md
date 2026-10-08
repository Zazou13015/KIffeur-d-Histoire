# Se tester sur un chapitre et suivre sa progression (#23)

Boucle du mode pédagogique : **découvrir** un chapitre (`/apprendre/...`), **se tester**
(partie solo scolaire sur ce chapitre), **voir sa progression** (`/apprendre` et `/profil`).

## Se tester

Sur la page d'un chapitre, « Me tester sur ce chapitre » lance le même chemin que `/scolaire`
(`lancer` → `start_game` filtré sur le chapitre → écran de partie), avec le choix compact
`mode=scolaire&difficulte=…&chapitres=THM-…&test=chapitre`.

- La difficulté se choisit à côté du bouton (Facile par défaut). Un chapitre peut compter moins de
  10 événements jouables : le test s'adapte (de 5 à 10 questions) et une difficulté sans assez de
  dates est grisée. Un chapitre sous 5 dates ne propose pas de test.
- `lireChoix` n'accepte `test=chapitre` que pour **un seul chapitre**, en jeu de dates, avec au moins
  5 questions jouables. Le bilan propose « Rejouer » (même test) et « Revoir le chapitre ».
- Aucune migration de `start_game` : le test est une partie scolaire d'un seul chapitre ; c'est le
  serveur qui reconnaît cela à l'enregistrement (voir plus bas).

## Base de données (migration `20261008170000_progression_pedagogique.sql`)

Table `histoire.learning_progress` (une ligne par joueur et par chapitre) : `discovered_at`,
`best_accuracy`, `best_difficulty`, `best_tested_at`, `tests_count`, `last_game_id`.

- **Lecture** : RLS `user_id = auth.uid()`, seul `SELECT` accordé à `authenticated` ; `anon` n'a rien.
- **Écriture** : uniquement par deux RPC `SECURITY DEFINER` (`search_path` vide, identité obligatoire,
  aucun `user_id` en paramètre, `EXECUTE` réservé à `authenticated`) :
  - `mark_chapter_discovered(p_chapter_id)` : marque « découvert » une seule fois ;
  - `record_chapter_test(p_game_id)` : relit la **partie terminée du joueur** (propriétaire, jeu de
    dates, au moins 5 questions, un seul chapitre dans son contexte) et en tire la précision. Le
    navigateur ne fournit ni score ni chapitre. Garde la meilleure précision (avec sa difficulté) ;
    rejouer le même bilan ne compte pas deux fois (`last_game_id`).
- La précision comparée est celle de la partie, toutes difficultés confondues : l'interface affiche la
  difficulté à côté du meilleur test.
- Une partie scolaire d'un seul chapitre lancée depuis `/scolaire` serait acceptée si on appelait la RPC
  à la main avec son identifiant, sur le compte de son propre joueur : sans conséquence pour les autres.
  L'interface ne l'appelle que depuis un bilan de test de chapitre.
- Tests : `supabase/tests/progression.sql` (identités A/B/visiteur, idempotence, meilleur test,
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
