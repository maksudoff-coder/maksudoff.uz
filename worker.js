// maksudoff.uz — Cloudflare Worker
// public/ dagi fayllar statik beriladi; /api/lead — ariza; /api/admin/* — admin panel; /media/* — yuklangan rasmlar.
import { onRequestPost as leadPost } from './functions/api/lead.js';
import { handleAdmin, handleMedia, getContent } from './src/admin.js';
import { rewrite } from './src/render.js';

const HTML_PAGES = { '/': 'uz', '/index.html': 'uz', '/ru/': 'ru', '/ru/index.html': 'ru' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (url.hostname === 'www.maksudoff.uz' || (url.protocol === 'http:' && url.hostname.endsWith('maksudoff.uz'))) {
      url.hostname = 'maksudoff.uz'; url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }
    if (path === '/api/lead') {
      if (request.method === 'POST') return leadPost({ request, env: { ...env, LEADS_KV: env.LEADS_KV || env.CONTENT } });
      return new Response('{"ok":false,"error":"method"}', { status: 405, headers: { 'content-type': 'application/json' } });
    }
    if (path.startsWith('/api/admin/')) return handleAdmin(request, env, path);
    if (path.startsWith('/media/')) return handleMedia(env, path.slice(7));

    const res = await env.ASSETS.fetch(request);
    if (path === '/admin' || path.startsWith('/admin/')) {
      const r = new Response(res.body, res); r.headers.set('x-robots-tag', 'noindex, nofollow'); r.headers.set('cache-control', 'no-store'); return r;
    }
    const lang = HTML_PAGES[path];
    if (lang && request.method === 'GET' && res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
      const content = await getContent(env).catch(() => null);
      if (content) {
        const out = rewrite(res, content, lang);
        const r = new Response(out.body, out); r.headers.set('cache-control', 'no-cache'); r.headers.delete('etag'); return r;
      }
    }
    return res;
  },
};
