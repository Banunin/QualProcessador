import json
import os
import re

# 1. TENTAR LER E CARREGAR OS DADOS ATUAIS (SE O FICHEIRO EXISTIR)
dados_existentes = {}
if os.path.exists("dados.js"):
    try:
        with open("dados.js", "r", encoding="utf-8") as f:
            conteudo = f.read()
            json_puro = re.sub(r'^\s*const\s+\w+\s*=\s*', '', conteudo)
            json_puro = json_puro.strip().rstrip(';')
            
            cpus_carregadas = json.loads(json_puro)
            for cpu in cpus_carregadas:
                dados_existentes[cpu["nome"]] = cpu
        print(f"📂 Sucesso: Carregados {len(dados_existentes)} processadores já existentes do 'dados.js'.")
    except Exception as e:
        print(f"⚠️ Aviso ao ler 'dados.js': {e}")

# Definição das matrizes arquitetónicas (AMD e INTEL) para automação de metadados
info_geracoes = {
    # AMD
    "A1": {"arquitetura": "Zen", "litografia": "14 nm", "soquete": "AM4", "memoria": "DDR4-2667", "serie": "Série 1000", "epoca": "pioneira da viragem da AMD", "ano": "2017", "pcie": "PCIe 3.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel"},
    "A2": {"arquitetura": "Zen+", "litografia": "12 nm", "soquete": "AM4", "memoria": "DDR4-2933", "serie": "Série 2000", "epoca": "de refinamento de latências e clocks superiores", "ano": "2018", "pcie": "PCIe 3.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel"},
    "A3": {"arquitetura": "Zen 2", "litografia": "7 nm", "soquete": "AM4", "memoria": "DDR4-3200", "serie": "Série 3000", "epoca": "revolucionária em chiplets e salto massivo de IPC", "ano": "2019", "pcie": "PCIe 4.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel"},
    "A4": {"arquitetura": "Zen 2", "litografia": "7 nm", "soquete": "AM4", "memoria": "DDR4-3200", "serie": "Série 4000 (APU)", "epoca": "monolítica focada em gráficos integrados fluidos", "ano": "2020", "pcie": "PCIe 3.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel"},
    "A5": {"arquitetura": "Zen 3", "litografia": "7 nm", "soquete": "AM4", "memoria": "DDR4-3200", "serie": "Série 5000", "epoca": "de consagração máxima da arquitetura AM4", "ano": "2020", "pcie": "PCIe 4.0", "l1": "32 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel"},
    
    # INTEL
    "I1": {"arquitetura": "Nehalem / Westmere", "litografia": "45 nm", "soquete": "LGA1156", "memoria": "DDR3-1066/1333", "serie": "1ª Geração", "epoca": "de introdução da marca Core i3, i5 e i7", "ano": "2009", "pcie": "PCIe 2.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I2": {"arquitetura": "Sandy Bridge", "litografia": "32 nm", "soquete": "LGA1155", "memoria": "DDR3-1333", "serie": "2ª Geração", "epoca": "revolucionária em overclock e vídeo integrado", "ano": "2011", "pcie": "PCIe 2.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I3": {"arquitetura": "Ivy Bridge", "litografia": "22 nm", "soquete": "LGA1155", "memoria": "DDR3-1600", "serie": "3ª Geração", "epoca": "de introdução dos transístores Tri-Gate (3D)", "ano": "2012", "pcie": "PCIe 3.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I4": {"arquitetura": "Haswell", "litografia": "22 nm", "soquete": "LGA1150", "memoria": "DDR3/DDR3L-1600", "serie": "4ª Geração", "epoca": "focada em forte eficiência energética", "ano": "2013", "pcie": "PCIe 3.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I5": {"arquitetura": "Broadwell", "litografia": "14 nm", "soquete": "LGA1150", "memoria": "DDR3L-1600", "serie": "5ª Geração", "epoca": "de transição mobile e memórias eDRAM", "ano": "2015", "pcie": "PCIe 3.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I6": {"arquitetura": "Skylake", "litografia": "14 nm", "soquete": "LGA1151", "memoria": "DDR4-2133", "serie": "6ª Geração", "epoca": "de introdução massiva do padrão DDR4", "ano": "2015", "pcie": "PCIe 3.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I7": {"arquitetura": "Kaby Lake", "litografia": "14 nm+", "soquete": "LGA1151", "memoria": "DDR4-2400", "serie": "7ª Geração", "epoca": "de refinamento de clocks e descodificação 4K", "ano": "2017", "pcie": "PCIe 3.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I8": {"arquitetura": "Coffee Lake", "litografia": "14 nm++", "soquete": "LGA1151-V2", "memoria": "DDR4-2666", "serie": "8ª Geração", "epoca": "de expansão de núcleos (6 cores no i7)", "ano": "2017", "pcie": "PCIe 3.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I9": {"arquitetura": "Coffee Lake Refresh", "litografia": "14 nm++", "soquete": "LGA1151-V2", "memoria": "DDR4-2666", "serie": "9ª Geração", "epoca": "de estreia da linha Core i9 em desktops", "ano": "2018", "pcie": "PCIe 3.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I10": {"arquitetura": "Comet Lake", "litografia": "14 nm+++", "soquete": "LGA1200", "memoria": "DDR4-2933", "serie": "10ª Geração", "epoca": "generalizada com Hyper-Threading em todas as gamas", "ano": "2020", "pcie": "PCIe 3.0", "l1": "64 KB por núcleo", "l2": "256 KB por núcleo", "canais": "Dual Channel"},
    "I11": {"arquitetura": "Rocket Lake", "litografia": "14 nm (Cypress Cove)", "soquete": "LGA1200", "memoria": "DDR4-3200", "serie": "11ª Geração", "epoca": "de introdução do padrão PCIe 4.0 na Intel", "ano": "2021", "pcie": "PCIe 4.0", "l1": "80 KB por núcleo", "l2": "512 KB por núcleo", "canais": "Dual Channel"},
    "I12": {"arquitetura": "Alder Lake", "litografia": "Intel 7 (10 nm)", "soquete": "LGA1700", "memoria": "DDR5-4800 / DDR4-3200", "serie": "12ª Geração", "epoca": "híbrida inovadora com Performance e Efficient Cores", "ano": "2021", "pcie": "PCIe 5.0", "l1": "80 KB por P-core", "l2": "1.25 MB por P-core", "canais": "Dual Channel"},
    "I13": {"arquitetura": "Raptor Lake", "litografia": "Intel 7 (10 nm)", "soquete": "LGA1700", "memoria": "DDR5-5600 / DDR4-3200", "serie": "13ª Geração", "epoca": "de expansão massiva de cache e clocks elevados", "ano": "2022", "pcie": "PCIe 5.0", "l1": "80 KB por P-core", "l2": "2 MB por P-core", "canais": "Dual Channel"},
    "I14": {"arquitetura": "Raptor Lake Refresh", "litografia": "Intel 7 (10 nm)", "soquete": "LGA1700", "memoria": "DDR5-5600 / DDR4-3200", "serie": "14ª Geração", "epoca": "de refinamento extremo da plataforma LGA1700", "ano": "2023", "pcie": "PCIe 5.0", "l1": "80 KB por P-core", "l2": "2 MB por P-core", "canais": "Dual Channel"},
}

lista_bruta = [
    # --- PROCESSADORES AMD ---
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 3 1200", "c": "4", "t": "4", "tdp": "65 W", "base": "3.1 GHz", "boost": "3.4 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 3 1300X", "c": "4", "t": "4", "tdp": "65 W", "base": "3.5 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 5 1400", "c": "4", "t": "8", "tdp": "65 W", "base": "3.2 GHz", "boost": "3.4 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 5 1500X", "c": "4", "t": "8", "tdp": "65 W", "base": "3.5 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 5 1600", "c": "6", "t": "12", "tdp": "65 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 5 1600X", "c": "6", "t": "12", "tdp": "95 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 7 1700", "c": "8", "t": "16", "tdp": "65 W", "base": "3.0 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 7 1700X", "c": "8", "t": "16", "tdp": "95 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A1", "nome": "AMD Ryzen 7 1800X", "c": "8", "t": "16", "tdp": "95 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Summit Ridge"},
    {"m": "amd", "gen": "A2", "nome": "AMD Ryzen 3 2200G", "c": "4", "t": "4", "tdp": "65 W", "base": "3.5 GHz", "boost": "3.7 GHz", "v": "Radeon RX Vega 8", "cod": "Raven Ridge"},
    {"m": "amd", "gen": "A2", "nome": "AMD Ryzen 5 2400G", "c": "4", "t": "8", "tdp": "65 W", "base": "3.6 GHz", "boost": "3.9 GHz", "v": "Radeon RX Vega 11", "cod": "Raven Ridge"},
    {"m": "amd", "gen": "A2", "nome": "AMD Ryzen 5 2600", "c": "6", "t": "12", "tdp": "65 W", "base": "3.4 GHz", "boost": "3.9 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"m": "amd", "gen": "A2", "nome": "AMD Ryzen 5 2600X", "c": "6", "t": "12", "tdp": "95 W", "base": "3.6 GHz", "boost": "4.2 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"m": "amd", "gen": "A2", "nome": "AMD Ryzen 7 2700", "c": "8", "t": "16", "tdp": "65 W", "base": "3.2 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"m": "amd", "gen": "A2", "nome": "AMD Ryzen 7 2700X", "c": "8", "t": "16", "tdp": "105 W", "base": "3.7 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Pinnacle Ridge"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 3 3100", "c": "4", "t": "8", "tdp": "65 W", "base": "3.6 GHz", "boost": "3.9 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 3 3300X", "c": "4", "t": "8", "tdp": "65 W", "base": "3.8 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 5 3400G", "c": "4", "t": "8", "tdp": "65 W", "base": "3.7 GHz", "boost": "4.2 GHz", "v": "Radeon RX Vega 11", "cod": "Picasso"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 5 3500X", "c": "6", "t": "6", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 5 3600", "c": "6", "t": "12", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.2 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 5 3600X", "c": "6", "t": "12", "tdp": "95 W", "base": "3.8 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 5 3600XT", "c": "6", "t": "12", "tdp": "95 W", "base": "3.8 GHz", "boost": "4.5 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 7 3700X", "c": "8", "t": "16", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 7 3800X", "c": "8", "t": "16", "tdp": "105 W", "base": "3.9 GHz", "boost": "4.5 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 7 3800XT", "c": "8", "t": "16", "tdp": "105 W", "base": "3.9 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 9 3900", "c": "12", "t": "24", "tdp": "65 W", "base": "3.1 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 9 3900X", "c": "12", "t": "24", "tdp": "105 W", "base": "3.8 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 9 3900XT", "c": "12", "t": "24", "tdp": "105 W", "base": "3.8 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A3", "nome": "AMD Ryzen 9 3950X", "c": "16", "t": "32", "tdp": "105 W", "base": "3.5 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Matisse"},
    {"m": "amd", "gen": "A4", "nome": "AMD Ryzen 3 4100", "c": "4", "t": "8", "tdp": "65 W", "base": "3.8 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Renoir"},
    {"m": "amd", "gen": "A4", "nome": "AMD Ryzen 5 4500", "c": "6", "t": "12", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Renoir"},
    {"m": "amd", "gen": "A4", "nome": "AMD Ryzen 5 4600G", "c": "6", "t": "12", "tdp": "65 W", "base": "3.7 GHz", "boost": "4.2 GHz", "v": "Radeon Graphics", "cod": "Renoir"},
    {"m": "amd", "gen": "A4", "nome": "AMD Ryzen 7 4700G", "c": "8", "t": "16", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.4 GHz", "v": "Radeon Graphics", "cod": "Renoir"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 3 5300G", "c": "4", "t": "8", "tdp": "65 W", "base": "4.0 GHz", "boost": "4.2 GHz", "v": "Radeon Graphics", "cod": "Cezanne"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 5 5500", "c": "6", "t": "12", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.2 GHz", "v": "Não possui", "cod": "Cezanne"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 5 5600", "c": "6", "t": "12", "tdp": "65 W", "base": "3.5 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 5 5600G", "c": "6", "t": "12", "tdp": "65 W", "base": "3.9 GHz", "boost": "4.4 GHz", "v": "Radeon Graphics", "cod": "Cezanne"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 5 5600GE", "c": "6", "t": "12", "tdp": "35 W", "base": "3.4 GHz", "boost": "4.4 GHz", "v": "Radeon Graphics", "cod": "Cezanne"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 5 5600X", "c": "6", "t": "12", "tdp": "65 W", "base": "3.7 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5700", "c": "8", "t": "16", "tdp": "65 W", "base": "3.7 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Cezanne"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5700G", "c": "8", "t": "16", "tdp": "65 W", "base": "3.8 GHz", "boost": "4.6 GHz", "v": "Radeon Graphics", "cod": "Cezanne"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5700GE", "c": "8", "t": "16", "tdp": "35 W", "base": "3.2 GHz", "boost": "4.6 GHz", "v": "Radeon Graphics", "cod": "Cezanne"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5700X", "c": "8", "t": "16", "tdp": "65 W", "base": "3.4 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5700X3D", "c": "8", "t": "16", "tdp": "105 W", "base": "3.0 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5800", "c": "8", "t": "16", "tdp": "65 W", "base": "3.4 GHz", "boost": "4.6 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5800X", "c": "8", "t": "16", "tdp": "105 W", "base": "3.8 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5800XT", "c": "8", "t": "16", "tdp": "105 W", "base": "3.8 GHz", "boost": "4.8 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 7 5800X3D", "c": "8", "t": "16", "tdp": "105 W", "base": "3.4 GHz", "boost": "4.5 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 9 5900", "c": "12", "t": "24", "tdp": "65 W", "base": "3.0 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 9 5900X", "c": "12", "t": "24", "tdp": "105 W", "base": "3.7 GHz", "boost": "4.8 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 9 5900XT", "c": "16", "t": "32", "tdp": "105 W", "base": "3.3 GHz", "boost": "4.8 GHz", "v": "Não possui", "cod": "Vermeer"},
    {"m": "amd", "gen": "A5", "nome": "AMD Ryzen 9 5950X", "c": "16", "t": "32", "tdp": "105 W", "base": "3.4 GHz", "boost": "4.9 GHz", "v": "Não possui", "cod": "Vermeer"},

    # --- PROCESSADORES INTEL ---
    # LGA 1156 (1ª Geração)
    {"m": "intel", "gen": "I1", "nome": "Intel Xeon X3430", "c": "4", "t": "4", "tdp": "95 W", "base": "2.4 GHz", "boost": "2.8 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Xeon X3440", "c": "4", "t": "8", "tdp": "95 W", "base": "2.53 GHz", "boost": "2.93 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Xeon X3450", "c": "4", "t": "8", "tdp": "95 W", "base": "2.66 GHz", "boost": "3.2 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Xeon X3460", "c": "4", "t": "8", "tdp": "95 W", "base": "2.8 GHz", "boost": "3.46 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Xeon X3470", "c": "4", "t": "8", "tdp": "95 W", "base": "2.93 GHz", "boost": "3.6 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Xeon X3480", "c": "4", "t": "8", "tdp": "95 W", "base": "3.06 GHz", "boost": "3.73 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i3-530", "c": "2", "t": "4", "tdp": "73 W", "base": "2.93 GHz", "boost": "2.93 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i3-540", "c": "2", "t": "4", "tdp": "73 W", "base": "3.06 GHz", "boost": "3.06 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i3-550", "c": "2", "t": "4", "tdp": "73 W", "base": "3.2 GHz", "boost": "3.2 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i3-560", "c": "2", "t": "4", "tdp": "73 W", "base": "3.33 GHz", "boost": "3.33 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i5-650", "c": "2", "t": "4", "tdp": "73 W", "base": "3.2 GHz", "boost": "3.46 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i5-655K", "c": "2", "t": "4", "tdp": "73 W", "base": "3.2 GHz", "boost": "3.46 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i5-660", "c": "2", "t": "4", "tdp": "73 W", "base": "3.33 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i5-661", "c": "2", "t": "4", "tdp": "87 W", "base": "3.33 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i5-670", "c": "2", "t": "4", "tdp": "73 W", "base": "3.46 GHz", "boost": "3.73 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i5-680", "c": "2", "t": "4", "tdp": "73 W", "base": "3.6 GHz", "boost": "3.86 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i5-750", "c": "4", "t": "4", "tdp": "95 W", "base": "2.66 GHz", "boost": "3.2 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i5-760", "c": "4", "t": "4", "tdp": "95 W", "base": "2.8 GHz", "boost": "3.33 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i7-860", "c": "4", "t": "8", "tdp": "95 W", "base": "2.8 GHz", "boost": "3.46 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i7-870", "c": "4", "t": "8", "tdp": "95 W", "base": "2.93 GHz", "boost": "3.6 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i7-875K", "c": "4", "t": "8", "tdp": "95 W", "base": "2.93 GHz", "boost": "3.6 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Core i7-880", "c": "4", "t": "8", "tdp": "95 W", "base": "3.06 GHz", "boost": "3.73 GHz", "v": "Não possui", "cod": "Lynnfield"},
    {"m": "intel", "gen": "I1", "nome": "Intel Pentium G6950", "c": "2", "t": "2", "tdp": "73 W", "base": "2.8 GHz", "boost": "2.8 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},
    {"m": "intel", "gen": "I1", "nome": "Intel Celeron G1101", "c": "2", "t": "2", "tdp": "73 W", "base": "2.26 GHz", "boost": "2.26 GHz", "v": "Intel HD Graphics", "cod": "Clarkdale"},

    # LGA 1155 (2ª Geração - Sandy Bridge)
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1220", "c": "4", "t": "4", "tdp": "80 W", "base": "3.1 GHz", "boost": "3.4 GHz", "v": "Não possui", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1225", "c": "4", "t": "4", "tdp": "95 W", "base": "3.1 GHz", "boost": "3.4 GHz", "v": "Intel HD Graphics P3000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1230", "c": "4", "t": "8", "tdp": "80 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Não possui", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1235", "c": "4", "t": "8", "tdp": "95 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics P3000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1240", "c": "4", "t": "8", "tdp": "80 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1245", "c": "4", "t": "8", "tdp": "95 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics P3000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1270", "c": "4", "t": "8", "tdp": "80 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Não possui", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1275", "c": "4", "t": "8", "tdp": "95 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics P3000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1280", "c": "4", "t": "8", "tdp": "95 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Não possui", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Xeon E3-1290", "c": "4", "t": "8", "tdp": "95 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i3-2100", "c": "2", "t": "4", "tdp": "65 W", "base": "3.1 GHz", "boost": "3.1 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i3-2120", "c": "2", "t": "4", "tdp": "65 W", "base": "3.3 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i3-2125", "c": "2", "t": "4", "tdp": "65 W", "base": "3.3 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics 3000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i3-2130", "c": "2", "t": "4", "tdp": "65 W", "base": "3.4 GHz", "boost": "3.4 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i5-2300", "c": "4", "t": "4", "tdp": "95 W", "base": "2.8 GHz", "boost": "3.1 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i5-2310", "c": "4", "t": "4", "tdp": "95 W", "base": "2.9 GHz", "boost": "3.2 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i5-2320", "c": "4", "t": "4", "tdp": "95 W", "base": "3.0 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i5-2380P", "c": "4", "t": "4", "tdp": "95 W", "base": "3.1 GHz", "boost": "3.4 GHz", "v": "Não possui", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i5-2400", "c": "4", "t": "4", "tdp": "95 W", "base": "3.1 GHz", "boost": "3.4 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i5-2450P", "c": "4", "t": "4", "tdp": "95 W", "base": "3.2 GHz", "boost": "3.5 GHz", "v": "Não possui", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i5-2500", "c": "4", "t": "4", "tdp": "95 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i5-2500K", "c": "4", "t": "4", "tdp": "95 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics 3000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i7-2600", "c": "4", "t": "8", "tdp": "95 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics 2000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i7-2600K", "c": "4", "t": "8", "tdp": "95 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics 3000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Core i7-2700K", "c": "4", "t": "8", "tdp": "95 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics 3000", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Pentium G620", "c": "2", "t": "2", "tdp": "65 W", "base": "2.6 GHz", "boost": "2.6 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Pentium G630", "c": "2", "t": "2", "tdp": "65 W", "base": "2.7 GHz", "boost": "2.7 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Pentium G640", "c": "2", "t": "2", "tdp": "65 W", "base": "2.8 GHz", "boost": "2.8 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Pentium G645", "c": "2", "t": "2", "tdp": "65 W", "base": "2.9 GHz", "boost": "2.9 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Pentium G840", "c": "2", "t": "2", "tdp": "65 W", "base": "2.8 GHz", "boost": "2.8 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Pentium G850", "c": "2", "t": "2", "tdp": "65 W", "base": "2.9 GHz", "boost": "2.9 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Pentium G860", "c": "2", "t": "2", "tdp": "65 W", "base": "3.0 GHz", "boost": "3.0 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Pentium G870", "c": "2", "t": "2", "tdp": "65 W", "base": "3.1 GHz", "boost": "3.1 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Celeron G440", "c": "1", "t": "1", "tdp": "35 W", "base": "1.6 GHz", "boost": "1.6 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Celeron G530", "c": "2", "t": "2", "tdp": "65 W", "base": "2.4 GHz", "boost": "2.4 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Celeron G540", "c": "2", "t": "2", "tdp": "65 W", "base": "2.5 GHz", "boost": "2.5 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Celeron G550", "c": "2", "t": "2", "tdp": "65 W", "base": "2.6 GHz", "boost": "2.6 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},
    {"m": "intel", "gen": "I2", "nome": "Intel Celeron G555", "c": "2", "t": "2", "tdp": "65 W", "base": "2.7 GHz", "boost": "2.7 GHz", "v": "Intel HD Graphics", "cod": "Sandy Bridge"},

    # LGA 1155 (3ª Geração - Ivy Bridge)
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1220 V2", "c": "4", "t": "4", "tdp": "69 W", "base": "3.1 GHz", "boost": "3.5 GHz", "v": "Não possui", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1225 V2", "c": "4", "t": "4", "tdp": "77 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics P4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1230 V2", "c": "4", "t": "8", "tdp": "69 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1235 V2", "c": "4", "t": "8", "tdp": "77 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics P4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1240 V2", "c": "4", "t": "8", "tdp": "69 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Não possui", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1245 V2", "c": "4", "t": "8", "tdp": "77 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics P4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1270 V2", "c": "4", "t": "8", "tdp": "69 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Não possui", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1275 V2", "c": "4", "t": "8", "tdp": "77 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics P4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1280 V2", "c": "4", "t": "8", "tdp": "69 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Xeon E3-1290 V2", "c": "4", "t": "8", "tdp": "87 W", "base": "3.7 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i3-3220", "c": "2", "t": "4", "tdp": "55 W", "base": "3.3 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i3-3225", "c": "2", "t": "4", "tdp": "55 W", "base": "3.3 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics 4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i3-3240", "c": "2", "t": "4", "tdp": "55 W", "base": "3.4 GHz", "boost": "3.4 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i3-3245", "c": "2", "t": "4", "tdp": "55 W", "base": "3.4 GHz", "boost": "3.4 GHz", "v": "Intel HD Graphics 4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i3-3250", "c": "2", "t": "4", "tdp": "55 W", "base": "3.5 GHz", "boost": "3.5 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i5-3330", "c": "4", "t": "4", "tdp": "77 W", "base": "3.0 GHz", "boost": "3.2 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i5-3340", "c": "4", "t": "4", "tdp": "77 W", "base": "3.1 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i5-3450", "c": "4", "t": "4", "tdp": "77 W", "base": "3.1 GHz", "boost": "3.5 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i5-3470", "c": "4", "t": "4", "tdp": "77 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i5-3550", "c": "4", "t": "4", "tdp": "77 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i5-3570", "c": "4", "t": "4", "tdp": "77 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics 2500", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i5-3570K", "c": "4", "t": "4", "tdp": "77 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics 4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i7-3770", "c": "4", "t": "8", "tdp": "77 W", "base": "3.4 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics 4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Core i7-3770K", "c": "4", "t": "8", "tdp": "77 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics 4000", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Pentium G2010", "c": "2", "t": "2", "tdp": "55 W", "base": "2.8 GHz", "boost": "2.8 GHz", "v": "Intel HD Graphics", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Pentium G2020", "c": "2", "t": "2", "tdp": "55 W", "base": "2.9 GHz", "boost": "2.9 GHz", "v": "Intel HD Graphics", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Pentium G2030", "c": "2", "t": "2", "tdp": "55 W", "base": "3.0 GHz", "boost": "3.0 GHz", "v": "Intel HD Graphics", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Pentium G2120", "c": "2", "t": "2", "tdp": "55 W", "base": "3.1 GHz", "boost": "3.1 GHz", "v": "Intel HD Graphics", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Pentium G2130", "c": "2", "t": "2", "tdp": "55 W", "base": "3.2 GHz", "boost": "3.2 GHz", "v": "Intel HD Graphics", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Celeron G1610", "c": "2", "t": "2", "tdp": "55 W", "base": "2.6 GHz", "boost": "2.6 GHz", "v": "Intel HD Graphics", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Celeron G1620", "c": "2", "t": "2", "tdp": "55 W", "base": "2.7 GHz", "boost": "2.7 GHz", "v": "Intel HD Graphics", "cod": "Ivy Bridge"},
    {"m": "intel", "gen": "I3", "nome": "Intel Celeron G1630", "c": "2", "t": "2", "tdp": "55 W", "base": "2.8 GHz", "boost": "2.8 GHz", "v": "Intel HD Graphics", "cod": "Ivy Bridge"},

    # LGA 1150 (4ª Geração - Haswell)
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1220 V3", "c": "4", "t": "4", "tdp": "80 W", "base": "3.1 GHz", "boost": "3.5 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1225 V3", "c": "4", "t": "4", "tdp": "84 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics P4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1230 V3", "c": "4", "t": "8", "tdp": "80 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1231 V3", "c": "4", "t": "8", "tdp": "80 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1240 V3", "c": "4", "t": "8", "tdp": "80 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1241 V3", "c": "4", "t": "8", "tdp": "80 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1245 V3", "c": "4", "t": "8", "tdp": "84 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics P4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1270 V3", "c": "4", "t": "8", "tdp": "80 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1271 V3", "c": "4", "t": "8", "tdp": "80 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1275 V3", "c": "4", "t": "8", "tdp": "84 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics P4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1280 V3", "c": "4", "t": "8", "tdp": "82 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Xeon E3-1281 V3", "c": "4", "t": "8", "tdp": "82 W", "base": "3.7 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4130", "c": "2", "t": "4", "tdp": "54 W", "base": "3.4 GHz", "boost": "3.4 GHz", "v": "Intel HD Graphics 4400", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4150", "c": "2", "t": "4", "tdp": "54 W", "base": "3.5 GHz", "boost": "3.5 GHz", "v": "Intel HD Graphics 4400", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4160", "c": "2", "t": "4", "tdp": "54 W", "base": "3.6 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics 4400", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4170", "c": "2", "t": "4", "tdp": "54 W", "base": "3.7 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics 4400", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4330", "c": "2", "t": "4", "tdp": "54 W", "base": "3.5 GHz", "boost": "3.5 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4340", "c": "2", "t": "4", "tdp": "54 W", "base": "3.6 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4350", "c": "2", "t": "4", "tdp": "55 W", "base": "3.6 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4360", "c": "2", "t": "4", "tdp": "54 W", "base": "3.7 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i3-4370", "c": "2", "t": "4", "tdp": "54 W", "base": "3.8 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4430", "c": "4", "t": "4", "tdp": "84 W", "base": "3.0 GHz", "boost": "3.2 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4440", "c": "4", "t": "4", "tdp": "84 W", "base": "3.1 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4460", "c": "4", "t": "4", "tdp": "84 W", "base": "3.2 GHz", "boost": "3.4 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4570", "c": "4", "t": "4", "tdp": "84 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4590", "c": "4", "t": "4", "tdp": "84 W", "base": "3.3 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4670", "c": "4", "t": "4", "tdp": "84 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4670K", "c": "4", "t": "4", "tdp": "84 W", "base": "3.4 GHz", "boost": "3.8 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4690", "c": "4", "t": "4", "tdp": "84 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i5-4690K", "c": "4", "t": "4", "tdp": "88 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i7-4770", "c": "4", "t": "8", "tdp": "84 W", "base": "3.4 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i7-4770K", "c": "4", "t": "8", "tdp": "84 W", "base": "3.5 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i7-4790", "c": "4", "t": "8", "tdp": "84 W", "base": "3.6 GHz", "boost": "4.0 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Core i7-4790K", "c": "4", "t": "8", "tdp": "88 W", "base": "4.0 GHz", "boost": "4.4 GHz", "v": "Intel HD Graphics 4600", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3220", "c": "2", "t": "2", "tdp": "53 W", "base": "3.0 GHz", "boost": "3.0 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3240", "c": "2", "t": "2", "tdp": "53 W", "base": "3.1 GHz", "boost": "3.1 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3250", "c": "2", "t": "2", "tdp": "53 W", "base": "3.2 GHz", "boost": "3.2 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3258", "c": "2", "t": "2", "tdp": "53 W", "base": "3.2 GHz", "boost": "3.2 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3260", "c": "2", "t": "2", "tdp": "53 W", "base": "3.3 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3420", "c": "2", "t": "2", "tdp": "53 W", "base": "3.2 GHz", "boost": "3.2 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3440", "c": "2", "t": "2", "tdp": "53 W", "base": "3.3 GHz", "boost": "3.3 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3450", "c": "2", "t": "2", "tdp": "53 W", "base": "3.4 GHz", "boost": "3.4 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Pentium G3460", "c": "2", "t": "2", "tdp": "53 W", "base": "3.5 GHz", "boost": "3.5 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Celeron G1820", "c": "2", "t": "2", "tdp": "53 W", "base": "2.7 GHz", "boost": "2.7 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Celeron G1830", "c": "2", "t": "2", "tdp": "53 W", "base": "2.8 GHz", "boost": "2.8 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Celeron G1840", "c": "2", "t": "2", "tdp": "53 W", "base": "2.8 GHz", "boost": "2.8 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},
    {"m": "intel", "gen": "I4", "nome": "Intel Celeron G1850", "c": "2", "t": "2", "tdp": "53 W", "base": "2.9 GHz", "boost": "2.9 GHz", "v": "Intel HD Graphics", "cod": "Haswell"},

    # LGA 1150 (5ª Geração)
    {"m": "intel", "gen": "I5", "nome": "Intel Xeon E3-1285 V4", "c": "4", "t": "8", "tdp": "95 W", "base": "3.5 GHz", "boost": "3.8 GHz", "v": "Intel Iris Pro Graphics P6300", "cod": "Broadwell"},

    # LGA 1151 (6ª Geração)
    {"m": "intel", "gen": "I6", "nome": "Intel Core i3-6100", "c": "2", "t": "4", "tdp": "51 W", "base": "3.7 GHz", "boost": "3.7 GHz", "v": "Intel HD Graphics 530", "cod": "Skylake"},
    {"m": "intel", "gen": "I6", "nome": "Intel Core i5-6500", "c": "4", "t": "4", "tdp": "65 W", "base": "3.2 GHz", "boost": "3.6 GHz", "v": "Intel HD Graphics 530", "cod": "Skylake"},
    {"m": "intel", "gen": "I6", "nome": "Intel Core i7-6700K", "c": "4", "t": "8", "tdp": "91 W", "base": "4.0 GHz", "boost": "4.2 GHz", "v": "Intel HD Graphics 530", "cod": "Skylake"},

    # LGA 1151 (7ª Geração)
    {"m": "intel", "gen": "I7", "nome": "Intel Core i3-7100", "c": "2", "t": "4", "tdp": "51 W", "base": "3.9 GHz", "boost": "3.9 GHz", "v": "Intel HD Graphics 630", "cod": "Kaby Lake"},
    {"m": "intel", "gen": "I7", "nome": "Intel Core i5-7400", "c": "4", "t": "4", "tdp": "65 W", "base": "3.0 GHz", "boost": "3.5 GHz", "v": "Intel HD Graphics 630", "cod": "Kaby Lake"},
    {"m": "intel", "gen": "I7", "nome": "Intel Core i7-7700K", "c": "4", "t": "8", "tdp": "91 W", "base": "4.2 GHz", "boost": "4.5 GHz", "v": "Intel HD Graphics 630", "cod": "Kaby Lake"},
    {"m": "intel", "gen": "I7", "nome": "Intel Pentium G4560", "c": "2", "t": "4", "tdp": "54 W", "base": "3.5 GHz", "boost": "3.5 GHz", "v": "Intel HD Graphics 610", "cod": "Kaby Lake"},

    # LGA 1151 (8ª Geração)
    {"m": "intel", "gen": "I8", "nome": "Intel Core i3-8100", "c": "4", "t": "4", "tdp": "65 W", "base": "3.6 GHz", "boost": "3.6 GHz", "v": "Intel UHD Graphics 630", "cod": "Coffee Lake"},
    {"m": "intel", "gen": "I8", "nome": "Intel Core i5-8400", "c": "6", "t": "6", "tdp": "65 W", "base": "2.8 GHz", "boost": "4.0 GHz", "v": "Intel UHD Graphics 630", "cod": "Coffee Lake"},
    {"m": "intel", "gen": "I8", "nome": "Intel Core i7-8700K", "c": "6", "t": "12", "tdp": "95 W", "base": "3.7 GHz", "boost": "4.7 GHz", "v": "Intel UHD Graphics 630", "cod": "Coffee Lake"},

    # LGA 1151 (9ª Geração)
    {"m": "intel", "gen": "I9", "nome": "Intel Core i5-9400F", "c": "6", "t": "6", "tdp": "65 W", "base": "2.9 GHz", "boost": "4.1 GHz", "v": "Não possui", "cod": "Coffee Lake Refresh"},
    {"m": "intel", "gen": "I9", "nome": "Intel Core i7-9700K", "c": "8", "t": "8", "tdp": "95 W", "base": "3.6 GHz", "boost": "4.9 GHz", "v": "Intel UHD Graphics 630", "cod": "Coffee Lake Refresh"},
    {"m": "intel", "gen": "I9", "nome": "Intel Core i9-9900K", "c": "8", "t": "16", "tdp": "95 W", "base": "3.6 GHz", "boost": "5.0 GHz", "v": "Intel UHD Graphics 630", "cod": "Coffee Lake Refresh"},

    # LGA 1200 (10ª Geração)
    {"m": "intel", "gen": "I10", "nome": "Intel Core i3-10100F", "c": "4", "t": "8", "tdp": "65 W", "base": "3.6 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Comet Lake"},
    {"m": "intel", "gen": "I10", "nome": "Intel Core i5-10400F", "c": "6", "t": "12", "tdp": "65 W", "base": "2.9 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Comet Lake"},
    {"m": "intel", "gen": "I10", "nome": "Intel Core i7-10700K", "c": "8", "t": "16", "tdp": "125 W", "base": "3.8 GHz", "boost": "5.1 GHz", "v": "Intel UHD Graphics 630", "cod": "Comet Lake"},

    # LGA 1200 (11ª Geração)
    {"m": "intel", "gen": "I11", "nome": "Intel Core i5-11400F", "c": "6", "t": "12", "tdp": "65 W", "base": "2.6 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Rocket Lake"},
    {"m": "intel", "gen": "I11", "nome": "Intel Core i7-11700K", "c": "8", "t": "16", "tdp": "125 W", "base": "3.6 GHz", "boost": "5.0 GHz", "v": "Intel UHD Graphics 750", "cod": "Rocket Lake"},
    {"m": "intel", "gen": "I11", "nome": "Intel Core i9-11900K", "c": "8", "t": "16", "tdp": "125 W", "base": "3.5 GHz", "boost": "5.3 GHz", "v": "Intel UHD Graphics 750", "cod": "Rocket Lake"},

    # LGA 1700 (12ª Geração)
    {"m": "intel", "gen": "I12", "nome": "Intel Core i3-12100F", "c": "4", "t": "8", "tdp": "58 W", "base": "3.3 GHz", "boost": "4.3 GHz", "v": "Não possui", "cod": "Alder Lake"},
    {"m": "intel", "gen": "I12", "nome": "Intel Core i5-12400F", "c": "6", "t": "12", "tdp": "65 W", "base": "2.5 GHz", "boost": "4.4 GHz", "v": "Não possui", "cod": "Alder Lake"},
    {"m": "intel", "gen": "I12", "nome": "Intel Core i7-12700K", "c": "12", "t": "20", "tdp": "125 W", "base": "3.6 GHz", "boost": "5.0 GHz", "v": "Intel UHD Graphics 770", "cod": "Alder Lake"},

    # LGA 1700 (13ª Geração)
    {"m": "intel", "gen": "I13", "nome": "Intel Core i5-13600K", "c": "14", "t": "20", "tdp": "125 W", "base": "3.5 GHz", "boost": "5.1 GHz", "v": "Intel UHD Graphics 770", "cod": "Raptor Lake"},
    {"m": "intel", "gen": "I13", "nome": "Intel Core i7-13700K", "c": "16", "t": "24", "tdp": "125 W", "base": "3.4 GHz", "boost": "5.4 GHz", "v": "Intel UHD Graphics 770", "cod": "Raptor Lake"},
    {"m": "intel", "gen": "I13", "nome": "Intel Core i9-13900K", "c": "24", "t": "32", "tdp": "125 W", "base": "3.0 GHz", "boost": "5.8 GHz", "v": "Intel UHD Graphics 770", "cod": "Raptor Lake"},

    # LGA 1700 (14ª Geração)
    {"m": "intel", "gen": "I14", "nome": "Intel Core i3-14100F", "c": "4", "t": "8", "tdp": "58 W", "base": "3.5 GHz", "boost": "4.7 GHz", "v": "Não possui", "cod": "Raptor Lake Refresh"},
    {"m": "intel", "gen": "I14", "nome": "Intel Core i5-14600K", "c": "14", "t": "20", "tdp": "125 W", "base": "3.5 GHz", "boost": "5.3 GHz", "v": "Intel UHD Graphics 770", "cod": "Raptor Lake Refresh"},
    {"m": "intel", "gen": "I14", "nome": "Intel Core i7-14700K", "c": "20", "t": "28", "tdp": "125 W", "base": "3.4 GHz", "boost": "5.6 GHz", "v": "Intel UHD Graphics 770", "cod": "Raptor Lake Refresh"},
    {"m": "intel", "gen": "I14", "nome": "Intel Core i9-14900K", "c": "24", "t": "32", "tdp": "125 W", "base": "3.2 GHz", "boost": "6.0 GHz", "v": "Intel UHD Graphics 770", "cod": "Raptor Lake Refresh"},
]

processadores_finais = []
contador_id = 0

# --- FUNÇÕES DE VALIDAÇÃO PROFISSIONAL ---

def obter_cache_l3(nome, gen):
    """Mapeia matematicamente o cache L3 exato e oficial de cada chip."""
    n = nome.upper()
    if "3D" in n: return "96 MB"
    if "RYZEN 9" in n: return "64 MB"
    if "RYZEN 7" in n:
        if any(x in n for x in ["4700G", "5700G", "5700GE", "5700"]) and "5700X" not in n:
            return "8 MB" if "4700G" in n else "16 MB"
        return "32 MB" if gen in ["A3", "A5"] else "16 MB"
    if "RYZEN 5" in n:
        if "2400G" in n or "3400G" in n: return "4 MB"
        if "4600G" in n or "4500" in n: return "8 MB"
        if "5600G" in n or "5600GE" in n or "5500" in n: return "16 MB"
        return "32 MB" if gen in ["A3", "A5"] else "16 MB"
    if "RYZEN 3" in n:
        if "2200G" in n or "4100" in n: return "4 MB"
        if "5300G" in n: return "8 MB"
        return "16 MB" if gen == "A3" else "8 MB"
    
    # Intel Core i9
    if "I9-" in n: return "36 MB" if gen in ["I13", "I14"] else "16 MB"
    # Intel Core i7
    if "I7-" in n:
        if "14700" in n: return "33 MB"
        if gen == "I13": return "30 MB"
        if gen == "I12": return "25 MB"
        if gen in ["I10", "I11"]: return "16 MB"
        if gen in ["I8", "I9"]: return "12 MB"
        return "8 MB"
    # Intel Core i5
    if "I5-" in n:
        if gen in ["I13", "I14"]: return "24 MB"
        if gen == "I12": return "18 MB"
        if gen in ["I10", "I11"]: return "12 MB"
        if gen in ["I8", "I9"]: return "9 MB"
        if "750" in n or "760" in n: return "8 MB"
        if any(x in n for x in ["650", "660", "670", "680", "655K", "661"]): return "4 MB"
        return "6 MB"
    # Intel Core i3
    if "I3-" in n:
        if gen in ["I12", "I14"]: return "12 MB"
        if gen in ["I10", "I11", "I8", "I9"]: return "6 MB"
        if gen == "I1": return "4 MB"
        if any(x in n for x in ["4330", "4340", "4350", "4360", "4370"]): return "4 MB"
        return "3 MB"
    # Xeons
    if "XEON" in n: return "6 MB" if "V4" in n else "8 MB"
    # Pentiums e Celerons
    if "PENTIUM" in n:
        return "3 MB"
    if "CELERON" in n:
        if "G440" in n: return "1 MB"
        return "2 MB"
    return "N/A"

def obter_ppt_real(nome, tdp, marca):
    """Calcula e retorna o consumo máximo real (PPT para AMD e PL2 para Intel)."""
    n = nome.upper()
    try:
        tdp_num = int(tdp.replace("W", "").strip())
    except ValueError:
        tdp_num = 65

    if marca == "amd":
        if tdp_num == 65: return "88 W"
        if tdp_num == 105: return "142 W"
        if tdp_num == 95: return "128 W"
        if tdp_num == 35: return "45 W"
        return f"{int(tdp_num * 1.35)} W"
    else:
        # Intel Power Limits (PL2) máximos de fábrica
        if "14900K" in n or "13900K" in n: return "253 W"
        if "14700K" in n or "13700K" in n: return "253 W"
        if "14600K" in n or "13600K" in n: return "181 W"
        if "12700K" in n: return "190 W"
        if "12400F" in n: return "117 W"
        if "12100F" in n or "14100F" in n: return "89 W"
        if "11900K" in n or "11700K" in n or "10700K" in n: return "250 W"
        if "11400F" in n: return "154 W"
        if "10400F" in n: return "134 W"
        if "9900K" in n: return "210 W"
        if "9700K" in n or "8700K" in n: return "118 W"
        if "9400F" in n or "8400" in n or "8100" in n: return "112 W"
        # Plataformas antigas (1ª a 7ª geração)
        return f"{tdp_num} W"

def obter_suporte_ecc_real(nome, marca):
    """Mapeia cirurgicamente o suporte a memórias ECC seguindo o mercado padrão."""
    n = nome.upper()
    if "XEON" in n: 
        return "Suportado (Requer placa-mãe compatível)"
    if marca == "amd":
        if "G" in n and "X3D" not in n: 
            return "Não suportado"
        if "RYZEN" in n: 
            return "Suportado (ECC Unbuffered, requer suporte da placa-mãe)"
    return "Não suportado"

def obter_igpu_freq_real(nome, video):
    """Retorna a frequência dinâmica real (Base - Boost/Máxima) do vídeo integrado."""
    if video == "Não possui":
        return "N/A"
    
    n = nome.upper()
    v = video.upper()
    
    # AMD RX Vega & Radeon Graphics
    if "VEGA 8" in v: return "300 MHz - 1100 MHz"
    if "VEGA 11" in v:
        if "3400G" in n: return "400 MHz - 1400 MHz"
        return "300 MHz - 1250 MHz"
    if "RADEON GRAPHICS" in v or "RADEON" in v:
        if "5700G" in n or "4700G" in n: return "400 MHz - 2000 MHz"
        if "5600G" in n or "4600G" in n: return "400 MHz - 1900 MHz"
        if "5300G" in n: return "400 MHz - 1700 MHz"
        return "400 MHz - 1800 MHz"

    # Intel Haswell (4ª Gen)
    if "HD GRAPHICS 4600" in v or "P4600" in v:
        if "4790K" in n: return "350 MHz - 1250 MHz"
        if "4770K" in n or "4790" in n or "4770" in n or "1275 V3" in n: return "350 MHz - 1200 MHz"
        return "350 MHz - 1150 MHz"
    if "HD GRAPHICS 4400" in v:
        return "350 MHz - 1150 MHz"
    if "HASWELL" in n or any(x in n for x in ["G3220", "G3240", "G3250", "G3258", "G3260", "G3420", "G3440", "G3450", "G3460", "G1820", "G1830", "G1840", "G1850"]):
        if "G18" in n: return "350 MHz - 1050 MHz"
        return "350 MHz - 1100 MHz"

    # Intel Ivy Bridge (3ª Gen)
    if "HD GRAPHICS 4000" in v or "P4000" in v:
        if "3770K" in n or "3770" in n: return "650 MHz - 1150 MHz"
        return "650 MHz - 1150 MHz"
    if "HD GRAPHICS 2500" in v:
        return "650 MHz - 1050 MHz"
    if any(x in n for x in ["G2010", "G2020", "G2030", "G2120", "G2130", "G1610", "G1620", "G1630"]):
        return "650 MHz - 1050 MHz"

    # Intel Sandy Bridge (2ª Gen)
    if "HD GRAPHICS 3000" in v or "P3000" in v:
        if "2600K" in n or "2700K" in n: return "850 MHz - 1350 MHz"
        return "850 MHz - 1100 MHz"
    if "HD GRAPHICS 2000" in v:
        return "850 MHz - 1100 MHz"
    if any(x in n for x in ["G620", "G630", "G640", "G645", "G840", "G850", "G860", "G870"]):
        return "850 MHz - 1100 MHz"
    if any(x in n for x in ["G440", "G530", "G540", "G550", "G555"]):
        return "650 MHz - 1000 MHz"

    # Intel Clarkdale (1ª Gen)
    if "CLARKDALE" in n or any(x in n for x in ["530", "540", "550", "560", "650", "660", "670", "680"]):
        if "661" in n: return "900 MHz"
        if "G6950" in n: return "533 MHz"
        return "733 MHz"

    # Intel Skylake a Comet Lake (6ª a 10ª Gen)
    if "UHD GRAPHICS 630" in v or "HD GRAPHICS 630" in v or "HD GRAPHICS 530" in v:
        if "9900K" in n or "10700K" in n: return "350 MHz - 1200 MHz"
        return "350 MHz - 1150 MHz"

    # Intel Rocket Lake (11ª Gen)
    if "UHD GRAPHICS 750" in v:
        return "350 MHz - 1300 MHz"

    # Intel Alder/Raptor Lake (12ª a 14ª Gen)
    if "UHD GRAPHICS 770" in v:
        if "14900K" in n or "13900K" in n: return "300 MHz - 1650 MHz"
        if "14700K" in n or "13700K" in n: return "300 MHz - 1600 MHz"
        return "300 MHz - 1550 MHz"

    return "350 MHz - 1150 MHz"

def obter_instrucoes(nome, gen, marca):
    """Mapeia o conjunto de instruções suportadas de forma realista."""
    n = nome.upper()
    if marca == "amd":
        return "x86-64, SSE4.1, SSE4.2, AVX, AVX2"
    if "CELERON" in n or "PENTIUM" in n:
        return "x86-64, MMX, SSE, SSE2, SSE3, SSSE3, SSE4.1, SSE4.2"
    try:
        g_num = int(gen.replace("I", ""))
    except ValueError:
        g_num = 1
    if g_num >= 4:
        return "x86-64, SSE4.1, SSE4.2, AVX, AVX2"
    else:
        return "x86-64, SSE4.1, SSE4.2, AVX"

# 2. PROCESSAMENTO COM PRESERVAÇÃO DE DADOS MANUAIS
for item in lista_bruta:
    nome_cpu = item["nome"]
    marca = item["m"]
    g = item["gen"]
    gen_meta = info_geracoes[g]
    
    if nome_cpu in dados_existentes:
        cpu_preservada = dados_existentes[nome_cpu]
        cpu_preservada["id"] = contador_id
        processadores_finais.append(cpu_preservada)
        contador_id += 1
        continue

    # Detalhar por Família
    familia_txt = "Core i5"
    for fam in ["Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9", "Core i3", "Core i5", "Core i7", "Core i9", "Xeon", "Pentium", "Celeron"]:
        if fam in nome_cpu:
            familia_txt = fam
            break

    detalhe_extra = "com Gráficos Integrados" if item["v"] != "Não possui" else ""
    detalhe = f"{gen_meta['serie']} • {familia_txt} {detalhe_extra}"

    analise = (
        f"O {nome_cpu} é um processador construído sobre a microarquitetura {gen_meta['arquitetura']} "
        f"com litografia de {gen_meta['litografia']}. Equipado com {item['c']} núcleos físicos e {item['t']} threads, "
        f"este modelo opera no soquete {gen_meta['soquete']} e destaca-se por ser {gen_meta['epoca']}."
    )

    analise_completa = f"""
        <h2>1. Visão Geral e Arquitetura do {nome_cpu}</h2>
        <p>O <strong>{nome_cpu}</strong> pertence à linha {familia_txt} da {marca.upper()} baseada na arquitetura <strong>{gen_meta['arquitetura']}</strong>. Projetado para o segmento de Desktops utilizando o encaixe <strong>{gen_meta['soquete']}</strong>.</p>
        <h2>2. Desempenho e Consumo Térmico</h2>
        <p>Conta com uma frequência base de {item['base']} atingindo picos automáticos de até <strong>{item['boost']}</strong> em tarefas exigentes. O seu perfil operacional trabalha sob o limite de TDP estruturado em <strong>{item['tdp']}</strong>.</p>
    """

    nome_foto_automatica = f"{nome_cpu.replace(' ', '_')}.webp"
    ppt_final = item.get("consumoMaximo", obter_ppt_real(nome_cpu, item["tdp"], marca))

    cpu_obj = {
        "id": contador_id,
        "nome": nome_cpu,
        "marca": marca,
        "categoria": f"border-{marca}",
        "foto": nome_foto_automatica,
        "detalhe": detalhe.strip(),
        "cores": item["c"],
        "threads": item["t"],
        "tdp": item["tdp"],
        "consumoMaximo": ppt_final,
        "freqBase": item["base"],
        "freqBoost": item["boost"],
        "codinome": item["cod"],
        "soquete": gen_meta["soquete"],
        "video": item["v"],
        "analise": analise,
        "fabricante": marca.upper(),
        "familia": f"{familia_txt} ({gen_meta['serie']})",
        "litografia": gen_meta["litografia"],
        "memoria": gen_meta["memoria"],
        "analiseCompleta": analise_completa.strip(),
        "notaJogos": 5.0,
        "notaTrabalho": 5.0,
        "geracao": gen_meta["serie"],
        "arquitetura": gen_meta["arquitetura"],
        "lancamento": gen_meta["ano"],
        "segmento": "Desktop",
        "cacheL1": gen_meta["l1"],
        "cacheL2": gen_meta["l2"],
        "cacheL3": obter_cache_l3(nome_cpu, g),
        "chipsets": "Compatíveis com soquete " + gen_meta["soquete"],
        "pcie": gen_meta["pcie"],
        "canaisMemoria": gen_meta["canais"],
        "freqMaxMemoria": gen_meta["memoria"],
        "suporteEcc": obter_suporte_ecc_real(nome_cpu, marca),
        "gpuIntegrada": obter_igpu_freq_real(nome_cpu, item["v"]), # Mapeamento real dinâmico por modelo de GPU
        "tempMax": "100°C" if marca == "intel" else "95°C",
        "instrucoes": obter_instrucoes(nome_cpu, g, marca)
    }
    processadores_finais.append(cpu_obj)
    contador_id += 1

# 3. SALVAR O ARQUIVO FINAL MESCLADO PROTEGENDO O SEU HISTÓRICO
with open("dados.js", "w", encoding="utf-8") as f:
    f.write(f"const listaDeCpus = {json.dumps(processadores_finais, ensure_ascii=False, indent=4)};")

print(f"✨ Sucesso Total! O seu 'dados.js' foi gerado profissionalmente. Total na base: {len(processadores_finais)} cpus.")