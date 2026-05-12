"use client";

import type { InsightSignal } from "@/content/insights/reports";
import styles from "./Insights.module.css";

const maturityOrder = ["emergente", "acelerando", "mainstreaming"] as const;
const maturityLabels: Record<InsightSignal["maturity"], string> = {
  emergente: "Emergente",
  acelerando: "Acelerando",
  mainstreaming: "Mainstreaming"
};

const maturityColors: Record<InsightSignal["maturity"], string> = {
  emergente: "#C9892E",
  acelerando: "#2D6A9F",
  mainstreaming: "#1D7A55"
};

function compactSignalName(input: string) {
  return input
    .replace(/^El /, "")
    .replace(/^La /, "")
    .replace(/^Lo /, "")
    .replace(" se vuelve ", " ")
    .replace(" pierde ", " ")
    .replace(" necesita ", " ")
    .replace(" empieza a ", " ");
}

export function DownloadPrintButton() {
  return (
    <button className={`button button--secondary ${styles.printButton}`} type="button" onClick={() => window.print()}>
      Descargar PDF
    </button>
  );
}

export function MaturityDistributionChart({ signals }: { signals: InsightSignal[] }) {
  const total = signals.length;

  return (
    <div className={styles.maturityChart} role="img" aria-label="Distribución de señales por madurez cultural">
      <div className={styles.lifecycleMap}>
        {maturityOrder.map((maturity) => {
          const count = signals.filter((signal) => signal.maturity === maturity).length;
          const stageSignals = signals.filter((signal) => signal.maturity === maturity);

          return (
            <span className={styles.lifecycleStage} key={maturity} style={{ ["--segment-color" as string]: maturityColors[maturity] }}>
              <i />
              <small>{maturityLabels[maturity]}</small>
              <strong>{count}</strong>
              <em>{Math.round((count / total) * 100)}%</em>
              <span>
                {stageSignals.map((signal) => (
                  <a href={`#signal-${signal.order}`} key={signal.id} title={signal.commercial_name}>
                    {String(signal.order).padStart(2, "0")}
                  </a>
                ))}
              </span>
            </span>
          );
        })}
      </div>

      <div className={styles.maturityLegend}>
        {maturityOrder.map((maturity) => (
          <span key={maturity}>
            <i style={{ ["--segment-color" as string]: maturityColors[maturity] }} />
            {maturityLabels[maturity]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SignalScaleChart({ signals }: { signals: InsightSignal[] }) {
  const max = Math.max(...signals.map((signal) => signal.volume_indicator.records_analyzed));

  return (
    <div className={styles.scaleChart} role="img" aria-label="Menciones revisadas por señal">
      {signals.map((signal) => {
        const value = signal.volume_indicator.records_analyzed;
        const width = Math.max((value / max) * 100, 6);

        return (
          <a
            className={styles.scaleRow}
            href={`#signal-${signal.order}`}
            key={signal.id}
            style={{
              ["--signal-color" as string]: signal.color,
              ["--bar-width" as string]: `${width}%`
            }}
          >
            <span className={styles.scaleName}>
              <b>{String(signal.order).padStart(2, "0")}</b>
              {compactSignalName(signal.commercial_name)}
            </span>
            <span className={styles.scaleBar}>
              <i />
            </span>
            <strong>{value.toLocaleString("es-MX")}</strong>
          </a>
        );
      })}
    </div>
  );
}

export function SignalEvidenceScatter({ signals }: { signals: InsightSignal[] }) {
  const maxMentions = Math.max(...signals.map((signal) => signal.volume_indicator.records_analyzed));
  const maxMx = Math.max(...signals.map((signal) => signal.volume_indicator.mx_evidence_estimated));

  return (
    <div className={styles.scatterChart} role="img" aria-label="Escala de conversación contra marcadores mexicanos">
      <div className={styles.scatterPlot}>
        <span className={styles.scatterAxisX}>Menciones revisadas</span>
        <span className={styles.scatterAxisY}>Marcadores MX</span>
        {signals.map((signal) => {
          const x = 8 + (signal.volume_indicator.records_analyzed / maxMentions) * 84;
          const y = 10 + (signal.volume_indicator.mx_evidence_estimated / maxMx) * 78;
          const size = 14 + signal.volume_indicator.sources_count * 5;

          return (
            <a
              className={styles.scatterPoint}
              href={`#signal-${signal.order}`}
              key={signal.id}
              style={{
                ["--signal-color" as string]: signal.color,
                ["--point-x" as string]: `${x}%`,
                ["--point-y" as string]: `${y}%`,
                ["--point-size" as string]: `${size}px`
              }}
              aria-label={`${signal.commercial_name}: ${signal.volume_indicator.records_analyzed} menciones revisadas`}
            >
              <span>{String(signal.order).padStart(2, "0")}</span>
              <strong>{signal.commercial_name}</strong>
              <small>
                {signal.volume_indicator.records_analyzed.toLocaleString("es-MX")} menciones ·{" "}
                {signal.volume_indicator.mx_evidence_estimated.toLocaleString("es-MX")} MX
              </small>
            </a>
          );
        })}
      </div>
    </div>
  );
}
