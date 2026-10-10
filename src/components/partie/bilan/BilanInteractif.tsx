"use client";

import { useState, type ReactNode } from "react";
import { reponsesBilan } from "@/lib/game/bilan";
import type { SoloResult } from "@/lib/game/solo";
import { ScoreBilan } from "./ScoreBilan";
import { FriseBilan } from "./FriseBilan";
import { CarnetBilan } from "./CarnetBilan";
import "./bilan.css";

export function BilanInteractif({ resultat, contexte, actions }: { resultat: SoloResult; contexte: string; actions: ReactNode }) {
  const reponses = reponsesBilan(resultat);
  const [selection, choisir] = useState(Math.min(2, Math.max(0, reponses.length - 1)));
  return <section className="bilan-cabinet" aria-label="Fin de la partie">
    <div className="cabinet-shell">
      <div className="hero"><ScoreBilan resultat={resultat} reponses={reponses} contexte={contexte} />{actions}</div>
      <FriseBilan reponses={reponses} selection={selection} choisir={choisir} inverse={resultat.direction === "inverse"} />
      <CarnetBilan reponses={reponses} selection={selection} choisir={choisir} />
    </div>
  </section>;
}
