#!/usr/bin/env python3
"""Vérifie l'import réel dans le conteneur Supabase LOCAL du dépôt, puis sa sécurité.

Usage : python3 scripts/verifier-import-chapitres-local.py
Ne lit aucun fichier d'environnement et ne peut pas se connecter à une base distante.
À lancer après un reset local et l'import de content/dataset-v18.
"""
import csv
import json
import os
import subprocess
from collections import Counter
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
CONTENEUR = "supabase_db_kiffeurs-histoire"


def lire(nom):
    with (RACINE / "content/dataset-v18" / f"kiffeurs-{nom}-v18.csv").open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def requete(sql):
    sortie = subprocess.check_output(
        ["docker", "exec", CONTENEUR, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
        text=True, encoding="utf-8",
    )
    return json.loads(sortie)


def main():
    endpoint = subprocess.check_output(["docker", "context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], text=True).strip()
    if not endpoint.startswith(("npipe://", "unix://")):
        raise RuntimeError("Contrôle refusé : le contexte Docker n'est pas un moteur local.")
    if any(os.environ.get(nom) for nom in ("DOCKER_HOST", "DOCKER_CONTEXT")):
        raise RuntimeError("Contrôle refusé : retirer les overrides Docker avant de vérifier le moteur local.")
    themes = {t["theme_id"]: t for t in lire("themes")}
    events = {e["event_id"]: e for e in lire("events")}
    links = {(l["theme_id"], l["event_id"]): l for l in lire("curriculum-links") if l["theme_id"] and l["event_id"]}
    chapitres = requete("select coalesce(json_agg(x), '[]') from (select c.id,c.title,l.name as level from histoire.chapters c join histoire.levels l on l.id=c.level_id) x")
    assert len(chapitres) == len(themes) == 41, "Nombre de chapitres importés incorrect."
    assert {c["id"] for c in chapitres} == themes.keys(), "IDs de chapitres importés différents du canonique."
    assert all(c["title"] == themes[c["id"]]["theme_title"] and c["level"] == themes[c["id"]]["level"] for c in chapitres), "Titres/niveaux importés incorrects."
    relations = requete("select coalesce(json_agg(x), '[]') from (select chapter_id,event_id,curriculum_status from histoire.event_chapters) x")
    assert len(relations) == len(links) == 526, "Nombre de rattachements importés incorrect."
    assert {(r["chapter_id"], r["event_id"]) for r in relations} == links.keys(), "Rattachements importés différents du canonique."
    assert all(r["curriculum_status"] == (links[(r["chapter_id"], r["event_id"])]["curriculum_status"] or None) for r in relations), "Statuts pédagogiques importés incorrects."
    importes = requete("select coalesce(json_agg(x), '[]') from (select e.id,e.playable,e.precision,e.date_status,a.start_year,a.start_month,a.start_day,a.end_year,a.end_month,a.end_day,a.notes from histoire.events e join histoire.event_answers a on a.event_id=e.id) x")
    assert len(importes) == len(events) == 2000 and {e["id"] for e in importes} == events.keys(), "Événements/réponses importés incomplets."
    for e in importes:
        canon = events[e["id"]]
        assert e["playable"] == (canon["playable"] == "TRUE") and e["precision"] == canon["precision"] and e["date_status"] == canon["date_status"], f"{e['id']} : métadonnées de jeu altérées."
        for champ in ("start_year", "start_month", "start_day", "end_year", "end_month", "end_day"):
            assert e[champ] == (int(canon[champ]) if canon[champ] else None), f"{e['id']} : date importée altérée."
    embargo = next(e for e in importes if e["id"] == "EVT-0905")
    assert embargo["date_status"] == "CONVENTIONAL" and "17 octobre" in embargo["notes"] and "19 octobre" in embargo["notes"], "Condition EVT-0905 perdue à l'import."
    jouables = {e["id"] for e in importes if e["playable"]}
    nombres = Counter(r["chapter_id"] for r in relations)
    nombres_jouables = Counter(r["chapter_id"] for r in relations if r["event_id"] in jouables)
    assert all(nombres[cid] > 0 for cid in themes), "Chapitre importé vide."
    for cid, minimum in (("THM-030", 10), ("THM-037", 8), ("THM-040", 5)):
        assert nombres_jouables[cid] >= minimum, f"{cid} : événements jouables insuffisants après import."
    print("OK import local : 41 chapitres titrés/non vides, 526 liens canoniques et 2 000 événements avec dates intactes.")
    print("OK : THM-030/037/040 ont 10/8/5 événements jouables ; THM-028 est en Terminale ; condition EVT-0905 importée.")
    print("Chapitres préexistants hors des huit cas avec moins de cinq jouables :", {cid: nombres_jouables[cid] for cid in themes if nombres_jouables[cid] < 5})
    test = (RACINE / "supabase/tests/reponses_invisibles.sql").read_text(encoding="utf-8-sig")
    resultat = subprocess.run(["docker", "exec", "-i", CONTENEUR, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-f", "-"], input=test, text=True, encoding="utf-8", capture_output=True, check=True)
    assert "OK : anon" in resultat.stdout and "OK : authenticated" in resultat.stdout, "Résultats de sécurité manquants."
    print(resultat.stdout.strip())


if __name__ == "__main__":
    main()
