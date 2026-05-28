"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { Icon } from "@/components/ui/Icon";

type Competitor = {
  id: string;
  priority: number | null;
  canonicalName: string;
  vertical: string | null;
  subVertical: string | null;
};

export function CompetitorManager({ brandId, competitors }: { brandId: string; competitors: Competitor[] }) {
  const t = useTranslations("CompetitorManager");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCompetitors(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetForm = event.currentTarget;
    setError(null);
    setIsAdding(true);

    const form = new FormData(targetForm);
    const names = splitList(String(form.get("competitors") ?? ""));
    try {
      const res = await fetch(`/api/brands/${brandId}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitors: names })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? t("fallbackAddError"));
      targetForm.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("fallbackAddError"));
    } finally {
      setIsAdding(false);
    }
  }

  async function removeOne(competitorId: string) {
    setError(null);
    setPendingId(competitorId);
    try {
      const res = await fetch(`/api/brands/${brandId}/competitors/${competitorId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? t("fallbackDeleteError"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("fallbackDeleteError"));
    } finally {
      setPendingId(null);
    }
  }

  async function clearAll() {
    if (!window.confirm(t("confirmClear", { count: competitors.length }))) return;

    setError(null);
    setIsClearing(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/competitors`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? t("fallbackClearError"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("fallbackClearError"));
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <section className="dash-section">
      <header className="dash-section-head competitor-manager-head">
        <div>
          <h2>{t("title", { count: competitors.length })}</h2>
          <p>{t("subtitle")}</p>
        </div>
        <button className="wizard-cta wizard-cta--ghost" type="button" onClick={clearAll} disabled={isClearing || competitors.length === 0}>
          <Icon name={isClearing ? "spinner" : "x"} size={13} /> {t("clear")}
        </button>
      </header>
      {error && (
        <p className="new-study-error competitor-manager-error">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
      <form className="competitor-add-form" onSubmit={addCompetitors}>
        <label className="new-study-field">
          <span>{t("addLabel")}</span>
          <textarea
            className="filter-input new-study-textarea new-study-textarea--short"
            name="competitors"
            placeholder={"Ulta Beauty\nLiverpool\nPalacio de Hierro"}
          />
          <small className="new-study-hint">{t("hint")}</small>
        </label>
        <button className="wizard-cta wizard-cta--secondary" type="submit" disabled={isAdding}>
          <Icon name={isAdding ? "spinner" : "tag"} size={13} /> {t("add")}
        </button>
      </form>
      <div className="competitor-chips competitor-chips--managed">
        {competitors.map((competitor) => (
          <div className="competitor-chip competitor-chip--managed" key={competitor.id}>
            <span className="competitor-chip-rank">#{competitor.priority ?? "—"}</span>
            <span className="competitor-chip-name">{competitor.canonicalName}</span>
            {(competitor.vertical || competitor.subVertical) && (
              <span className="competitor-chip-vertical">
                {[competitor.vertical, competitor.subVertical].filter(Boolean).join(" / ")}
              </span>
            )}
            <button
              className="competitor-chip-remove"
              type="button"
              aria-label={t("deleteAria", { name: competitor.canonicalName })}
              onClick={() => removeOne(competitor.id)}
              disabled={pendingId === competitor.id || isClearing}
            >
              <Icon name={pendingId === competitor.id ? "spinner" : "x"} size={12} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function splitList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim().replace(/\s+/g, " ").slice(0, 240))
    .filter((item) => item.length >= 2 && item.length <= 240);
}
