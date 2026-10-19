const AUTH_URL_KEY = "neon-maze-auth-url";
const ROOM_URL_KEY = "neon-maze-room-url";
const TOKEN_KEY = "neon-maze-access-token";
const ACCOUNT_KEY = "neon-maze-account";

export function authApiUrl() {
  return (localStorage.getItem(AUTH_URL_KEY) || import.meta.env.VITE_AUTH_API_URL || "").trim().replace(/\/$/, "");
}

export function roomServerUrl() {
  return (localStorage.getItem(ROOM_URL_KEY) || import.meta.env.VITE_ROOM_SERVER_URL || "").trim().replace(/\/$/, "");
}

export function setServiceUrls(authUrl, roomUrl) {
  const auth = authUrl.trim().replace(/\/$/, "");
  const room = roomUrl.trim().replace(/\/$/, "");
  if (auth) localStorage.setItem(AUTH_URL_KEY, auth);
  if (room) localStorage.setItem(ROOM_URL_KEY, room);
}

export function accessToken() { return sessionStorage.getItem(TOKEN_KEY) || ""; }
export function account() {
  try { return JSON.parse(sessionStorage.getItem(ACCOUNT_KEY) || "null"); } catch { return null; }
}

export async function accountRequest(action, values) {
  const base = authApiUrl();
  if (!base) throw new Error("Set the HTTPS PHP account API URL first.");
  let url;
  try { url = new URL(base); } catch { throw new Error("The PHP account API URL is invalid."); }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("The account API must use HTTPS outside local development.");
  }
  const response = await fetch(`${base}/api/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `Account request failed (${response.status}).`);
  sessionStorage.setItem(TOKEN_KEY, result.token);
  sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(result.account));
  window.dispatchEvent(new Event("account:changed"));
  return result.account;
}

export function clearAccount() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ACCOUNT_KEY);
  window.dispatchEvent(new Event("account:changed"));
}
