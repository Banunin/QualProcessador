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


def chave_par(a, b):
    aid = int(a.get("id", 0))
    bid = int(b.get("id", 0))
    return (aid, bid) if aid <= bid else (bid, aid)


def url_comparacao(a, b):
    aid = int(a.get("id", 0))
    bid = int(b.get("id", 0))
    primeiro, segundo = (a, b) if aid <= bid else (b, a)
    return f"/comparar/{slug_cpu(primeiro)}-vs-{slug_cpu(segundo)}"


def melhor_proximo(cpu, candidatos, campo):
    alvo = numero(cpu.get(campo))
    validos = [c for c in candidatos if c.get("id") != cpu.get("id")]
    if alvo > 0:
        com_score = [c for c in validos if numero(c.get(campo)) > 0]
        if com_score:
            validos = com_score
    if not validos:
        return None
    return min(validos, key=lambda c: abs(numero(c.get(campo)) - alvo))


def gerar_comparacoes(cpus):
    pares = {}
    for cpu in cpus:
        outros = [c for c in cpus if c.get("id") != cpu.get("id")]
        socket = str(cpu.get("soquete") or cpu.get("socket") or "").strip().lower()
        marca = str(cpu.get("marca") or "").strip().lower()

        mesmo_socket = [c for c in outros if socket and str(c.get("soquete") or c.get("socket") or "").strip().lower() == socket]
        outra_marca = [c for c in outros if marca and str(c.get("marca") or "").strip().lower() != marca]

        candidatos = [
            melhor_proximo(cpu, mesmo_socket, "notaJogos"),
            melhor_proximo(cpu, outra_marca, "notaJogos"),
            melhor_proximo(cpu, outros, "notaTrabalho"),
        ]
        for outro in candidatos:
            if outro:
                pares[chave_par(cpu, outro)] = (cpu, outro)
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

    print(f"Sitemap gerado: {len(cpus)} CPUs, {len(comparacoes)} comparações, {len(urls)} URLs totais.")


if __name__ == "__main__":
    main()
