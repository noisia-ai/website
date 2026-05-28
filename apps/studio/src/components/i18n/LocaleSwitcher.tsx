"use client";

import { useTransition } from "react";

import type { AppLocale } from "@/i18n/locales";

type LocaleSwitcherProps = {
  locale: AppLocale;
  labels: Record<AppLocale, string>;
  action: (formData: FormData) => Promise<void>;
};

export function LocaleSwitcher({ locale, labels, action }: LocaleSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => {
          void action(formData);
        });
      }}
      className="locale-switcher"
      aria-label="Language"
    >
      <select
        name="locale"
        defaultValue={locale}
        disabled={isPending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
