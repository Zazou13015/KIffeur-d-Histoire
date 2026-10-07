"use client";

import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Modale } from "@/components/ui/Modale";

export function DemoModale() {
  const [ouverte, setOuverte] = useState(false);
  return (
    <>
      <Bouton variante="secondaire" onClick={() => setOuverte(true)}>
        Ouvrir la modale
      </Bouton>
      <Modale
        ouverte={ouverte}
        onFermer={() => setOuverte(false)}
        titre="Quitter la partie ?"
        actions={
          <>
            <Bouton variante="secondaire" onClick={() => setOuverte(false)}>
              Continuer à jouer
            </Bouton>
            <Bouton variante="oxyde" onClick={() => setOuverte(false)}>
              Quitter
            </Bouton>
          </>
        }
      >
        Ta progression sur cette partie sera perdue. Échap ou un clic sur le fond referme la fenêtre.
      </Modale>
    </>
  );
}
