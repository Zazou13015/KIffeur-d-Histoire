type Props = {
  /** Secondes restantes. */
  restant: number;
  /** Durée totale en secondes. */
  total: number;
  taille?: number;
};

// Anneau qui se vide. Le temps est écrit en chiffres au centre : l'anneau n'est qu'un renfort visuel.
export function ChronoCirculaire({ restant, total, taille = 72 }: Props) {
  const epaisseur = 6;
  const rayon = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  const part = total > 0 ? Math.min(1, Math.max(0, restant / total)) : 0;
  const urgent = part <= 0.2;
  return (
    <div
      role="timer"
      aria-label={`Temps restant : ${Math.ceil(restant)} secondes`}
      className="relative inline-grid place-items-center"
      style={{ width: taille, height: taille }}
    >
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} aria-hidden="true" className="-rotate-90">
        <circle cx={taille / 2} cy={taille / 2} r={rayon} fill="none" strokeWidth={epaisseur} className="stroke-filet" />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          strokeWidth={epaisseur}
          strokeLinecap="butt"
          strokeDasharray={circonference}
          strokeDashoffset={circonference * (1 - part)}
          className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${urgent ? "stroke-oxyde" : "stroke-encre-douce"}`}
        />
      </svg>
      <span
        aria-hidden="true"
        className={`date absolute text-[26px] leading-none ${urgent ? "text-oxyde" : "text-encre"}`}
      >
        {Math.ceil(restant)}
      </span>
    </div>
  );
}
