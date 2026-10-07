# Cartes pédagogiques — généralisation de l’issue #21

**325 cartes dans 41/41 chapitres, 5 à 12 cartes par chapitre.** Le pilote de 37 cartes est validé par Antonin ; les 288 nouvelles cartes attendent sa relecture finale dans la même PR draft #59. Le [CSV interne](cartes-v1.csv) est la source éditoriale. La [relecture complète](relecture-v1.md) distingue contenu joueur et métadonnées. Le [rapport des lacunes](lacunes-v1.md) précise les limites de couverture. Le canon reste inchangé : 2 001 événements et 41 chapitres non vides.

| Niveau canonique | Chapitres | Cartes |
| --- | ---: | ---: |
| CM2 | 3 | 20 |
| 6e | 3 | 23 |
| 5e | 6 | 44 |
| 4e | 3 | 30 |
| 3e | 3 | 35 |
| Seconde générale et technologique | 4 | 36 |
| Première générale | 4 | 35 |
| Terminale générale | 4 | 29 |
| Première HGGSP | 5 | 35 |
| Terminale HGGSP | 6 | 38 |
| **Total** | **41** | **325** |

Le canon ne contient pas de chapitre CM1 ; aucun chapitre n’est inventé. Les pilotes THM-005, THM-016, THM-020 et THM-028 conservent leurs IDs, ordres et dates. Seule une phrase de CARD-020-plantations contenant « Cette carte » a été remplacée pour respecter la nouvelle règle de prose naturelle, sans modifier son explication historique.

## Format interne et rédaction

CSV UTF-8, séparateur virgule, guillemets doubles standard. Les listes key_concepts et sources utilisent le point-virgule, sans élément vide ni doublon.

- **card_id** : identifiant stable CARD-XXX-slug, indépendant du rang, avec le numéro du chapitre.
- **chapter_id** : chapitre canonique ; **event_id** est interne et facultatif uniquement pour une période de contexte autorisée.
- Les six composantes de date, **date_text**, **date_precision** et **date_status** reprennent exactement les valeurs v18 pour une carte événementielle. La précision canonique est stockée sans transformation.
- Un contexte reprend un rattachement temporel exact. Seules les années explicites et non ambiguës deviennent des bornes : 1751-1772 ou 1848 : … Les siècles, décennies et bornes telles que 1799-1814/1815 restent en PERIOD_TEXT sans année, mois ou jour fictif. Un contexte sans période est refusé.
- **title**, **body**, **takeaway**, **key_concepts** : contenu naturel adapté au niveau ; 60–120 mots pour le corps, actuellement 71–91 mots. Le takeaway commence par À retenir :. Aucun statut technique, mention du dataset, justification scolaire technique ou métadiscours sur la carte. Les repères numériques sont conservés dans les champs de date dédiés.
- **sort_order** : 1 à N, sans trou ni doublon. Les événements comparables suivent la chronologie ; les périodes textuelles peuvent introduire ou conclure un ensemble thématique. Une année sans mois/jour n’est pas traitée comme un premier janvier.
- **official_wording** : cellule exacte du lien canonique. Certaines cellules complémentaires sont vides ; elles restent vides plutôt que devenir un faux libellé officiel. Un contexte exige un libellé temporel non vide.
- **sources** : URLs HTTPS internes de vérification de la prose. Elles ne remplacent jamais le canon pour la date. La validation informatique ne certifie pas à elle seule la justesse historique.

Tous les liens sont examinés, mais chaque événement ne devient pas une carte. Les doublons et micro-dates sont écartés sauf lorsqu’ils expliquent des mécanismes distincts. Les limites de THM-027, THM-028, THM-029, THM-031 et de plusieurs thèmes HGGSP restent explicites.

## Sécurité et projection publique

**histoire.chapter_cards reste privée** : RLS active, aucune policy publique, aucun droit direct pour anon ou authenticated. L’index interne par événement ne devient pas un point d’accès public. Réponses et alias du moteur solo restent privés ; le moteur solo est inchangé.

La seule lecture publique est **histoire.get_chapter_cards(p_chapter_id text)** : stable, security definer, search_path vide, filtrage par chapitre et tri par ordre. Elle retourne exactement 14 champs : card_id, chapter_id, title, body, takeaway, key_concepts, les six composantes de date, date_text et sort_order.

**Aucune source ni URL de source, aucun event_id, libellé scolaire ou statut technique dans la projection publique.** CartePedagogique et cartePublique respectent la même liste. Les sources restent dans le CSV, la table privée et le Markdown. Aucun paramètre de recherche par événement ne permet une jointure triviale avec une date de réponse.

**histoire.replace_chapter_cards(jsonb)** reste security invoker, réservée à service_role. Une transaction remplace uniquement les chapitres du lot, autorise les permutations d’ordre et supprime leurs anciennes cartes retirées. Un échec annule tout ; un verrou sérialise les imports. Un chapitre absent du lot n’est pas supprimé automatiquement.

La migration préparée est appliquée seulement en local. importerCartesLocales refuse toute URL distante avant la requête ; l’import canonique n’ajoute les cartes que sur la pile locale.

## Relecture et démo statique

**/demo/pedagogie** propose les 41 chapitres dans des groupes par niveau. Chaque carte affiche date/période, titre, corps, takeaway et notions. Sources, IDs événementiels et métadonnées techniques sont absents de l’interface et des props navigateur. Les avertissements de couverture sont distincts des textes des cartes.

Les fichiers du dépôt sont lus au build puis projetés avant sérialisation. La route utilise force-static, un en-tête anonyme et évite le proxy de session : elle ne consulte pas Supabase et fonctionne en Vercel Preview sans migration ni import distant. Elle reste un outil de relecture ; aucune progression ni fonction de #22 n’est ajoutée.

**npm run content:relecture-cartes** génère toutes les cartes dans 41 sections par niveau et chapitre. CONTENU JOUEUR et MÉTADONNÉES DE RELECTURE séparent les informations. L’option --check vérifie la synchronisation avec le CSV.

## Contrôles

**npm test** valide canon, couverture, nombres, ordre, IDs, rattachements, dates, longueurs et prose. Les tests de rendu parcourent les 325 cartes et vérifient les 14 champs publics et l’absence de liens. Lint, typecheck et build complètent ces contrôles.

Après le build, **npm run content:test-demo-pedagogie** contrôle l’artefact HTML/RSC réel : 41 options, groupes par niveau, toutes les cartes embarquées et aucune fuite d’ID, métadonnée ou URL de source. Ce contrôle tourne en CI.

**npm run content:test-cartes-local** retrouve les paramètres locaux via supabase status, en mémoire, sans lire .env.local ni afficher de secret. Après db reset local, il réalise deux imports complets : 2 001 événements, 41 chapitres, 325 cartes, dates, références, idempotence, atomicité et remplacement par chapitre. Il exerce tous les chapitres en REST anon/authenticated avec un JWT local éphémère sans création de compte : sources et événement absents, accès direct/oracle/écritures/réponses/alias refusés.

**supabase/tests/chapter_cards.sql** vérifie contraintes et projection exacte, y compris l’absence de sources. Les refus RLS sont vérifiés même avec des grants accidentels. Les fixtures sont transactionnelles et annulées. La suite SQL complète s’exécute aussi sur un Postgres local jetable avec migrations, seed et tests de concurrence.

## Production et validation

**Aucune migration ni donnée appliquée en production.** Aucun SQL distant, import distant, merge ou début de #22. PR #59 conservée draft sur issue-21-cartes-pedagogiques. La généralisation attend la validation finale d’Antonin ; toute opération future en production exige les deux GO écrits de Max et Antonin.
