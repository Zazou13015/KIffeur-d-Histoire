# Relecture du profil

Captures issues de `npm run test:profil-browser`, sur le build Next.js de
production local avec API de fixtures éphémère (aucun accès à KFFR).

- `historique-1440.png`, `historique-375.png` : bilan, contexte et pagination.
- `statistiques-1440.png`, `statistiques-375.png` : résultats, modes, courbe,
  contextes et section pédagogique en attente de #23.
- `statistiques-vide-375.png`, `erreur-375.png` : états vide et indisponible.
- `mesures.json` : largeur réelle du document égale au viewport sur les deux
  rubriques aux deux tailles, aucune erreur JavaScript, parcours vérifiés.

Les chiffres de démonstration ne sont présents que dans les fixtures de tests.
Les calculs et autorisations réels sont vérifiés par `supabase/tests/profil.sql`.
