'use strict';

const {
  carregarCpus,
  normalizar,
  marcaCpu,
  slugCpu,
  entityIdCpu,
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
  if (!['GET', 'HEAD'].includes(req.method)) return responderJson(res, 405, { error: 'method_not_allowed' });

  try {
    const cpus = carregarCpus();
    const id = String(req.query.id || '').trim();
    const entityId = String(req.query.entity_id || '').trim();
    const slug = normalizar(req.query.slug || '');
    const marca = normalizar(req.query.marca || req.query.brand || '');
    const socket = normalizar(req.query.socket || req.query.soquete || '');
    const familia = normalizar(req.query.family || req.query.familia || '');
    const geracao = normalizar(req.query.generation || req.query.geracao || '');
    const busca = normalizar(req.query.q || '');
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
    if (busca) filtradas = filtradas.filter(cpu => {
      const alvo = [
        cpu.nome, cpu.slug, cpu.entity_id, cpu.marca, cpu.fabricante, cpu.familia,
        cpu.geracao, cpu.arquitetura, cpu.codinome, cpu.soquete
      ].map(normalizar).join(' ');
      return alvo.includes(busca) || busca.split('-').filter(Boolean).every(token => alvo.includes(token));
    });

    const total = filtradas.length;
    const itens = filtradas.slice(offset, offset + limit).map(cpuPublica);
    const payload = {
      source: 'QualProcessador',
      language: 'pt-BR',
      dataset: datasetPublico(),
      filters: {
        id: id || null,
        entity_id: entityId || null,
        slug: slug || null,
        brand: marca || null,
        socket: socket || null,
        family: familia || null,
        generation: geracao || null,
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
    return responderJson(res, 500, { error: 'cpu_catalog_unavailable', message: error.message });
  }
};
