import { createHmac, timingSafeEqual } from "node:crypto";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function signAccessToken(account, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || secret.length < 32) throw new Error("PACMAN_JWT_SECRET must contain at least 32 characters.");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ sub: String(account.id), username: account.username, iat: now, exp: now + 86400 });
  const input = `${header}.${payload}`;
  return `${input}.${createHmac("sha256", secret).update(input).digest("base64url")}`;
}

export function verifyAccessToken(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
  let provided;
  try { provided = Buffer.from(signature, "base64url"); } catch { return null; }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const parsedHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsedHeader.alg !== "HS256" || !claims.sub || !claims.username || !Number.isInteger(claims.exp) || claims.exp <= now) return null;
    return claims;
  } catch { return null; }
}
