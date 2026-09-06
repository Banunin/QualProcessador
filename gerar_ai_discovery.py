import json
import os
import re
import unicodedata
from html import unescape
from pathlib import Path
from xml.sax.saxutils import escape

BASE_URL = os.getenv("SEO_BASE_URL", "https://qualprocessador.vercel.app").rstrip("/")
ROOT = Path(__file__).resolve().parent
SITE_DESCRIPTION = (
    "Portal brasileiro de hardware com banco de dados técnico, benchmarks, comparações, "
    "artigos, análises, ferramentas e fórum da comunidade. A primeira grande base estruturada "
    "do projeto é o catálogo de processadores AMD e Intel."
)


def normalizar(texto):
    texto = unicodedata.normalize("NFD", str(texto or "").lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", texto).strip("-")


def carregar_cpus():
    bruto = (ROOT / "dados.js").read_text(encoding="utf-8")
    inicio = bruto.find("[")
    fim = bruto.rfind("]")
    if inicio < 0 or fim <= inicio:
        raise RuntimeError("Não foi possível localizar listaDeCpus em dados.js")
    return json.loads(bruto[inicio : fim + 1])


def carregar_artigos():
    return json.loads((ROOT / "artigos.json").read_text(encoding="utf-8"))


def slug_cpu(cpu):
    marca = normalizar(cpu.get("marca") or cpu.get("fabricante") or "cpu")
    nome = normalizar(cpu.get("nome"))
    return nome if nome == marca or nome.startswith(marca + "-") else f"{marca}-{nome}"


def url_cpu(cpu):
    marca = normalizar(cpu.get("marca") or cpu.get("fabricante") or "cpu")
    return f"/cpu/{marca}/{slug_cpu(cpu)}"


def texto_plano(html):
    texto = str(html or "")
    texto = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", texto, flags=re.I)
    texto = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", texto, flags=re.I)
    texto = re.sub(r"<br\s*/?>", "\n", texto, flags=re.I)
    texto = re.sub(r"</(p|h[1-6]|li|div|section|article)>", "\n", texto, flags=re.I)
    texto = re.sub(r"<[^>]+>", " ", texto)
    texto = unescape(texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n\s*\n+", "\n\n", texto)
    return texto.strip()


def artigo_url(artigo, chave=None):
    return BASE_URL + (artigo.get("urlLimpa") or f"/artigo/{artigo.get('id', chave)}")


def url_absoluta(src):
    src = str(src or "").strip()
    if not src:
        return ""
    if re.match(r"^https?://", src, flags=re.I):
        return src
    if src.startswith("//"):
        return "https:" + src
    return BASE_URL + "/" + src.lstrip("/")


def atributo(tag, nome):
    m = re.search(rf'\s{re.escape(nome)}\s*=\s*(["\'])([\s\S]*?)\1', str(tag or ""), flags=re.I)
    return unescape(m.group(2)).strip() if m else ""


def extrair_imagens_artigo(artigo):
    titulo = artigo.get("titulo") or "Artigo do QualProcessador"
    html = str(artigo.get("texto") or "")
    itens = []
    vistos = set()

    if artigo.get("imagemCapa"):
        url = url_absoluta(artigo.get("imagemCapa"))
        itens.append({
            "image_url": url,
            "alt": artigo.get("imagemCapaAlt") or f"Imagem de capa do artigo {titulo}",
            "caption": artigo.get("imagemCapaLegenda") or "",
            "kind": "cover",
        })
        vistos.add(url)

    figuras = re.findall(r"<figure\b[^>]*>[\s\S]*?</figure>", html, flags=re.I)
    indice = 0
    for figura in figuras:
        img = re.search(r"<img\b[^>]*>", figura, flags=re.I)
        if not img:
            continue
        src = atributo(img.group(0), "src")
        if not src:
            continue
        url = url_absoluta(src)
        if url in vistos:
            continue
        vistos.add(url)
        indice += 1
        alt = atributo(img.group(0), "alt")
        cap = re.search(r"<figcaption\b[^>]*>([\s\S]*?)</figcaption>", figura, flags=re.I)
        caption = texto_plano(cap.group(1)) if cap else ""
        fig_open = re.search(r"<figure\b[^>]*>", figura, flags=re.I)
        kind = atributo(fig_open.group(0), "data-image-kind") if fig_open else ""
        itens.append({
            "image_url": url,
            "alt": alt or caption or f"Imagem {indice} relacionada a {titulo}",
            "caption": caption,
            "kind": kind or "article-image",
        })

    for img in re.findall(r"<img\b[^>]*>", html, flags=re.I):
        src = atributo(img, "src")
        if not src:
            continue
        url = url_absoluta(src)
        if url in vistos:
            continue
        vistos.add(url)
        indice += 1
        itens.append({
            "image_url": url,
            "alt": atributo(img, "alt") or f"Imagem {indice} relacionada a {titulo}",
            "caption": "",
            "kind": "article-image",
        })
    return itens


def gerar_catalogo_imagens(cpus, artigos):
    itens = []
    vistos = set()

    def add(item):
        chave = (item.get("page_url"), item.get("image_url"))
        if not item.get("image_url") or chave in vistos:
            return
        vistos.add(chave)
        itens.append(item)

    for cpu in cpus:
        page = BASE_URL + url_cpu(cpu)
        arquivos = []
        if cpu.get("foto"):
            arquivos.append(cpu.get("foto"))
        if isinstance(cpu.get("fotos"), list):
            arquivos.extend(cpu.get("fotos"))
        unicos = []
        for arquivo in arquivos:
            if arquivo and arquivo not in unicos:
                unicos.append(arquivo)
        for indice, arquivo in enumerate(unicos):
            add({
                "source_type": "technical-database",
                "entity_type": "processor",
                "entity_name": cpu.get("nome"),
                "page_url": page,
                "image_url": url_absoluta("/img/" + str(arquivo).lstrip("/")),
                "alt": f"Imagem de referência do processador {cpu.get('nome')}" if indice == 0 else f"Imagem adicional {indice + 1} do processador {cpu.get('nome')}",
                "caption": f"Imagem principal cadastrada para {cpu.get('nome')}." if indice == 0 else f"Imagem adicional cadastrada para {cpu.get('nome')}.",
                "kind": "product-reference",
            })

    for chave, artigo in artigos.items():
        page = artigo_url(artigo, chave)
        for imagem in extrair_imagens_artigo(artigo):
            add({
                "source_type": "editorial",
                "entity_type": "article",
                "entity_name": artigo.get("titulo"),
                "page_url": page,
                **imagem,
            })

    for item in [
        {
            "source_type": "tool",
            "entity_type": "software",
            "entity_name": "Upscendra Image Suite 1.0",
            "page_url": BASE_URL + "/upscendra",
            "image_url": BASE_URL + "/upscendra-interface.jpg",
            "alt": "Interface do Upscendra Image Suite 1.0 no Windows",
            "caption": "Captura da interface do Upscendra Image Suite 1.0.",
            "kind": "software-screenshot",
        },
        {
            "source_type": "tool",
            "entity_type": "software",
            "entity_name": "WinFormatKit 1.1",
            "page_url": BASE_URL + "/winformatkit",
            "image_url": BASE_URL + "/winformatkit-interface.jpg",
            "alt": "Interface do WinFormatKit 1.1 no Windows",
            "caption": "Captura da interface do WinFormatKit 1.1.",
            "kind": "software-screenshot",
        },
    ]:
        add(item)

    return itens


def gerar_image_index(cpus, artigos):
    itens = gerar_catalogo_imagens(cpus, artigos)
    payload = {
        "name": "QualProcessador image semantics index",
        "canonical_site": BASE_URL + "/",
        "language": "pt-BR",
        "description": "Índice textual das imagens relevantes publicadas no QualProcessador. As descrições vêm de metadados editoriais e contexto da página; não afirmam que o crawler inspecionou visualmente os pixels.",
        "guidance": {
            "alt": "Descrição alternativa do conteúdo ou papel informativo da imagem.",
            "caption": "Legenda editorial quando disponível.",
            "graphs": "Resultados relevantes de gráficos, benchmarks e tabelas visuais devem também aparecer como texto ou tabela HTML quando possível.",
        },
        "count": len(itens),
        "images": itens,
    }
    (ROOT / "image-index.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(itens)


def gerar_llms(cpus, artigos):
    linhas = [
        "# QualProcessador", "", f"> {SITE_DESCRIPTION}", "",
        "Idioma principal: pt-BR",
        f"URL canônica atual: {BASE_URL}/",
        f"Processadores catalogados: {len(cpus)}",
        f"Artigos catalogados: {len(artigos)}", "",
        "## Tipos de conteúdo", "",
        "- Banco de dados técnico: fichas, especificações e benchmarks de hardware; atualmente com forte cobertura de processadores.",
        "- Editorial: artigos, guias, reviews e análises produzidos pelo QualProcessador.",
        "- Comunidade: tópicos e respostas de usuários no fórum; esse conteúdo não representa necessariamente a posição editorial do site.",
        "- Ferramentas: comparadores e utilitários oferecidos pelo projeto.", "",
        "## Seções principais", "",
        f"- [Início]({BASE_URL}/)",
        f"- [Processadores]({BASE_URL}/#cpus)",
        f"- [Comparador]({BASE_URL}/comparar)",
        f"- [Artigos e análises]({BASE_URL}/analises)",
        f"- [Fórum]({BASE_URL}/forum)",
        f"- [Comunidade]({BASE_URL}/comunidade)",
        f"- [Ferramentas]({BASE_URL}/ferramentas)", "",
        "## Renderização e leitura por máquinas", "",
        "- Fichas de CPU são entregues com conteúdo HTML server-side e depois aprimoradas por JavaScript.",
        "- Artigos são entregues com o texto completo no HTML inicial; comentários e conta continuam sendo recursos client-side.",
        "- O fórum entrega listas e tópicos públicos em HTML server-side; interações continuam sendo aprimoradas pelo navegador.",
        "- Páginas públicas também aceitam `Accept: text/markdown` quando houver representação textual dedicada.", "",
        "## Semântica das imagens", "",
        "- Imagens informativas usam texto alternativo e, quando aplicável, legenda editorial.",
        "- Artigos expõem imagens como `ImageObject` no JSON-LD server-side.",
        "- Gráficos, benchmarks, diagramas e tabelas visuais devem manter os dados importantes também em texto/HTML quando possível.",
        "- O índice de imagens descreve o significado publicado pelo site; não é uma alegação de visão computacional do crawler.", "",
        "## Semântica dos benchmarks", "",
        "- `notaJogos` = CPU-Z Benchmark 17 Single Thread.",
        "- `notaTrabalho` = CPU-Z Benchmark 17 Multi Thread.",
        "- Benchmark ausente deve ser tratado como N/A.", "",
        "## Recursos para agentes", "",
        f"- [Sitemap Markdown]({BASE_URL}/sitemap.md)",
        f"- [Sitemap XML]({BASE_URL}/sitemap.xml)",
        f"- [Índice JSON]({BASE_URL}/ai-index.json)",
        f"- [Índice semântico de imagens]({BASE_URL}/image-index.json)",
        f"- [RSS]({BASE_URL}/feed.xml)",
        f"- [Manifesto JSON do site]({BASE_URL}/api/ai-site)",
        f"- [API pública de CPUs]({BASE_URL}/api/ai-cpus)",
        f"- [API pública de artigos]({BASE_URL}/api/ai-articles)",
        f"- [API pública de imagens]({BASE_URL}/api/ai-images)", "",
        "## Artigos atuais", ""
    ]
    for chave, artigo in artigos.items():
        linhas.append(f"- [{artigo.get('titulo', 'Artigo')}]({artigo_url(artigo, chave)}): {artigo.get('descricao', '')}")
    linhas += ["", "## Regras de interpretação", "",
        "- Use a URL canônica informada pela página ou pelos endpoints públicos.",
        "- Prefira os campos técnicos publicados pelo QualProcessador; não invente valores ausentes.",
        "- Diferencie conteúdo editorial de conteúdo gerado por usuários no fórum.",
        "- Para imagens, use alt/legenda/índice como semântica editorial; não invente detalhes visuais ausentes.",
        "- O portal pode ganhar novas categorias de hardware sem deixar de ser o mesmo projeto QualProcessador."]
    (ROOT / "llms.txt").write_text("\n".join(linhas).strip() + "\n", encoding="utf-8")


def gerar_sitemap_markdown(cpus, artigos):
    linhas = [
        "# Sitemap Markdown | QualProcessador", "",
        f"> Índice textual para leitores automáticos. Site canônico atual: {BASE_URL}/", "",
        "## Seções", "",
        f"- [Início]({BASE_URL}/)", f"- [Processadores]({BASE_URL}/#cpus)",
        f"- [Comparar processadores]({BASE_URL}/comparar)", f"- [Artigos e análises]({BASE_URL}/analises)",
        f"- [Fórum]({BASE_URL}/forum)", f"- [Comunidade]({BASE_URL}/comunidade)",
        f"- [Ferramentas]({BASE_URL}/ferramentas)", f"- [Apoiar]({BASE_URL}/apoiar)", "",
        "## Artigos", ""
    ]
    for chave, artigo in artigos.items():
        linhas.append(f"- [{artigo.get('titulo', 'Artigo')}]({artigo_url(artigo, chave)}) — {artigo.get('descricao', '')}")

    grupos = {}
    for cpu in cpus:
        marca = str(cpu.get("marca") or cpu.get("fabricante") or "Outros").upper()
        grupos.setdefault(marca, []).append(cpu)
    for marca in sorted(grupos):
        linhas += ["", f"## CPUs {marca}", ""]
        for cpu in sorted(grupos[marca], key=lambda item: normalizar(item.get("nome"))):
            linhas.append(f"- [{cpu.get('nome')}]({BASE_URL}{url_cpu(cpu)})")

    linhas += ["", "## Dados estruturados", "",
        f"- [API de CPUs]({BASE_URL}/api/ai-cpus)",
        f"- [API de artigos]({BASE_URL}/api/ai-articles)",
        f"- [API de imagens]({BASE_URL}/api/ai-images)",
        f"- [Índice de imagens]({BASE_URL}/image-index.json)",
        f"- [Manifesto do site]({BASE_URL}/api/ai-site)"]
    (ROOT / "sitemap.md").write_text("\n".join(linhas).strip() + "\n", encoding="utf-8")


def gerar_ai_index(cpus, artigos):
    image_count = len(gerar_catalogo_imagens(cpus, artigos))
    payload = {
        "name": "QualProcessador",
        "canonical_url": BASE_URL + "/",
        "language": "pt-BR",
        "description": SITE_DESCRIPTION,
        "identity": "Portal de hardware; o catálogo de processadores é a primeira grande base estruturada, não o limite temático do projeto.",
        "content_types": {
            "technical_database": "Dados técnicos e benchmarks de hardware",
            "editorial": "Artigos, guias, reviews e análises",
            "community": "Fórum com conteúdo gerado por usuários",
            "tools": "Comparadores e ferramentas"
        },
        "counts": {"processors": len(cpus), "articles": len(artigos), "semantic_images": image_count},
        "benchmark_semantics": {
            "notaJogos": "CPU-Z Benchmark 17 Single Thread",
            "notaTrabalho": "CPU-Z Benchmark 17 Multi Thread",
            "missing_value": "N/A"
        },
        "image_semantics": {
            "policy": "Informative images expose alt text, captions and structured metadata; important graph/table values should also exist in text/HTML.",
            "index": BASE_URL + "/image-index.json",
            "api": BASE_URL + "/api/ai-images"
        },
        "rendering": {
            "processor_pages": "server-rendered HTML + client enhancement",
            "article_pages": "full server-rendered article HTML + client interaction",
            "forum": "server-rendered public list/topic HTML + client interaction",
            "images": "publisher-supplied image semantics in HTML/JSON-LD + machine-readable image catalog"
        },
        "discovery": {
            "llms": BASE_URL + "/llms.txt",
            "xml_sitemap": BASE_URL + "/sitemap.xml",
            "markdown_sitemap": BASE_URL + "/sitemap.md",
            "image_index": BASE_URL + "/image-index.json",
            "rss": BASE_URL + "/feed.xml",
            "content_negotiation": "Accept: text/markdown"
        },
        "apis": {"site": BASE_URL + "/api/ai-site", "cpus": BASE_URL + "/api/ai-cpus", "articles": BASE_URL + "/api/ai-articles", "images": BASE_URL + "/api/ai-images"},
        "sections": {
            "home": BASE_URL + "/", "processors": BASE_URL + "/#cpus", "compare": BASE_URL + "/comparar",
            "articles": BASE_URL + "/analises", "forum": BASE_URL + "/forum", "community": BASE_URL + "/comunidade",
            "tools": BASE_URL + "/ferramentas", "support": BASE_URL + "/apoiar"
        },
        "articles": [
            {"id": str(artigo.get("id", chave)), "title": artigo.get("titulo", ""), "description": artigo.get("descricao", ""), "canonical_url": artigo_url(artigo, chave)}
            for chave, artigo in artigos.items()
        ]
    }
    (ROOT / "ai-index.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def gerar_feed(artigos):
    linhas = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0">', '  <channel>',
        '    <title>QualProcessador — Artigos e análises</title>',
        f'    <link>{escape(BASE_URL + "/analises")}</link>',
        f'    <description>{escape(SITE_DESCRIPTION)}</description>', '    <language>pt-BR</language>']
    for chave, artigo in artigos.items():
        url = artigo_url(artigo, chave)
        descricao = artigo.get("descricao") or texto_plano(artigo.get("texto"))[:500]
        linhas += ['    <item>', f'      <title>{escape(str(artigo.get("titulo", "Artigo")))}</title>',
            f'      <link>{escape(url)}</link>', f'      <guid isPermaLink="true">{escape(url)}</guid>',
            f'      <description>{escape(str(descricao))}</description>', '    </item>']
    linhas += ['  </channel>', '</rss>']
    (ROOT / "feed.xml").write_text("\n".join(linhas) + "\n", encoding="utf-8")


def main():
    cpus = carregar_cpus()
    artigos = carregar_artigos()
    gerar_llms(cpus, artigos)
    gerar_sitemap_markdown(cpus, artigos)
    gerar_ai_index(cpus, artigos)
    gerar_feed(artigos)
    image_count = gerar_image_index(cpus, artigos)
    print(f"AI discovery gerado: {len(cpus)} CPUs, {len(artigos)} artigos e {image_count} imagens semânticas.")


if __name__ == "__main__":
    main()
