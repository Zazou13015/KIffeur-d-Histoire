#!/usr/bin/env python3
"""Contrôle local, sans réseau ni base, des propositions de l'issue #9.

Usage : python3 scripts/verifier-chapitres.py [--dossier content/dataset-v18] [--exiger-validation]
Ce script ne valide pas la pertinence pédagogique à la place d'Antonin.
"""
import argparse
import csv
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path


def lire(dossier, nom):
    with (dossier / f"kiffeurs-{nom}-v18.csv").open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def liste(texte):
    return [v for v in texte.split(";") if v]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dossier", type=Path, default=Path(__file__).resolve().parents[1] / "content/dataset-v18")
    p.add_argument("--exiger-validation", action="store_true", help="Refuser toute proposition encore sans validation d'Antonin.")
    args = p.parse_args()
    d = args.dossier
    themes = {t["theme_id"]: t for t in lire(d, "themes")}
    events = {e["event_id"]: e for e in lire(d, "events")}
    liens = defaultdict(set)
    for l in lire(d, "curriculum-links"):
        if l["event_id"]:
            liens[l["theme_id"]].add(l["event_id"])
    fixes = lire(d, "chapter-fixes")
    details = lire(d, "chapter-event-proposals")
    nouveaux = lire(d, "chapter-new-events")
    erreurs = []

    def verifier(condition, message):
        if not condition:
            erreurs.append(message)

    def verifier_validation(ligne, autorises, identifiant):
        statut = ligne["antonin_validation"]
        verifier(statut in {"", *autorises}, f"{identifiant} : statut de validation inconnu.")
        if args.exiger_validation:
            verifier(bool(statut), f"{identifiant} : validation d'Antonin manquante.")

    vides = {cid for cid in themes if not liens[cid]}
    ids = [f["chapter_id"] for f in fixes]
    verifier(len(fixes) == 8 and len(set(ids)) == 8 and set(ids) == vides,
             "Les propositions doivent couvrir exactement les huit chapitres sans event_id renseigné.")
    nouveaux_ids = [n["proposal_id"] for n in nouveaux]
    verifier(len(set(nouveaux_ids)) == len(nouveaux_ids), "Candidats nouveaux en double.")
    par_chapitre = defaultdict(list)
    for e in details:
        par_chapitre[e["chapter_id"]].append(e["event_id"])
        canon = events.get(e["event_id"])
        verifier(canon is not None, f"Événement inexistant : {e['event_id']}")
        if canon:
            for champ in ("title_canonical", "date_text", "start_year", "start_month", "start_day",
                          "end_year", "end_month", "end_day", "precision", "date_status",
                          "playable", "playable_mode", "source_status"):
                verifier(e[champ] == canon[champ], f"{e['event_id']} : {champ} diffère du canonique.")
            verifier(canon["playable"] == "TRUE", f"{e['event_id']} n'est pas jouable.")
        for champ in ("justification", "curriculum_sources", "consulted_historical_sources", "dataset_source_ids"):
            verifier(bool(e[champ]), f"{e['event_id']} : {champ} manquant.")
        if e["event_id"] == "EVT-0905":
            verifier_validation(e, {"VALIDE_SOUS_CONDITION"}, e["event_id"])
            verifier(e["date_status"] == "CONVENTIONAL", "EVT-0905 : conserver le statut CONVENTIONAL exigé par Antonin.")
            verifier("17 octobre" in e["review_notes"] and "19 octobre" in e["review_notes"],
                     "EVT-0905 : conserver la note distinguant le 17 et le 19 octobre 1973.")
        else:
            verifier_validation(e, {"VALIDE"}, e["event_id"])
    conserves = set()
    for f in fixes:
        cid = f["chapter_id"]
        t = themes.get(cid)
        if not t:
            continue
        for champ, original in (("level", "level"), ("program_scope", "program_scope"),
                                ("school_year", "school_year"), ("chapter_title", "theme_title")):
            verifier(f[champ] == t[original], f"{cid} : métadonnée {champ} altérée.")
        verifier(f["current_event_count"] == str(len(liens[cid])), f"{cid} : décompte erroné.")
        verifier(f["current_playable_event_count"] == "0", f"{cid} : décompte jouable erroné.")
        verifier(bool(f["justification"] and f["sources"]), f"{cid} : justification ou sources manquantes.")
        verifier_validation(f, {"VALIDE"}, cid)
        proposes = liste(f["proposed_event_ids"])
        verifier(len(proposes) == len(set(proposes)), f"{cid} : événements proposés en double.")
        verifier(proposes == par_chapitre[cid], f"{cid} : liste et dossier événement divergent.")
        verifier(set(liste(f["new_events_needed"])) == {n["proposal_id"] for n in nouveaux if n["chapter_id"] == cid},
                 f"{cid} : liste des nouveaux candidats incohérente.")
        if f["decision"] == "CONSERVER_ET_COMPLETER":
            conserves.add(cid)
            verifier(not f["target_chapter_id"], f"{cid} : cible de fusion inattendue.")
            verifier(5 <= len(proposes) <= 10, f"{cid} : attendu 5 à 10 événements existants jouables.")
        elif f["decision"].startswith("FUSIONNER_AVEC:"):
            cible = f["decision"].split(":", 1)[1]
            verifier(cible == f["target_chapter_id"] and cible in themes and cible != cid,
                     f"{cid} : cible de fusion invalide.")
            verifier(not proposes, f"{cid} : une fusion ne crée pas une nouvelle liste d'événements.")
            verifier(f["target_current_event_count"] == str(len(liens[cible])), f"{cid} : décompte cible erroné.")
        elif f["decision"] != "SUPPRIMER_COMME_DOUBLON":
            verifier(False, f"{cid} : décision inconnue.")
    verifier(set(par_chapitre) <= set(ids), "Dossier événement hors des chapitres étudiés.")
    for n in nouveaux:
        verifier(n["chapter_id"] in conserves, f"{n['proposal_id']} : chapitre non conservé.")
        verifier(n["proposal_id"].startswith("PROP-") and "event_id" not in n, "Un nouvel event_id a été inventé.")
        verifier(n["title_canonical"] not in {e["title_canonical"] for e in events.values()}, "Nouveau titre déjà canonique.")
        verifier(n["precision"] == "DAY" and n["date_status"] == "EXACT", "Précision nouvelle inattendue.")
        try:
            historique = date(int(n["start_year"]), int(n["start_month"]), int(n["start_day"]))
            verifier(historique.isoformat() == n["date_text"], "Date nouvelle incohérente.")
        except ValueError:
            verifier(False, f"{n['proposal_id']} : date invalide.")
        verifier(bool(n["sources"] and n["justification"] and n["date_notes"]), "Nouveau candidat incomplet.")
        statut_attendu = "VALIDE_ET_SOUHAITE" if n["proposal_id"] in {"PROP-INDE", "PROP-DEVISE"} else "VALIDE"
        verifier_validation(n, {statut_attendu}, n["proposal_id"])
    for erreur in erreurs:
        print(f"ERREUR : {erreur}")
    if erreurs:
        return 1
    print(f"OK : {len(fixes)} décisions, {len(details)} liens proposés / {len({e['event_id'] for e in details})} événements distincts existants et jouables, {len(nouveaux)} nouveaux candidats sans event_id.")
    validations = sum(bool(l["antonin_validation"]) for l in [*fixes, *details, *nouveaux])
    print(f"Métadonnées, dates et précision conservées ; {validations}/{len(fixes) + len(details) + len(nouveaux)} validations d'Antonin renseignées.")
    print("EVT-0905 : CONVENTIONAL et note du 17/19 octobre conservés. Aucune proposition appliquée au canonique.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
