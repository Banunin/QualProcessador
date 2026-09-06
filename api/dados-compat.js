'use strict';

const { BASE_URL, carregarDatasetCpus } = require('../lib/ai-utils');

module.exports = function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }

  try {
    const dataset = carregarDatasetCpus();
    const metadata = {
      dataset_version: dataset.dataset_version || null,
      content_sha256: dataset.content_sha256 || null,
      last_modified: dataset.last_modified || null,
      canonical_url: dataset.canonical_url || BASE_URL + '/dados.json',
      source_of_truth: BASE_URL + '/dados.json'
    };
    const body = [
      '// Compatibilidade gerada em tempo de requisição a partir de /dados.json.',
      '// A fonte canônica é dados.json; este endpoint apenas preserva o contrato listaDeCpus do frontend.',
      `const listaDeCpus = ${JSON.stringify(dataset.processors)};`,
      `const qpCpuDatasetMetadata = ${JSON.stringify(metadata)};`,
      ''
    ].join('\n');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Language', 'pt-BR');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Link', `<${BASE_URL}/dados.json>; rel="canonical"; type="application/json", <${BASE_URL}/schemas/processadores.schema.json>; rel="describedby"; type="application/schema+json"`);
    if (req.method === 'HEAD') return res.end();
    return res.end(body);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.end(`console.error(${JSON.stringify('Falha ao carregar dados.json: ' + error.message)}); const listaDeCpus = [];`);
  }
};
