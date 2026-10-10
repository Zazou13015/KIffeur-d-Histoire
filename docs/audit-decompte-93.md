# Audit du décompte exact — blocage avant production

## Conclusion

**Ne pas appliquer `20261010160346_longueur_parties.sql` ni fusionner la PR #101 en l'état.** `available_questions`, accessible à anon et authenticated, permet d'inférer des années de réponses cachées. L'absence de date dans le JSON n'assure pas la confidentialité d'un agrégat exact interrogeable avec des bornes libres. Une décision produit et une protection revue sont nécessaires avant mise en production. Aucune migration ni requête distante n'a été exécutée pendant cet audit.

## Déduction reproductible

Pour une sélection contenant un seul événement, `YEAR(pack, year_max=m)` vaut zéro avant son année, puis un à partir de cette année. Une dichotomie retrouve donc l'année en environ douze appels sur [1, 3000], sans ouvrir de partie, répondre à une question ou lire event_answers. Avec plusieurs événements, les différences de comptes cumulés donnent l'histogramme des années ; les croisements pack, thème, chapitre et niveau peuvent isoler un événement. DAY/MONTH révèlent également la présence d'une précision pour les groupes isolés, même sans paramètre de mois/jour.

La démonstration locale autonome est dans `supabase/fixtures/audit_decompte_93.sql`. Elle crée une sélection fictive d'un événement, récupère son année uniquement par appels de la RPC sous anon puis authenticated, et annule tous les inserts. Elle n'est pas une assertion de sécurité prétendant que ce comportement est acceptable. Elle est préparée, **non exécutée dans cette session**. À lancer uniquement sur un Postgres local ayant déjà les migrations de la branche, jamais sur KFFR :

```sh
PGHOST=127.0.0.1 psql -U postgres -v ON_ERROR_STOP=1 -f supabase/fixtures/audit_decompte_93.sql
```

## Appels massifs et permissions

- Chaque appel peut lire les candidats et calculer trois comptes distincts. La RPC n'a ni compteur de requêtes, ni quota de travail, ni contrôle de débit. La temporisation React ne protège pas contre un client direct.
- Les budgets anonymes contrôlent les inserts dans games ; `available_questions` n'en fait aucun. Elle contourne donc ces budgets pour l'énumération. Un utilisateur connecté peut aussi répéter les appels.
- `solo_candidates` est INVOKER, avec search_path vide et EXECUTE retiré à PUBLIC/anon/authenticated. Il n'est pas directement lisible par les joueurs.
- `available_questions` est DEFINER : sa projection n'expose que trois nombres, mais ses privilèges permettent précisément les lectures privées à l'origine de l'inférence. RLS sur event_answers ne bloque pas cet oracle.
- Déplacer le même compte dans une Server Action, exiger une connexion, mettre un cache, limiter le débit ou refuser seulement les intervalles courts ne supprime pas la déduction par bornes cumulées. Un secret serveur ne doit jamais être transmis au navigateur ; un proxy public ne suffirait pas non plus.

## Moteur et historique

Les deux signatures start_game sont conservées, avec leurs ACL, le niveau obligatoire uniquement dans la nouvelle surcharge et dix questions par défaut. Le helper reprend les critères existants ; row_number déduplique les dates inversées à la précision demandée. Tout résout sa longueur réelle avant l'INSERT : le trigger de budget et d'expiration anonyme reste actif. Aucune table ou policy de public/auth n'est modifiée.

Il existe aussi un oracle d'existence **antérieur à #93** dans start_game : demander une question avec des bornes libres distingue création et « Pas assez de questions ». La nouvelle RPC rend cette exploration plus efficace, sans création de partie ni budget anonyme. Sécuriser seulement le nouveau compteur ne suffirait donc pas à garantir la confidentialité des années du catalogue face à un joueur déterminé ; les deux signatures doivent faire partie de la décision.

next_question conserve le verrou propriétaire/jeton et la projection classique sans date ; en inversé, la date est l'énoncé prévu par le produit, sans titre/alias/image/event_id avant correction. finish_game et les bilans historiques restent protégés par propriétaire/jeton et ne rendent le récapitulatif qu'après correction. player_stats filtre le joueur connecté et normalise en lecture ; aucun score historique n'est réécrit. L'inférence du catalogue ne donne pas accès aux réponses saisies, scores ou parties d'un autre joueur.

## Compromis à faire valider

Décompte exact public sur des sélections temporelles arbitraires et confidentialité stricte des années sont incompatibles. La protection complète exige de retirer l'oracle public (compteur **et** tirage filtré), ou de changer le contrat des sélections/résultats. Cela touche au produit : aucune variante diminuant la confidentialité n'est choisie ici.

Option à privilégier pour une confidentialité stricte : conserver 5/10/20/Tout et le comptage exact interne au lancement, mais remplacer la consultation libre par des sélections autorisées et une disponibilité publique qui ne permet pas de tester arbitrairement des années. Les sélections publiques très petites et les réponses de refus du moteur doivent aussi être étudiées. Les bornes libres et la promesse d'un nombre exact avant lancement nécessiteraient alors une adaptation explicitement autorisée.

Autre choix possible, seulement après décision explicite : accepter que les années du catalogue soient déductibles tout en protégeant les résultats des joueurs, puis ajouter des quotas et protections contre les abus. Ce choix diminue la confidentialité actuelle et ne constitue pas une correction de la fuite.

La branche conserve les fonctionnalités de #93 pour revue ; ce n'est pas une validation de leur sécurité en production. Le fichier de migration, la documentation et la description de PR signalent ce blocage. La PR reste en brouillon. L'autorisation SQL et une CI verte ne remplacent pas la résolution de cette décision.
