# Liss Immich — fork development contract

ASSIGNMENT_ID = liss-immich-development
SOURCE_OWNER = liss-immich-development
MESSAGE_INBOX = https://github.com/AV-Lex/liss-immich/issues
RESULT_OUTBOX = EXACT_TASK_THREAD
INTEGRATION_BRANCH = liss

This is a bounded development assignment for this fork. Start with
[LISS_FORK.md](LISS_FORK.md), the single [CURRENT.md](CURRENT.md), the exact
assigned issue and relevant upstream documents/source.

## Branches and ownership

Keep `main` an unmodified copy of upstream history. Fork-specific code,
documentation, migrations and tests belong to `liss` and its task branches.
PRs for this work target `liss`, never `main`. Do not rewrite shared history.
The initial upstream baseline is 3.3.5 at
`8303cb117e197c700332b33b61b45314c9cc5bb4`; a general upstream upgrade is a
separate change. The stable branch name keeps working documentation URLs
valid across future accepted upgrades.

Within the assigned scope, the developer chooses the implementation and
sufficient checks, fixes findings, accepts and integrates the result.
Use independent verification for substantive code/data-migration changes.
For a docs-only change, verify content, links and published files.
Ordinary owner acceptance does not require another Central approval.

Keep the fork diff small and reuse existing storage, jobs, migrations and
API machinery. Update the concise source map when the implementation
makes it stale. Return concrete questions that change the agreed product
scope. Subtasks do not inherit broader authority or deployment access.

## Finite sequence

First complete [D0: the existing upstream source map](https://github.com/AV-Lex/liss-immich/issues/1).
Then perform [D1: folder-album v0](https://github.com/AV-Lex/liss-immich/issues/2)
after D0 acceptance. Do not select unrelated issues as an ongoing backlog.

Use synthetic data for source checks. A real-library migration or
deployment belongs to the separately assigned operator.

Keep this assignment in rotation through actual operator installation and
verification that the installed change works. Accepted source and an
operator handoff do not by themselves complete the assignment.

After that verification, ask the maintainer whether concrete follow-up
fixes are still needed. Record the answer in the task thread and complete
any agreed fixes, including installation and verification of their result.
Only after the maintainer confirms that this stage is finished and no
agreed fixes remain, record PARKED in CURRENT and request removal from
recurring execution after the active run ends. Preserve source, results
and recovery material. While awaiting installation or feedback, record
the dependency and next owner; do not invent unrelated work to fill runs.
Potential future ideas alone do not create a continuing backlog.

## Public fork and upstream policy

This repository is public. Keep credentials, private infrastructure,
personal media/data and private discussion links out of commits and issues.

AI-assisted development and communication are permitted in this fork
under its maintainer's assignment. Upstream CONTRIBUTING rules continue
to govern submissions to upstream. Do not automatically open upstream
PRs/comments or misrepresent AI assistance. Preserve licences and attribution.

Existing upstream build/test conventions remain the basis. Do not replace
their workflow/release system or add a new service for this narrow change.
A result must identify its exact source and reproducible build/migration/
recovery path; installed state is a separate fact.
