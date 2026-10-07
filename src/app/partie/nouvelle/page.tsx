import { redirect } from "next/navigation";

// Ancienne entrée de lancement (3.4) : le choix du mode se fait désormais sur /solo.
export default function NouvellePartie() {
  redirect("/solo");
}
