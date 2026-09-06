'use strict';

const fs = require('fs');
const path = require('path');
const {
  BASE_URL,
  carregarCpus,
  slugCpu,
  urlCpu,
  normalizar,
  numeroCpu,
  entityIdCpu,
  cpuPublica,
  datasetPublico,
  ordenarPar,
  resolverComparacao: resolverComparacaoBase,
  urlComparacao
} = require('../lib/ai-utils');

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

function resolverSlug(slug, cpus) {
  const alvo = normalizar(decodeURIComponent(String(slug || '')));
  return cpus.find(cpu => normalizar(slugCpu(cpu)) === alvo || normalizar(cpu.nome) === alvo) || null;
}

function resolverComparacao(raw, cpus) {
  const direto = resolverComparacaoBase(decodeURIComponent(String(raw || '')));
  if (direto) return direto;
  const bruto = decodeURIComponent(String(raw || '')).replace(/^\/+|\/+$/g, '');
  const idx = bruto.indexOf('-vs-');
  if (idx < 1) return null;
  const a = resolverSlug(bruto.slice(0, idx), cpus);
  const b = resolverSlug(bruto.slice(idx + 4), cpus);
  return a && b && entityIdCpu(a) !== entityIdCpu(b) ? ordenarPar(a, b) : null;
}

function comparisonPath(a, b) { return urlComparacao(a, b); }

function cpuHead(cpu) {
  const brand = String(cpu.marca || cpu.fabricante || '').toLowerCase();
  return `<article class="cpu-head ${attr(brand)}" data-entity-id="${attr(entityIdCpu(cpu))}"><span class="brand">${esc(String(cpu.marca || cpu.fabricante || '').toUpperCase())}</span><h3>${esc(cpu.nome)}</h3><div>${esc(value(cpu.cores))} núcleos • ${esc(value(cpu.threads))} threads • ${esc(value(cpu.soquete))}</div><a href="${attr(urlCpu(cpu))}">Abrir ficha técnica →</a></article>`;
}

function scoreCard(title, a, b, field) {
  return `<article class="score-card"><h3>${esc(title)}</h3><div class="score-row"><span>${esc(a.nome)}</span><strong>${esc(points(a[field]))}</strong></div><div class="score-row"><span>${esc(b.nome)}</span><strong>${esc(points(b[field]))}</strong></div></article>`;
}

const CAMPOS = [
  ['cores', 'Núcleos'], ['threads', 'Threads'], ['freqBase', 'Clock base'], ['freqBoost', 'Clock boost'],
  ['tdp', 'TDP'], ['soquete', 'Soquete'], ['arquitetura', 'Arquitetura'], ['codinome', 'Codinome'],
  ['litografia', 'Litografia'], ['cacheL3', 'Cache L3'], ['memoria', 'Memória'], ['pcie', 'PCI Express'],
  ['video', 'Vídeo integrado'], ['notaJogos', 'CPU-Z Benchmark 17 Single Thread'], ['notaTrabalho', 'CPU-Z Benchmark 17 Multi Thread']
];

function specRows(a, b) {
  return CAMPOS.filter(([key]) => !['notaJogos', 'notaTrabalho'].includes(key))
    .map(([key, label]) => `<tr><td>${esc(label)}</td><td>${esc(value(a[key]))}</td><td>${esc(value(b[key]))}</td></tr>`).join('');
}

function summary(a, b) {
  return `<h2>Resumo da comparação</h2><p><strong>${esc(a.nome)}</strong> e <strong>${esc(b.nome)}</strong> são comparados com base nos dados cadastrados no QualProcessador. Veja núcleos, threads, clocks, plataforma, TDP e resultados CPU-Z.</p><p>CPU-Z Single Thread: ${esc(a.nome)} ${esc(points(a.notaJogos))}; ${esc(b.nome)} ${esc(points(b.notaJogos))}. CPU-Z Multi Thread: ${esc(a.nome)} ${esc(points(a.notaTrabalho))}; ${esc(b.nome)} ${esc(points(b.notaTrabalho))}.</p>`;
}

function renderPage(a, b) {
  [a, b] = ordenarPar(a, b);
  let html = template();
  const canonical = BASE_URL + comparisonPath(a, b);
  const title = `${a.nome} vs ${b.nome}: comparação de processadores | QualProcessador`;
  const description = `Compare ${a.nome} e ${b.nome}: núcleos, threads, clocks, TDP, soquete, plataforma e resultados CPU-Z Single Thread e Multi Thread.`;
  const apiUrl = `${BASE_URL}/api/comparison/${slugCpu(a)}-vs-${slugCpu(b)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': canonical + '#webpage', name: `${a.nome} vs ${b.nome}`, description, url: canonical, inLanguage: 'pt-BR',
        isPartOf: { '@type': 'WebSite', '@id': BASE_URL + '/#website', name: 'QualProcessador', url: BASE_URL + '/' },
        about: [
          { '@type': 'Product', '@id': BASE_URL + urlCpu(a) + '#processor', name: a.nome, identifier: entityIdCpu(a), url: BASE_URL + urlCpu(a) },
          { '@type': 'Product', '@id': BASE_URL + urlCpu(b) + '#processor', name: b.nome, identifier: entityIdCpu(b), url: BASE_URL + urlCpu(b) }
        ],
        subjectOf: { '@type': 'WebAPI', name: 'API estruturada desta comparação', url: apiUrl },
        isBasedOn: { '@type': 'Dataset', '@id': BASE_URL + '/dados.json#dataset', url: BASE_URL + '/dados.json' }
      },
      {
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'QualProcessador', item: BASE_URL + '/' },
          { '@type': 'ListItem', position: 2, name: 'Comparar processadores', item: BASE_URL + '/comparar' },
          { '@type': 'ListItem', position: 3, name: `${a.nome} vs ${b.nome}`, item: canonical }
        ]
      }
    ]
  };

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${attr(description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${attr(canonical)}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${attr(title)}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${attr(description)}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${attr(canonical)}">`);
  html = html.replace('</head>', `    <link rel="alternate" type="application/json" href="${attr(apiUrl)}">\n    <script type="application/ld+json" id="qp-ssr-comparison-jsonld">${safeJson(jsonLd)}</script>\n</head>`);

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

function structuredComparison(a, b) {
  [a, b] = ordenarPar(a, b);
  const fields = {};
  for (const [key, label] of CAMPOS) {
    const av = a[key] === undefined || a[key] === null || String(a[key]).trim() === '' ? null : a[key];
    const bv = b[key] === undefined || b[key] === null || String(b[key]).trim() === '' ? null : b[key];
    fields[key] = { label, processor_a: av, processor_b: bv, different: String(av ?? '') !== String(bv ?? '') };
  }
  return {
    entity_type: 'processor_comparison',
    entity_id: `qp:comparison:${String(a.id)}:${String(b.id)}`,
    slug: `${slugCpu(a)}-vs-${slugCpu(b)}`,
    canonical_url: BASE_URL + comparisonPath(a, b),
    processor_a: cpuPublica(a),
    processor_b: cpuPublica(b),
    fields,
    benchmark_semantics: {
      notaJogos: 'CPU-Z Benchmark 17 Single Thread',
      notaTrabalho: 'CPU-Z Benchmark 17 Multi Thread',
      missing_value: 'N/A'
    },
    provenance: {
      source: 'QualProcessador CPU Database',
      dataset_url: BASE_URL + '/dados.json',
      note: 'A comparação reutiliza os valores publicados na mesma base canônica das fichas individuais; campos ausentes não são preenchidos por inferência.'
    }
  };
}

function responderComparisonJson(req, res, a, b) {
  const comparison = structuredComparison(a, b);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Link', `<${comparison.canonical_url}>; rel="canonical", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
  if (req.method === 'HEAD') return res.end();
  return res.end(JSON.stringify({ source: 'QualProcessador', language: 'pt-BR', dataset: datasetPublico(), comparison }, null, 2));
}

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.end();
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD, OPTIONS'); return res.end('Method Not Allowed');
  }
  const raw = Array.isArray(req.query.comparacao) ? req.query.comparacao[0] : (req.query.comparacao || req.query.comparison);
  const pair = resolverComparacao(raw, carregarCpus());
  const wantsJson = normalizar(req.query.format || '') === 'json';
  if (!pair) {
    res.statusCode = 404;
    if (wantsJson) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'comparison_not_found', query: raw || null }, null, 2));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Comparação não encontrada | QualProcessador</title><body><main><h1>Comparação não encontrada</h1><p>Não foi possível resolver os dois processadores solicitados.</p></main></body></html>');
  }
  const [a, b] = pair;
  if (wantsJson) return responderComparisonJson(req, res, a, b);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Link', `<${BASE_URL}/api/comparison/${slugCpu(a)}-vs-${slugCpu(b)}>; rel="alternate"; type="application/json", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
  if (req.method === 'HEAD') return res.end();
  return res.end(renderPage(a, b));
};

module.exports.renderPage = renderPage;
module.exports.structuredComparison = structuredComparison;
