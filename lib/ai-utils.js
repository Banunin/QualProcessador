'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.SITE_BASE_URL || process.env.SEO_BASE_URL || 'https://qualprocessador.vercel.app').replace(/\/+$/, '');
const ROOT = path.resolve(__dirname, '..');
const DADOS_JSON_PATH = path.join(ROOT, 'dados.json');
const DADOS_LEGACY_PATH = path.join(ROOT, 'dados.js');
const ARTIGOS_PATH = path.join(ROOT, 'artigos.json');

let cacheCpus = null;
let cacheDatasetCpus = null;
let cacheArtigos = null;

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function carregarDatasetCpus() {
  if (cacheDatasetCpus) return cacheDatasetCpus;
  if (fs.existsSync(DADOS_JSON_PATH)) {
    const payload = JSON.parse(fs.readFileSync(DADOS_JSON_PATH, 'utf8'));
    const processors = Array.isArray(payload) ? payload : payload && payload.processors;
    if (!Array.isArray(processors)) throw new Error('dados.json não contém uma lista processors válida');
    if (Array.isArray(payload)) {
      cacheDatasetCpus = {
        schema_version: null,
        dataset_version: null,
        content_sha256: null,
        benchmark_semantics: null,
        processors
      };
    } else {
      const { processors: _processors, ...metadata } = payload;
      cacheDatasetCpus = { ...metadata, processors };
    }
    return cacheDatasetCpus;
  }

  const bruto = fs.readFileSync(DADOS_LEGACY_PATH, 'utf8');
  const inicio = bruto.indexOf('[');
  const fim = bruto.lastIndexOf(']');
  if (inicio < 0 || fim <= inicio) throw new Error('Lista de CPUs não encontrada em dados.js');
  cacheDatasetCpus = {
    schema_version: 'legacy-js',
    dataset_version: 'legacy-js',
    content_sha256: null,
    benchmark_semantics: {
      notaJogos: 'CPU-Z Benchmark 17 Single Thread',
      notaTrabalho: 'CPU-Z Benchmark 17 Multi Thread',
      missing_value: 'N/A'
    },
    processors: JSON.parse(bruto.slice(inicio, fim + 1))
  };
  return cacheDatasetCpus;
}

function carregarCpus() {
  if (cacheCpus) return cacheCpus;
  cacheCpus = carregarDatasetCpus().processors;
  return cacheCpus;
}

function carregarArtigos() {
  if (cacheArtigos) return cacheArtigos;
  cacheArtigos = JSON.parse(fs.readFileSync(ARTIGOS_PATH, 'utf8'));
  return cacheArtigos;
}

function marcaCpu(cpu) {
  return normalizar(cpu && (cpu.marca || cpu.fabricante) || 'cpu');
}

function entityIdCpu(cpu) {
  const existente = String(cpu && cpu.entity_id || '').trim();
  return existente || `qp:cpu:${cpu && cpu.id}`;
}

function slugCpu(cpu) {
  const persistido = normalizar(cpu && cpu.slug);
  if (persistido) return persistido;
  const marca = marcaCpu(cpu);
  const nome = normalizar(cpu && cpu.nome);
  return nome === marca || nome.startsWith(marca + '-') ? nome : `${marca}-${nome}`;
}

function urlCpu(cpu) {
  const canonical = String(cpu && cpu.canonical_url || '');
  if (canonical.startsWith(BASE_URL + '/')) return canonical.slice(BASE_URL.length);
  return `/cpu/${marcaCpu(cpu)}/${slugCpu(cpu)}`;
}

function canonicalCpu(cpu) {
  return String(cpu && cpu.canonical_url || '').trim() || BASE_URL + urlCpu(cpu);
}

function resolverCpu(marca, slugOuId) {
  const cpus = carregarCpus();
  const raw = String(slugOuId || '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const byId = cpus.find(cpu => String(cpu.id) === raw);
    if (byId) return byId;
  }
  const entityMatch = cpus.find(cpu => entityIdCpu(cpu) === raw);
  if (entityMatch) return entityMatch;
  const alvo = normalizar(raw.replace(/^https?:\/\/[^/]+/i, '').split('/').pop());
  const marcaAlvo = normalizar(marca);
  return cpus.find(cpu => {
    if (marcaAlvo && marcaCpu(cpu) !== marcaAlvo) return false;
    return slugCpu(cpu) === alvo || normalizar(cpu.nome) === alvo;
  }) || null;
}

function ordenarPar(a, b) {
  const ai = Number(a && a.id);
  const bi = Number(b && b.id);
  if (Number.isFinite(ai) && Number.isFinite(bi)) return ai <= bi ? [a, b] : [b, a];
  return String(entityIdCpu(a)).localeCompare(String(entityIdCpu(b))) <= 0 ? [a, b] : [b, a];
}

function resolverComparacao(valor) {
  const texto = String(valor || '').replace(/^\/+|\/+$/g, '');
  const partes = texto.split('-vs-');
  if (partes.length !== 2) return null;
  const a = resolverCpu('', partes[0]);
  const b = resolverCpu('', partes[1]);
  if (!a || !b || entityIdCpu(a) === entityIdCpu(b)) return null;
  return ordenarPar(a, b);
}

function urlComparacao(a, b) {
  [a, b] = ordenarPar(a, b);
  return `/comparar/${slugCpu(a)}-vs-${slugCpu(b)}`;
}

function decodeHtml(texto) {
  return String(texto || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function htmlParaMarkdown(html) {
  let texto = String(html || '');
  texto = texto.replace(/<!--[\s\S]*?-->/g, '');
  texto = texto.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  texto = texto.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  texto = texto.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');
  texto = texto.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  texto = texto.replace(/<img\b[^>]*alt=["']([^"']+)["'][^>]*>/gi, '\n[Imagem: $1]\n');
  texto = texto.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
    const nome = decodeHtml(label.replace(/<[^>]+>/g, '').trim());
    return nome ? `[${nome}](${href})` : href;
  });
  for (let nivel = 6; nivel >= 1; nivel -= 1) {
    const regex = new RegExp(`<h${nivel}\\b[^>]*>([\\s\\S]*?)<\\/h${nivel}>`, 'gi');
    texto = texto.replace(regex, (_, conteudo) => `\n${'#'.repeat(nivel)} ${conteudo.replace(/<[^>]+>/g, '').trim()}\n`);
  }
  texto = texto.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, conteudo) => `\n- ${conteudo.replace(/<[^>]+>/g, '').trim()}`);
  texto = texto.replace(/<br\s*\/?\s*>/gi, '\n');
  texto = texto.replace(/<\/(p|div|section|article|header|footer|nav|main|ul|ol|table|tr|figure|figcaption)>/gi, '\n');
  texto = texto.replace(/<(p|div|section|article|header|footer|nav|main|ul|ol|table|tr|figure|figcaption)\b[^>]*>/gi, '\n');
  texto = texto.replace(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi, (_, conteudo) => ` | ${conteudo.replace(/<[^>]+>/g, '').trim()}`);
  texto = texto.replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  texto = texto.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
  texto = texto.replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  texto = texto.replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
  texto = texto.replace(/<[^>]+>/g, ' ');
  texto = decodeHtml(texto);
  texto = texto.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
  texto = texto.replace(/[ \t]{2,}/g, ' ');
  texto = texto.replace(/\n{3,}/g, '\n\n');
  return texto.trim();
}

function numeroCpu(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  const match = String(valor || '').match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : null;
}

function cpuPublica(cpu) {
  const dataset = carregarDatasetCpus();
  return {
    ...cpu,
    entity_type: 'processor',
    entity_id: entityIdCpu(cpu),
    slug: slugCpu(cpu),
    canonical_url: canonicalCpu(cpu),
    benchmarks: {
      cpu_z_benchmark_17_single_thread: numeroCpu(cpu.notaJogos),
      cpu_z_benchmark_17_multi_thread: numeroCpu(cpu.notaTrabalho)
    },
    machine_links: {
      html: canonicalCpu(cpu),
      individual_api: `${BASE_URL}/api/cpu/${encodeURIComponent(slugCpu(cpu))}`,
      catalog_api: `${BASE_URL}/api/ai-cpus?slug=${encodeURIComponent(slugCpu(cpu))}`,
      dataset: `${BASE_URL}/dados.json`
    },
    dataset_reference: {
      dataset_version: dataset.dataset_version || null,
      content_sha256: dataset.content_sha256 || null,
      last_modified: dataset.last_modified || null
    }
  };
}

function datasetPublico() {
  const dataset = carregarDatasetCpus();
  return {
    name: dataset.dataset || 'QualProcessador CPU Database',
    schema_version: dataset.schema_version || null,
    dataset_version: dataset.dataset_version || null,
    content_sha256: dataset.content_sha256 || null,
    last_modified: dataset.last_modified || null,
    canonical_url: dataset.canonical_url || BASE_URL + '/dados.json',
    schema_url: dataset.$schema || BASE_URL + '/schemas/processadores.schema.json',
    count: dataset.processors.length,
    benchmark_semantics: dataset.benchmark_semantics || {
      notaJogos: 'CPU-Z Benchmark 17 Single Thread',
      notaTrabalho: 'CPU-Z Benchmark 17 Multi Thread',
      missing_value: 'N/A'
    },
    field_provenance: dataset.field_provenance || null,
    identity_semantics: dataset.identity_semantics || null,
    relation_semantics: dataset.relation_semantics || null
  };
}

function artigoPorCaminho(caminho) {
  const artigos = carregarArtigos();
  const pathNormal = '/' + String(caminho || '').split('?')[0].replace(/^\/+/, '').replace(/\/+$/, '');
  const idMatch = pathNormal.match(/^\/(?:artigo|ler-artigo)\/(\d+)$/i);
  if (idMatch && artigos[idMatch[1]]) return artigos[idMatch[1]];
  for (const artigo of Object.values(artigos)) {
    const limpa = '/' + String(artigo.urlLimpa || '').replace(/^\/+/, '').replace(/\/+$/, '');
    if (limpa === pathNormal) return artigo;
  }
  return null;
}

function artigoPublico(artigo, incluirTexto = true) {
  const url = artigo.urlLimpa || `/artigo/${artigo.id}`;
  const base = {
    id: String(artigo.id),
    entity_id: `qp:article:${artigo.id}`,
    entity_type: 'article',
    titulo: artigo.titulo,
    descricao: artigo.descricao || '',
    categoria: artigo.categoria || '',
    autor: artigo.autor || 'QualProcessador',
    tempo_leitura: artigo.tempoLeitura || '',
    imagem_capa: artigo.imagemCapa || '',
    imagem_capa_alt: artigo.imagemCapaAlt || '',
    imagem_capa_legenda: artigo.imagemCapaLegenda || '',
    canonical_url: BASE_URL + url
  };
  if (incluirTexto) base.conteudo_markdown = htmlParaMarkdown(artigo.texto || '');
  return base;
}

function cabecalhosBase(tipo) {
  return {
    'Content-Type': `${tipo}; charset=utf-8`,
    'Content-Language': 'pt-BR',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff'
  };
}

function responderJson(res, status, objeto) {
  res.statusCode = status;
  Object.entries(cabecalhosBase('application/json')).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(objeto, null, 2));
}

function responderMarkdown(res, status, markdown) {
  res.statusCode = status;
  Object.entries(cabecalhosBase('text/markdown')).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader('Vary', 'Accept');
  res.end(String(markdown || '').trim() + '\n');
}

module.exports = {
  BASE_URL,
  ROOT,
  normalizar,
  carregarDatasetCpus,
  carregarCpus,
  carregarArtigos,
  marcaCpu,
  entityIdCpu,
  slugCpu,
  urlCpu,
  canonicalCpu,
  resolverCpu,
  ordenarPar,
  resolverComparacao,
  urlComparacao,
  htmlParaMarkdown,
  numeroCpu,
  cpuPublica,
  datasetPublico,
  artigoPorCaminho,
  artigoPublico,
  responderJson,
  responderMarkdown
};
