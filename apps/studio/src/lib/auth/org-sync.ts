import { and, eq } from "drizzle-orm";

import { brands, userBrandAccess } from "@noisia/db";
import { db } from "@/lib/db";
import { brandAccessLevelForRole, isInternalRole, normalizeRole } from "@/lib/auth/roles";

export async function syncClientBrandAccessForOrganization(args: {
  userId: string;
  role: string;
  organizationId: string | null;
}) {
  const canonicalRole = normalizeRole(args.role);
  if (!canonicalRole || isInternalRole(canonicalRole) || !args.organizationId) return;

  const brandRows = await db
    .select({ id: brands.id })
    .from(brands)
    .where(and(eq(brands.organizationId, args.organizationId), eq(brands.status, "active")));

  // TODO mejora-futura: reemplazar este grant por invitaciones con scope por marca.
  // Para MVP, un cliente dentro de la organizacion Kinde recibe acceso read/comment
  // a las marcas activas de esa organizacion en Noisia.
  const accessLevel = brandAccessLevelForRole(canonicalRole);

  for (const brand of brandRows) {
    await db
      .insert(userBrandAccess)
      .values({
        userId: args.userId,
        brandId: brand.id,
        accessLevel
      })
      .onConflictDoUpdate({
        target: [userBrandAccess.userId, userBrandAccess.brandId],
        set: {
          accessLevel,
          revokedAt: null
        }
      });
  }
}

