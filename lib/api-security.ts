type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
export function requestId(request: { headers?: Record<string, string | string[] | undefined> }) { const supplied = request.headers?.['x-request-id']; return typeof supplied === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(supplied) ? supplied : crypto.randomUUID(); }
export function secureApi(response: { setHeader: (name: string, value: string) => void }, id: string) { setSecurityHeaders(response); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Request-ID', id); }
export function bodyTooLarge(request: { headers?: Record<string, string | string[] | undefined> }, maxBytes = 1_000_000) { const value = request.headers?.['content-length']; const length = Array.isArray(value) ? Number(value[0]) : Number(value); return Number.isFinite(length) && length > maxBytes; }
export function clientKey(request: { headers?: Record<string, string | string[] | undefined> }) { const forwarded = request.headers?.['x-forwarded-for']; return Array.isArray(forwarded) ? forwarded[0] || 'unknown' : String(forwarded || request.headers?.['x-real-ip'] || 'unknown').split(',')[0].trim(); }
export function rateLimit(key: string, limit = 60, windowMs = 60_000) { const now = Date.now(); const existing = buckets.get(key); if (!existing || existing.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true, remaining: limit - 1 }; } existing.count += 1; return { allowed: existing.count <= limit, remaining: Math.max(0, limit - existing.count) }; }
export function setSecurityHeaders(response: { setHeader: (name: string, value: string) => void }) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-DNS-Prefetch-Control', 'off');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' https:; img-src 'self' data: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'");
  if (process.env.NODE_ENV === 'production') response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
export function jsonError(response: { status: (code: number) => { json: (body: unknown) => unknown } }, code: number, error: string, requestId: string) { return response.status(code).json({ error, requestId }); }
