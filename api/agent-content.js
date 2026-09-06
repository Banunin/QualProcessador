'use strict';

const fs = require('fs');
const path = require('path');
const {
  BASE_URL,
  ROOT,
  carregarCpus,
  carregarArtigos,
  resolverCpu,
  urlCpu,
  cpuPublica,
  datasetPublico,
  entityIdCpu,
  slugCpu,
  artigoPorCaminho,
  artigoPublico,
  htmlParaMarkdown,
  responderMarkdown
} = require('../lib/ai-utils');

function valor(valor) {
  if (valor === null || valor === undefined || valor === '') return 'N/A';
  if (Array.isArray(valor)) return valor.join(', ');
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

function tituloCampo(chave) {
  const especiais = {
    notaJogos: 'CPU-Z Benchmark 17 Single Thread',
    notaTrabalho: 'CPU-Z Benchmark 17 Multi Thread',
    freqBase: 'Clock base',
    freqBoost: 'Clock boost',
    cacheL1: 'Cache L1',
    cacheL2: 'Cache L2',
    cacheL3: 'Cache L3',
    pcieLanes: 'PCIe lanes',
    pcieConfig: 'Configuração PCIe',
    entity_id: 'Identificador QualProcessador',
    canonical_url: 'URL canônica'
  };
  if (especiais[chave]) return especiais[chave];
  return chave.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

function markdownCpu(cpu) {
  const publico = cpuPublica(cpu);
  const ignorar = new Set(['nome', 'notaJogos', 'notaTrabalho', 'canonical_url', 'benchmarks', 'machine_links', 'dataset_reference', 'relations']);
  const linhas = [
    `# ${cpu.nome}`,
    '',
    '> Ficha técnica de processador no QualProcessador.',
    '',
    '## Identidade da entidade',
    '',
    `- Entity ID: ${publico.entity_id}`,
    `- Slug persistente: ${publico.slug}`,
    `- URL canônica: ${publico.canonical_url}`,
    `- API individual: ${BASE_URL}/api/cpu/${encodeURIComponent(publico.slug)}`,
    cpu.foto ? `- Imagem de referência: ${BASE_URL}/img/${cpu.foto}` : '',
    cpu.foto ? `- Descrição da imagem: Imagem de referência do processador ${cpu.nome}.` : '',
    '',
    '## Benchmarks CPU-Z',
    '',
    `- CPU-Z Benchmark 17 Single Thread: ${valor(cpu.notaJogos)}`,
    `- CPU-Z Benchmark 17 Multi Thread: ${valor(cpu.notaTrabalho)}`,
    '',
    'Os pontos CPU-Z são benchmarks sintéticos. Valor ausente é representado como N/A.',
    '',
    '## Especificações cadastradas',
    ''
  ];
  for (const [chave, dado] of Object.entries(cpu)) {
    if (ignorar.has(chave) || chave === 'entity_id' || chave === 'slug' || chave === 'entity_type') continue;
    linhas.push(`- **${tituloCampo(chave)}:** ${valor(dado)}`);
  }
  if (cpu.relations) {
    linhas.push('', '## Relações para descoberta', '');
    if (cpu.relations.brand) linhas.push(`- Marca: ${cpu.relations.brand}`);
    if (cpu.relations.socket) linhas.push(`- Soquete: ${cpu.relations.socket}`);
    if (cpu.relations.family) linhas.push(`- Família: ${cpu.relations.family}`);
    if (cpu.relations.generation) linhas.push(`- Geração: ${cpu.relations.generation}`);
    if (cpu.relations.architecture) linhas.push(`- Arquitetura: ${cpu.relations.architecture}`);
    if (Array.isArray(cpu.relations.related_entity_ids) && cpu.relations.related_entity_ids.length) {
      linhas.push(`- Entidades relacionadas: ${cpu.relations.related_entity_ids.join(', ')}`);
    }
    linhas.push('- Relações são auxiliares de descoberta e não significam equivalência de desempenho.');
  }
  linhas.push('', '## Recursos relacionados', '');
  linhas.push(`- [API individual desta CPU](${BASE_URL}/api/cpu/${encodeURIComponent(slugCpu(cpu))})`);
  linhas.push(`- [Comparar processadores](${BASE_URL}/comparar)`);
  linhas.push(`- [Catálogo estruturado de CPUs](${BASE_URL}/api/ai-cpus?entity_id=${encodeURIComponent(entityIdCpu(cpu))})`);
  linhas.push(`- [Busca estruturada](${BASE_URL}/api/search?q=${encodeURIComponent(cpu.nome)})`);
  linhas.push(`- [Catálogo semântico de imagens](${BASE_URL}/api/ai-images?entity=processor&q=${encodeURIComponent(cpu.nome)})`);
  linhas.push(`- [Dataset canônico](${BASE_URL}/dados.json)`);
  linhas.push(`- [Mapa Markdown do site](${BASE_URL}/sitemap.md)`);
  return linhas.filter((linha, i, arr) => !(linha === '' && arr[i - 1] === '')).join('\n');
}

function markdownArtigo(artigo) {
  const item = artigoPublico(artigo, true);
  const linhas = [
    `# ${item.titulo}`, '', item.descricao ? `> ${item.descricao}` : '', '',
    `Entity ID: ${item.entity_id}`,
    `URL canônica: ${item.canonical_url}`,
    `Autor: ${item.autor}`,
    item.categoria ? `Categoria: ${item.categoria}` : '',
    item.tempo_leitura ? `Tempo de leitura informado: ${item.tempo_leitura}` : '',
    artigo.imagemCapa ? `Imagem de capa: ${/^https?:\/\//i.test(artigo.imagemCapa) ? artigo.imagemCapa : BASE_URL + '/' + String(artigo.imagemCapa).replace(/^\/+/, '')}` : '',
    artigo.imagemCapaAlt ? `Descrição da capa: ${artigo.imagemCapaAlt}` : '',
    '', item.conteudo_markdown, '', '## Recursos de imagem', '',
    `- [Imagens associadas a este artigo](${BASE_URL}/api/ai-images?entity=article&q=${encodeURIComponent(item.titulo)})`,
    '', '---', `Fonte: [QualProcessador](${BASE_URL}/)`
  ];
  return linhas.filter((linha, i, arr) => !(linha === '' && arr[i - 1] === '')).join('\n');
}

function markdownAnalises() {
  const artigos = Object.values(carregarArtigos());
  const linhas = ['# Artigos e análises | QualProcessador', '', 'Conteúdo editorial de hardware publicado pelo QualProcessador.', '', '## Artigos disponíveis', ''];
  for (const artigo of artigos) {
    const item = artigoPublico(artigo, false);
    linhas.push(`- [${item.titulo}](${item.canonical_url}) — ${item.descricao}`);
  }
  return linhas.join('\n');
}

function markdownComparacao(slugComparacao) {
  const partes = String(slugComparacao || '').split('-vs-');
  if (partes.length !== 2) return null;
  const a = resolverCpu('', partes[0]);
  const b = resolverCpu('', partes[1]);
  if (!a || !b) return null;
  const chaves = ['cores', 'threads', 'freqBase', 'freqBoost', 'tdp', 'soquete', 'litografia', 'cacheL3', 'notaJogos', 'notaTrabalho'];
  const comparisonSlug = `${slugCpu(a)}-vs-${slugCpu(b)}`;
  const linhas = [
    `# ${a.nome} vs ${b.nome}`, '',
    'Comparação entre dois processadores catalogados no QualProcessador.', '',
    `API estruturada: ${BASE_URL}/api/comparison/${comparisonSlug}`, '',
    '| Dado | ' + a.nome + ' | ' + b.nome + ' |', '|---|---:|---:|'
  ];
  for (const chave of chaves) linhas.push(`| ${tituloCampo(chave)} | ${valor(a[chave])} | ${valor(b[chave])} |`);
  linhas.push('', '## Fichas individuais', '');
  linhas.push(`- [${a.nome}](${BASE_URL}${urlCpu(a)}) — ${entityIdCpu(a)}`);
  linhas.push(`- [${b.nome}](${BASE_URL}${urlCpu(b)}) — ${entityIdCpu(b)}`);
  return linhas.join('\n');
}

function markdownHome() {
  let cpus = [];
  let artigos = [];
  let dataset = null;
  try { cpus = carregarCpus(); dataset = datasetPublico(); } catch (_) {}
  try { artigos = Object.values(carregarArtigos()); } catch (_) {}
  return [
    '# QualProcessador', '',
    '> Portal brasileiro de hardware com banco de dados técnico, benchmarks, comparações, artigos, análises, ferramentas e fórum da comunidade.', '',
    `URL canônica: ${BASE_URL}/`, 'Idioma principal: pt-BR',
    cpus.length ? `Processadores catalogados: ${cpus.length}` : '',
    artigos.length ? `Artigos catalogados: ${artigos.length}` : '',
    dataset?.dataset_version ? `Versão atual do dataset de CPUs: ${dataset.dataset_version}` : '', '',
    '## Conteúdo principal', '',
    `- [Processadores e fichas técnicas](${BASE_URL}/#cpus)`,
    `- [Comparador de processadores](${BASE_URL}/comparar)`,
    `- [Artigos e análises](${BASE_URL}/analises)`,
    `- [Fórum](${BASE_URL}/forum)`,
    `- [Comunidade](${BASE_URL}/comunidade)`,
    `- [Ferramentas](${BASE_URL}/ferramentas)`, '',
    '## Base de conhecimento estruturada', '',
    `- [Dataset canônico de CPUs](${BASE_URL}/dados.json)`,
    `- [JSON Schema](${BASE_URL}/schemas/processadores.schema.json)`,
    `- [API individual de CPU](${BASE_URL}/api/cpu/amd-ryzen-5-5600)`,
    `- [Busca estruturada](${BASE_URL}/api/search?q=ryzen+5+5600)`,
    `- [API de comparação](${BASE_URL}/api/comparison/amd-ryzen-5-5600-vs-intel-core-i5-12400f)`, '',
    '## Imagens e conteúdo visual', '',
    '- Imagens relevantes possuem descrições alternativas, legendas e/ou metadados estruturados.',
    '- Gráficos e resultados visuais importantes devem também aparecer como texto ou tabela HTML quando possível.',
    `- [Índice semântico de imagens](${BASE_URL}/image-index.json)`,
    `- [API pública de imagens](${BASE_URL}/api/ai-images)`, '',
    '## Como interpretar os benchmarks', '',
    '- `notaJogos`: CPU-Z Benchmark 17 Single Thread.',
    '- `notaTrabalho`: CPU-Z Benchmark 17 Multi Thread.',
    '- Quando não existe benchmark cadastrado, o valor deve ser interpretado como N/A.', '',
    '## Recursos para agentes e sistemas automáticos', '',
    `- [llms.txt](${BASE_URL}/llms.txt)`,
    `- [Sitemap Markdown](${BASE_URL}/sitemap.md)`,
    `- [Sitemap XML](${BASE_URL}/sitemap.xml)`,
    `- [Índice JSON](${BASE_URL}/ai-index.json)`,
    `- [Índice de imagens](${BASE_URL}/image-index.json)`,
    `- [API pública de CPUs](${BASE_URL}/api/ai-cpus)`,
    `- [API pública de artigos](${BASE_URL}/api/ai-articles)`,
    `- [API pública de imagens](${BASE_URL}/api/ai-images)`,
    `- [Manifesto do site](${BASE_URL}/api/ai-site)`
  ].filter(Boolean).join('\n');
}

const STATIC_MAP = {
  '/forum': 'forum.html',
  '/comunidade': 'Comunidade.html',
  '/ferramentas': 'ferramentas.html',
  '/upscendra': 'upscendra.html',
  '/winformatkit': 'winformatkit.html',
  '/apoiar': 'apoiar.html',
  '/comparar': 'comparar.html'
};

function markdownEstatico(caminho) {
  const arquivo = STATIC_MAP[caminho.toLowerCase()];
  if (!arquivo) return null;
  const full = path.join(ROOT, arquivo);
  if (!fs.existsSync(full)) return null;
  const html = fs.readFileSync(full, 'utf8');
  const conteudo = htmlParaMarkdown(html);
  return `# ${arquivo.replace(/\.html$/i, '')}\n\nURL canônica: ${BASE_URL}${caminho}\n\n${conteudo}\n`;
}

function arquivoTextual(caminho) {
  const permitidos = new Map([
    ['/llms.txt', 'llms.txt'], ['/sitemap.md', 'sitemap.md'], ['/robots.txt', 'robots.txt'],
    ['/sitemap.xml', 'sitemap.xml'], ['/feed.xml', 'feed.xml'], ['/ai-index.json', 'ai-index.json'],
    ['/image-index.json', 'image-index.json'], ['/dados.json', 'dados.json'],
    ['/schemas/processadores.schema.json', 'schemas/processadores.schema.json']
  ]);
  const arquivo = permitidos.get(caminho.toLowerCase());
  if (!arquivo) return null;
  const full = path.join(ROOT, arquivo);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

module.exports = function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) return responderMarkdown(res, 405, '# Método não permitido');

  const bruto = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path || '');
  let caminho = '/' + bruto.replace(/^\/+/, '').split('?')[0];
  caminho = caminho.replace(/\/{2,}/g, '/');
  if (caminho.length > 1) caminho = caminho.replace(/\/+$/, '');

  try {
    let markdown = null;
    if (caminho === '/' || caminho === '/index' || caminho === '/index.html') markdown = markdownHome();
    else if (caminho === '/analises' || caminho === '/analises.html') markdown = markdownAnalises();
    else if (/^\/cpu\/[^/]+\/[^/]+$/i.test(caminho)) {
      const [, , marca, slug] = caminho.split('/');
      const cpu = resolverCpu(marca, slug);
      if (cpu) markdown = markdownCpu(cpu);
    } else if (/^\/comparar\//i.test(caminho)) {
      markdown = markdownComparacao(caminho.replace(/^\/comparar\//i, ''));
    }

    if (!markdown) {
      const artigo = artigoPorCaminho(caminho);
      if (artigo) markdown = markdownArtigo(artigo);
    }
    if (!markdown) markdown = arquivoTextual(caminho);
    if (!markdown) markdown = markdownEstatico(caminho);

    if (!markdown) {
      markdown = `# Conteúdo não encontrado\n\nA representação Markdown para \`${caminho}\` não foi encontrada.\n\n- [Início](${BASE_URL}/)\n- [Mapa do site para agentes](${BASE_URL}/sitemap.md)\n`;
      if (req.method === 'HEAD') {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Vary', 'Accept');
        return res.end();
      }
      return responderMarkdown(res, 404, markdown);
    }

    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Language', 'pt-BR');
      res.setHeader('Vary', 'Accept');
      return res.end();
    }
    return responderMarkdown(res, 200, markdown);
  } catch (error) {
    return responderMarkdown(res, 500, `# Erro ao gerar representação para agentes\n\n${error.message}`);
  }
};
