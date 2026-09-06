'use strict';

const {
  BASE_URL,
  resolverCpu,
  cpuPublica,
  datasetPublico,
  responderJson
} = require('../lib/ai-utils');

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.end();
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    return responderJson(res, 405, { error: 'method_not_allowed' });
  }

  try {
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
    const payload = {
      source: 'QualProcessador',
      language: 'pt-BR',
      dataset: datasetPublico(),
      item,
      interpretation: {
        benchmark_note: 'CPU-Z é benchmark sintético; os valores não equivalem diretamente a FPS.',
        missing_values: 'Campos ausentes, vazios ou N/A não devem ser inferidos.'
      }
    };

    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Language', 'pt-BR');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Link', `<${item.canonical_url}>; rel="canonical", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
      return res.end();
    }

    res.setHeader('Link', `<${item.canonical_url}>; rel="canonical", <${BASE_URL}/dados.json>; rel="describedby"; type="application/json"`);
    return responderJson(res, 200, payload);
  } catch (error) {
    return responderJson(res, 500, { error: 'cpu_api_unavailable', message: error.message });
  }
};
