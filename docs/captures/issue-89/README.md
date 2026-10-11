# Relecture de la vue des sous-packs

Captures de la vraie route Next.js, via `npm run test:sous-packs-browser`,
avec une API HTTP éphémère sur 127.0.0.1 et les fixtures du script.
Aucune lecture ni écriture de KFFR, aucune migration exécutée.

Classique et inverse, 1280×800, 1366×768 et 375×812. Les mesures vérifient
l’absence de débordement horizontal, de défilement global sur PC (liste des
24 packs et vue dédiée), et le focus après navigation au clavier.
Le mobile garde son défilement naturel et la barre Jouer accessible.
Ces captures valident la présentation et les actions de lecture ; les parties
réelles, autorisations SQL et imports sont couverts séparément en CI.
