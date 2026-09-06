'use strict';

const {
  BASE_URL,
  carregarDatasetCpus,
  carregarCpus,
  normalizar,
  marcaCpu,
  slugCpu,
  urlCpu,
  entityIdCpu,
  resolverCpu,
  cpuPublica,
  datasetPublico,
  responderJson
} = require('../lib/ai-utils');

function responderJs(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Content-Language', 'pt-BR');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Link', `<${BASE_URL}/dados.json>; rel="canonical"; type="application/json", <${BASE_URL}/schemas/processadores.schema.json>; rel="describedby"; type="application/schema+json"`);
  return res.end(body);
}

function legacyJs(req, res) {
  const dataset = carregarDatasetCpus();
  const metadata = {
    dataset_version: dataset.dataset_version || null,
    content_sha256: dataset.content_sha256 || null,
    last_modified: dataset.last_modified || null,
    canonical_url: dataset.canonical_url || BASE_URL + '/dados.json',
    source_of_truth: BASE_URL + '/dados.json'
  };
  if (req.method === 'HEAD') return responderJs(res, 200, '');
  return responderJs(res, 200, [
    '// Compatibilidade gerada em tempo de requisição a partir de /dados.json.',
    '// A fonte canônica é dados.json; este endpoint apenas preserva o contrato listaDeCpus do frontend.',
    `const listaDeCpus = ${JSON.stringify(dataset.processors)};`,
    `const qpCpuDatasetMetadata = ${JSON.stringify(metadata)};`,
    ''
  ].join('\n'));
}

function individual(req, res) {
  const identificador = String(req.query.cpu || req.query.slug || req.query.id || req.query.entity_id || '').trim();
  if (!identificador) {
    return responderJson(res, 400, {
      error: 'missing_cpu_identifier',
      message: 'Informe um slug, id ou entity_id. Exemplo: /api/cpu/amd-ryzen-5-5600.'
    });
  }
  const cpu = resolverCpu('', identificador);
  if (!cpu) {
    return responderJson(res, 404, {
      error: 'cpu_not_found',
      query: identificador,
      search: `${BASE_URL}/api/search?q=${encodeURIComponent(identificador)}`
    });
  }
  const item = cpuPublica(cpu);
  res.setHeader('Link', `<${item.canonical_url}>; rel="canonical", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Language', 'pt-BR');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.end();
  }
  return responderJson(res, 200, {
    source: 'QualProcessador',
    language: 'pt-BR',
    dataset: datasetPublico(),
    item,
    interpretation: {
      benchmark_note: 'CPU-Z é benchmark sintético; os valores não equivalem diretamente a FPS.',
      missing_values: 'Campos ausentes, vazios ou N/A não devem ser inferidos.'
    }
  });
}

function possuiVideoIntegrado(cpu) {
  const texto = normalizar(cpu && cpu.video || '');
  if (!texto) return false;
  return !(
    texto === 'n-a' ||
    texto === 'nao' ||
    texto.includes('nao-possui') ||
    texto.includes('sem-video') ||
    texto === 'none'
  );
}

function cpuCardPublica(cpu) {
  return {
    id: cpu.id,
    entity_id: entityIdCpu(cpu),
    nome: cpu.nome,
    marca: marcaCpu(cpu),
    detalhe: cpu.detalhe || '',
    cores: cpu.cores ?? null,
    threads: cpu.threads ?? null,
    freqBoost: cpu.freqBoost ?? null,
    tdp: cpu.tdp ?? null,
    soquete: cpu.soquete || cpu.socket || null,
    video: cpu.video ?? null,
    slug: slugCpu(cpu),
    url: urlCpu(cpu)
  };
}

function cpuOptionPublica(cpu) {
  return {
    id: cpu.id,
    nome: cpu.nome,
    marca: marcaCpu(cpu),
    slug: slugCpu(cpu),
    url: urlCpu(cpu)
  };
}

function datasetResumoFrontend() {
  const dataset = carregarDatasetCpus();
  return {
    name: dataset.dataset || 'QualProcessador CPU Database',
    dataset_version: dataset.dataset_version || null,
    last_modified: dataset.last_modified || null,
    count: dataset.processors.length,
    canonical_url: dataset.canonical_url || BASE_URL + '/dados.json'
  };
}

function catalog(req, res) {
  const cpus = carregarCpus();
  const id = String(req.query.id || '').trim();
  const entityId = String(req.query.entity_id || '').trim();
  const slug = normalizar(req.query.slug || '');
  const marca = normalizar(req.query.marca || req.query.brand || '');
  const socket = normalizar(req.query.socket || req.query.soquete || '');
  const familia = normalizar(req.query.family || req.query.familia || '');
  const geracao = normalizar(req.query.generation || req.query.geracao || '');
  const video = normalizar(req.query.video || '');
  const busca = normalizar(req.query.q || '');
  const view = normalizar(req.query.view || 'full');
  const sort = normalizar(req.query.sort || 'id-asc');
  const offset = Math.max(0, Number.parseInt(req.query.offset || '0', 10) || 0);
  const limit = Math.min(250, Math.max(1, Number.parseInt(req.query.limit || '50', 10) || 50));

  let filtradas = cpus;
  if (id) filtradas = filtradas.filter(cpu => String(cpu.id) === id);
  if (entityId) filtradas = filtradas.filter(cpu => entityIdCpu(cpu) === entityId);
  if (marca) filtradas = filtradas.filter(cpu => marcaCpu(cpu) === marca);
  if (slug) filtradas = filtradas.filter(cpu => slugCpu(cpu) === slug || normalizar(cpu.nome) === slug);
  if (socket) filtradas = filtradas.filter(cpu => normalizar(cpu.soquete || cpu.socket) === socket);
  if (familia) filtradas = filtradas.filter(cpu => normalizar(cpu.familia || cpu.relations?.family) === familia);
  if (geracao) filtradas = filtradas.filter(cpu => normalizar(cpu.geracao || cpu.relations?.generation) === geracao);
  if (video === 'sim') filtradas = filtradas.filter(possuiVideoIntegrado);
  if (video === 'nao') filtradas = filtradas.filter(cpu => !possuiVideoIntegrado(cpu));
  if (busca) filtradas = filtradas.filter(cpu => {
    const alvo = [
      cpu.nome, cpu.slug, cpu.entity_id, cpu.marca, cpu.fabricante, cpu.familia,
      cpu.geracao, cpu.arquitetura, cpu.codinome, cpu.soquete
    ].map(normalizar).join(' ');
    return alvo.includes(busca) || busca.split('-').filter(Boolean).every(token => alvo.includes(token));
  });

  filtradas = filtradas.slice();
  if (sort === 'id-desc') {
    filtradas.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  } else if (sort === 'nome-asc' || sort === 'name-asc') {
    filtradas.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  } else {
    filtradas.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }

  const total = filtradas.length;
  const pagina = filtradas.slice(offset, offset + limit);
  const cardView = view === 'card' || view === 'frontend-card';
  const optionView = view === 'option' || view === 'frontend-option';
  const itens = optionView
    ? pagina.map(cpuOptionPublica)
    : cardView
      ? pagina.map(cpuCardPublica)
      : pagina.map(cpuPublica);

  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Language', 'pt-BR');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.end();
  }
  return responderJson(res, 200, {
    source: 'QualProcessador',
    language: 'pt-BR',
    dataset: cardView || optionView ? datasetResumoFrontend() : datasetPublico(),
    view: view || 'full',
    filters: {
      id: id || null,
      entity_id: entityId || null,
      slug: slug || null,
      brand: marca || null,
      socket: socket || null,
      family: familia || null,
      generation: geracao || null,
      video: video || null,
      q: busca || null
    },
    pagination: {
      total,
      offset,
      limit,
      returned: itens.length,
      has_more: offset + itens.length < total
    },
    items: itens
  });
}

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.end();
  }
  if (!['GET', 'HEAD'].includes(req.method)) return responderJson(res, 405, { error: 'method_not_allowed' });
  try {
    const mode = normalizar(req.query.mode || 'catalog');
    if (mode === 'legacy-js' || mode === 'frontend-compat') return legacyJs(req, res);
    if (mode === 'single' || mode === 'individual') return individual(req, res);
    return catalog(req, res);
  } catch (error) {
    if (normalizar(req.query.mode) === 'legacy-js') {
      return responderJs(res, 500, `console.error(${JSON.stringify('Falha ao carregar dados.json: ' + error.message)}); const listaDeCpus = [];`);
    }
    return responderJson(res, 500, { error: 'cpu_catalog_unavailable', message: error.message });
  }
};

module.exports.catalog = catalog;
module.exports.individual = individual;
module.exports.legacyJs = legacyJs;
module.exports.cpuCardPublica = cpuCardPublica;
module.exports.cpuOptionPublica = cpuOptionPublica;
