#!/usr/bin/env bash
# Appelé uniquement par tests-sql.sh sur son Postgres vide local/CI.
set -euo pipefail
cd "$(dirname "$0")/.."
psql_q() { psql -v ON_ERROR_STOP=1 -q "$@"; }
game_id=$(psql_q -Atc "set role anon; select histoire.start_game(p_token => repeat('f',64), p_question_count => 1)->>'game_id';")
question_id=$(psql_q -Atc "set role anon; select histoire.next_question('$game_id',repeat('f',64))->>'question_id';")
[[ $game_id =~ ^[a-f0-9-]{36}$ && $question_id =~ ^[a-f0-9-]{36}$ ]]
logs=$(mktemp -d)
cleanup() {
  psql_q -c "delete from histoire.games where id = '$game_id';"
  rm -rf -- "$logs"
}
trap cleanup EXIT
answer() {
  # Le gagnant garde son verrou une seconde : l'autre transaction doit attendre,
  # puis constater answered_at au lieu d'écraser le résultat.
  psql_q -c "begin; set local role anon; select histoire.submit_answer('$game_id','$question_id',p_token => repeat('f',64)); select pg_sleep(1); commit;"
}
answer >"$logs/first" 2>&1 & first=$!
answer >"$logs/second" 2>&1 & second=$!
first_status=0; wait "$first" || first_status=$?
second_status=0; wait "$second" || second_status=$?
if [[ $first_status == 0 && $second_status != 0 ]]; then
  rejected="$logs/second"
elif [[ $second_status == 0 && $first_status != 0 ]]; then
  rejected="$logs/first"
else
  cat "$logs/first" "$logs/second"
  echo 'ÉCHEC : deux réponses concurrentes doivent produire exactement un succès' >&2
  exit 1
fi
grep -q 'Question inactive ou déjà répondue' "$rejected"
[[ $(psql_q -Atc "select count(*) from histoire.game_questions where game_id = '$game_id' and answered_at is not null;") == 1 ]]
echo 'OK : une seule réponse acceptée entre deux transactions concurrentes'
