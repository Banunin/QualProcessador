import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "dados.json"
COMPAT = ROOT / "dados.js"
BASE_URL = "https://qualprocessador.vercel.app"
SCHEMA_URL = BASE_URL + "/schemas/processadores.schema.json"


def normalizar(texto):
    texto = unicodedata.normalize("NFD", str(texto or "").lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", texto).strip("-")


def carregar_payload():
    if not TARGET.exists():
        raise RuntimeError("dados.json não existe. Ele é a fonte canônica da base de CPUs.")
    payload = json.loads(TARGET.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        payload = {"processors": payload}
    if not isinstance(payload, dict) or not isinstance(payload.get("processors"), list):
        raise RuntimeError("dados.json não contém um objeto com a lista processors")
    return payload


def slug_novo(cpu):
    marca = normalizar(cpu.get("marca") or cpu.get("fabricante") or "cpu")
    nome = normalizar(cpu.get("nome"))
    return nome if nome == marca or nome.startswith(marca + "-") else f"{marca}-{nome}"


def familia_cpu(cpu):
    if str(cpu.get("familia") or "").strip():
        return str(cpu["familia"]).strip()
    nome = str(cpu.get("nome") or "")
    for pattern, label in [
        (r"Ryzen\s+([3579])", "Ryzen {}"),
        (r"Core\s+i([3579])", "Core i{}"),
    ]:
        m = re.search(pattern, nome, flags=re.I)
        if m:
            return label.format(m.group(1))
    for termo in ("Xeon", "Pentium", "Celeron", "Athlon", "Threadripper", "Atom"):
        if termo.casefold() in nome.casefold():
            return termo
    return ""


def entidade_id(cpu):
    existente = str(cpu.get("entity_id") or "").strip()
    if existente:
        return existente
    return f"qp:cpu:{cpu.get('id')}"


def id_relacao(prefixo, valor):
    valor_norm = normalizar(valor)
    return f"qp:{prefixo}:{valor_norm}" if valor_norm else None


def preparar_identidade(cpus):
    for cpu in cpus:
        cpu["entity_type"] = "processor"
        cpu["entity_id"] = entidade_id(cpu)
        # O slug passa a ser persistido. Se o nome editorial mudar no futuro,
        # a URL não muda automaticamente e a identidade permanece estável.
        cpu["slug"] = str(cpu.get("slug") or "").strip() or slug_novo(cpu)
        marca = normalizar(cpu.get("marca") or cpu.get("fabricante") or "cpu")
        cpu["canonical_url"] = f"{BASE_URL}/cpu/{marca}/{cpu['slug']}"


def score_relacao(a, b):
    score = 0
    if normalizar(a.get("marca") or a.get("fabricante")) == normalizar(b.get("marca") or b.get("fabricante")):
        score += 2
    if normalizar(a.get("soquete") or a.get("socket")) and normalizar(a.get("soquete") or a.get("socket")) == normalizar(b.get("soquete") or b.get("socket")):
        score += 5
    if normalizar(familia_cpu(a)) and normalizar(familia_cpu(a)) == normalizar(familia_cpu(b)):
        score += 6
    if normalizar(a.get("geracao")) and normalizar(a.get("geracao")) == normalizar(b.get("geracao")):
        score += 3
    if normalizar(a.get("arquitetura") or a.get("codinome")) and normalizar(a.get("arquitetura") or a.get("codinome")) == normalizar(b.get("arquitetura") or b.get("codinome")):
        score += 3
    return score


def preparar_relacoes(cpus):
    for cpu in cpus:
        marca_nome = str(cpu.get("fabricante") or cpu.get("marca") or "").strip()
        socket_nome = str(cpu.get("soquete") or cpu.get("socket") or "").strip()
        familia_nome = familia_cpu(cpu)
        geracao_nome = str(cpu.get("geracao") or "").strip()
        arquitetura_nome = str(cpu.get("arquitetura") or cpu.get("codinome") or "").strip()

        candidatos = []
        for outro in cpus:
            if outro is cpu:
                continue
            score = score_relacao(cpu, outro)
            if score > 0:
                candidatos.append((score, str(outro.get("nome") or ""), outro["entity_id"]))
        candidatos.sort(key=lambda item: (-item[0], item[1].casefold()))

        cpu["relations"] = {
            "brand": marca_nome,
            "brand_id": id_relacao("brand", marca_nome),
            "socket": socket_nome or None,
            "socket_id": id_relacao("socket", socket_nome),
            "family": familia_nome or None,
            "family_id": id_relacao("cpu-family", f"{marca_nome}-{familia_nome}" if familia_nome else ""),
            "generation": geracao_nome or None,
            "generation_id": id_relacao("cpu-generation", f"{marca_nome}-{geracao_nome}" if geracao_nome else ""),
            "architecture": arquitetura_nome or None,
            "architecture_id": id_relacao("cpu-architecture", arquitetura_nome),
            "related_entity_ids": [item[2] for item in candidatos[:8]],
        }


def validar(cpus):
    if not isinstance(cpus, list) or not cpus:
        raise RuntimeError("Base de CPUs vazia ou inválida")
    ids, nomes, entidades, slugs, canonicals = set(), set(), set(), set(), set()
    for indice, cpu in enumerate(cpus):
        if not isinstance(cpu, dict):
            raise RuntimeError(f"CPU na posição {indice} não é um objeto JSON")
        if "id" not in cpu or not str(cpu.get("nome") or "").strip():
            raise RuntimeError(f"CPU na posição {indice} não possui id/nome")
        pares = [
            (ids, cpu["id"], "ID"),
            (nomes, str(cpu["nome"]).strip().casefold(), "nome"),
            (entidades, cpu["entity_id"], "entity_id"),
            (slugs, cpu["slug"], "slug"),
            (canonicals, cpu["canonical_url"], "canonical_url"),
        ]
        for conjunto, valor, rotulo in pares:
            if valor in conjunto:
                raise RuntimeError(f"{rotulo} duplicado: {valor}")
            conjunto.add(valor)

    entidades_validas = {cpu["entity_id"] for cpu in cpus}
    for cpu in cpus:
        for ref in cpu.get("relations", {}).get("related_entity_ids", []):
            if ref not in entidades_validas:
                raise RuntimeError(f"Relação inválida em {cpu['nome']}: {ref}")


def hash_conteudo(cpus):
    canonico = json.dumps(cpus, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonico.encode("utf-8")).hexdigest()


def montar_payload(anterior, cpus):
    digest = hash_conteudo(cpus)
    anterior_hash = str(anterior.get("content_sha256") or "")
    anterior_data = anterior.get("last_modified") or anterior.get("generated_at")
    agora = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    data = anterior_data if anterior_hash == digest and anterior_data else agora

    return {
        "$schema": SCHEMA_URL,
        "schema_version": "2.0",
        "dataset_version": f"sha256-{digest[:16]}",
        "dataset": "QualProcessador CPU Database",
        "entity_type": "Dataset",
        "language": "pt-BR",
        "publisher": "QualProcessador",
        "canonical_url": BASE_URL + "/dados.json",
        "description": "Base pública estruturada de processadores cadastrados no QualProcessador, com identidade persistente, relações, fichas técnicas e resultados CPU-Z quando disponíveis.",
        "generated_at": data,
        "last_modified": data,
        "content_sha256": digest,
        "benchmark_semantics": {
            "notaJogos": "CPU-Z Benchmark 17 Single Thread",
            "notaTrabalho": "CPU-Z Benchmark 17 Multi Thread",
            "missing_value": "N/A",
        },
        "field_provenance": {
            "technical_specifications": {
                "kind": "structured technical database fields",
                "fields": ["cores", "threads", "tdp", "freqBase", "freqBoost", "soquete", "arquitetura", "codinome", "litografia", "cacheL1", "cacheL2", "cacheL3", "memoria", "pcie", "video"],
            },
            "benchmarks": {
                "kind": "benchmark values published in the QualProcessador database",
                "fields": ["notaJogos", "notaTrabalho"],
                "method": "CPU-Z Benchmark 17",
                "note": "Não presumir que um valor foi medido diretamente pelo QualProcessador quando o registro não informa uma origem específica.",
            },
            "editorial": {
                "kind": "QualProcessador editorial/context fields",
                "fields": ["analise", "detalhe", "selo"],
            },
            "media": {
                "kind": "reference images associated with the processor record",
                "fields": ["foto", "fotos"],
            },
        },
        "identity_semantics": {
            "entity_id": "Identificador persistente interno. Não depende do nome ou do slug.",
            "slug": "Identificador legível e persistido para URL. Depois de criado, não deve ser alterado apenas porque o título mudou.",
            "canonical_url": "URL pública canônica da ficha no QualProcessador.",
        },
        "relation_semantics": {
            "brand": "Fabricante/marca associado ao processador.",
            "socket": "Plataforma física de soquete registrada.",
            "family": "Família/linha do modelo registrada ou derivada do nome quando ausente.",
            "generation": "Geração registrada na base quando disponível.",
            "architecture": "Arquitetura ou codinome registrado quando disponível.",
            "related_entity_ids": "Até oito processadores relacionados por família, plataforma, geração, arquitetura ou marca; a relação serve para descoberta e não implica equivalência de desempenho.",
        },
        "interpretation_rules": [
            "Não interpretar notaJogos como FPS; o campo representa CPU-Z Benchmark 17 Single Thread.",
            "Não interpretar notaTrabalho como desempenho profissional genérico; o campo representa CPU-Z Benchmark 17 Multi Thread.",
            "Campos ausentes, vazios ou N/A não devem ser inferidos.",
            "Os nomes e especificações devem ser associados ao processador exato cadastrado.",
            "Relações entre CPUs são auxiliares de descoberta e não significam que os modelos tenham desempenho equivalente.",
        ],
        "apis": {
            "catalog": BASE_URL + "/api/ai-cpus",
            "individual_template": BASE_URL + "/api/cpu/{slug}",
            "search": BASE_URL + "/api/search?q={query}",
            "comparison_template": BASE_URL + "/api/comparison/{slug-a}-vs-{slug-b}",
        },
        "count": len(cpus),
        "processors": cpus,
    }


def escrever_compatibilidade(payload):
    cabecalho = (
        "// ARQUIVO GERADO AUTOMATICAMENTE A PARTIR DE dados.json.\n"
        "// NÃO EDITE ESTE ARQUIVO: a fonte canônica é /dados.json.\n"
    )
    metadata = {
        "dataset_version": payload["dataset_version"],
        "content_sha256": payload["content_sha256"],
        "canonical_url": payload["canonical_url"],
    }
    conteudo = cabecalho + "const listaDeCpus = " + json.dumps(payload["processors"], ensure_ascii=False, indent=4) + ";\n"
    conteudo += "const qpCpuDatasetMetadata = " + json.dumps(metadata, ensure_ascii=False, indent=4) + ";\n"
    COMPAT.write_text(conteudo, encoding="utf-8")


def main():
    anterior = carregar_payload()
    cpus = anterior["processors"]
    preparar_identidade(cpus)
    preparar_relacoes(cpus)
    validar(cpus)
    payload = montar_payload(anterior, cpus)
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    escrever_compatibilidade(payload)
    print(f"dados.json canônico: {len(cpus)} CPUs, versão {payload['dataset_version']}")
    print("dados.js regenerado apenas como adaptador de compatibilidade do frontend.")


if __name__ == "__main__":
    main()
