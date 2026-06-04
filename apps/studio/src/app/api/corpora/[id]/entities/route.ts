import { corpusEntities } from "@noisia/db";

import { forbidden, unauthorized, validationError } from "@/lib/api/responses";
import { canManageCorpus } from "@/lib/auth/roles";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { getCorpusForUser, listCorpusEntitiesForCorpus } from "@/lib/data/corpora";
import { db } from "@/lib/db";
import { upsertCorpusEntitySchema } from "@/lib/validation/brand";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthenticatedAppUser();

  if (!session) return unauthorized();
  if (!canManageCorpus(session.appUser.primaryRole)) return forbidden();

  const { id } = await context.params;
  const corpus = await getCorpusForUser(session.appUser, id);

  if (!corpus) {
    return Response.json(
      { error: "not_found", message: "Corpus not found or not accessible." },
      { status: 404 }
    );
  }

  const data = await listCorpusEntitiesForCorpus(corpus.id);
  return Response.json({ data });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthenticatedAppUser();

  if (!session) return unauthorized();
  if (!canManageCorpus(session.appUser.primaryRole)) return forbidden();

  const { id } = await context.params;
  const corpus = await getCorpusForUser(session.appUser, id);

  if (!corpus) {
    return Response.json(
      { error: "not_found", message: "Corpus not found or not accessible." },
      { status: 404 }
    );
  }

  const parsed = upsertCorpusEntitySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);

  const [entity] = await db
    .insert(corpusEntities)
    .values({
      studyCorpusId: corpus.id,
      competitorId: parsed.data.competitor_id,
      entityKind: parsed.data.entity_kind,
      name: parsed.data.name.trim(),
      aliases: parsed.data.aliases,
      handles: parsed.data.handles,
      querySeeds: parsed.data.query_seeds,
      notes: parsed.data.notes,
      isCategoryBaseline: parsed.data.is_category_baseline,
      priority: parsed.data.priority,
      status: parsed.data.status,
      createdByUserId: session.appUser.id
    })
    .returning({ id: corpusEntities.id });

  return Response.json({ data: { id: entity?.id } }, { status: 201 });
}
