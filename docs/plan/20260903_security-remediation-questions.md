# Plan evaluation questions: security remediation

Read `20260903_security-remediation.md` only, then answer each question concisely. Do not inspect the implementation.

1. Which rows may a signed-in user see for PlateType, ConditionTemplate, and ConditionSet?
2. Why are `createdById` fields nullable in the migration?
3. What exact condition must a `createPlate` Action use before accepting a `plateTypeId`?
4. Name two requirements for deleting a ConditionTemplate, including how related writes are handled.
5. What behavior is required if another user's Plate refers to a template that the caller wants to delete?
6. Why must client state hold a template ID rather than a display name?
7. Give the five required commands/scripts in the delivery gate and state why `types: vitest run` is incorrect.
8. Which worktree owns schema migrations, and what must happen before a worktree integrates its changes?
