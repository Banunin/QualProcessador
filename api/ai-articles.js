'use strict';

const {
  carregarArtigos,
  artigoPublico,
  normalizar,
  responderJson
} = require('../lib/ai-utils');

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.end();
  }
  if (!['GET', 'HEAD'].includes(req.method)) return responderJson(res, 405, { error: 'method_not_allowed' });

  try {
    const artigos = carregarArtigos();
    const id = String(req.query.id || '').trim();
    const slug = normalizar(req.query.slug || req.query.path || '');
    const full = String(req.query.full || '').toLowerCase();
    const incluirTexto = full === '1' || full === 'true' || Boolean(id || slug);

    let itens = Object.values(artigos);
    if (id) itens = itens.filter(artigo => String(artigo.id) === id);
    if (slug) itens = itens.filter(artigo => {
      const limpa = normalizar(artigo.urlLimpa || artigo.urlPath || '');
      const titulo = normalizar(artigo.titulo || '');
      return limpa === slug || limpa.endsWith(slug) || titulo.includes(slug);
    });

    const payload = {
      source: 'QualProcessador',
      language: 'pt-BR',
      total: itens.length,
      items: itens.map(artigo => artigoPublico(artigo, incluirTexto))
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
    return responderJson(res, 500, { error: 'article_catalog_unavailable', message: error.message });
  }
};
