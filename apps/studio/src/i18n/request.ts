import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
  pickLocaleFromAcceptLanguage
} from "@/i18n/locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isAppLocale(cookieLocale)
    ? cookieLocale
    : pickLocaleFromAcceptLanguage(headerStore.get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale || defaultLocale}.json`)).default
  };
});
