#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source_id=sha256:67a5792ba3f1962f02781a445a8437a37ddb27d5833eb40f2af3b87ecb0a9d44
source_tag=ste334-hae-artifacts:67a5792
[[ $(docker image inspect --format '{{.Id}}' "$source_id") == "$source_id" ]]
if docker image inspect "$source_tag" >/dev/null 2>&1; then
  [[ $(docker image inspect --format '{{.Id}}' "$source_tag") == "$source_id" ]]
else
  docker tag "$source_id" "$source_tag"
fi
DOCKER_BUILDKIT=1 docker build --network none -f Dockerfile.runtime \
  -t "${1:-ste334-hae:node24.22.1}" .
