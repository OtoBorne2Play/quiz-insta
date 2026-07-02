import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

interface RateLimitRecord {
  count: number;
  windowStart: number;
  lockedUntil: number | null;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export async function authorizeAdmin(request: Request): Promise<AdminAuthResult> {
  const ip = getClientIp(request);
  const key = `admin_rl:${ip}`;
  const now = Date.now();

  const { data: existing } = await supabaseAdmin
    .from("kv_store_62dd5469")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const record = (existing?.value as RateLimitRecord | undefined) ?? null;

  if (record?.lockedUntil && now < record.lockedUntil) {
    return {
      ok: false,
      status: 429,
      message: "Trop de tentatives échouées, réessaie dans quelques minutes.",
    };
  }

  const token = request.headers.get("x-admin-token");
  const expected = process.env.ADMIN_TOKEN;
  const valid = Boolean(expected) && token === expected;

  if (valid) {
    if (record) {
      await supabaseAdmin.from("kv_store_62dd5469").delete().eq("key", key);
    }
    return { ok: true };
  }

  const sameWindow = record && now - record.windowStart < WINDOW_MS;
  const count = sameWindow ? record!.count + 1 : 1;
  const windowStart = sameWindow ? record!.windowStart : now;
  const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : null;

  await supabaseAdmin.from("kv_store_62dd5469").upsert({
    key,
    value: { count, windowStart, lockedUntil } satisfies RateLimitRecord,
  });

  return { ok: false, status: 401, message: "Non autorisé" };
}
