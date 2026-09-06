'use strict';

const fs = require('fs');
const path = require('path');
const { BASE_URL } = require('../lib/ai-utils');
const { replacePrimaryNav } = require('../lib/site-nav');

const TEMPLATE_PATH = path.resolve(__dirname, '..', 'forum.html');
const SUPABASE_URL = 'https://sterozqxsblanvjyzjmi.supabase.co';
let templateCache = null;
let supabaseKeyCache = null;

function template() {
  if (!templateCache) templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return templateCache;
}

function supabaseKey() {
  if (supabaseKeyCache) return supabaseKeyCache;
  const match = template().match(/const\s+SUPABASE_KEY\s*=\s*["']([^"']+)["']/);
  if (!match) throw new Error('Supabase public key not found in forum template');
  supabaseKeyCache = match[1];
  return supabaseKeyCache;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function attr(value) { return esc(value); }
function safeJson(obj) { return JSON.stringify(obj).replace(/</g, '\\u003c'); }
function slugify(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

async function supabase(pathname) {
  const key = supabaseKey();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.json();
}

function topicUrl(topic) {
  return `${BASE_URL}/forum?id=${encodeURIComponent(topic.id)}&topico=${encodeURIComponent(slugify(topic.titulo))}`;
}

function renderList(topics) {
  if (!topics.length) return `<section class="forum-action-header"><h1>Fórum QualProcessador</h1><p>A comunidade ainda não possui tópicos públicos disponíveis.</p></section>`;
  return `<section aria-labelledby="forum-list-title">
    <div class="forum-action-header"><div><h1 id="forum-list-title">Fórum QualProcessador</h1><p>Discussões públicas da comunidade sobre hardware, computadores, dúvidas e experiências de usuários.</p></div></div>
    <div class="topics-list">${topics.map(topic => {
      const replies = Array.isArray(topic.respostas) ? topic.respostas.length : 0;
      return `<article class="topic-row-card"><div class="topic-info"><h3><a href="/forum?id=${encodeURIComponent(topic.id)}&topico=${encodeURIComponent(slugify(topic.titulo))}">${esc(topic.titulo || 'Tópico')}</a></h3><p>Publicado por <strong>${esc(topic.autor || 'Membro')}</strong>${topic.data ? ` • ${esc(topic.data)}` : ''}</p></div><div class="topic-replies-badge">${replies} respostas</div></article>`;
    }).join('')}</div>
    <p style="margin-top:24px;color:#64748b;font-size:.82rem">Conteúdo publicado por membros da comunidade. As opiniões do fórum não representam necessariamente conteúdo editorial do QualProcessador.</p>
  </section>`;
}

function renderReplies(replies) {
  if (!Array.isArray(replies) || !replies.length) return '<p style="color:#64748b">Ainda não há respostas nesta discussão.</p>';
  return replies.map(reply => `<article class="post-card reply-nested"><div class="post-user"><strong>${esc(reply.autor || 'Membro')}</strong>${reply.data ? `<div>${esc(reply.data)}</div>` : ''}</div><div class="post-content"><p>${esc(reply.conteudo || '')}</p></div></article>`).join('');
}

function renderTopic(topic) {
  const replies = Array.isArray(topic.respostas) ? topic.respostas : [];
  return `<article aria-labelledby="forum-topic-title">
    <div class="forum-action-header"><div><span style="font-size:.78rem;color:#64748b;text-transform:uppercase;font-weight:700">Discussão da comunidade</span><h1 id="forum-topic-title">${esc(topic.titulo || 'Tópico')}</h1><p>Publicado por <strong>${esc(topic.autor || 'Membro')}</strong>${topic.data ? ` • ${esc(topic.data)}` : ''}</p></div></div>
    <section class="post-card"><div class="post-user"><strong>${esc(topic.autor || 'Membro')}</strong></div><div class="post-content"><p>${esc(topic.conteudo || '')}</p></div></section>
    <section aria-label="Respostas"><h2 style="margin:28px 0 16px">Respostas (${replies.length})</h2>${renderReplies(replies)}</section>
    <p style="margin-top:24px;color:#64748b;font-size:.82rem">Este é conteúdo gerado por usuários do fórum QualProcessador e não representa necessariamente a posição editorial do site.</p>
  </article>`;
}

function injectHead(html, title, description, canonical, jsonLd) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  const block = [
    `<meta name="description" content="${attr(description)}">`,
    '<meta name="robots" content="index,follow,max-image-preview:large">',
    `<link rel="canonical" href="${attr(canonical)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(description)}">`,
    `<meta property="og:url" content="${attr(canonical)}">`,
    '<meta property="og:locale" content="pt_BR">',
    `<script type="application/ld+json" id="qp-ssr-forum-jsonld">${safeJson(jsonLd)}</script>`
  ].join('\n    ');
  return html.replace('</head>', `    ${block}\n</head>`);
}

function injectCanonicalNav(html) {
  return replacePrimaryNav(html, 'forum', {
    linksBox: true,
    userSlot: '<div id="navbar-user-box" class="nav-user-status"></div>'
  });
}

async function renderPage(req) {
  let html = template();
  const idRaw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = Number.parseInt(idRaw, 10);
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

  if (action || !Number.isFinite(id)) {
    let topics = [];
    try { topics = await supabase('topicos?select=id,titulo,autor,data,respostas&order=id.desc&limit=50'); } catch (_) {}
    const title = 'Fórum de Hardware | QualProcessador';
    const description = 'Fórum público do QualProcessador com discussões da comunidade sobre hardware, computadores, processadores, dúvidas e experiências de usuários.';
    const canonical = BASE_URL + '/forum';
    const jsonLd = {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Fórum QualProcessador', url: canonical,
      description, inLanguage: 'pt-BR', isPartOf: { '@type': 'WebSite', name: 'QualProcessador', url: BASE_URL + '/' },
      about: { '@type': 'Thing', name: 'Discussões de hardware da comunidade' }
    };
    html = injectHead(html, title, description, canonical, jsonLd);
    html = html.replace('<div class="main-forum-area" id="render-target"></div>', `<div class="main-forum-area" id="render-target">${renderList(topics)}</div>`);
    return injectCanonicalNav(html);
  }

  let topic = null;
  try {
    const rows = await supabase(`topicos?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    topic = Array.isArray(rows) ? rows[0] : null;
  } catch (_) {}

  if (!topic) {
    const title = 'Tópico não encontrado | Fórum QualProcessador';
    const description = 'O tópico solicitado não foi localizado no fórum QualProcessador.';
    const canonical = `${BASE_URL}/forum?id=${id}`;
    html = injectHead(html, title, description, canonical, { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: canonical });
    html = html.replace('<div class="main-forum-area" id="render-target"></div>', '<div class="main-forum-area" id="render-target"><section class="forum-action-header"><h1>Tópico não encontrado</h1><p>Esta discussão não está disponível.</p></section></div>');
    return injectCanonicalNav(html);
  }

  const canonical = topicUrl(topic);
  const description = String(topic.conteudo || '').replace(/\s+/g, ' ').trim().slice(0, 220) || `Discussão iniciada por ${topic.autor || 'um membro'} no fórum QualProcessador.`;
  const title = `${topic.titulo} | Fórum QualProcessador`;
  const replies = Array.isArray(topic.respostas) ? topic.respostas : [];
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'DiscussionForumPosting', headline: topic.titulo, text: topic.conteudo || '', url: canonical,
    inLanguage: 'pt-BR', author: { '@type': 'Person', name: topic.autor || 'Membro da comunidade' },
    commentCount: replies.length,
    comment: replies.slice(0, 50).map(reply => ({ '@type': 'Comment', text: reply.conteudo || '', author: { '@type': 'Person', name: reply.autor || 'Membro da comunidade' } })),
    isPartOf: { '@type': 'WebSite', name: 'QualProcessador', url: BASE_URL + '/' }
  };
  html = injectHead(html, title, description, canonical, jsonLd);
  html = html.replace('<div class="main-forum-area" id="render-target"></div>', `<div class="main-forum-area" id="render-target">${renderTopic(topic)}</div>`);
  return injectCanonicalNav(html);
}

module.exports = async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.end();
  try {
    return res.end(await renderPage(req));
  } catch (error) {
    res.statusCode = 500;
    return res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Fórum temporariamente indisponível</title><body><main><h1>Fórum temporariamente indisponível</h1><p>Tente novamente em instantes.</p></main></body></html>');
  }
};
