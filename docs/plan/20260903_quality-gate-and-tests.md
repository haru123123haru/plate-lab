# Quality gate and authorization test plan

## Change-impact decision

- Level: Structured
- Signals: Developer tooling, package scripts, and tests span multiple files and affect every future delivery, but do not change production data, authorization policy, or a runtime trust boundary.
- Why a lower level is insufficient: A broken gate can block or falsely approve future changes, so commands and baseline behavior must be recorded and verified.
- Next action: Implement in one worktree, run the repository-specific gate, review the complete diff, then commit if clean.
- Gate layers: formatting, static analysis, type/build, behavioral tests, and authorization-specific tests.

## Goal

Provide a reproducible local quality gate and automated coverage for the pure validation/access-control behavior introduced by the security remediation. Do not add a test that needs a live production database, Supabase credentials, or network access.

## Owned files

The implementation task may edit only:

- `package.json` and `package-lock.json`
- test-runner and formatter configuration files that it introduces
- test files under a newly introduced test directory
- optionally `.gitignore` when a new tool creates a local cache/artifact

It must not change application code, Prisma schema/migrations, Server Actions, or existing UI files.

## Steps

1. Inspect existing Node/tooling conventions and select a formatter and test runner compatible with Next.js 16, TypeScript, and the existing ESLint configuration.
2. Add only the dependencies and configuration necessary for:
   - formatting check;
   - TypeScript-capable unit tests;
   - test coverage of validation schemas and pure access-control predicates.
3. Add scripts using the repository layout, not an assumed `src/` layout:
   - `format`: format check;
   - `lint`: lint the repository;
   - `typecheck`: `tsc --noEmit` or repository-equivalent;
   - `test`: test runner;
   - `check`: aggregate every applicable layer.
4. Add unit tests for the following deterministic behavior:
   - PlateType well counts accept only 24 and 96.
   - Filled well positions reject duplicates and malformed coordinates.
   - Plate and Well update schemas reject unknown keys and invalid enum values.
   - Settings schema accepts only supported locale/appearance values.
   - Access-control predicate shape permits defaults or a matching owner, and does not include another owner's custom record.
5. Do not mock or invoke Prisma database writes in this task. Database transaction behavior remains a future integration-test concern.
6. Establish the current lint baseline explicitly. If the six existing `react-hooks/set-state-in-effect` errors remain, record that `check` cannot be treated as green until they are separately resolved. Do not hide them with broad lint exclusions.

## Gate record

| Layer | Required command | Pass criterion |
| --- | --- | --- |
| Formatting | New project-native format check | No formatting violations in tracked source/config/test files. |
| Static analysis | `npm run lint` | No new violations; existing six baseline violations remain visible and documented. |
| Type validation | `npm run typecheck` | Succeeds. |
| Behavioral tests | `npm run test` | Added unit tests succeed. |
| Build validation | `npm run build` | Succeeds. |

`npm run check` should aggregate the applicable green layers. It must not falsely claim success while the known lint baseline still fails; either omit lint from the aggregate until the baseline is fixed or make `check` fail transparently and document that it is a blocking baseline issue.

## Acceptance criteria

- New test and formatting commands run without requiring a live service.
- Tests cover every case listed in Step 4.
- `typecheck`, `test`, and `build` succeed.
- Formatting check succeeds after formatting the added/changed files.
- Existing lint failures are not suppressed or misreported as fixed.
- Full diff review finds no application behavior change outside tooling/tests.

## Rollback

Revert the single tooling/test commit. It has no data migration or runtime data transformation.
