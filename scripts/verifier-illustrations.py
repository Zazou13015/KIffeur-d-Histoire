#!/usr/bin/env python3
"""Contrôle les dessins de content/illustrations/ (décision 1.6, docs/prd.md « Illustrations »).
Usage : python3 scripts/verifier-illustrations.py
Vérifie : nom EVT-xxxx.svg, viewBox 160×120, poids ≤ 8 Ko, 5 couleurs de la charte au plus, aucun texte ni script."""
import re, sys
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
print(f"{len(fichiers)} dessins, {len(problemes)} problème(s)")
for p in problemes: print(" -", p)
sys.exit(1 if problemes else 0)
