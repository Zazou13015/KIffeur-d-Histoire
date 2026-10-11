#!/usr/bin/env bash
# Deux parentés concurrentes ne doivent pas produire de cycle, LOCAL/CI seulement.
set -euo pipefail
case "${PGHOST:-localhost}" in localhost|127.0.0.1|/var/run/postgresql) ;; *) exit 1 ;; esac
if [[ -n ${PGSERVICE:-} || ${PGDATABASE:-postgres} == *[:=/]* ]]; then exit 1; fi
psql_q() { psql -v ON_ERROR_STOP=1 -q "$@"; }
logs=$(mktemp -d)
cleanup() {
  psql_q -c "update histoire.packs set parent_id=null where id in ('CONC89A','CONC89B'); delete from histoire.packs where id in ('CONC89A','CONC89B');"
  rm -rf -- "$logs"
}
trap cleanup EXIT
psql_q -c "insert into histoire.packs(id,slug,title) values ('CONC89A','conc89a','Parent A'),('CONC89B','conc89b','Parent B');"
psql_q -c "begin; update histoire.packs set parent_id='CONC89B' where id='CONC89A'; select pg_sleep(1); commit;" >"$logs/a" 2>&1 & first=$!
psql_q -c "begin; update histoire.packs set parent_id='CONC89A' where id='CONC89B'; select pg_sleep(1); commit;" >"$logs/b" 2>&1 & second=$!
first_status=0; wait "$first" || first_status=$?
second_status=0; wait "$second" || second_status=$?
if [[ $first_status == 0 && $second_status == 0 ]] || [[ $first_status != 0 && $second_status != 0 ]]; then
  cat "$logs/a" "$logs/b"; exit 1
fi
[[ $(psql_q -Atc "select count(*) from histoire.packs where id in ('CONC89A','CONC89B') and parent_id is not null") == 1 ]]
echo 'OK : un cycle concurrent est refusé'
