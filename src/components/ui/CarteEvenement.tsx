import type { ReactNode } from "react";
import { Motif } from "@/components/charte/Motif";

type Props = {
  titre: string;
  description?: string;
  /** Nom d'un motif de public/motifs.svg (ex. « bastille », « caravelle »). */
  motif?: string;
  /** Ou l'adresse d'un dessin SVG (160×120) quand l'événement a le sien. */
  illustrationSrc?: string;
  /** Petite étiquette technique au-dessus du titre (« Inv. MOD-0412 · Histoire moderne »). */
  inventaire?: string;
  /** Badges, boutons… affichés sous la description. */
  pied?: ReactNode;
  niveauTitre?: "h2" | "h3";
};

// La carte n'affiche jamais de date : elle est faite pour la question, pas pour la réponse.
export function CarteEvenement({ titre, description, motif, illustrationSrc, inventaire, pied, niveauTitre: Titre = "h3" }: Props) {
  const avecImage = motif || illustrationSrc;
  return (
    <article className="grid gap-3 border border-filet bg-blanc-cartel p-4 shadow-cartel">
      {avecImage && (
        <div className="border border-[#d6d2c4] bg-[#e9e6da] px-6 py-4 text-[#1d2a3a]">
          {illustrationSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- SVG déjà optimisé, 160×120 fixe
            <img src={illustrationSrc} alt="" width={160} height={120} className="mx-auto block h-auto w-full max-w-60" />
          ) : (
            <Motif nom={motif!} viewBox="0 0 160 120" className="mx-auto block h-auto w-full max-w-60" />
          )}
        </div>
      )}
      {inventaire && <span className="inventaire">{inventaire}</span>}
      <Titre className="text-[26px] leading-[1.1]">{titre}</Titre>
      {description && <p className="m-0 text-[15px] text-encre-douce">{description}</p>}
      {pied && <div className="flex flex-wrap items-center gap-2 border-t border-filet pt-3">{pied}</div>}
    </article>
  );
}
