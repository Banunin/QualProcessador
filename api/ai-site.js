'use strict';

const { BASE_URL, carregarCpus, carregarArtigos, responderJson } = require('../lib/ai-utils');

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.end();
  }
  if (!['GET', 'HEAD'].includes(req.method)) return responderJson(res, 405, { error: 'method_not_allowed' });

  let cpuCount = null;
  let articleCount = null;
  try { cpuCount = carregarCpus().length; } catch (_) {}
  try { articleCount = Object.keys(carregarArtigos()).length; } catch (_) {}

  const payload = {
    name: 'QualProcessador',
    canonical_url: BASE_URL + '/',
    language: 'pt-BR',
    description: 'Plataforma brasileira de hardware focada em fichas técnicas de processadores AMD e Intel, benchmarks CPU-Z, comparações, artigos e ferramentas.',
    content: {
      processors: cpuCount,
      articles: articleCount,
      processor_fields: 'Fichas técnicas, especificações, plataforma, clocks, núcleos, threads, cache, TDP e outros dados cadastrados.',
      benchmark_semantics: {
        notaJogos: 'CPU-Z Benchmark 17 Single Thread',
        notaTrabalho: 'CPU-Z Benchmark 17 Multi Thread',
        missing_value: 'N/A'
      }
    },
    sections: {
      home: BASE_URL + '/',
      processors: BASE_URL + '/#cpus',
      compare: BASE_URL + '/comparar',
      articles: BASE_URL + '/analises',
      forum: BASE_URL + '/forum',
      community: BASE_URL + '/comunidade',
      tools: BASE_URL + '/ferramentas',
      support: BASE_URL + '/apoiar'
    },
    machine_readable: {
      llms: BASE_URL + '/llms.txt',
      xml_sitemap: BASE_URL + '/sitemap.xml',
      markdown_sitemap: BASE_URL + '/sitemap.md',
      rss: BASE_URL + '/feed.xml',
      ai_index: BASE_URL + '/ai-index.json',
      cpu_api: BASE_URL + '/api/ai-cpus',
      article_api: BASE_URL + '/api/ai-articles',
      site_api: BASE_URL + '/api/ai-site',
      content_negotiation: 'As páginas públicas aceitam Accept: text/markdown e retornam uma representação textual otimizada para agentes.'
    },
    source: 'QualProcessador'
  };

  if (req.method === 'HEAD') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Language', 'pt-BR');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.end();
  }
  return responderJson(res, 200, payload);
};
