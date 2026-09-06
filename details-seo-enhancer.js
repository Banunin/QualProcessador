(function () {
    'use strict';

    function encontrarCpuAtual() {
        if (!window.QPSeo || typeof listaDeCpus === 'undefined' || !Array.isArray(listaDeCpus)) return null;
        const params = new URLSearchParams(location.search);
        const idParam = params.get('id');
        if (idParam !== null && idParam.trim() !== '') {
            const id = Number(idParam);
            if (Number.isFinite(id)) {
                const porId = listaDeCpus.find(item => Number(item.id) === id);
                if (porId) return porId;
            }
        }
        const partes = location.pathname.split('/').filter(Boolean);
        if (partes[0] === 'cpu' && partes.length >= 3) return QPSeo.resolverSlug(partes.slice(2).join('/'), listaDeCpus, partes[1]);
        const slug = params.get('cpu');
        return slug ? QPSeo.resolverSlug(slug, listaDeCpus, params.get('marca')) : null;
    }

    function definirMeta(name, content, property) {
        let el = document.querySelector(property ? `meta[property="${name}"]` : `meta[name="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            property ? el.setAttribute('property', name) : el.setAttribute('name', name);
            document.head.appendChild(el);
        }
        el.content = content;
    }

    function atualizarMeta(cpu) {
        const base = 'https://qualprocessador.vercel.app';
        const canonicalUrl = base + QPSeo.urlCpu(cpu);
        const editorial = QPSeo.descricaoEditorialCpu(cpu);
        const descricao = editorial.meta;
        const title = `${cpu.nome}: ficha técnica, CPU-Z e especificações | QualProcessador`;
        document.title = title;
        definirMeta('description', descricao, false);
        definirMeta('robots', 'index,follow,max-image-preview:large', false);
        definirMeta('og:title', title, true);
        definirMeta('og:description', descricao, true);
        definirMeta('og:type', 'article', true);
        definirMeta('og:url', canonicalUrl, true);
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = canonicalUrl;
        const jsonLd = document.createElement('script');
        jsonLd.type = 'application/ld+json';
        jsonLd.id = 'qp-cpu-jsonld';
        jsonLd.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${cpu.nome} - ficha técnica e resultados CPU-Z`,
            description: descricao,
            url: canonicalUrl,
            about: { '@type': 'Thing', name: cpu.nome, description: editorial.paragrafos.slice(0, 2).join(' ') },
            isPartOf: { '@type': 'WebSite', name: 'QualProcessador', url: base + '/' },
            breadcrumb: {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'QualProcessador', item: base + '/' },
                    { '@type': 'ListItem', position: 2, name: String(cpu.marca || cpu.fabricante || '').toUpperCase(), item: base + '/#cpus' },
                    { '@type': 'ListItem', position: 3, name: cpu.nome, item: canonicalUrl }
                ]
            }
        });
        document.getElementById('qp-cpu-jsonld')?.remove();
        document.head.appendChild(jsonLd);
    }

    function substituirVisaoGeral(cpu) {
        const card = document.querySelector('#panel-ficha .panel-card');
        if (!card || card.dataset.qpEditorial === '1') return;
        card.dataset.qpEditorial = '1';
        const h2 = card.querySelector('h2');
        if (h2) h2.textContent = 'Visão geral';
        card.querySelectorAll(':scope > p').forEach(p => p.remove());
        const editorial = QPSeo.descricaoEditorialCpu(cpu);
        editorial.paragrafos.forEach(texto => {
            const p = document.createElement('p');
            p.textContent = texto;
            card.appendChild(p);
        });
    }

    function atualizarBenchmark(cpu) {
        const itens = document.querySelectorAll('#panel-ficha .fichometro-item');
        const dados = [
            { titulo: 'CPU-Z Single Thread', tooltip: 'Resultado do benchmark CPU-Z usando uma thread. É uma medida sintética de desempenho por thread e não corresponde diretamente a FPS em jogos.', valor: QPSeo.pontosCpu(cpu.notaJogos), escala: 1000 },
            { titulo: 'CPU-Z Multi Thread', tooltip: 'Resultado do benchmark CPU-Z usando múltiplas threads. É uma medida sintética e pode variar conforme quantidade de núcleos, threads, clocks e plataforma.', valor: QPSeo.pontosCpu(cpu.notaTrabalho), escala: 20000 }
        ];
        itens.forEach((item, i) => {
            const info = dados[i];
            if (!info) return;
            const tooltip = item.querySelector('.tooltip-container');
            if (tooltip) {
                const ajuda = tooltip.querySelector('.help-icon');
                tooltip.childNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) node.nodeValue = ''; });
                tooltip.insertBefore(document.createTextNode(info.titulo + ' '), ajuda || null);
                if (ajuda) ajuda.dataset.tooltip = info.tooltip;
            }
            const strong = item.querySelector('.fichometro-label > strong');
            if (strong) strong.textContent = info.valor ? `${info.valor.toLocaleString('pt-BR')} pts` : 'N/A';
            const barra = item.querySelector('.fichometro-bar-fill');
            if (barra) barra.style.width = info.valor ? `${Math.min((info.valor / info.escala) * 100, 100)}%` : '0%';
        });
        const bloco = document.querySelector('#panel-ficha .fichometro-container');
        if (bloco && !document.querySelector('.qp-benchmark-note')) {
            const nota = document.createElement('p');
            nota.className = 'qp-benchmark-note';
            nota.style.cssText = 'margin:18px 0 0;color:#64748b;font-size:.88rem;line-height:1.65;';
            nota.textContent = 'CPU-Z é um benchmark sintético. Os pontos ajudam a comparar processadores, mas não representam diretamente FPS ou o desempenho de um programa específico.';
            bloco.insertAdjacentElement('afterend', nota);
        }
    }

    function adicionarComparacoes(cpu) {
        const card = document.querySelector('#panel-comparar .panel-card');
        const select = document.getElementById('comparador-select');
        if (!card || !select || card.querySelector('.qp-comparacoes-relacionadas')) return;
        const style = document.createElement('style');
        style.id = 'qp-details-seo-style';
        style.textContent = `.qp-comparacao-link-principal{display:none;margin:-10px 0 24px;padding:12px 16px;border-radius:9px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;text-align:center}.qp-comparacao-link-principal:hover{background:#1e293b}.qp-comparacoes-relacionadas{margin-top:30px;padding-top:24px;border-top:1px solid #e2e8f0}.qp-comparacoes-relacionadas h3{margin:0 0 6px;font-size:1.15rem}.qp-comparacoes-relacionadas p{font-size:.9rem!important;color:#64748b!important;margin-bottom:14px!important}.qp-comparacoes-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.qp-comparacoes-grid a{display:block;padding:12px 14px;border:1px solid #e2e8f0;border-radius:9px;text-decoration:none;color:#0f172a;background:#f8fafc;font-size:.85rem;font-weight:700}.qp-comparacoes-grid a:hover{border-color:#38bdf8;background:#fff}`;
        if (!document.getElementById(style.id)) document.head.appendChild(style);
        const abrir = document.createElement('a');
        abrir.className = 'qp-comparacao-link-principal';
        abrir.textContent = 'Abrir comparação em página própria';
        select.insertAdjacentElement('afterend', abrir);
        function atualizarLink() {
            const outro = listaDeCpus.find(item => String(item.id) === String(select.value));
            if (!outro) { abrir.style.display = 'none'; abrir.removeAttribute('href'); return; }
            abrir.href = QPSeo.urlComparacao(cpu, outro);
            abrir.textContent = `Abrir ${cpu.nome} vs ${outro.nome}`;
            abrir.style.display = 'block';
        }
        select.addEventListener('change', atualizarLink);
        const relacionados = QPSeo.cpusRelacionadas(cpu, listaDeCpus, 6);
        if (!relacionados.length) return;
        const secao = document.createElement('section');
        secao.className = 'qp-comparacoes-relacionadas';
        const h3 = document.createElement('h3');
        h3.textContent = 'Comparações relacionadas';
        const p = document.createElement('p');
        p.textContent = 'Modelos próximos em geração, plataforma ou desempenho.';
        const grid = document.createElement('div');
        grid.className = 'qp-comparacoes-grid';
        relacionados.forEach(outro => {
            const a = document.createElement('a');
            a.href = QPSeo.urlComparacao(cpu, outro);
            a.textContent = `${cpu.nome} vs ${outro.nome}`;
            grid.appendChild(a);
        });
        secao.append(h3, p, grid);
        card.appendChild(secao);
    }

    function aprimorarComparacaoInterna() {
        const resultado = document.getElementById('resultado-comparacao');
        if (!resultado) return;
        const aplicar = () => {
            const h3 = resultado.querySelector('h3');
            if (h3) h3.textContent = 'Resultados do CPU-Z';
            const h4s = resultado.querySelectorAll('h4');
            if (h4s[0]) h4s[0].textContent = 'CPU-Z Single Thread';
            if (h4s[1]) h4s[1].textContent = 'CPU-Z Multi Thread';
            resultado.querySelectorAll('strong').forEach(strong => { if (/NaN\s*pts/i.test(strong.textContent)) strong.textContent = 'N/A'; });
        };
        if ('MutationObserver' in window) new MutationObserver(aplicar).observe(resultado, { childList: true, subtree: true });
        aplicar();
    }

    function ajustarTextosSecundarios() {
        const preco = document.querySelector('#panel-preco .panel-card');
        if (preco) {
            const p = preco.querySelector('p');
            if (p) p.textContent = 'O histórico de preços ainda não está disponível para este modelo.';
        }
        const comparar = document.querySelector('#panel-comparar .panel-card > p');
        if (comparar) comparar.innerHTML = comparar.innerHTML.replace('Selecione outro processador para comparar com', 'Escolha outro processador para comparar com');
    }

    function init() {
        const cpu = encontrarCpuAtual();
        if (!cpu) return;
        atualizarMeta(cpu);
        substituirVisaoGeral(cpu);
        atualizarBenchmark(cpu);
        adicionarComparacoes(cpu);
        aprimorarComparacaoInterna();
        ajustarTextosSecundarios();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
    else setTimeout(init, 0);
})();
