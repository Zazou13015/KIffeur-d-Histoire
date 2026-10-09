import type { MetadataRoute } from "next";

// Raccourci sur l'écran d'accueil du téléphone ou de la tablette (#28) : pas de service worker, le jeu reste en ligne.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kiffeurs d'Histoire",
    short_name: "Kiffeurs",
    description: "Place les grands événements de l'Histoire sur la frise.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2ec",
    theme_color: "#1d2a3a",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-masquable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
