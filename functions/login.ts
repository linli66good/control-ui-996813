export interface Env {
  APP_PASSWORD: string;
  COOKIE_SIGNING_SECRET: string;
}

function html(body: string): Response {
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
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

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const next = url.searchParams.get('next') || '/';

  // already logged in? go next
  const existing = getCookie(ctx.request, 'oc_auth');
  if (existing) {
    return html(`<!doctype html><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url=${next}">`);
  }

  return html(`<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Login</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;max-width:420px;margin:10vh auto;padding:0 16px;}
.card{border:1px solid #eee;border-radius:12px;padding:16px;}
input{width:100%;padding:10px;border:1px solid #ddd;border-radius:10px;margin-top:8px;}
button{width:100%;padding:10px;border:0;border-radius:10px;margin-top:12px;background:#111;color:#fff;cursor:pointer;}
small{color:#666}
</style>
</head>
<body>
  <div class="card">
    <h2>996813 控制台登录</h2>
    <form method="POST" action="/login">
      <input type="password" name="password" placeholder="Password" autocomplete="current-password" required />
      <input type="hidden" name="next" value="${next.replace(/"/g,'&quot;')}" />
      <button type="submit">登录</button>
    </form>
    <p><small>登录有效期：30 天</small></p>
  </div>
</body></html>`);
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const form = await ctx.request.formData();
  const password = String(form.get('password') || '');
  const next = String(form.get('next') || '/');

  if (!ctx.env.APP_PASSWORD || !ctx.env.COOKIE_SIGNING_SECRET) {
    return html('Missing env vars: APP_PASSWORD / COOKIE_SIGNING_SECRET');
  }

  if (password !== ctx.env.APP_PASSWORD) {
    return html('<p>密码错误。<a href="/login">返回</a></p>');
  }

  const ttlSec = 30 * 24 * 60 * 60;
  const token = await makeToken(ctx.env.COOKIE_SIGNING_SECRET, ttlSec);
  const cookie = [
    `oc_auth=${encodeURIComponent(token)}`,
    `Max-Age=${ttlSec}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure'
  ].join('; ');

  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': cookie,
      'Location': next.startsWith('/') ? next : '/'
    }
  });
};
