'use strict';

const fs = require('fs');
const path = require('path');
const { BASE_URL, carregarArtigos, artigoPorCaminho } = require('../lib/ai-utils');
const { absoluteUrl, enrichArticleHtml, collectArticleImages, toImageObject } = require('../lib/image-semantics');
const { replacePrimaryNav } = require('../lib/site-nav');

const TEMPLATE_PATH = path.resolve(__dirname, '..', 'ler-artigo.html');
let templateCache = null;

const NAV_CSS = `<style id="qp-primary-nav-article">
.portal-nav{position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e2e8f0}
.portal-nav .nav-container{max-width:1400px;margin:0 auto;padding:0 40px;display:flex;align-items:stretch;gap:5px;overflow-x:auto}
.portal-nav .nav-link{display:flex;align-items:center;padding:18px 20px;color:#475569;text-decoration:none;font-weight:700;font-size:.9rem;border-bottom:3px solid transparent;white-space:nowrap}
.portal-nav .nav-link:hover,.portal-nav .nav-link.active{color:#0284c7;border-bottom-color:#38bdf8;background:#f8fafc}
.portal-nav .user-nav-area{margin-left:auto;display:flex;align-items:center;gap:12px;padding-left:16px;white-space:nowrap}
@media(max-width:760px){.portal-nav .nav-container{padding:0 10px}.portal-nav .nav-link{padding:15px 12px;font-size:.82rem}.portal-nav .user-nav-area{padding-left:8px}}
</style>`;

function template() {
  if (!templateCache) templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  return templateCache;
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

function findArticle(req) {
  const artigos = carregarArtigos();
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (id && artigos[String(id)]) return artigos[String(id)];
  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
  if (rawPath) {
    const byPath = artigoPorCaminho(rawPath);
    if (byPath) return byPath;
  }
  return null;
}

function articleImageContext(article) {
  return { title: article.titulo, kind: 'Imagem', baseUrl: BASE_URL };
}

function renderArticleMain(article) {
  const context = articleImageContext(article);
  const body = enrichArticleHtml(article.texto || '', context);
  const coverUrl = article.imagemCapa ? absoluteUrl(article.imagemCapa, BASE_URL) : '';
  const coverAlt = article.imagemCapaAlt || `Imagem de capa do artigo ${article.titulo}`;
  const coverCaption = article.imagemCapaLegenda || '';
  const cover = coverUrl
    ? `<figure class="article-cover" data-image-kind="cover"><img src="${attr(coverUrl)}" class="cover-img" alt="${attr(coverAlt)}" loading="eager" decoding="async" fetchpriority="high" data-qp-semantic-image="true">${coverCaption ? `<figcaption>${esc(coverCaption)}</figcaption>` : ''}</figure>`
    : '';
  return `<main id="conteudo-artigo-dinamico">
    <article itemscope itemtype="https://schema.org/TechArticle">
      <header class="article-header">
        <span class="meta-category">${esc(article.categoria || 'Hardware')}</span>
        <h1 class="article-title" itemprop="headline">${esc(article.titulo)}</h1>
        <div class="article-meta-info">
          <div class="author-avatar" aria-hidden="true">QP</div>
          <div>Por <strong itemprop="author">${esc(article.autor || 'QualProcessador')}</strong>${article.tempoLeitura ? ` • Leitura: ${esc(article.tempoLeitura)}` : ''} • <a href="#secao-comentarios" class="link-comentarios-topo"><span id="topo-contador-comentarios">0</span> comentários</a></div>
        </div>
      </header>
      <div class="article-container">${cover}<div class="article-body" itemprop="articleBody">${body}</div></div>
    </article>
  </main>`;
}

function renderPage(article) {
  let html = template();
  const cleanPath = article.urlLimpa || `/artigo/${article.id}`;
  const canonical = BASE_URL + cleanPath;
  const title = `${article.titulo} | QualProcessador`;
  const description = article.descricao || `Leia ${article.titulo} no QualProcessador.`;
  const coverUrl = article.imagemCapa ? absoluteUrl(article.imagemCapa, BASE_URL) : '';
  const embedded = collectArticleImages(article.texto || '', articleImageContext(article));
  const images = [];
  if (coverUrl) images.push({ image_url: coverUrl, alt: article.imagemCapaAlt || `Imagem de capa do artigo ${article.titulo}`, caption: article.imagemCapaLegenda || '', kind: 'cover' });
  embedded.forEach(image => { if (!images.some(existing => existing.image_url === image.image_url)) images.push(image); });

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'TechArticle', headline: article.titulo, description,
    mainEntityOfPage: canonical, url: canonical, inLanguage: 'pt-BR',
    author: { '@type': 'Organization', name: article.autor || 'QualProcessador' },
    publisher: { '@type': 'Organization', name: 'QualProcessador', url: BASE_URL + '/' },
    isPartOf: { '@type': 'WebSite', name: 'QualProcessador', url: BASE_URL + '/' }
  };
  if (images.length) jsonLd.image = images.map(image => toImageObject(image, canonical));
  if (article.dataPublicacao) jsonLd.datePublished = article.dataPublicacao;
  if (article.dataModificacao) jsonLd.dateModified = article.dataModificacao;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/i, `<meta name="description" content="${attr(description)}">`);
  html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?\s*>/i, '<meta name="robots" content="index,follow,max-image-preview:large">');
  const extraHead = [
    `<link rel="canonical" href="${attr(canonical)}">`, '<meta property="og:type" content="article">',
    `<meta property="og:title" content="${attr(title)}">`, `<meta property="og:description" content="${attr(description)}">`,
    `<meta property="og:url" content="${attr(canonical)}">`, '<meta property="og:locale" content="pt_BR">',
    coverUrl ? `<meta property="og:image" content="${attr(coverUrl)}">` : '',
    coverUrl ? `<meta property="og:image:alt" content="${attr(article.imagemCapaAlt || `Imagem de capa do artigo ${article.titulo}`)}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    `<script type="application/ld+json" id="qp-ssr-article-jsonld">${safeJson(jsonLd)}</script>`, NAV_CSS
  ].filter(Boolean).join('\n    ');
  html = html.replace('</head>', `    ${extraHead}\n</head>`);
  html = html.replace(/<main id="conteudo-artigo-dinamico">[\s\S]*?<\/main>/i, renderArticleMain(article));
  html = replacePrimaryNav(html, 'articles', { userSlot: '<div id="user-nav-container" class="user-nav-area"></div>' });
  return html;
}

module.exports = function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }
  let article = null;
  try { article = findArticle(req); } catch (_) {}
  if (!article) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Artigo não encontrado | QualProcessador</title><body><main><h1>Artigo não encontrado</h1><p>O conteúdo solicitado não foi localizado.</p></main></body></html>');
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.end();
  return res.end(renderPage(article));
};
