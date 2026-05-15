import { Button } from "@/components/ui/Button";
import { CasosFilter } from "@/components/marketing/CasosFilter";
import { useCases } from "@/content/site";

export const metadata = {
  title: "Casos de uso",
  description: "Diez preguntas de negocio que Noisia puede responder con inteligencia social."
};

const heroCases = [
  {
    timing: "Respuesta",
    title: "Crisis",
    summary: "Entender qué alimenta la conversación antes de amplificarla."
  },
  {
    timing: "Defensa",
    title: "Defensa competitiva",
    summary: "Ver qué promesa del competidor se volvió más creíble."
  },
  {
    timing: "Entrada",
    title: "Nuevo mercado",
    summary: "Encontrar el permiso local antes de salir a comunicar."
  }
];

const decisionArchetypes = [
  {
    label: "Lanzar con permiso",
    title: "Cuando necesitas saber qué historia sí te cree la categoría.",
    text: "Leemos qué frustraciones, deseos y permisos ya existen para elegir un ángulo que no se sienta prestado.",
    methods: "Código cultural + motivadores",
    route: "/casos-de-uso/lanzamiento-de-campana"
  },
  {
    label: "Defender o reparar",
    title: "Cuando la fuga ya empezó y necesitas saber qué rompió la confianza.",
    text: "No buscamos quién hizo más ruido. Buscamos qué narrativa se volvió creíble y qué respuesta puede bajarle fuerza.",
    methods: "Fricción + voces clave",
    route: "/casos-de-uso/defensa-competitiva"
  },
  {
    label: "Mover la categoría",
    title: "Cuando quieres entrar, reposicionar o leer una señal antes de que sea obvia.",
    text: "La conversación muestra qué lenguaje está cambiando, quién lo valida y qué espacio puede ocupar tu marca.",
    methods: "Códigos + influencia",
    route: "/casos-de-uso/entrada-a-nuevo-mercado"
  },
  {
    label: "Encontrar oportunidad",
    title: "Cuando la oportunidad está en producto, valor o experiencia.",
    text: "Separamos deseos bonitos de necesidades mal resueltas para decidir qué mover en roadmap, portafolio o propuesta de valor.",
    methods: "Motivadores + valor percibido",
    route: "/casos-de-uso/desarrollo-de-producto"
  }
];

export default function UseCasesPage() {
  return (
    <>
      <section className="hero-experience page-hero">
        <div className="hero-experience__inner page-hero__inner">
          <div className="hero-copy">
            <span className="eyebrow">CASOS DE USO</span>
            <h1 className="display-lg">Encuentra la pregunta que más se parece a la tuya.</h1>
            <p className="body-lg">
              Noisia no se organiza por industrias rígidas. Se organiza por decisiones: lanzar, defender, entrar,
              reposicionar, optimizar o detectar una señal antes de que sea tarde.
            </p>
            <div className="hero-actions">
              <Button href="/diagnostico" variant="primary">
                Iniciar diagnóstico
              </Button>
              <Button href="#casos-grid" variant="secondary">
                Explorar casos
              </Button>
            </div>
            <div className="hero-proof">
              <div className="glass">
                <strong>10</strong>
                <span>preguntas de negocio estructuradas</span>
              </div>
              <div className="glass">
                <strong>2-10</strong>
                <span>niveles de profundidad posible</span>
              </div>
              <div className="glass">
                <strong>6</strong>
                <span>métodos combinables por pregunta</span>
              </div>
            </div>
          </div>

          <aside className="page-hero-panel glass">
            <span className="chip">Preguntas ya calibradas</span>
            <h2>No tienes que saber la metodología. Solo reconocer la decisión.</h2>
            <ul className="page-hero-list">
              {heroCases.map((item) => (
                <li key={item.title}>
                  <b>{item.title}</b>
                  <span>{item.summary}</span>
                  <small>{item.timing}</small>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <div className="section-heading">
            <span className="eyebrow">PRIMERO, UBICA EL TIPO DE DECISIÓN</span>
            <h2 className="display-md">Empieza por el tipo de movimiento que necesitas hacer.</h2>
            <p className="body-lg">
              Algunas decisiones piden permiso cultural. Otras piden reparar confianza, encontrar oportunidad o leer
              una señal que todavía no aparece en los reportes de siempre.
            </p>
          </div>

          <div className="decision-archetype-grid">
            {decisionArchetypes.map((item) => (
              <a className="decision-archetype-card glass" href={item.route} key={item.title}>
                <span className="chip">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="decision-archetype-card__meta">
                  <span>{item.methods}</span>
                  <b>
                    Ver lectura <span>→</span>
                  </b>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--compact">
        <div className="section__inner">
          <div className="section-heading">
            <span className="eyebrow">DESPUÉS, COMPARA LOS CASOS</span>
            <h2 className="display-md">Encuentra la pregunta que más se parece a la que estás enfrentando.</h2>
            <p className="body-lg">
              Cada tarjeta resume la pregunta, qué había que entender y qué tipo de salida ayuda a tomar la decisión.
            </p>
          </div>
          <div id="casos-grid">
            <CasosFilter useCases={useCases} />
          </div>
        </div>
      </section>
    </>
  );
}
