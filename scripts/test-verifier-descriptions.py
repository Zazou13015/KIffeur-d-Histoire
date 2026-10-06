#!/usr/bin/env python3
"""Tests adverses du contrôle des descriptions sur des copies temporaires."""
import csv, pathlib, shutil, subprocess, sys, tempfile
r=pathlib.Path(__file__).resolve().parents[1]; d=r/'content/dataset-v18'
def lire(p):
 with p.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def executer(p):
 return subprocess.run([sys.executable,str(r/'scripts/verifier-descriptions.py'),'--dossier',str(p)],capture_output=True,text=True,encoding='utf-8')
cas=[
 ('année explicite', {'description_short':'La loi est votée en 1789. Elle transforme les droits.'}),
 ('année ancienne courte', {'description_short':'La décision est prise en 64. Elle change le gouvernement.'}),
 ('année négative', {'description_short':'La décision est prise vers -44. Elle transforme le pouvoir.'}),
 ('avant notre ère', {'description_short':'Une loi est votée avant notre ère. Elle transforme le pouvoir.'}),
 ('av. J.-C.', {'description_short':'Une loi est votée en 44 av. J.-C. Elle change les droits.'}),
 ('jour et mois', {'description_short':'Le roi signe le 14 juillet. Le régime change.'}),
 ('jour écrit', {'description_short':'Le roi signe le vingt-et-un avril. Le régime change.'}),
 ('mois année', {'description_short':'Le roi signe en juillet 1898. Le régime change.'}),
 ('date numérique', {'description_short':'Le roi signe le 21/04/1944. Le régime change.'}),
 ('date ISO', {'description_short':'Le roi signe le 1944-04-21. Le régime change.'}),
 ('siècle romain', {'description_short':'La loi est adoptée au XXe siècle. Elle change les droits.'}),
 ('siècle arabe', {'description_short':'La loi est adoptée au 20e siècle. Elle change les droits.'}),
 ('siècle écrit', {'description_short':'La loi est adoptée au vingtième siècle. Elle change les droits.'}),
 ('plage', {'description_short':'Le conflit dure de 1914 à 1918. Il transforme les sociétés.'}),
 ('description vide', {'description_short':''}),
 ('limite caractères', {'description_short':'x'*281+'.'}),
 ('trois phrases', {'description_short':'Une loi est votée. Elle change les droits. Elle ouvre un débat.'}),
 ('source absente', {'sources':''}),
 ('validation usurpée', {'antonin_validation':'VALIDE'}),
 ('réserve non marquée', {'a_verifier':'NON','verification_note':'Contexte douteux.'}),
 ('titre erroné', {'title_canonical':'Titre inventé'}),
 ('mauvais niveau', {'lowest_level':'Terminale HGGSP'}),
]
with tempfile.TemporaryDirectory(prefix='issue8-tests-') as temp:
 cible=pathlib.Path(temp)
 for nom in ['events','curriculum-links','description-additions']:shutil.copy2(d/f'kiffeurs-{nom}-v18.csv',cible)
 p=cible/'kiffeurs-description-additions-v18.csv';original=p.read_bytes();base=lire(p)
 def ecrire(rows):
  with p.open('w',encoding='utf-8-sig',newline='') as f:
   w=csv.DictWriter(f,fieldnames=list(base[0]));w.writeheader();w.writerows(rows)
 for nom,mutation in cas:
  rows=[dict(x) for x in base];rows[0].update(mutation);ecrire(rows);result=executer(cible)
  assert result.returncode==1 and 'ERREUR :' in result.stdout, f'{nom} non détecté\n{result.stdout}\n{result.stderr}'
 for nom,rows in [('couverture manquante',base[:-1]),('doublon',base+[base[0]]),('orphelin',[dict(base[0],event_id='EVT-INCONNU')]+base[1:])]:
  ecrire(rows);result=executer(cible);assert result.returncode==1 and 'ERREUR :' in result.stdout, nom
 rows=[dict(x) for x in base];rows[0].update(description_short='Une foule de 1000 personnes participe à la mobilisation. Elle réclame de nouveaux droits.',a_verifier='OUI',verification_note='Nombre de participants, pas une année ; à confirmer dans la source.')
 ecrire(rows);result=executer(cible);assert result.returncode==0 and 'SUSPECT :' in result.stdout, 'Un nombre non chronologique doit être signalé, pas supprimé ni automatiquement interdit.'
 p.write_bytes(original);assert executer(cible).returncode==0
print(f'OK : {len(cas)+3} contrôles négatifs refusés ; nombre non chronologique signalé sans erreur ; dataset original intact.')
