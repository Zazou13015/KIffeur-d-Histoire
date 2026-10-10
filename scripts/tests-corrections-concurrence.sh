#!/usr/bin/env bash
# Deux administrateurs / onglets sur le même événement ; Postgres local uniquement.
set -euo pipefail
case "${PGHOST:-localhost}" in localhost|127.0.0.1|/var/run/postgresql) ;; *) exit 1 ;; esac
if [[ -n ${PGSERVICE:-} || ${PGDATABASE:-postgres} == *[:=/]* ]]; then exit 1; fi
psql_q() { psql -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -q "$@"; }
logs=$(mktemp -d)
cleanup() {
  psql_q <<'SQL'
delete from histoire.event_editorial_audit where event_id='EVT-88991';
delete from histoire.event_editorial_overrides where event_id='EVT-88991';
delete from histoire.pack_events where pack_id='CONC104';
delete from histoire.packs where id='CONC104';
delete from histoire.events where id='EVT-88991';
delete from histoire.admins where user_id='00000000-0000-0000-0000-000000000024';
SQL
  rm -rf -- "$logs"
}
trap cleanup EXIT
psql_q <<'SQL'
insert into histoire.players(id) values ('00000000-0000-0000-0000-000000000024') on conflict do nothing;
insert into histoire.admins(user_id,note) values ('00000000-0000-0000-0000-000000000024','Concurrence locale #104');
insert into histoire.packs(id,slug,title) values ('CONC104','conc104','Concurrence éditoriale');
insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau)
  values ('EVT-88991','Titre initial','POINT','YEAR','EXACT',true,'YEAR',1,1,1);
insert into histoire.pack_events(pack_id,event_id,position) values ('CONC104','EVT-88991',1);
SQL
change() {
  psql_q -c "begin; set local role authenticated;
    set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000024';
    select histoire.admin_edit_event('CONC104','EVT-88991','$1',2,null,'Titre initial',1);
    select pg_sleep(1); commit;"
}
change 'Titre premier' >"$logs/first" 2>&1 & first=$!
change 'Titre second' >"$logs/second" 2>&1 & second=$!
first_status=0; wait "$first" || first_status=$?
second_status=0; wait "$second" || second_status=$?
if [[ $first_status == 0 && $second_status != 0 ]]; then
  grep -q '40001' "$logs/second"
elif [[ $first_status != 0 && $second_status == 0 ]]; then
  grep -q '40001' "$logs/first"
else
  cat "$logs/first" "$logs/second"; exit 1
fi
[[ $(psql_q -Atc "select count(*) from histoire.event_editorial_audit where event_id='EVT-88991' and old_title='Titre initial' and old_niveau=1 and new_niveau=2") == 1 ]]
[[ $(psql_q -Atc "select count(*) from histoire.events e join histoire.event_editorial_overrides o on o.event_id=e.id join histoire.event_editorial_audit a on a.event_id=e.id where e.id='EVT-88991' and e.title=o.title and e.title=a.new_title and e.niveau=o.niveau") == 1 ]]
echo 'OK : corrections concurrentes sérialisées, ancien onglet refusé et audit atomique'
