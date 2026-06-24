# Agent instructions

For AI coding agents (Codex, Claude Code, Cursor, etc.) working on Math
Connections.

## What it is

Static browser app for James's addition/subtraction fact-family practice. The
current product target is not generic arithmetic drilling; it is helping James
turn a colored part-whole picture into the related addition and subtraction
equations. Symbolic whole-first companion-subtraction work remains secondary
reinforcement.

There is no build step and no bundler. Keep the app runnable as plain static
files.

## GitHub identity

Before any GitHub write, verify the target repo is
`michaeltorbert/math-connections`.

Use the appropriate GitHub App identity rather than the personal
`michaeltorbert` account:

| Agent | Auth profile | Visible actor | Write path |
| --- | --- | --- | --- |
| Codex | `games-codex` | `codex-bot-mt[bot]` | `github-app-curl` / app git credential helper |
| Claude | `claude` | `claude-bot-mt[bot]` | `github-app-curl --profile claude` |

Local git commit author for agent-authored commits:

```text
codex-michaeltorbert[bot] <3357630+codex-michaeltorbert[bot]@users.noreply.github.com>
```

The auth profile, visible GitHub actor, and local git author are separate
values. Do not assume they match.

Do not use connector-backed GitHub writes when bot attribution matters, because
those may appear as the personal account.

## Git freshness and push safety

Treat live `origin/main`, not local `main`, as the source of truth.

Before making code, branch, PR, Pages preview, or issue changes:

1. Verify the remote is `michaeltorbert/math-connections`:
   `git remote get-url origin`.
2. Check the live source of truth:
   `git ls-remote --heads origin main`.
3. Do not work directly on `main` or on a detached `HEAD`.
4. Run `scripts/git-safety-check.sh` before committing, pushing, or opening a
   PR from an app/source branch. Do not run this main-lineage check on
   `gh-pages`; preview branch handling is covered separately below.

Hard stop conditions:

- If the current branch is `main`, stop and move the work to a feature branch.
- If the current branch does not contain current live `origin/main`, stop and
  rebase or merge the live main tip before commit, push, or PR work.
- Never use `git push --force`, `git push --force-with-lease`, or
  `git push --no-verify` in this repo unless the user explicitly asks for that
  exact operation.
- Never push directly to `main`; `main` should advance by PR merge. Direct
  pushes to `gh-pages` are allowed only for isolated preview updates described
  in the GitHub Pages section.

## Default agent workflow

Unless the user explicitly asks for a different flow:

1. Codex leads: verify the target repo/issue/PR, scope the change, write the
   implementation or artifact, run the relevant checks, and update GitHub using
   the Codex GitHub App identity.
2. Ask Claude for a bounded independent pass when useful: issue planning,
   design critique, implementation sanity check, or formal PR review.
3. Claude must use the Claude GitHub App identity for any Claude-attributed
   GitHub write.
4. Treat Claude's output as review input, not authority. Classify suggestions as
   actionable, non-blocking, wrong or stale, or needing a user call.
5. Do not claim consensus unless Claude actually produced a current-run review
   or comment and no material issues remain. If Claude tooling times out or
   cannot write with the right identity, report that blocker explicitly.
6. Escalate instead of looping indefinitely. If Codex and Claude still disagree
   after two substantive rounds, summarize both positions and recommend a path.

### Role boundaries

- Keep implementation and review roles separate. The reviewing agent should not
  push fixes to the implementing agent's PR unless the user explicitly asks for
  that role change.
- Do not create competing Codex-authored and Claude-authored PRs by default.
  Parallel PRs are only useful when genuinely different high-risk approaches
  need to be compared in code.

### PR review comments

When either agent reviews a pull request:

- Submit the formal GitHub PR review using that agent's bot identity.
- Also leave a short top-level PR conversation comment summarizing the review
  result for human visibility when the workflow calls for it.
- Link the top-level comment to the formal review and any key inline
  discussion.

## Local development and checks

Open `index.html` directly, or serve the folder with a local static server:

```sh
npm run serve
# or
node scripts/serve-root.mjs
```

Run the logic smoke tests with:

```sh
npm test
# equivalent:
node tests/practice-core.test.js
```

Before pushing code changes, run:

```sh
scripts/git-safety-check.sh
node tests/practice-core.test.js
node -e 'const fs=require("fs"); const html=fs.readFileSync("index.html","utf8"); const m=html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/); if(!m) throw new Error("script not found"); new Function(m[1]); console.log("script syntax ok");'
git diff --check
```

For visual/UI changes, also verify the app in a browser at the relevant viewport
sizes. If browser tooling is blocked, say so explicitly and report the checks
that did run.

## GitHub Pages previews

The `gh-pages` branch is used for live previews. Keep preview folders isolated
so refreshing one PR does not overwrite another preview.

Current convention:

- `/pr1/` previews PR #1.
- `/pr3/` previews PR #3.

When refreshing a preview:

1. Verify the preview checkout remote is `michaeltorbert/math-connections`.
2. Verify the checkout is on `gh-pages` and the worktree is clean.
3. Sync only the target preview folder.
4. Commit with the agent commit author above.
5. Push with the Codex GitHub App credential helper.
6. Verify GitHub Pages status is `built`.
7. Fetch the published preview URL and confirm it contains the expected version
   or code marker.

## Product guardrails

- Keep the app static and offline-capable. Do not introduce a server, account,
  telemetry, or network dependency.
- Keep child-facing practice untimed.
- Keep child-facing summaries low-pressure; accuracy and error analysis belong
  in the grown-up dashboard/export.
- For James's current need, prioritize picture-to-equation and structural
  evidence over raw arithmetic fact accuracy:
  - counted each colored part correctly
  - identified the whole as all dots together
  - wrote `part + part = whole` from the picture, accepting either part order
  - identified the whole correctly
  - placed the whole first
  - switched the two parts in a companion subtraction
  - distinguished true-but-wrong-family equations such as `7 - 2 = 5` for the
    family `2, 7, 9`
  - logged `PART_MINUS_PART` separately from ordinary arithmetic mistakes
- Render imported config errors and user-controlled text with `textContent` or
  DOM text nodes, not `innerHTML`.
- Validate adaptive configs defensively: parse facts/families, confirm
  arithmetic consistency, clamp ranges, and drop malformed entries.

## Project shape

- `index.html` - complete static app, UI, logic, localStorage persistence, and
  self-tests exposed as `runSelfTests()`.
- `tests/practice-core.test.js` - Node smoke test that loads the script and runs
  `runSelfTests()`.
- `CONFIG_SCHEMA.md` - adaptive config and export schema.
- `README.md` - user/developer overview.
- `scripts/` - local workflow helpers only; not app runtime code.
