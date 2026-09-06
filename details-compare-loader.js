(function () {
    'use strict';

    const PAGE_SIZE = 250;
    let optionsLoaded = false;
    let optionsLoading = false;
    let cpuLoading = false;

    function getLocalList() {
        try {
            return typeof listaDeCpus !== 'undefined' && Array.isArray(listaDeCpus) ? listaDeCpus : null;
        } catch (_) {
            return null;
        }
    }

    async function fetchOptionsPage(offset) {
        const params = new URLSearchParams({
            view: 'option',
            limit: String(PAGE_SIZE),
            offset: String(offset),
            sort: 'nome-asc'
        });
        const response = await fetch(`/api/ai-cpus?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    async function loadOptions() {
        if (optionsLoaded || optionsLoading) return;
        const list = getLocalList();
        const select = document.getElementById('comparador-select');
        if (!list || !select) return;

        // O caminho legado já possui o catálogo completo e não precisa deste loader.
        if (list.length > 1) {
            optionsLoaded = true;
            return;
        }

        optionsLoading = true;
        const original = select.innerHTML;
        select.disabled = true;
        select.innerHTML = '<option value="">Carregando processadores...</option>';
        try {
            const currentId = String(list[0] && list[0].id || '');
            const options = [];
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const payload = await fetchOptionsPage(offset);
                const items = Array.isArray(payload.items) ? payload.items : [];
                options.push(...items);
                offset += items.length;
                hasMore = Boolean(payload.pagination && payload.pagination.has_more) && items.length > 0;
            }

            const fragment = document.createDocumentFragment();
            const first = document.createElement('option');
            first.value = '';
            first.textContent = 'Selecione um processador...';
            fragment.appendChild(first);

            options.forEach(item => {
                if (String(item.id) === currentId) return;
                const option = document.createElement('option');
                option.value = String(item.id);
                option.textContent = item.nome;
                fragment.appendChild(option);
            });

            select.replaceChildren(fragment);
            optionsLoaded = true;
        } catch (_) {
            select.innerHTML = original || '<option value="">Selecione um processador...</option>';
        } finally {
            select.disabled = false;
            optionsLoading = false;
        }
    }

    async function hydrateSelectedCpu(select) {
        if (cpuLoading || !select || !select.value) return;
        const list = getLocalList();
        if (!list) return;
        if (list.some(item => String(item.id) === String(select.value))) return;

        cpuLoading = true;
        select.disabled = true;
        try {
            const params = new URLSearchParams({ id: String(select.value), limit: '1' });
            const response = await fetch(`/api/ai-cpus?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload = await response.json();
            const item = Array.isArray(payload.items) ? payload.items[0] : null;
            if (!item) return;
            list.push(item);

            // O comparador existente continua sendo a fonte de renderização.
            // Disparamos novamente o evento agora que a CPU selecionada foi hidratada.
            select.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {
            const result = document.getElementById('resultado-comparacao');
            if (result) result.textContent = 'Não foi possível carregar os dados desse processador para comparação.';
        } finally {
            select.disabled = false;
            cpuLoading = false;
        }
    }

    function init() {
        const compareTab = document.querySelector('.tab-btn[data-tab="comparar"]');
        const select = document.getElementById('comparador-select');
        if (!compareTab || !select) return;

        compareTab.addEventListener('click', loadOptions);
        select.addEventListener('change', event => {
            hydrateSelectedCpu(event.currentTarget);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
