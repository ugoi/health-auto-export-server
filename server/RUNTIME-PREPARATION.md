# STE-334: isolated Node 24.22.1 runtime candidate

This is a packaging-only candidate for the already patched **Health Auto Export
Server (HAE)**. It does not deploy or restart the application. The original
`Dockerfile` and application source are unchanged.

## Provenance and preservation

- Deployed source image:
  `sha256:67a5792ba3f1962f02781a445a8437a37ddb27d5833eb40f2af3b87ecb0a9d44`.
- Source/test/build/lock files in that image match the existing fork at
  `59b674a3f83e6d0b57878a05db61f5c6dc91b489`. This includes the existing sleep
  segment, idempotency and Europe/Zurich day-boundary fixes.
- `runtime-artifacts.json` records SHA-256 for every regular file and the target
  of every symlink in the deployed `/usr/src/server` tree: 14,092 entries.
  The candidate copies that complete tree, including `dist` and installed
  dependencies, and fails its build if any entry differs.
- Source `yarn.lock` SHA-256:
  `138867d8c617b11c6fd8d0036bff0884fc6859444083707a95a2d8b5c5bd9e62`.
  **It is not the effective dependency lock of the deployed image.** The old
  Dockerfile executes `yarn install` before copying `yarn.lock`; its installed
  resolutions differ from that file. No install, dependency update or fresh
  resolution is performed by this candidate.

The retained immutable image is a required build input. A Git checkout or bundle
alone cannot recreate its installed dependencies. Preserve that image through
the normal deployment backup/retention process before replacing or pruning it.
Reconstructing a clean, effective dependency lock is separate work; this
preparation does not certify the old full-source Docker build as reproducible.

## Official runtime and native modules

The candidate changes Node `v24.16.0` to official stable LTS `v24.22.1` while
retaining Alpine 3.24:

`node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53`

The official linux/amd64 image digest is
`sha256:1200d815de24f8dcca745fbf7651d166034a35adbcad8860a8538ffff44f1420`.
Both runtimes expose Node module ABI **137** and N-API **10**. The build loads the
retained musl native bindings for Rolldown and Lightning CSS. Their GNU optional
counterparts are retained byte-for-byte but are not the Alpine-selected modules.
This proof applies to linux/amd64/Alpine 3.24 and this Node patch release; do not
reuse it for a new major, libc, platform or dependency set.

Primary references checked on 2026-10-23:

- https://nodejs.org/en/blog/release/v24.22.1
- https://nodejs.org/dist/index.json
- https://hub.docker.com/v2/repositories/library/node/tags/24.22.1-alpine3.24

## Build and isolated checks

On a Docker build host already retaining the source image, run from `server/`:

```sh
./build-runtime.sh ste334-hae:node24.22.1
./test-runtime.sh ste334-hae:node24.22.1
```

The build helper verifies the source image identity, creates only the named
`ste334-hae-artifacts:67a5792` alias if absent, and builds with build-step network
disabled. Pulling the pinned official runtime layers may still require network.

The test helper refuses occupied fixture names, creates an **internal** Docker
network, runs an existing immutable MongoDB binary against a new empty tmpfs,
and supplies only synthetic credentials/data. It publishes no ports, mounts no
host data, and copies only two test files into the new disposable container.
Cleanup removes only container and network IDs
created by that invocation; a test-container attachment is bounded to 180 seconds.
The Mongo image is
`sha256:62ef75015134236c8821ef194402444fb4f44af95364b835d509fdf8413277f5`.

The only existing test-source change adds an explicitly named Mongo fixture
option because MongoMemoryServer does not ship an Alpine binary. Its five
existing assertions are unchanged; the original local default remains intact.
The adjusted test is copied into the disposable test container only, not copied
over the byte-preserved test file inside the candidate image.

Checks cover TypeScript compilation, the existing five sleep ingestion/day
tests, byte-identical rebuilt `dist`, process startup, Mongo-connected health,
the root response and rejection of unauthenticated reads/writes. They do not
use or validate personal health records, exercise the iOS exporter, deploy the
candidate, change MongoDB, or certify a fresh dependency installation.

Validated on Production's isolated fixture on 2026-10-23: build and final test
script exited 0; all five existing tests passed; rebuilt JavaScript was
byte-identical; health reported `ok`/`connected`; unauthenticated read and write
requests returned 401. Setup-only failures were corrected by explicit fixture
file modes and a 1 GiB tmpfs ceiling (MongoDB requires 500 MiB free for index
creation). No application or dependency change was needed for these corrections.

## Deployment boundary

Deployment belongs to the main STE-334 owner using the existing Dockhand stack
and supported application lifecycle. Keep existing environment/volumes and the
old image for rollback; do not use fixture configuration in production. Rollback
of this packaging change selects the exact old image. No database schema or
application-code change is introduced here. Existing startup behavior, including
the already deployed sleep index synchronization, is unchanged.

The shared repository's uncommitted README and Compose edits belong to other
work and were neither copied into this candidate nor changed.
