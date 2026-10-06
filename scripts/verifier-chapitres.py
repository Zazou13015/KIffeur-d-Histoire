#!/usr/bin/env python3
"""Contrôle local, sans réseau ni base, des propositions de l'issue #9.

Usage : python3 scripts/verifier-chapitres.py [--dossier content/dataset-v18] [--exiger-validation]
Ce script ne valide pas la pertinence pédagogique à la place d'Antonin.
"""
import argparse
import csv
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

FUSIONS = {"THM-023": "THM-022", "THM-032": "THM-028", "THM-033": "THM-029", "THM-034": "THM-030", "THM-035": "THM-031"}
CONSERVES = {"THM-030": 10, "THM-037": 8, "THM-040": 5}


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
    lignes_themes = lire(d, "themes")
    lignes_events = lire(d, "events")
    themes = {t["theme_id"]: t for t in lignes_themes}
    events = {e["event_id"]: e for e in lignes_events}
    liens = defaultdict(set)
    lignes_programme = lire(d, "curriculum-links")
    for l in lignes_programme:
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

    ids = [f["chapter_id"] for f in fixes]
    verifier(len(lignes_themes) == len(themes), "Identifiant de chapitre dupliqué.")
    verifier(len(lignes_events) == len(events) == 2000, "Événements dupliqués ou nombre différent des 2 000 canoniques.")
    verifier(len(fixes) == 8 and len(set(ids)) == 8 and set(ids) == set(FUSIONS) | set(CONSERVES),
             "La trace de validation doit couvrir les huit décisions de l'issue #9.")
    verifier(len(themes) == 41 and not set(FUSIONS) & themes.keys(), "Attendu : 41 chapitres actifs, sans les cinq IDs fusionnés.")
    for cid, t in themes.items():
        verifier(bool(t["theme_title"].strip()), f"{cid} : chapitre sans titre.")
        verifier(bool(liens[cid]), f"{cid} : chapitre sans événement canonique.")
    verifier(themes.get("THM-028", {}).get("level") == "Terminale générale", "THM-028 : niveau incorrect.")
    corriges = dict(zip((f"LNK13-{i:04}" for i in range(127, 138)), (f"EVT-{i:04}" for i in range(494, 505))))
    par_id = {l["link_id_v3"]: l for l in lignes_programme if l["link_id_v3"]}
    for identifiant, eid in corriges.items():
        l = par_id.get(identifiant, {})
        verifier(l.get("theme_id") == "THM-028" and l.get("event_id") == eid and l.get("level") == "Terminale générale",
                 f"{identifiant} : correction ciblée THM-028 manquante ou événement changé.")
    paires = [(l["theme_id"], l["event_id"]) for l in lignes_programme if l["theme_id"] and l["event_id"]]
    verifier(len(paires) == len(set(paires)), "Doublon de lien événement ↔ chapitre.")
    verifier(len(paires) == 526, "Attendu : 503 liens initiaux + 23 rattachements = 526 liens canoniques.")
    for l in lignes_programme:
        verifier(not l["theme_id"] or l["theme_id"] in themes, f"Lien vers chapitre orphelin : {l['theme_id']}")
        verifier(not l["event_id"] or l["event_id"] in events, f"Lien vers événement orphelin : {l['event_id']}")
        if l["theme_id"] == "THM-028":
            verifier(l["level"] == "Terminale générale", "THM-028 : lien encore au mauvais niveau.")
    for cid, nombre in CONSERVES.items():
        verifier(len(liens[cid]) >= nombre, f"{cid} : rattachements incomplets.")
        verifier(sum(events.get(eid, {}).get("playable") == "TRUE" for eid in liens[cid]) >= nombre,
                 f"{cid} : minimum d'événements jouables non atteint.")
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
        verifier(e["event_id"] in liens[e["chapter_id"]], f"{e['chapter_id']}/{e['event_id']} : rattachement validé non appliqué.")
        matches = [l for l in lignes_programme if l["theme_id"] == e["chapter_id"] and l["event_id"] == e["event_id"]]
        if len(matches) == 1:
            l = matches[0]
            statut = {"PPO_BO": "PPO_BO", "JALON_BO": "PPO_BO", "CONTEXTE_BO": "CONNAISSANCE_EXPLICITE"}.get(e["pedagogical_relation"], "COMPLEMENT_SCHOOL_CORPUS")
            verifier(l["subsection"] == e["pedagogical_relation"] and l["curriculum_status"] == statut,
                     f"{e['event_id']} : relation pédagogique canonique incohérente.")
            verifier(e["justification"] in l["notes"], f"{e['event_id']} : justification validée perdue.")
            for champ in ("review_notes", "curriculum_sources", "consulted_historical_sources"):
                verifier(not e[champ] or e[champ] in l["notes"], f"{e['event_id']} : {champ} perdu dans le lien canonique.")
            verifier(l["date_status_raw"] == e["date_status"], f"{e['event_id']} : statut de date du lien altéré.")
        for champ in ("justification", "curriculum_sources", "consulted_historical_sources", "dataset_source_ids"):
            verifier(bool(e[champ]), f"{e['event_id']} : {champ} manquant.")
        if e["event_id"] == "EVT-0905":
            verifier_validation(e, {"VALIDE_SOUS_CONDITION"}, e["event_id"])
            verifier(e["date_status"] == "CONVENTIONAL", "EVT-0905 : conserver le statut CONVENTIONAL exigé par Antonin.")
            verifier("17 octobre" in e["review_notes"] and "19 octobre" in e["review_notes"],
                     "EVT-0905 : conserver la note distinguant le 17 et le 19 octobre 1973.")
            verifier("17 octobre" in events.get("EVT-0905", {}).get("notes", "") and "19 octobre" in events.get("EVT-0905", {}).get("notes", ""),
                     "EVT-0905 : distinction 17/19 octobre absente de la note canonique importable.")
        else:
            verifier_validation(e, {"VALIDE"}, e["event_id"])
    conserves = set()
    for f in fixes:
        cid = f["chapter_id"]
        t = themes.get(cid)
        for champ, original in (("level", "level"), ("program_scope", "program_scope"),
                                ("school_year", "school_year"), ("chapter_title", "theme_title")):
            if t:
                verifier(f[champ] == t[original], f"{cid} : métadonnée {champ} altérée.")
        # Ces colonnes décrivent l'audit AVANT application ; ne pas réécrire la validation.
        verifier(f["current_event_count"] == "0" and f["current_playable_event_count"] == "0", f"{cid} : trace de l'audit initial altérée.")
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
            verifier(FUSIONS.get(cid) == cible and cid not in themes, f"{cid} : fusion validée non appliquée.")
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
    # Recherche dans TOUS les CSV : seuls les trois fichiers de propositions
    # conservent les anciens IDs comme trace de validation.
    traces = {f"kiffeurs-chapter-{nom}-v18.csv" for nom in ("fixes", "event-proposals", "new-events")}
    motif = re.compile(r"\bTHM-(?:023|032|033|034|035)\b", re.IGNORECASE)
    for fichier in sorted(d.glob("*.csv")):
        if fichier.name in traces:
            continue
        with fichier.open(encoding="utf-8-sig", newline="") as h:
            rows = list(csv.DictReader(h))
        verifier(not motif.search(fichier.read_text(encoding="utf-8-sig")), f"{fichier.name} : référence à un chapitre fusionné.")
        for r in rows:
            for champ in ("event_id", "resolved_event_ids", "canonical_event_id", "proposed_event_ids"):
                if champ in r:
                    verifier(all(eid in events for eid in liste(r[champ])), f"{fichier.name} : référence d'événement orpheline.")
            for champ in ("theme_id", "chapter_id"):
                if champ in r:
                    verifier(all(cid in themes for cid in liste(r[champ])), f"{fichier.name} : référence de chapitre orpheline.")
    collections = {r["collection_id"]: r for r in lire(d, "collections")}
    tags = {r["tag_id"]: r for r in lire(d, "tags")}
    for nom, cles in (("collection-tags", ("collection_id", "tag_id")), ("collection-events", ("collection_id", "event_id")),
                       ("event-tags", ("event_id", "tag_id"))):
        rows = lire(d, nom)
        refs = {"collection_id": collections, "tag_id": tags, "event_id": events}
        verifier(all(r[k] in refs[k] for r in rows for k in cles), f"{nom} : référence orpheline.")
        # Les tags sémantiques préexistants peuvent avoir plusieurs provenances ;
        # le contrôle d'unicité porte sur les tags scolaires concernés ici.
        uniques = [r for r in rows if tags[r["tag_id"]]["tag_type"] == "CURRICULUM_THEME"] if nom == "event-tags" else rows
        verifier(len(uniques) == len({tuple(r[k] for k in cles) for r in uniques}), f"{nom} : doublon de relation scolaire.")
    summaries = {r["collection_id"]: r for r in lire(d, "collection-summary")}
    verifier(summaries.keys() == collections.keys(), "Résumés de collections manquants ou orphelins.")
    ce = lire(d, "collection-events")
    et = lire(d, "event-tags")
    for cid in CONSERVES | {"THM-028": 20}:
        cs = [c for c in collections.values() if c["theme_id"] == cid and c["collection_type"] == "CURRICULUM_THEME"]
        ts = [t for t in tags.values() if t["slug"] == f"theme-{cid.lower()}"]
        verifier(len(cs) == len(ts) == 1, f"{cid} : collection/tag absent ou dupliqué.")
        if len(cs) == len(ts) == 1:
            c, tag = cs[0], ts[0]
            membres = {r["event_id"] for r in ce if r["collection_id"] == c["collection_id"]}
            tagues = {r["event_id"] for r in et if r["tag_id"] == tag["tag_id"]}
            verifier(membres == tagues == liens[cid], f"{cid} : collection/tag incohérent avec les liens canoniques.")
            s = summaries.get(c["collection_id"], {})
            verifier(s.get("event_count") == str(len(membres)) and s.get("playable_event_count") == str(sum(events[e]["playable"] == "TRUE" for e in membres)),
                     f"{cid} : résumé de collection incohérent.")
            verifier(c["level"] == themes[cid]["level"] and c["title"] == tag["name"] == s.get("title"), f"{cid} : libellés scolaires incohérents.")
    for erreur in erreurs:
        print(f"ERREUR : {erreur}")
    if erreurs:
        return 1
    print(f"OK : {len(fixes)} décisions, {len(details)} liens proposés / {len({e['event_id'] for e in details})} événements distincts existants et jouables, {len(nouveaux)} nouveaux candidats sans event_id.")
    validations = sum(bool(l["antonin_validation"]) for l in [*fixes, *details, *nouveaux])
    print(f"Métadonnées, dates et précision conservées ; {validations}/{len(fixes) + len(details) + len(nouveaux)} validations d'Antonin renseignées.")
    print(f"Canonique : {len(themes)} chapitres titrés et non vides, {len(paires)} liens uniques, cinq fusions appliquées et THM-028/11 liens corrigés.")
    print("THM-030/037/040 : 10/8/5 événements jouables ; EVT-0905 : CONVENTIONAL et note du 17/19 octobre conservés.")
    insuffisants = [(cid, sum(events[e]["playable"] == "TRUE" for e in liens[cid])) for cid in themes if sum(events[e]["playable"] == "TRUE" for e in liens[cid]) < 5]
    print(f"Information hors des huit cas de l'issue #9 : chapitres préexistants avec moins de cinq événements jouables : {insuffisants}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
