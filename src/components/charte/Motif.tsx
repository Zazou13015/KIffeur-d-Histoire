// Motif gravé de la charte, tiré de public/motifs.svg. Prend la couleur du texte (currentColor).
export function Motif({ nom, viewBox = "0 0 48 48", className }: { nom: string; viewBox?: string; className?: string }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" className={className}>
      <use href={`/motifs.svg#${nom === "bastille" ? nom : `m-${nom}`}`} />
    </svg>
  );
}
