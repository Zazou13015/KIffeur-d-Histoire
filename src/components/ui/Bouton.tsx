import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "primaire" | "secondaire" | "oxyde";

const BASE =
  "cible inline-flex items-center justify-center gap-2 px-4 py-2.5 font-bold tracking-[0.02em] transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTES: Record<Variante, string> = {
  primaire: "border border-encre bg-encre text-papier hover:bg-encre-douce disabled:hover:bg-encre",
  secondaire: "border border-encre bg-blanc-cartel text-encre hover:bg-papier",
  oxyde: "border border-oxyde bg-oxyde text-blanc-cartel hover:brightness-110",
};

type Props = {
  variante?: Variante;
  /** Si fourni, le bouton est un lien (même apparence). */
  href?: string;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Bouton({ variante = "primaire", href, children, className = "", type = "button", ...reste }: Props) {
  const classes = `${BASE} ${VARIANTES[variante]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} {...reste}>
      {children}
    </button>
  );
}
