'use strict';

const {
  BASE_URL,
  carregarCpus,
  carregarArtigos,
  normalizar,
  cpuPublica,
  artigoPublico,
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

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.end();
  }
  if (!['GET', 'HEAD'].includes(req.method)) return responderJson(res, 405, { error: 'method_not_allowed' });

  try {
    const q = String(req.query.q || '').trim();
    const tipo = normalizar(req.query.type || 'all');
    const marca = normalizar(req.query.marca || req.query.brand || '');
    const socket = normalizar(req.query.socket || req.query.soquete || '');
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '10', 10) || 10));

    if (!q) {
      return responderJson(res, 400, {
        error: 'missing_query',
        message: 'Use ?q=termo. Exemplo: /api/search?q=ryzen+5+5600.'
      });
    }

    const resultados = [];

    if (tipo === 'all' || tipo === 'cpu' || tipo === 'processor') {
      for (const cpu of carregarCpus()) {
        if (marca && normalizar(cpu.marca || cpu.fabricante) !== marca) continue;
        if (socket && normalizar(cpu.soquete || cpu.socket) !== socket) continue;
        const campos = [
          cpu.nome, cpu.slug, cpu.entity_id, cpu.fabricante, cpu.marca,
          cpu.familia, cpu.geracao, cpu.arquitetura, cpu.codinome, cpu.soquete
        ].filter(Boolean);
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
    const payload = {
      source: 'QualProcessador',
      language: 'pt-BR',
      query: q,
      filters: { type: tipo, brand: marca || null, socket: socket || null },
      total_matches: resultados.length,
      returned: items.length,
      items,
      scope_note: 'A busca estruturada cobre a base pública de processadores e o conteúdo editorial. O fórum possui conteúdo dinâmico da comunidade e não é misturado automaticamente com fontes editoriais.'
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
    return responderJson(res, 500, { error: 'search_unavailable', message: error.message });
  }
};
