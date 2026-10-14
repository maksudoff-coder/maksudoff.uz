// Sayt fayllari public/ dan beriladi; faqat /api/lead shu yerda ishlaydi.
import { onRequestPost } from './functions/api/lead.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.maksudoff.uz') {
      url.hostname = 'maksudoff.uz';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/api/lead') {
      if (request.method === 'POST') return onRequestPost({ request, env });
      return new Response('{"ok":false,"error":"method"}', { status: 405, headers: { 'content-type': 'application/json' } });
    }
    return env.ASSETS.fetch(request);
  },
};
