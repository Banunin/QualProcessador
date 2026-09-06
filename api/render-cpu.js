'use strict';

const fs = require('fs');
const path = require('path');
const {
  BASE_URL,
  resolverCpu,
  urlCpu,
  numeroCpu,
  entityIdCpu,
  slugCpu,
  datasetPublico
} = require('../lib/ai-utils');

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
function present(v) { return v !== undefined && v !== null && String(v).trim() !== '' && String(v).toUpperCase() !== 'N/A'; }

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
    row('Nome completo', cpu.nome), row('Identificador QualProcessador', entityIdCpu(cpu)), row('Fabricante', manufacturer), row('Família do modelo', cpu.familia || cpu.relations?.family),
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

  return `<article aria-labelledby="cpu-title" data-entity-id="${attr(entityIdCpu(cpu))}" data-cpu-slug="${attr(slugCpu(cpu))}">
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
          ${cpu.foto ? `<img src="/img/${attr(cpu.foto)}" alt="Imagem de referência do processador ${attr(cpu.nome)}">` : `<span>${esc(cpu.nome)}</span>`}
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

function property(name, val, propertyID) {
  if (!present(val)) return null;
  const item = { '@type': 'PropertyValue', name, value: String(val) };
  if (propertyID) item.propertyID = propertyID;
  return item;
}

function jsonLdCpu(cpu, canonical, description) {
  const dataset = datasetPublico();
  const productId = canonical + '#processor';
  const webpageId = canonical + '#webpage';
  const breadcrumbId = canonical + '#breadcrumb';
  const datasetId = BASE_URL + '/dados.json#dataset';
  const fabricante = cpu.fabricante || String(cpu.marca || '').toUpperCase();
  const properties = [
    property('Identificador QualProcessador', entityIdCpu(cpu), 'qp:entity_id'),
    property('Núcleos', cpu.cores, 'cores'),
    property('Threads', cpu.threads, 'threads'),
    property('Clock base', cpu.freqBase, 'freqBase'),
    property('Clock boost', cpu.freqBoost, 'freqBoost'),
    property('Soquete', cpu.soquete, 'soquete'),
    property('TDP', cpu.tdp, 'tdp'),
    property('Arquitetura', cpu.arquitetura, 'arquitetura'),
    property('Codinome', cpu.codinome, 'codinome'),
    property('Litografia', cpu.litografia, 'litografia'),
    property('Cache L3', cpu.cacheL3, 'cacheL3'),
    property('Memória', cpu.memoria, 'memoria'),
    property('PCI Express', cpu.pcie, 'pcie'),
    property('Vídeo integrado', cpu.video, 'video'),
    property('CPU-Z Benchmark 17 Single Thread', points(cpu.notaJogos), 'notaJogos'),
    property('CPU-Z Benchmark 17 Multi Thread', points(cpu.notaTrabalho), 'notaTrabalho')
  ].filter(Boolean);

  const product = {
    '@type': 'Product',
    '@id': productId,
    identifier: entityIdCpu(cpu),
    name: cpu.nome,
    model: cpu.nome,
    url: canonical,
    description,
    category: 'Processador para computador',
    brand: { '@type': 'Brand', name: fabricante },
    manufacturer: { '@type': 'Organization', name: fabricante },
    additionalProperty: properties,
    subjectOf: {
      '@type': 'WebAPI',
      name: `API individual de ${cpu.nome}`,
      url: `${BASE_URL}/api/cpu/${encodeURIComponent(slugCpu(cpu))}`
    }
  };
  if (cpu.foto) {
    product.image = {
      '@type': 'ImageObject',
      contentUrl: `${BASE_URL}/img/${String(cpu.foto).replace(/^\/+/, '')}`,
      caption: `Imagem de referência do processador ${cpu.nome}`,
      description: `Imagem associada à ficha técnica de ${cpu.nome} no QualProcessador.`
    };
  }

  const webpage = {
    '@type': 'WebPage',
    '@id': webpageId,
    name: `${cpu.nome} - ficha técnica e resultados CPU-Z`,
    description,
    url: canonical,
    inLanguage: 'pt-BR',
    mainEntity: { '@id': productId },
    about: { '@id': productId },
    isPartOf: { '@type': 'WebSite', '@id': BASE_URL + '/#website', name: 'QualProcessador', url: BASE_URL + '/' },
    isBasedOn: { '@id': datasetId },
    breadcrumb: { '@id': breadcrumbId }
  };
  if (dataset.last_modified) webpage.dateModified = dataset.last_modified;

  const datasetNode = {
    '@type': 'Dataset',
    '@id': datasetId,
    name: dataset.name,
    url: dataset.canonical_url,
    version: dataset.dataset_version || undefined,
    description: 'Base estruturada de processadores utilizada pelas fichas e APIs do QualProcessador.',
    creator: { '@type': 'Organization', name: 'QualProcessador', url: BASE_URL + '/' },
    distribution: {
      '@type': 'DataDownload',
      contentUrl: dataset.canonical_url,
      encodingFormat: 'application/json'
    }
  };
  if (dataset.last_modified) datasetNode.dateModified = dataset.last_modified;

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': breadcrumbId,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'QualProcessador', item: BASE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: String(cpu.marca || fabricante).toUpperCase(), item: BASE_URL + '/#cpus' },
      { '@type': 'ListItem', position: 3, name: cpu.nome, item: canonical }
    ]
  };

  return { '@context': 'https://schema.org', '@graph': [webpage, product, datasetNode, breadcrumb] };
}

function renderPage(cpu, marca, slug) {
  let html = template();
  const canonical = BASE_URL + urlCpu(cpu);
  const description = `${cpu.nome}: ficha técnica com núcleos, threads, clocks, soquete, TDP, memória, gráficos e resultados CPU-Z Single Thread e Multi Thread.`;
  const title = `${cpu.nome}: ficha técnica, CPU-Z e especificações | QualProcessador`;
  const jsonLd = jsonLdCpu(cpu, canonical, description);
  const imageMeta = cpu.foto ? `\n<meta property="og:image" content="${attr(`${BASE_URL}/img/${String(cpu.foto).replace(/^\/+/, '')}`)}">` : '';

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace('</head>', `\n<meta name="description" content="${attr(description)}">\n<meta name="robots" content="index,follow,max-image-preview:large">\n<meta name="qp:entity-id" content="${attr(entityIdCpu(cpu))}">\n<meta name="qp:cpu-slug" content="${attr(slugCpu(cpu))}">\n<link rel="canonical" href="${attr(canonical)}">\n<link rel="alternate" type="application/json" href="${attr(`${BASE_URL}/api/cpu/${encodeURIComponent(slugCpu(cpu))}`)}">\n<meta property="og:type" content="article">\n<meta property="og:title" content="${attr(title)}">\n<meta property="og:description" content="${attr(description)}">\n<meta property="og:url" content="${attr(canonical)}">\n<meta property="og:locale" content="pt_BR">${imageMeta}\n<meta name="twitter:card" content="summary_large_image">\n<script type="application/ld+json" id="qp-ssr-jsonld">${safeJson(jsonLd)}</script>\n</head>`);
  html = html.replace('<div class="container" id="conteudo-dinamico"></div>', `<div class="container" id="conteudo-dinamico">${renderContent(cpu)}</div>`);
  html = html.replace('<script src="dados.js"></script>', `<script>const listaDeCpus = ${safeJson([cpu])};</script>`);
  html = html.replace("const marca = urlParams.get('marca');", `const marca = urlParams.get('marca') || ${JSON.stringify(String(marca || cpu.marca || ''))};`);
  html = html.replace("const cpuSlug = urlParams.get('cpu');", `const cpuSlug = urlParams.get('cpu') || ${JSON.stringify(String(slug || cpu.slug || ''))};`);
  html = html.replace('</body>', '<script src="/details-compare-loader.js" defer></script>\n</body>');
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
  res.setHeader('Link', `<${BASE_URL}/api/cpu/${encodeURIComponent(slugCpu(cpu))}>; rel="alternate"; type="application/json", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
  if (req.method === 'HEAD') return res.end();
  return res.end(renderPage(cpu, marca, slug));
};

module.exports.renderPage = renderPage;
module.exports.jsonLdCpu = jsonLdCpu;
