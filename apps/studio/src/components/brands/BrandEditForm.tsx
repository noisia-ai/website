"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/ui/Icon";
import { INDUSTRY_OPTIONS, subindustriesForIndustry } from "@/lib/industry-catalog";

type EditableBrand = {
  id: string;
  slug: string;
  name: string;
  displayName: string | null;
  industry: string | null;
  industrySub: string | null;
  countries: string[] | null;
  description: string | null;
  brandSeedHandles: string[] | null;
  status: string;
};

export function BrandEditForm({ brand }: { brand: EditableBrand }) {
  const t = useTranslations("BrandEdit");
  const brandT = useTranslations("BrandOs.form");
  const router = useRouter();
  const [industryValue, setIndustryValue] = useState(brand.industry ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      slug: String(form.get("slug") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      display_name: String(form.get("display_name") ?? "").trim(),
      industry: String(form.get("industry") ?? "").trim(),
      industry_sub: String(form.get("industry_sub") ?? "").trim(),
      countries: splitList(String(form.get("countries") ?? "MX")).map((item) => item.toUpperCase()),
      description: String(form.get("description") ?? "").trim(),
      brand_seed_handles: splitList(String(form.get("brand_seed_handles") ?? "")),
      status: String(form.get("status") ?? "active")
    };

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(json, t("fallbackSaveError"), brandT("fieldFallback"), brandT("invalidFallback")));
      router.push(`/studio/brands/${brand.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("fallbackSaveError"));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="new-study-shell brand-os-shell" onSubmit={onSubmit}>
      <section className="new-study-panel">
        <div className="new-study-section-head">
          <p className="vitals-eyebrow">{brandT("identityEyebrow")}</p>
          <h2>{t("formTitle")}</h2>
        </div>

        <div className="new-study-grid">
          <label className="new-study-field">
            <span>{brandT("brand")}</span>
            <input className="filter-input new-study-input" name="name" required minLength={2} maxLength={160} defaultValue={brand.name} />
          </label>
          <label className="new-study-field">
            <span>{brandT("displayName")}</span>
            <input className="filter-input new-study-input" name="display_name" maxLength={160} defaultValue={brand.displayName ?? ""} />
          </label>
        </div>

        <div className="new-study-grid">
          <label className="new-study-field">
            <span>{brandT("slug")}</span>
            <input className="filter-input new-study-input" name="slug" required defaultValue={brand.slug} />
          </label>
          <label className="new-study-field">
            <span>{t("status")}</span>
            <select className="filter-input new-study-input" name="status" defaultValue={brand.status}>
              <option value="active">{t("active")}</option>
              <option value="paused">{t("paused")}</option>
              <option value="archived">{t("archived")}</option>
            </select>
          </label>
        </div>

        <div className="new-study-grid">
          <label className="new-study-field">
            <span>{brandT("industry")}</span>
            <input
              className="filter-input new-study-input"
              name="industry"
              list="edit-industry-options"
              value={industryValue}
              onChange={(event) => setIndustryValue(event.target.value)}
            />
            <datalist id="edit-industry-options">
              {INDUSTRY_OPTIONS.map((industry) => <option key={industry} value={industry} />)}
            </datalist>
          </label>
          <label className="new-study-field">
            <span>{brandT("subindustry")}</span>
            <input className="filter-input new-study-input" name="industry_sub" list="edit-subindustry-options" defaultValue={brand.industrySub ?? ""} />
            <datalist id="edit-subindustry-options">
              {subindustriesForIndustry(industryValue).map((subindustry) => (
                <option key={subindustry} value={subindustry} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="new-study-field new-study-field--wide">
          <span>{brandT("description")}</span>
          <textarea className="filter-input new-study-textarea" name="description" maxLength={12000} defaultValue={brand.description ?? ""} />
        </label>
      </section>

      <section className="new-study-panel">
        <div className="new-study-section-head">
          <p className="vitals-eyebrow">{t("relationsEyebrow")}</p>
          <h2>{t("relationsTitle")}</h2>
        </div>
        <div className="new-study-grid">
          <label className="new-study-field">
            <span>{brandT("countries")}</span>
            <input className="filter-input new-study-input" name="countries" defaultValue={(brand.countries ?? ["MX"]).join(", ")} />
          </label>
          <label className="new-study-field">
            <span>{brandT("aliases")}</span>
            <textarea
              className="filter-input new-study-textarea new-study-textarea--short"
              name="brand_seed_handles"
              defaultValue={(brand.brandSeedHandles ?? []).join("\n")}
              placeholder="@sephoramx&#10;sephora mexico"
            />
          </label>
        </div>
      </section>

      <footer className="new-study-actions">
        {error && (
          <p className="new-study-error">
            <Icon name="alert" size={14} /> {error}
          </p>
        )}
        <button className="wizard-cta wizard-cta--ghost" type="button" onClick={() => router.push(`/studio/brands/${brand.id}`)}>
          {t("cancel")}
        </button>
        <button className="wizard-cta" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Icon name="spinner" size={14} /> {t("saving")}</> : <><Icon name="check" size={14} /> {t("save")}</>}
        </button>
      </footer>
    </form>
  );
}

function splitList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatApiError(
  json: { message?: string; details?: { fields?: Array<{ path?: string; message?: string }> } },
  fallback: string,
  fieldFallback: string,
  invalidFallback: string
) {
  const fields = json?.details?.fields;
  if (!Array.isArray(fields) || fields.length === 0) return json?.message ?? fallback;
  return fields
    .map((field) => `${field.path || fieldFallback}: ${field.message || invalidFallback}`)
    .join(" · ");
}
