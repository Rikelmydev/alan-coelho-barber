// Login do painel /admin: uma senha (ADMIN_PASSWORD) e um cookie assinado com HMAC que vale 30 dias.

import type { AstroCookies } from "astro";
import { ADMIN_PASSWORD, ADMIN_SECRET } from "astro:env/server";

const COOKIE = "acb_admin";
const MAX_AGE_S = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

async function sign(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ADMIN_SECRET ?? ADMIN_PASSWORD ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
  return btoa(String.fromCharCode(...sig)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Comparação em tempo constante, para não vazar informação pelo tempo de resposta
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const adminConfigured = () => Boolean(ADMIN_PASSWORD);

export async function checkPassword(password: string) {
  if (!ADMIN_PASSWORD) return false;
  const ok = safeEqual(await sign(`pw:${password}`), await sign(`pw:${ADMIN_PASSWORD}`));
  if (!ok) await new Promise((r) => setTimeout(r, 800)); // freia tentativas repetidas
  return ok;
}

export async function isAdmin(cookies: AstroCookies) {
  if (!ADMIN_PASSWORD) return false;
  const [expires, sig] = cookies.get(COOKIE)?.value.split(".") ?? [];
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return safeEqual(sig, await sign(expires));
}

export async function startSession(cookies: AstroCookies, secure: boolean) {
  const expires = String(Date.now() + MAX_AGE_S * 1000);
  cookies.set(COOKIE, `${expires}.${await sign(expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/admin",
    maxAge: MAX_AGE_S,
  });
}

export const endSession = (cookies: AstroCookies) => cookies.delete(COOKIE, { path: "/admin" });
