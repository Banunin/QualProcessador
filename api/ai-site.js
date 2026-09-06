'use strict';

const {
  BASE_URL,
  carregarCpus,
  carregarArtigos,
  normalizar,
  cpuPublica,
  artigoPublico,
  datasetPublico,
  responderJson
} = require('../lib/ai-utils');

function score(texto, alvo) {
  const t = normalizar(texto);
  const q = normalizar(alvo);
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  const tokens = q.split('-').filter(Boolean);
  const hits = tokens.filter(token => t.includes(token)).length;
  return hits ? Math.round((hits / tokens.length) * 40) : 0;
}

function searchPayload(req) {
  const q = String(req.query.q || '').trim();
  const tipo = normalizar(req.query.type || 'all');
  const marca = normalizar(req.query.marca || req.query.brand || '');
  const socket = normalizar(req.query.socket || req.query.soquete || '');
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '10', 10) || 10));
  if (!q) return { status: 400, payload: { error: 'missing_query', message: 'Use ?q=termo. Exemplo: /api/search?q=ryzen+5+5600.' } };

  const resultados = [];
  if (tipo === 'all' || tipo === 'cpu' || tipo === 'processor') {
    for (const cpu of carregarCpus()) {
      if (marca && normalizar(cpu.marca || cpu.fabricante) !== marca) continue;
      if (socket && normalizar(cpu.soquete || cpu.socket) !== socket) continue;
      const campos = [cpu.nome, cpu.slug, cpu.entity_id, cpu.fabricante, cpu.marca, cpu.familia, cpu.geracao, cpu.arquitetura, cpu.codinome, cpu.soquete].filter(Boolean);
      const s = Math.max(...campos.map(campo => score(campo, q)), 0);
      if (!s) continue;
      const item = cpuPublica(cpu);
      resultados.push({
        score: s,
        entity_type: 'processor',
        entity_id: item.entity_id,
        title: item.nome,
        slug: item.slug,
        canonical_url: item.canonical_url,
        api_url: item.machine_links.individual_api,
        summary: `${item.cores || 'N/A'} núcleos, ${item.threads || 'N/A'} threads, soquete ${item.soquete || 'N/A'}.`,
        hints: {
          brand: item.fabricante || item.marca || null,
          socket: item.soquete || null,
          family: item.familia || item.relations?.family || null
        }
      });
    }
  }

  if (tipo === 'all' || tipo === 'article' || tipo === 'editorial') {
    for (const artigo of Object.values(carregarArtigos())) {
      const campos = [artigo.titulo, artigo.descricao, artigo.categoria, artigo.autor].filter(Boolean);
      const s = Math.max(...campos.map(campo => score(campo, q)), 0);
      if (!s) continue;
      const item = artigoPublico(artigo, false);
      resultados.push({
        score: s,
        entity_type: 'article',
        entity_id: item.entity_id,
        title: item.titulo,
        canonical_url: item.canonical_url,
        api_url: `${BASE_URL}/api/ai-articles?id=${encodeURIComponent(item.id)}`,
        summary: item.descricao,
        hints: { category: item.categoria || null, author: item.autor || null }
      });
    }
  }

  resultados.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'pt-BR'));
  const items = resultados.slice(0, limit);
  return {
    status: 200,
    payload: {
      source: 'QualProcessador',
      language: 'pt-BR',
      query: q,
      filters: { type: tipo, brand: marca || null, socket: socket || null },
      total_matches: resultados.length,
      returned: items.length,
      items,
      scope_note: 'A busca estruturada cobre a base pública de processadores e o conteúdo editorial. O fórum possui conteúdo dinâmico da comunidade e não é misturado automaticamente com fontes editoriais.'
    }
  };
}

function sitePayload() {
  let cpuCount = null;
  let articleCount = null;
  let dataset = null;
  try { cpuCount = carregarCpus().length; dataset = datasetPublico(); } catch (_) {}
  try { articleCount = Object.keys(carregarArtigos()).length; } catch (_) {}

  return {
    name: 'QualProcessador',
    canonical_url: BASE_URL + '/',
    language: 'pt-BR',
    description: 'Portal brasileiro de hardware com banco de dados técnico, benchmarks, comparações, artigos, análises, ferramentas e fórum da comunidade. A primeira grande base estruturada do projeto é o catálogo de processadores AMD e Intel.',
    knowledge_layer: {
      canonical_cpu_source: BASE_URL + '/dados.json',
      frontend_compatibility: 'A URL /dados.js é gerada em tempo de requisição a partir de dados.json para manter compatibilidade com o frontend legado. Não existe uma segunda base estática de CPUs.',
      stable_identity: 'Cada CPU possui entity_id persistente, slug persistido e URL canônica.',
      dataset,
      provenance: dataset?.field_provenance || null,
      relations: dataset?.relation_semantics || null
    },
    content_types: {
      technical_database: 'Fichas técnicas e benchmarks de hardware; atualmente com forte cobertura de processadores.',
      editorial: 'Artigos, guias, reviews e análises publicados pelo QualProcessador.',
      community: 'Tópicos e respostas publicados por usuários no fórum; esse conteúdo não representa necessariamente a posição editorial do site.',
      tools: 'Comparadores e ferramentas oferecidos pelo projeto.'
    },
    content: {
      processors: cpuCount,
      articles: articleCount,
      processor_fields: 'Fichas técnicas, identidade persistente, relações, plataforma, clocks, núcleos, threads, cache, TDP e outros dados cadastrados.',
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
      processor_pages: 'Server-rendered HTML with rich JSON-LD and client-side enhancement.',
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
      cpu_catalog_api: BASE_URL + '/api/ai-cpus',
      cpu_individual_api_template: BASE_URL + '/api/cpu/{slug}',
      search_api_template: BASE_URL + '/api/search?q={query}',
      comparison_api_template: BASE_URL + '/api/comparison/{slug-a}-vs-{slug-b}',
      article_api: BASE_URL + '/api/ai-articles',
      image_api: BASE_URL + '/api/ai-images',
      site_api: BASE_URL + '/api/ai-site',
      content_negotiation: 'As páginas públicas aceitam Accept: text/markdown e retornam uma representação textual otimizada para agentes.'
    },
    source: 'QualProcessador'
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
    const mode = normalizar(req.query.mode || 'site');
    const result = mode === 'search' ? searchPayload(req) : { status: 200, payload: sitePayload() };
    if (req.method === 'HEAD') {
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Language', 'pt-BR');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end();
    }
    return responderJson(res, result.status, result.payload);
  } catch (error) {
    return responderJson(res, 500, { error: 'site_api_unavailable', message: error.message });
  }
};

module.exports.searchPayload = searchPayload;
module.exports.sitePayload = sitePayload;
