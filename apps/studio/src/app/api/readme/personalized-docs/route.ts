import crypto from "node:crypto";

export const runtime = "nodejs";

type ReadMeWebhookBody = {
  email?: string;
};

export async function POST(request: Request) {
  const secret = process.env.README_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "missing_readme_webhook_secret", message: "README_WEBHOOK_SECRET is not configured." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("readme-signature") ?? "";
  let body: ReadMeWebhookBody;

  try {
    body = await request.json() as ReadMeWebhookBody;
  } catch {
    return Response.json({ error: "invalid_json", message: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    verifyWebhook({ email: body.email ?? "" }, signature, secret);
  } catch (err) {
    return Response.json(
      { error: "invalid_readme_signature", message: err instanceof Error ? err.message : "Invalid ReadMe signature." },
      { status: 401 }
    );
  }

  const apiKey = resolveApiKeyForEmail(body.email);
  if (!apiKey) {
    return Response.json(
      {
        error: "api_key_not_found",
        message: "No public reporting API key is configured for this ReadMe user."
      },
      { status: 404 }
    );
  }

  return Response.json({
    email: body.email ?? null,
    // ReadMe security scheme variables. `bearerAuth` should be the raw token;
    // ReadMe applies the Bearer scheme from OpenAPI.
    bearerAuth: apiKey,
    noisiaApiKey: apiKey,
    "x-noisia-api-key": apiKey
  });
}

function resolveApiKeyForEmail(email?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  const keysByEmail = parseKeysByEmail();

  if (normalizedEmail && keysByEmail[normalizedEmail]) {
    return keysByEmail[normalizedEmail];
  }

  return keysByEmail.default ?? process.env.NOISIA_README_DEFAULT_API_KEY?.trim() ?? "";
}

function parseKeysByEmail() {
  const raw = process.env.NOISIA_README_API_KEYS_BY_EMAIL?.trim();
  if (!raw) return {} as Record<string, string>;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
        .map(([key, value]) => [key.trim().toLowerCase(), (value as string).trim()])
    );
  } catch {
    return {};
  }
}

function verifyWebhook(body: ReadMeWebhookBody, signature: string, secret: string) {
  if (!signature) throw new Error("Missing Signature");

  const parts = signature.split(",").reduce(
    (acc, item) => {
      const [key, value] = item.split("=");
      if (key === "t") acc.time = Number(value);
      if (key === "v0") acc.signature = value ?? "";
      return acc;
    },
    { time: -1, signature: "" }
  );

  const thirtyMinutes = 30 * 60 * 1000;
  if (!Number.isFinite(parts.time) || Date.now() - new Date(parts.time).getTime() > thirtyMinutes) {
    throw new Error("Expired Signature");
  }

  const unsigned = `${parts.time}.${JSON.stringify(body)}`;
  const expected = crypto.createHmac("sha256", secret).update(unsigned).digest("hex");

  if (!safeEqual(expected, parts.signature)) {
    throw new Error("Invalid Signature");
  }

  return body;
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}
