import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgres://unit:test@localhost:5432/noisia_test";

import { isLocalAuthOverrideEnabled } from "./local-auth";

const ENV_KEYS = [
  "NOISIA_ENABLE_LOCAL_AUTH_OVERRIDE",
  "NOISIA_LOCAL_AUTH_EMAIL",
  "NODE_ENV",
  "VERCEL_ENV",
  "RAILWAY_ENVIRONMENT"
] as const;

function withEnv(values: Partial<Record<typeof ENV_KEYS[number], string | undefined>>, run: () => void) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  const env = process.env as Record<string, string | undefined>;
  try {
    for (const key of ENV_KEYS) {
      const value = values[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

test("local auth override requires explicit dev-only flags", () => {
  withEnv({
    NOISIA_ENABLE_LOCAL_AUTH_OVERRIDE: "true",
    NOISIA_LOCAL_AUTH_EMAIL: "signal-pulse-smoke@noisia.local",
    NODE_ENV: "development"
  }, () => {
    assert.equal(isLocalAuthOverrideEnabled(), true);
  });

  withEnv({
    NOISIA_ENABLE_LOCAL_AUTH_OVERRIDE: "true",
    NOISIA_LOCAL_AUTH_EMAIL: "signal-pulse-smoke@noisia.local",
    NODE_ENV: "production"
  }, () => {
    assert.equal(isLocalAuthOverrideEnabled(), false);
  });

  withEnv({
    NOISIA_ENABLE_LOCAL_AUTH_OVERRIDE: "false",
    NOISIA_LOCAL_AUTH_EMAIL: "signal-pulse-smoke@noisia.local",
    NODE_ENV: "development"
  }, () => {
    assert.equal(isLocalAuthOverrideEnabled(), false);
  });
});
