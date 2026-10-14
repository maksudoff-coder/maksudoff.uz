// POST /api/lead — saytdagi arizani Telegram'ga yuboradi.
// Cloudflare Pages > Settings > Variables and Secrets:
//   TG_TOKEN  — BotFather bergan token (Secret sifatida)
//   TG_CHAT   — (ixtiyoriy) arizalar keladigan chat ID; berilmasa Shaxbozning ID'si ishlatiladi
// Bot: @maksudoff_ariza_bot
// Ixtiyoriy: LEADS_KV nomli KV bog'lansa, bitta IP'dan soatiga 5 tadan ortiq ariza qabul qilinmaydi.

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const DEFAULT_CHAT = '677486725';

export async function onRequestPost({ request, env }) {
  const chat = env.TG_CHAT || DEFAULT_CHAT;
  if (!env.TG_TOKEN) return json({ ok: false, error: 'not_configured' }, 500);

  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

  // botlarga qarshi: yashirin maydon to'ldirilgan yoki forma juda tez yuborilgan bo'lsa — jim qabul qilamiz
  if (d.website) return json({ ok: true });
  if (Number(d.ms) < 2500) return json({ ok: true });

  const name = clean(d.name, 60), phone = clean(d.phone, 20), msg = clean(d.msg, 1000), ctx = clean(d.ctx, 120);
  if (name.length < 2 || phone.replace(/\D/g, '').length < 9) return json({ ok: false, error: 'invalid' }, 400);

  if (env.LEADS_KV) {
    const ip = request.headers.get('CF-Connecting-IP') || 'x';
    const key = 'rl:' + ip, n = Number(await env.LEADS_KV.get(key)) || 0;
    if (n >= 5) return json({ ok: false, error: 'rate' }, 429);
    await env.LEADS_KV.put(key, String(n + 1), { expirationTtl: 3600 });
  }

  const text = [
    '🆕 <b>Yangi ariza</b> · maksudoff.uz',
    '',
    '👤 ' + esc(name),
    '📞 ' + esc(phone),
    ctx ? '🏷 ' + esc(ctx) : '',
    '',
    '💬 ' + (msg ? esc(msg) : '<i>xabar yozilmagan</i>'),
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');

  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!r.ok) return json({ ok: false, error: 'telegram' }, 502);
  return json({ ok: true });
}

export const onRequest = () => json({ ok: false, error: 'method' }, 405);
