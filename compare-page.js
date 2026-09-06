(function(){
    'use strict';

    const BASE='https://qualprocessador.vercel.app';
    const SEARCH_DELAY=180;
    const $=id=>document.getElementById(id);
    const status=$('picker-status');
    const inputA=$('cpu-a');
    const inputB=$('cpu-b');
    const btn=$('btn-comparar');
    const cache=new Map();

    if(!status||!inputA||!inputB||!btn)return;

    function normalize(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
    function esc(texto){return String(texto==null?'':texto).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
    function valor(v){return v===undefined||v===null||String(v).trim()===''?'—':String(v)}
    function pontos(v){if(v===undefined||v===null||String(v).trim()===''||String(v).toUpperCase()==='N/A')return 'N/A';const n=Number.parseInt(v,10);return Number.isFinite(n)&&n>=100?n.toLocaleString('pt-BR')+' pts':'N/A'}
    function pathOf(url){try{const parsed=new URL(url,location.origin);return parsed.pathname+parsed.search+parsed.hash}catch(_){return String(url||'')}}
    function cpuPath(cpu){return pathOf(cpu.canonical_url||cpu.url||'#')}
    function absoluteCpuUrl(cpu){try{return new URL(cpu.canonical_url||cpu.url||cpuPath(cpu),BASE).href}catch(_){return BASE+cpuPath(cpu)}}
    function showStatus(text){status.textContent=text;status.classList.toggle('show',Boolean(text))}
    function meta(name,content,property){let el=document.querySelector(property?`meta[property="${name}"]`:`meta[name="${name}"]`);if(!el){el=document.createElement('meta');property?el.setAttribute('property',name):el.setAttribute('name',name);document.head.appendChild(el)}el.content=content}
    function canonical(url){let el=document.querySelector('link[rel="canonical"]');if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el)}el.href=url}
    function jsonLd(a,b,url){
        document.getElementById('comparison-jsonld')?.remove();
        document.getElementById('qp-ssr-comparison-jsonld')?.remove();
        const description=`Compare ${a.nome} e ${b.nome}: especificações, plataforma e resultados CPU-Z Single Thread e Multi Thread.`;
        const cpuAUrl=absoluteCpuUrl(a);
        const cpuBUrl=absoluteCpuUrl(b);
        const apiSlug=a.slug&&b.slug?`${a.slug}-vs-${b.slug}`:'';
        const graph={
            '@context':'https://schema.org',
            '@graph':[
                {
                    '@type':'WebPage',
                    '@id':url+'#webpage',
                    name:`${a.nome} vs ${b.nome}`,
                    description,
                    url,
                    inLanguage:'pt-BR',
                    isPartOf:{'@type':'WebSite','@id':BASE+'/#website',name:'QualProcessador',url:BASE+'/'},
                    about:[
                        {'@type':'Product','@id':cpuAUrl+'#processor',name:a.nome,identifier:a.entity_id||String(a.id||''),url:cpuAUrl},
                        {'@type':'Product','@id':cpuBUrl+'#processor',name:b.nome,identifier:b.entity_id||String(b.id||''),url:cpuBUrl}
                    ],
                    subjectOf:apiSlug?{'@type':'WebAPI',name:'API estruturada desta comparação',url:`${BASE}/api/comparison/${apiSlug}`} : undefined,
                    isBasedOn:{'@type':'Dataset','@id':BASE+'/dados.json#dataset',url:BASE+'/dados.json'}
                },
                {
                    '@type':'BreadcrumbList',
                    itemListElement:[
                        {'@type':'ListItem',position:1,name:'QualProcessador',item:BASE+'/'},
                        {'@type':'ListItem',position:2,name:'Comparar processadores',item:BASE+'/comparar'},
                        {'@type':'ListItem',position:3,name:`${a.nome} vs ${b.nome}`,item:url}
                    ]
                }
            ]
        };
        const script=document.createElement('script');
        script.type='application/ld+json';
        script.id='comparison-jsonld';
        script.textContent=JSON.stringify(graph);
        document.head.appendChild(script);
    }

    async function searchCpu(query,limit,signal){
        const params=new URLSearchParams({q:query,type:'cpu',limit:String(limit||8)});
        const response=await fetch(`/api/search?${params.toString()}`,{signal,headers:{Accept:'application/json'},credentials:'same-origin'});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const payload=await response.json();
        return Array.isArray(payload.items)?payload.items:[];
    }

    function setupAutocomplete(input,datalist){
        let timer=null;
        let controller=null;
        input.addEventListener('input',()=>{
            clearTimeout(timer);
            if(controller)controller.abort();
            const query=input.value.trim();
            if(!query){datalist.replaceChildren();return}
            timer=setTimeout(async()=>{
                controller=new AbortController();
                try{
                    const items=await searchCpu(query,8,controller.signal);
                    const fragment=document.createDocumentFragment();
                    items.forEach(item=>{
                        cache.set(normalize(item.title),item);
                        const option=document.createElement('option');
                        option.value=item.title;
                        option.label=item.hints&&item.hints.socket?String(item.hints.socket).toUpperCase():'Ficha técnica';
                        fragment.appendChild(option);
                    });
                    datalist.replaceChildren(fragment);
                }catch(error){if(!error||error.name!=='AbortError')datalist.replaceChildren()}
            },SEARCH_DELAY);
        });
    }

    async function resolveInput(value){
        const text=String(value||'').trim();
        if(!text)return null;
        const cached=cache.get(normalize(text));
        if(cached)return cached;
        const items=await searchCpu(text,5);
        items.forEach(item=>cache.set(normalize(item.title),item));
        const exact=items.find(item=>normalize(item.title)===normalize(text));
        return exact||items[0]||null;
    }

    async function fetchComparisonKey(key){
        const response=await fetch(`/api/comparison/${encodeURIComponent(String(key||''))}?format=json`,{headers:{Accept:'application/json'},credentials:'same-origin'});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const payload=await response.json();
        if(!payload||!payload.comparison)throw new Error('comparison_missing');
        return payload.comparison;
    }

    function cabeca(cpu){return `<article class="cpu-head ${esc(String(cpu.marca||cpu.fabricante||'').toLowerCase())}"><span class="brand">${esc(String(cpu.marca||cpu.fabricante||'').toUpperCase())}</span><h3>${esc(cpu.nome)}</h3><div>${esc(valor(cpu.cores))} núcleos • ${esc(valor(cpu.threads))} threads • ${esc(valor(cpu.soquete))}</div><a href="${esc(cpuPath(cpu))}">Abrir ficha técnica →</a></article>`}
    function scoreCard(titulo,a,b,campo){return `<article class="score-card"><h3>${esc(titulo)}</h3><div class="score-row"><span>${esc(a.nome)}</span><strong>${esc(pontos(a[campo]))}</strong></div><div class="score-row"><span>${esc(b.nome)}</span><strong>${esc(pontos(b[campo]))}</strong></div></article>`}

    function renderComparison(comparison,historyMode){
        if(!comparison)return;
        const a=comparison.processor_a;
        const b=comparison.processor_b;
        if(!a||!b||String(a.id)===String(b.id))return;
        const path=pathOf(comparison.canonical_url);
        const url=BASE+path;

        inputA.value=a.nome;
        inputB.value=b.nome;
        showStatus('');
        $('comparison').classList.add('active');
        $('empty-intro').style.display='none';
        $('hero-title').textContent=`${a.nome} vs ${b.nome}`;
        $('hero-desc').textContent='Especificações e resultados CPU-Z lado a lado.';
        $('breadcrumb').innerHTML=`<a href="/">Home</a> › <a href="/comparar">Comparar</a> › ${esc(a.nome)} vs ${esc(b.nome)}`;
        $('comparison-heading').textContent=`${a.nome} vs ${b.nome}`;
        $('comparison-lead').textContent=`Compare os dados técnicos de ${a.nome} e ${b.nome}.`;
        $('cpu-heads').innerHTML=cabeca(a)+cabeca(b);
        $('score-grid').innerHTML=scoreCard('CPU-Z Single Thread',a,b,'notaJogos')+scoreCard('CPU-Z Multi Thread',a,b,'notaTrabalho');
        $('spec-head').innerHTML=`<tr><th>Especificação</th><th>${esc(a.nome)}</th><th>${esc(b.nome)}</th></tr>`;

        const linhas=[
            ['Núcleos','cores'],['Threads','threads'],['Clock base','freqBase'],['Clock boost','freqBoost'],
            ['TDP','tdp'],['Soquete','soquete'],['Arquitetura','arquitetura'],['Codinome','codinome'],
            ['Litografia','litografia'],['Cache L1','cacheL1'],['Cache L2','cacheL2'],['Cache L3','cacheL3'],
            ['Memória','memoria'],['Frequência máx. da memória','freqMaxMemoria'],['Canais de memória','canaisMemoria'],
            ['Versão PCI Express','pcie'],['Linhas PCIe da CPU','pcieLanes'],['Configurações PCIe','pcieConfig'],['Vídeo integrado','video'],['Frequência iGPU','igpuFreq'],['Temperatura máxima','tempMax'],
            ['Lançamento','lancamento'],['Segmento','segmento']
        ];
        $('spec-body').innerHTML=linhas.map(([rotulo,campo])=>`<tr><td>${esc(rotulo)}</td><td>${esc(valor(a[campo]))}</td><td>${esc(valor(b[campo]))}</td></tr>`).join('');

        $('summary-card').innerHTML=`<h2>Resumo</h2><p><strong>${esc(a.nome)}</strong> tem ${esc(valor(a.cores))} núcleos e ${esc(valor(a.threads))} threads; <strong>${esc(b.nome)}</strong> tem ${esc(valor(b.cores))} núcleos e ${esc(valor(b.threads))} threads.</p><p>No CPU-Z: <strong>${esc(pontos(a.notaJogos))}</strong> contra <strong>${esc(pontos(b.notaJogos))}</strong> em Single Thread e <strong>${esc(pontos(a.notaTrabalho))}</strong> contra <strong>${esc(pontos(b.notaTrabalho))}</strong> em Multi Thread. São resultados sintéticos e não representam FPS diretamente.</p>`;

        const related=Array.isArray(comparison.related_comparisons)?comparison.related_comparisons:[];
        $('related-grid').innerHTML=related.map(item=>`<a href="${esc(item.url)}">${esc(item.title)}</a>`).join('');

        document.title=`${a.nome} vs ${b.nome}: comparação de processadores | QualProcessador`;
        const desc=`Compare ${a.nome} vs ${b.nome}: núcleos, threads, clocks, TDP, soquete, linhas PCIe e resultados CPU-Z.`;
        meta('description',desc,false);
        meta('og:title',`${a.nome} vs ${b.nome} | QualProcessador`,true);
        meta('og:description',desc,true);
        meta('og:url',url,true);
        canonical(url);
        jsonLd(a,b,url);

        if(historyMode==='push'&&location.pathname!==path)history.pushState({comparacao:path},'',path);
        else if(historyMode==='replace'&&(location.pathname!==path||location.search))history.replaceState({comparacao:path},'',path);
    }

    function clearComparison(){
        $('comparison').classList.remove('active');
        $('empty-intro').style.display='block';
        $('hero-title').textContent='Comparar Processadores';
        $('hero-desc').textContent='Escolha dois processadores. A página mostra especificações, plataforma e resultados CPU-Z lado a lado.';
        document.title='Comparar Processadores AMD e Intel | QualProcessador';
        canonical(BASE+'/comparar');
        document.getElementById('comparison-jsonld')?.remove();
        document.getElementById('qp-ssr-comparison-jsonld')?.remove();
        showStatus('');
    }

    function keyFromLocation(){
        const params=new URLSearchParams(location.search);
        const query=params.get('comparacao');
        if(query)return query;
        const parts=location.pathname.split('/').filter(Boolean);
        return parts[0]==='comparar'&&parts.length>1?parts.slice(1).join('/'):'';
    }

    async function loadKey(key,historyMode){
        if(!key){clearComparison();return false}
        try{
            const comparison=await fetchComparisonKey(key);
            renderComparison(comparison,historyMode);
            return true;
        }catch(_){showStatus('Não foi possível carregar esta comparação agora.');return false}
    }

    setupAutocomplete(inputA,$('lista-cpus-a'));
    setupAutocomplete(inputB,$('lista-cpus-b'));

    btn.addEventListener('click',async()=>{
        btn.disabled=true;
        showStatus('Localizando os processadores...');
        try{
            const [a,b]=await Promise.all([resolveInput(inputA.value),resolveInput(inputB.value)]);
            if(!a||!b){showStatus('Não encontrei um dos processadores. Tente digitar apenas o modelo ou escolha uma sugestão.');return}
            if(a.entity_id&&b.entity_id&&a.entity_id===b.entity_id){showStatus('Escolha dois processadores diferentes.');return}
            if(!a.slug||!b.slug){showStatus('Não foi possível resolver um dos processadores.');return}
            const comparison=await fetchComparisonKey(`${a.slug}-vs-${b.slug}`);
            renderComparison(comparison,'push');
            $('comparison').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
        }catch(_){showStatus('A comparação está temporariamente indisponível. Tente novamente.')}
        finally{btn.disabled=false}
    });

    [inputA,inputB].forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();btn.click()}}));

    $('related-grid').addEventListener('click',async event=>{
        const link=event.target.closest('a[href^="/comparar/"]');
        if(!link)return;
        event.preventDefault();
        const key=link.getAttribute('href').replace(/^\/comparar\//,'');
        const loaded=await loadKey(key,'push');
        if(loaded)window.scrollTo({top:document.querySelector('.compare-picker').offsetTop-80,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    });

    window.addEventListener('popstate',()=>loadKey(keyFromLocation(),null));

    const initialKey=keyFromLocation();
    if(initialKey)loadKey(initialKey,'replace');
})();
