import { eq } from "drizzle-orm";

import { brandKnowledgeSources, methodologies, studyCorpora } from "@noisia/db";
import { forbidden, unauthorized, validationError } from "@/lib/api/responses";
import { canManageCorpus } from "@/lib/auth/roles";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { listBrandsForUser } from "@/lib/data/brands";
import { listReusableIndustryCorporaForUser } from "@/lib/data/corpora";
import { listThemesForUser } from "@/lib/data/themes";
import { db } from "@/lib/db";
import { normalizeStudyAnalysisPlan } from "@/lib/multimethod/analysis-plan";
import { createStudySchema } from "@/lib/validation/brand";

export async function POST(request: Request) {
  const session = await getAuthenticatedAppUser();

  if (!session) {
    return unauthorized();
  }

  if (!canManageCorpus(session.appUser.primaryRole)) {
    return forbidden();
  }

  const parsed = createStudySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const subject = parsed.data.brand_id
    ? await resolveBrandSubject(session.appUser, parsed.data.brand_id)
    : await resolveThemeSubject(session.appUser, parsed.data.theme_id ?? "");

  if (!subject) {
    return Response.json(
      { error: "not_found", message: "Sujeto de estudio no encontrado o sin acceso." },
      { status: 404 }
    );
  }

  const [methodology] = await db
    .select({
      id: methodologies.id,
      slug: methodologies.slug,
      name: methodologies.name,
      version: methodologies.version,
      status: methodologies.status
    })
    .from(methodologies)
    .where(eq(methodologies.id, parsed.data.methodology_id))
    .limit(1);

  const methodologyAllowed = methodology?.status === "active" || (methodology?.slug === "signal-pulse" && methodology.status === "beta");
  if (!methodology || !methodologyAllowed) {
    return Response.json(
      { error: "not_found", message: "Metodología activa no encontrada." },
      { status: 404 }
    );
  }

  const baseCorpus = parsed.data.base_corpus_id
    ? await resolveBaseCorpus(session.appUser, parsed.data.base_corpus_id)
    : null;
  if (parsed.data.base_corpus_id && !baseCorpus) {
    return Response.json(
      { error: "not_found", message: "Corpus baseline no encontrado o sin acceso." },
      { status: 404 }
    );
  }

  const analysisPlan = normalizeStudyAnalysisPlan(parsed.data.analysis_plan, methodology.slug);
  const cleanName = parsed.data.name.trim();
  const studyBrief = {
    study_name: cleanName,
    subject_type: subject.type,
    subject_name: subject.name,
    base_corpus_id: baseCorpus?.id ?? null,
    base_corpus_name: baseCorpus?.name ?? null,
    base_corpus_theme: baseCorpus?.themeName ?? null,
    methodology_slug: methodology.slug,
    analysis_plan: analysisPlan,
    business_question: parsed.data.business_question.trim(),
    decision_to_inform: emptyToNull(parsed.data.decision_to_inform),
    audience_segment: emptyToNull(parsed.data.audience_segment),
    category_context: emptyToNull(parsed.data.category_context),
    hypotheses: emptyToNull(parsed.data.hypotheses),
    competitive_context: emptyToNull(parsed.data.competitive_context),
    known_barriers: emptyToNull(parsed.data.known_barriers),
    known_triggers: emptyToNull(parsed.data.known_triggers),
    strategic_constraints: emptyToNull(parsed.data.strategic_constraints),
    success_criteria: emptyToNull(parsed.data.success_criteria),
    geo_focus: parsed.data.geo_focus,
    target_window_months: parsed.data.target_window_months,
    created_from: "studio_new_study_form"
  };
  const [corpus] = await db
    .insert(studyCorpora)
    .values({
      name: cleanName,
      brandId: subject.type === "brand" ? subject.id : undefined,
      themeId: subject.type === "theme" ? subject.id : undefined,
      baseCorpusId: baseCorpus?.id,
      methodologyId: methodology.id,
      methodologyVersionAtCreation: methodology.version,
      businessQuestion: parsed.data.business_question.trim(),
      decisionToInform: emptyToNull(parsed.data.decision_to_inform),
      audienceSegment: emptyToNull(parsed.data.audience_segment),
      geoFocus: parsed.data.geo_focus,
      targetWindowMonths: parsed.data.target_window_months,
      contextForm: studyBrief,
      analysisPlan,
      status: "draft",
      currentPipelineVersion: "mvp-f1",
      insightsManagerUserId: session.appUser.id
    })
    .returning({ id: studyCorpora.id });

  if (!corpus) {
    return Response.json(
      { error: "insert_failed", message: "No se pudo crear el estudio." },
      { status: 500 }
    );
  }

  await db.insert(brandKnowledgeSources).values({
    organizationId: subject.organizationId,
    brandId: subject.type === "brand" ? subject.id : undefined,
    studyCorpusId: corpus.id,
    sourceKind: "study_brief",
    title: cleanName,
    rawText: Object.entries(studyBrief)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join("\n"),
    extractedPayload: {
      summary: parsed.data.business_question.trim(),
      audience_clues: parsed.data.audience_segment ? [parsed.data.audience_segment.trim()] : [],
      cultural_codes: splitLines(parsed.data.category_context),
      competitor_clues: splitLines(parsed.data.competitive_context),
      potential_triggers: splitLines(parsed.data.known_triggers),
      potential_barriers: splitLines(parsed.data.known_barriers),
      query_language: [],
      strategic_constraints: splitLines(parsed.data.strategic_constraints),
      success_criteria: splitLines(parsed.data.success_criteria),
      recommended_use: ["query_composition", "analysis_context", "signal_editorial"],
      source: "study_brief"
    },
    status: "processed",
    createdByUserId: session.appUser.id
  });

  if (parsed.data.competitive_context?.trim()) {
    await db.insert(brandKnowledgeSources).values({
      organizationId: subject.organizationId,
      brandId: subject.type === "brand" ? subject.id : undefined,
      studyCorpusId: corpus.id,
      sourceKind: "competitive_brief",
      title: `${cleanName} · Competitive context`,
      rawText: parsed.data.competitive_context.trim(),
      extractedPayload: {
        summary: parsed.data.competitive_context.trim().slice(0, 1200),
        competitor_clues: splitLines(parsed.data.competitive_context),
        recommended_use: ["query_composition", "analysis_context", "signal_editorial", "competitive_analysis"],
        source: "study_competitive_brief"
      },
      status: "processed",
      createdByUserId: session.appUser.id
    });
  }

  return Response.json(
    {
      data: {
        id: corpus.id,
        engine_url: `/studio/corpora/${corpus.id}/engine`
      }
    },
    { status: 201 }
  );
}

async function resolveBrandSubject(
  appUser: NonNullable<Awaited<ReturnType<typeof getAuthenticatedAppUser>>>["appUser"],
  brandId: string
) {
  const brandsResult = await listBrandsForUser(appUser, { pageSize: 500 });
  const brand = brandsResult.data.find((item) => item.id === brandId);
  if (!brand) return null;

  return {
    type: "brand" as const,
    id: brand.id,
    name: brand.displayName ?? brand.name,
    organizationId: brand.organizationId
  };
}

async function resolveThemeSubject(
  appUser: NonNullable<Awaited<ReturnType<typeof getAuthenticatedAppUser>>>["appUser"],
  themeId: string
) {
  const themesResult = await listThemesForUser(appUser, { pageSize: 500 });
  const theme = themesResult.data.find((item) => item.id === themeId && item.status !== "archived");
  if (!theme) return null;

  return {
    type: "theme" as const,
    id: theme.id,
    name: theme.name,
    organizationId: theme.organizationId
  };
}

async function resolveBaseCorpus(
  appUser: NonNullable<Awaited<ReturnType<typeof getAuthenticatedAppUser>>>["appUser"],
  corpusId: string
) {
  const corpora = await listReusableIndustryCorporaForUser(appUser);
  const corpus = corpora.find((item) => item.id === corpusId);
  if (!corpus) return null;

  return {
    id: corpus.id,
    name: corpus.name,
    themeName: corpus.themeName
  };
}

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function splitLines(value: string | undefined) {
  return (value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}
