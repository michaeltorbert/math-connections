# Claude instructions

Read [AGENTS.md](./AGENTS.md) before making design, code, branch, PR, issue, or
review changes. The repo policy lives there; this file only adds
Claude-specific attribution guidance.

## GitHub attribution

For any GitHub write action in `michaeltorbert/math-connections`, do not use the
personal `michaeltorbert` account.

Required identity:

- Claude GitHub App auth profile: `claude`
- Claude visible GitHub actor: `claude-bot-mt[bot]`
- Local git commit author for agent-authored commits:
  `codex-michaeltorbert[bot] <3357630+codex-michaeltorbert[bot]@users.noreply.github.com>`

Prefer `github-app-curl --profile claude` for issue comments, PR comments,
formal PR reviews, labels, and other GitHub API writes.

Do not use connector-backed GitHub writes if they would attribute the action to
`@michaeltorbert`.

## Pre-flight before any GitHub write

Run once per session before the first GitHub write:

```sh
which github-app-curl >/dev/null && echo "HAVE_APP_CURL" || echo "NO_APP_CURL"
```

- `HAVE_APP_CURL`: use `github-app-curl --profile claude`.
- `NO_APP_CURL`: do not write to GitHub unless another available GitHub tool is
  verified to be authenticated as `claude-bot-mt[bot]`.

If Claude cannot guarantee bot attribution, stop and report the blocker. Do not
fall back to the user's identity unless the user explicitly authorizes that
specific write.

## Local checks

```sh
scripts/git-safety-check.sh
node tests/practice-core.test.js
```

For UI changes, serve the static app with `npm run serve` or
`node scripts/serve-root.mjs` and verify the browser surface where possible.
