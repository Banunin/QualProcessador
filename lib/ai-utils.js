'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://qualprocessador.com';
const ROOT = path.resolve(__dirname, '..');
const DADOS_PATH = path.join(ROOT, 'dados.js');
const ARTIGOS_PATH = path.join(ROOT, 'artigos.json');

let cacheCpus = null;
let cacheArtigos = null;

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function carregarCpus() {
  if (cacheCpus) return cacheCpus;
  const bruto = fs.readFileSync(DADOS_PATH, 'utf8');
  const inicio = bruto.indexOf('[');
  const fim = bruto.lastIndexOf(']');
  if (inicio < 0 || fim <= inicio) throw new Error('Lista de CPUs não encontrada em dados.js');
  cacheCpus = JSON.parse(bruto.slice(inicio, fim + 1));
  return cacheCpus;
}

function carregarArtigos() {
  if (cacheArtigos) return cacheArtigos;
  cacheArtigos = JSON.parse(fs.readFileSync(ARTIGOS_PATH, 'utf8'));
  return cacheArtigos;
}

function marcaCpu(cpu) {
  return normalizar(cpu.marca || cpu.fabricante || 'cpu');
}

function slugCpu(cpu) {
  const marca = marcaCpu(cpu);
  const nome = normalizar(cpu.nome);
  return nome === marca || nome.startsWith(marca + '-') ? nome : `${marca}-${nome}`;
}

function urlCpu(cpu) {
  return `/cpu/${marcaCpu(cpu)}/${slugCpu(cpu)}`;
}

function resolverCpu(marca, slugOuId) {
  const cpus = carregarCpus();
  const alvo = normalizar(slugOuId);
  const marcaAlvo = normalizar(marca);
  if (/^\d+$/.test(String(slugOuId || ''))) {
    const porId = cpus.find(cpu => String(cpu.id) === String(slugOuId));
    if (porId) return porId;
  }
  return cpus.find(cpu => {
    if (marcaAlvo && marcaCpu(cpu) !== marcaAlvo) return false;
    return slugCpu(cpu) === alvo || normalizar(cpu.nome) === alvo;
  }) || null;
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
  const clone = { ...cpu };
  clone.canonical_url = BASE_URL + urlCpu(cpu);
  clone.benchmarks = {
    cpu_z_benchmark_17_single_thread: numeroCpu(cpu.notaJogos),
    cpu_z_benchmark_17_multi_thread: numeroCpu(cpu.notaTrabalho)
  };
  return clone;
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
    titulo: artigo.titulo,
    descricao: artigo.descricao || '',
    categoria: artigo.categoria || '',
    autor: artigo.autor || 'QualProcessador',
    tempo_leitura: artigo.tempoLeitura || '',
    imagem_capa: artigo.imagemCapa || '',
    canonical_url: BASE_URL + url
  };
  if (incluirTexto) {
    base.conteudo_markdown = htmlParaMarkdown(artigo.texto || '');
  }
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
  carregarCpus,
  carregarArtigos,
  marcaCpu,
  slugCpu,
  urlCpu,
  resolverCpu,
  htmlParaMarkdown,
  cpuPublica,
  artigoPorCaminho,
  artigoPublico,
  responderJson,
  responderMarkdown
};
