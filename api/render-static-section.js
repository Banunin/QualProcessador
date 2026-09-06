'use strict';

const fs = require('fs');
const path = require('path');
const { BASE_URL, resolverCpu, slugCpu } = require('../lib/ai-utils');
const { renderPage: renderCpuPage } = require('./render-cpu');
const { replacePrimaryNav } = require('../lib/site-nav');

const PAGES = {
  articles: { file: 'analises.html', active: 'articles' },
  community: { file: 'Comunidade.html', active: 'community' },
  tools: { file: 'ferramentas.html', active: 'tools' }
};

const cache = new Map();
const CPU_NAV_CSS = `<style id="qp-primary-nav-cpu">
.portal-nav{display:flex;align-items:stretch;background:#fff;padding:0;width:100%;border-bottom:1px solid #e2e8f0;box-shadow:none;position:sticky;top:0;z-index:100}
.portal-nav .nav-container{width:100%;max-width:1400px;margin:0 auto;padding:0 40px;display:flex;align-items:stretch;gap:5px;overflow-x:auto}
.portal-nav .nav-link{display:flex;align-items:center;padding:18px 20px;color:#475569;text-decoration:none;font-weight:700;font-size:.9rem;border-bottom:3px solid transparent;white-space:nowrap}
.portal-nav .nav-link:hover,.portal-nav .nav-link.active{color:#0284c7;border-bottom-color:#38bdf8;background:#f8fafc}
.portal-nav .user-nav-area{margin-left:auto;display:flex;align-items:center;gap:12px;padding-left:16px;white-space:nowrap}
@media(max-width:760px){.portal-nav .nav-container{padding:0 10px}.portal-nav .nav-link{padding:15px 12px;font-size:.82rem}.portal-nav .user-nav-area{padding-left:8px}}
</style>`;

function loadPage(file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'));
  return cache.get(file);
}

function sendHtml(req, res, html, cacheControl = 'public, s-maxage=3600, stale-while-revalidate=86400') {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.end();
  return res.end(html);
}

function renderCpu(req, res) {
  const marca = Array.isArray(req.query.marca) ? req.query.marca[0] : req.query.marca;
  const slug = Array.isArray(req.query.cpu) ? req.query.cpu[0] : req.query.cpu;
  const cpu = resolverCpu(marca, slug);
  if (!cpu) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>CPU não encontrada | QualProcessador</title><body><main><h1>CPU não encontrada</h1><p>O processador solicitado não está cadastrado no QualProcessador.</p></main></body></html>');
  }

  let html = renderCpuPage(cpu, marca, slug);
  html = replacePrimaryNav(html, 'cpus', {
    userSlot: '<div id="user-nav-container" class="user-nav-area"></div>'
  });
  html = html.replace('</head>', `${CPU_NAV_CSS}\n</head>`);
  res.setHeader('Link', `<${BASE_URL}/api/cpu/${encodeURIComponent(slugCpu(cpu))}>; rel="alternate"; type="application/json", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
  return sendHtml(req, res, html);
}

module.exports = function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }

  const page = String(req.query.page || '').toLowerCase();
  if (page === 'cpu') return renderCpu(req, res);

  const config = PAGES[page];
  if (!config) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Página não encontrada');
  }

  const html = replacePrimaryNav(loadPage(config.file), config.active);
  return sendHtml(req, res, html);
};
