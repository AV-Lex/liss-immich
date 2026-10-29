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

## Risk-based Claude review

Claude is an independent reviewer used to find omitted cases and concrete
counterexamples. It is not a second source owner, product authority, test
oracle or mandatory stamp on every commit.

A Claude review is required before integration when a substantive candidate
can change any of the following:

- copy, move, rename, delete or path selection for originals, sidecars or
  companion files;
- asset/album identity, folder binding, database or filesystem migration;
- jobs, retry, restart, recovery or rollback around persistent data;
- collision handling, multi-album selection or ordinary API/mobile
  compatibility;
- a defect whose failure could lose, misplace, duplicate or silently corrupt
  media or metadata.

It is normally unnecessary for docs-only work, wording/formatting, tests or
fixtures that do not change behaviour, a local refactor with unchanged
contracts and sufficient regression coverage, or CI/packaging changes that
do not alter data semantics. Borderline cases are decided by actual failure
impact, not file count. The developer may request an extra review when risk is
uncertain.

Review one coherent exact candidate — a PR head or immutable commit — after
its targeted ordinary tests, not every intermediate commit. Related small
fixes may be reviewed together. After a material correction, rerun the failed
or affected review/checks; do not repeat an unchanged full-repository review.
A passing review never replaces executable tests.

### How to call the reviewer

The repository is public, so no special source access or credential handoff is
needed. Give immutable commit/PR URLs and exact paths; do not ask the reviewer
to infer the candidate from the moving `liss` branch.

Use the existing FoxBridge Profile-ID v1 runner:

1. Call `fb_agent_list` and choose an available Liss Claude alias. Use
   `claude-liss` for bounded source/evidence review. Use
   `claude-liss-research` only when the question genuinely needs external
   public documentation or source research beyond the supplied repository
   snapshot.
2. Freeze the exact source SHA and prepare a small review packet: task goal,
   changed paths/contracts, invariants at risk, targeted test commands and
   results, known unknowns, and only the relevant diff/files. Public exact
   links are preferred; attach files only when they materially improve the
   review.
3. Start one immutable request with a saved UUID `request_id` through
   `fb_agent_start`. If delivery or execution is uncertain, reconcile the
   same agent/job with `fb_agent_job` and `fb_agent_result`; never start a
   duplicate job. Public resume is unsupported.
4. Give Claude one narrow role and explicit questions. Ask for
   `PASS`, `FAIL` or `NOT_PROVEN`; each finding must include the exact
   counterexample, path/evidence, affected invariant and the smallest useful
   test or fix. Permit a short optional section with additional adversarial
   cases.
5. Explicitly exclude a general repository audit, a restatement of the task,
   generic best practices, speculative architecture and implementation work
   unless a concrete finding cannot be explained otherwise. The review is
   finished when the stated risks have evidence; it is not an invitation to
   design a larger system.

The development owner triages the result. Automatable material findings become
ordinary repository tests in the existing suites. Real defects are fixed;
rejected findings receive a short technical reason. Failed targeted tests and
material review questions are rerun on the corrected exact source. Record in
the exact task thread: source SHA, Claude alias/job ID, bounded prompt or its
locator, verdict/findings, owner disposition, test refs/results and remaining
limits. Do not publish credentials, private paths, real media or an unbounded
transcript.

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
