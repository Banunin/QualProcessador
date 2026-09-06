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
    description: 'Portal brasileiro de hardware com banco de dados técnico, benchmarks, comparações, artigos, análises, ferramentas e fórum da comunidade. A primeira grande base estruturada do projeto é o catálogo de processadores AMD e Intel.',
    content_types: {
      technical_database: 'Fichas técnicas e benchmarks de hardware; atualmente com forte cobertura de processadores.',
      editorial: 'Artigos, guias, reviews e análises publicados pelo QualProcessador.',
      community: 'Tópicos e respostas publicados por usuários no fórum; esse conteúdo não representa necessariamente a posição editorial do site.',
      tools: 'Comparadores e ferramentas oferecidos pelo projeto.'
    },
    content: {
      processors: cpuCount,
      articles: articleCount,
      processor_fields: 'Fichas técnicas, especificações, plataforma, clocks, núcleos, threads, cache, TDP e outros dados cadastrados.',
      benchmark_semantics: {
        notaJogos: 'CPU-Z Benchmark 17 Single Thread',
        notaTrabalho: 'CPU-Z Benchmark 17 Multi Thread',
        missing_value: 'N/A'
      },
      image_semantics: 'Imagens relevantes usam texto alternativo, legendas e/ou descrições estruturadas. Gráficos e screenshots devem manter os dados importantes também em texto quando possível.'
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
    rendering: {
      processor_pages: 'Server-rendered HTML with client-side enhancement.',
      article_pages: 'Server-rendered full article HTML with client-side comments and account features.',
      forum: 'Server-rendered public topic/list content with client-side interaction enhancements.',
      images: 'Publisher-supplied alt text, captions and ImageObject metadata are exposed without requiring computer vision.'
    },
    machine_readable: {
      llms: BASE_URL + '/llms.txt',
      xml_sitemap: BASE_URL + '/sitemap.xml',
      markdown_sitemap: BASE_URL + '/sitemap.md',
      rss: BASE_URL + '/feed.xml',
      ai_index: BASE_URL + '/ai-index.json',
      image_index: BASE_URL + '/image-index.json',
      cpu_dataset: BASE_URL + '/dados.json',
      cpu_dataset_schema: BASE_URL + '/schemas/processadores.schema.json',
      cpu_api: BASE_URL + '/api/ai-cpus',
      article_api: BASE_URL + '/api/ai-articles',
      image_api: BASE_URL + '/api/ai-images',
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
