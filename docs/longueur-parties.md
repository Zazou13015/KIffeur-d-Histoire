# Longueur des parties — #93

## Choix et compatibilité

Solo libre, scolaire et leurs variantes inversées proposent 5, 10, 20 ou Tout. Dix reste le défaut des URL et mémoires sans `longueur`. Le choix validé voyage dans le champ `c`, l'URL, le stockage local et Rejouer. Les longueurs supérieures au décompte exact sont désactivées ; une sélection de 1 à 4 événements peut être jouée avec Tout. Zéro événement ne permet aucune partie.

Le catalogue reste une aide éditoriale et un fournisseur de bornes de frise, pas une preuve de disponibilité. Le niveau choisi n'est plus remplacé automatiquement par un autre niveau sur la base de ce catalogue. Une lecture de disponibilité est déclenchée après chaque changement de filtres, avec temporisation de 180 ms et rejet des anciennes réponses réseau. La précision et la longueur utilisent les trois décomptes déjà reçus. Une erreur ne fabrique aucun nombre et propose Réessayer.

## Décompte et tirage

`available_questions` renvoie exclusivement YEAR, MONTH et DAY, trois nombres issus des vrais candidats en base. Son helper `solo_candidates` est interne, sans EXECUTE pour PUBLIC, anon ou authenticated. Il reprend les critères du moteur : événement jouable, date de début connue à la précision requise, pack/thème actif, période, niveau et union des chapitres. Les associations sont des EXISTS, pas une somme ou une jointure qui duplique les événements.

Le compteur et les deux signatures existantes de `start_game` partagent ce helper. En inversé, le compteur compte les dates distinctes à la précision demandée, comme le tirage. Il ne renvoie ni date, ni titre, ni alias, ni liste de candidats. La question inverse reste en précision DAY dans l'interface actuelle.

`p_question_count = 0` représente la demande Tout ; les valeurs 1 à 100 gardent leur sens historique et l'absence conserve 10. Tout tire au maximum 100 candidats après déduplication. La longueur réelle (jamais zéro) est insérée dans games et renvoyée dans SoloGame. Résolution de la longueur, déduplication, tirage et instantané des réponses restent dans la même requête : aucun deuxième décompte avant l'INSERT ne crée de fenêtre de concurrence avec un import. Une longueur fixe insuffisante reste refusée sans partie résiduelle.

Le décompte affiché est exact au moment de sa lecture. Un import ultérieur peut changer le nombre disponible ; le moteur confirme la longueur au lancement. Les plafonds des parties anonymes restent inchangés : le trigger contrôle la longueur réellement insérée, y compris pour Tout. Aucun budget, quota de compte, cookie ou mécanisme d'expiration ne change.

`start_chapter_test` est inchangé : de 5 à 10 questions, uniquement parmi les événements des cartes pédagogiques. Le paramètre de longueur utilisateur est ignoré pour ce test, comme avant. Les indicateurs administrateurs utilisent déjà la précision et les ratios ; ils ne comparent pas des totaux bruts de points et n'ont pas besoin de modification.

## Partie, bilan A+ et relance

Chaque question renvoie désormais `question_count`, permettant une progression correcte même après rechargement sans `n`. Les anciennes réponses RPC peuvent encore utiliser le total de l'URL ou dix par défaut. Le bilan conserve score, maximum réel, sauvegarde, rattachement, progression et frise A+.

Au-delà de dix réponses, le carnet affiche dix numéros à la fois avec navigation par séries. Flèches, Home/End et repères de frise changent la sélection et la série ensemble. Le score à cinq chiffres tient dans son sceau ; la transformation du résultat est mémorisée, et les effets de sauvegarde restent à leur emplacement stable.

Les nouvelles parties conservent leurs filtres de lancement dans `games.context.replay_filters`. Ils ne sont restitués que par finish_game, après toutes les corrections et le contrôle existant du propriétaire ou du jeton. Aucun secret ni date attendue n'est ajouté avant correction. Un bilan rouvert depuis le profil peut ainsi rejouer 20 ou Tout/100 avec la même sélection. L'URL d'origine reste prioritaire. Les anciennes parties sans instantané gardent le défaut historique, sans reconstruire des filtres inconnus. Pour un test pédagogique, le chapitre et l'origine déjà enregistrés permettent de retrouver le test sans modifier sa règle de tirage.

## Comparaison normalisée

Pour une partie terminée de n questions, on lit `total_points / n`, sur 100 points par question. La moyenne est la moyenne arithmétique de ces ratios de partie : chaque partie compte une fois. Le record est leur maximum, globalement, par mode et par contexte. Exemple : 400/5 = 80, 1 500/20 = 75, 7 000/100 = 70 ; la partie de cinq questions a le meilleur score normalisé, la moyenne vaut 75.

Les valeurs sont arrondies à deux décimales seulement dans les agrégats renvoyés. Le chrono et la difficulté continuent d'influencer les scores ; la normalisation neutralise la longueur, pas ces autres facteurs. La précision moyenne et sa courbe sont déjà en pourcentage et restent inchangées. Les champs bruts historiques average_score/best_score sont conservés pour compatibilité, et l'historique garde total et dénominateur. Aucune valeur enregistrée n'est recalculée, réécrite ou supprimée. L'interface ne transforme jamais un champ brut absent de normalisation en comparaison normalisée.

## Migration à autoriser — fusion bloquée

`supabase/migrations/20261010160346_longueur_parties.sql` a été créée avec la CLI puis préparée, **sans application distante ou locale**. Elle reste dans histoire et dans son registre. Elle ajoute le helper interne et la RPC de décompte, remplace les deux start_game (mêmes signatures/ACL), étend next_question/finish_game et ajoute les agrégats normalisés à player_stats. Pas de colonne nouvelle ni de modification de public/auth, RLS, tables de réponses, correcteur ou actions de compte.

La transaction possède des délais de verrou/exécution bornés et recharge le cache PostgREST. Les RPC privées gardent l'identité contrôlée et le search_path vide ; le décompte public ne rend que trois nombres. Les scores historiques ne font l'objet d'aucun UPDATE de migration.

Avant toute fusion : résultats de CI à examiner, revue SQL, puis **GO explicite d'Antonin pour appliquer ce fichier sur KFFR** selon la procédure du dépôt. Ne pas utiliser db push/apply_migration. Tant que la migration manque, la nouvelle interface ne peut pas vérifier les disponibilités et les comparaisons normalisées sont indisponibles : la PR reste en brouillon pour empêcher sa fusion prématurée.

## Vérifications préparées, non exécutées localement

À la demande explicite d'Antonin, seule la relecture du diff et `git diff --check` sont réalisées dans cette session. Pas de suites locales, lint, typecheck ou build, pas de polling CI et pas d'attente Vercel.

- Vitest : sérialisation des quatre longueurs dans les modes, anciens liens, disponibilités réelles/insuffisantes, plafond 100, réponse périmée, changements de niveau/précision, erreurs et relance, mémoire, test pédagogique, statistiques et navigation A+ à 100.
- SQL local/CI : vrais candidats partagés, dates dédupliquées, chapitres communs, périodes libres, tailles fixes et Tout, parcours de 100 questions par le correcteur, budget anonyme, ACL/projection sans réponse, comparaisons normalisées, historique intact.
- Playwright : quatre écrans × quatre longueurs (ou désactivation justifiée), rechargement sans n, partie courte complète et relance, profil normalisé.
- Relecture A+ existante étendue à 20 et 100 : onze résultats × six formats, navigation par séries et clavier ; aucune capture nouvelle n'est prétendue validée avant exécution.

GitHub Actions exécutera automatiquement les suites à l'ouverture de la PR. Leurs résultats ne sont pas consultés dans cette session ; une CI verte n'est donc pas revendiquée.
