# Indicateurs de réussite (#26)

Les six indicateurs du PRD se lisent sur **`/admin/indicateurs`**, sur 7 et 30 jours.
La page n'existe que pour les comptes listés dans `histoire.admins` (Maxou, Antonin) :
`histoire.admin_indicateurs()` vérifie le compte en SQL et refuse tous les autres (404 côté site).

## Données

- **Journal durable** `histoire.kpi_games` : une ligne par partie, tenue par un trigger sur
  `histoire.games` (lancement, fin, sauvegarde sur un compte). Il survit à la purge des parties
  anonymes (24 h). Il ne contient ni titre, ni date, ni réponse : mode, difficulté, précision
  moyenne, compteurs de saisie, et seulement des identifiants (compte ou visiteur).
- **Visiteur anonyme** : cookie `histoire-visiteur` (UUID aléatoire, httpOnly, 13 mois), rattaché à
  la partie par `kpi_noter_visiteur` au lancement. Il sert aux sessions, aux retours et aux passages
  au compte. Aucune donnée personnelle.
- **Méthode de saisie** : `game_questions.input_method` (`frise`, `clavier`, `calendrier`), notée par
  `kpi_noter_saisie` juste après `submit_answer` (une fois par question, jamais sur une question
  expirée). Fonction séparée pour ne pas changer la signature de `submit_answer` en production.
  Le calendrier n'existe pas en V1 : sa part reste à 0.
- **Vercel Web Analytics** (`<Analytics />` dans `layout.tsx`, sans cookie) : pages vues et
  visiteurs, à activer une fois dans l'onglet *Analytics* du projet Vercel (gratuit en Hobby).

## Vues `histoire.kpi_*`

Toutes en `security_invoker`, sans droit pour `anon` ni `authenticated` ; colonne `jours` = 7 ou 30.
Joueur = compte, sinon visiteur.

| Vue | Indicateur |
| --- | --- |
| `kpi_parties_par_session` | Parties terminées par session (session = parties d'un joueur espacées de moins de 30 min) |
| `kpi_retour_semaine` | Part des joueurs qui rejouent un autre jour dans les 7 jours suivant leur première partie de la période |
| `kpi_repartition_modes` | Part des parties en scolaire et en pédagogique (test de chapitre) |
| `kpi_conversion_compte` | Part des navigateurs ayant joué sans compte puis vus connectés |
| `kpi_methodes_saisie` | Répartition frise / clavier / calendrier |
| `kpi_progression_chapitre` | Écart de précision entre premier et dernier test d'un joueur sur un chapitre |

Tests sur données de test : `supabase/tests/indicateurs.sql`.

Ajouter un administrateur : une migration qui insère son `user_id` (déjà présent dans `histoire.players`) dans `histoire.admins`.
