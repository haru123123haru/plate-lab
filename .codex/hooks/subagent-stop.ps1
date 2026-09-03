$hookInput = [Console]::In.ReadToEnd() | ConvertFrom-Json

if (-not $hookInput.stop_hook_active) {
  @{
    decision = "block"
    reason = "Before finalizing, follow AGENTS.md: state the change-impact decision, run the repository-specific gate, review the complete diff with implementation-review-commit, and commit only if the user authorized it and the review is clean. If blocked, report the exact blocker."
  } | ConvertTo-Json -Compress
  exit 0
}

@{} | ConvertTo-Json -Compress
