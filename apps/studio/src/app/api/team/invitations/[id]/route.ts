import { and, eq } from "drizzle-orm";

import { invitations } from "@noisia/db";
import { db } from "@/lib/db";
import { canManageTeam } from "@/lib/auth/roles";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { forbidden, unauthorized } from "@/lib/api/responses";

// Revocar una invitación pendiente.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthenticatedAppUser();
  if (!session) return unauthorized();
  if (!canManageTeam(session.appUser.primaryRole)) return forbidden();

  const { id } = await params;

  const [revoked] = await db
    .update(invitations)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(and(eq(invitations.id, id), eq(invitations.status, "pending")))
    .returning({ id: invitations.id });

  if (!revoked) {
    return Response.json({ error: "not_found", message: "Invitación no encontrada o ya no está pendiente." }, { status: 404 });
  }

  return Response.json({ data: { id: revoked.id, status: "revoked" } });
}
