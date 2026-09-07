#!/usr/bin/env python3
import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "dados.json"
LEDGER = ROOT / "data" / "cpuz-benchmark-updates.json"
BASE = "https://www.cpu-monkey.com/en/benchmark-{slug}-{benchmark}"
MISSING = "N/A"
USER_AGENT = "Mozilla/5.0 (compatible; QualProcessador benchmark research; +https://qualprocessador.vercel.app/)"

BENCHMARKS = {
    "notaJogos": {
        "path": "cpu_z_benchmark_17_single_core",
        "title": "CPU-Z Benchmark 17 Single-Core",
        "source_field": "notaJogosFonte",
    },
    "notaTrabalho": {
        "path": "cpu_z_benchmark_17_multi_core",
        "title": "CPU-Z Benchmark 17 Multi-Core",
        "source_field": "notaTrabalhoFonte",
    },
}


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tokens = []

    def handle_data(self, data):
        value = " ".join(data.split())
        if value:
            self.tokens.append(value)


def is_missing(value):
    return value is None or value == "" or value == MISSING


def slugify_cpu_monkey(name):
    value = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "_", value).strip("_")


def normalize_text(value):
    return " ".join(str(value).split()).casefold()


def parse_positive_integer(token):
    compact = token.replace(",", "").replace(" ", "")
    if not re.fullmatch(r"\d+", compact):
        return None
    value = int(compact)
    return value if value > 0 else None


def fetch_tokens(url, attempts=3):
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"})
            with urllib.request.urlopen(request, timeout=20) as response:
                final_url = response.geturl()
                html = response.read().decode("utf-8", errors="replace")
            parser = TextExtractor()
            parser.feed(html)
            return final_url, parser.tokens
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if isinstance(exc, urllib.error.HTTPError) and exc.code == 404:
                return url, []
            if attempt < attempts:
                time.sleep(attempt)
    print(f"FETCH_ERROR\t{url}\t{last_error}")
    return url, []


def extract_score(tokens, cpu_name, benchmark_title):
    if not tokens:
        return None

    cpu_norm = normalize_text(cpu_name)
    benchmark_norm = normalize_text(benchmark_title)

    # Exige que a própria página identifique o modelo e o benchmark exatos.
    identity_ok = any(cpu_norm in normalize_text(token) and benchmark_norm in normalize_text(token) for token in tokens[:80])
    if not identity_ok:
        return None

    heading_index = None
    for index, token in enumerate(tokens):
        norm = normalize_text(token)
        if benchmark_norm in norm and "benchmark results" in norm:
            heading_index = index
            break
    if heading_index is None:
        return None

    end_index = min(len(tokens), heading_index + 180)
    for index in range(heading_index + 1, end_index):
        token_norm = normalize_text(tokens[index])
        if "more benchmark results for" in token_norm or token_norm.startswith("show all cpu-z benchmark"):
            end_index = index
            break

    for index in range(heading_index + 1, end_index):
        if normalize_text(tokens[index]) != cpu_norm:
            continue
        # Depois do nome, CPU Monkey mostra descrição de C/T + clock e então o score.
        # Aceitamos apenas um token inteiro positivo isolado; percentuais e clocks são rejeitados.
        for candidate in tokens[index + 1 : min(index + 10, end_index)]:
            value = parse_positive_integer(candidate)
            if value is not None:
                return value
        return None
    return None


def load_json(path, fallback=None):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def main():
    payload = load_json(DATASET)
    processors = payload.get("processors")
    if not isinstance(processors, list):
        raise RuntimeError("dados.json não contém processors")

    ledger = load_json(LEDGER, fallback={}) or {}
    ledger.setdefault("benchmark", "CPU-Z Benchmark 17")
    ledger.setdefault("rules", {
        "notaJogos": "Single-Core only",
        "notaTrabalho": "Multi-Core only",
        "missing_value": "N/A",
        "no_estimates": True,
        "allowed_sources": ["CPU-Z", "CPU Monkey"],
    })
    ledger["source_policy"] = {
        "cpu_monkey": "Only exact CPU-Z Benchmark 17 Single-Core/Multi-Core pages are parsed.",
        "cpu_z_official": "Per-model official CPU-Z result remains N/A when no stable exact model result is recorded in this ledger.",
        "zero_means_missing": True,
        "no_cross_cpu_substitution": True,
    }

    existing_updates = {item["nome"]: item for item in ledger.get("updates", []) if isinstance(item, dict) and item.get("nome")}
    existing_checks = {item["nome"]: item for item in ledger.get("checks", []) if isinstance(item, dict) and item.get("nome")}

    targets = []
    for cpu in processors:
        missing_fields = [field for field in BENCHMARKS if is_missing(cpu.get(field))]
        if missing_fields:
            targets.append((cpu, missing_fields))

    limit = int(os.environ.get("CPU_MONKEY_LIMIT", "0") or 0)
    if limit > 0:
        targets = targets[:limit]

    requests_made = 0
    found_fields = 0
    checked_fields = 0

    for cpu, missing_fields in targets:
        name = str(cpu.get("nome") or "").strip()
        if not name:
            continue
        slug = slugify_cpu_monkey(name)
        update = existing_updates.setdefault(name, {"nome": name})
        check = existing_checks.setdefault(name, {
            "nome": name,
            "cpuZOfficial": {
                "single": MISSING,
                "multi": MISSING,
                "note": "No stable exact per-model CPU-Z official result recorded in this research pass."
            },
            "cpuMonkey": {},
        })

        for field in missing_fields:
            meta = BENCHMARKS[field]
            url = BASE.format(slug=slug, benchmark=meta["path"])
            final_url, tokens = fetch_tokens(url)
            requests_made += 1
            checked_fields += 1
            score = extract_score(tokens, name, meta["title"])

            check["cpuMonkey"][field] = {
                "value": score if score is not None else MISSING,
                "url": final_url,
                "benchmark": meta["title"],
                "checked_at": now_iso(),
            }

            if score is None:
                print(f"N/A\t{name}\t{field}\t{final_url}")
            else:
                update[field] = score
                update[meta["source_field"]] = "CPU-Z Benchmark 17 — CPU Monkey"
                update.setdefault("evidence", {})[field] = {
                    "source": "CPU Monkey",
                    "url": final_url,
                    "benchmark": meta["title"],
                    "value": score,
                }
                found_fields += 1
                print(f"FOUND\t{name}\t{field}\t{score}\t{final_url}")

            # Evita rajadas contra a fonte pública.
            time.sleep(0.35)

        # Remove entradas sem nenhum score aplicável do bloco de updates;
        # a ausência continua registrada em checks.
        if not any(field in update for field in BENCHMARKS):
            existing_updates.pop(name, None)

    ledger["researched_at"] = now_iso()
    ledger["updates"] = sorted(existing_updates.values(), key=lambda item: item["nome"].casefold())
    ledger["checks"] = sorted(existing_checks.values(), key=lambda item: item["nome"].casefold())
    ledger["last_run"] = {
        "target_cpus": len(targets),
        "checked_fields": checked_fields,
        "requests": requests_made,
        "found_fields": found_fields,
        "limit": limit or None,
    }
    LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SUMMARY\ttarget_cpus={len(targets)}\tchecked_fields={checked_fields}\tfound_fields={found_fields}")


if __name__ == "__main__":
    main()
