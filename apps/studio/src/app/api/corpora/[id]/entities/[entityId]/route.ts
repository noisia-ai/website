import { and, eq } from "drizzle-orm";

import { corpusEntities } from "@noisia/db";
import { forbidden, unauthorized, validationError } from "@/lib/api/responses";
import { canManageCorpus } from "@/lib/auth/roles";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { getCorpusForUser } from "@/lib/data/corpora";
import { db } from "@/lib/db";
import { upsertCorpusEntitySchema } from "@/lib/validation/brand";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; entityId: string }> }) {
  const session = await getAuthenticatedAppUser();

  if (!session) return unauthorized();
  if (!canManageCorpus(session.appUser.primaryRole)) return forbidden();

  const { id, entityId } = await context.params;
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
    .update(corpusEntities)
    .set({
      competitorId: parsed.data.competitor_id,
      entityKind: parsed.data.entity_kind,
      name: parsed.data.name.trim(),
      aliases: parsed.data.aliases,
      handles: parsed.data.handles,
      querySeeds: parsed.data.query_seeds,
      notes: parsed.data.notes,
      isCategoryBaseline: parsed.data.is_category_baseline,
      priority: parsed.data.priority,
      status: parsed.data.status
    })
    .where(and(eq(corpusEntities.id, entityId), eq(corpusEntities.studyCorpusId, corpus.id)))
    .returning({ id: corpusEntities.id });

  if (!entity) {
    return Response.json(
      { error: "not_found", message: "Entity not found." },
      { status: 404 }
    );
  }

  return Response.json({ data: { id: entity.id } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; entityId: string }> }) {
  const session = await getAuthenticatedAppUser();

  if (!session) return unauthorized();
  if (!canManageCorpus(session.appUser.primaryRole)) return forbidden();

  const { id, entityId } = await context.params;
  const corpus = await getCorpusForUser(session.appUser, id);

  if (!corpus) {
    return Response.json(
      { error: "not_found", message: "Corpus not found or not accessible." },
      { status: 404 }
    );
  }

  const [entity] = await db
    .update(corpusEntities)
    .set({ status: "archived" })
    .where(and(eq(corpusEntities.id, entityId), eq(corpusEntities.studyCorpusId, corpus.id)))
    .returning({ id: corpusEntities.id });

  if (!entity) {
    return Response.json(
      { error: "not_found", message: "Entity not found." },
      { status: 404 }
    );
  }

  return Response.json({ data: { id: entity.id, status: "archived" } });
}
