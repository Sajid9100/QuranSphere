import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  checkAdminEmail,
  checkAdminPassword,
  createAdminToken,
} from "@/lib/admin-auth";
import {
  checkAdminRateLimit,
  clientIp,
  recordAdminLoginAttempt,
} from "@/lib/admin-rate-limit";

export const runtime = "nodejs";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const ip = clientIp(req);

  const rl = await checkAdminRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  let body: { email?: string; password?: string; captchaToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Turnstile is optional: if no secret key is configured (e.g. local dev),
  // skip CAPTCHA validation entirely and let login proceed normally.
  const turnstileConfigured = Boolean(process.env.TURNSTILE_SECRET_KEY);
  if (turnstileConfigured) {
    const captchaToken = (body.captchaToken ?? "").toString();
    if (!captchaToken) {
      return NextResponse.json({ error: "CAPTCHA failed" }, { status: 400 });
    }
    const captchaOk = await verifyTurnstile(captchaToken, ip);
    if (!captchaOk) {
      await recordAdminLoginAttempt(ip, false);
      return NextResponse.json({ error: "CAPTCHA failed" }, { status: 400 });
    }
  }

  const email = (body.email ?? "").toString();
  const password = (body.password ?? "").toString();
  const emailOk = email.length > 0 && checkAdminEmail(email);
  const passwordOk = password.length > 0 && checkAdminPassword(password);
  if (!emailOk || !passwordOk) {
    await recordAdminLoginAttempt(ip, false);
    return NextResponse.json(
      { error: "Incorrect email or password" },
      { status: 401 }
    );
  }

  await recordAdminLoginAttempt(ip, true);

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: createAdminToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
