# Cartes pédagogiques — lot pilote de l’issue #21

**37 cartes à relire, quatre chapitres seulement.** La [relecture complète](relecture-v1.md) est générée depuis [cartes-v1.csv](cartes-v1.csv) et reproduite dans la PR draft. Aucune UI ni progression n’est développée. Aucun autre chapitre ne sera rédigé avant validation d’Antonin.

## Choix des chapitres

Comptage des identifiants d’événement distincts, non vides, réellement présents dans le v18 courant (2 001 événements). Les lignes du programme sans événement ne sont pas comptées comme événements.

| ID | Niveau | Titre | Événements liés | Cartes | Motif |
| --- | --- | --- | ---: | ---: | --- |
| THM-005 | 6e | Thème 2 — Récits fondateurs, croyances et citoyenneté dans la Méditerranée antique | 19 | 8 | Trois entrées du programme : monde grec, récits romains, monothéisme juif ; distinction entre tradition, croyance et preuve. |
| THM-016 | 3e | Thème 1 — L’Europe, un théâtre majeur des guerres totales (1914-1945) | 55 | 12 | Corpus riche pour aborder guerre totale, révolution russe, nazisme, Front populaire, génocides, Vichy et Résistance. |
| THM-020 | Seconde générale et technologique | Thème 2 — XVe-XVIe siècles : un nouveau rapport au monde, un temps de mutation intellectuelle | 10 | 8 | Articule expansion atlantique, connaissance du monde, Renaissance, humanisme et Réforme. |
| THM-028 | Terminale générale | Thème 1 — Fragilités des démocraties, totalitarismes et Seconde Guerre mondiale (1929-1945) | 20 | 9 | Compare réponse démocratique à la crise et destruction du pluralisme ; analyse diplomatie, persécutions et choix français. |

## Format stable

CSV UTF-8, séparateur virgule, guillemets doubles standard. Les listes `key_concepts` et `sources` sont séparées par `;` sans élément vide ni doublon. Une source web vérifie l’explication ; **elle ne remplace jamais le dataset pour la date**.

- `card_id` : identifiant éditorial stable (`CARD-005-homere`), indépendant de l’ordre. Conserver cet ID lors d’une correction ; le nombre du chapitre n’impose pas de position.
- `chapter_id`, `event_id` : IDs du dataset ; `event_id` vide pour une carte de contexte. Un événement doit être effectivement rattaché au chapitre.
- `start_year/month/day`, `end_year/month/day` : entiers exacts du v18, cellules vides si inconnus. Année négative avant J.-C., jamais zéro. Ces noms communs servent aux événements et aux périodes, sans ramener une date au jour à une simple année.
- `date_text`, `date_precision`, `date_status` : copies de `date_text`, `precision`, `date_status` du v18 pour les événements. Les périodes purement textuelles conservent leur texte et leurs champs numériques vides. Le contexte du pilote reprend exactement `1933-1945 : Allemagne d'Hitler` du programme, avec des bornes à l’année et un statut `CONVENTIONAL`.
- `title`, `body` : titre et 60–120 mots, comptés par séparation sur les espaces. Pilote : 75–89 mots. Les repères datés sont dans les champs dédiés ; aucun nombre ni autre date dans les textes du pilote. Cette règle conservatrice du validateur évite les repères supplémentaires non sourcés.
- `takeaway` : une phrase commençant par « À retenir : » ; `key_concepts` : 1–6 notions.
- `sort_order` : entier positif, unique et continu à partir de 1 par chapitre. Les événements à dates structurées suivent leur début chronologique. Pour les siècles textuels et les processus, l’ordre reste éditorial : Homère ouvre les récits grecs, la Bible ouvre la séquence juive, les plantations concluent la synthèse atlantique. Aucun ancrage numérique fictif n’est ajouté ; leur représentation graphique relève de #22.
- `official_wording` : libellé exact du lien scolaire utilisé, y compris la mention « repère complémentaire » lorsqu’il ne s’agit pas d’un repère officiel obligatoire.
- `sources` : URLs HTTPS de vérification, accessibles dans la relecture. La validation automatique n’atteste pas à elle seule la justesse historique de la prose.

Ajouter d’autres chapitres utilisera les mêmes colonnes ; conserver 5–12 cartes par chapitre ajouté. Leur rédaction attend la validation de ce pilote.

## Stockage et import local

Migration `20261007102922_chapter_cards.sql`, limitée à `histoire`. FK vers les chapitres, les événements et le rattachement événement/chapitre ; contrôle des textes, notions, dates structurées et de l’ordre. RLS active, `SELECT` seul pour `anon` et `authenticated`, droits d’import pour `service_role`. `event_answers` et `event_aliases` restent privées. Ces cartes sont des documents publics de révision qui divulguent volontairement leurs propres repères, conformément à #21.

`histoire.replace_chapter_cards(jsonb)` est une fonction **security invoker**, réservée à `service_role`. Elle remplace en une transaction les cartes des seuls chapitres représentés dans le lot : permutations d’ordre possibles, anciennes cartes retirées, autres chapitres préservés. Un échec annule tout le remplacement ; un verrou sérialise les imports concurrents. Ce pilote ne définit pas encore de suppression automatique d’un chapitre entièrement retiré du CSV.

Après `npm run db:start`, puis **`npm run db:reset -- --local`**, l’import v18 existant charge aussi les cartes quand `SUPABASE_URL` désigne la pile locale HTTP. Le CSV est validé avant le premier upsert. Pour une URL distante, les cartes sont explicitement ignorées et la RPC n’est jamais appelée. Les autres versions du dataset conservent leur comportement d’import.

`npm run content:test-cartes-local` retrouve les clés de la pile locale via `supabase status` en mémoire, sans lire `.env.local` et sans les afficher. Il lance deux imports v18 complets et vérifie l’idempotence, les 2 001 événements, les 37 cartes, leurs références et dates, les permissions anon, l’atomicité en cas d’erreur, le réordonnancement, les suppressions et la préservation des chapitres absents du lot. Il est réservé à la pile locale de développement après reset.

L’import manuel habituel reste `npm run content:import -- --dossier content/dataset-v18`, **avec URL et clé locales explicitement sélectionnées**. Ne pas lancer cet import avec une configuration de production pour cette issue. Aucun fichier `.env.local` n’est modifié.

`npm test` valide le CSV et les refus de données incohérentes. `supabase/tests/chapter_cards.sql` teste les contraintes et les accès `anon`/`authenticated`, y compris les refus RLS avec des grants d’écriture accidentels, dans une transaction annulée. Le test global des réponses privées n’autorise que les colonnes de repères pédagogiques nommément listées.

`npm run content:relecture-cartes` régénère le Markdown ; `npm run content:relecture-cartes -- --check` contrôle sa synchronisation, également vérifiée en CI.

## Réserves et points de relecture

- **Pas de date canonique modifiée.** Les dates de Rome et d’Olympie sont traditionnelles ; Jérusalem conserve -587/-586 et `DISPUTED` ; Homère, la Bible, Athènes et les plantations n’ont pas de fausse année structurée. La naissance d’Érasme conserve `1469` dans le champ numérique et `v. 1466/1469-1536` dans le texte approximatif.
- **THM-028 incomplet pour toute l’étendue du titre** : les liens sont concentrés sur crise/nazisme/juin 1940, sans repères reliés suffisants pour la guerre mondiale entière, le stalinisme et les génocides. Ces sujets ne sont pas inventés dans le dataset. Les cartes forment une séquence révisable sur le corpus disponible, pas une couverture exhaustive du programme. THM-016 couvre les génocides et la sortie de guerre au collège. THM-005 et THM-020 permettent les entrées majeures de leurs thèmes ; THM-016 nécessitera aussi une relecture de l’équilibre des douze cartes, notamment la place du stalinisme.
- **Incohérences de documentation existantes** : le PRD et l’architecture citent encore 2 000 événements/46 chapitres à certains endroits ; le canonique courant et les contrôles stricts donnent 2 001 événements/41 chapitres. Le seed local conserve THM-028 en Seconde avant import ; l’import v18 rétablit bien Terminale générale. Rien n’est corrigé dans le canonique pour cette issue.
- **Autre incohérence rencontrée pendant la sélection** : EVT-0475 (Fachoda, hors pilote) possède des dates structurées et `date_text` du 10 juillet au 3 novembre 1898, mais sa description courte cite le 18 septembre au 4 novembre 1898. Signalé ici sans changement et sans l’utiliser dans une carte.
- À relire : niveau de langue entre 6e et Terminale, clarté des notions, équilibre du parcours, distinctions mythe/histoire et armistice/capitulation, description de Valladolid, dates conventionnelles de Luther, place des civils et des génocides, portée de la synthèse de Terminale.

**Aucune migration n’a été appliquée en production.** Aucun import distant, aucun merge. Les consignes spécifiques de ce pilote priment sur la procédure de production générale du dépôt ; tout passage ultérieur attend deux GO écrits de Max et Antonin.
