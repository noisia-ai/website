"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { users } from "@noisia/db";
import { db } from "@/lib/db";
import { getAuthenticatedAppUser } from "@/lib/auth/session";
import { defaultLocale, isAppLocale, localeCookieName, type AppLocale } from "@/i18n/locales";

export async function setUserLocaleAction(formData: FormData) {
  const requestedLocale = formData.get("locale");
  const locale = isAppLocale(requestedLocale) ? requestedLocale : defaultLocale;

  await setLocaleCookie(locale);

  const session = await getAuthenticatedAppUser();
  if (session) {
    await db
      .update(users)
      .set({
        preferences: sql`coalesce(${users.preferences}, '{}'::jsonb) || ${JSON.stringify({ locale })}::jsonb`
      })
      .where(eq(users.id, session.appUser.id));
  }

  revalidatePath("/", "layout");
}

export async function setLocaleCookie(locale: AppLocale) {
  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });
}
