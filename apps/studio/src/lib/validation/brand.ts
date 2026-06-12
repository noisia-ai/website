import { z } from "zod";

const countryCodeSchema = z.string().length(2).transform((value) => value.toUpperCase());
const optionalText = (max: number, min = 0) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    min > 0 ? z.string().min(min).max(max).optional() : z.string().max(max).optional()
  );
const shortListItem = (max: number, min = 1) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : value),
    z.string().min(min).max(max)
  );

export const createBrandSchema = z.object({
  organization_id: z.string().uuid().optional(),
  organization_name: optionalText(180, 2),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2).max(160),
  display_name: optionalText(160),
  industry: optionalText(80, 2),
  industry_sub: optionalText(80, 2),
  countries: z.array(countryCodeSchema).min(1).default(["MX"]),
  description: optionalText(12000),
  brand_seed_handles: z.array(shortListItem(240)).default([]),
  competitors: z.array(shortListItem(240, 2)).default([]),
  knowledge_notes: optionalText(50000),
  status: z.enum(["active", "paused", "archived"]).default("active"),
  primary_brand_manager_user_id: z.string().uuid().optional()
}).refine((data) => data.organization_id || data.organization_name, {
  path: ["organization_name"],
  message: "Selecciona una organización o crea una nueva."
});

export const updateBrandSchema = z.object({
  organization_id: z.string().uuid(),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2).max(160),
  display_name: optionalText(160),
  industry: optionalText(80, 2),
  industry_sub: optionalText(80, 2),
  countries: z.array(countryCodeSchema).min(1).default(["MX"]),
  description: optionalText(12000),
  brand_seed_handles: z.array(shortListItem(240)).default([]),
  status: z.enum(["active", "paused", "archived"]).default("active")
});

export const createThemeSchema = z.object({
  organization_id: z.string().uuid().optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2).max(180),
  description: z.string().max(3000).optional(),
  industry_focus: z.array(z.string().min(2).max(80)).default([]),
  geo_focus: z.array(countryCodeSchema).min(1).default(["MX"]),
  status: z.enum(["draft", "active", "published", "archived"]).default("draft"),
  is_public: z.boolean().default(false)
});

export const createStudySchema = z.object({
  name: z.string().min(3).max(180),
  brand_id: z.string().uuid().optional(),
  theme_id: z.string().uuid().optional(),
  base_corpus_id: z.string().uuid().optional(),
  methodology_id: z.string().uuid(),
  analysis_plan: z.object({
    version: z.literal(1).optional(),
    report_kind: z.enum(["signal", "signal_pulse"]).optional(),
    primary_methodology_slug: z.string().max(120).optional(),
    selected_lenses: z.array(z.string().max(120)).max(40).optional(),
    lens_configs: z.record(z.unknown()).optional(),
    composer_modules: z.array(z.string().max(120)).max(40).optional(),
    marketing_brief: z.record(z.unknown()).optional(),
    budget_cap_usd: z.coerce.number().positive().max(1000).optional()
  }).optional(),
  business_question: z.string().min(10).max(800),
  decision_to_inform: optionalText(800),
  audience_segment: optionalText(400),
  category_context: optionalText(1200),
  hypotheses: optionalText(1200),
  competitive_context: optionalText(2400),
  known_barriers: optionalText(1200),
  known_triggers: optionalText(1200),
  strategic_constraints: optionalText(1200),
  success_criteria: optionalText(1200),
  geo_focus: z.array(countryCodeSchema).min(1).max(6).default(["MX"]),
  target_window_months: z.coerce.number().int().min(1).max(36).default(12)
}).refine((data) => Number(Boolean(data.brand_id)) + Number(Boolean(data.theme_id)) === 1, {
  path: ["brand_id"],
  message: "Selecciona una marca o un theme, pero no ambos."
}).refine((data) => !data.base_corpus_id || Boolean(data.brand_id), {
  path: ["base_corpus_id"],
  message: "El baseline de industria sólo aplica para estudios de marca."
});

const corpusEntityKindSchema = z.enum(["primary_brand", "competitor", "category"]);

export const upsertCorpusEntitySchema = z.object({
  competitor_id: z.string().uuid().optional(),
  entity_kind: corpusEntityKindSchema.default("competitor"),
  name: z.string().min(2).max(180),
  aliases: z.array(shortListItem(240, 1)).default([]),
  handles: z.array(shortListItem(240, 1)).default([]),
  query_seeds: z.array(shortListItem(240, 1)).default([]),
  notes: optionalText(4000),
  is_category_baseline: z.boolean().default(false),
  priority: z.coerce.number().int().min(0).max(999).optional(),
  status: z.enum(["active", "archived"]).default("active")
}).refine((data) => !data.is_category_baseline || data.entity_kind === "category", {
  path: ["is_category_baseline"],
  message: "Category baseline debe ser una entidad de tipo category."
});
