# Subagent delivery rules

Before creating a plan, delegating work, or editing repository code, invoke `$change-impact-router`. Follow its Direct, Structured, or Strict decision. Invoke `$parallel-delivery` only after a Strict decision or when worktree-based parallel execution is explicitly required.

Before committing an implementation change, run the repository-specific gate documented by the plan/task handoff, then invoke `$implementation-review-commit`. If an aggregate `check` command exists, run it; otherwise run every applicable gate layer and explicitly report unavailable layers and pre-existing baseline failures. Resolve actionable review findings and rerun relevant checks before committing.

Before pushing, rebase against the target branch and rerun the check gate if rebase changes files. Before creating a pull request, use an existing repository PR template exactly; if there is none, include scope, verification, migration/rollback notes, and risks.

Do not modify unrelated files or commit generated artifacts unless the task explicitly requires them. Report all gate failures, including pre-existing failures, separately from task-caused failures.
