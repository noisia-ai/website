import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgres://unit:test@localhost:5432/noisia_test";

const { resolveDatabaseSsl } = await import("./db");

test("database SSL can be disabled for local smoke databases", () => {
  assert.equal(resolveDatabaseSsl("false"), false);
  assert.equal(resolveDatabaseSsl("0"), false);
  assert.equal(resolveDatabaseSsl("disable"), false);
  assert.deepEqual(resolveDatabaseSsl(undefined), { rejectUnauthorized: false });
  assert.deepEqual(resolveDatabaseSsl("true"), { rejectUnauthorized: false });
});
