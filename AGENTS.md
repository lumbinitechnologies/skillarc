<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Communication and completion

### Keep the user informed in Codex Desktop

Codex Desktop is the user's primary place for progress, decisions, and requests for action. Maintain GitHub Projects, issues, and PRs as the detailed delivery record; the user should not need to read all of them to understand progress.

Every progress update should concisely cover these four points (combine them into natural sentences when helpful):

- **Where are we?** Lead with one plain-language sentence about the agreed outcome.
- **What changed?** Report meaningful progress, not a tool-by-tool activity log.
- **Do you need anything from me?** Give an exact action and why it is needed, or say "Nothing right now."
- **What happens next?** Name the next concrete step and its purpose.

Keep issue numbers, test counts, and implementation details secondary. Include them only when they help the user assess a decision or verify a claim. When review is needed, provide one direct link to the specific review, explain what the user is approving, and state remaining limitations. Keep the final response self-contained.

Distinguish **code written**, **tested locally**, **merged**, and **running on staging**. Never describe a passing subset, draft PR, local simulation, or infrastructure change as a completed release or working hosted environment.

### Continue until the agreed endpoint

Before implementation, identify the user's intended completion point and the evidence or approvals needed to reach it. Preserve that endpoint when splitting work into issues, commits, or PRs. If it is already clear, proceed without asking the user to restate it.

Continue authorized work until that endpoint is reached. Discovering more work, encountering in-scope pre-existing failures, creating follow-up issues, opening a draft PR, or passing targeted tests is not a reason to stop. Fix in-scope failures and keep tracking synchronized. If nothing is needed from the user, a progress update is an update during ongoing work, not a handoff or an invitation to ask for "continue."

End the turn before completion only when the user pauses or redirects the work, or a specific approval, missing decision, access limitation, or external dependency actually prevents further authorized progress. First finish all independent work that can still proceed. For required review, make the changes concrete and reviewable, complete the applicable verification, and then request the exact human action. Preserve independent review and release gates; never bypass them to claim completion.

When blocked, explain plainly what is blocked, why it prevents the next step, what has been completed, and exactly what action would unblock it. Do not imply that work will continue after ending the turn unless an actual background process or scheduled continuation is running. Do not present unfinished work as complete or silently replace implementation with a new plan/backlog.
