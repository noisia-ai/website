"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Icon } from "@/components/ui/Icon";

const ROLES = ["noisia_admin", "analyst", "client_admin", "client_viewer"] as const;
type Role = (typeof ROLES)[number];

const isInternal = (role: string) => role === "noisia_admin" || role === "analyst";

type Member = {
  id: string;
  email: string;
  fullName: string | null;
  primaryRole: string;
  userType: string;
  status: string;
  organizationId: string | null;
  organizationName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

type Invitation = {
  id: string;
  email: string;
  primaryRole: string;
  organizationId: string | null;
  organizationName: string | null;
  invitedByName: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type Organization = { id: string; name: string };

type Props = {
  currentUserId: string;
  members: Member[];
  invitations: Invitation[];
  organizations: Organization[];
};

export function TeamManager({ currentUserId, members, invitations, organizations }: Props) {
  const t = useTranslations("Team");
  const router = useRouter();

  return (
    <div className="team-manager">
      <InviteForm t={t} organizations={organizations} onDone={() => router.refresh()} />

      <section className="new-study-panel">
        <div className="new-study-section-head">
          <h2>{t("members.title")}</h2>
        </div>
        {members.length === 0 ? (
          <p className="page-head-sub">{t("members.empty")}</p>
        ) : (
          <ul className="team-list">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                t={t}
                member={m}
                organizations={organizations}
                isSelf={m.id === currentUserId}
                onDone={() => router.refresh()}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="new-study-panel">
        <div className="new-study-section-head">
          <h2>{t("pending.title")}</h2>
        </div>
        {invitations.length === 0 ? (
          <p className="page-head-sub">{t("pending.empty")}</p>
        ) : (
          <ul className="team-list">
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} t={t} invitation={inv} onDone={() => router.refresh()} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type T = ReturnType<typeof useTranslations>;

function InviteForm({ t, organizations, onDone }: { t: T; organizations: Organization[]; onDone: () => void }) {
  const [role, setRole] = useState<Role>("client_viewer");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null);
  const internal = isInternal(role);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const organization_id = String(form.get("organization_id") ?? "") || undefined;

    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, primary_role: role, organization_id: internal ? undefined : organization_id })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? t("invite.error"));

      if (json.email_sent) {
        setMessage({ tone: "ok", text: t("invite.successSent", { email }) });
      } else {
        setMessage({ tone: "warn", text: t("invite.successNoEmail", { error: json.email_error ?? "" }) });
      }
      (event.target as HTMLFormElement).reset();
      setRole("client_viewer");
      onDone();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : t("invite.error") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="new-study-panel">
      <div className="new-study-section-head">
        <h2>{t("invite.title")}</h2>
      </div>
      <form className="team-invite-form" onSubmit={onSubmit}>
        <div className="new-study-grid">
          <label className="new-study-field">
            <span>{t("invite.email")}</span>
            <input className="filter-input new-study-input" name="email" type="email" required maxLength={200} />
          </label>
          <label className="new-study-field">
            <span>{t("invite.role")}</span>
            <select className="filter-input new-study-input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="new-study-field">
          <span>{t("invite.organization")}</span>
          {internal ? (
            <p className="page-head-sub">{t("invite.orgInternalHint")}</p>
          ) : (
            <select className="filter-input new-study-input" name="organization_id" required>
              <option value="">{t("invite.orgPlaceholder")}</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <div className="team-form-actions">
          <button className="wizard-cta" type="submit" disabled={submitting}>
            <Icon name="arrow-right" size={14} /> {submitting ? t("invite.submitting") : t("invite.submit")}
          </button>
          {message ? <span className={`team-msg team-msg--${message.tone}`}>{message.text}</span> : null}
        </div>
      </form>
    </section>
  );
}

function MemberRow({
  t,
  member,
  organizations,
  isSelf,
  onDone
}: {
  t: T;
  member: Member;
  organizations: Organization[];
  isSelf: boolean;
  onDone: () => void;
}) {
  const [role, setRole] = useState<Role>((member.primaryRole as Role) ?? "client_viewer");
  const [orgId, setOrgId] = useState<string>(member.organizationId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const internal = isInternal(role);

  const dirty =
    role !== member.primaryRole || (!internal && orgId !== (member.organizationId ?? ""));

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? t("actions.saveError"));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actions.saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="team-row">
      <div className="team-row-main">
        <strong>{member.fullName || member.email}</strong>
        <span className="team-row-email">{member.email}</span>
        <div className="team-row-meta">
          <StatusBadge t={t} status={member.status} />
          {isSelf ? <span className="team-tag">{t("members.you")}</span> : null}
          <span className="team-row-sub">
            {member.lastLoginAt
              ? t("members.lastLogin", { date: fmtDate(member.lastLoginAt) })
              : t("members.neverLoggedIn")}
          </span>
        </div>
      </div>

      <div className="team-row-controls">
        <select
          className="filter-input"
          value={role}
          disabled={busy || isSelf}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </select>

        {internal ? (
          <span className="team-row-sub">{t("members.noOrg")}</span>
        ) : (
          <select className="filter-input" value={orgId} disabled={busy} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">{t("invite.orgPlaceholder")}</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}

        <button
          className="wizard-cta wizard-cta--ghost"
          type="button"
          disabled={busy || !dirty || (!internal && !orgId)}
          onClick={() => patch({ primary_role: role, organization_id: internal ? null : orgId })}
        >
          {busy ? t("actions.saving") : t("actions.save")}
        </button>

        {!isSelf ? (
          member.status === "suspended" ? (
            <button className="wizard-cta wizard-cta--ghost" type="button" disabled={busy} onClick={() => patch({ status: "active" })}>
              {t("actions.reactivate")}
            </button>
          ) : (
            <button className="wizard-cta wizard-cta--danger" type="button" disabled={busy} onClick={() => patch({ status: "suspended" })}>
              {t("actions.suspend")}
            </button>
          )
        ) : null}
      </div>
      {error ? <span className="team-msg team-msg--error">{error}</span> : null}
    </li>
  );
}

function InvitationRow({ t, invitation, onDone }: { t: T; invitation: Invitation; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function revoke() {
    setBusy(true);
    try {
      await fetch(`/api/team/invitations/${invitation.id}`, { method: "DELETE" });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="team-row">
      <div className="team-row-main">
        <strong>{invitation.email}</strong>
        <div className="team-row-meta">
          <span className="team-tag">{t(`roles.${invitation.primaryRole}`)}</span>
          {invitation.organizationName ? <span className="team-row-sub">{invitation.organizationName}</span> : null}
          <span className="team-row-sub">{t("pending.invitedBy", { name: invitation.invitedByName ?? "—" })}</span>
          {invitation.expiresAt ? (
            <span className="team-row-sub">{t("pending.expires", { date: fmtDate(invitation.expiresAt) })}</span>
          ) : null}
        </div>
      </div>
      <div className="team-row-controls">
        <button className="wizard-cta wizard-cta--danger" type="button" disabled={busy} onClick={revoke}>
          {t("pending.revoke")}
        </button>
      </div>
    </li>
  );
}

function StatusBadge({ t, status }: { t: T; status: string }) {
  const known = ["active", "invited", "suspended", "pending"].includes(status) ? status : "active";
  return <span className={`team-status team-status--${known}`}>{t(`status.${known}`)}</span>;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
