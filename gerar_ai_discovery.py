import json
import os
import re
import unicodedata
from html import unescape
from pathlib import Path
from xml.sax.saxutils import escape

BASE_URL = os.getenv("SEO_BASE_URL", "https://qualprocessador.com").rstrip("/")
ROOT = Path(__file__).resolve().parent
SITE_DESCRIPTION = (
    "Plataforma brasileira de hardware focada em fichas técnicas de processadores AMD e Intel, "
    "benchmarks CPU-Z, comparações, artigos e ferramentas."
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


def gerar_llms(cpus, artigos):
    linhas = [
        "# QualProcessador",
        "",
        f"> {SITE_DESCRIPTION}",
        "",
        "Idioma principal: pt-BR",
        f"URL canônica: {BASE_URL}/",
        f"Processadores catalogados: {len(cpus)}",
        f"Artigos catalogados: {len(artigos)}",
        "",
        "## Conteúdo principal",
        "",
        f"- [Início]({BASE_URL}/): visão geral, busca e processadores recentes.",
        f"- [Comparador]({BASE_URL}/comparar): comparação lado a lado de processadores.",
        f"- [Artigos]({BASE_URL}/analises): análises e guias de hardware.",
        f"- [Fórum]({BASE_URL}/forum): comunidade e discussões.",
        f"- [Comunidade]({BASE_URL}/comunidade): canais da comunidade.",
        f"- [Ferramentas]({BASE_URL}/ferramentas): ferramentas disponibilizadas pelo projeto.",
        "",
        "## Semântica dos benchmarks",
        "",
        "- `notaJogos` = CPU-Z Benchmark 17 Single Thread.",
        "- `notaTrabalho` = CPU-Z Benchmark 17 Multi Thread.",
        "- Benchmark ausente deve ser tratado como N/A.",
        "",
        "## Formatos para agentes",
        "",
        "As páginas públicas suportam negociação de conteúdo. Envie `Accept: text/markdown` para receber uma representação Markdown limpa da mesma URL.",
        "",
        f"- [Sitemap Markdown]({BASE_URL}/sitemap.md)",
        f"- [Sitemap XML]({BASE_URL}/sitemap.xml)",
        f"- [Índice JSON]({BASE_URL}/ai-index.json)",
        f"- [RSS]({BASE_URL}/feed.xml)",
        f"- [Manifesto JSON do site]({BASE_URL}/api/ai-site)",
        f"- [API pública de CPUs]({BASE_URL}/api/ai-cpus)",
        f"- [API pública de artigos]({BASE_URL}/api/ai-articles)",
        "",
        "## Artigos atuais",
        "",
    ]
    for artigo in artigos.values():
        url = BASE_URL + (artigo.get("urlLimpa") or f"/artigo/{artigo.get('id')}")
        linhas.append(f"- [{artigo.get('titulo', 'Artigo')}]({url}): {artigo.get('descricao', '')}")
    linhas.extend([
        "",
        "## Observações para sistemas automáticos",
        "",
        "- Use a URL canônica informada pela página ou pelos endpoints públicos.",
        "- Prefira os dados estruturados do QualProcessador para campos técnicos; não infira valores ausentes.",
        "- O fórum possui conteúdo de usuários e pode depender de carregamento dinâmico.",
    ])
    (ROOT / "llms.txt").write_text("\n".join(linhas).strip() + "\n", encoding="utf-8")


def gerar_sitemap_markdown(cpus, artigos):
    linhas = [
        "# Sitemap Markdown | QualProcessador",
        "",
        f"> Índice textual para agentes e leitores automáticos. Site canônico: {BASE_URL}/",
        "",
        "## Seções",
        "",
        f"- [Início]({BASE_URL}/)",
        f"- [Comparar processadores]({BASE_URL}/comparar)",
        f"- [Artigos e análises]({BASE_URL}/analises)",
        f"- [Fórum]({BASE_URL}/forum)",
        f"- [Comunidade]({BASE_URL}/comunidade)",
        f"- [Ferramentas]({BASE_URL}/ferramentas)",
        f"- [Apoiar]({BASE_URL}/apoiar)",
        "",
        "## Artigos",
        "",
    ]
    for artigo in artigos.values():
        url = BASE_URL + (artigo.get("urlLimpa") or f"/artigo/{artigo.get('id')}")
        linhas.append(f"- [{artigo.get('titulo', 'Artigo')}]({url}) — {artigo.get('descricao', '')}")

    grupos = {}
    for cpu in cpus:
        marca = str(cpu.get("marca") or cpu.get("fabricante") or "Outros").upper()
        grupos.setdefault(marca, []).append(cpu)

    for marca in sorted(grupos):
        linhas.extend(["", f"## CPUs {marca}", ""])
        for cpu in sorted(grupos[marca], key=lambda item: normalizar(item.get("nome"))):
            linhas.append(f"- [{cpu.get('nome')}]({BASE_URL}{url_cpu(cpu)})")

    linhas.extend([
        "",
        "## Dados estruturados",
        "",
        f"- [API de CPUs]({BASE_URL}/api/ai-cpus)",
        f"- [API de artigos]({BASE_URL}/api/ai-articles)",
        f"- [Manifesto do site]({BASE_URL}/api/ai-site)",
    ])
    (ROOT / "sitemap.md").write_text("\n".join(linhas).strip() + "\n", encoding="utf-8")


def gerar_ai_index(cpus, artigos):
    payload = {
        "name": "QualProcessador",
        "canonical_url": BASE_URL + "/",
        "language": "pt-BR",
        "description": SITE_DESCRIPTION,
        "counts": {"processors": len(cpus), "articles": len(artigos)},
        "benchmark_semantics": {
            "notaJogos": "CPU-Z Benchmark 17 Single Thread",
            "notaTrabalho": "CPU-Z Benchmark 17 Multi Thread",
            "missing_value": "N/A",
        },
        "discovery": {
            "llms": BASE_URL + "/llms.txt",
            "xml_sitemap": BASE_URL + "/sitemap.xml",
            "markdown_sitemap": BASE_URL + "/sitemap.md",
            "rss": BASE_URL + "/feed.xml",
            "content_negotiation": "Accept: text/markdown",
        },
        "apis": {
            "site": BASE_URL + "/api/ai-site",
            "cpus": BASE_URL + "/api/ai-cpus",
            "articles": BASE_URL + "/api/ai-articles",
        },
        "sections": {
            "home": BASE_URL + "/",
            "compare": BASE_URL + "/comparar",
            "articles": BASE_URL + "/analises",
            "forum": BASE_URL + "/forum",
            "community": BASE_URL + "/comunidade",
            "tools": BASE_URL + "/ferramentas",
            "support": BASE_URL + "/apoiar",
        },
        "articles": [
            {
                "id": str(artigo.get("id", chave)),
                "title": artigo.get("titulo", ""),
                "description": artigo.get("descricao", ""),
                "canonical_url": BASE_URL + (artigo.get("urlLimpa") or f"/artigo/{artigo.get('id', chave)}"),
            }
            for chave, artigo in artigos.items()
        ],
    }
    (ROOT / "ai-index.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def gerar_feed(artigos):
    linhas = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '  <channel>',
        '    <title>QualProcessador — Artigos e análises</title>',
        f'    <link>{escape(BASE_URL + "/analises")}</link>',
        f'    <description>{escape(SITE_DESCRIPTION)}</description>',
        '    <language>pt-BR</language>',
    ]
    for chave, artigo in artigos.items():
        url = BASE_URL + (artigo.get("urlLimpa") or f"/artigo/{artigo.get('id', chave)}")
        linhas.extend([
            '    <item>',
            f'      <title>{escape(str(artigo.get("titulo", "Artigo")))}</title>',
            f'      <link>{escape(url)}</link>',
            f'      <guid isPermaLink="true">{escape(url)}</guid>',
            f'      <description>{escape(str(artigo.get("descricao") or texto_plano(artigo.get("texto"))[:500]))}</description>',
            '    </item>',
        ])
    linhas.extend(['  </channel>', '</rss>'])
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
