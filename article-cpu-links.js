(function () {
    'use strict';

    function definirMeta(name, content, property) {
        let el = document.querySelector(property ? `meta[property="${name}"]` : `meta[name="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            property ? el.setAttribute('property', name) : el.setAttribute('name', name);
            document.head.appendChild(el);
        }
        el.content = content;
    }

    function aprimorarSeoArtigo(body) {
        const tituloEl = document.querySelector('.article-title');
        if (!body || !tituloEl) return;
        const titulo = tituloEl.textContent.trim();
        const primeiroP = body.querySelector('p');
        const texto = primeiroP ? primeiroP.textContent.replace(/\s+/g, ' ').trim() : '';
        const descricao = (texto || `Artigo técnico sobre ${titulo} no QualProcessador.`).slice(0, 158).replace(/[,:;\s]+$/, '') + (texto.length > 158 ? '…' : '');
        const canonicalUrl = `https://qualprocessador.vercel.app${location.pathname}`;
        document.title = `${titulo} | QualProcessador`;
        definirMeta('description', descricao, false);
        definirMeta('robots', 'index,follow,max-image-preview:large', false);
        definirMeta('og:title', titulo, true);
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
        const autor = document.querySelector('.article-meta-info strong')?.textContent.trim() || 'QualProcessador';
        const jsonLd = document.createElement('script');
        jsonLd.type = 'application/ld+json';
        jsonLd.id = 'qp-article-jsonld';
        jsonLd.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: titulo,
            description: descricao,
            mainEntityOfPage: canonicalUrl,
            author: { '@type': 'Organization', name: autor },
            publisher: { '@type': 'Organization', name: 'QualProcessador', url: 'https://qualprocessador.vercel.app/' }
        });
        document.getElementById('qp-article-jsonld')?.remove();
        document.head.appendChild(jsonLd);
        const footer = document.querySelector('footer');
        if (footer && /Editoriais de Alta Performance/i.test(footer.textContent)) footer.textContent = '© 2026 QualProcessador';
    }

    function init() {
        if (!window.QPSeo || typeof listaDeCpus === 'undefined' || !Array.isArray(listaDeCpus)) return;
        const host = document.getElementById('conteudo-artigo-dinamico');
        if (!host) return;
        const mapa = new Map();
        const padroes = [];

        function adicionarAlias(alias, cpu) {
            const normal = QPSeo.normalizar(alias);
            if (!normal || normal.length < 5 || !/\d/.test(normal) || /^\d+$/.test(normal) || mapa.has(normal)) return;
            mapa.set(normal, cpu);
            const tokens = normal.split(' ').filter(Boolean);
            if (!tokens.length) return;
            const pattern = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\-]+');
            padroes.push({ pattern, normal });
        }

        listaDeCpus.forEach(cpu => QPSeo.aliasesCpu(cpu).forEach(alias => adicionarAlias(alias, cpu)));
        padroes.sort((a, b) => b.normal.length - a.normal.length);
        if (!padroes.length) return;
        let regex;
        try { regex = new RegExp(`\\b(${padroes.map(p => p.pattern).join('|')})\\b`, 'gi'); } catch (e) { return; }

        function css() {
            if (document.getElementById('qp-article-cpu-style')) return;
            const style = document.createElement('style');
            style.id = 'qp-article-cpu-style';
            style.textContent = `.qp-cpus-citadas{margin:34px 0 10px;padding:22px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;font-family:'Poppins',sans-serif}.qp-cpus-citadas h2{margin:0 0 7px!important;font-size:1.35rem!important}.qp-cpus-citadas>p{margin:0 0 16px!important;font-family:'Poppins',sans-serif;font-size:.9rem;color:#64748b}.qp-cpu-links-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.qp-cpu-link-card{display:flex;flex-direction:column;gap:4px;padding:13px 14px;border:1px solid #e2e8f0;border-radius:10px;background:white;text-decoration:none!important;color:#0f172a!important}.qp-cpu-link-card:hover{border-color:#38bdf8;transform:translateY(-1px)}.qp-cpu-link-card strong{font-size:.9rem}.qp-cpu-link-card span{font-size:.75rem;color:#64748b}`;
            document.head.appendChild(style);
        }

        function processar(body) {
            if (!body || body.dataset.qpCpuLinks === '1') return;
            body.dataset.qpCpuLinks = '1';
            css();
            aprimorarSeoArtigo(body);
            const encontrados = new Map();
            const nodes = [];
            const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    const parent = node.parentElement;
                    if (!parent || !node.nodeValue || node.nodeValue.trim().length < 4) return NodeFilter.FILTER_REJECT;
                    if (parent.closest('a,script,style,code,pre,textarea,button,.qp-cpus-citadas')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(node => {
                const texto = node.nodeValue;
                regex.lastIndex = 0;
                let match, pos = 0, alterou = false;
                const frag = document.createDocumentFragment();
                while ((match = regex.exec(texto)) !== null) {
                    const normal = QPSeo.normalizar(match[0]);
                    const cpu = mapa.get(normal);
                    if (!cpu || encontrados.has(cpu.id)) continue;
                    if (match.index > pos) frag.appendChild(document.createTextNode(texto.slice(pos, match.index)));
                    const link = document.createElement('a');
                    link.href = QPSeo.urlCpu(cpu);
                    link.textContent = match[0];
                    link.title = `Ver ficha técnica do ${cpu.nome}`;
                    link.dataset.cpuId = String(cpu.id);
                    frag.appendChild(link);
                    pos = match.index + match[0].length;
                    encontrados.set(cpu.id, cpu);
                    alterou = true;
                }
                if (alterou) {
                    if (pos < texto.length) frag.appendChild(document.createTextNode(texto.slice(pos)));
                    node.parentNode.replaceChild(frag, node);
                }
            });
            if (!encontrados.size) return;
            const bloco = document.createElement('section');
            bloco.className = 'qp-cpus-citadas';
            const titulo = document.createElement('h2');
            titulo.textContent = 'Processadores citados neste artigo';
            const intro = document.createElement('p');
            intro.textContent = 'Consulte as fichas técnicas dos modelos mencionados para conferir especificações e resultados CPU-Z.';
            const grid = document.createElement('div');
            grid.className = 'qp-cpu-links-grid';
            [...encontrados.values()].slice(0, 12).forEach(cpu => {
                const link = document.createElement('a');
                link.className = 'qp-cpu-link-card';
                link.href = QPSeo.urlCpu(cpu);
                const strong = document.createElement('strong');
                strong.textContent = cpu.nome;
                const meta = document.createElement('span');
                meta.textContent = `${cpu.soquete || cpu.socket || 'Soquete não informado'} • ${cpu.cores || '?'}C/${cpu.threads || '?'}T`;
                link.append(strong, meta);
                grid.appendChild(link);
            });
            bloco.append(titulo, intro, grid);
            body.appendChild(bloco);
        }

        function scan() { host.querySelectorAll('.article-body').forEach(processar); }
        const observer = new MutationObserver(scan);
        observer.observe(host, { childList: true, subtree: true });
        scan();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
