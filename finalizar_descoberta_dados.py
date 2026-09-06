import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE_URL = os.getenv("SEO_BASE_URL", "https://qualprocessador.vercel.app").rstrip("/")
DATASET_URL = BASE_URL + "/dados.json"
SCHEMA_URL = BASE_URL + "/schemas/processadores.schema.json"


def patch_llms():
    path = ROOT / "llms.txt"
    text = path.read_text(encoding="utf-8")
    dataset_line = f"- [Base JSON pública de processadores]({DATASET_URL})"
    schema_line = f"- [JSON Schema da base de processadores]({SCHEMA_URL})"
    if dataset_line not in text:
        marker = "## Recursos para agentes\n\n"
        replacement = marker + dataset_line + "\n" + schema_line + "\n"
        text = text.replace(marker, replacement, 1)
    path.write_text(text, encoding="utf-8")


def patch_sitemap_markdown():
    path = ROOT / "sitemap.md"
    text = path.read_text(encoding="utf-8")
    dataset_line = f"- [Base JSON pública de processadores]({DATASET_URL})"
    schema_line = f"- [JSON Schema da base de processadores]({SCHEMA_URL})"
    if dataset_line not in text:
        marker = "## Dados estruturados\n\n"
        if marker in text:
            text = text.replace(marker, marker + dataset_line + "\n" + schema_line + "\n", 1)
        else:
            text = text.rstrip() + "\n\n## Dados estruturados\n\n" + dataset_line + "\n" + schema_line + "\n"
    path.write_text(text, encoding="utf-8")


def patch_ai_index():
    path = ROOT / "ai-index.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload["cpu_dataset"] = {
        "url": DATASET_URL,
        "schema": SCHEMA_URL,
        "format": "application/json",
        "structure": "self-describing object with processors array",
        "benchmark_semantics": {
            "notaJogos": "CPU-Z Benchmark 17 Single Thread",
            "notaTrabalho": "CPU-Z Benchmark 17 Multi Thread",
            "missing_value": "N/A"
        },
        "note": "Prefer this JSON resource or /api/ai-cpus for deterministic machine parsing instead of parsing the legacy JavaScript compatibility file."
    }
    discovery = payload.setdefault("discovery", {})
    discovery["cpu_dataset"] = DATASET_URL
    discovery["cpu_dataset_schema"] = SCHEMA_URL
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    patch_llms()
    patch_sitemap_markdown()
    patch_ai_index()
    print("Dataset JSON e schema anunciados nos arquivos de descoberta.")


if __name__ == "__main__":
    main()
