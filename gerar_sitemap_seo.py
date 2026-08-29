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


def nome_norm(cpu):
    return normalizar(cpu.get("nome") or "")


def marca_norm(cpu):
    return normalizar(cpu.get("marca") or cpu.get("fabricante") or "")


def socket_norm(cpu):
    return normalizar(cpu.get("soquete") or cpu.get("socket") or "")


def familia_norm(cpu):
    return normalizar(cpu.get("familia") or "")


def geracao_norm(cpu):
    return normalizar(cpu.get("geracao") or "")


def arquitetura_norm(cpu):
    return normalizar(cpu.get("arquitetura") or cpu.get("codinome") or "")


def linha_produto(cpu):
    nome = str(cpu.get("nome") or "").lower()
    marca = marca_norm(cpu)

    m = re.search(r"ryzen\s+([3579])", nome)
    if m:
        return f"amd-ryzen-{m.group(1)}"

    m = re.search(r"core\s+i([3579])", nome)
    if m:
        return f"intel-core-i{m.group(1)}"

    if "xeon" in nome:
        m = re.search(r"xeon\s+([ew])\s*[- ]?\s*(\d)", nome)
        if m:
            return f"intel-xeon-{m.group(1)}{m.group(2)}"
        m = re.search(r"xeon\s+([ew]\d)", nome)
        return f"intel-xeon-{m.group(1)}" if m else "intel-xeon"

    for familia in ("celeron", "pentium", "atom", "athlon", "threadripper"):
        if familia in nome:
            return f"{marca}-{familia}"

    return familia_norm(cpu) or marca


def faixa_produto(cpu):
    nome = str(cpu.get("nome") or "").lower()
    m = re.search(r"ryzen\s+([3579])", nome)
    if m:
        return int(m.group(1))
    m = re.search(r"core\s+i([3579])", nome)
    if m:
        return int(m.group(1))
    if "celeron" in nome or "atom" in nome:
        return 1
    if "pentium" in nome or "athlon" in nome:
        return 2
    if "xeon" in nome:
        return 6
    if "threadripper" in nome:
        return 10
    return 0


def modelo_numero(cpu):
    nome = str(cpu.get("nome") or "").lower()

    # Xeon E5-2680 v4, E3-1230 etc.: usa o número principal do modelo.
    m = re.search(r"xeon.*?\b(?:e|w)?\d?[- ]?(\d{4})\b", nome)
    if m:
        return int(m.group(1))

    # Ryzen/Core e demais famílias desktop: último bloco numérico de 3 a 5 dígitos.
    nums = re.findall(r"\b(\d{3,5})\b", nome)
    if nums:
        return int(nums[-1])
    return 0


def raiz_modelo(cpu):
    nome = str(cpu.get("nome") or "").lower()
    numero_modelo = modelo_numero(cpu)
    if not numero_modelo:
        return ""
    return f"{linha_produto(cpu)}-{numero_modelo}"


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
    dy = min(diff_ano / 5, 1.4)

    score = ds * 0.36 + dm * 0.22 + dc * 0.17 + dt * 0.10 + dy * 0.15

    if socket_norm(base) and socket_norm(base) == socket_norm(item):
        score *= 0.82
    if linha_produto(base) == linha_produto(item):
        score *= 0.78
    if familia_norm(base) and familia_norm(base) == familia_norm(item):
        score *= 0.72
    if faixa_produto(base) and faixa_produto(base) == faixa_produto(item) and marca_norm(base) != marca_norm(item):
        score *= 0.86

    return score


def comparacao_plausivel(a, b, relaxada=False):
    ano_a, ano_b = ano(a), ano(b)
    limite_anos = 7 if relaxada else 5
    if ano_a and ano_b and abs(ano_a - ano_b) > limite_anos:
        return False

    cores_a, cores_b = numero(a.get("cores")), numero(b.get("cores"))
    threads_a, threads_b = numero(a.get("threads")), numero(b.get("threads"))
    fator_cores = 0.75 if relaxada else 0.60
    fator_threads = 0.80 if relaxada else 0.68
    if cores_a and cores_b and abs(cores_a - cores_b) > max(6 if relaxada else 4, max(cores_a, cores_b) * fator_cores):
        return False
    if threads_a and threads_b and abs(threads_a - threads_b) > max(12 if relaxada else 8, max(threads_a, threads_b) * fator_threads):
        return False

    single_a, single_b = numero(a.get("notaJogos")), numero(b.get("notaJogos"))
    if single_a and single_b:
        proporcao = max(single_a, single_b) / max(min(single_a, single_b), 1)
        limite = 2.35 if relaxada else 2.0
        if proporcao > limite:
            return False

    return True


def melhores(base, candidatos, quantidade=1, relaxada=False):
    validos = [
        c for c in candidatos
        if c.get("id") != base.get("id") and comparacao_plausivel(base, c, relaxada=relaxada)
    ]
    return sorted(validos, key=lambda c: score_similaridade(base, c))[:quantidade]


def por_nome(cpus, nome):
    alvo = normalizar(nome)
    return next((c for c in cpus if normalizar(c.get("nome")) == alvo), None)


def adicionar_par(pares, a, b):
    if not a or not b or a.get("id") == b.get("id"):
        return
    pares[chave_par(a, b)] = (a, b)


def gerar_comparacoes(cpus):
    pares = {}

    # 1) Variantes do mesmo número/modelo: 5600/5600X, 12400/12400F,
    #    5700G/5700GE/5700X/5700X3D etc. São buscas muito naturais.
    grupos_raiz = {}
    for cpu in cpus:
        raiz = raiz_modelo(cpu)
        if raiz:
            grupos_raiz.setdefault(raiz, []).append(cpu)
    for grupo in grupos_raiz.values():
        for i, a in enumerate(grupo):
            for b in grupo[i + 1:]:
                adicionar_par(pares, a, b)

    # 2) Todas as combinações dentro de uma família/série específica quando
    #    a família está bem definida no banco, com filtro de plausibilidade.
    grupos_familia = {}
    for cpu in cpus:
        familia = familia_norm(cpu)
        if familia:
            grupos_familia.setdefault((marca_norm(cpu), familia), []).append(cpu)
    for grupo in grupos_familia.values():
        for i, a in enumerate(grupo):
            for b in grupo[i + 1:]:
                if comparacao_plausivel(a, b, relaxada=True):
                    adicionar_par(pares, a, b)

    # 3) Para cada CPU, cobre as intenções mais úteis: mesmo socket/linha,
    #    gerações próximas, concorrente direto da outra marca e vizinhos de desempenho.
    for cpu in cpus:
        outros = [c for c in cpus if c.get("id") != cpu.get("id")]
        socket = socket_norm(cpu)
        marca = marca_norm(cpu)
        linha = linha_produto(cpu)
        faixa = faixa_produto(cpu)
        geracao = geracao_norm(cpu)
        arquitetura = arquitetura_norm(cpu)
        ano_cpu = ano(cpu)

        mesmo_socket = [c for c in outros if socket and socket_norm(c) == socket]
        mesma_linha = [c for c in outros if linha and linha_produto(c) == linha]
        mesma_geracao = [c for c in outros if geracao and geracao_norm(c) == geracao and marca_norm(c) == marca]
        mesma_arquitetura = [c for c in outros if arquitetura and arquitetura_norm(c) == arquitetura and marca_norm(c) == marca]
        concorrentes = [
            c for c in outros
            if marca_norm(c) != marca
            and faixa and faixa_produto(c) == faixa
            and (not ano_cpu or not ano(c) or abs(ano(c) - ano_cpu) <= 4)
        ]
        mesma_faixa_marca = [
            c for c in outros
            if marca_norm(c) == marca
            and faixa and faixa_produto(c) == faixa
            and (not ano_cpu or not ano(c) or abs(ano(c) - ano_cpu) <= 4)
        ]

        selecionados = []
        selecionados += melhores(cpu, mesma_linha, 6, relaxada=True)
        selecionados += melhores(cpu, mesmo_socket, 5)
        selecionados += melhores(cpu, mesma_geracao, 5, relaxada=True)
        selecionados += melhores(cpu, mesma_arquitetura, 4, relaxada=True)
        selecionados += melhores(cpu, mesma_faixa_marca, 5, relaxada=True)
        selecionados += melhores(cpu, concorrentes, 6, relaxada=True)
        selecionados += melhores(cpu, outros, 4)

        for outro in selecionados:
            adicionar_par(pares, cpu, outro)

    # 4) Pares editoriais/populares. Permanecem explícitos para garantir cobertura
    #    de pesquisas clássicas, mas só entram se ambos estiverem cadastrados.
    pares_populares = [
        ("AMD Ryzen 5 5600", "Intel Core i5-12400F"),
        ("AMD Ryzen 5 5600", "AMD Ryzen 5 5600X"),
        ("AMD Ryzen 5 3600", "AMD Ryzen 5 5600"),
        ("AMD Ryzen 5 5500", "AMD Ryzen 5 5600"),
        ("AMD Ryzen 5 5600G", "AMD Ryzen 5 5600"),
        ("AMD Ryzen 7 5700X", "AMD Ryzen 7 5800X"),
        ("AMD Ryzen 7 5700X3D", "AMD Ryzen 7 5800X3D"),
        ("Intel Core i5-10400F", "AMD Ryzen 5 5600"),
        ("Intel Core i5-11400F", "AMD Ryzen 5 5600"),
        ("Intel Core i5-12400F", "AMD Ryzen 5 5600X"),
    ]
    for nome_a, nome_b in pares_populares:
        adicionar_par(pares, por_nome(cpus, nome_a), por_nome(cpus, nome_b))

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
