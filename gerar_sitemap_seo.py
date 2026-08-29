import json
import os
import re
import unicodedata
from pathlib import Path
from xml.sax.saxutils import escape

BASE_URL = os.getenv("SEO_BASE_URL", "https://qualprocessador.vercel.app").rstrip("/")
ROOT = Path(__file__).resolve().parent


def normalizar(texto):
    texto = unicodedata.normalize("NFD", str(texto or "").lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = re.sub(r"[^a-z0-9]+", "-", texto).strip("-")
    return texto


def carregar_cpus():
    bruto = (ROOT / "dados.js").read_text(encoding="utf-8")
    inicio = bruto.find("[")
    fim = bruto.rfind("]")
    if inicio < 0 or fim <= inicio:
        raise RuntimeError("Não foi possível localizar listaDeCpus em dados.js")
    return json.loads(bruto[inicio : fim + 1])


def carregar_artigos():
    path = ROOT / "artigos.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def slug_cpu(cpu):
    marca = normalizar(cpu.get("marca") or cpu.get("fabricante") or "cpu")
    nome = normalizar(cpu.get("nome"))
    return nome if nome == marca or nome.startswith(marca + "-") else f"{marca}-{nome}"


def url_cpu(cpu):
    marca = normalizar(cpu.get("marca") or cpu.get("fabricante") or "cpu")
    return f"/cpu/{marca}/{slug_cpu(cpu)}"


def numero(valor):
    if isinstance(valor, (int, float)):
        return float(valor)
    m = re.search(r"-?\d+(?:[.,]\d+)?", str(valor or ""))
    return float(m.group(0).replace(",", ".")) if m else 0.0


def ano(cpu):
    m = re.search(r"(?:19|20)\d{2}", str(cpu.get("lancamento") or ""))
    return int(m.group(0)) if m else 0


def chave_par(a, b):
    aid = int(a.get("id", 0))
    bid = int(b.get("id", 0))
    return (aid, bid) if aid <= bid else (bid, aid)


def url_comparacao(a, b):
    aid = int(a.get("id", 0))
    bid = int(b.get("id", 0))
    primeiro, segundo = (a, b) if aid <= bid else (b, a)
    return f"/comparar/{slug_cpu(primeiro)}-vs-{slug_cpu(segundo)}"


def score_similaridade(base, item):
    single_base = numero(base.get("notaJogos"))
    multi_base = numero(base.get("notaTrabalho"))
    cores_base = numero(base.get("cores"))
    threads_base = numero(base.get("threads"))

    single_item = numero(item.get("notaJogos"))
    multi_item = numero(item.get("notaTrabalho"))
    cores_item = numero(item.get("cores"))
    threads_item = numero(item.get("threads"))

    ds = abs(single_item - single_base) / max(single_base, 1) if single_base and single_item else 0.45
    dm = abs(multi_item - multi_base) / max(multi_base, 1) if multi_base and multi_item else 0.45
    dc = abs(cores_item - cores_base) / max(cores_base, 1) if cores_base else 0.30
    dt = abs(threads_item - threads_base) / max(threads_base, 1) if threads_base else 0.30

    ano_base = ano(base)
    ano_item = ano(item)
    diff_ano = abs(ano_item - ano_base) if ano_base and ano_item else 2
    dy = min(diff_ano / 4, 1.5)

    score = ds * 0.36 + dm * 0.22 + dc * 0.17 + dt * 0.10 + dy * 0.15
    if diff_ano > 5:
        score += 1.2
    if diff_ano > 8:
        score += 1.5

    socket_base = str(base.get("soquete") or base.get("socket") or "").strip().lower()
    socket_item = str(item.get("soquete") or item.get("socket") or "").strip().lower()
    if socket_base and socket_base == socket_item:
        score *= 0.82

    marca_base = str(base.get("marca") or "").strip().lower()
    marca_item = str(item.get("marca") or "").strip().lower()
    if marca_base and marca_item and marca_base != marca_item and diff_ano <= 3:
        score *= 0.94

    return score


def comparacao_plausivel(a, b):
    ano_a, ano_b = ano(a), ano(b)
    if ano_a and ano_b and abs(ano_a - ano_b) > 4:
        return False

    cores_a, cores_b = numero(a.get("cores")), numero(b.get("cores"))
    threads_a, threads_b = numero(a.get("threads")), numero(b.get("threads"))
    if cores_a and cores_b and abs(cores_a - cores_b) > max(4, max(cores_a, cores_b) * 0.55):
        return False
    if threads_a and threads_b and abs(threads_a - threads_b) > max(8, max(threads_a, threads_b) * 0.60):
        return False

    single_a, single_b = numero(a.get("notaJogos")), numero(b.get("notaJogos"))
    if single_a and single_b:
        proporcao = max(single_a, single_b) / max(min(single_a, single_b), 1)
        if proporcao > 1.85:
            return False

    return True


def melhores(base, candidatos, quantidade=1):
    validos = [c for c in candidatos if c.get("id") != base.get("id") and comparacao_plausivel(base, c)]
    return sorted(validos, key=lambda c: score_similaridade(base, c))[:quantidade]


def por_nome(cpus, nome):
    alvo = normalizar(nome)
    return next((c for c in cpus if normalizar(c.get("nome")) == alvo), None)


def gerar_comparacoes(cpus):
    pares = {}

    for cpu in cpus:
        outros = [c for c in cpus if c.get("id") != cpu.get("id")]
        socket = str(cpu.get("soquete") or cpu.get("socket") or "").strip().lower()
        marca = str(cpu.get("marca") or "").strip().lower()
        familia = normalizar(cpu.get("familia") or "")

        mesmo_socket = [c for c in outros if socket and str(c.get("soquete") or c.get("socket") or "").strip().lower() == socket]
        outra_marca = [c for c in outros if marca and str(c.get("marca") or "").strip().lower() != marca]
        mesma_familia = [c for c in outros if familia and normalizar(c.get("familia") or "") == familia]

        selecionados = []
        selecionados += melhores(cpu, mesmo_socket, 1)
        selecionados += melhores(cpu, outra_marca, 1)
        selecionados += melhores(cpu, mesma_familia, 1)

        for outro in selecionados:
            pares[chave_par(cpu, outro)] = (cpu, outro)

    # Pares editoriais/populares: só entram se ambos estiverem realmente cadastrados.
    pares_populares = [
        ("AMD Ryzen 5 5600", "Intel Core i5-12400F"),
        ("AMD Ryzen 5 5600", "AMD Ryzen 5 5600X"),
        ("AMD Ryzen 5 3600", "AMD Ryzen 5 5600"),
        ("AMD Ryzen 7 5700X", "AMD Ryzen 7 5800X"),
        ("AMD Ryzen 7 5700X3D", "AMD Ryzen 7 5800X3D"),
    ]
    for nome_a, nome_b in pares_populares:
        a, b = por_nome(cpus, nome_a), por_nome(cpus, nome_b)
        if a and b:
            pares[chave_par(a, b)] = (a, b)

    return list(pares.values())


def main():
    cpus = carregar_cpus()
    artigos = carregar_artigos()

    urls = []
    vistos = set()

    def add(path):
        path = "/" + str(path or "").lstrip("/")
        if path == "//":
            path = "/"
        if path not in vistos:
            vistos.add(path)
            urls.append(path)

    for path in [
        "/",
        "/analises",
        "/forum",
        "/Comunidade",
        "/ferramentas",
        "/upscendra",
        "/winformatkit",
        "/apoiar",
        "/comparar",
    ]:
        add(path)

    for artigo in artigos.values():
        limpa = artigo.get("urlLimpa") or artigo.get("linkLeitura")
        if limpa:
            add(limpa)

    for cpu in cpus:
        add(url_cpu(cpu))

    comparacoes = gerar_comparacoes(cpus)
    for a, b in comparacoes:
        add(url_comparacao(a, b))

    linhas = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in urls:
        loc = BASE_URL + ("/" if path == "/" else path)
        linhas.extend(["  <url>", f"    <loc>{escape(loc)}</loc>", "  </url>"])
    linhas.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(linhas) + "\n", encoding="utf-8")

    print(f"Sitemap gerado: {len(cpus)} CPUs, {len(comparacoes)} comparações relevantes, {len(urls)} URLs totais.")


if __name__ == "__main__":
    main()
