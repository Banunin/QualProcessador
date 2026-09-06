'use strict';

const fs = require('fs');
const path = require('path');
const { BASE_URL, resolverCpu, urlCpu, numeroCpu } = (() => {
  const utils = require('../lib/ai-utils');
  return { ...utils, numeroCpu: (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const m = String(v ?? '').match(/-?\d+(?:[.,]\d+)?/);
    return m ? Number(m[0].replace(',', '.')) : null;
  }};
})();

const TEMPLATE_PATH = path.resolve(__dirname, '..', 'detalhes.html');
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

function row(label, val) {
  return `<tr><td>${esc(label)}</td><td>${esc(value(val))}</td></tr>`;
}

function table(title, rows, brandClass) {
  return `<table class="tech-table" style="margin-bottom:25px"><thead><tr><th colspan="2" class="${brandClass}">${esc(title)}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function renderContent(cpu) {
  const brandClass = String(cpu.marca || '').toLowerCase() === 'amd' ? 'brand-gradient-amd' : 'brand-gradient-intel';
  const border = String(cpu.marca || '').toLowerCase() === 'amd' ? '#ef4444' : '#3b82f6';
  const single = points(cpu.notaJogos);
  const multi = points(cpu.notaTrabalho);
  const manufacturer = cpu.fabricante || (String(cpu.marca || '').toLowerCase() === 'amd' ? 'AMD' : 'Intel');

  const basic = [
    row('Nome completo', cpu.nome), row('Fabricante', manufacturer), row('Família do modelo', cpu.familia),
    row('Geração', cpu.geracao), row('Arquitetura', cpu.arquitetura), row('Codinome', cpu.codinome),
    row('Data de lançamento', cpu.lancamento), row('Segmento', cpu.segmento), row('Mercado', cpu.mercado)
  ];
  const perf = [
    row('Núcleos físicos', cpu.cores), row('Threads', cpu.threads), row('Frequência base', cpu.freqBase),
    row('Frequência turbo', cpu.freqBoost), row('Multiplicador desbloqueado', cpu.desbloqueado), row('Overclock', cpu.overclock),
    row('Cache L1', cpu.cacheL1), row('Cache L2', cpu.cacheL2), row('Cache L3', cpu.cacheL3)
  ];
  const platform = [
    row('Socket / Soquete', cpu.soquete), row('Chipsets compatíveis', cpu.chipsets), row('Tipo de conexão', cpu.tipoFixacao),
    row('Versão PCI Express', cpu.pcie), row('Linhas PCIe da CPU', cpu.pcieLanes), row('Configurações PCIe', cpu.pcieConfig)
  ];
  const memory = [
    row('Tipo de memória', cpu.memoria), row('Canais de memória', cpu.canaisMemoria), row('Frequência oficial', cpu.freqMemoria),
    row('Memória máxima suportada', cpu.memoriaMaxima), row('Suporte a ECC', cpu.ecc || cpu.suporteEcc)
  ];
  const graphics = [row('Vídeo integrado', cpu.video), row('GPU integrada', cpu.gpuIntegrada), row('Frequência GPU', cpu.igpuFreq)];
  const power = [
    row('TDP', cpu.tdp), row('Consumo máximo (PPT/Turbo)', cpu.consumoMaximo), row('Cooler incluso', cpu.coolerIncluso),
    row('Processo de fabricação (Litografia)', cpu.litografia)
  ];
  const tech = [
    row('Tecnologia Multithreading (SMT/HT)', Number(cpu.threads) > Number(cpu.cores) ? 'Sim' : 'Não'),
    row('Virtualização', cpu.virtualizacao), row('Conjunto de instruções', cpu.instrucoes)
  ];

  return `<article aria-labelledby="cpu-title">
    <div class="processor-header"><h1 id="cpu-title">${esc(cpu.nome)}</h1></div>
    <div class="top-specs-bar">
      <div class="spec-box"><strong>${esc(value(cpu.cores))}</strong><span>Núcleos</span></div>
      <div class="spec-box"><strong>${esc(value(cpu.threads))}</strong><span>Threads</span></div>
      <div class="spec-box"><strong>${esc(value(cpu.tdp))}</strong><span>TDP</span></div>
      <div class="spec-box"><strong>${esc(value(cpu.freqBase))}</strong><span>Clock base</span></div>
      <div class="spec-box"><strong>${esc(value(cpu.freqBoost))}</strong><span>Boost</span></div>
      <div class="spec-box"><strong>${esc(value(cpu.codinome))}</strong><span>Codinome</span></div>
      <div class="spec-box"><strong>${esc(value(cpu.soquete))}</strong><span>Soquete</span></div>
    </div>
    <div class="layout-grid">
      <aside class="sidebar">
        <div class="product-photo" style="border-color:${border};border-style:solid">
          ${cpu.foto ? `<img src="/img/${attr(cpu.foto)}" alt="${attr(cpu.nome)}">` : `<span>${esc(cpu.nome)}</span>`}
        </div>
      </aside>
      <div class="main-content-panel">
        <section id="panel-ficha" class="tab-panel active">
          <div class="panel-card">
            <h2>Visão geral</h2>
            <p><strong>${esc(cpu.nome)}</strong> possui ${esc(value(cpu.cores))} núcleos, ${esc(value(cpu.threads))} threads, clock base de ${esc(value(cpu.freqBase))} e boost de até ${esc(value(cpu.freqBoost))}.</p>
            <p>Soquete <strong>${esc(value(cpu.soquete))}</strong>, TDP de <strong>${esc(value(cpu.tdp))}</strong> e litografia de <strong>${esc(value(cpu.litografia))}</strong>.</p>
          </div>
          <div class="panel-card">
            <h2>Benchmarks CPU-Z</h2>
            <div class="fichometro-container">
              <div class="fichometro-item"><div class="fichometro-label"><span>CPU-Z Single Thread</span><strong>${esc(single)}</strong></div></div>
              <div class="fichometro-item"><div class="fichometro-label"><span>CPU-Z Multi Thread</span><strong>${esc(multi)}</strong></div></div>
            </div>
            <p style="margin-top:18px;color:#64748b;font-size:.88rem">CPU-Z é um benchmark sintético; as pontuações não correspondem diretamente a FPS.</p>
          </div>
          ${table('Informações Básicas', basic, brandClass)}
          ${table('Desempenho', perf, brandClass)}
          ${table('Plataforma', platform, brandClass)}
          ${table('Memória', memory, brandClass)}
          ${table('Gráficos', graphics, brandClass)}
          ${table('Energia e Temperatura', power, brandClass)}
          ${table('Recursos e Tecnologias', tech, brandClass)}
        </section>
      </div>
    </div>
  </article>`;
}

function safeJson(obj) { return JSON.stringify(obj).replace(/</g, '\\u003c'); }

function renderPage(cpu, marca, slug) {
  let html = template();
  const canonical = BASE_URL + urlCpu(cpu);
  const description = `${cpu.nome}: ficha técnica com núcleos, threads, clocks, soquete, TDP, memória, gráficos e resultados CPU-Z Single Thread e Multi Thread.`;
  const title = `${cpu.nome}: ficha técnica, CPU-Z e especificações | QualProcessador`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${cpu.nome} - ficha técnica e resultados CPU-Z`,
    description,
    url: canonical,
    inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: 'QualProcessador', url: BASE_URL + '/' },
    about: {
      '@type': 'Product',
      name: cpu.nome,
      brand: { '@type': 'Brand', name: cpu.fabricante || String(cpu.marca || '').toUpperCase() },
      category: 'Processador para computador',
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Núcleos', value: value(cpu.cores) },
        { '@type': 'PropertyValue', name: 'Threads', value: value(cpu.threads) },
        { '@type': 'PropertyValue', name: 'Soquete', value: value(cpu.soquete) },
        { '@type': 'PropertyValue', name: 'TDP', value: value(cpu.tdp) },
        { '@type': 'PropertyValue', name: 'CPU-Z Single Thread', value: points(cpu.notaJogos) },
        { '@type': 'PropertyValue', name: 'CPU-Z Multi Thread', value: points(cpu.notaTrabalho) }
      ]
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'QualProcessador', item: BASE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: String(cpu.marca || cpu.fabricante || '').toUpperCase(), item: BASE_URL + '/#cpus' },
        { '@type': 'ListItem', position: 3, name: cpu.nome, item: canonical }
      ]
    }
  };

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace('</head>', `\n<meta name="description" content="${attr(description)}">\n<meta name="robots" content="index,follow,max-image-preview:large">\n<link rel="canonical" href="${attr(canonical)}">\n<meta property="og:type" content="article">\n<meta property="og:title" content="${attr(title)}">\n<meta property="og:description" content="${attr(description)}">\n<meta property="og:url" content="${attr(canonical)}">\n<meta property="og:locale" content="pt_BR">\n<meta name="twitter:card" content="summary">\n<script type="application/ld+json" id="qp-ssr-jsonld">${safeJson(jsonLd)}</script>\n</head>`);
  html = html.replace('<div class="container" id="conteudo-dinamico"></div>', `<div class="container" id="conteudo-dinamico">${renderContent(cpu)}</div>`);
  html = html.replace("const marca = urlParams.get('marca');", `const marca = urlParams.get('marca') || ${JSON.stringify(String(marca || cpu.marca || ''))};`);
  html = html.replace("const cpuSlug = urlParams.get('cpu');", `const cpuSlug = urlParams.get('cpu') || ${JSON.stringify(String(slug || ''))};`);
  return html;
}

module.exports = function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }
  const marca = Array.isArray(req.query.marca) ? req.query.marca[0] : req.query.marca;
  const slug = Array.isArray(req.query.cpu) ? req.query.cpu[0] : req.query.cpu;
  const cpu = resolverCpu(marca, slug);
  if (!cpu) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>CPU não encontrada | QualProcessador</title><body><main><h1>CPU não encontrada</h1><p>O processador solicitado não está cadastrado no QualProcessador.</p></main></body></html>');
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'HEAD') return res.end();
  return res.end(renderPage(cpu, marca, slug));
};
