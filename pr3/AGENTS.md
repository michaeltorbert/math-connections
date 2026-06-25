# Agent instructions

For AI coding agents (Codex, Claude Code, Cursor, etc.) working on Math
Connections.

## What it is

Static browser app for James's addition/subtraction fact-family practice. The
current product target is not generic arithmetic drilling and not primarily
addition-first picture families. It is helping James transform a given
subtraction into the related subtraction:

```text
5 - 4 = 1  ->  5 - 1 = 4
```

The child-facing rule is: keep the first number, switch the other two numbers.
Comparison-dot pictures are the primary scaffold; put-together pictures remain
maintenance/review. Sessions should feel like a sequenced tutor moving through
one relationship, not a random worksheet.

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
- For James's current need, prioritize subtraction-first comparison transfer and
  structural evidence over raw arithmetic fact accuracy:
  - given `a - b = c`, wrote `a - c = b`
  - kept the first number fixed
  - switched the other two numbers
  - interpreted comparison dots as "how many more?", not "how many in all?"
  - did not add all visible dots in a comparison picture
  - wrote a matching addition from a given subtraction when asked
  - counted each colored part correctly
  - identified the whole as all dots together
  - wrote `part + part = whole` from the picture, accepting either part order
  - identified the whole correctly
  - placed the whole first
  - switched the two parts in a companion subtraction
  - distinguished true-but-wrong-family equations such as `7 - 2 = 5` for the
    family `2, 7, 9`
  - logged `PART_MINUS_PART` separately from ordinary arithmetic mistakes
- Keep the default local scheduler automatic and representationally coherent.
  The child should not see or choose a separate test mode. Preserve the quiet
  18-question calibration phase: three sessions of six questions, one each of
  `SUB_RESULT`, `SUB_MISSING_PART`, `SUB_MISSING_WHOLE`,
  `ADD_MISSING_PART`, `COMPANION`, and `COMPARE_COMPANION`, with six
  fact families rotated across types and no intentional duplicate family in a
  calibration session.
- After calibration, preserve the adaptive 50/20/20/10 split: 50% weakest
  problem type, 20% that type's prerequisite, 20% transfer to another
  representation, and 10% previously mastered review. Imported
  `problemTypeMix` may nudge weak-type ranking, but must not expose manual
  child-facing modes.
- Log skill and representation metadata at answer-row level. Current skill
  buckets include counting each group, identifying the whole,
  picture-to-addition, picture-to-subtraction, whole-first structure,
  addition-to-subtraction, companion subtraction, matching addition, family
  discrimination, missing whole, missing subtrahend, missing addend,
  subtraction result, addition recall, subtraction recall, and
  subtraction-to-addition.
- Preserve first independent response data. Later success after a verbal hint,
  related-addition hint, or visual model should be logged separately through
  `successAfterHint`, `supportOutcome`, `hintSequence`, and final answer fields,
  not by replacing the first answer.
- For `SUB_MISSING_WHOLE`, preserve missing-minuend-specific first-answer
  codes: `SUBTRACTED_KNOWN_NUMBERS`, `COPIED_SUBTRAHEND`,
  `COPIED_DIFFERENCE`, and `MISSING_MINUEND_ERROR`, plus outcome codes such as
  `CORRECT_INDEPENDENTLY` and `CORRECT_AFTER_ADDITION_HINT`.
- Keep representations distinct: `comparisonDots` for compare/how-many-more
  pictures, `putTogetherDots` for how-many-in-all pictures, and `equation` for
  symbolic transfer.
- Log comparison-specific structural errors: `FIRST_NUMBER_CHANGED`,
  `OTHER_NUMBERS_NOT_SWITCHED`, `ADDED_ALL_VISIBLE_DOTS`,
  `TRUE_BUT_NOT_MATCHING`, `ARITHMETIC_ERROR`, and
  `MATCHING_ADDITION_ERROR`.
- Keep autonomous correction local and low-pressure: first wrong answer gives
  "the first number stays the same," second says to switch the other two
  numbers, third models the relationship and sends the child to a near-transfer
  item. Preserve first-response data in the log even when a later scaffold
  leads to the final answer.
- Treat the connection reveal as required teaching, not optional enrichment.
  After a solved problem, show the connection automatically and require a
  simple acknowledgment before the Next/Finish control appears.
- Keep numeric answer entry tablet-friendly. Do not rely on iPad users opening
  the native keyboard and switching to number mode; preserve the in-app keypad
  for child-facing blanks.
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
