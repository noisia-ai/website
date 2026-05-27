import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const requiredEnv = [
  "DATABASE_URL",
  "REDIS_URL",
  "ANTHROPIC_API_KEY",
  "KINDE_CLIENT_ID",
  "KINDE_CLIENT_SECRET",
  "KINDE_ISSUER_URL",
  "KINDE_SITE_URL",
  "KINDE_POST_LOGIN_REDIRECT_URL",
  "KINDE_POST_LOGOUT_REDIRECT_URL"
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  const checks: Record<string, "ok" | "missing" | "skipped" | "error"> = {
    app: "ok",
    env: missingEnv.length ? "missing" : "ok",
    database: deep ? "skipped" : "skipped"
  };

  if (deep && !missingEnv.includes("DATABASE_URL")) {
    try {
      const { pool } = await import("@/lib/db");
      await pool.query("select 1");
      checks.database = "ok";
    } catch {
      checks.database = "error";
    }
  }

  const ok = !deep || (missingEnv.length === 0 && checks.database === "ok");

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      missingEnv
    },
    { status: ok ? 200 : 503 }
  );
}
