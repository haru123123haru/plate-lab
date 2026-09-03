# Security remediation implementation plan

## 1. Purpose and boundaries

Close authorization and data-integrity gaps in the plate-management application without changing the existing product model more than necessary.

### Fixed ownership model

| Entity | Allowed readers | Allowed writers | Default/shared data |
| --- | --- | --- | --- |
| Plate / Well | owner only | owner only | none |
| PlateType | all signed-in users for defaults; owner for custom data | creator for custom data | `isDefault = true` |
| ConditionTemplate | all signed-in users for defaults; owner for custom data | creator for custom data | `isDefault = true` |
| ConditionSet | all signed-in users for defaults; owner for custom data | creator for custom data | `isDefault = true` |

Normal users cannot create, edit, or delete default data. This plan does not add an administrator role. Email-address synchronization with Supabase is out of scope and must be planned separately.

## 2. Deliverables

1. A safe Prisma migration and seed update that records ownership for condition data.
2. Server Actions that authenticate every read/write and apply the ownership model in their database queries.
3. Zod schemas for every client-controlled Action payload.
4. Client components that pass and retain condition-template IDs, not display names.
5. Tests for authentication, ownership, invalid input, and transactional deletion.
6. A project check gate that must pass before a change is reviewed and committed.

## 3. Worktree division and merge order

| Worktree | Scope | Files owned | Prerequisite | Merge order |
| --- | --- | --- | --- | --- |
| A | data model | `prisma/schema.prisma`, one new migration, `prisma/seed.ts` | none | 1 |
| B | server authorization | `lib/validations.ts`, `lib/access-control.ts` (new), `lib/actions/*.ts` | A merged/rebased | 2 |
| C | client ID and error handling | `app/(app)/plates/[id]/*`, `components/new-plate-sheet.tsx`, `components/new-plate-type-dialog.tsx` | Action API agreed with B | 3 |
| D | tests and delivery | test/config files, package scripts only | A-C merged | 4 |

Do not edit the schema or generate a migration in more than one worktree. Before each merge, rebase the worktree onto the integration branch, resolve conflicts in that worktree, and run the gate there. No task may merge another task's worktree directly.

## 4. Worktree A: data model

### 4.1 Schema change

In `prisma/schema.prisma`:

1. Add `isDefault Boolean @default(false)`, `createdById String?`, and `createdBy User?` to `ConditionTemplate`.
2. Add `isDefault Boolean @default(false)`, `createdById String?`, and `createdBy User?` to `ConditionSet`.
3. Give the two new relations explicit names so Prisma does not confuse them with existing `User` relations.
4. Add the matching array relations to `User`.
5. Add `@@index([createdById])` to `PlateType`, `ConditionTemplate`, and `ConditionSet`.
6. Do not make the new owner IDs required: existing shared rows have no owner.

### 4.2 Migration

1. Create one migration after the schema change.
2. Add columns and indexes first.
3. Set `isDefault = true` for every existing `ConditionTemplate` and `ConditionSet` row. These rows are the existing shared catalog.
4. Do not delete, rename, or re-key existing rows.
5. Inspect generated SQL: it must not contain `DROP TABLE`, `DELETE`, or a required owner column.

### 4.3 Seed

1. Set `isDefault: true` explicitly on every seed-created `ConditionTemplate` and `ConditionSet`.
2. Preserve current seed behavior otherwise.
3. Run `prisma generate` and the migration validation command available in the repository.

### 4.4 Acceptance checks

- Prisma schema validates.
- Generated migration has only additive schema changes plus the intentional `isDefault` data update.
- Existing template/set IDs remain valid.

## 5. Worktree B: server authorization and validation

### 5.1 Shared helpers

Create `lib/access-control.ts`.

1. Export a reusable Prisma `where` fragment/function for `isDefault = true OR createdById = userId`.
2. Export a function that obtains an accessible ConditionTemplate by ID and returns `null` when it does not exist or is inaccessible.
3. Do not expose a helper that returns another user's custom data.

### 5.2 Validation schemas

Add schemas to `lib/validations.ts`; Actions must call `safeParse` before a database query.

| Schema | Required rules |
| --- | --- |
| `createPlateTypeSchema` | name 1-100 chars; description max 500; `wellCount` is exactly 24 or 96 |
| `createConditionTemplateSchema` | name 1-100 chars; description max 500 |
| `createConditionSetSchema` | name 1-100 chars; positive integer IDs |
| `updatePlateSchema` | name 1-200 when present; `status` is ACTIVE/ARCHIVED; notes max 2,000; sample name max 200; template IDs positive integers or null |
| `updateWellSchema` | `status` valid enum; each value has a documented safe maximum; unknown keys stripped or rejected |
| `updateUserSettingsSchema` | language is `en`/`ja`; appearance is `light`/`dark`/`system`; notifications are booleans |

`createPlateSchema.filledPositions` must reject duplicates and values not matching the selected plate geometry. Perform the final geometry check only after retrieving the permitted PlateType.

### 5.3 PlateType Actions

In `lib/actions/plate-types.ts`:

1. Call `getCurrentUserId` in `getPlateTypes`.
2. Return only `isDefault = true` or `createdById = currentUserId` rows.
3. Validate create input and always set `createdById = currentUserId` and `isDefault = false`.
4. Return a generic "Not found"/validation result; do not reveal whether another user's ID exists.

### 5.4 Plate Actions

In `lib/actions/plates.ts`:

1. In `createPlate`, retrieve the PlateType with the accessible predicate, not `findUniqueOrThrow`.
2. For each non-null condition template ID, confirm it is accessible before creating the Plate.
3. Derive rows and columns only from a validated 24/96 PlateType.
4. In `updatePlate`, validate input before looking up the Plate.
5. Confirm all replacement template IDs are accessible before updating the owned Plate.
6. Limit search input to a schema-defined maximum. Empty/whitespace input returns the normal owned list.

### 5.5 Condition Actions

In `lib/actions/condition-templates.ts`:

1. Begin every exported Action with `getCurrentUserId`.
2. List Actions return default rows plus rows owned by the caller only.
3. Create Actions validate input, set `createdById`, and explicitly set `isDefault: false`.
4. Creating a ConditionSet requires both referenced templates to be accessible.
5. Delete Actions select the target with `id`, `createdById: currentUserId`, and `isDefault: false`; absence returns a generic error.
6. Delete a ConditionSet only when owned by the caller.
7. For deleting a ConditionTemplate, execute every database write in `prisma.$transaction`.
8. Never update another user's Plate. Preferred behavior: delete only if no other user's Plate references it; otherwise reject with an actionable error. If product behavior requires detaching the caller's own Plates, update only `userId = currentUserId` rows in the transaction.

### 5.6 Settings and Well Actions

1. Add runtime validation to `updateWell` and `updateUserSettings`.
2. Retain the existing ownership checks for the Well and its Plate.
3. Keep `getUserSettings` unauthenticated behavior (`null`) because RootLayout uses it on public routes.

### 5.7 Acceptance checks

- Every exported mutating Action authenticates before a write.
- Every ID referring to shared-or-owned data is checked with the accessible predicate.
- No Action lets a normal user mutate default or another user's custom rows.

## 6. Worktree C: client behavior

### 6.1 Plate detail page

1. In `app/(app)/plates/[id]/page.tsx`, provide template objects with `id` and `name`, and provide the currently selected template ID for reservoir and screening.
2. In `plate-detail-client.tsx`, store IDs in state rather than names.
3. Render the name only for display.
4. Pass IDs directly to `updatePlate`; do not call `.find()` by name.
5. On Action failure, retain the editing state and show a translated error message.

### 6.2 New plate sheet and PlateType dialog

1. Catch Action failures before changing local lists or closing dialogs.
2. On deletion failure, leave the deleted item visible.
3. Disable the relevant submit/delete control for the lifetime of each request.
4. Display a user-readable error without exposing internal authorization details.
5. Validate the well-count UI with `min`, `max`, and allowed-value guidance, while relying on the server schema as the authority.

### 6.3 Acceptance checks

- Duplicate template names cannot cause a wrong template to be saved.
- A rejected Action causes no optimistic UI data loss.
- No client code needs to know another user's resource IDs.

## 7. Worktree D: tests and delivery gate

### 7.1 Current repository gate

The gate layers are fixed, but commands are selected from the repository's actual tools and configuration. Do not add a formatter or test runner solely to make a generic script shape fit.

| Layer | Current command | Pass criterion / limitation |
| --- | --- | --- |
| Formatting | Not configured | Record this gap; do not claim formatting passed. Add project-approved formatting in a separate quality-baseline task. |
| Static analysis | `npm run lint` | The command currently fails on six existing `react-hooks/set-state-in-effect` findings. The security change must add no new findings; baseline remediation is a separate task. |
| Type validation | `npx tsc --noEmit` | Must succeed. |
| Build validation | `npm run build` | Must succeed with local environment configuration. |
| Behavioral tests | No runner/configuration | Execute the manual authorization cases in Section 7.2 and record results. Add automated tests in a separately scoped test-infrastructure task. |
| Migration safety | `npx prisma validate`; inspect generated migration SQL; run a non-production migration/diff check | Schema validates; migration is additive and preserves existing rows. |

Once the repository has an approved formatter and test runner, add an aggregate `check` script that runs all applicable layers. Keep type checking and behavioral tests separate; a test command is not a typecheck command. Do not hard-code `src/` paths because this repository uses `app/`, `components/`, and `lib/`.

### 7.2 Test cases

1. Unauthenticated mutation calls fail before a database write.
2. User A cannot list, create a Plate with, update to, or delete User B's custom PlateType/ConditionTemplate/ConditionSet.
3. User A cannot delete default data.
4. Invalid payloads produce no database write.
5. A template delete failure rolls back all related writes.
6. A same-name pair of templates persists the selected ID, not the first matching name.

### 7.3 Delivery sequence for every worktree

1. Rebase onto the current integration branch.
2. Run `npm run check`.
3. Run the `implementation-review-commit` skill: inspect the complete diff and resolve actionable findings.
4. If the review is clean, commit only files owned by the task with a conventional, scoped message.
5. Push only after a fresh `git pull --rebase` succeeds and rerun the gate if the rebase changed files.
6. If a repository PR template exists, use it verbatim when opening a PR; otherwise include scope, migration notes, verification, rollback, and risks.

## 8. Escalation and rollback

- Do not apply a destructive migration or production seed automatically.
- Take a database backup before applying the migration outside local development.
- Rollback consists of restoring the database backup. Do not casually reverse a migration after user-created owner IDs exist.
- Stop and request a product decision if existing custom templates must be shared between users, because the fixed ownership model would need to change.

## 9. Plan-review questions

The companion file `20260903_security-remediation-questions.md` contains an independent, low-reasoning evaluation. The plan is accepted only if the evaluator answers all questions correctly from this plan alone. On any miss, revise this plan and repeat the evaluation.
