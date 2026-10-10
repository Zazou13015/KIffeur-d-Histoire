#!/usr/bin/env bash
# Deux transactions réelles, uniquement dans le simulateur local de tests-sql.sh.
set -euo pipefail
case "${PGHOST:-localhost}" in localhost|127.0.0.1|/var/run/postgresql) ;; *) exit 1 ;; esac
if [[ -n ${PGSERVICE:-} || ${PGDATABASE:-postgres} == *[:=/]* ]]; then exit 1; fi
psql_q() { psql -v ON_ERROR_STOP=1 -q "$@"; }
logs=$(mktemp -d)
cleanup() {
  psql_q <<'SQL'
delete from histoire.pack_event_status where pack_id='CONC87';
delete from histoire.pack_event_audit where pack_id='CONC87';
delete from histoire.pack_events where pack_id='CONC87';
delete from histoire.packs where id='CONC87';
delete from histoire.admins where user_id='00000000-0000-0000-0000-000000000024';
SQL
  rm -rf -- "$logs"
}
trap cleanup EXIT
psql_q <<'SQL'
insert into histoire.players(id) values ('00000000-0000-0000-0000-000000000024') on conflict do nothing;
insert into histoire.admins(user_id,note) values ('00000000-0000-0000-0000-000000000024','Concurrence locale #87');
insert into histoire.packs(id,slug,title) values ('CONC87','conc87','Concurrence locale');
insert into histoire.pack_events(pack_id,event_id,position)
  select 'CONC87',id,1 from histoire.events order by id limit 1;
SQL
event_id=$(psql_q -Atc "select event_id from histoire.pack_events where pack_id='CONC87'")
[[ $event_id =~ ^[a-zA-Z0-9-]+$ ]]
change() {
  psql_q -c "begin; set local role authenticated;
    set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000024';
    select histoire.admin_${1}_pack_event('CONC87','$event_id'); select pg_sleep(1); commit;"
}
for operation in remove restore; do
  change "$operation" >"$logs/first" 2>&1 & first=$!
  change "$operation" >"$logs/second" 2>&1 & second=$!
  first_status=0; wait "$first" || first_status=$?
  second_status=0; wait "$second" || second_status=$?
  if [[ $first_status != 0 || $second_status != 0 ]]; then
    cat "$logs/first" "$logs/second"; exit 1
  fi
done
[[ $(psql_q -Atc "select count(*) from histoire.pack_event_status where pack_id='CONC87' and not removed") == 1 ]]
[[ $(psql_q -Atc "select string_agg(operation,',' order by id) from histoire.pack_event_audit where pack_id='CONC87'") == 'retirer,remettre' ]]
echo 'OK : retraits et réintégrations concurrents sans doublon d’état ni d’audit'
