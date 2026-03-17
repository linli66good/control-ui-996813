export interface Env {
  APP_PASSWORD: string;
  COOKIE_SIGNING_SECRET: string;
  API_BASE: string;
  API_SHARED_SECRET: string;
}

function getCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get('Cookie') || '';
  const parts = cookie.split(';').map(s => s.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

function b64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  const b64 = btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacSign(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return b64url(sig);
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

async function makeToken(secret: string, ttlSec: number): Promise<string> {
  const exp = nowSec() + ttlSec;
  const payload = `v1.${exp}`;
  const sig = await hmacSign(secret, payload);
  return `${payload}.${sig}`;
}

async function verifyToken(secret: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [ver, expStr, sig] = parts;
  if (ver !== 'v1') return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= nowSec()) return false;
  const payload = `${ver}.${exp}`;
  const expected = await hmacSign(secret, payload);
  return expected === sig;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/logout') return true;
  if (pathname.startsWith('/assets/')) return true;
  if (pathname.startsWith('/favicon')) return true;
  if (pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.svg') || pathname.endsWith('.ico')) return true;
  return false;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);

  if (isPublicPath(url.pathname)) {
    return ctx.next();
  }

  const token = getCookie(ctx.request, 'oc_auth');
  const ok = await verifyToken(ctx.env.COOKIE_SIGNING_SECRET, token);
  if (!ok) {
    const next = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(`${url.origin}/login?next=${next}`, 302);
  }

  return ctx.next();
};
