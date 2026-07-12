import json

# Definição das matrizes arquitetónicas de cada geração para automação de metadados
info_geracoes = {
    "1": {
        "arquitetura": "Zen", "litografia": "14 nm", "soquete": "AM4", "memoria": "DDR4-2667", "serie": "Série 1000", "epoca": "pioneira da viragem da AMD",
        "ano": "2017", "pcie": "PCIe 3.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel", "ecc": "Suportado (Depende da Motherboard)"
    },
    "2": {
        "arquitetura": "Zen+", "litografia": "12 nm", "soquete": "AM4", "memoria": "DDR4-2933", "serie": "Série 2000", "epoca": "de refinamento de latências e clocks superiores",
        "ano": "2018", "pcie": "PCIe 3.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel", "ecc": "Suportado (Depende da Motherboard)"
    },
    "3": {
        "arquitetura": "Zen 2", "litografia": "7 nm", "soquete": "AM4", "memoria": "DDR4-3200", "serie": "Série 3000", "epoca": "revolucionária em chiplets e salto massivo de IPC",
        "ano": "2019", "pcie": "PCIe 4.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel", "ecc": "Suportado (Depende da Motherboard)"
    },
    "4": {
        "arquitetura": "Zen 2 (APUs)", "litografia": "7 nm", "soquete": "AM4", "memoria": "DDR4-3200", "serie": "Série 4000", "epoca": "focada em mercados integrados, OEM e excelente custo-benefício",
        "ano": "2020", "pcie": "PCIe 3.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel", "ecc": "Não suportado oficialmente"
    },
    "5": {
        "arquitetura": "Zen 3", "litografia": "7 nm", "soquete": "AM4", "memoria": "DDR4-3200", "serie": "Série 5000", "epoca": "coroada como a rainha absoluta em desempenho para jogos e eficiência",
        "ano": "2020", "pcie": "PCIe 4.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel", "ecc": "Suportado (Depende da Motherboard)"
    }
}

# Base de Dados Bruta com TODOS os modelos e espaço para preenchimento manual de notas reais
lista_bruta = [
    # === 1ª GERAÇÃO — RYZEN 1000 ===
    # Exemplo de notas reais aplicadas cirurgicamente por você:
    {"gen": "1", "nome": "AMD Ryzen 3 1200", "c": "4", "t": "4", "tdp": "65 W", "base": "3.1 GHz", "boost": "3.4 GHz", "v": "Não possui", "cod": "Summit Ridge", "jogos": 3.0, "trabalho": 2.5},
    {"gen": "1", "nome": "AMD Ryzen 3 1300X", "c": "4", "t": "4", "tdp": "65 W", "base": "3.5 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Summit Ridge", "jogos": 3.4, "trabalho": 2.8},
    {"gen": "1", "nome": "AMD Ryzen 5 1400", "c": "4", "t": "8", "tdp": "65 W", "base": "3.2 GHz", "boost": "3.4 GHz", "v": "Não possui", "cod": "Summit Ridge", "jogos": 3.8, "trabalho": 3.5},
    
    # Modelos sem notas declaradas usarão o "fallback padrão de 5.0" até você editá-los:
    {"gen": "1", "nome": "AMD Ryzen 5 1500X", "c": "4", "t": "8", "tdp": "65 W", "base": "3.5 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"gen": "1", "nome": "AMD Ryzen 5 1600", "c": "6", "t": "12", "tdp": "65 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"gen": "1", "nome": "AMD Ryzen 5 1600X", "c": "6", "t": "12", "tdp": "95 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"gen": "1", "nome": "AMD Ryzen 7 1700", "c": "8", "t": "16", "tdp": "65 W", "base": "3.0 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"gen": "1", "nome": "AMD Ryzen 7 1700X", "c": "8", "t": "16", "tdp": "95 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"gen": "1", "nome": "AMD Ryzen 7 1800X", "c": "8", "t": "16", "tdp": "95 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"gen": "1", "nome": "AMD Ryzen 3 2200G", "c": "4", "t": "4", "tdp": "65 W", "base": "3.5 GHz", "boost": "3.7 GHz", "v": "Radeon Vega 8", "cod": "Raven Ridge"},
    {"gen": "1", "nome": "AMD Ryzen 5 2400G", "c": "4", "t": "8", "tdp": "65 W", "base": "3.6 GHz", "boost": "3.9 GHz", "v": "Radeon RX Vega 11", "cod": "Raven Ridge"},

    # === 2ª GERAÇÃO — RYZEN 2000 ===
    {"gen": "2", "nome": "AMD Ryzen 3 2300X", "c": "4", "t": "4", "tdp": "65 W", "base": "3.5 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"gen": "2", "nome": "AMD Ryzen 5 2500X", "c": "4", "t": "8", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"gen": "2", "nome": "AMD Ryzen 5 2600", "c": "6", "t": "12", "tdp": "65 W", "base": "3.4 GHz", "boost": "3.9 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"gen": "2", "nome": "AMD Ryzen 5 2600E", "c": "6", "t": "12", "tdp": "45 W", "base": "3.1 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"gen": "2", "nome": "AMD Ryzen 5 2600X", "c": "6", "t": "12", "tdp": "95 W", "base": "3.6 GHz", "boost": "4.2 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"gen": "2", "nome": "AMD Ryzen 7 2700", "c": "8", "t": "16", "tdp": "65 W", "base": "3.2 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"gen": "2", "nome": "AMD Ryzen 7 2700E", "c": "8", "t": "16", "tdp": "45 W", "base": "2.8 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"gen": "2", "nome": "AMD Ryzen 7 2700X", "c": "8", "t": "16", "tdp": "105 W", "base": "3.7 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"gen": "2", "nome": "AMD Ryzen 3 3200G", "c": "4", "t": "4", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Radeon Vega 8", "cod": "Picasso"},
    {"gen": "2", "nome": "AMD Ryzen 3 3200GE", "c": "4", "t": "4", "tdp": "35 W", "base": "3.3 GHz", "boost": "3.8 GHz", "v": "Radeon Vega 8", "cod": "Picasso"},
    {"gen": "2", "nome": "AMD Ryzen 5 3400G", "c": "4", "t": "8", "tdp": "65 W", "base": "3.7 GHz", "boost": "4.2 GHz", "v": "Radeon RX Vega 11", "cod": "Picasso"},
    {"gen": "2", "nome": "AMD Ryzen 5 3400GE", "c": "4", "t": "8", "tdp": "35 W", "base": "3.3 GHz", "boost": "4.0 GHz", "v": "Radeon RX Vega 11", "cod": "Picasso"},

    # === 3ª GERAÇÃO — RYZEN 3000 ===
    {"gen": "3", "nome": "AMD Ryzen 3 3100", "c": "4", "t": "8", "tdp": "65 W", "base": "3.6 GHz", "boost": "3.9 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 3 3300X", "c": "4", "t": "8", "tdp": "65 W", "base": "3.8 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 5 3500", "c": "6", "t": "6", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 5 3500X", "c": "6", "t": "6", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 5 3600", "c": "6", "t": "12", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.2 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 5 3600X", "c": "6", "t": "12", "tdp": "95 W", "base": "3.8 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 5 3600XT", "c": "6", "t": "12", "tdp": "95 W", "base": "3.8 GHz", "boost": "4.5 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 7 3700X", "c": "8", "t": "16", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 7 3800X", "c": "8", "t": "16", "tdp": "105 W", "base": "3.9 GHz", "boost": "4.5 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 7 3800XT", "c": "8", "t": "16", "tdp": "105 W", "base": "3.9 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 9 3900", "c": "12", "t": "24", "tdp": "65 W", "base": "3.1 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 9 3900X", "c": "12", "t": "24", "tdp": "105 W", "base": "3.8 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 9 3900XT", "c": "12", "t": "24", "tdp": "105 W", "base": "3.8 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Matisse"},
    {"gen": "3", "nome": "AMD Ryzen 9 3950X", "c": "16", "t": "32", "tdp": "105 W", "base": "3.5 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Matisse"},

    # === 4ª GERAÇÃO — RYZEN 4000 ===
    {"gen": "4", "nome": "AMD Ryzen 3 4100", "c": "4", "t": "8", "tdp": "65 W", "base": "3.8 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Renoir"},
    {"gen": "4", "nome": "AMD Ryzen 3 4300G", "c": "4", "t": "8", "tdp": "65 W", "base": "3.8 GHz", "boost": "4.0 GHz", "v": "Radeon Graphics (Vega 6)", "cod": "Renoir"},
    {"gen": "4", "nome": "AMD Ryzen 3 4300GE", "c": "4", "t": "8", "tdp": "35 W", "base": "3.5 GHz", "boost": "4.0 GHz", "v": "Radeon Graphics (Vega 6)", "cod": "Renoir"},
    {"gen": "4", "nome": "AMD Ryzen 5 4500", "c": "6", "t": "12", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Renoir"},
    {"gen": "4", "nome": "AMD Ryzen 5 4600G", "c": "6", "t": "12", "tdp": "65 W", "base": "3.7 GHz", "boost": "4.2 GHz", "v": "Radeon Graphics (Vega 7)", "cod": "Renoir"},
    {"gen": "4", "nome": "AMD Ryzen 5 4600GE", "c": "6", "t": "12", "tdp": "35 W", "base": "3.3 GHz", "boost": "4.2 GHz", "v": "Radeon Graphics (Vega 7)", "cod": "Renoir"},
    {"gen": "4", "nome": "AMD Ryzen 7 4700G", "c": "8", "t": "16", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.4 GHz", "v": "Radeon Graphics (Vega 8)", "cod": "Renoir"},
    {"gen": "4", "nome": "AMD Ryzen 7 4700GE", "c": "8", "t": "16", "tdp": "35 W", "base": "3.1 GHz", "boost": "4.3 GHz", "v": "Radeon Graphics (Vega 8)", "cod": "Renoir"},

    # === 5ª GERAÇÃO — RYZEN 5000 ===
    {"gen": "5", "nome": "AMD Ryzen 3 5100", "c": "4", "t": "8", "tdp": "65 W", "base": "3.8 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 3 5300G", "c": "4", "t": "8", "tdp": "65 W", "base": "4.0 GHz", "boost": "4.2 GHz", "v": "Radeon Graphics (Vega 6)", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 3 5300GE", "c": "4", "t": "8", "tdp": "35 W", "base": "3.6 GHz", "boost": "4.2 GHz", "v": "Radeon Graphics (Vega 6)", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 5 5500", "c": "6", "t": "12", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.2 GHz", "v": "Não possui", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 5 5600", "c": "6", "t": "12", "tdp": "65 W", "base": "3.5 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 5 5600G", "c": "6", "t": "12", "tdp": "65 W", "base": "3.9 GHz", "boost": "4.4 GHz", "v": "Radeon Graphics (Vega 7)", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 5 5600GE", "c": "6", "t": "12", "tdp": "35 W", "base": "3.4 GHz", "boost": "4.4 GHz", "v": "Radeon Graphics (Vega 7)", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 5 5600X", "c": "6", "t": "12", "tdp": "65 W", "base": "3.7 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 5 5600X3D", "c": "6", "t": "12", "tdp": "105 W", "base": "3.3 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 7 5700", "c": "8", "t": "16", "tdp": "65 W", "base": "3.7 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 7 5700G", "c": "8", "t": "16", "tdp": "65 W", "base": "3.8 GHz", "boost": "4.6 GHz", "v": "Radeon Graphics (Vega 8)", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 7 5700GE", "c": "8", "t": "16", "tdp": "35 W", "base": "3.2 GHz", "boost": "4.6 GHz", "v": "Radeon Graphics (Vega 8)", "cod": "Cezanne"},
    {"gen": "5", "nome": "AMD Ryzen 7 5700X", "c": "8", "t": "16", "tdp": "65 W", "base": "3.4 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 7 5700X3D", "c": "8", "t": "16", "tdp": "105 W", "base": "3.0 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 7 5800", "c": "8", "t": "16", "tdp": "65 W", "base": "3.4 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 7 5800X", "c": "8", "t": "16", "tdp": "105 W", "base": "3.8 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 7 5800XT", "c": "8", "t": "16", "tdp": "105 W", "base": "3.8 GHz", "boost": "4.8 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 7 5800X3D", "c": "8", "t": "16", "tdp": "105 W", "base": "3.4 GHz", "boost": "4.5 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 9 5900", "c": "12", "t": "24", "tdp": "65 W", "base": "3.0 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 9 5900X", "c": "12", "t": "24", "tdp": "105 W", "base": "3.7 GHz", "boost": "4.8 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 9 5900XT", "c": "16", "t": "32", "tdp": "105 W", "base": "3.3 GHz", "boost": "4.8 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"gen": "5", "nome": "AMD Ryzen 9 5950X", "c": "16", "t": "32", "tdp": "105 W", "base": "3.4 GHz", "boost": "4.9 GHz", "v": "Não possui", "cod": "Vermeer"}
]

processadores_finais = []

for index, item in enumerate(lista_bruta):
    g = item["gen"]
    gen_meta = info_geracoes[g]
    
    familia_txt = "Ryzen 3"
    if "Ryzen 5" in item["nome"]: familia_txt = "Ryzen 5"
    elif "Ryzen 7" in item["nome"]: familia_txt = "Ryzen 7"
    elif "Ryzen 9" in item["nome"]: familia_txt = "Ryzen 9"
    
    selo = "Excelente Escolha ⭐"
    cor_selo = "bg-verde"
    if "X3D" in item["nome"]:
        selo = "Monstro dos Jogos 👾"
        cor_selo = "bg-azul"
    elif "G" in item["nome"] or "GE" in item["nome"]:
        selo = "Vídeo Integrado 🖥️"
        cor_selo = "bg-verde"
    elif int(item["c"]) >= 12:
        selo = "Estação de Trabalho 🏭"
        cor_selo = "bg-azul"
    elif g in ["1", "2"]:
        selo = "Clássico Barato 💸"
        cor_selo = "bg-azul"

    detalhe_extra = "com Gráficos Radeon" if item["v"] != "Não possui" else "focado em Performance Bruta"
    detalhe = f"Geração {g} • {familia_txt} {detalhe_extra}"

    analise = (
        f"O {item['nome']} é um processador construído sobre a microarquitetura {gen_meta['arquitetura']} "
        f"com litografia de {gen_meta['litografia']}. Equipado com {item['c']} núcleos físicos e {item['t']} threads, "
        f"este modelo opera num barramento {gen_meta['soquete']} e destaca-se na época {gen_meta['epoca']}."
    )
    
    num_cores = int(item["c"])
    cache_l3 = "16 MB" if num_cores <= 6 else "32 MB"
    if "X3D" in item["nome"]: cache_l3 = "96 MB"
    elif g in ["1", "2"] and num_cores <= 4: cache_l3 = "8 MB"
    if num_cores in [12, 16]: cache_l3 = "64 MB"

    pcie_final = "PCIe 3.0" if item["cod"] == "Cezanne" else gen_meta["pcie"]

    analise_completa = f"""
        <h2>1. Visão Geral e Arquitetura do {item['nome']}</h2>
        <p>O <strong>{item['nome']}</strong> representa um marco importante para utilizadores que procuram otimizar o orçamento do seu computador. Pertencente à família {familia_txt} ({gen_meta['serie']}), ele utiliza o clássico encaixe <strong>{gen_meta['soquete']}</strong>, garantindo uma fantástica compatibilidade com motherboards populares.</p>
        <h2>2. Desempenho e Especificações Técnicas</h2>
        <p>Contando com clocks estáveis de base em {item['base']} e picos de overclock automático (Boost) de até <strong>{item['boost']}</strong>, o chip gerencia com mestria cargas de trabalho simultâneas graças à tecnologia de multithreading. O seu consumo energético é contido, operando com um limite térmico de <strong>{item['tdp']}</strong>.</p>
    """

    # CAPTURA AS SUAS NOTAS REAIS DO DICIONÁRIO. SE NÃO EXISTIR, DEFINE 5.0 TEMPORARIAMENTE
    nota_jogos_real = item.get("jogos", 5.0)
    nota_trabalho_real = item.get("trabalho", 5.0)

    cpu_obj = {
        "id": index,
        "nome": item["nome"],
        "marca": "amd",
        "categoria": "border-amd",
        "detalhe": detalhe,
        "selo": selo,
        "corSelo": cor_selo,
        "cores": item["c"],
        "threads": item["t"],
        "tdp": item["tdp"],
        "freqBase": item["base"],
        "freqBoost": item["boost"],
        "codinome": item["cod"],
        "soquete": gen_meta["soquete"],
        "video": item["v"],
        "analise": analise,
        "fabricante": "AMD",
        "familia": f"{familia_txt} ({gen_meta['serie']})",
        "litografia": f"{gen_meta['litografia']} (TSMC)",
        "memoria": gen_meta["memoria"],
        "analiseCompleta": analise_completa.strip(),
        
        # INJETANDO AS SUAS NOTAS DEFINIDAS MANUALMENTE NO ARQUIVO DE SAÍDA DADOS.JS
        "notaJogos": nota_jogos_real,
        "notaTrabalho": nota_trabalho_real,
        
        "geracao": f"{g}ª Geração",
        "arquitetura": gen_meta["arquitetura"],
        "dataLancamento": gen_meta["ano"],
        "segmento": "Desktop",
        "cacheL1": gen_meta["l1"],
        "cacheL2": gen_meta["l2"],
        "cacheL3": cache_l3,
        "chipsets": "A320, B350, X370, B450, X470, B550, X570" if g in ["3", "4", "5"] else "A320, B350, X370, B450, X470",
        "pcieLines": pcie_final,
        "canaisMemoria": gen_meta["canais"],
        "freqMaxMemoria": gen_meta["memoria"],
        "suporteEcc": gen_meta["ecc"],
        "igpuFreq": "N/A" if item["v"] == "Não possui" else "1100 MHz - 2000 MHz",
        "tempMax": "95°C",
        "instrucoes": "x86-64, MMX, SSE, SSE2, SSE3, SSSE3, SSE4.1, SSE4.2, SSE4A, AMD-V, AES, AVX, AVX2, FMA3, SHA"
    }
    processadores_finais.append(cpu_obj)

# Manter o Intel Core Ultra no final (com notas estáticas limpas também)
processadores_finais.append({
    "id": len(processadores_finais),
    "nome": "Intel Core Ultra 5 225F", "marca": "intel", "categoria": "border-intel",
    "detalhe": "Nova geração Intel Arrow Lake", "selo": "Lançamento 🚀", "corSelo": "bg-azul",
    "cores": "10", "threads": "10", "tdp": "65 W", "freqBase": "3.3 GHz", "freqBoost": "4.9 GHz",
    "codinome": "Arrow Lake-S", "soquete": "LGA1851", "video": "Não possui",
    "analise": "O Intel Core Ultra 5 225F representa a nova arquitetura da Intel focada em altíssima eficiência energética e inteligência artificial.",
    "fabricante": "Intel", "familia": "Core Ultra 5 (Série 2)", "litografia": "3 nm (TSMC N3B)", "memoria": "DDR5-5600",
    "analiseCompleta": "<h2>Análise do Core Ultra 5 225F</h2><p>A nova aposta da Intel focada em eficiência energética.</p>",
    
    # Notas manuais da Intel
    "notaJogos": 7.8,
    "notaTrabalho": 8.2,

    "geracao": "Série 2", "arquitetura": "Arrow Lake", "dataLancamento": "2024", "segmento": "Desktop",
    "cacheL1": "80KB por P-core", "cacheL2": "3MB por P-core", "cacheL3": "26 MB", "chipsets": "Z890, B860, H810",
    "pcieLines": "PCIe 5.0", "canaisMemoria": "Dual Channel", "freqMaxMemoria": "DDR5-5600", "suporteEcc": "Não",
    "igpuFreq": "N/A", "tempMax": "105°C", "instrucoes": "x86-64, AVX2, AVX-VNNI, AES, SHA"
})

with open("dados.js", "w", encoding="utf-8") as f:
    f.write(f"const listaDeCpus = {json.dumps(processadores_finais, ensure_ascii=False, indent=4)};")

print("✨ Incrível! O ficheiro 'dados.js' foi gerado com sucesso!")