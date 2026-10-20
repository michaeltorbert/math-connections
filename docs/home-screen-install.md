# Home Screen Install (vendored)

`src/vendor/home-screen-install/` holds a vendored copy of the ES module from
[michaeltorbert/home-screen-install](https://github.com/michaeltorbert/home-screen-install).

**The app does not load it yet.** The files are inert: `index.html` does not
import them. Adding the button is tracked in #4, which stays open until the app
is adopted and verified on iPhone and iPad.

## Files

| File | Purpose |
| --- | --- |
| `home-screen-install.mjs` | ES module from the pinned release |
| `SHA256SUMS` | The release's checksums for both formats; only the ES module entry is used here |
| `home-screen-install.lock.json` | Pin: version, tag, full source commit, format and script SHA-256 |

Do not edit these files by hand. Check them offline with:

```sh
npm run check:home-screen-install
```

The same check runs on every pull request and push to `main` in
`.github/workflows/home-screen-install.yml`. It verifies only the vendored
files; it is not an app test.

## Updates

A local daily job proposes newer stable releases as pull requests titled
“Update home-screen-install to vX.Y.Z”. Each one changes only the three files
above, through the Claude GitHub App. Before every commit, push and PR, the job
runs `scripts/git-safety-check.sh` in a fresh branch from live `main`, but only
if the script's bytes match the hash reviewed in the source repository's
`distribution/consumers.json`. If the script changes, updates stop until the new
version is reviewed there. The job never runs this repository's other code,
including the vendor checker, and never force-pushes, merges or deploys. It runs only while the maintainer's configured
Mac is on and logged in, so an update can arrive late or not at all while that
Mac is unavailable. See the source repository's `automation/README.md`.

The source repository has no license; the package is not published to any registry.
