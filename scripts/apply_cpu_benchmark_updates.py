#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "dados.json"
UPDATE_FILES = (
    ROOT / "data" / "cpuz-benchmark-updates.json",
    ROOT / "data" / "cpuz-official-updates.json",
)
GENERATED_COMPAT = ROOT / "dados.js"

MISSING = "N/A"
SCORE_FIELDS = ("notaJogos", "notaTrabalho")
SOURCE_FIELDS = {
    "notaJogos": "notaJogosFonte",
    "notaTrabalho": "notaTrabalhoFonte",
}


def is_missing(value):
    return value is None or value == "" or value == MISSING


def valid_score(value):
    return value == MISSING or (isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def report_missing(processors, title):
    missing = []
    for cpu in processors:
        fields = [field for field in SCORE_FIELDS if is_missing(cpu.get(field))]
        if fields:
            missing.append((cpu.get("nome", "<sem nome>"), fields))
    print(f"{title}: {len(missing)} CPUs com pelo menos uma nota ausente")
    for nome, fields in missing:
        print(f"MISSING\t{nome}\t{','.join(fields)}")
    return missing


def collect_updates():
    updates = []
    for path in UPDATE_FILES:
        if not path.exists():
            continue
        payload = load_json(path)
        items = payload.get("updates", [])
        if not isinstance(items, list):
            raise RuntimeError(f"updates precisa ser uma lista em {path.relative_to(ROOT)}")
        updates.extend(items)
    return updates


def main():
    payload = load_json(DATASET)
    processors = payload.get("processors")
    if not isinstance(processors, list):
        raise RuntimeError("dados.json não contém a lista processors")

    report_missing(processors, "ANTES")
    updates = collect_updates()
    if not updates:
        print("Nenhuma atualização de benchmark registrada.")
        return

    by_name = {str(cpu.get("nome", "")).strip(): cpu for cpu in processors}
    changed = 0

    for update in updates:
        nome = str(update.get("nome", "")).strip()
        if not nome or nome not in by_name:
            raise RuntimeError(f"CPU da atualização não encontrada exatamente no acervo: {nome!r}")
        cpu = by_name[nome]

        for field in SCORE_FIELDS:
            if field not in update:
                continue
            value = update[field]
            if not valid_score(value):
                raise RuntimeError(f"Valor inválido em {nome}/{field}: {value!r}")
            if value == MISSING:
                continue

            current = cpu.get(field, MISSING)
            if not is_missing(current):
                if current != value:
                    raise RuntimeError(
                        f"Recusando sobrescrever valor existente em {nome}/{field}: {current!r} -> {value!r}"
                    )
                continue

            source_field = SOURCE_FIELDS[field]
            source = str(update.get(source_field, "")).strip()
            if not source.startswith("CPU-Z Benchmark 17"):
                raise RuntimeError(
                    f"Fonte inválida em {nome}/{source_field}: deve começar com 'CPU-Z Benchmark 17'"
                )

            cpu[field] = value
            cpu[source_field] = source
            changed += 1
            print(f"APPLIED\t{nome}\t{field}\t{value}\t{source}")

    if not changed:
        print("Nenhuma nota nova aplicável; dados.json permanece inalterado.")
        report_missing(processors, "DEPOIS")
        return

    DATASET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Usa o normalizador canônico do próprio projeto para recalcular hashes,
    # dataset_version e invariantes sem duplicar a lógica de integridade aqui.
    subprocess.run(["python3", str(ROOT / "migrar_dados_json.py")], cwd=ROOT, check=True)

    # dados.js é artefato temporário de compatibilidade/validação e não deve
    # voltar a ser persistido no repositório.
    if GENERATED_COMPAT.exists():
        GENERATED_COMPAT.unlink()

    normalized = load_json(DATASET)
    report_missing(normalized["processors"], "DEPOIS")
    print(f"Total de campos de benchmark preenchidos nesta execução: {changed}")


if __name__ == "__main__":
    main()
