# Liss Immich

A small Immich fork for readable physical storage associated with
explicitly selected folder albums.

## Working source

- Initial upstream baseline: Immich **3.3.5**,
  [8303cb117e197c700332b33b61b45314c9cc5bb4](https://github.com/immich-app/immich/commit/8303cb117e197c700332b33b61b45314c9cc5bb4).
- Fork integration branch: **liss**. All fork documents and changes live here.
- **main** remains an unmodified upstream copy.
- Assignment and workflow: [AGENTS.md](AGENTS.md).
- Current work: [CURRENT.md](CURRENT.md).
- Tasks and results: [issues](https://github.com/AV-Lex/liss-immich/issues).

## Existing architecture — first deliverable

[D0](https://github.com/AV-Lex/liss-immich/issues/1) creates a concise,
source-verified map of the existing upstream implementation: principal
responsibilities, direct paths to contracts/code, important data flows
and the reusable mechanisms relevant to this change. This map is not
written or accepted yet. Use the upstream README and CONTRIBUTING as
starting points; check version-dependent claims against the pinned source.

Keep the map here while it remains compact. Link to detailed upstream
documents rather than duplicating them. Distinguish stock behaviour,
known limitations and the fork delta.

## Planned fork delta

[D1](https://github.com/AV-Lex/liss-immich/issues/2) covers initial physical
placement and subsequent uploads into explicitly bound folder albums,
preserving existing asset/album identities and ordinary client compatibility.

User cross-folder Move, hierarchy, reverse sync and a new mobile build
are deferred. The implementation has not started. When integrated,
replace this planned summary with the actual supported behaviour.

This page describes integrated source, not an installed instance.
