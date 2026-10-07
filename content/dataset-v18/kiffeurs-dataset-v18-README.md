# Kiffeurs d’Histoire — Dataset v18

## Extension validée de l'issue #9 — 2 001 événements

Le corpus courant contient **2 001 événements** après création validée d'EVT-2042, occupation de Çatalhöyük (tertre oriental), dans THM-004 : PERIOD / YEAR_RANGE / APPROXIMATE / RANGE, environ -7100 à -5950 selon Larsen et al., PNAS 2019. La variante UNESCO -7400 à -6200 reste explicitée, sans fusion ni faux mois/jour. Sources, alias, gameplay, métadonnées scolaires, tags sémantiques, couverture, résumés et collections sont synchronisés. Les dates/statuts/jouabilités des événements antérieurs restent protégés, avec la seule correction dédiée [Somme, EVT-0210](kiffeurs-somme-day-range-README.md) : DAY_RANGE du 1er juillet au 18 novembre 1916 ; migration production en attente de GO.

**41 chapitres actifs, 534 liens uniques, 41/41 avec au moins cinq jouables.** Les 45 validations nécessaires sont consignées. La collection maître compte 2 001 membres ; son slug historique `corpus-complet-v18-2000` reste stable. Le pack Expert est recalculé à 50 membres ; les 23 autres packs restent inchangés. Les fichiers d'extraction et de dédoublonnage des lots antérieurs restent des traces historiques, pas des listes à réécrire pour ce nouvel événement.

Import et second import idempotent vérifiés sur Supabase LOCAL propre avec les migrations existantes ; sécurité anon/authenticated vérifiée. PR #38 en brouillon pour la dernière revue, sans merge ni application distante. [Dossier complet de création](kiffeurs-chapter-thm004-candidates-v18-README.md).

## Palier initial de V18 — 2 000 atteint (historique)

V18 ajoute **1 000 événements** aux 1 000 événements homogénéisés de V17, soit **2 000 événements canoniques**.

### Composition du nouveau lot
- **94 repères historiques supplémentaires** après déduplication avec V17 ;
- **70 bons candidats V15** précédemment laissés de côté ;
- séries de culture générale : Jeux olympiques, Coupes du monde, élections, Oscars, Formule 1, Tour de France, Eurovision, Grammy, César, Berlinale, Golden Globes, BAFTA, Super Bowl et Wimbledon.

Les événements récurrents sont volontairement majoritairement classés `importance=1` ou `2`, afin de ne pas écraser les repères historiques dans les packs généralistes.

### Complétude
Chaque nouvel événement possède dès V18 :
- date structurée et `date_status` ;
- importance / difficulté ;
- `playable` / `playable_mode` ;
- description courte ;
- aliases revus et dédupliqués ;
- au moins un tag thématique HIGH ;
- au moins un tag géographique HIGH ;
- tag de siècle ;
- tag de série lorsque pertinent ;
- source historique secondaire B ;
- mapping event ↔ source.

### Sourcing
Les séries récurrentes utilisent une page de série/liste Wikipédia de niveau B. Les repères historiques et anciens candidats utilisent une chronologie annuelle Wikipédia de niveau B.
Les **1 000 ajouts sont marqués `PENDING_V19` pour une QA ciblée**, comme le lot V15 avant sa V16.

### Collections
- nouvelle collection `Culture générale V2 — 1 000 nouveaux événements` ;
- nouvelle collection maître `Corpus complet V18 — 2 000 événements` ;
- collections structurelles par série ;
- les 24 packs prêts à jouer sont recalculés sur les 2 000 événements.

### Suite
La prochaine étape est une **QA ciblée des 1 000 ajouts V18**, avant le passage vers 5 000 événements.
