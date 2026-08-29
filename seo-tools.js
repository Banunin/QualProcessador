(function () {
    'use strict';

    function normalizar(texto) {
        return String(texto || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
    }

    function compactar(texto) {
        return normalizar(texto).replace(/[^a-z0-9]/g, '');
    }

    function gerarSlug(texto) {
        return normalizar(texto).replace(/\s+/g, '-');
    }

    function slugCpu(cpu) {
        if (!cpu) return '';
        const marca = normalizar(cpu.marca || cpu.fabricante).split(' ')[0];
        const base = gerarSlug(cpu.nome);
        return base.startsWith(marca + '-') || base === marca ? base : `${marca}-${base}`;
    }

    function urlCpu(cpu) {
        if (!cpu) return '/';
        const marca = normalizar(cpu.marca || cpu.fabricante).split(' ')[0] || 'cpu';
        return `/cpu/${encodeURIComponent(marca)}/${encodeURIComponent(slugCpu(cpu))}`;
    }

    function aliasesCpu(cpu) {
        const nome = normalizar(cpu && cpu.nome);
        if (!nome) return [];

        const aliases = new Set([nome]);
        const semMarca = nome.replace(/^(amd|intel)\s+/, '').trim();
        if (semMarca) aliases.add(semMarca);

        const semLinha = semMarca.replace(/^(core|xeon)\s+/, '').trim();
        if (semLinha) aliases.add(semLinha);

        const tokens = semMarca.split(' ');
        const ultimo = tokens[tokens.length - 1] || '';
        if (ultimo.length >= 5 && /\d/.test(ultimo) && /[a-z]/.test(ultimo)) aliases.add(ultimo);

        if (/^xeon\s+/.test(semMarca)) {
            const xeonCurto = semMarca.replace(/^xeon\s+/, '');
            if (xeonCurto.length >= 5) aliases.add(xeonCurto);
        }

        return [...aliases].filter(Boolean);
    }

    function distanciaLevenshtein(a, b) {
        a = String(a || '');
        b = String(b || '');
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;

        const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
        const cur = new Array(b.length + 1);

        for (let i = 1; i <= a.length; i++) {
            cur[0] = i;
            for (let j = 1; j <= b.length; j++) {
                const custo = a[i - 1] === b[j - 1] ? 0 : 1;
                cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + custo);
            }
            for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
        }
        return prev[b.length];
    }

    function scoreCpu(consulta, cpu) {
        const q = normalizar(consulta);
        if (!q) return 0;
        const qc = compactar(q);
        const aliases = aliasesCpu(cpu);
        let melhor = 0;

        for (const alias of aliases) {
            const ac = compactar(alias);
            if (alias === q) melhor = Math.max(melhor, 10000);
            if (ac === qc) melhor = Math.max(melhor, 9800);
            if (alias.startsWith(q)) melhor = Math.max(melhor, 9000 - Math.max(0, alias.length - q.length));
            if (q.length >= 3 && alias.includes(q)) melhor = Math.max(melhor, 8400 - Math.max(0, alias.length - q.length));
            if (qc.length >= 3 && ac.includes(qc)) melhor = Math.max(melhor, 8200 - Math.max(0, ac.length - qc.length));

            const qTokens = q.split(' ').filter(Boolean);
            const aTokens = alias.split(' ').filter(Boolean);
            let totalDist = 0;
            let todos = true;

            for (const qt of qTokens) {
                let dist = Infinity;
                for (const at of aTokens) {
                    if (at === qt) { dist = 0; break; }
                    if (qt.length <= 2 || at.length <= 2) continue;
                    dist = Math.min(dist, distanciaLevenshtein(qt, at));
                }
                const tolerancia = qt.length >= 7 ? 2 : qt.length >= 4 ? 1 : 0;
                if (dist > tolerancia) { todos = false; break; }
                totalDist += dist;
            }

            if (todos && qTokens.length) melhor = Math.max(melhor, 7000 - totalDist * 450 - Math.abs(aTokens.length - qTokens.length) * 25);
        }

        const marcaQ = q.includes('amd') ? 'amd' : q.includes('intel') ? 'intel' : '';
        if (marcaQ && normalizar(cpu.marca) === marcaQ && melhor > 0) melhor += 100;
        return melhor;
    }

    function buscarCpus(consulta, cpus, limite) {
        const lista = Array.isArray(cpus) ? cpus : [];
        const max = Number(limite) || 8;
        return lista
            .map(cpu => ({ cpu, score: scoreCpu(consulta, cpu) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score || Number(a.cpu.id || 0) - Number(b.cpu.id || 0))
            .slice(0, max);
    }

    function resolverSlug(slug, cpus, marca) {
        const alvo = gerarSlug(decodeURIComponent(String(slug || '')));
        const marcaNorm = normalizar(marca);
        if (!alvo) return null;
        return (Array.isArray(cpus) ? cpus : []).find(cpu => {
            if (marcaNorm && normalizar(cpu.marca) !== marcaNorm) return false;
            const full = slugCpu(cpu);
            const simples = gerarSlug(cpu.nome);
            return full === alvo || simples === alvo;
        }) || null;
    }

    function ordenarPar(a, b) {
        if (!a || !b) return [a, b];
        const ai = Number(a.id);
        const bi = Number(b.id);
        if (Number.isFinite(ai) && Number.isFinite(bi)) return ai <= bi ? [a, b] : [b, a];
        return slugCpu(a) <= slugCpu(b) ? [a, b] : [b, a];
    }

    function urlComparacao(a, b) {
        if (!a || !b || a === b) return '/comparar';
        const [primeiro, segundo] = ordenarPar(a, b);
        return `/comparar/${slugCpu(primeiro)}-vs-${slugCpu(segundo)}`;
    }

    function resolverComparacao(valor, cpus) {
        const bruto = decodeURIComponent(String(valor || '')).replace(/^\/+|\/+$/g, '');
        const idx = bruto.indexOf('-vs-');
        if (idx < 1) return null;
        const aSlug = bruto.slice(0, idx);
        const bSlug = bruto.slice(idx + 4);
        const a = resolverSlug(aSlug, cpus);
        const b = resolverSlug(bSlug, cpus);
        return a && b && a !== b ? ordenarPar(a, b) : null;
    }

    function extrairConsultaComparacao(texto) {
        const valor = String(texto || '').trim();
        const match = valor.match(/^(.+?)\s+(?:vs\.?|versus|x)\s+(.+)$/i);
        if (!match) return null;
        return [match[1].trim(), match[2].trim()];
    }

    function numero(valor) {
        if (typeof valor === 'number') return valor;
        const txt = String(valor || '').replace(',', '.');
        const m = txt.match(/-?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : 0;
    }

    function cpusRelacionadas(cpu, cpus, limite) {
        if (!cpu || !Array.isArray(cpus)) return [];
        const max = Number(limite) || 6;
        const single = numero(cpu.notaJogos);
        const multi = numero(cpu.notaTrabalho);
        const socket = normalizar(cpu.soquete || cpu.socket);

        return cpus
            .filter(item => item !== cpu && item.id !== cpu.id)
            .map(item => {
                const ds = Math.abs(numero(item.notaJogos) - single) / Math.max(single, 1);
                const dm = Math.abs(numero(item.notaTrabalho) - multi) / Math.max(multi, 1);
                let score = ds * 0.65 + dm * 0.35;
                if (socket && normalizar(item.soquete || item.socket) === socket) score *= 0.82;
                return { cpu: item, score };
            })
            .sort((a, b) => a.score - b.score)
            .slice(0, max)
            .map(item => item.cpu);
    }

    window.QPSeo = {
        normalizar,
        compactar,
        gerarSlug,
        slugCpu,
        urlCpu,
        aliasesCpu,
        distanciaLevenshtein,
        scoreCpu,
        buscarCpus,
        resolverSlug,
        ordenarPar,
        urlComparacao,
        resolverComparacao,
        extrairConsultaComparacao,
        numero,
        cpusRelacionadas
    };
})();