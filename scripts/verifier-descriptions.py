#!/usr/bin/env python3
"""Contrôle les propositions non validées de l'issue #8, sans réseau ni base.

Usage : python3 scripts/verifier-descriptions.py [--dossier content/dataset-v18]
Les nombres suspects sont signalés pour relecture ; une date explicite reste une erreur.
"""
import argparse
import csv
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

NIVEAUX = ["CM1", "CM2", "6e", "5e", "4e", "3e", "Seconde générale et technologique",
           "Première générale", "Première HGGSP", "Terminale générale", "Terminale HGGSP"]
COLONNES = ["event_id", "title_canonical", "lowest_level", "description_short", "a_verifier",
            "verification_note", "sources", "antonin_validation"]
MOIS = r"janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre"
DATES = [
    ("année contextualisée", r"\b(?:en|vers|depuis|avant|après|entre|année|an)\s+[-−]?\d{1,4}\b"),
    ("année avant/après notre ère", r"(?<!\w)[-−]\d{1,4}\b|\b(?:av|ap)\.?\s*J\.?\s*[-–]?\s*C\.?|(?:avant|après)\s+(?:notre\s+ère|Jésus-Christ)"),
    ("jour et mois", rf"\b(?:\d{{1,2}}(?:er|e)?|premier)\s+(?:{MOIS})\b"),
    ("jour écrit et mois", rf"\b(?:un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix[- ]sept|dix[- ]huit|dix[- ]neuf|vingt(?:[- ](?:et[- ]un|deux|trois|quatre|cinq|six|sept|huit|neuf))?|trente(?:[- ]et[- ]un)?)\s+(?:{MOIS})\b"),
    ("mois et année", rf"\b(?:{MOIS})\s+\d{{1,4}}\b"),
    ("date numérique", r"\b(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b"),
    ("siècle", r"\b(?:[IVXLCDM]+|\d{1,2})(?:er|e|ème|eme|ᵉ)?\s+siècles?\b"),
    ("plage chronologique", r"\b\d{3,4}\s*(?:[-–—→]|à|au)\s*\d{3,4}\b"),
    ("période explicite", r"\b(?:premier|[\w-]+ième)\s+siècles?\b|\bannées\s+\d{2,4}\b"),
]


def lire(dossier, nom):
    with (dossier / f"kiffeurs-{nom}-v18.csv").open(encoding="utf-8-sig", newline="") as f:
        lecteur = csv.DictReader(f)
        return lecteur.fieldnames, list(lecteur)


def niveaux_par_evenement(evenements, liens):
    niveaux = defaultdict(set)
    for e in evenements:
        niveaux[e["event_id"]].update(x.strip() for x in e["levels_seen"].split(";") if x.strip())
    for l in liens:
        if l["theme_id"] and l["event_id"] and l["level"]:
            niveaux[l["event_id"]].add(l["level"])
    return niveaux


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dossier", type=Path, default=Path(__file__).resolve().parents[1] / "content/dataset-v18")
    args = p.parse_args()
    _, evenements = lire(args.dossier, "events")
    _, liens = lire(args.dossier, "curriculum-links")
    colonnes, propositions = lire(args.dossier, "description-additions")
    canon = {e["event_id"]: e for e in evenements}
    niveaux = niveaux_par_evenement(evenements, liens)
    cibles = {e["event_id"] for e in evenements if niveaux[e["event_id"]] and e["playable"] == "TRUE" and not e["description_short"].strip()}
    erreurs, suspects = [], []
    if colonnes != COLONNES:
        erreurs.append("Colonnes différentes du format de proposition demandé.")
    ids = [r.get("event_id", "") for r in propositions]
    if len(ids) != len(set(ids)):
        erreurs.append("Identifiants de propositions dupliqués.")
    if set(ids) != cibles:
        erreurs.append(f"Couverture incorrecte : absents={sorted(cibles-set(ids))}, hors cible={sorted(set(ids)-cibles)}")
    for r in propositions:
        eid = r.get("event_id", "?")
        if None in r or any(v is None for v in r.values()):
            erreurs.append(f"{eid} : ligne CSV mal formée.")
            continue
        e = canon.get(eid)
        if not e:
            erreurs.append(f"{eid} : événement inexistant.")
            continue
        if r.get("title_canonical") != e["title_canonical"]:
            erreurs.append(f"{eid} : titre différent du canonique.")
        inconnus = niveaux[eid] - set(NIVEAUX)
        if inconnus:
            erreurs.append(f"{eid} : niveaux inconnus {sorted(inconnus)}.")
        elif niveaux[eid] and r.get("lowest_level") != min(niveaux[eid], key=NIVEAUX.index):
            erreurs.append(f"{eid} : niveau minimal incorrect.")
        texte = r.get("description_short", "")
        if not texte.strip() or len(texte) > 280:
            erreurs.append(f"{eid} : description vide ou supérieure à 280 caractères ({len(texte)}).")
        # Les points des abréviations usuelles ne terminent pas une phrase.
        phrases = re.sub(r"\b(?:M|Mme|Dr|etc)\.", "", texte)
        nombre = len(re.findall(r"[.!?]+(?=\s|$)", phrases))
        if nombre not in (1, 2) or not re.search(r"[.!?]$", texte):
            erreurs.append(f"{eid} : attendu une ou deux phrases terminées ({nombre}).")
        dates = [nom for nom, motif in DATES if re.search(motif, texte, re.IGNORECASE)]
        nombres = re.findall(r"\b\d{3,4}\b", texte)
        if dates or nombres:
            suspects.append((eid, dates or [f"nombre à relire : {', '.join(nombres)}"]))
        if dates:
            erreurs.append(f"{eid} : réponse chronologique explicite interdite ({', '.join(dates)}).")
        elif nombres and (r.get("a_verifier") != "OUI" or not r.get("verification_note", "").strip()):
            erreurs.append(f"{eid} : nombre potentiellement chronologique non signalé pour relecture.")
        if r.get("a_verifier") not in ("OUI", "NON"):
            erreurs.append(f"{eid} : a_verifier doit valoir OUI ou NON.")
        if r.get("a_verifier") == "OUI" and not r.get("verification_note", "").strip():
            erreurs.append(f"{eid} : cas douteux sans explication précise.")
        if r.get("verification_note", "").strip() and r.get("a_verifier") != "OUI":
            erreurs.append(f"{eid} : réserve documentée mais non marquée a_verifier=OUI.")
        urls = [x.strip() for x in r.get("sources", "").split(";") if x.strip()]
        if not urls or any(not re.match(r"^https?://[^\s/]+/", x) for x in urls):
            erreurs.append(f"{eid} : sources absentes ou URL invalide.")
        if urls and (all("wikipedia.org/" in u for u in urls) or
                     all(any(h in u for h in ("catalogue.bnf.fr/", "ccfr.bnf.fr/")) for u in urls)) and r.get("a_verifier") != "OUI":
            erreurs.append(f"{eid} : sources uniquement secondaires ou bibliographiques à signaler pour vérification.")
        if r.get("antonin_validation") != "":
            erreurs.append(f"{eid} : aucune validation d'Antonin ne doit être remplie à cette étape.")
    repetitions = [t for t, n in Counter(r.get("description_short", "") for r in propositions).items() if n > 1]
    if repetitions:
        erreurs.append("Descriptions intégralement identiques sur plusieurs événements.")
    for eid, causes in suspects:
        print(f"SUSPECT : {eid} : {', '.join(causes)}")
    for erreur in erreurs:
        print(f"ERREUR : {erreur}")
    print(f"{len(cibles)} événements à compléter")
    print(f"{len(propositions)} descriptions produites")
    print(f"{sum(r.get('a_verifier') == 'OUI' for r in propositions)} cas à vérifier")
    print(f"{len(suspects)} descriptions suspectes contenant potentiellement une date")
    print(f"{len(erreurs)} erreurs")
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
