import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Big_Shoulders, JetBrains_Mono, Young_Serif } from "next/font/google";
import "./globals.css";
import AccountHeader from "@/components/AccountHeader";

// Polices de la charte : titres, texte courant, dates, étiquettes techniques.
const titre = Young_Serif({ variable: "--police-titre", weight: "400", subsets: ["latin"] });
const texte = Atkinson_Hyperlegible({ variable: "--police-texte", weight: ["400", "700"], subsets: ["latin"] });
// Big Shoulders à axe optique : prend le dessin « Display » aux grandes tailles.
const date = Big_Shoulders({ variable: "--police-date", weight: "variable", axes: ["opsz"], subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--police-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kiffeurs d'Histoire",
  description: "Place les grands événements de l'Histoire sur la frise.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${titre.variable} ${texte.variable} ${date.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AccountHeader />{children}</body>
    </html>
  );
}
