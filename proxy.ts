import { NextRequest, NextResponse } from 'next/server';

const hits = new Map<string, { count: number; reset: number }>();
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', "default-src 'self'; connect-src 'self' https:; img-src 'self' data: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'");
  if (process.env.NODE_ENV === 'production') response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const now = Date.now(); const existing = hits.get(key);
    const bucket = !existing || existing.reset <= now ? { count: 1, reset: now + 60_000 } : { count: existing.count + 1, reset: existing.reset };
    hits.set(key, bucket);
    // Evict the oldest entry when the map grows too large so a spoofed IP
    // header flood cannot exhaust proxy memory.
    if (hits.size > 10_000) { const oldest = hits.keys().next(); if (!oldest.done) hits.delete(oldest.value); }
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, 120 - bucket.count)));
    if (bucket.count > 120) return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };