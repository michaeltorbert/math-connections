For GitHub writes in this repository, use the appropriate GitHub App identity
instead of a personal GitHub identity.

Target repository: `michaeltorbert/math-connections`.

Before any GitHub write, verify the target repository from the current
workspace, local git remote, issue or PR URL, or this file. Prefer local
GitHub App token tooling such as `github-app-curl` with the project-specific
profile when one is declared locally. Do not use connector-backed GitHub writes
when bot attribution matters.

This project is currently a static browser app. There is no build step. Open
`index.html` directly, or serve the folder with a local static server. Run the
logic smoke tests with:

```sh
node tests/practice-core.test.js
```
