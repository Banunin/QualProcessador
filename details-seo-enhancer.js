(function () {
    'use strict';

    function encontrarCpuAtual() {
        if (!window.QPSeo || typeof listaDeCpus === 'undefined' || !Array.isArray(listaDeCpus)) return null;
        const params = new URLSearchParams(location.search);
        const id = Number(params.get('id'));
        if (Number.isFinite(id)) {
            const porId = listaDeCpus.find(item => Number(item.id) === id);
            if (porId) return porId;
        }
        const partes = location.pathname.split('/').filter(Boolean);
        if (partes[0] === 'cpu' && partes.length >= 3) return QPSeo.resolverSlug(partes.slice(2).join('/'), listaDeCpus, partes[1]);
        const slug = params.get('cpu');
        return slug ? QPSeo.resolverSlug(slug, listaDeCpus, params.get('marca')) : null;
    }

    function atualizarMeta(cpu) {
        const base = 'https://qualprocessador.vercel.app';
        const canonicalUrl = base + QPSeo.urlCpu(cpu);
        const descricao = `${cpu.nome}: ficha técnica com ${cpu.cores} núcleos, ${cpu.threads} threads, ${cpu.freqBoost || 'clock turbo'}, TDP de ${cpu.tdp || '—'}, benchmarks e comparações no QualProcessador.`;

        let desc = document.querySelector('meta[name="description"]');
        if (!desc) {
            desc = document.createElement('meta');
            desc.name = 'description';
            document.head.appendChild(desc);
        }
        desc.content = descricao;

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
            name: `${cpu.nome} - ficha técnica e benchmarks`,
            description: descricao,
            url: canonicalUrl,
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

    function adicionarComparacoes(cpu) {
        const card = document.querySelector('#panel-comparar .panel-card');
        const select = document.getElementById('comparador-select');
        if (!card || !select || card.querySelector('.qp-comparacoes-relacionadas')) return;

        const style = document.createElement('style');
        style.id = 'qp-details-seo-style';
        style.textContent = `
            .qp-comparacao-link-principal{display:none;margin:-10px 0 24px;padding:12px 16px;border-radius:9px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;text-align:center}
            .qp-comparacao-link-principal:hover{background:#1e293b}
            .qp-comparacoes-relacionadas{margin-top:30px;padding-top:24px;border-top:1px solid #e2e8f0}
            .qp-comparacoes-relacionadas h3{margin:0 0 6px;font-size:1.15rem}.qp-comparacoes-relacionadas p{font-size:.9rem!important;color:#64748b!important;margin-bottom:14px!important}
            .qp-comparacoes-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
            .qp-comparacoes-grid a{display:block;padding:12px 14px;border:1px solid #e2e8f0;border-radius:9px;text-decoration:none;color:#0f172a;background:#f8fafc;font-size:.85rem;font-weight:700}
            .qp-comparacoes-grid a:hover{border-color:#38bdf8;background:#fff}
        `;
        if (!document.getElementById(style.id)) document.head.appendChild(style);

        const abrir = document.createElement('a');
        abrir.className = 'qp-comparacao-link-principal';
        abrir.textContent = 'Abrir comparação em página própria';
        select.insertAdjacentElement('afterend', abrir);

        function atualizarLink() {
            const outro = listaDeCpus.find(item => String(item.id) === String(select.value));
            if (!outro) {
                abrir.style.display = 'none';
                abrir.removeAttribute('href');
                return;
            }
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
        p.textContent = 'Modelos com desempenho próximo para continuar sua pesquisa.';
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

    function init() {
        const cpu = encontrarCpuAtual();
        if (!cpu) return;
        atualizarMeta(cpu);
        adicionarComparacoes(cpu);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
    else setTimeout(init, 0);
})();