'use strict';

const {
  BASE_URL,
  resolverCpu,
  resolverComparacao,
  ordenarPar,
  urlComparacao,
  cpuPublica,
  datasetPublico,
  entityIdCpu,
  slugCpu,
  responderJson
} = require('../lib/ai-utils');

const CAMPOS = [
  ['cores', 'Núcleos'],
  ['threads', 'Threads'],
  ['freqBase', 'Clock base'],
  ['freqBoost', 'Clock boost'],
  ['tdp', 'TDP'],
  ['soquete', 'Soquete'],
  ['arquitetura', 'Arquitetura'],
  ['codinome', 'Codinome'],
  ['litografia', 'Litografia'],
  ['cacheL3', 'Cache L3'],
  ['memoria', 'Memória'],
  ['pcie', 'PCI Express'],
  ['video', 'Vídeo integrado'],
  ['notaJogos', 'CPU-Z Benchmark 17 Single Thread'],
  ['notaTrabalho', 'CPU-Z Benchmark 17 Multi Thread']
];

function valor(v) {
  return v === undefined || v === null || String(v).trim() === '' ? null : v;
}

function montarComparacao(a, b) {
  [a, b] = ordenarPar(a, b);
  const pa = cpuPublica(a);
  const pb = cpuPublica(b);
  const path = urlComparacao(a, b);
  const fields = {};
  for (const [key, label] of CAMPOS) {
    const av = valor(a[key]);
    const bv = valor(b[key]);
    fields[key] = {
      label,
      processor_a: av,
      processor_b: bv,
      different: String(av ?? '') !== String(bv ?? '')
    };
  }
  return {
    entity_type: 'processor_comparison',
    entity_id: `qp:comparison:${entityIdCpu(a).replace(/:/g, '-')}:${entityIdCpu(b).replace(/:/g, '-')}`,
    slug: `${slugCpu(a)}-vs-${slugCpu(b)}`,
    canonical_url: BASE_URL + path,
    processor_a: pa,
    processor_b: pb,
    fields,
    benchmark_semantics: {
      notaJogos: 'CPU-Z Benchmark 17 Single Thread',
      notaTrabalho: 'CPU-Z Benchmark 17 Multi Thread',
      missing_value: 'N/A'
    },
    provenance: {
      source: 'QualProcessador CPU Database',
      dataset_url: BASE_URL + '/dados.json',
      note: 'A comparação reutiliza os valores publicados na mesma base canônica das fichas individuais; não preenche campos ausentes por inferência.'
    }
  };
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
    const raw = String(req.query.comparison || req.query.comparacao || '').trim();
    let par = raw ? resolverComparacao(raw) : null;
    if (!par) {
      const a = resolverCpu('', req.query.a || req.query.cpu_a || '');
      const b = resolverCpu('', req.query.b || req.query.cpu_b || '');
      if (a && b && entityIdCpu(a) !== entityIdCpu(b)) par = ordenarPar(a, b);
    }
    if (!par) {
      return responderJson(res, 400, {
        error: 'invalid_comparison',
        message: 'Use /api/comparison/{slug-a}-vs-{slug-b} ou ?a={slug}&b={slug}.'
      });
    }

    const comparison = montarComparacao(par[0], par[1]);
    const payload = {
      source: 'QualProcessador',
      language: 'pt-BR',
      dataset: datasetPublico(),
      comparison
    };

    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Language', 'pt-BR');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Link', `<${comparison.canonical_url}>; rel="canonical", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
      return res.end();
    }
    res.setHeader('Link', `<${comparison.canonical_url}>; rel="canonical", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
    return responderJson(res, 200, payload);
  } catch (error) {
    return responderJson(res, 500, { error: 'comparison_unavailable', message: error.message });
  }
};

module.exports.montarComparacao = montarComparacao;
