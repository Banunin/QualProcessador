import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE_URL = os.getenv("SEO_BASE_URL", "https://qualprocessador.vercel.app").rstrip("/")
DATASET_URL = BASE_URL + "/dados.json"
SCHEMA_URL = BASE_URL + "/schemas/processadores.schema.json"
CPU_API = BASE_URL + "/api/cpu/{slug}"
SEARCH_API = BASE_URL + "/api/search?q={query}"
COMPARISON_API = BASE_URL + "/api/comparison/{slug-a}-vs-{slug-b}"
CATALOG_API = BASE_URL + "/api/ai-cpus"


def dataset_meta():
    payload = json.loads((ROOT / "dados.json").read_text(encoding="utf-8"))
    return {
        "schema_version": payload.get("schema_version"),
        "dataset_version": payload.get("dataset_version"),
        "content_sha256": payload.get("content_sha256"),
        "last_modified": payload.get("last_modified"),
        "count": payload.get("count"),
        "field_provenance": payload.get("field_provenance"),
        "identity_semantics": payload.get("identity_semantics"),
        "relation_semantics": payload.get("relation_semantics"),
    }


def inserir_linhas_apos(text, marker, linhas):
    faltantes = [linha for linha in linhas if linha not in text]
    if not faltantes:
        return text
    bloco = "\n".join(faltantes) + "\n"
    if marker in text:
        return text.replace(marker, marker + bloco, 1)
    return text.rstrip() + "\n\n" + marker + bloco


def patch_llms():
    path = ROOT / "llms.txt"
    text = path.read_text(encoding="utf-8")
    linhas = [
        f"- [Base JSON pública de processadores]({DATASET_URL})",
        f"- [JSON Schema da base de processadores]({SCHEMA_URL})",
        f"- [Catálogo JSON de CPUs]({CATALOG_API})",
        f"- [API individual de CPU — substitua {{slug}}]({CPU_API})",
        f"- [Busca estruturada — substitua {{query}}]({SEARCH_API})",
        f"- [API de comparação — substitua os slugs]({COMPARISON_API})",
    ]
    text = inserir_linhas_apos(text, "## Recursos para agentes\n\n", linhas)

    secao = """
## Identidade e proveniência da base

- `dados.json` é a fonte canônica da base de processadores. `dados.js` existe somente como adaptador gerado para compatibilidade do frontend atual.
- `entity_id` é o identificador persistente da CPU e não depende do nome ou do slug.
- `slug` é persistido para manter URLs estáveis mesmo que um título editorial mude futuramente.
- `canonical_url` identifica a ficha pública correspondente à mesma entidade.
- Campos técnicos, benchmarks, conteúdo editorial e mídia possuem classes de proveniência distintas no próprio dataset.
- Relações entre CPUs ajudam descoberta por marca, soquete, família, geração e arquitetura; elas não significam equivalência de desempenho.
""".strip()
    if "## Identidade e proveniência da base" not in text:
        text = text.rstrip() + "\n\n" + secao + "\n"
    path.write_text(text, encoding="utf-8")


def patch_sitemap_markdown():
    path = ROOT / "sitemap.md"
    text = path.read_text(encoding="utf-8")
    linhas = [
        f"- [Base JSON pública de processadores]({DATASET_URL})",
        f"- [JSON Schema da base de processadores]({SCHEMA_URL})",
        f"- [API de catálogo de CPUs]({CATALOG_API})",
        f"- [Busca estruturada]({BASE_URL}/api/search?q=ryzen+5+5600)",
        f"- [Exemplo de API individual de CPU]({BASE_URL}/api/cpu/amd-ryzen-5-5600)",
        f"- [Exemplo de API de comparação]({BASE_URL}/api/comparison/amd-ryzen-5-5600-vs-intel-core-i5-12400f)",
    ]
    text = inserir_linhas_apos(text, "## Dados estruturados\n\n", linhas)
    path.write_text(text, encoding="utf-8")


def patch_ai_index():
    path = ROOT / "ai-index.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    meta = dataset_meta()
    payload["cpu_dataset"] = {
        "url": DATASET_URL,
        "schema": SCHEMA_URL,
        "format": "application/json",
        "canonical_source": True,
        "legacy_adapter": BASE_URL + "/dados.js",
        "structure": "self-describing object with processors array",
        **meta,
        "benchmark_semantics": {
            "notaJogos": "CPU-Z Benchmark 17 Single Thread",
            "notaTrabalho": "CPU-Z Benchmark 17 Multi Thread",
            "missing_value": "N/A"
        },
        "note": "Use dados.json ou as APIs para parsing determinístico. dados.js é gerado a partir do JSON apenas para compatibilidade do frontend."
    }
    payload["machine_apis"] = {
        "cpu_catalog": CATALOG_API,
        "cpu_individual_template": CPU_API,
        "search_template": SEARCH_API,
        "comparison_template": COMPARISON_API,
        "articles": BASE_URL + "/api/ai-articles",
        "images": BASE_URL + "/api/ai-images",
        "site": BASE_URL + "/api/ai-site",
    }
    discovery = payload.setdefault("discovery", {})
    discovery["cpu_dataset"] = DATASET_URL
    discovery["cpu_dataset_schema"] = SCHEMA_URL
    discovery["cpu_individual_api"] = CPU_API
    discovery["search_api"] = SEARCH_API
    discovery["comparison_api"] = COMPARISON_API
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    patch_llms()
    patch_sitemap_markdown()
    patch_ai_index()
    print("Dataset canônico, identidade, proveniência e APIs anunciados nos arquivos de descoberta.")


if __name__ == "__main__":
    main()
