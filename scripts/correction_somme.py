"""Exception canonique bornée pour les empreintes historiques, jamais pour l'import.

Valider d'abord la correction dédiée, puis restituer exclusivement les anciennes
valeurs de la Somme sur une copie. Les empreintes de référence restent inchangées.
"""

SOMME_CORRIGEE = {"event_type": "EVENT", "start_year": "1916", "start_month": "7", "start_day": "1",
                  "end_year": "1916", "end_month": "11", "end_day": "18", "precision": "DAY_RANGE",
                  "playable_mode": "RANGE", "date_status": "EXACT", "date_text": "1er juillet - 18 novembre 1916",
                  "playable_reason": "Jouable comme plage/période."}
SOMME_AVANT = {"event_type": "POINT", "start_month": "11", "start_day": "18", "end_year": "",
               "end_month": "", "end_day": "", "precision": "DAY", "playable_mode": "DAY",
               "playable_reason": "Jouable au jour."}


def canon_pour_empreinte(evenements):
    copie = [dict(e) for e in evenements]
    sommes = [e for e in copie if e["event_id"] == "EVT-0210"]
    if len(sommes) != 1 or any(sommes[0].get(k) != v for k, v in SOMME_CORRIGEE.items()):
        raise ValueError("EVT-0210 : attendu EVENT / DAY_RANGE / EXACT / RANGE, du 1er juillet au 18 novembre 1916.")
    sommes[0].update(SOMME_AVANT)
    return copie
