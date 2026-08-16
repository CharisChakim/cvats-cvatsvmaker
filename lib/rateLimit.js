import { NextResponse } from 'next/server';

/**
 * In-memory, per-process rate limiter. There is no shared store (Redis/KV) in
 * this project, so counts live in this server instance's memory and reset on
 * redeploy or restart — the pragmatic default for a single-instance deployment
 * without adding paid infra. If this app is ever scaled across multiple
 * instances, swap this for a shared store (e.g. Upstash Redis) so limits stay
 * accurate across all of them.
 */
const buckets = new Map();

// Lazily evict expired buckets instead of running a timer, so one-off IPs
// don't leak memory forever without a background interval.
function sweep(now) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > bucket.windowMs) buckets.delete(key);
  }
}

export function checkRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now, windowMs });
    return { allowed: true };
  }

  if (bucket.count < limit) {
    bucket.count += 1;
    return { allowed: true };
  }

  const retryAfterSeconds = Math.ceil((bucket.windowStart + bucket.windowMs - now) / 1000);
  return { allowed: false, retryAfterSeconds };
}

export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export function rateLimitedResponse(retryAfterSeconds) {
  return NextResponse.json(
    { error: `Too many requests. Please wait ${retryAfterSeconds}s and try again.`, code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
