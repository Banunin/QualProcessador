'use strict';

const { BASE_URL, carregarCpus, carregarArtigos, urlCpu, responderJson, normalizar } = require('../lib/ai-utils');
const { absoluteUrl, enrichArticleHtml, collectArticleImages } = require('../lib/image-semantics');

function articleUrl(article) {
  return BASE_URL + (article.urlLimpa || `/artigo/${article.id}`);
}

function pushUnique(list, seen, item) {
  if (!item.image_url || seen.has(item.image_url + '|' + item.page_url)) return;
  seen.add(item.image_url + '|' + item.page_url);
  list.push(item);
}

function buildCatalog() {
  const items = [];
  const seen = new Set();
  const cpus = carregarCpus();
  const articles = carregarArtigos();

  cpus.forEach(cpu => {
    const page = BASE_URL + urlCpu(cpu);
    const files = [];
    if (cpu.foto) files.push(cpu.foto);
    if (Array.isArray(cpu.fotos)) files.push(...cpu.fotos);
    [...new Set(files.filter(Boolean))].forEach((file, index) => {
      pushUnique(items, seen, {
        source_type: 'technical-database',
        entity_type: 'processor',
        entity_name: cpu.nome,
        page_url: page,
        image_url: absoluteUrl(`/img/${file}`, BASE_URL),
        alt: index === 0 ? `Imagem de referência do processador ${cpu.nome}` : `Imagem adicional ${index + 1} do processador ${cpu.nome}`,
        caption: index === 0 ? `Imagem principal cadastrada para ${cpu.nome}.` : `Imagem adicional cadastrada para ${cpu.nome}.`,
        kind: 'product-reference'
      });
    });
  });

  Object.values(articles).forEach(article => {
    const page = articleUrl(article);
    if (article.imagemCapa) {
      pushUnique(items, seen, {
        source_type: 'editorial',
        entity_type: 'article',
        entity_name: article.titulo,
        page_url: page,
        image_url: absoluteUrl(article.imagemCapa, BASE_URL),
        alt: article.imagemCapaAlt || `Imagem de capa do artigo ${article.titulo}`,
        caption: article.imagemCapaLegenda || '',
        kind: 'cover'
      });
    }
    const context = { title: article.titulo, kind: 'Imagem', baseUrl: BASE_URL };
    const enriched = enrichArticleHtml(article.texto || '', context);
    collectArticleImages(enriched, context).forEach(image => {
      pushUnique(items, seen, {
        source_type: 'editorial',
        entity_type: 'article',
        entity_name: article.titulo,
        page_url: page,
        ...image
      });
    });
  });

  [
    {
      entity_name: 'Upscendra Image Suite 1.0',
      page_url: BASE_URL + '/upscendra',
      image_url: BASE_URL + '/upscendra-interface.jpg',
      alt: 'Interface do Upscendra Image Suite 1.0 no Windows',
      caption: 'Captura da interface do Upscendra Image Suite 1.0.',
      kind: 'software-screenshot'
    },
    {
      entity_name: 'WinFormatKit 1.1',
      page_url: BASE_URL + '/winformatkit',
      image_url: BASE_URL + '/winformatkit-interface.jpg',
      alt: 'Interface do WinFormatKit 1.1 no Windows',
      caption: 'Captura da interface do WinFormatKit 1.1.',
      kind: 'software-screenshot'
    }
  ].forEach(item => pushUnique(items, seen, {
    source_type: 'tool',
    entity_type: 'software',
    ...item
  }));

  return items;
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
    let items = buildCatalog();
    const q = normalizar(req.query.q || '');
    const type = normalizar(req.query.type || req.query.kind || '');
    const entity = normalizar(req.query.entity || '');
    if (q) items = items.filter(item => normalizar([item.entity_name, item.alt, item.caption, item.kind].join(' ')).includes(q));
    if (type) items = items.filter(item => normalizar(item.kind) === type || normalizar(item.source_type) === type);
    if (entity) items = items.filter(item => normalizar(item.entity_type) === entity);

    const payload = {
      source: 'QualProcessador',
      language: 'pt-BR',
      canonical_site: BASE_URL + '/',
      semantics: 'Descriptions come from publisher-supplied metadata and page context. They are textual semantics, not a claim that the crawler visually inspected the pixels.',
      total: items.length,
      items
    };

    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Language', 'pt-BR');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end();
    }
    return responderJson(res, 200, payload);
  } catch (error) {
    return responderJson(res, 500, { error: 'image_catalog_unavailable', message: error.message });
  }
};
