export type VoiceCard = {
  platform: string;
  market: string;
  age: string;
  quote: string;
  position: {
    x: string;
    y: string;
    rotate: string;
  };
};

export type PipelineStep = {
  label: string;
  detail: string;
  metric: string;
  fill: string;
};

export type ForceMetric = {
  label: string;
  value: string;
  tone?: "signal" | "tension";
};

export type Recommendation = {
  title: string;
  body: string;
  move: string;
};

export const heroVoiceCards: VoiceCard[] = [
  {
    platform: "Instagram",
    market: "MX",
    age: "hace 2 h",
    quote: "Está bonito, pero no entendí por qué cuesta eso.",
    position: { x: "clamp(-620px, -35vw, -430px)", y: "clamp(-245px, -25vh, -160px)", rotate: "-8deg" }
  },
  {
    platform: "Google Reviews",
    market: "CO",
    age: "hace 1 d",
    quote: "El soporte tardó tres días y ahí se me cayó la confianza.",
    position: { x: "clamp(380px, 32vw, 590px)", y: "clamp(-235px, -22vh, -150px)", rotate: "7deg" }
  },
  {
    platform: "TikTok",
    market: "MX",
    age: "hace 8 h",
    quote: "Todo el mundo repite el mismo claim. Ya nadie se lo cree.",
    position: { x: "clamp(-700px, -41vw, -500px)", y: "clamp(18px, 6vh, 84px)", rotate: "-5deg" }
  },
  {
    platform: "Reddit",
    market: "AR",
    age: "hace 3 d",
    quote: "No necesito más features. Necesito saber qué pasa si falla.",
    position: { x: "clamp(470px, 39vw, 700px)", y: "clamp(20px, 7vh, 92px)", rotate: "6deg" }
  },
  {
    platform: "App Store",
    market: "MX",
    age: "hace 6 h",
    quote: "La app hace lo que promete, pero el onboarding me perdió.",
    position: { x: "clamp(-560px, -30vw, -350px)", y: "clamp(205px, 27vh, 285px)", rotate: "-4deg" }
  },
  {
    platform: "Foro",
    market: "PE",
    age: "hace 2 d",
    quote: "Si me explicaran mejor la diferencia entre planes, sí pagaba más.",
    position: { x: "clamp(420px, 30vw, 620px)", y: "clamp(210px, 28vh, 300px)", rotate: "4deg" }
  },
  {
    platform: "YouTube",
    market: "CL",
    age: "hace 5 h",
    quote: "El demo se ve bien, pero nadie explica qué cambia en mi día a día.",
    position: { x: "clamp(-315px, -18vw, -210px)", y: "clamp(-305px, -34vh, -230px)", rotate: "5deg" }
  },
  {
    platform: "Trustpilot",
    market: "ES",
    age: "hace 4 d",
    quote: "La promesa es fuerte, la experiencia no la sostiene igual.",
    position: { x: "clamp(210px, 18vw, 320px)", y: "clamp(-300px, -33vh, -220px)", rotate: "-5deg" }
  },
  {
    platform: "X",
    market: "BR",
    age: "hace 3 h",
    quote: "Todos dicen innovación, pero el problema real sigue siendo soporte.",
    position: { x: "clamp(-760px, -45vw, -610px)", y: "clamp(-80px, -8vh, -46px)", rotate: "4deg" }
  },
  {
    platform: "Facebook",
    market: "PE",
    age: "hace 9 h",
    quote: "Antes respondían rápido. Ahora parece que nadie se hace cargo.",
    position: { x: "clamp(610px, 45vw, 770px)", y: "clamp(-90px, -9vh, -42px)", rotate: "-6deg" }
  },
  {
    platform: "Instagram",
    market: "AR",
    age: "hace 1 d",
    quote: "Me gusta, pero necesito entender por qué vale más que la opción simple.",
    position: { x: "clamp(-580px, -36vw, -430px)", y: "clamp(150px, 19vh, 220px)", rotate: "6deg" }
  },
  {
    platform: "Google Reviews",
    market: "MX",
    age: "hace 7 h",
    quote: "La compra fue fácil. La explicación después fue donde me perdí.",
    position: { x: "clamp(430px, 36vw, 580px)", y: "clamp(155px, 20vh, 230px)", rotate: "-4deg" }
  },
  {
    platform: "TikTok",
    market: "CO",
    age: "hace 11 h",
    quote: "La gente no odia el precio. Odia sentir que le vendieron humo.",
    position: { x: "clamp(-680px, -39vw, -510px)", y: "clamp(170px, 23vh, 260px)", rotate: "-7deg" }
  },
  {
    platform: "Reddit",
    market: "MX",
    age: "hace 2 d",
    quote: "El problema no es la feature. Es que nadie confía en que funcione.",
    position: { x: "clamp(560px, 38vw, 690px)", y: "clamp(175px, 24vh, 270px)", rotate: "5deg" }
  },
  {
    platform: "App Store",
    market: "CL",
    age: "hace 1 h",
    quote: "Promete ahorro, pero me hizo perder tiempo configurando todo.",
    position: { x: "clamp(-110px, -8vw, -70px)", y: "clamp(300px, 36vh, 365px)", rotate: "-3deg" }
  },
  {
    platform: "Foro",
    market: "CO",
    age: "hace 6 d",
    quote: "Si hay garantía humana, pago. Si todo es bot, no me arriesgo.",
    position: { x: "clamp(96px, 10vw, 180px)", y: "clamp(302px, 36vh, 370px)", rotate: "3deg" }
  }
];

export const heroPipelineSteps: PipelineStep[] = [
  {
    label: "Escuchando",
    detail: "Reviews · foros · redes · marketplaces",
    metric: "2,847 señales",
    fill: "100%"
  },
  {
    label: "Limpiando",
    detail: "Duplicados fuera · contexto dentro",
    metric: "1,932 únicas",
    fill: "94%"
  },
  {
    label: "Entendiendo",
    detail: "Tono · intención · dudas · necesidades",
    metric: "8 capas",
    fill: "88%"
  },
  {
    label: "Separando",
    detail: "Lo que empuja · lo que frena",
    metric: "1,247 expresiones",
    fill: "78%"
  },
  {
    label: "Priorizando",
    detail: "Tamaño · urgencia · impacto",
    metric: "12 fuerzas",
    fill: "68%"
  },
  {
    label: "Traduciendo",
    detail: "Lectura → movimiento recomendado",
    metric: "3 movimientos",
    fill: "58%"
  }
];

export const heroMethodologyMetrics: ForceMetric[] = [
  { label: "señales de intención clara", value: "47.3%", tone: "signal" },
  { label: "dudas que frenan compra", value: "36.4%", tone: "tension" },
  { label: "pruebas de confianza pedidas", value: "31.8%", tone: "signal" },
  { label: "mensajes repetidos sin efecto", value: "27.6%", tone: "tension" }
];

export const heroStateRead = [
  { state: "Activa", share: "62", label: "motivos que conviene amplificar" },
  { state: "Frena", share: "47", label: "barreras que necesitan prueba" },
  { state: "Compara", share: "41", label: "alternativas presentes en la mente" },
  { state: "Mueve", share: "35", label: "acciones prioritarias para negocio" }
];

export const heroRecommendations: Recommendation[] = [
  {
    title: "Aterrizar la pregunta correcta",
    body: "No empezamos por métricas sueltas. Convertimos la duda del equipo en una pregunta de negocio clara: qué decisión se necesita tomar y qué evidencia la haría defendible.",
    move: "Antes de escuchar"
  },
  {
    title: "Separar señal de ruido",
    body: "Leemos conversaciones abiertas para distinguir lo que se repite, lo que pesa y lo que realmente cambia una decisión. Menos volumen bruto, más lectura útil.",
    move: "Durante la lectura"
  },
  {
    title: "Traducir evidencia a acción",
    body: "Cada salida termina en movimientos concretos: qué decir, qué ajustar, qué priorizar y qué puede presentar tu equipo con respaldo.",
    move: "Después del análisis"
  }
];

export const heroSignature = [
  { value: "Pregunta", label: "partimos de una decisión real" },
  { value: "Señales", label: "leemos conversaciones con contexto" },
  { value: "Acción", label: "cerramos con un movimiento defendible" }
];
