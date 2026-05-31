import { z } from "zod";

const roleSchema = z.enum(["noisia_admin", "analyst", "client_admin", "client_viewer"]);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(200);

// Invitar a alguien al workspace. Los roles internos (noisia_admin/analyst) no
// llevan organización; los roles de cliente requieren una.
export const createInvitationSchema = z
  .object({
    email: emailSchema,
    primary_role: roleSchema,
    organization_id: z.string().uuid().optional()
  })
  .refine(
    (data) =>
      data.primary_role === "noisia_admin" || data.primary_role === "analyst"
        ? true
        : Boolean(data.organization_id),
    {
      path: ["organization_id"],
      message: "Los roles de cliente requieren una organización."
    }
  );

// Cambiar rol / organización / estado de un usuario existente.
export const updateUserSchema = z
  .object({
    primary_role: roleSchema.optional(),
    organization_id: z.string().uuid().nullable().optional(),
    status: z.enum(["active", "suspended"]).optional()
  })
  .refine((data) => data.primary_role || data.organization_id !== undefined || data.status, {
    message: "Nada que actualizar."
  });

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
