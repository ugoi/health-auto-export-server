#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
root=$(pwd)
network=ste334-hae-runtime-test
db_id=
test_id=
if docker network inspect "$network" >/dev/null 2>&1 || \
   docker container inspect ste334-hae-mongo >/dev/null 2>&1 || \
   docker container inspect ste334-hae-node24-test >/dev/null 2>&1; then
  echo 'An isolated fixture name is already in use; refusing to touch it.' >&2
  exit 1
fi
network_id=$(docker network create --internal "$network")
cleanup() {
  status=$?
  if [[ -n "$test_id" ]]; then docker rm -f "$test_id" >/dev/null; fi
  if [[ -n "$db_id" ]]; then docker rm -f "$db_id" >/dev/null; fi
  docker network rm "$network_id" >/dev/null
  exit "$status"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
# Existing MongoDB image, but a new empty tmpfs: no production settings or volumes.
db_id=$(docker create --name ste334-hae-mongo --network "$network" \
  --user 0:0 --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /data/db:rw,size=1g --tmpfs /data/configdb:rw,size=16m \
  --entrypoint /usr/bin/mongod \
  sha256:62ef75015134236c8821ef194402444fb4f44af95364b835d509fdf8413277f5 \
  --bind_ip_all --dbpath /data/db --wiredTigerCacheSizeGB 0.25)
docker start "$db_id" >/dev/null
ready=0
for ((n=0; n<30; n++)); do
  if docker exec "$db_id" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]]
docker exec "$db_id" mongosh --quiet --eval 'db.getSiblingDB("admin").createUser({user:"ste334_fixture",pwd:"ste334_fixture_only",roles:["root"]})' >/dev/null
test_id=$(docker create --name ste334-hae-node24-test --network "$network" \
  --cap-drop ALL --security-opt no-new-privileges \
  -e STE334_TEST_MONGO_URI='mongodb://ste334_fixture:ste334_fixture_only@ste334-hae-mongo:27017/?authSource=admin' \
  -e MONGO_USERNAME=ste334_fixture -e MONGO_PASSWORD=ste334_fixture_only \
  -e MONGO_HOST=ste334-hae-mongo -e MONGO_PORT=27017 -e MONGO_DB=hae_runtime_proof \
  -e READ_TOKEN=sk-ste334-fixture-read -e WRITE_TOKEN=sk-ste334-fixture-write \
  --entrypoint sh "${1:-ste334-hae:node24.22.1}" \
  -c 'yarn build && yarn test && node /tmp/runtime-smoke.cjs')
# Explicit archive modes avoid carrying host umask 077 into cap-drop ALL.
# These writes affect only this new container, never the retained image.
tar --mode=0644 --owner=0 --group=0 --numeric-owner -cf - \
  -C "$root/test" sleep.test.ts | docker cp - "$test_id:/usr/src/server/test/"
tar --mode=0644 --owner=0 --group=0 --numeric-owner -cf - \
  -C "$root/test" runtime-smoke.cjs | docker cp - "$test_id:/tmp/"
timeout 180s docker start --attach "$test_id"
[[ $(docker inspect --format '{{.State.ExitCode}}' "$test_id") == 0 ]]
