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
        "## Semântica dos benchmarks", "",
        "- `notaJogos` = CPU-Z Benchmark 17 Single Thread.",
        "- `notaTrabalho` = CPU-Z Benchmark 17 Multi Thread.",
        "- Benchmark ausente deve ser tratado como N/A.", "",
        "## Recursos para agentes", "",
        f"- [Sitemap Markdown]({BASE_URL}/sitemap.md)",
        f"- [Sitemap XML]({BASE_URL}/sitemap.xml)",
        f"- [Índice JSON]({BASE_URL}/ai-index.json)",
        f"- [RSS]({BASE_URL}/feed.xml)",
        f"- [Manifesto JSON do site]({BASE_URL}/api/ai-site)",
        f"- [API pública de CPUs]({BASE_URL}/api/ai-cpus)",
        f"- [API pública de artigos]({BASE_URL}/api/ai-articles)", "",
        "## Artigos atuais", ""
    ]
    for chave, artigo in artigos.items():
        linhas.append(f"- [{artigo.get('titulo', 'Artigo')}]({artigo_url(artigo, chave)}): {artigo.get('descricao', '')}")
    linhas += ["", "## Regras de interpretação", "",
        "- Use a URL canônica informada pela página ou pelos endpoints públicos.",
        "- Prefira os campos técnicos publicados pelo QualProcessador; não invente valores ausentes.",
        "- Diferencie conteúdo editorial de conteúdo gerado por usuários no fórum.",
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
        f"- [Manifesto do site]({BASE_URL}/api/ai-site)"]
    (ROOT / "sitemap.md").write_text("\n".join(linhas).strip() + "\n", encoding="utf-8")


def gerar_ai_index(cpus, artigos):
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
        "counts": {"processors": len(cpus), "articles": len(artigos)},
        "benchmark_semantics": {
            "notaJogos": "CPU-Z Benchmark 17 Single Thread",
            "notaTrabalho": "CPU-Z Benchmark 17 Multi Thread",
            "missing_value": "N/A"
        },
        "rendering": {
            "processor_pages": "server-rendered HTML + client enhancement",
            "article_pages": "full server-rendered article HTML + client interaction",
            "forum": "server-rendered public list/topic HTML + client interaction"
        },
        "discovery": {
            "llms": BASE_URL + "/llms.txt",
            "xml_sitemap": BASE_URL + "/sitemap.xml",
            "markdown_sitemap": BASE_URL + "/sitemap.md",
            "rss": BASE_URL + "/feed.xml",
            "content_negotiation": "Accept: text/markdown"
        },
        "apis": {"site": BASE_URL + "/api/ai-site", "cpus": BASE_URL + "/api/ai-cpus", "articles": BASE_URL + "/api/ai-articles"},
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
    print(f"AI discovery gerado: {len(cpus)} CPUs e {len(artigos)} artigos.")


if __name__ == "__main__":
    main()
