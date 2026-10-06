#!/usr/bin/env python3
"""Vérifie l'import réel dans le conteneur Supabase LOCAL du dépôt, puis sa sécurité.

Usage : python3 scripts/verifier-import-chapitres-local.py [--exiger-cinq-partout]
Ne lit aucun fichier d'environnement et ne peut pas se connecter à une base distante.
À lancer après un reset local et l'import de content/dataset-v18.
"""
import argparse
import csv
import json
import os
import subprocess
import sys
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
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--exiger-cinq-partout", action="store_true", help="Refuser l'import si un chapitre reste sous cinq événements jouables.")
    p.add_argument("--avec-descriptions-proposees", action="store_true", help="Comparer les explications à la fusion locale des propositions de l'issue #8.")
    p.add_argument("--descriptions-existantes", type=Path, help="Capture des explications présentes avant import, pour vérifier leur conservation.")
    p.add_argument("--capturer-descriptions", type=Path, help="Enregistrer les descriptions préexistantes dans un JSON privé, puis quitter sans import.")
    args = p.parse_args()
    endpoint = subprocess.check_output(["docker", "context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], text=True).strip()
    if not endpoint.startswith(("npipe://", "unix://")):
        raise RuntimeError("Contrôle refusé : le contexte Docker n'est pas un moteur local.")
    if any(os.environ.get(nom) for nom in ("DOCKER_HOST", "DOCKER_CONTEXT")):
        raise RuntimeError("Contrôle refusé : retirer les overrides Docker avant de vérifier le moteur local.")
    if args.capturer_descriptions:
        descriptions = requete("select coalesce(json_object_agg(event_id,description),'{}') from histoire.event_answers where description is not null")
        args.capturer_descriptions.write_text(json.dumps(descriptions, ensure_ascii=False), encoding="utf-8")
        print(f"Capture locale privée : {len(descriptions)} descriptions préexistantes ; aucun import effectué.")
        return 0
    themes = {t["theme_id"]: t for t in lire("themes")}
    events = {e["event_id"]: e for e in lire("events")}
    propositions = {}
    if args.avec_descriptions_proposees:
        lignes = lire("description-additions")
        assert len(lignes) == len({r["event_id"] for r in lignes}) == 304, "Attendu 304 propositions distinctes."
        assert all(r["antonin_validation"] == "VALIDE" and r["a_verifier"] == "NON" for r in lignes), "Les 304 descriptions doivent être validées par Antonin."
        propositions = {r["event_id"]: r["description_short"] for r in lignes}
    avant = json.loads(args.descriptions_existantes.read_text(encoding="utf-8")) if args.descriptions_existantes else {}
    links = {(l["theme_id"], l["event_id"]): l for l in lire("curriculum-links") if l["theme_id"] and l["event_id"]}
    chapitres = requete("select coalesce(json_agg(x), '[]') from (select c.id,c.title,l.name as level from histoire.chapters c join histoire.levels l on l.id=c.level_id) x")
    assert len(chapitres) == len(themes) == 41, "Nombre de chapitres importés incorrect."
    assert {c["id"] for c in chapitres} == themes.keys(), "IDs de chapitres importés différents du canonique."
    assert all(c["title"] == themes[c["id"]]["theme_title"] and c["level"] == themes[c["id"]]["level"] for c in chapitres), "Titres/niveaux importés incorrects."
    relations = requete("select coalesce(json_agg(x), '[]') from (select chapter_id,event_id,curriculum_status from histoire.event_chapters) x")
    assert len(relations) == len(links) == 534, "Nombre de rattachements importés incorrect."
    assert {(r["chapter_id"], r["event_id"]) for r in relations} == links.keys(), "Rattachements importés différents du canonique."
    assert all(r["curriculum_status"] == (links[(r["chapter_id"], r["event_id"])]["curriculum_status"] or None) for r in relations), "Statuts pédagogiques importés incorrects."
    tags_attendus = {t["tag_id"] for t in lire("tags")}
    tags_importes = requete("select coalesce(json_agg(id), '[]') from histoire.tags")
    assert len(tags_importes) == len(tags_attendus) and set(tags_importes) == tags_attendus, "Tags importés différents du canonique."
    paires_tags = {(r["event_id"], r["tag_id"]) for r in lire("event-tags")}
    tags_evenements = requete("select coalesce(json_agg(x), '[]') from (select event_id,tag_id from histoire.event_tags) x")
    assert len(tags_evenements) == len(paires_tags) and {(r["event_id"], r["tag_id"]) for r in tags_evenements} == paires_tags, "Appartenances aux tags importées incomplètes ou dupliquées."
    importes = requete("select coalesce(json_agg(x), '[]') from (select e.id,e.title,e.event_type,e.playable,e.playable_mode,e.importance,e.difficulty,e.source_status,e.precision,e.date_status,a.start_year,a.start_month,a.start_day,a.end_year,a.end_month,a.end_day,a.date_text,a.secondary_dates,a.calendar_system,a.description,a.notes from histoire.events e join histoire.event_answers a on a.event_id=e.id) x")
    assert len(importes) == len(events) == 2001 and {e["id"] for e in importes} == events.keys(), "Événements/réponses importés incomplets."
    for e in importes:
        canon = events[e["id"]]
        assert e["playable"] == (canon["playable"] == "TRUE") and e["precision"] == canon["precision"] and e["date_status"] == canon["date_status"], f"{e['id']} : métadonnées de jeu altérées."
        for champ in ("start_year", "start_month", "start_day", "end_year", "end_month", "end_day"):
            assert e[champ] == (int(canon[champ]) if canon[champ] else None), f"{e['id']} : date importée altérée."
        assert e["title"] == canon["title_canonical"], f"{e['id']} : titre altéré à l'import."
        for champ in ("event_type", "playable_mode", "source_status", "date_text", "secondary_dates", "calendar_system", "notes"):
            assert e[champ] == (canon[champ] or None), f"{e['id']} : {champ} altéré à l'import."
        description = canon["description_short"] or avant.get(e["id"]) or propositions.get(e["id"])
        assert e["description"] == (description or None), f"{e['id']} : description altérée à l'import."
        for champ in ("importance", "difficulty"):
            assert e[champ] == int(canon[champ]), f"{e['id']} : {champ} altéré à l'import."
    catal = next(e for e in importes if e["id"] == "EVT-2042")
    assert (catal["event_type"], catal["start_year"], catal["end_year"], catal["precision"], catal["date_status"], catal["playable_mode"]) == ("PERIOD", -7100, -5950, "YEAR_RANGE", "APPROXIMATE", "RANGE"), "Plage de Çatalhöyük altérée."
    aliases = requete("select coalesce(json_agg(alias), '[]') from histoire.event_aliases where event_id='EVT-2042'")
    assert len(aliases) == 3 and set(aliases) == set(events["EVT-2042"]["aliases"].split(";")), "Alias de Çatalhöyük incomplets ou dupliqués."
    packs_attendus = {r["collection_id"] for r in lire("ready-collections")}
    packs = requete("select coalesce(json_agg(id), '[]') from histoire.packs")
    assert len(packs) == len(packs_attendus) == 24 and set(packs) == packs_attendus, "Packs importés incomplets."
    membres_attendus = {(r["collection_id"], r["event_id"], int(r["position"])) for r in lire("ready-collection-events")}
    membres = requete("select coalesce(json_agg(x), '[]') from (select pack_id,event_id,position from histoire.pack_events) x")
    assert len(membres) == len(membres_attendus) and {(r["pack_id"], r["event_id"], r["position"]) for r in membres} == membres_attendus, "Membres/positions des packs altérés."
    embargo = next(e for e in importes if e["id"] == "EVT-0905")
    assert embargo["date_status"] == "CONVENTIONAL" and "17 octobre" in embargo["notes"] and "19 octobre" in embargo["notes"], "Condition EVT-0905 perdue à l'import."
    sargon = next(e for e in importes if e["id"] == "EVT-0553")
    assert sargon["start_year"] == -2334 and sargon["date_status"] == "CONVENTIONAL", "Borne/statut EVT-0553 altérés à l'import."
    assert sargon["notes"] == events["EVT-0553"]["notes"] and all(mot in sargon["notes"] for mot in ("borne chronologique conventionnelle", "Louvre", "Met", "2334-2279", "2340-2285", "jamais une fondation exacte", "ni un repère obligatoire")), "Condition EVT-0553 perdue à l'import."
    assert links[("THM-004", "EVT-0553")]["subsection"] == "ANCRAGE_COMPLEMENTAIRE" and next(r for r in relations if r["chapter_id"] == "THM-004" and r["event_id"] == "EVT-0553")["curriculum_status"] == "COMPLEMENT_SCHOOL_CORPUS", "Sargon promu en repère obligatoire."
    jouables = {e["id"] for e in importes if e["playable"]}
    nombres = Counter(r["chapter_id"] for r in relations)
    nombres_jouables = Counter(r["chapter_id"] for r in relations if r["event_id"] in jouables)
    assert all(nombres[cid] > 0 for cid in themes), "Chapitre importé vide."
    for cid, minimum in (("THM-030", 10), ("THM-037", 8), ("THM-040", 5), ("THM-002", 5), ("THM-004", 5), ("THM-039", 5), ("THM-044", 5)):
        assert nombres_jouables[cid] >= minimum, f"{cid} : événements jouables insuffisants après import."
    print("OK import local : 41 chapitres titrés/non vides, 534 liens canoniques et 2 001 événements avec dates intactes.")
    print("OK : THM-030/037/040 ont 10/8/5 événements jouables ; THM-028 est en Terminale ; condition EVT-0905 importée.")
    print("OK : THM-002/004/039/044 ont 5/5/5/5 jouables ; conditions de Sargon et Çatalhöyük importées.")
    print("OK : EVT-2042 conserve sa plage APPROXIMATE/RANGE, ses trois alias et son appartenance au pack Expert ; les 24 packs concordent avec les CSV.")
    if args.avec_descriptions_proposees:
        completees = sum(not events[eid]["description_short"] and not avant.get(eid) for eid in propositions)
        conservees = sum(not events[eid]["description_short"] and bool(avant.get(eid)) for eid in propositions)
        print(f"OK descriptions : 304 validées par Antonin ; {completees} propositions importées, {conservees} explications préexistantes conservées, comparaison intégrale des 2 001 réponses privées.")
    print(f"OK : {len(tags_attendus)} tags et {len(paires_tags)} associations événement/tag canoniques importés sans doublon.")
    insuffisants = {cid: nombres_jouables[cid] for cid in themes if nombres_jouables[cid] < 5}
    print("Chapitres préexistants hors des huit cas avec moins de cinq jouables :", insuffisants)
    test = (RACINE / "supabase/tests/reponses_invisibles.sql").read_text(encoding="utf-8-sig")
    resultat = subprocess.run(["docker", "exec", "-i", CONTENEUR, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-f", "-"], input=test, text=True, encoding="utf-8", capture_output=True, check=True)
    assert "OK : anon" in resultat.stdout and "OK : authenticated" in resultat.stdout, "Résultats de sécurité manquants."
    print(resultat.stdout.strip())
    if args.exiger_cinq_partout and insuffisants:
        for cid, nombre in insuffisants.items():
            print(f"ÉCHEC seuil global après import local : {cid} a {nombre} événements jouables ; minimum attendu : 5.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
