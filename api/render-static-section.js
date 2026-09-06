'use strict';

const fs = require('fs');
const path = require('path');
const { replacePrimaryNav } = require('../lib/site-nav');

const PAGES = {
  articles: { file: 'analises.html', active: 'articles' },
  community: { file: 'Comunidade.html', active: 'community' },
  tools: { file: 'ferramentas.html', active: 'tools' }
};

const cache = new Map();

function loadPage(file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'));
  return cache.get(file);
}

module.exports = function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }
  const config = PAGES[String(req.query.page || '').toLowerCase()];
  if (!config) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Página não encontrada');
  }
  const html = replacePrimaryNav(loadPage(config.file), config.active);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.end();
  return res.end(html);
};
