/**
 * Simple in-memory rate limiter per IP.
 * Limits: max `limit` requests per `windowMs` milliseconds.
 * Works for single-process deployments (Vercel serverless: use @upstash/ratelimit for multi-instance).
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  existing.count++
  const remaining = Math.max(0, limit - existing.count)
  return {
    allowed: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
