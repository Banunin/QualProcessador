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
        return lista.map(cpu => ({ cpu, score: scoreCpu(consulta, cpu) }))
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
        const a = resolverSlug(bruto.slice(0, idx), cpus);
        const b = resolverSlug(bruto.slice(idx + 4), cpus);
        return a && b && a !== b ? ordenarPar(a, b) : null;
    }

    function extrairConsultaComparacao(texto) {
        const valor = String(texto || '').trim();
        const match = valor.match(/^(.+?)\s+(?:vs\.?|versus|x)\s+(.+)$/i);
        return match ? [match[1].trim(), match[2].trim()] : null;
    }

    function numero(valor) {
        if (typeof valor === 'number') return valor;
        const txt = String(valor || '').replace(',', '.');
        const m = txt.match(/-?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : 0;
    }

    function anoLancamento(cpu) {
        const match = String((cpu && cpu.lancamento) || '').match(/(?:19|20)\d{2}/);
        return match ? Number(match[0]) : 0;
    }

    function scoreSimilaridadeCpu(base, item) {
        const singleBase = numero(base.notaJogos);
        const multiBase = numero(base.notaTrabalho);
        const coresBase = numero(base.cores);
        const threadsBase = numero(base.threads);
        const anoBase = anoLancamento(base);
        const ds = singleBase > 0 && numero(item.notaJogos) > 0 ? Math.abs(numero(item.notaJogos) - singleBase) / Math.max(singleBase, 1) : 0.45;
        const dm = multiBase > 0 && numero(item.notaTrabalho) > 0 ? Math.abs(numero(item.notaTrabalho) - multiBase) / Math.max(multiBase, 1) : 0.45;
        const dc = coresBase > 0 ? Math.abs(numero(item.cores) - coresBase) / Math.max(coresBase, 1) : 0.3;
        const dt = threadsBase > 0 ? Math.abs(numero(item.threads) - threadsBase) / Math.max(threadsBase, 1) : 0.3;
        const anoItem = anoLancamento(item);
        const diffAno = anoBase && anoItem ? Math.abs(anoItem - anoBase) : 2;
        const dy = Math.min(diffAno / 4, 1.5);
        let score = ds * 0.36 + dm * 0.22 + dc * 0.17 + dt * 0.10 + dy * 0.15;
        if (diffAno > 5) score += 1.2;
        if (diffAno > 8) score += 1.5;
        const socketBase = normalizar(base.soquete || base.socket);
        const socketItem = normalizar(item.soquete || item.socket);
        if (socketBase && socketBase === socketItem) score *= 0.82;
        const marcaBase = normalizar(base.marca);
        const marcaItem = normalizar(item.marca);
        if (marcaBase && marcaBase !== marcaItem && diffAno <= 3) score *= 0.94;
        return score;
    }

    function cpusRelacionadas(cpu, cpus, limite) {
        if (!cpu || !Array.isArray(cpus)) return [];
        const max = Number(limite) || 6;
        return cpus.filter(item => item !== cpu && item.id !== cpu.id)
            .map(item => ({ cpu: item, score: scoreSimilaridadeCpu(cpu, item) }))
            .sort((a, b) => a.score - b.score).slice(0, max).map(item => item.cpu);
    }

    function valorInformado(valor) {
        if (valor === undefined || valor === null) return false;
        const txt = String(valor).trim();
        return Boolean(txt) && txt.toUpperCase() !== 'N/A' && txt !== '—';
    }

    function pontosCpu(valor) {
        if (!valorInformado(valor)) return null;
        const n = Number.parseInt(valor, 10);
        return Number.isFinite(n) && n >= 100 ? n : null;
    }

    function textoGrafico(cpu) {
        const video = String((cpu && cpu.video) || '').trim();
        if (!valorInformado(video) || /não possui|nao possui|sem (?:vídeo|video)|none/i.test(video)) return 'Não possui vídeo integrado; para saída de imagem e aceleração 3D é necessária uma placa de vídeo dedicada.';
        return `Inclui vídeo integrado ${video}.`;
    }

    function descricaoEditorialCpu(cpu) {
        if (!cpu) return { paragrafos: [], meta: '' };
        const paragrafos = [];
        const nome = String(cpu.nome || 'Este processador');
        const cores = valorInformado(cpu.cores) ? String(cpu.cores) : '';
        const threads = valorInformado(cpu.threads) ? String(cpu.threads) : '';
        const arquitetura = valorInformado(cpu.arquitetura) ? String(cpu.arquitetura) : '';
        const litografia = valorInformado(cpu.litografia) ? String(cpu.litografia) : '';
        const ano = anoLancamento(cpu);
        const socket = valorInformado(cpu.soquete || cpu.socket) ? String(cpu.soquete || cpu.socket) : '';
        const base = valorInformado(cpu.freqBase) ? String(cpu.freqBase) : '';
        const boost = valorInformado(cpu.freqBoost) ? String(cpu.freqBoost) : '';
        const tdp = valorInformado(cpu.tdp) ? String(cpu.tdp) : '';
        const memoria = valorInformado(cpu.memoria || cpu.freqMaxMemoria) ? String(cpu.memoria || cpu.freqMaxMemoria) : '';
        const pcie = valorInformado(cpu.pcie) ? String(cpu.pcie) : '';
        const cacheL3 = valorInformado(cpu.cacheL3) ? String(cpu.cacheL3) : '';
        let intro = `${nome} é um processador`;
        if (arquitetura) intro += ` baseado na arquitetura ${arquitetura}`;
        if (litografia) intro += `, fabricado em ${litografia}`;
        if (cores && threads) intro += `, com ${cores} núcleos e ${threads} threads`;
        else if (cores) intro += `, com ${cores} núcleos`;
        intro += '.';
        paragrafos.push(intro);
        let operacaoTexto = '';
        if (ano && socket) operacaoTexto = `Lançado em ${ano}, usa o soquete ${socket}. `;
        else if (ano) operacaoTexto = `O lançamento informado é de ${ano}. `;
        else if (socket) operacaoTexto = `Usa o soquete ${socket}. `;
        if (base && boost && base !== boost) operacaoTexto += `O clock base é de ${base}, com boost de até ${boost}.`;
        else if (base) operacaoTexto += `O clock informado é de ${base}.`;
        else if (boost) operacaoTexto += `O boost chega a ${boost}.`;
        if (tdp) operacaoTexto += `${operacaoTexto ? ' ' : ''}O TDP é de ${tdp}.`;
        if (operacaoTexto) paragrafos.push(operacaoTexto);
        const plataforma = [];
        if (memoria) plataforma.push(`memória ${memoria}`);
        if (pcie) plataforma.push(pcie);
        if (cacheL3) plataforma.push(`cache L3 de ${cacheL3}`);
        let plataformaTexto = plataforma.length ? `A ficha registra ${plataforma.join(', ')}. ` : '';
        plataformaTexto += textoGrafico(cpu);
        paragrafos.push(plataformaTexto);
        const single = pontosCpu(cpu.notaJogos);
        const multi = pontosCpu(cpu.notaTrabalho);
        if (single || multi) {
            const partes = [];
            if (single) partes.push(`${single.toLocaleString('pt-BR')} pontos em Single Thread`);
            if (multi) partes.push(`${multi.toLocaleString('pt-BR')} pontos em Multi Thread`);
            paragrafos.push(`Nos resultados CPU-Z cadastrados no QualProcessador, o ${nome} registra ${partes.join(' e ')}.`);
        }
        const metaPartes = [];
        if (cores && threads) metaPartes.push(`${cores} núcleos/${threads} threads`);
        if (boost) metaPartes.push(`até ${boost}`);
        if (socket) metaPartes.push(socket);
        if (tdp) metaPartes.push(`TDP ${tdp}`);
        const meta = `${nome}: ficha técnica${metaPartes.length ? ' com ' + metaPartes.join(', ') : ''}, resultados CPU-Z e comparações de processadores.`;
        return { paragrafos, meta };
    }

    function diferencaPercentual(a, b) {
        const x = Number(a), y = Number(b);
        if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0 || x === y) return 0;
        return Math.round((Math.abs(x - y) / Math.min(x, y)) * 100);
    }

    function fraseBenchComparacao(rotulo, a, b, campo) {
        const pa = pontosCpu(a[campo]), pb = pontosCpu(b[campo]);
        if (!pa && !pb) return `Não há pontuação ${rotulo} cadastrada para nenhum dos dois modelos.`;
        if (!pa) return `${b.nome} tem ${pb.toLocaleString('pt-BR')} pontos em ${rotulo}; ${a.nome} ainda não possui resultado cadastrado nesse teste.`;
        if (!pb) return `${a.nome} tem ${pa.toLocaleString('pt-BR')} pontos em ${rotulo}; ${b.nome} ainda não possui resultado cadastrado nesse teste.`;
        if (pa === pb) return `Em ${rotulo}, os dois aparecem com ${pa.toLocaleString('pt-BR')} pontos no banco atual.`;
        const melhor = pa > pb ? a : b, pior = pa > pb ? b : a;
        const pmelhor = Math.max(pa, pb), ppior = Math.min(pa, pb), dif = diferencaPercentual(pa, pb);
        return `Em ${rotulo}, ${melhor.nome} registra ${pmelhor.toLocaleString('pt-BR')} pontos contra ${ppior.toLocaleString('pt-BR')} de ${pior.nome}${dif ? `, diferença de cerca de ${dif}%` : ''}.`;
    }

    function resumoComparacao(a, b) {
        if (!a || !b) return [];
        const linhas = [];
        const ac = valorInformado(a.cores) ? String(a.cores) : '—', bc = valorInformado(b.cores) ? String(b.cores) : '—';
        const at = valorInformado(a.threads) ? String(a.threads) : '—', bt = valorInformado(b.threads) ? String(b.threads) : '—';
        let primeira = `${a.nome} tem ${ac} núcleos e ${at} threads; ${b.nome} tem ${bc} núcleos e ${bt} threads.`;
        const socketA = valorInformado(a.soquete || a.socket) ? String(a.soquete || a.socket) : '';
        const socketB = valorInformado(b.soquete || b.socket) ? String(b.soquete || b.socket) : '';
        if (socketA && socketB) primeira += socketA === socketB ? ` Os dois usam o soquete ${socketA}.` : ` As plataformas são ${socketA} e ${socketB}, respectivamente.`;
        linhas.push(primeira);
        linhas.push(fraseBenchComparacao('CPU-Z Single Thread', a, b, 'notaJogos'));
        linhas.push(fraseBenchComparacao('CPU-Z Multi Thread', a, b, 'notaTrabalho'));
        return linhas;
    }

    function meta(name, content, property) {
        let el = document.querySelector(property ? `meta[property="${name}"]` : `meta[name="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            property ? el.setAttribute('property', name) : el.setAttribute('name', name);
            document.head.appendChild(el);
        }
        el.content = content;
    }

    function resolverCpuPorNome(nome, cpus) {
        const exato = (cpus || []).find(cpu => normalizar(cpu.nome) === normalizar(nome));
        if (exato) return exato;
        const resultado = buscarCpus(nome, cpus || [], 1);
        return resultado.length ? resultado[0].cpu : null;
    }

    function aprimorarHome() {
        if (!/^\/?(?:index\.html)?$/.test(location.pathname) && location.pathname !== '/') return;
        const hero = document.querySelector('.hero');
        if (hero) {
            const p = hero.querySelector(':scope > p');
            if (p) p.textContent = 'Fichas técnicas, resultados CPU-Z e comparações de processadores AMD e Intel.';
        }
        const busca = document.getElementById('campo-busca');
        if (busca) busca.placeholder = 'Buscar processador (ex.: Ryzen 5 5600, i5-12400F)';
        document.title = 'QualProcessador | Fichas técnicas e comparações de CPUs';
        meta('description', 'Consulte fichas técnicas, resultados CPU-Z e comparações lado a lado de processadores AMD Ryzen, Intel Core, Xeon e outras linhas.', false);
        const atualizarTitulos = () => {
            const titulo = document.getElementById('titulo-fichas');
            if (titulo) {
                const desejado = location.hash === '#cpus' ? 'Catálogo de processadores AMD e Intel' : 'Processadores adicionados recentemente';
                if (titulo.textContent !== desejado) titulo.textContent = desejado;
            }
            document.querySelectorAll('.btn-read').forEach(btn => { if (btn.textContent !== 'Abrir ficha técnica') btn.textContent = 'Abrir ficha técnica'; });
            const mais = document.getElementById('btn-ver-todos');
            if (mais && mais.textContent !== 'Ver catálogo de CPUs') mais.textContent = 'Ver catálogo de CPUs';
        };
        atualizarTitulos();
        window.addEventListener('hashchange', () => setTimeout(atualizarTitulos, 0));
        const grid = document.getElementById('grid-processadores');
        if (grid && 'MutationObserver' in window) new MutationObserver(atualizarTitulos).observe(grid, { childList: true, subtree: true });
    }

    function aprimorarComparador() {
        if (!location.pathname.startsWith('/comparar')) return;
        if (typeof listaDeCpus === 'undefined' || !Array.isArray(listaDeCpus)) return;
        const heroDesc = document.getElementById('hero-desc');
        if (heroDesc && !document.getElementById('comparison')?.classList.contains('active')) heroDesc.textContent = 'Escolha dois processadores e compare ficha técnica, plataforma e resultados do benchmark CPU-Z.';
        const empty = document.getElementById('empty-intro');
        if (empty) {
            const h2 = empty.querySelector('h2'), p = empty.querySelector('p');
            if (h2) h2.textContent = 'Compare processadores cadastrados';
            if (p) p.textContent = 'Digite dois modelos para abrir a comparação. As pontuações exibidas são do CPU-Z quando houver resultado cadastrado.';
        }
        let chaveAnterior = '';
        const aplicar = () => {
            const comparison = document.getElementById('comparison');
            if (!comparison || !comparison.classList.contains('active')) return;
            const a = resolverCpuPorNome(document.getElementById('cpu-a')?.value, listaDeCpus);
            const b = resolverCpuPorNome(document.getElementById('cpu-b')?.value, listaDeCpus);
            if (!a || !b || a.id === b.id) return;
            const chave = `${a.id}:${b.id}`;
            if (chave === chaveAnterior && document.querySelector('.qp-editorial-summary')) return;
            chaveAnterior = chave;
            const scoreTitles = document.querySelectorAll('#score-grid .score-card h3');
            if (scoreTitles[0]) scoreTitles[0].textContent = 'CPU-Z Single Thread';
            if (scoreTitles[1]) scoreTitles[1].textContent = 'CPU-Z Multi Thread';
            const lead = document.getElementById('comparison-lead');
            if (lead) lead.textContent = `Ficha técnica e resultados CPU-Z de ${a.nome} e ${b.nome}, lado a lado.`;
            if (heroDesc) heroDesc.textContent = 'Comparação direta de especificações e resultados do benchmark CPU-Z.';
            const resumo = document.getElementById('summary-card');
            if (resumo) {
                resumo.innerHTML = '';
                const h2 = document.createElement('h2');
                h2.textContent = 'Resumo da comparação';
                resumo.appendChild(h2);
                resumoComparacao(a, b).forEach(texto => {
                    const p = document.createElement('p');
                    p.className = 'qp-editorial-summary';
                    p.textContent = texto;
                    resumo.appendChild(p);
                });
                const nota = document.createElement('p');
                nota.className = 'qp-editorial-summary';
                nota.textContent = 'CPU-Z é um benchmark sintético. A pontuação não equivale diretamente a FPS em jogos nem ao desempenho de um aplicativo específico.';
                resumo.appendChild(nota);
            }
            const desc = `${a.nome} vs ${b.nome}: compare núcleos, threads, clocks, TDP, soquete, memória e resultados CPU-Z Single Thread e Multi Thread.`;
            meta('description', desc, false);
            meta('og:description', desc, true);
        };
        const comparison = document.getElementById('comparison');
        if (comparison && 'MutationObserver' in window) new MutationObserver(() => setTimeout(aplicar, 0)).observe(comparison, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        setTimeout(aplicar, 0);
    }

    window.QPSeo = {
        normalizar, compactar, gerarSlug, slugCpu, urlCpu, aliasesCpu, distanciaLevenshtein,
        scoreCpu, buscarCpus, resolverSlug, ordenarPar, urlComparacao, resolverComparacao,
        extrairConsultaComparacao, numero, anoLancamento, scoreSimilaridadeCpu, cpusRelacionadas,
        valorInformado, pontosCpu, descricaoEditorialCpu, resumoComparacao
    };

    try {
        const partes = window.location.pathname.split('/').filter(Boolean);
        if (partes[0] === 'cpu' && partes.length >= 3 && !new URLSearchParams(window.location.search).get('cpu')) {
            const marca = partes[1];
            const cpu = partes.slice(2).join('/');
            window.history.replaceState(window.history.state, '', `/detalhes.html?marca=${encodeURIComponent(marca)}&cpu=${encodeURIComponent(cpu)}`);
        }
    } catch (e) {}

    function iniciarCamadaEditorial() {
        setTimeout(() => { aprimorarHome(); aprimorarComparador(); }, 0);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarCamadaEditorial);
    else iniciarCamadaEditorial();
})();
