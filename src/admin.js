// Admin API: parol bilan kirish, kontentni o'qish/saqlash, rasm yuklash.
// Cloudflare sozlamasi: ADMIN_PASSWORD (Secret) — admin panel paroli.
import DEFAULTS from './defaults.json';
import MOCKS from './mocks.json';

const enc = new TextEncoder();
const COOKIE = 'mk_admin';
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sameText(a, b) {
  const [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(String(s)))));
  const u = new Uint8Array(x), v = new Uint8Array(y); let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}
function getCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}
async function isAuthed(req, env) {
  const t = getCookie(req, COOKIE); if (!t) return false;
  const [exp, sig] = t.split('.'); if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sameText(sig, await hmac(env.ADMIN_PASSWORD, 'mk-admin:' + exp));
}

// --- kontentni tozalash (faqat kutilgan maydonlar, uzunlik cheklovi) ---
const str = (v, max = 400) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const bi = (o, max) => ({ uz: str(o?.uz, max), ru: str(o?.ru, max) });
const IMG_RE = /^(img\/[\w.-]+|\/media\/[\w-]+|tg)$/;
const list = (a, max, fn) => (Array.isArray(a) ? a : []).slice(0, max).map(fn);
export function clean(c) {
  return {
    version: 1,
    projects: list(c.projects, 20, p => ({
      title: bi(p.title, 80), desc: bi(p.desc, 400), tag: bi(p.tag, 30),
      url: /^https?:\/\/[^\s"<>]+$/.test(str(p.url, 200)) ? str(p.url, 200) : '',
      note: bi(p.note, 60), bar: str(p.bar, 60),
      mock: MOCKS[p.mock] && p.mock !== 'tg' ? p.mock : '',
      img: /^\/media\/[\w-]+$/.test(str(p.img, 80)) ? str(p.img, 80) : '',
    })),
    services: list(c.services, 12, s => ({ title: bi(s.title, 60), desc: bi(s.desc, 300), img: IMG_RE.test(str(s.img, 80)) ? str(s.img, 80) : 'img/kafe-hero.webp' })),
    about: bi(c.about, 1500),
    steps: list(c.steps, 8, s => ({ title: bi(s.title, 60), desc: bi(s.desc, 300) })),
    plans: list(c.plans, 6, p => ({ hot: !!p.hot, name: bi(p.name, 60), for: bi(p.for, 120), price: str(p.price, 30), time: bi(p.time, 30),
      features: list(p.features, 12, f => bi(f, 120)).filter(f => f.uz) })),
    faq: list(c.faq, 30, f => ({ q: bi(f.q, 200), a: bi(f.a, 1200) })),
  };
}

export async function getContent(env) {
  if (!env.CONTENT) return null;
  return env.CONTENT.get('content', 'json');
}

export async function handleAdmin(request, env, path) {
  if (!env.ADMIN_PASSWORD) return json({ ok: false, error: 'not_configured' }, 503);
  if (!env.CONTENT) return json({ ok: false, error: 'no_kv' }, 503);
  const method = request.method;

  if (path === '/api/admin/login' && method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'x', rk = 'rl:login:' + ip;
    const n = Number(await env.CONTENT.get(rk)) || 0;
    if (n >= 10) return json({ ok: false, error: 'rate' }, 429);
    let d = {}; try { d = await request.json(); } catch {}
    if (!(await sameText(d.password || '', env.ADMIN_PASSWORD))) {
      await env.CONTENT.put(rk, String(n + 1), { expirationTtl: 3600 });
      return json({ ok: false, error: 'wrong' }, 401);
    }
    const exp = Date.now() + 7 * 864e5, token = exp + '.' + await hmac(env.ADMIN_PASSWORD, 'mk-admin:' + exp);
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` });
  }
  if (path === '/api/admin/logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  if (!(await isAuthed(request, env))) return json({ ok: false, error: 'auth' }, 401);

  if (path === '/api/admin/me') return json({ ok: true });
  if (path === '/api/admin/content' && method === 'GET') {
    const saved = await getContent(env);
    return json({ ok: true, saved: !!saved, content: saved || DEFAULTS, mocks: Object.keys(MOCKS).filter(k => k !== 'tg') });
  }
  if (path === '/api/admin/content' && method === 'PUT') {
    let d; try { d = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }
    const c = clean(d);
    await env.CONTENT.put('content', JSON.stringify(c));
    return json({ ok: true, content: c });
  }
  if (path === '/api/admin/reset' && method === 'POST') {
    await env.CONTENT.delete('content');
    return json({ ok: true, content: DEFAULTS });
  }
  if (path === '/api/admin/upload' && method === 'POST') {
    const type = (request.headers.get('content-type') || '').split(';')[0];
    if (!/^image\/(webp|jpeg|png)$/.test(type)) return json({ ok: false, error: 'type' }, 415);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > 3 * 1024 * 1024) return json({ ok: false, error: 'size' }, 413);
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    await env.CONTENT.put('media:' + id, buf, { metadata: { type } });
    return json({ ok: true, url: '/media/' + id });
  }
  return json({ ok: false, error: 'not_found' }, 404);
}

export async function handleMedia(env, id) {
  if (!env.CONTENT || !/^[\w-]{1,40}$/.test(id)) return new Response('Not found', { status: 404 });
  const { value, metadata } = await env.CONTENT.getWithMetadata('media:' + id, 'arrayBuffer');
  if (!value) return new Response('Not found', { status: 404 });
  return new Response(value, { headers: { 'content-type': metadata?.type || 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' } });
}
