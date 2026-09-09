import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { NextApiRequest, NextApiResponse } from 'next';

export type AppRole = 'Applicant' | 'Department officer' | 'Facilitation officer';
export type Session = { subject: string; role: AppRole; expiresAt: number };
type OidcDiscovery = { authorization_endpoint: string; token_endpoint: string; jwks_uri: string; issuer: string };

const cookieName = 'arthix_session';
const transactionCookieName = 'arthix_oidc_tx';

function secret() {
  return process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only');
}

function signature(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function readSession(request: NextApiRequest): Session | null {
  const raw = request.cookies[cookieName];
  if (!raw || !secret()) return null;
  const [encoded, provided] = raw.split('.');
  if (!encoded || !provided) return null;
  const expected = signature(encoded);
  if (provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function requireSession(request: NextApiRequest, response: NextApiResponse, roles?: AppRole[]) {
  if (process.env.NODE_ENV !== 'production') return { subject: 'local-demo', role: 'Applicant' as AppRole, expiresAt: Date.now() + 86_400_000 };
  const session = readSession(request);
  if (!session || (roles && !roles.includes(session.role))) {
    response.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  return session;
}

export function sessionCookie(session: Session) {
  const encoded = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${cookieName}=${encoded}.${signature(encoded)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))}`;
}

function signedValue(value: string) { return `${value}.${signature(value)}`; }
function readSignedValue(raw?: string) {
  if (!raw) return null;
  const [value, provided] = raw.split('.');
  const expected = value ? signature(value) : '';
  if (!value || !provided || provided.length !== expected.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return null;
  return value;
}
export function oidcConfigured() { return Boolean((process.env.KEYCLOAK_ISSUER || process.env.OIDC_DISCOVERY_URL) && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET && secret()); }
export async function oidcDiscovery() {
  const discoveryUrl = process.env.OIDC_DISCOVERY_URL || (process.env.KEYCLOAK_ISSUER ? `${process.env.KEYCLOAK_ISSUER.replace(/\/$/, '')}/.well-known/openid-configuration` : '');
  if (!discoveryUrl) throw new Error('KEYCLOAK_ISSUER or OIDC_DISCOVERY_URL is not configured.');
  const response = await fetch(discoveryUrl, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('OIDC discovery failed.');
  return await response.json() as OidcDiscovery;
}
export function oidcTransactionCookie(state: string, verifier: string, nonce: string) {
  const value = Buffer.from(JSON.stringify({ state, verifier, nonce, expiresAt: Date.now() + 600_000 })).toString('base64url');
  return `${transactionCookieName}=${signedValue(value)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`;
}
export function readOidcTransaction(request: NextApiRequest) {
  const encoded = readSignedValue(request.cookies[transactionCookieName]);
  if (!encoded) return null;
  try {
    const transaction = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { state: string; verifier: string; nonce: string; expiresAt: number };
    return transaction.expiresAt > Date.now() ? transaction : null;
  } catch { return null; }
}
export function clearOidcTransactionCookie() { return `${transactionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`; }
export function oidcPkce() {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url'), state: randomBytes(24).toString('base64url'), nonce: randomBytes(24).toString('base64url') };
}
export async function exchangeOidcCode(discovery: OidcDiscovery, code: string, verifier: string, nonce: string) {
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: process.env.OIDC_REDIRECT_URI || `${process.env.APP_URL}/api/auth/callback`, client_id: process.env.OIDC_CLIENT_ID || '', client_secret: process.env.OIDC_CLIENT_SECRET || '', code_verifier: verifier });
  const response = await fetch(discovery.token_endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body });
  if (!response.ok) throw new Error('OIDC token exchange failed.');
  const tokens = await response.json() as { id_token?: string };
  if (!tokens.id_token) throw new Error('OIDC provider did not return an ID token.');
  const keySet = createRemoteJWKSet(new URL(discovery.jwks_uri));
  const verified = await jwtVerify(tokens.id_token, keySet as Parameters<typeof jwtVerify>[1], { issuer: discovery.issuer, audience: process.env.OIDC_CLIENT_ID });
  if (verified.payload.nonce !== nonce) throw new Error('OIDC nonce validation failed.');
  return { subject: String(verified.payload.sub || ''), email: typeof verified.payload.email === 'string' ? verified.payload.email : undefined };
}
