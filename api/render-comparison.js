'use strict';

const fs = require('fs');
const path = require('path');
const { BASE_URL, carregarCpus, slugCpu, urlCpu, normalizar, numeroCpu } = require('../lib/ai-utils');

const TEMPLATE_PATH = path.resolve(__dirname, '..', 'comparar.html');
let templateCache = null;

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
function value(v) { return v === undefined || v === null || String(v).trim() === '' ? '—' : String(v); }
function points(v) {
  const n = numeroCpu(v);
  return Number.isFinite(n) && n >= 100 ? `${Math.round(n).toLocaleString('pt-BR')} pts` : 'N/A';
}
function safeJson(obj) { return JSON.stringify(obj).replace(/</g, '\\u003c'); }

function ordenarPar(a, b) {
  const ai = Number(a && a.id);
  const bi = Number(b && b.id);
  if (Number.isFinite(ai) && Number.isFinite(bi)) return ai <= bi ? [a, b] : [b, a];
  return slugCpu(a) <= slugCpu(b) ? [a, b] : [b, a];
}

function resolverSlug(slug, cpus) {
  const alvo = normalizar(decodeURIComponent(String(slug || '')));
  return cpus.find(cpu => normalizar(slugCpu(cpu)) === alvo || normalizar(cpu.nome) === alvo) || null;
}

function resolverComparacao(raw, cpus) {
  const bruto = decodeURIComponent(String(raw || '')).replace(/^\/+|\/+$/g, '');
  const idx = bruto.indexOf('-vs-');
  if (idx < 1) return null;
  const a = resolverSlug(bruto.slice(0, idx), cpus);
  const b = resolverSlug(bruto.slice(idx + 4), cpus);
  return a && b && a.id !== b.id ? ordenarPar(a, b) : null;
}

function comparisonPath(a, b) {
  const [x, y] = ordenarPar(a, b);
  return `/comparar/${slugCpu(x)}-vs-${slugCpu(y)}`;
}

function cpuHead(cpu) {
  const brand = String(cpu.marca || cpu.fabricante || '').toLowerCase();
  return `<article class="cpu-head ${attr(brand)}"><span class="brand">${esc(String(cpu.marca || cpu.fabricante || '').toUpperCase())}</span><h3>${esc(cpu.nome)}</h3><div>${esc(value(cpu.cores))} núcleos • ${esc(value(cpu.threads))} threads • ${esc(value(cpu.soquete))}</div><a href="${attr(urlCpu(cpu))}">Abrir ficha técnica →</a></article>`;
}

function scoreCard(title, a, b, field) {
  return `<article class="score-card"><h3>${esc(title)}</h3><div class="score-row"><span>${esc(a.nome)}</span><strong>${esc(points(a[field]))}</strong></div><div class="score-row"><span>${esc(b.nome)}</span><strong>${esc(points(b[field]))}</strong></div></article>`;
}

function specRows(a, b) {
  const rows = [
    ['Núcleos', a.cores, b.cores], ['Threads', a.threads, b.threads], ['Clock base', a.freqBase, b.freqBase],
    ['Clock boost', a.freqBoost, b.freqBoost], ['TDP', a.tdp, b.tdp], ['Soquete', a.soquete, b.soquete],
    ['Arquitetura', a.arquitetura, b.arquitetura], ['Litografia', a.litografia, b.litografia],
    ['Cache L3', a.cacheL3, b.cacheL3], ['Memória', a.memoria, b.memoria], ['PCI Express', a.pcie, b.pcie],
    ['Vídeo integrado', a.video, b.video]
  ];
  return rows.map(([label, av, bv]) => `<tr><td>${esc(label)}</td><td>${esc(value(av))}</td><td>${esc(value(bv))}</td></tr>`).join('');
}

function summary(a, b) {
  return `<h2>Resumo da comparação</h2><p><strong>${esc(a.nome)}</strong> e <strong>${esc(b.nome)}</strong> são comparados com base nos dados cadastrados no QualProcessador. Veja núcleos, threads, clocks, plataforma, TDP e resultados CPU-Z.</p><p>CPU-Z Single Thread: ${esc(a.nome)} ${esc(points(a.notaJogos))}; ${esc(b.nome)} ${esc(points(b.notaJogos))}. CPU-Z Multi Thread: ${esc(a.nome)} ${esc(points(a.notaTrabalho))}; ${esc(b.nome)} ${esc(points(b.notaTrabalho))}.</p>`;
}

function renderPage(a, b) {
  let html = template();
  const canonical = BASE_URL + comparisonPath(a, b);
  const title = `${a.nome} vs ${b.nome}: comparação de processadores | QualProcessador`;
  const description = `Compare ${a.nome} e ${b.nome}: núcleos, threads, clocks, TDP, soquete, plataforma e resultados CPU-Z Single Thread e Multi Thread.`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: `${a.nome} vs ${b.nome}`, description, url: canonical, inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: 'QualProcessador', url: BASE_URL + '/' },
    about: [
      { '@type': 'Product', name: a.nome, url: BASE_URL + urlCpu(a) },
      { '@type': 'Product', name: b.nome, url: BASE_URL + urlCpu(b) }
    ],
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'QualProcessador', item: BASE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: 'Comparar processadores', item: BASE_URL + '/comparar' },
      { '@type': 'ListItem', position: 3, name: `${a.nome} vs ${b.nome}`, item: canonical }
    ] }
  };

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${attr(description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${attr(canonical)}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${attr(title)}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${attr(description)}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${attr(canonical)}">`);
  html = html.replace('</head>', `    <script type="application/ld+json" id="qp-ssr-comparison-jsonld">${safeJson(jsonLd)}</script>\n</head>`);

  html = html.replace('<h1 id="hero-title">Comparar Processadores</h1>', `<h1 id="hero-title">${esc(a.nome)} vs ${esc(b.nome)}</h1>`);
  html = html.replace('<p id="hero-desc">Escolha dois processadores. A página mostra especificações, plataforma e resultados CPU-Z lado a lado.</p>', '<p id="hero-desc">Especificações, plataforma e resultados CPU-Z lado a lado.</p>');
  html = html.replace('<section id="comparison" class="comparison">', '<section id="comparison" class="comparison active">');
  html = html.replace('<div id="breadcrumb" class="breadcrumb"></div>', `<div id="breadcrumb" class="breadcrumb"><a href="/">Home</a> › <a href="/comparar">Comparar</a> › ${esc(a.nome)} vs ${esc(b.nome)}</div>`);
  html = html.replace('<div class="comparison-title"><h2 id="comparison-heading"></h2><p id="comparison-lead"></p></div>', `<div class="comparison-title"><h2 id="comparison-heading">${esc(a.nome)} vs ${esc(b.nome)}</h2><p id="comparison-lead">Comparação baseada nas fichas técnicas e benchmarks cadastrados no QualProcessador.</p></div>`);
  html = html.replace('<div id="cpu-heads" class="cpu-heads"></div>', `<div id="cpu-heads" class="cpu-heads">${cpuHead(a)}${cpuHead(b)}</div>`);
  html = html.replace('<div id="score-grid" class="score-grid"></div>', `<div id="score-grid" class="score-grid">${scoreCard('CPU-Z Single Thread', a, b, 'notaJogos')}${scoreCard('CPU-Z Multi Thread', a, b, 'notaTrabalho')}</div>`);
  html = html.replace('<table class="spec-table"><thead id="spec-head"></thead><tbody id="spec-body"></tbody></table>', `<table class="spec-table"><thead id="spec-head"><tr><th>Especificação</th><th>${esc(a.nome)}</th><th>${esc(b.nome)}</th></tr></thead><tbody id="spec-body">${specRows(a, b)}</tbody></table>`);
  html = html.replace('<div id="summary-card" class="summary-card"></div>', `<div id="summary-card" class="summary-card">${summary(a, b)}</div>`);
  html = html.replace('<section id="empty-intro" class="empty-intro">', '<section id="empty-intro" class="empty-intro" style="display:none">');
  return html;
}

module.exports = function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); return res.end('Method Not Allowed');
  }
  const raw = Array.isArray(req.query.comparacao) ? req.query.comparacao[0] : req.query.comparacao;
  const pair = resolverComparacao(raw, carregarCpus());
  if (!pair) {
    res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Comparação não encontrada | QualProcessador</title><body><main><h1>Comparação não encontrada</h1><p>Não foi possível resolver os dois processadores solicitados.</p></main></body></html>');
  }
  const [a, b] = pair;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.end();
  return res.end(renderPage(a, b));
};
