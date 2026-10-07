#!/usr/bin/env python3
"""Contrôle les dessins de content/illustrations/ (décision 1.6, docs/prd.md « Illustrations »).
Usage : python3 scripts/verifier-illustrations.py
Vérifie : nom EVT-xxxx.svg, viewBox 160×120, poids ≤ 8 Ko, 5 couleurs de la charte au plus, aucun texte ni script."""
import hashlib, json, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path

CHARTE = {"#f3f2ec", "#1d2a3a", "#b08a3e", "#8a2f2b", "#7e8c7a"}
problemes = []
fichiers = sorted(Path("content/illustrations").glob("*.svg"))
for f in fichiers:
    t = f.read_text(encoding="utf-8")
    if not re.fullmatch(r"EVT-\d{4}\.svg", f.name): problemes.append(f"{f.name} : nom invalide")
    if 'viewBox="0 0 160 120"' not in t: problemes.append(f"{f.name} : viewBox 160×120 manquant")
    if f.stat().st_size > 8 * 1024: problemes.append(f"{f.name} : plus de 8 Ko")
    hors = {c.lower() for c in re.findall(r"#[0-9a-fA-F]{6}", t)} - CHARTE
    if hors: problemes.append(f"{f.name} : couleurs hors charte {sorted(hors)}")
    if re.search(r"<text|<script|<image|<foreignObject", t): problemes.append(f"{f.name} : texte, script ou image interdits")
    try:
        racine = ET.fromstring(t)
        if racine.tag != "{http://www.w3.org/2000/svg}svg": problemes.append(f"{f.name} : racine SVG invalide")
        if racine.attrib.get("viewBox") != "0 0 160 120": problemes.append(f"{f.name} : viewBox XML invalide")
        for element in racine.iter():
            tag = element.tag.split("}")[-1]
            if tag in {"text", "image", "filter", "linearGradient", "radialGradient", "script", "foreignObject", "animate", "style"}:
                problemes.append(f"{f.name} : élément interdit {tag}")
            if any(a.split("}")[-1].startswith("on") or a.split("}")[-1] == "href" for a in element.attrib):
                problemes.append(f"{f.name} : attribut actif ou référence externe")
    except ET.ParseError as erreur: problemes.append(f"{f.name} : XML invalide {erreur}")

# Les références validées ne sont jamais redessinées par l'atelier de généralisation.
reference_path = Path("content/illustrations/reference-validee.json")
if reference_path.exists():
    reference = json.loads(reference_path.read_text(encoding="utf-8"))
    for nom, empreinte in reference["svg"].items():
        fichier = Path("content/illustrations") / nom
        if not fichier.exists() or hashlib.sha256(fichier.read_bytes()).hexdigest() != empreinte:
            problemes.append(f"{nom} : référence validée modifiée ou absente")
print(f"{len(fichiers)} dessins, {len(problemes)} problème(s)")
for p in problemes: print(" -", p)
sys.exit(1 if problemes else 0)
