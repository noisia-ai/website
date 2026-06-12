export type SignalPulseCopyInput = {
  canonicalTitle: string;
  term: string;
  signalType: string;
  mentionCount: number;
  sentimentAvg: number | null;
  platforms: string[];
  rank: number;
};

export type SignalPulseCopy = {
  title: string;
  description: string;
  marketingRead: string;
  actionHint: string;
  interpretationSource: "deterministic_marketing_read_v2";
};

export type SignalPulseMoveInput = {
  title: string;
  moveType: string;
  lifecycle: string | null;
  confidence: string | null;
  impact: number;
  volume: number;
  marketingRead: string;
  actionHint: string;
};

export type SignalPulseMoveCopy = {
  actionText: string;
  ownerSuggestion: string;
  timing: string;
  measurementSuggestion: string;
  noGoNotes: string | null;
};

export function buildSignalPulseDeterministicRead(input: SignalPulseCopyInput): SignalPulseCopy {
  const territory = cleanTerritory(input.term || input.canonicalTitle);
  const title = titleForSignal(territory, input);
  const platformLabel = platformPhrase(input.platforms);
  const evidenceLabel = evidencePhrase(input.mentionCount);
  const sentimentLabel = sentimentPhrase(input.sentimentAvg);
  const posture = postureFor(input);

  return {
    title,
    description: `${evidenceLabel} ${platformLabel} está empujando "${territory}" con tono ${sentimentLabel}. No es una conclusión de escritorio: sale de un cluster de menciones y debe leerse como territorio accionable del mes.`,
    marketingRead: `${posture.read} El equipo puede convertirlo en una prueba concreta sin sobrerreaccionar: un hook, una pieza corta o una variante de pauta que mida respuesta real.`,
    actionHint: posture.action,
    interpretationSource: "deterministic_marketing_read_v2"
  };
}

export function buildSignalPulseMarketingMove(input: SignalPulseMoveInput): SignalPulseMoveCopy {
  const territory = cleanTerritory(input.title);
  const actionHint = stripTerminalPunctuation(input.actionHint || defaultAction(input.moveType, territory));
  const urgency = urgencyFor(input);

  return {
    actionText: actionTextFor(input.moveType, actionHint, territory),
    ownerSuggestion: ownerForMove(input.moveType),
    timing: urgency.timing,
    measurementSuggestion: measurementFor(input, territory),
    noGoNotes: noGoFor(input, urgency.reason)
  };
}

function actionTextFor(moveType: string, actionHint: string, territory: string) {
  if (moveType === "test_claim") {
    return `${actionHint}. Convertirlo en dos hooks rivales y correr una prueba chica antes de volverlo claim de campaña.`;
  }
  if (moveType === "amplify") {
    return `${actionHint}. Darle distribución controlada y compararlo contra el mensaje base, no contra intuición interna.`;
  }
  if (moveType === "monitor") {
    return `Mantener "${territory}" en monitoreo activo y preparar respuesta solo si sube volumen o negatividad.`;
  }
  return `${actionHint}. Bajarlo a una serie corta de contenido con un aprendizaje claro por pieza.`;
}

function measurementFor(input: SignalPulseMoveInput, territory: string) {
  const impactLabel = input.impact >= 65 ? "impacto alto" : input.impact >= 35 ? "impacto medio" : "impacto bajo";
  if (input.moveType === "test_claim") {
    return `Comparar hook rate, comentarios útiles y costo por interacción del territorio "${territory}" contra el control.`;
  }
  if (input.moveType === "amplify") {
    return `Medir CTR, guardados, menciones orgánicas y cambio de sentimiento; separar aprendizaje de performance por ${impactLabel}.`;
  }
  if (input.moveType === "monitor") {
    return `Revisar volumen, sentimiento y evidencia protagonista en el siguiente corte antes de activar piezas.`;
  }
  return `Medir retención, shares y comentarios con lenguaje reutilizable; cerrar decisión con ${input.volume} menciones como base.`;
}

function noGoFor(input: SignalPulseMoveInput, urgencyReason: string) {
  if (input.confidence === "alta" && input.impact >= 50) return null;
  if (input.moveType === "monitor") return `No mover presupuesto todavía: ${urgencyReason}`;
  if (input.confidence === "media") return `Mantenerlo como experimento: ${urgencyReason}`;
  return `No convertirlo en promesa fuerte hasta sumar evidencia: ${urgencyReason}`;
}

function urgencyFor(input: SignalPulseMoveInput) {
  if (input.lifecycle === "emerging") {
    return { timing: "esta semana", reason: "la señal está emergiendo y necesita validación rápida" };
  }
  if (input.lifecycle === "rising" || input.impact >= 65) {
    return { timing: "este mes", reason: "la señal ya trae momentum suficiente para una prueba visible" };
  }
  if (input.lifecycle === "declining") {
    return { timing: "siguiente corte", reason: "la señal viene perdiendo fuerza" };
  }
  return { timing: "siguiente sprint", reason: "la señal todavía necesita aprendizaje incremental" };
}

function ownerForMove(moveType: string) {
  if (moveType === "amplify") return "Paid media + Brand";
  if (moveType === "test_claim") return "Brand + Creative";
  if (moveType === "monitor") return "Insights";
  return "Social + Content";
}

function defaultAction(moveType: string, territory: string) {
  if (moveType === "test_claim") return `Testear "${territory}" como claim específico`;
  if (moveType === "amplify") return `Amplificar "${territory}" con presupuesto controlado`;
  if (moveType === "monitor") return `Monitorear "${territory}" sin escalarlo todavía`;
  return `Convertir "${territory}" en contenido de prueba`;
}

function titleForSignal(territory: string, input: SignalPulseCopyInput) {
  const core = titleCase(territory).replace(/^Territorio\s+/i, "");
  if (input.signalType === "risk") return `Fricción: ${core}`;
  if (input.signalType === "opportunity") return `Oportunidad: ${core}`;
  if (input.rank <= 3) return `Prioridad: ${core}`;
  return core;
}

function postureFor(input: SignalPulseCopyInput) {
  const territory = cleanTerritory(input.term || input.canonicalTitle);
  if (input.signalType === "risk" || (input.sentimentAvg ?? 0) < -0.12) {
    return {
      read: `La señal marca una fricción que conviene contener antes de amplificar el territorio.`,
      action: `Preparar una respuesta de contenido que reduzca duda sobre "${territory}" y medir si baja la conversación negativa.`
    };
  }
  if (input.signalType === "opportunity" || (input.sentimentAvg ?? 0) > 0.18) {
    return {
      read: `La señal trae energía positiva suficiente para probarla como ángulo creativo.`,
      action: `Testear "${territory}" como claim o hook principal en una celda pequeña de contenido/pauta.`
    };
  }
  return {
    read: `La señal todavía no pide una apuesta grande; pide aprender rápido si el territorio mueve respuesta.`,
    action: `Convertir "${territory}" en una prueba de bajo costo y comparar contra el mensaje base del mes.`
  };
}

function evidencePhrase(count: number) {
  if (count >= 80) return `${count} menciones sostienen una señal de alta presencia.`;
  if (count >= 30) return `${count} menciones sostienen una señal con tracción suficiente.`;
  if (count >= 8) return `${count} menciones alcanzan para una lectura direccional.`;
  return `${count} menciones apenas alcanzan para monitoreo.`;
}

function sentimentPhrase(value: number | null) {
  if (value === null) return "sin polaridad clara";
  if (value > 0.35) return "muy favorable";
  if (value > 0.12) return "favorable";
  if (value < -0.28) return "crítico";
  if (value < -0.08) return "cauto";
  return "mixto";
}

function platformPhrase(platforms: string[]) {
  const clean = platforms.map((platform) => platform.trim()).filter(Boolean).slice(0, 2);
  if (clean.length === 0) return "El corpus";
  if (clean.length === 1) return `En ${clean[0]}, el corpus`;
  return `En ${clean[0]} y ${clean[1]}, el corpus`;
}

function cleanTerritory(value: string) {
  return value
    .replace(/^territorio\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() || "señal de conversación";
}

function stripTerminalPunctuation(value: string) {
  return value.trim().replace(/[.!?]+$/g, "");
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
