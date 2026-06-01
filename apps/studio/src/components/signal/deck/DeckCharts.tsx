/* Vector-only chart primitives for the press deck.
   No recharts, no client runtime, no raster — just inline SVG and CSS bars
   so the printed PDF stays light and crisp. Server components. */

import type { ReactNode } from "react";

export type DeckSlice = { label: string; value: number; color: string };

const TAU = Math.PI * 2;

/** Donut built from stroked arc segments on a single circle. */
export function DeckDonut({
  slices,
  size = 360,
  thickness = 46,
  centerTop,
  centerBottom,
}: {
  slices: DeckSlice[];
  size?: number;
  thickness?: number;
  centerTop?: ReactNode;
  centerBottom?: ReactNode;
}) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = TAU * r;
  let offset = 0;

  return (
    <div className="deck-svg-wrap" style={{ position: "relative", width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution donut">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef0f1" strokeWidth={thickness} />
        {slices.map((slice) => {
          const frac = Math.max(0, slice.value) / total;
          const len = frac * circ;
          const seg = (
            <circle
              key={slice.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      {(centerTop || centerBottom) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          {centerTop && (
            <strong style={{ fontSize: 56, fontWeight: 700, color: "#0a0a0a", lineHeight: 0.9 }}>{centerTop}</strong>
          )}
          {centerBottom && <span style={{ fontSize: 19, color: "#8a9099" }}>{centerBottom}</span>}
        </div>
      )}
    </div>
  );
}

export function DeckLegend({ slices, total }: { slices: DeckSlice[]; total: number }) {
  const safeTotal = total || slices.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <ul className="deck-chart-legend">
      {slices.map((slice) => (
        <li key={slice.label}>
          <i style={{ background: slice.color }} />
          <span>{slice.label}</span>
          <strong style={{ marginLeft: 6 }}>{Math.round((slice.value / safeTotal) * 100)}%</strong>
          <em>{new Intl.NumberFormat("en-US").format(slice.value)}</em>
        </li>
      ))}
    </ul>
  );
}

/** Horizontal CSS bars — vector, no SVG needed. */
export function DeckBars({
  rows,
  color = "var(--deck-signal-dark)",
}: {
  rows: { label: string; value: number; color?: string }[];
  color?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="deck-bars">
      {rows.map((row) => (
        <div className="deck-bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="deck-bar-track">
            <div
              className="deck-bar-fill"
              style={{ width: `${Math.max(4, Math.round((row.value / max) * 100))}%`, background: row.color ?? color }}
            />
          </div>
          <b>{new Intl.NumberFormat("en-US").format(row.value)}</b>
        </div>
      ))}
    </div>
  );
}
