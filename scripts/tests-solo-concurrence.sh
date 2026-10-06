#!/usr/bin/env bash
# Appelé uniquement par tests-sql.sh sur son Postgres vide local/CI.
set -euo pipefail
cd "$(dirname "$0")/.."
psql_q() { psql -v ON_ERROR_STOP=1 -q "$@"; }
game_id=$(psql_q -Atc "set role anon; select histoire.start_game(p_token => repeat('f',64), p_question_count => 1)->>'game_id';")
question_id=$(psql_q -Atc "set role anon; select histoire.next_question('$game_id',repeat('f',64))->>'question_id';")
[[ $game_id =~ ^[a-f0-9-]{36}$ && $question_id =~ ^[a-f0-9-]{36}$ ]]
logs=$(mktemp -d)
capacity_game_id=''
IFS='|' read -r previous_max_games previous_max_questions <<< "$(psql_q -Atc 'select max_games,max_questions from histoire.solo_anonymous_limits;')"
cleanup() {
  if [[ -n $capacity_game_id ]]; then
    psql_q -c "delete from histoire.games where id = '$capacity_game_id';"
  fi
  psql_q -c "update histoire.solo_anonymous_limits set max_games=$previous_max_games,max_questions=$previous_max_questions;"
  psql_q -c "delete from histoire.games where id = '$game_id';"
  rm -rf -- "$logs"
}
trap cleanup EXIT
answer() {
  # Le gagnant garde son verrou une seconde : l'autre transaction doit attendre,
  # puis constater answered_at au lieu d'écraser le résultat.
  psql_q -c "begin; set local role anon; select histoire.submit_answer('$game_id','$question_id',p_year => 2000,p_token => repeat('f',64)); select pg_sleep(1); commit;"
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

# Une seule place disponible : les deux créations concurrentes ne doivent pas
# dépasser le budget, même avec des jetons différents et via la RPC directe.
before_count=$(psql_q -Atc 'select count(*) from histoire.games where user_id is null;')
psql_q -c "update histoire.solo_anonymous_limits set max_games=$before_count+1;"
create_game() {
  psql_q -Atc "begin; set local role anon; select histoire.start_game(p_token=>repeat('$1',64),p_question_count=>1)->>'game_id'; select pg_sleep(1); commit;"
}
create_game 1 >"$logs/create-first" 2>&1 & first=$!
create_game 2 >"$logs/create-second" 2>&1 & second=$!
first_status=0; wait "$first" || first_status=$?
second_status=0; wait "$second" || second_status=$?
if [[ $first_status == 0 && $second_status != 0 ]]; then
  accepted="$logs/create-first"; rejected="$logs/create-second"
elif [[ $second_status == 0 && $first_status != 0 ]]; then
  accepted="$logs/create-second"; rejected="$logs/create-first"
else
  cat "$logs/create-first" "$logs/create-second"
  echo 'ÉCHEC : le quota doit accepter exactement une création concurrente' >&2
  exit 1
fi
capacity_game_id=$(head -n1 "$accepted")
[[ $capacity_game_id =~ ^[a-f0-9-]{36}$ ]]
grep -q 'Capacité des parties anonymes atteinte' "$rejected"
[[ $(psql_q -Atc 'select count(*) from histoire.games where user_id is null;') == $((before_count+1)) ]]
echo 'OK : budget anonyme respecté entre deux créations concurrentes'
