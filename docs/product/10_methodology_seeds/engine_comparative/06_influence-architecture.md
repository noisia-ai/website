# 06 · Influence Architecture

`slug: influence-architecture` · status: seed → diseño · prioridad: **media** (requiere metadata de autores)

> Mapea nodos, comunidades, voces e influencia por entidad: quién diseña, sin saberlo, el imaginario de la categoría.

---

## Resumen (formato cliente)

- **Nombre:** Influence Architecture
- **Objetivo:** Mapear la arquitectura de influencia: nodos (creadores, medios, comunidades, fans, detractores), comunidades y cómo se mueve la influencia entre ellas, por entidad.
- **Cuándo se usa:** estrategia de influencers/PR, activación de comunidad, detección de detractores estructurales.
- **Entidades comparadas:** marca vs competidores (¿quién es más influyente en qué comunidad?).
- **Inputs necesarios:** corpus 2,000–10,000+ con **metadata robusta de autores** (`authors`: handle, follower, comunidad/plataforma, verificado, business). Discord/subreddits/foros/X.
- **Dimensiones/ejes:** **tipo de nodo** {architect, translator, amplifier, validator, practitioner, critic} × comunidad × tipo de tie (mentoría/validación/translación).
- **Cómo se puntúa:** por nodo → influence_score (engagement·alcance·centralidad), role, comunidad; por entidad → influencia agregada y nodo más influyente por comunidad.
- **Outputs esperados:** grafo de comunidades, top nodes, distribución de roles, translation points, entidad más influyente por comunidad, estrategia de activación.
- **Ejemplo de insight:** *"El 'architect' del vocabulario de la categoría es un detractor de tu marca con 0 seguidores comprados pero centralidad 0.41 — invitarlo importa más que 10 macro-influencers."*
- **Prioridad:** media (necesita infraestructura de red).

## Marco técnico

- **entity:** marcas; **+ nodos** (`authors`) y comunidades (cluster).
- **unit of analysis:** **autor/nodo** y la arista (tie) entre nodos.
- **dimensions:** `node_role`, `community`, `tie_type` → `engine_findings.dimensions`; aristas en estructura grafo.
- **scoring:** `influence_score = w1·engagement_norm + w2·reach_norm + w3·graph_centrality`; centralidad por co-mención/co-comunidad. Engagement viene de `mentions.engagement` (jsonb), reach de `authors.follower_count_last_seen`.
- **evidence:** posts representativos por nodo + ejemplos de cross-community.
- **output contract:** `methodology_blocks.influence_architecture` (stub: `rows[{node_or_community,entity,influence_score,evidence_count}]`).

## Datos y qué necesita para un resultado real

- **Imprescindible:** `authors` poblado y menciones con `author_id` + `engagement`. Sin metadata de autor no hay grafo (pre-flight lo valida). Es la metodología más dependiente de calidad de fuente.
- **Para "real":** plataformas con estructura de comunidad (Reddit/Discord/foros) > feeds anónimos. Reach comprado se filtra (verificado/business + ratio engagement/follower).
- **Distinguir** influencer mediático (alcance) vs nodo arquitectónico (centralidad) — el valor está en el segundo.

## Voyage + Opus

- Voyage: agrupa autores por similitud temática → comunidades; recupera el corpus de cada nodo para clasificar su rol.
- Opus: clasifica cada nodo a su rol (architect/translator/…) leyendo su contenido, y tipifica los ties. No calcula centralidad (eso es grafo determinista).

## Diseño de charts

1. **Chart primario — `force_graph` interactivo.** Nodos coloreados por rol, tamaño = influence_score, clusters = comunidad; aristas = ties. Hover = perfil; click = drawer con posts. Filtro por entidad y por comunidad — **muy interactivo**.
2. **Chart soporte — `top_nodes_cards`.** Perfil + rol + comunidad + score de los nodos clave; orden por influencia o por centralidad (toggle).
3. **Chart evidencia — `sankey/flow` de translation.** Flujo de influencia entre comunidades (translation points que mueven narrativa de una comunidad a otra).

**Conclusiones:** `top_nodes[]`, `role_distribution`, `translation_points[]`, `most_influential_per_community`, `activation_strategy[]` (a quién invitar, qué comunidad cultivar).

## Output contract

```jsonc
"influence_architecture": {
  "kind": "influence_architecture",
  "nodes": [ { "author_id","handle","role","community","influence_score","centrality","entity_affinity","evidence_ids":[...],"confidence" } ],
  "edges": [ { "source","target","tie_type","weight" } ],
  "communities": [...], "translation_points": [...], "activation_strategy": [...], "limitations": [...]
}
```

## Confianza / limitaciones

Sin metadata de autor suficiente → no se publica grafo. Centralidad con corpus chico es inestable (se marca). Capa #16 por nodo.
</content>
</invoke>
