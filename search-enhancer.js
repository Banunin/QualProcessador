(function () {
    'use strict';

    const DEBOUNCE_MS = 180;
    let activeController = null;

    function comparisonParts(text) {
        const match = String(text || '').trim().match(/^(.+?)\s+(?:vs\.?|versus|x)\s+(.+)$/i);
        return match ? [match[1].trim(), match[2].trim()] : null;
    }

    function pathFromUrl(value) {
        try {
            const url = new URL(value, window.location.origin);
            return url.pathname + url.search + url.hash;
        } catch (_) {
            return String(value || '#');
        }
    }

    async function searchCpu(query, limit, signal) {
        const params = new URLSearchParams({ q: query, type: 'cpu', limit: String(limit || 8) });
        const response = await fetch(`/api/search?${params.toString()}`, {
            signal,
            headers: { Accept: 'application/json' },
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        return Array.isArray(payload.items) ? payload.items : [];
    }

    function createItem(title, subtitle, destination, highlight) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.setAttribute('role', 'option');
        item.tabIndex = 0;

        const left = document.createElement('span');
        left.textContent = title;
        if (highlight) left.style.color = '#0284c7';

        const right = document.createElement('small');
        right.textContent = subtitle || '';
        right.style.cssText = 'font-size:0.72rem;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-left:12px;text-align:right;';

        item.appendChild(left);
        item.appendChild(right);
        item.addEventListener('click', () => { window.location.href = destination; });
        item.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.location.href = destination;
            }
        });
        return item;
    }

    function init() {
        const input = document.getElementById('campo-busca');
        const box = document.getElementById('caixa-sugestoes');
        if (!input || !box || input.dataset.qpBuscaAvancada === '1') return;
        input.dataset.qpBuscaAvancada = '1';
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', 'caixa-sugestoes');
        box.setAttribute('role', 'listbox');

        let firstDestination = '';
        let timer = null;
        let requestSerial = 0;

        function hide() {
            box.style.display = 'none';
            box.innerHTML = '';
            firstDestination = '';
        }

        async function render() {
            const term = input.value.trim();
            const serial = ++requestSerial;
            if (!term) {
                if (activeController) activeController.abort();
                hide();
                return;
            }

            if (activeController) activeController.abort();
            activeController = new AbortController();
            const signal = activeController.signal;
            box.innerHTML = '';
            firstDestination = '';

            try {
                const parts = comparisonParts(term);
                if (parts) {
                    const [leftResults, rightResults] = await Promise.all([
                        searchCpu(parts[0], 1, signal),
                        searchCpu(parts[1], 1, signal)
                    ]);
                    if (serial !== requestSerial) return;
                    const a = leftResults[0];
                    const b = rightResults[0];
                    if (a && b && a.entity_id !== b.entity_id && a.slug && b.slug) {
                        const destination = `/comparar/${encodeURIComponent(a.slug)}-vs-${encodeURIComponent(b.slug)}`;
                        firstDestination = destination;
                        box.appendChild(createItem(`Comparar ${a.title} vs ${b.title}`, 'Comparação', destination, true));
                    }
                }

                const results = await searchCpu(term, 8, signal);
                if (serial !== requestSerial) return;
                results.forEach(item => {
                    const destination = pathFromUrl(item.canonical_url);
                    if (!firstDestination) firstDestination = destination;
                    const subtitle = item.hints && item.hints.socket ? String(item.hints.socket).toUpperCase() : 'Ficha técnica';
                    box.appendChild(createItem(item.title, subtitle, destination, false));
                });

                if (!box.children.length) {
                    const empty = document.createElement('div');
                    empty.className = 'suggestion-item';
                    empty.style.cursor = 'default';
                    empty.textContent = 'Nenhum processador encontrado. Tente apenas o modelo, por exemplo: 5600, 12400F ou E5 2680.';
                    box.appendChild(empty);
                }
                box.style.display = 'block';
            } catch (error) {
                if (error && error.name === 'AbortError') return;
                if (serial !== requestSerial) return;
                const failed = document.createElement('div');
                failed.className = 'suggestion-item';
                failed.style.cursor = 'default';
                failed.textContent = 'A busca está temporariamente indisponível.';
                box.replaceChildren(failed);
                box.style.display = 'block';
            }
        }

        function schedule() {
            clearTimeout(timer);
            if (!input.value.trim()) {
                hide();
                return;
            }
            timer = setTimeout(render, DEBOUNCE_MS);
        }

        input.addEventListener('input', schedule);
        input.addEventListener('focus', () => {
            if (input.value.trim()) schedule();
        });
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter' && firstDestination) {
                event.preventDefault();
                window.location.href = firstDestination;
            } else if (event.key === 'Escape') {
                if (activeController) activeController.abort();
                hide();
            }
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('.search-wrapper')) hide();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
