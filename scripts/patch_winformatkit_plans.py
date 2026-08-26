from pathlib import Path

path = Path('WinFormatKit.html')
s = path.read_text(encoding='utf-8')

if 'id="planos-winformatkit"' in s:
    raise SystemExit(0)

s = s.replace('<a href="ferramentas.html" class="nav-link active">Ferramentas</a>', '<a href="ferramentas.html" class="nav-link active">Ferramentas</a>\n    <a href="apoiar.html" class="nav-link">Apoiar</a>')

css = '''
.pricing-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.pricing-card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:26px}
.pricing-card.featured{border-color:#7dd3fc;box-shadow:0 0 0 2px var(--blue-soft)}
.pricing-card h3{margin-bottom:4px;font-size:22px}
.price{display:block;margin:8px 0 10px;font-size:30px;font-weight:800;color:var(--navy)}
.price small{font-size:12px;font-weight:600;color:var(--muted)}
.pricing-card p{color:var(--muted-strong);font-size:14px}
.pricing-card .feature-list{flex:1}
@media(max-width:900px){.pricing-grid{grid-template-columns:1fr}}
'''
s = s.replace('</style>', css + '\n</style>', 1)

section = '''
  <section class="section" id="planos-winformatkit">
    <div class="wrap">
      <div class="section-head">
        <span class="section-label">Versões</span>
        <h2>Grátis, Plus ou Pro</h2>
        <p>Comece pela versão gratuita e, se precisar de mais conversões, idiomas e personalização, escolha uma das edições avançadas.</p>
      </div>
      <div class="pricing-grid">
        <article class="pricing-card">
          <h3>Grátis</h3>
          <span class="price">R$ 0</span>
          <p>A base do WinFormatKit continua gratuita e completa para as conversões mais comuns.</p>
          <ul class="feature-list">
            <li>Português e Inglês</li>
            <li>Conversões essenciais de imagem, vídeo, áudio e PDF</li>
            <li>Conversão em lote</li>
            <li>Processamento local</li>
          </ul>
          <a class="btn btn-secondary btn-block" href="#download">Baixar grátis</a>
        </article>
        <article class="pricing-card featured">
          <h3>Plus</h3>
          <span class="price">R$ 15,99 <small>pagamento único</small></span>
          <p>Quase toda a experiência avançada do Pro por um valor menor.</p>
          <ul class="feature-list">
            <li>Mais formatos e rotas de conversão</li>
            <li>Mais idiomas</li>
            <li>Biblioteca ampliada de temas e modelos de interface</li>
            <li>Ferramentas avançadas de produtividade</li>
          </ul>
          <a class="btn btn-primary btn-block" href="apoiar.html#winformatkit-planos">Comprar Plus</a>
        </article>
        <article class="pricing-card">
          <h3>Pro</h3>
          <span class="price">R$ 30,99 <small>pagamento único</small></span>
          <p>A edição mais completa do WinFormatKit, feita para quem quer o maior catálogo possível.</p>
          <ul class="feature-list">
            <li>Tudo do Plus</li>
            <li>Maior catálogo de conversões e formatos</li>
            <li>Pacote completo de temas, modelos e idiomas</li>
            <li>Recursos premium e novas funções avançadas</li>
          </ul>
          <a class="btn btn-primary btn-block" href="apoiar.html#winformatkit-planos">Comprar Pro</a>
        </article>
      </div>
    </div>
  </section>
'''

anchor = '  <section class="section section-soft" id="download">'
s = s.replace(anchor, section + '\n' + anchor, 1)
s = s.replace('<a href="#privacidade">Privacidade</a>', '<a href="#privacidade">Privacidade</a><a href="apoiar.html">Apoiar</a>')
path.write_text(s, encoding='utf-8')
