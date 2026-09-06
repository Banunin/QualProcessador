'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const utils = require('../lib/ai-utils');
const renderCpu = require('../api/render-cpu');
const renderComparison = require('../api/render-comparison');
const cpuApi = require('../api/ai-cpus');
const siteApi = require('../api/ai-site');

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    end(value = '') { this.body += String(value); return this; }
  };
}

function call(handler, query = {}) {
  const res = mockRes();
  handler({ method: 'GET', query }, res);
  return res;
}

function uniq(values, label) {
  assert.strictEqual(new Set(values).size, values.length, `${label} contém duplicatas`);
}

const dataset = JSON.parse(fs.readFileSync(path.join(ROOT, 'dados.json'), 'utf8'));
assert.strictEqual(dataset.schema_version, '2.0', 'schema_version deve ser 2.0 após normalização');
assert.ok(/^sha256-[a-f0-9]{16}$/.test(dataset.dataset_version), 'dataset_version inválida');
assert.ok(/^[a-f0-9]{64}$/.test(dataset.content_sha256), 'content_sha256 inválido');
assert.ok(Array.isArray(dataset.processors) && dataset.processors.length > 0, 'processors vazio');
assert.strictEqual(dataset.count, dataset.processors.length, 'count diverge de processors.length');
assert.strictEqual(dataset.benchmark_semantics.notaJogos, 'CPU-Z Benchmark 17 Single Thread');
assert.strictEqual(dataset.benchmark_semantics.notaTrabalho, 'CPU-Z Benchmark 17 Multi Thread');
assert.ok(dataset.field_provenance && dataset.identity_semantics && dataset.relation_semantics, 'metadados semânticos ausentes');

uniq(dataset.processors.map(cpu => String(cpu.id)), 'id');
uniq(dataset.processors.map(cpu => cpu.entity_id), 'entity_id');
uniq(dataset.processors.map(cpu => cpu.slug), 'slug');
uniq(dataset.processors.map(cpu => cpu.canonical_url), 'canonical_url');

const entityIds = new Set(dataset.processors.map(cpu => cpu.entity_id));
for (const cpu of dataset.processors) {
  assert.strictEqual(cpu.entity_type, 'processor', `${cpu.nome}: entity_type inválido`);
  assert.ok(/^qp:cpu:/.test(cpu.entity_id), `${cpu.nome}: entity_id inválido`);
  assert.ok(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cpu.slug), `${cpu.nome}: slug inválido`);
  assert.ok(cpu.canonical_url.endsWith('/' + cpu.slug), `${cpu.nome}: canonical não termina no slug`);
  assert.ok(cpu.relations && Array.isArray(cpu.relations.related_entity_ids), `${cpu.nome}: relations ausente`);
  for (const ref of cpu.relations.related_entity_ids) {
    assert.ok(entityIds.has(ref), `${cpu.nome}: relação aponta para entidade inexistente ${ref}`);
  }
}

// O arquivo dados.js existe somente durante o pipeline de validação para comprovar
// que a projeção de compatibilidade é fiel ao JSON. Ele não deve ser persistido no repositório.
const compatCode = fs.readFileSync(path.join(ROOT, 'dados.js'), 'utf8');
assert.ok(compatCode.includes('NÃO EDITE ESTE ARQUIVO'), 'dados.js temporário não está marcado como artefato gerado');
const context = {};
vm.createContext(context);
vm.runInContext(compatCode + '\nthis.__cpus = listaDeCpus; this.__meta = qpCpuDatasetMetadata;', context);
assert.strictEqual(context.__cpus.length, dataset.processors.length, 'projeção dados.js diverge na contagem');
assert.strictEqual(context.__meta.dataset_version, dataset.dataset_version, 'projeção dados.js diverge na versão');
const compatIdentity = JSON.stringify(context.__cpus.map(cpu => [String(cpu.id), cpu.entity_id, cpu.slug]));
const jsonIdentity = JSON.stringify(dataset.processors.map(cpu => [String(cpu.id), cpu.entity_id, cpu.slug]));
assert.strictEqual(compatIdentity, jsonIdentity, 'projeção dados.js diverge da identidade do JSON');

const ryzen = dataset.processors.find(cpu => /ryzen 5 5600$/i.test(cpu.nome));
assert.ok(ryzen, 'CPU de referência Ryzen 5 5600 não encontrada');
const publicRyzen = utils.cpuPublica(ryzen);
assert.strictEqual(publicRyzen.entity_id, ryzen.entity_id);
assert.strictEqual(publicRyzen.slug, ryzen.slug);
assert.strictEqual(publicRyzen.canonical_url, ryzen.canonical_url);
assert.ok(publicRyzen.machine_links.individual_api.includes('/api/cpu/'));

// SSR deve repetir os mesmos dados da fonte canônica e fornecer JSON-LD rico.
const html = renderCpu.renderPage(ryzen, ryzen.marca, ryzen.slug);
assert.ok(html.includes(ryzen.nome), 'SSR não contém o nome da CPU');
assert.ok(html.includes(String(ryzen.cores)), 'SSR não contém cores');
assert.ok(html.includes(String(ryzen.threads)), 'SSR não contém threads');
assert.ok(html.includes(String(ryzen.soquete)), 'SSR não contém soquete');
assert.ok(html.includes(`data-entity-id="${ryzen.entity_id}"`), 'SSR não expõe entity_id');
const ldMatch = html.match(/<script type="application\/ld\+json" id="qp-ssr-jsonld">([\s\S]*?)<\/script>/);
assert.ok(ldMatch, 'JSON-LD SSR ausente');
const ld = JSON.parse(ldMatch[1]);
assert.ok(Array.isArray(ld['@graph']), 'JSON-LD não usa @graph');
const product = ld['@graph'].find(node => node['@type'] === 'Product');
const datasetNode = ld['@graph'].find(node => node['@type'] === 'Dataset');
assert.ok(product && datasetNode, 'Product/Dataset ausentes no JSON-LD');
assert.strictEqual(product.identifier, ryzen.entity_id, 'JSON-LD diverge no identificador');

// API individual é servida pela função consolidada ai-cpus.
let res = call(cpuApi, { mode: 'single', cpu: ryzen.slug });
assert.strictEqual(res.statusCode, 200, 'API individual falhou');
let payload = JSON.parse(res.body);
assert.strictEqual(payload.item.entity_id, ryzen.entity_id, 'API individual diverge do dataset');
assert.strictEqual(payload.item.cores, ryzen.cores, 'API individual diverge em cores');

// A mesma função também preserva /dados.js sem segunda base estática.
res = call(cpuApi, { mode: 'legacy-js' });
assert.strictEqual(res.statusCode, 200, 'adaptador /dados.js falhou');
assert.ok(res.headers['content-type'].includes('application/javascript'), 'adaptador /dados.js usa Content-Type incorreto');
assert.ok(res.body.includes('const listaDeCpus = '), 'adaptador /dados.js não expõe listaDeCpus');
assert.ok(res.body.includes(dataset.dataset_version), 'adaptador /dados.js não expõe a versão do dataset');

// Busca estruturada é servida pela função consolidada ai-site.
res = call(siteApi, { mode: 'search', q: 'Ryzen 5 5600', limit: '5' });
assert.strictEqual(res.statusCode, 200, 'API de busca falhou');
payload = JSON.parse(res.body);
assert.ok(payload.items.some(item => item.entity_id === ryzen.entity_id), 'Busca não encontrou Ryzen 5 5600');

// Catálogo filtrado deve concordar com a entidade individual.
res = call(cpuApi, { entity_id: ryzen.entity_id, limit: '1' });
assert.strictEqual(res.statusCode, 200, 'Catálogo de CPUs falhou');
payload = JSON.parse(res.body);
assert.strictEqual(payload.items[0].entity_id, ryzen.entity_id, 'Catálogo diverge da entidade individual');

// Comparação JSON é servida pelo mesmo renderizador SSR já existente.
const intel = dataset.processors.find(cpu => /core i5-12400f$/i.test(cpu.nome));
if (intel) {
  res = call(renderComparison, { format: 'json', comparacao: `${ryzen.slug}-vs-${intel.slug}` });
  assert.strictEqual(res.statusCode, 200, 'API de comparação falhou');
  payload = JSON.parse(res.body);
  const ids = [payload.comparison.processor_a.entity_id, payload.comparison.processor_b.entity_id];
  assert.ok(ids.includes(ryzen.entity_id) && ids.includes(intel.entity_id), 'Comparação usa entidades erradas');
  assert.strictEqual(payload.comparison.fields.notaJogos.label, 'CPU-Z Benchmark 17 Single Thread');
}

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const routes = JSON.stringify(vercel.rewrites || []);
assert.ok(routes.includes('/dados.js') && routes.includes('mode=legacy-js'), 'rewrite do adaptador dados.js ausente');
assert.ok(routes.includes('/api/cpu/:cpu') && routes.includes('mode=single'), 'rewrite da API individual ausente');
assert.ok(routes.includes('/api/search') && routes.includes('mode=search'), 'rewrite da busca ausente');
assert.ok(routes.includes('/api/comparison/:comparison*') && routes.includes('format=json'), 'rewrite da API de comparação ausente');

// Vercel Hobby suporta no máximo 12 funções por deployment. Mantemos as novas
// capacidades consolidadas dentro das funções já existentes.
const apiFiles = fs.readdirSync(path.join(ROOT, 'api')).filter(file => file.endsWith('.js'));
assert.ok(apiFiles.length <= 12, `Há ${apiFiles.length} funções em /api; limite Hobby é 12`);

console.log(`Camada de conhecimento validada: ${dataset.processors.length} CPUs, ${dataset.dataset_version}, ${apiFiles.length} funções Vercel.`);
