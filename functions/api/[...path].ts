export interface Env {
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

export const onRequest: PagesFunction<Env> = async (ctx) => {
  // middleware already checked oc_auth; but keep a cheap guard
  const token = getCookie(ctx.request, 'oc_auth');
  if (!token) return new Response('Unauthorized', { status: 401 });

  const url = new URL(ctx.request.url);
  const path = url.pathname.replace(/^\/api\//, '/');
  const targetBase = ctx.env.API_BASE || '';
  if (!targetBase) return new Response('Missing API_BASE', { status: 500 });

  const target = new URL(targetBase);
  target.pathname = path;
  target.search = url.search;

  const headers = new Headers(ctx.request.headers);
  headers.set('X-Shared-Secret', ctx.env.API_SHARED_SECRET || '');
  headers.delete('Host');

  const resp = await fetch(target.toString(), {
    method: ctx.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(ctx.request.method) ? undefined : ctx.request.body,
    redirect: 'manual'
  });

  // passthrough
  const out = new Response(resp.body, resp);
  return out;
};
