type Props = {
  /** Question en cours (à partir de 1). */
  numero: number;
  total: number;
};

// Une case par question : pleine = faite, cerclée = en cours.
export function BarreProgression({ numero, total }: Props) {
  const faites = Math.max(0, Math.min(total, numero - 1));
  return (
    <div
      role="progressbar"
      aria-label="Progression de la partie"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={Math.min(numero, total)}
      aria-valuetext={`Question ${numero} sur ${total}`}
      className="grid gap-1.5"
    >
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 min-w-0 flex-1 border ${
              i < faites ? "border-encre bg-encre" : i === faites ? "border-oxyde bg-laiton" : "border-filet bg-blanc-cartel"
            }`}
          />
        ))}
      </div>
      <span className="text-[13px] text-encre-douce">
        Question <b className="date text-[16px] text-encre">{Math.min(numero, total)}</b> sur {total}
      </span>
    </div>
  );
}
