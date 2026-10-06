#!/usr/bin/env python3
"""Vérifie le fichier d'ajouts d'alias (issue 1.3) contre le dataset d'Antonin.

Usage : python3 scripts/verifier-alias.py [--dossier content/dataset-v18]

Reproduit en Python la normalisation SQL (`histoire.normalize_answer`) et la similarité `pg_trgm`
(seuil 0,6 de `histoire.check_event_answer`). Contrôle :
  - couverture : tous les événements scolaires sans alias ont des ajouts (2 à 5) ;
  - aucun alias n'est vide, ne contient « ; », ni ne répète le titre ou un autre alias du même événement ;
  - aucun alias n'est égal (après normalisation) au titre ou à un alias d'un AUTRE événement ;
  - aucun alias ne crée une confusion floue nouvelle : similarité >= 0,6 avec l'étiquette d'un autre événement alors que le titre
    d'origine (et ses alias d'Antonin) n'y ressemblaient pas déjà. Les ressemblances qui existent déjà entre deux titres
    (« Début » / « Fin du blocus de Berlin ») ne sont pas du ressort des alias : elles sont affichées en information seulement.
Code de sortie 1 s'il reste une collision ou un manque.
"""
import argparse
import csv
import re
import sys
import unicodedata
from pathlib import Path

SEUIL = 0.6
VAGUES = {"la guerre", "guerre", "le traite", "traite", "la bataille", "bataille", "le concile", "concile", "la loi", "loi"}


def normaliser(texte: str) -> str:
    t = unicodedata.normalize("NFKD", (texte or "").replace("œ", "oe").replace("Œ", "oe").replace("æ", "ae"))
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    t = re.sub(r"^\s*(le|la|les|l|un|une|des)\s+", "", t)
    return re.sub(r"\s+", " ", t).strip()


def trigrammes(texte: str) -> set:
    resultat = set()
    for mot in re.findall(r"[a-z0-9]+", texte):
        m = f"  {mot} "
        resultat.update(m[i : i + 3] for i in range(len(m) - 2))
    return resultat


def similarite(a: set, b: set) -> float:
    return len(a & b) / len(a | b) if a and b else 0.0


def lire(chemin: Path):
    with open(chemin, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dossier", default="content/dataset-v18")
    dossier = Path(p.parse_args().dossier)
    evenements = lire(next(dossier.glob("kiffeurs-events-v*.csv")))
    ajouts = lire(next(dossier.glob("kiffeurs-alias-additions-v*.csv")))

    par_id = {e["event_id"]: e for e in evenements}
    cibles = [e for e in evenements if e["levels_seen"] and not e["aliases"]]
    erreurs: list[str] = []

    dans_ajouts = {}
    for l in ajouts:
        if l["event_id"] in dans_ajouts:
            erreurs.append(f"{l['event_id']} : présent deux fois")
        dans_ajouts[l["event_id"]] = [a.strip() for a in l["aliases_added"].split(";") if a.strip()]
    for e in cibles:
        if e["event_id"] not in dans_ajouts:
            erreurs.append(f"{e['event_id']} : aucun ajout ({e['title_canonical']})")
    cibles_ids = {e["event_id"] for e in cibles}
    for i in dans_ajouts:
        if i not in cibles_ids:
            erreurs.append(f"{i} : n'est pas un événement scolaire sans alias")

    # Étiquettes de chaque événement après ajouts : titre, alias existants, alias ajoutés.
    etiquettes: dict[str, list[str]] = {}
    for e in evenements:
        etiquettes[e["event_id"]] = [e["title_canonical"]] + [a.strip() for a in e["aliases"].split(";") if a.strip()]
    for i, al in dans_ajouts.items():
        if i in etiquettes:
            etiquettes[i] += al

    index = [(i, lab, normaliser(lab), trigrammes(normaliser(lab))) for i, labs in etiquettes.items() for lab in labs]
    # Étiquettes d'origine (titre + alias d'Antonin) : pour savoir si une ressemblance existait avant nos ajouts.
    origine = {
        e["event_id"]: [trigrammes(normaliser(x)) for x in [e["title_canonical"]] + [a for a in e["aliases"].split(";") if a.strip()]]
        for e in evenements
    }

    for i, al in dans_ajouts.items():
        if not 2 <= len(al) <= 5:
            erreurs.append(f"{i} : {len(al)} alias au lieu de 2 à 5")
        titre = normaliser(par_id[i]["title_canonical"]) if i in par_id else ""
        vus = {titre}
        for a in al:
            n = normaliser(a)
            if len(n) < 3 or n in VAGUES:
                erreurs.append(f"{i} : alias trop vague « {a} »")
            if n in vus:
                erreurs.append(f"{i} : alias identique au titre ou à un autre alias (après normalisation) « {a} »")
            vus.add(n)
            tg = trigrammes(n)
            for j, lab, nj, tj in index:
                if j == i:
                    continue
                if n == nj:
                    erreurs.append(f"{i} : « {a} » identique à « {lab} » ({j})")
                elif similarite(tg, tj) >= SEUIL:
                    deja = any(similarite(to, tj) >= SEUIL for to in origine.get(i, []))
                    if not deja:
                        erreurs.append(f"{i} : « {a} » trop proche de « {lab} » ({j}), similarité {similarite(tg, tj):.2f}")

    total = sum(len(v) for v in dans_ajouts.values())
    print(f"{len(dans_ajouts)} événements, {total} alias ajoutés, {len(erreurs)} problème(s).")
    for e in erreurs:
        print(" -", e)
    sys.exit(1 if erreurs else 0)


if __name__ == "__main__":
    main()
