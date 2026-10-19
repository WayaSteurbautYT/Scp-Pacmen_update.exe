import test from "node:test";
import assert from "node:assert/strict";
import { signAccessToken, verifyAccessToken } from "../server/auth-token.js";

const secret = "unit-test-secret-that-is-long-enough-for-hmac";

test("account JWTs validate signature, claims, expiry, and tampering", () => {
  const token = signAccessToken({ id: "42", username: "MazePlayer" }, secret, 1000);
  assert.deepEqual(verifyAccessToken(token, secret, 1001), {
    sub: "42", username: "MazePlayer", iat: 1000, exp: 87400,
  });
  assert.equal(verifyAccessToken(token, secret, 87400), null);
  assert.equal(verifyAccessToken(token, `${secret}!`, 1001), null);
  const [header, payload, signature] = token.split(".");
  assert.equal(verifyAccessToken(`${header}.${payload}.${signature.slice(0, -1)}x`, secret, 1001), null);
  assert.throws(() => signAccessToken({ id: "42", username: "MazePlayer" }, "short"), /32 characters/);
});
