import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LEGACY = ROOT / "dados.js"
TARGET = ROOT / "dados.json"


def carregar_legacy():
    bruto = LEGACY.read_text(encoding="utf-8")
    inicio = bruto.find("[")
    fim = bruto.rfind("]")
    if inicio < 0 or fim <= inicio:
        raise RuntimeError("Não foi possível localizar a lista de CPUs em dados.js")
    return json.loads(bruto[inicio : fim + 1])


def carregar_json_existente():
    if not TARGET.exists():
        return None
    payload = json.loads(TARGET.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("processors"), list):
        return payload["processors"]
    raise RuntimeError("dados.json existe, mas não segue o formato esperado")


def validar(cpus):
    if not isinstance(cpus, list) or not cpus:
        raise RuntimeError("Base de CPUs vazia ou inválida")
    ids = set()
    nomes = set()
    for indice, cpu in enumerate(cpus):
        if not isinstance(cpu, dict):
            raise RuntimeError(f"CPU na posição {indice} não é um objeto JSON")
        if "id" not in cpu or not str(cpu.get("nome") or "").strip():
            raise RuntimeError(f"CPU na posição {indice} não possui id/nome")
        if cpu["id"] in ids:
            raise RuntimeError(f"ID duplicado: {cpu['id']}")
        nome = str(cpu["nome"]).strip().casefold()
        if nome in nomes:
            raise RuntimeError(f"Nome duplicado: {cpu['nome']}")
        ids.add(cpu["id"])
        nomes.add(nome)


def montar_payload(cpus):
    return {
        "$schema": "https://qualprocessador.vercel.app/schemas/processadores.schema.json",
        "schema_version": "1.0",
        "dataset": "QualProcessador CPU Database",
        "language": "pt-BR",
        "publisher": "QualProcessador",
        "canonical_url": "https://qualprocessador.vercel.app/dados.json",
        "description": "Base pública estruturada de processadores cadastrados no QualProcessador, com fichas técnicas e resultados CPU-Z quando disponíveis.",
        "benchmark_semantics": {
            "notaJogos": "CPU-Z Benchmark 17 Single Thread",
            "notaTrabalho": "CPU-Z Benchmark 17 Multi Thread",
            "missing_value": "N/A"
        },
        "interpretation_rules": [
            "Não interpretar notaJogos como FPS; o campo representa CPU-Z Benchmark 17 Single Thread.",
            "Não interpretar notaTrabalho como desempenho profissional genérico; o campo representa CPU-Z Benchmark 17 Multi Thread.",
            "Campos ausentes, vazios ou N/A não devem ser inferidos.",
            "Os nomes e especificações devem ser associados ao processador exato cadastrado."
        ],
        "count": len(cpus),
        "processors": cpus
    }


def main():
    # Na primeira migração, dados.js é a fonte existente. Depois disso, dados.json
    # pode ser regenerado sem perder o formato autoexplicativo.
    cpus = carregar_legacy() if LEGACY.exists() else carregar_json_existente()
    if cpus is None:
        raise RuntimeError("Nenhuma base de CPUs encontrada")
    validar(cpus)
    payload = montar_payload(cpus)
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"dados.json gerado e validado: {len(cpus)} processadores.")


if __name__ == "__main__":
    main()
