# maksudoff.uz

Shaxboz Maksudoff'ning shaxsiy sayti.

- `public/` — sayt fayllari (Cloudflare Pages: **Build output directory** = `public`, build command bo'sh)
- `public/ru/` — rus tilidagi sahifa (SEO uchun, `public/index.html` dan yasalgan)
- `functions/api/lead.js` — ariza formasi → Telegram (@maksudoff_ariza_bot)
- `public/admin/` — admin panel (maksudoff.uz/admin)
- `src/` — admin API (`admin.js`), saqlangan kontentni sahifaga qo'yish (`render.js`), boshlang'ich matnlar (`defaults.json`)
- `worker.js` + `wrangler.jsonc` — Cloudflare Workers (Git orqali avtomatik deploy, `npx wrangler deploy`)

## Cloudflare sozlamalari (Variables and Secrets)
| O'zgaruvchi | Turi | Qiymat |
|---|---|---|
| `TG_TOKEN` | Secret | BotFather bergan token |
| `ADMIN_PASSWORD` | Secret | maksudoff.uz/admin paroli |
| `TG_CHAT` | ixtiyoriy | berilmasa 677486725 ishlatiladi |
| `LEADS_KV` | KV binding, ixtiyoriy | spamga qarshi limit (IP'dan soatiga 5 ta) |

KV `CONTENT` (maksudoff-content): `content` — admin saqlagan matnlar, `media:*` — yuklangan rasmlar.
