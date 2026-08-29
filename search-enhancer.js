(function () {
    'use strict';

    function init() {
        if (!window.QPSeo || typeof listaDeCpus === 'undefined' || !Array.isArray(listaDeCpus)) return;
        const input = document.getElementById('campo-busca');
        const box = document.getElementById('caixa-sugestoes');
        if (!input || !box || input.dataset.qpBuscaAvancada === '1') return;
        input.dataset.qpBuscaAvancada = '1';

        let primeiroDestino = '';

        function criarItem(titulo, subtitulo, destino, destaque) {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.setAttribute('role', 'option');
            item.tabIndex = 0;

            const esquerda = document.createElement('span');
            esquerda.textContent = titulo;
            if (destaque) esquerda.style.color = '#0284c7';

            const direita = document.createElement('small');
            direita.textContent = subtitulo || '';
            direita.style.cssText = 'font-size:0.72rem;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-left:12px;text-align:right;';

            item.appendChild(esquerda);
            item.appendChild(direita);
            item.addEventListener('click', () => { window.location.href = destino; });
            item.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    window.location.href = destino;
                }
            });
            return item;
        }

        function render() {
            const termo = input.value.trim();
            box.innerHTML = '';
            primeiroDestino = '';

            if (!termo) {
                box.style.display = 'none';
                return;
            }

            const partesComparacao = QPSeo.extrairConsultaComparacao(termo);
            if (partesComparacao) {
                const a = QPSeo.buscarCpus(partesComparacao[0], listaDeCpus, 1)[0];
                const b = QPSeo.buscarCpus(partesComparacao[1], listaDeCpus, 1)[0];
                if (a && b && a.cpu.id !== b.cpu.id) {
                    const destino = QPSeo.urlComparacao(a.cpu, b.cpu);
                    primeiroDestino = destino;
                    box.appendChild(criarItem(`Comparar ${a.cpu.nome} vs ${b.cpu.nome}`, 'Comparação', destino, true));
                }
            }

            const resultados = QPSeo.buscarCpus(termo, listaDeCpus, 8);
            resultados.forEach((resultado) => {
                const cpu = resultado.cpu;
                const destino = QPSeo.urlCpu(cpu);
                if (!primeiroDestino) primeiroDestino = destino;
                const socket = String(cpu.soquete || cpu.socket || '').toUpperCase();
                box.appendChild(criarItem(cpu.nome, socket || 'Ficha técnica', destino, false));
            });

            if (!box.children.length) {
                const vazio = document.createElement('div');
                vazio.className = 'suggestion-item';
                vazio.style.cursor = 'default';
                vazio.textContent = 'Nenhum processador encontrado. Tente apenas o modelo, por exemplo: 5600, 12400F ou E5 2680.';
                box.appendChild(vazio);
            }

            box.style.display = 'block';
        }

        input.addEventListener('input', render);
        input.addEventListener('focus', render);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && primeiroDestino) {
                event.preventDefault();
                event.stopImmediatePropagation();
                window.location.href = primeiroDestino;
            }
        }, true);

        if (input.value) render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();