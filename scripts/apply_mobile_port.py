from pathlib import Path

TARGETS = [
    "index.html",
    "detalhes.html",
    "analises.html",
    "ler-artigo.html",
    "forum.html",
]

LINK = '    <link rel="stylesheet" href="mobile-port.css">\n'

for filename in TARGETS:
    path = Path(filename)
    if not path.exists():
        print(f"[skip] {filename}: arquivo não encontrado")
        continue

    text = path.read_text(encoding="utf-8")
    if 'href="mobile-port.css"' in text or "href='mobile-port.css'" in text:
        print(f"[ok] {filename}: camada mobile já vinculada")
        continue

    viewport_markers = [
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    ]

    inserted = False
    for marker in viewport_markers:
        if marker in text:
            text = text.replace(marker, marker + "\n" + LINK.rstrip("\n"), 1)
            inserted = True
            break

    if not inserted:
        if "</head>" not in text:
            raise RuntimeError(f"{filename}: </head> não encontrado")
        text = text.replace("</head>", LINK + "</head>", 1)

    path.write_text(text, encoding="utf-8")
    print(f"[changed] {filename}")
