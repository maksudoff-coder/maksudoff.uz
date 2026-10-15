// Saqlangan kontentdan bosh sahifa bo'limlarini yasaydi (public/index.html dagi tuzilma bilan bir xil).
import MOCKS from './mocks.json';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = n => String(n).padStart(2, '0');
const ru = o => ` data-ru="${esc(o?.ru || o?.uz || '')}"`;
const uz = o => esc(o?.uz || '');
const host = u => { try { return new URL(u).host; } catch { return u; } };
const imgUrl = p => esc(p);

export function projectsHtml(c) {
  return c.projects.map((p, i) => {
    const link = p.url
      ? `<a class="pj-url" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(host(p.url))} ↗</a>`
      : (p.note?.uz ? `<span class="pj-url"${ru(p.note)}>${uz(p.note)}</span>` : '');
    const bar = esc(p.bar || (p.url ? host(p.url) : ''));
    const view = p.img
      ? `<div class="pj-view"><img class="pj-img" src="${imgUrl(p.img)}" alt="${uz(p.title)}" loading="lazy"></div>`
      : (MOCKS[p.mock] ? `<div class="pj-view">${MOCKS[p.mock]}</div>` : `<div class="pj-view pj-empty"></div>`);
    return `
      <article class="pj">
        <div class="pj-meta"><span class="pj-n">${pad(i + 1)}</span>${p.tag?.uz ? `<span class="pj-tag"${ru(p.tag)}>${uz(p.tag)}</span>` : ''}${link}</div>
        <div class="pj-shot"><div class="pj-bar"><i></i><i></i><i></i><span>${bar}</span></div>
          ${view}
        </div>
        <div class="pj-txt"><h3${ru(p.title)}>${uz(p.title)}</h3><p${ru(p.desc)}>${uz(p.desc)}</p></div>
      </article>
`;
  }).join('');
}

export function servicesHtml(c) {
  return c.services.map((s, i) => `
      <li class="sv-row" data-rv data-i="${i}"><span class="n">${pad(i + 1)}</span><h3${ru(s.title)}>${uz(s.title)}</h3><p${ru(s.desc)}>${uz(s.desc)}</p><span class="arr">→</span>${s.img === 'tg' ? '<span class="sv-th tg-th"></span>' : `<span class="sv-th" style="background-image:url(${imgUrl(s.img)})"></span>`}</li>`).join('') + '\n    ';
}

export function floatHtml(c) {
  return c.services.map(s => s.img === 'tg' ? MOCKS.tg : `<div class="sv-img" style="background-image:url(${imgUrl(s.img)})"></div>`).join('\n    ');
}

export function stepsHtml(c) {
  return c.steps.map((s, i) => `
      <li data-rv><span>${pad(i + 1)}</span><h4${ru(s.title)}>${uz(s.title)}</h4><p${ru(s.desc)}>${uz(s.desc)}</p></li>`).join('') + '\n    ';
}

export function plansHtml(c) {
  return c.plans.map((p, i) => `
      <article class="plan${p.hot ? ' hot' : ''}" data-rv>
        <div class="pl-n">${pad(i + 1)}${p.hot ? ' <span class="pl-tag">Tavsiya etaman</span>' : ''}</div><h3${ru(p.name)}>${uz(p.name)}</h3><p class="pl-for"${ru(p.for)}>${uz(p.for)}</p>
        <div class="pl-price"><b data-ru="от ${esc(p.price)}">${esc(p.price)}</b><span>so'mdan</span></div><div class="pl-time"${ru(p.time)}>${uz(p.time)}</div>
        <ul>${p.features.map(f => `<li${ru(f)}>${uz(f)}</li>`).join('')}</ul>
        <button class="pl-btn" data-plan="${uz(p.name)}" data-plan-ru="${esc(p.name?.ru || p.name?.uz)}">Shu paketni tanlash</button>
      </article>`).join('') + '\n    ';
}

export function faqHtml(c) {
  return c.faq.map(f => `
      <details data-rv><summary><span${ru(f.q)}>${uz(f.q)}</span><i></i></summary><p${ru(f.a)}>${uz(f.a)}</p></details>`).join('') + '\n    ';
}

export function jsonLd(c, lang) {
  const L = o => (lang === 'ru' ? (o?.ru || o?.uz) : o?.uz) || '';
  const data = [
    { '@context': 'https://schema.org', '@type': 'ProfessionalService', name: 'Maksudoff', url: 'https://maksudoff.uz/',
      image: 'https://maksudoff.uz/og.jpg', logo: 'https://maksudoff.uz/brand/icon-512.png',
      description: "Kafe, klinika, o'quv markazi va do'konlar uchun veb-saytlar, Telegram botlar va hujjat generatorlari.",
      email: 'info@maksudoff.uz', telephone: '+998939625556',
      address: { '@type': 'PostalAddress', addressLocality: 'Toshkent', addressCountry: 'UZ' }, areaServed: 'UZ',
      sameAs: ['https://t.me/maksudoff', 'https://instagram.com/maksudoff.uz', 'https://t.me/maksudoff_uz'] },
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: c.faq.map(f => ({ '@type': 'Question', name: L(f.q), acceptedAnswer: { '@type': 'Answer', text: L(f.a) } })) },
  ];
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// HTMLRewriter bilan sahifaga qo'yish
export function rewrite(res, c, lang) {
  const total = c.projects.length + 1;
  const H = { html: true };
  return new HTMLRewriter()
    .on('article.pj', { element(el) {
      if ((el.getAttribute('class') || '').includes('pj-you')) el.before(projectsHtml(c), H);
      else el.remove();
    } })
    .on('article.pj-you .pj-n', { element(el) { el.setInnerContent(pad(total)); } })
    .on('#hztotal', { element(el) { el.setInnerContent(pad(total)); } })
    .on('#svlist', { element(el) { el.setInnerContent(servicesHtml(c), H); } })
    .on('#svfloat', { element(el) { el.setInnerContent(floatHtml(c), H); } })
    .on('#abbig', { element(el) { el.setInnerContent(esc(c.about.uz)); el.setAttribute('data-ru', c.about.ru || c.about.uz); } })
    .on('#absteps', { element(el) { el.setInnerContent(stepsHtml(c), H); } })
    .on('.pr-grid', { element(el) { el.setInnerContent(plansHtml(c), H); } })
    .on('#faqlist', { element(el) { el.setInnerContent(faqHtml(c), H); } })
    .on('script[type="application/ld+json"]', { element(el) { el.setInnerContent(jsonLd(c, lang), H); } })
    .transform(res);
}
