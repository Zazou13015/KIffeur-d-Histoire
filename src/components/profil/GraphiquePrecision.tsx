import { mois, pourcentage, type PointPrecision } from "@/lib/profil/types";
import styles from "./Profil.module.css";

export function GraphiquePrecision({ points }: { points: PointPrecision[] }) {
  if (!points.length) return null;
  const left = 46,
    right = 580,
    top = 16,
    bottom = 170;
  const dates = points.map((p) => new Date(p.month).getTime());
  const x = (index: number) =>
    points.length === 1
      ? (left + right) / 2
      : left +
        ((dates[index] - dates[0]) / (dates.at(-1)! - dates[0])) *
          (right - left);
  const y = (value: number) => bottom - (value / 100) * (bottom - top);
  return (
    <figure>
      <svg
        className={styles.chart}
        viewBox="0 0 600 200"
        role="img"
        aria-labelledby="precision-graphique-titre precision-graphique-description"
      >
        <title id="precision-graphique-titre">
          Évolution de ta précision moyenne
        </title>
        <desc id="precision-graphique-description">
          De {mois(points[0].month)} à {mois(points.at(-1)!.month)}. Les valeurs
          détaillées sont disponibles dans le tableau suivant.
        </desc>
        {[0, 50, 100].map((value) => (
          <g key={value}>
            <line
              x1={left}
              x2={right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--color-filet)"
              strokeDasharray="3 5"
            />
            <text
              x="0"
              y={y(value) + 4}
              fill="var(--color-encre-douce)"
              fontSize="12"
            >
              {value} %
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <polyline
            points={points
              .map((p, i) => `${x(i)},${y(p.average_accuracy)}`)
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
        )}
        {points.map((p, i) => (
          <circle
            key={p.month}
            cx={x(i)}
            cy={y(p.average_accuracy)}
            r="4"
            fill="currentColor"
          >
            <title>{`${mois(p.month)} : ${pourcentage(p.average_accuracy)}`}</title>
          </circle>
        ))}
        <text x={left} y="195" fontSize="12" fill="var(--color-encre-douce)">
          {mois(points[0].month)}
        </text>
        {points.length > 1 && (
          <text
            x={right}
            y="195"
            textAnchor="end"
            fontSize="12"
            fill="var(--color-encre-douce)"
          >
            {mois(points.at(-1)!.month)}
          </text>
        )}
      </svg>
      <figcaption className={styles.muted}>
        Les 12 derniers mois avec des parties. Chaque point représente la
        moyenne des parties du mois.
      </figcaption>
      <details className="mt-3">
        <summary className="cible cursor-pointer py-2 underline">
          Lire les valeurs du graphique
        </summary>
        <table className={styles.table}>
          <caption className="sr-only">Précision moyenne par mois</caption>
          <thead>
            <tr>
              <th scope="col">Mois</th>
              <th scope="col">Parties</th>
              <th scope="col">Précision</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.month}>
                <th scope="row">{mois(p.month)}</th>
                <td>{p.games}</td>
                <td>{pourcentage(p.average_accuracy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
