# Kiffeurs d’Histoire — Dataset v18

## Palier 2 000 atteint

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
