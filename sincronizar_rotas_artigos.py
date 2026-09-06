import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VERCEL_PATH = ROOT / "vercel.json"
ARTIGOS_PATH = ROOT / "artigos.json"

RESERVED_PREFIXES = (
    "/api", "/cpu", "/forum", "/comparar", "/ferramentas", "/upscendra",
    "/winformatkit", "/apoiar", "/analises", "/comunidade", "/Comunidade",
    "/painel-postar", "/ler-artigo", "/artigo"
)


def normalizar_path(value):
    value = "/" + str(value or "").strip().lstrip("/")
    return value.rstrip("/") or "/"


def main():
    config = json.loads(VERCEL_PATH.read_text(encoding="utf-8"))
    artigos = json.loads(ARTIGOS_PATH.read_text(encoding="utf-8"))
    rewrites = list(config.get("rewrites") or [])

    # Remove somente rotas de artigos geradas anteriormente. Rotas genéricas
    # /artigo/:id e /ler-artigo permanecem intactas.
    limpas = []
    for item in rewrites:
        source = str(item.get("source") or "")
        destination = str(item.get("destination") or "")
        generated_article = destination.startswith("/api/render-article?id=") and source != "/artigo/:id"
        if not generated_article:
            limpas.append(item)

    existentes = {normalizar_path(item.get("source")) for item in limpas}
    adicionadas = []
    for chave, artigo in artigos.items():
        source = normalizar_path(artigo.get("urlLimpa") or "")
        if source == "/":
            continue
        if source.startswith(RESERVED_PREFIXES):
            raise RuntimeError(f"urlLimpa de artigo conflita com rota reservada: {source}")
        if source in existentes:
            raise RuntimeError(f"urlLimpa de artigo conflita com rota existente: {source}")
        article_id = str(artigo.get("id") or chave)
        adicionadas.append({"source": source, "destination": f"/api/render-article?id={article_id}"})
        existentes.add(source)

    config["rewrites"] = limpas + adicionadas
    VERCEL_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Rotas SSR de artigos sincronizadas: {len(adicionadas)}")


if __name__ == "__main__":
    main()
