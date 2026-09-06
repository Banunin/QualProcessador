(function () {
    'use strict';

    const API = '/api/ai-cpus';
    const HOME_LIMIT = 3;
    const PAGE_SIZE = 24;

    const state = {
        tab: 'home',
        brand: 'todos',
        socket: 'todos',
        video: 'todos',
        homeItems: null,
        catalogItems: [],
        catalogOffset: 0,
        catalogHasMore: true,
        loading: false,
        requestId: 0,
        controller: null
    };

    const el = {
        homeTab: document.getElementById('aba-home'),
        cpusTab: document.getElementById('aba-cpus'),
        articles: document.getElementById('topico-analises'),
        title: document.getElementById('titulo-fichas'),
        filters: document.getElementById('filtros-container'),
        grid: document.getElementById('grid-processadores'),
        moreWrapper: document.getElementById('wrapper-ver-todos'),
        moreButton: document.getElementById('btn-ver-todos'),
        brand: document.getElementById('filtro-marca'),
        socket: document.getElementById('filtro-socket'),
        video: document.getElementById('filtro-video'),
        classification: document.getElementById('filtro-preco'),
        sort: document.getElementById('ordenar-por')
    };

    if (!el.homeTab || !el.cpusTab || !el.grid || !el.moreButton) return;

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizeBrand(value) {
        return String(value || '').toLowerCase() === 'amd' ? 'amd' : 'intel';
    }

    function card(cpu) {
        const brand = normalizeBrand(cpu.marca || cpu.fabricante);
        const buttonClass = brand === 'amd' ? 'btn-amd' : 'btn-intel';
        const url = cpu.url || cpu.canonical_url || '#';
        return `
            <article class="cpu-card brand-${brand}">
                <div>
                    <div class="card-top"><h2>${esc(cpu.nome)}</h2></div>
                    <p class="cpu-tagline">${esc(cpu.detalhe || '')}</p>
                    <div class="card-specs">
                        <div class="card-spec-item"><strong>${esc(cpu.cores)}/${esc(cpu.threads)}</strong><span>Núcleos/Threads</span></div>
                        <div class="card-spec-item"><strong>${esc(cpu.freqBoost || '—')}</strong><span>Boost</span></div>
                        <div class="card-spec-item"><strong>${esc(cpu.tdp || '—')}</strong><span>TDP</span></div>
                    </div>
                </div>
                <a href="${esc(url)}" class="btn-read ${buttonClass}">Abrir ficha técnica</a>
            </article>`;
    }

    function cancelRequest() {
        if (state.controller) state.controller.abort();
        state.controller = null;
        state.loading = false;
        state.requestId += 1;
    }

    function setLoading(message) {
        if (!el.grid.children.length) {
            el.grid.innerHTML = `<div class="aviso-vazio">${esc(message || 'Carregando processadores...')}</div>`;
        }
        el.moreButton.disabled = true;
        el.moreButton.textContent = 'Carregando...';
    }

    function setError(message) {
        el.grid.innerHTML = `<div class="aviso-vazio">${esc(message)}</div>`;
        el.moreWrapper.style.display = 'none';
    }

    function render(items, append) {
        const html = items.map(card).join('');
        if (append) el.grid.insertAdjacentHTML('beforeend', html);
        else el.grid.innerHTML = html || '<div class="aviso-vazio">Nenhum processador corresponde aos filtros ativos.</div>';
    }

    function endpoint(limit, offset) {
        const params = new URLSearchParams({
            view: 'card',
            limit: String(limit),
            offset: String(offset),
            sort: 'id-asc'
        });
        if (state.brand !== 'todos') params.set('brand', state.brand);
        if (state.socket !== 'todos') params.set('socket', state.socket);
        if (state.video !== 'todos') params.set('video', state.video);
        return `${API}?${params.toString()}`;
    }

    async function fetchPage(limit, offset, signal) {
        const response = await fetch(endpoint(limit, offset), {
            signal,
            headers: { Accept: 'application/json' },
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    async function loadHome() {
        if (state.homeItems) {
            render(state.homeItems, false);
            updateMoreButton();
            return;
        }

        cancelRequest();
        const requestId = state.requestId;
        const controller = new AbortController();
        state.controller = controller;
        state.loading = true;
        setLoading('Carregando processadores...');
        try {
            const payload = await fetchPage(HOME_LIMIT, 0, controller.signal);
            if (requestId !== state.requestId || state.tab !== 'home') return;
            state.homeItems = Array.isArray(payload.items) ? payload.items : [];
            render(state.homeItems, false);
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            if (requestId === state.requestId && state.tab === 'home') {
                setError('Não foi possível carregar os processadores agora. Tente novamente em instantes.');
            }
        } finally {
            if (requestId === state.requestId) {
                state.loading = false;
                state.controller = null;
                updateMoreButton();
            }
        }
    }

    async function loadCatalog(reset) {
        if (reset) {
            cancelRequest();
            state.catalogItems = [];
            state.catalogOffset = 0;
            state.catalogHasMore = true;
            el.grid.innerHTML = '';
        } else if (state.loading) {
            return;
        }
        if (!state.catalogHasMore) return;

        const requestId = state.requestId;
        const controller = new AbortController();
        state.controller = controller;
        state.loading = true;
        setLoading('Carregando catálogo...');
        try {
            const payload = await fetchPage(PAGE_SIZE, state.catalogOffset, controller.signal);
            if (requestId !== state.requestId || state.tab !== 'cpus') return;
            const items = Array.isArray(payload.items) ? payload.items : [];
            const append = !reset && state.catalogOffset > 0;
            state.catalogItems.push(...items);
            state.catalogOffset += items.length;
            state.catalogHasMore = Boolean(payload.pagination && payload.pagination.has_more);
            render(items, append);
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            if (requestId === state.requestId && state.tab === 'cpus' && !state.catalogItems.length) {
                setError('Não foi possível carregar o catálogo agora. Tente novamente em instantes.');
            }
        } finally {
            if (requestId === state.requestId) {
                state.loading = false;
                state.controller = null;
                updateMoreButton();
            }
        }
    }

    function resetFilters() {
        state.brand = 'todos';
        state.socket = 'todos';
        state.video = 'todos';
        if (el.brand) el.brand.value = 'todos';
        if (el.socket) el.socket.value = 'todos';
        if (el.video) el.video.value = 'todos';
        if (el.classification) el.classification.value = 'todos';
        if (el.sort) el.sort.value = 'padrao';
    }

    function updateMoreButton() {
        el.moreButton.disabled = false;
        if (state.tab === 'home') {
            el.moreWrapper.style.display = 'block';
            el.moreButton.textContent = 'Ver catálogo de CPUs';
            return;
        }
        if (state.catalogHasMore) {
            el.moreWrapper.style.display = 'block';
            el.moreButton.textContent = 'Carregar mais CPUs';
        } else {
            el.moreWrapper.style.display = 'none';
        }
    }

    function applyTab(next) {
        const changed = state.tab !== next;
        if (changed) cancelRequest();
        state.tab = next;
        if (changed) resetFilters();

        if (next === 'cpus') {
            el.cpusTab.classList.add('active');
            el.homeTab.classList.remove('active');
            if (el.articles) el.articles.style.display = 'none';
            if (el.filters) el.filters.style.display = 'grid';
            if (el.title) el.title.textContent = 'Catálogo de processadores AMD e Intel';
            if (changed) {
                state.catalogItems = [];
                state.catalogOffset = 0;
                state.catalogHasMore = true;
            }
            if (state.catalogItems.length) {
                render(state.catalogItems, false);
                updateMoreButton();
            } else {
                loadCatalog(true);
            }
        } else {
            el.homeTab.classList.add('active');
            el.cpusTab.classList.remove('active');
            if (el.articles) el.articles.style.display = 'block';
            if (el.filters) el.filters.style.display = 'none';
            if (el.title) el.title.textContent = 'Processadores adicionados recentemente';
            loadHome();
        }
    }

    function fromHash() {
        applyTab(location.hash.replace('#', '') === 'cpus' ? 'cpus' : 'home');
    }

    el.homeTab.addEventListener('click', () => { location.hash = 'home'; });
    el.cpusTab.addEventListener('click', () => { location.hash = 'cpus'; });
    el.moreButton.addEventListener('click', () => {
        if (state.tab === 'home') location.hash = 'cpus';
        else loadCatalog(false);
    });

    if (el.brand) el.brand.addEventListener('change', event => {
        state.brand = event.target.value;
        loadCatalog(true);
    });
    if (el.socket) el.socket.addEventListener('change', event => {
        state.socket = event.target.value;
        loadCatalog(true);
    });
    if (el.video) el.video.addEventListener('change', event => {
        state.video = event.target.value;
        loadCatalog(true);
    });

    window.addEventListener('hashchange', fromHash);
    fromHash();
})();
