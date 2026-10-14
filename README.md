# maksudoff.uz

Shaxboz Maksudoff'ning shaxsiy sayti.

- `public/` — sayt fayllari (Cloudflare Pages: **Build output directory** = `public`, build command bo'sh)
- `public/ru/` — rus tilidagi sahifa (SEO uchun, `public/index.html` dan yasalgan)
- `functions/api/lead.js` — ariza formasi → Telegram (@maksudoff_ariza_bot)

## Cloudflare Pages sozlamalari
| O'zgaruvchi | Turi | Qiymat |
|---|---|---|
| `TG_TOKEN` | Secret | BotFather bergan token |
| `TG_CHAT` | ixtiyoriy | berilmasa 677486725 ishlatiladi |
| `LEADS_KV` | KV binding, ixtiyoriy | spamga qarshi limit (IP'dan soatiga 5 ta) |
