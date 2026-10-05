// Logo : sceau rond « KH » en laiton sur encre, avec ou sans le nom du jeu.
export function Sceau({ taille = 54 }: { taille?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative grid flex-none place-items-center rounded-sceau border-2 border-laiton bg-encre before:absolute before:inset-1 before:rounded-sceau before:border before:border-laiton"
      style={{ width: taille, height: taille }}
    >
      <span className="font-titre tracking-[-0.04em] text-laiton" style={{ fontSize: taille * 0.39 }}>
        KH
      </span>
    </span>
  );
}

export function Logo({ surTitre }: { surTitre?: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <Sceau />
      <div>
        {surTitre && <div className="inventaire">{surTitre}</div>}
        <p className="font-titre text-[clamp(24px,3vw,32px)] leading-[1.05]">
          Kiffeurs <span className="text-laiton">d&apos;</span>Histoire
        </p>
      </div>
    </div>
  );
}
