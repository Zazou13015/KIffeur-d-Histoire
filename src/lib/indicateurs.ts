import "server-only";
import { createClient } from "@/lib/supabase/server";

// Contrat de histoire.admin_indicateurs() (#26) : une ligne par fenêtre, 7 puis 30 jours.
type Fenetre = { jours: 7 | 30 };
type Nombre = number | null;
export type Indicateurs = {
  parties_par_session: (Fenetre & { sessions: number; parties_lancees: number; parties_terminees: number; parties_terminees_par_session: Nombre })[];
  retour_semaine: (Fenetre & { joueurs: number; joueurs_revenus: number; part_revenus: Nombre })[];
  repartition_modes: (Fenetre & {
    parties: number; libre: number; scolaire: number; pedagogique: number; inverse: number; inconnu: number;
    part_scolaire_pedagogique: Nombre;
  })[];
  conversion_compte: (Fenetre & { joueurs_sans_compte: number; joueurs_convertis: number; part_convertis: Nombre })[];
  methodes_saisie: (Fenetre & {
    frise: number; clavier: number; calendrier: number; reponses: number;
    part_frise: Nombre; part_clavier: Nombre; part_calendrier: Nombre;
  })[];
  progression_chapitre: (Fenetre & {
    joueurs_chapitres: number; en_progres: number;
    precision_premier_test: Nombre; precision_dernier_test: Nombre; gain_moyen: Nombre;
  })[];
  calcule_le: string;
};

// null : pas connecté ou pas administrateur. La vérification est faite en SQL, jamais ici.
export async function chargerIndicateurs(): Promise<Indicateurs | null> {
  const supabase = await createClient({ noStore: true });
  const { data, error } = await supabase.schema("histoire").rpc("admin_indicateurs");
  if (error?.code === "42501") return null;
  if (error || !data) throw new Error("Les indicateurs sont momentanément indisponibles.");
  return data as Indicateurs;
}
