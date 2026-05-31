import { alias } from "drizzle-orm/pg-core";
import { asc, desc, eq } from "drizzle-orm";

import { invitations, organizations, users } from "@noisia/db";
import { db } from "@/lib/db";

export type TeamMember = {
  id: string;
  email: string;
  fullName: string | null;
  primaryRole: string;
  userType: string;
  status: string;
  organizationId: string | null;
  organizationName: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type PendingInvitation = {
  id: string;
  email: string;
  primaryRole: string;
  organizationId: string | null;
  organizationName: string | null;
  invitedByName: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export async function listTeamMembers(): Promise<TeamMember[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      primaryRole: users.primaryRole,
      userType: users.userType,
      status: users.status,
      organizationId: users.organizationId,
      organizationName: organizations.displayName,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt
    })
    .from(users)
    .leftJoin(organizations, eq(organizations.id, users.organizationId))
    .orderBy(desc(users.createdAt));
}

export async function listPendingInvitations(): Promise<PendingInvitation[]> {
  const inviter = alias(users, "inviter");
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      primaryRole: invitations.primaryRole,
      organizationId: invitations.organizationId,
      organizationName: organizations.displayName,
      invitedByName: inviter.fullName,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt
    })
    .from(invitations)
    .leftJoin(organizations, eq(organizations.id, invitations.organizationId))
    .leftJoin(inviter, eq(inviter.id, invitations.invitedByUserId))
    .where(eq(invitations.status, "pending"))
    .orderBy(desc(invitations.createdAt));
}

export async function listOrganizationsForPicker() {
  return db
    .select({
      id: organizations.id,
      name: organizations.displayName,
      legalName: organizations.legalName
    })
    .from(organizations)
    .orderBy(asc(organizations.legalName));
}
