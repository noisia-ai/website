"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { diagnosticSteps } from "@/content/site";

const fields = [
  {
    label: "Tu organización",
    helper: "Nombre, rol, empresa y país de operación.",
    input: "Nombre, rol y empresa"
  },
  {
    label: "Tu pregunta de negocio",
    helper: "La parte más importante: qué decisión necesitas tomar.",
    input: "¿Cuál es la pregunta que te trae aquí?"
  },
  {
    label: "Lo que ya tienes",
    helper: "Research previo, data, herramientas o intuiciones.",
    input: "¿Qué evidencia o research ya existe?"
  },
  {
    label: "Alcance y tiempo",
    helper: "Deadline, urgencia, presupuesto aproximado y nivel de profundidad.",
    input: "¿Cuándo necesitas resultados accionables?"
  },
  {
    label: "Categoría y mercado",
    helper: "Industria, mercados relevantes y competidores a mirar.",
    input: "Categoría, mercado y competidores"
  },
  {
    label: "Cómo prefieres avanzar",
    helper: "Email con preguntas, llamada de 30 minutos o respuesta sin presión.",
    input: "Email de contacto"
  },
  {
    label: "Confirmación",
    helper: "Revisaremos el diagnóstico y responderemos en dos días hábiles.",
    input: "Notas finales"
  }
];

export function DiagnosticWizard() {
  const [current, setCurrent] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const active = fields[current];

  useEffect(() => {
    const stored = window.localStorage.getItem("noisia-diagnostic-draft");
    if (stored) setDraft(JSON.parse(stored) as Record<string, string>);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("noisia-diagnostic-draft", JSON.stringify(draft));
  }, [draft]);

  const progress = useMemo(() => Math.round(((current + 1) / diagnosticSteps.length) * 100), [current]);

  return (
    <div className="diagnostic-wizard glass">
      <div className="wizard-progress">
        <span>{current + 1}/{diagnosticSteps.length}</span>
        <div>
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="wizard-layout">
        <nav aria-label="Pasos de diagnóstico">
          {diagnosticSteps.map((step, index) => (
            <button
              className={current === index ? "is-active" : ""}
              key={step}
              onClick={() => setCurrent(index)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </button>
          ))}
        </nav>
        <form className="wizard-form">
          <span className="eyebrow">{active.label}</span>
          <h2>{active.helper}</h2>
          <label>
            <span>{active.input}</span>
            {current === 1 || current === 2 || current === 6 ? (
              <textarea
                onChange={(event) => setDraft((next) => ({ ...next, [active.label]: event.target.value }))}
                placeholder="Escribe con contexto. Uno de nuestros arquitectos lo leerá antes de cualquier llamada."
                rows={7}
                value={draft[active.label] ?? ""}
              />
            ) : (
              <input
                onChange={(event) => setDraft((next) => ({ ...next, [active.label]: event.target.value }))}
                placeholder="Respuesta breve"
                value={draft[active.label] ?? ""}
              />
            )}
          </label>
          <div className="wizard-actions">
            <button disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))} type="button">
              <ArrowLeft size={16} strokeWidth={1.8} />
              Atrás
            </button>
            <button
              onClick={() => setCurrent((value) => Math.min(diagnosticSteps.length - 1, value + 1))}
              type="button"
            >
              {current === diagnosticSteps.length - 1 ? "Guardar borrador" : "Siguiente"}
              <ArrowRight size={16} strokeWidth={1.8} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
