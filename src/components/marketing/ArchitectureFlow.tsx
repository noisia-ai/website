"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { dataLayers } from "@/content/site";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ArchitectureFlow() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      frame = 0;
      const node = rootRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const start = viewportHeight * 0.72;
      const distance = rect.height + viewportHeight * 0.24;
      const nextProgress = clamp((start - rect.top) / distance, 0, 1);
      setProgress(nextProgress);
    };

    const queueUpdate = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateProgress);
      }
    };

    queueUpdate();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);

    return () => {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  const activeIndexes = useMemo(
    () =>
      dataLayers.map((_, index) => {
        const threshold = (index + 0.32) / dataLayers.length;
        return progress >= threshold;
      }),
    [progress]
  );

  const outputsVisible = progress >= 0.88;

  return (
    <div
      className="architecture-flow glass"
      ref={rootRef}
      aria-label="Flujo de arquitectura de datos Noisia"
      style={{ "--architecture-progress": String(progress) } as CSSProperties}
    >
      {dataLayers.map((layer, index) => (
        <article className={`architecture-node ${activeIndexes[index] ? "is-active" : ""}`} key={layer.name}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{layer.name}</h3>
          <p>{layer.detail}</p>
        </article>
      ))}
      <div className={`architecture-outputs ${outputsVisible ? "is-active" : ""}`} aria-label="Capas de salida">
        <span>Evidence graph</span>
        <span>Method engine</span>
        <span>Narrative layer</span>
        <span>Export-ready output</span>
      </div>
    </div>
  );
}
