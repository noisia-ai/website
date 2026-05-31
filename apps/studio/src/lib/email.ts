// Envío de correo vía la API HTTP de Resend (sin SDK para no añadir dependencia).
// Es best-effort: si no hay API key o falla, devolvemos { ok: false } y el caller
// decide si lo trata como error suave (p.ej. la invitación se crea igual).

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailArgs): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY o RESEND_FROM_EMAIL no configurados." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to, subject, html, text })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend respondió ${res.status}: ${body.slice(0, 300)}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red al enviar correo." };
  }
}

/** Plantilla mínima para el correo de invitación al workspace. */
export function renderInvitationEmail(args: { appName: string; loginUrl: string; roleLabel: string }) {
  const { appName, loginUrl, roleLabel } = args;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h1 style="font-size: 20px;">Te invitaron a ${appName}</h1>
      <p>Tienes acceso como <strong>${roleLabel}</strong>. Entra con este correo para activar tu cuenta:</p>
      <p style="margin: 24px 0;">
        <a href="${loginUrl}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
          Entrar a ${appName}
        </a>
      </p>
      <p style="color:#666;font-size:13px;">Si el botón no funciona, copia esta liga: ${loginUrl}</p>
    </div>
  `;
  const text = `Te invitaron a ${appName} como ${roleLabel}. Entra con tu correo para activar tu cuenta: ${loginUrl}`;
  return { html, text };
}
