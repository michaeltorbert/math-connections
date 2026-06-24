# Math Connections

A friendly **addition ↔ subtraction fact-family** game for young children (built for
James, age 6). It's a kinder, more concrete take on Math Mammoth's
[Addition–Subtraction Connection](https://www.mathmammoth.com/practice/add-sub-connection)
practice — and it **logs every answer** so an AI (ChatGPT or Claude) can analyze how it's
going and hand back tuning instructions the app can import.

> The big idea: two colored parts make one whole. The child first turns the picture into
> quantities, then writes `part + part = whole`, then writes `whole − part = part`.
> Symbolic fact-family work stays in the rotation, but picture → equation abstraction is
> the default center of practice.

## Run it

It's a single self-contained `index.html` — **no build, no server, no dependencies.**

- **Easiest:** double-click `index.html` to open it in any browser (works offline).
- **On a tablet / shareable URL:** host it on GitHub Pages (see *Deploy* below).

Everything saves to the browser's `localStorage`. Nothing is ever sent over the network.

## How a child plays

1. Pick a level on the home screen: **Within 5**, **Within 10**, or **Within 20**.
2. Tap **Start**. Each session is a handful of short problems (default 6) — **no timer**.
3. For each problem the child sees a small colored-dot picture or a short symbolic
   reinforcement prompt.
4. The default six-item session targets James's current picture-to-equation difficulty:
   - **PICTURE_FAMILY** — count the colored parts and whole, write the addition, then
     write the related subtraction. The final picture item is an independent
     Mammoth-style transfer check with both equations blank.
   - **COMPANION** — given `5 − 4 = 1`, construct `5 − 1 = 4`.
   - **NOT_FAMILY** — choose which true subtraction belongs to the displayed family.
5. The strategy question is only asked at the end of the session, so practice does not stop
   after every item.

A short, friendly voice reads each problem (toggle with **🔊 Voice** on the home screen).

## The grown-up dashboard

Tap **👪 Grown-ups** (top-right) for:

- **Stats** — problems, first-try %, sessions, facts mastered.
- **Focus suggestion** — the app's own read on what to practice next.
- **Structural error codes** — whether James kept the whole first, switched the parts, or
  chose a true equation from the wrong family, plus picture counting and picture-mapping
  misses.
- **Add ↔ Subtract transfer** — per family, addition accuracy vs subtraction accuracy
  (the clearest signal of whether the *connection* is clicking).
- **Fact mastery** — a per-fact box from 1 (needs work) to 5 (solid).
- **Recent problems** — the last several, with what was answered.
- **Tools for the AI loop** — Export, Copy analysis prompt, Import config, Reset.

## The AI feedback loop  ⟳

This is the point of the app. Two directions, both built in:

### A. Give the results to an AI
1. In the dashboard, tap **📋 Copy analysis prompt**. This copies a ready-made prompt
   (a summary + the full JSON results + clear instructions) to your clipboard.
   *(Or tap **⬇ Export results (JSON)** to save the raw dump as a file.)*
2. Paste it into **ChatGPT or Claude**.
3. The AI replies in two parts:
   - **PART 1** — a plain-English summary of how James is doing.
   - **PART 2** — a single ```json``` block: an **adaptive config** for the app.

### B. Hand the AI's instructions back to the app
4. Copy the ```json``` block from PART 2.
5. In the dashboard, tap **⚙ Import config**, paste it, and tap **Apply config**.
6. The next session immediately follows the new plan (which families/facts to drill, the
   level, session length, the mix of add vs subtract, etc.). **No code changes needed.**

> Prefer to change the code instead? The same results dump is everything an AI needs to
> suggest concrete edits to `index.html`. The config path is just the no-code shortcut.

The config format is documented in **[CONFIG_SCHEMA.md](CONFIG_SCHEMA.md)** — the import is
strictly validated and clamped, so a malformed or oversized config can never break the app
(bad entries are dropped, numbers are clamped, and the last good config is kept on failure).

## Built-in adaptivity (works even without the AI loop)

Each fact has a Leitner-style "box" (1–5). Facts the child misses are demoted and shown more
often; facts answered correctly several times in a row are promoted and shown less.

The app now also classifies the **kind** of miss before choosing the next problems:

- addition fact recall
- subtraction fact recall
- addition → subtraction transfer
- subtraction → addition transfer
- picture → equation mapping
- whole-first structure errors
- true-but-wrong-family equations such as `7 − 2 = 5` for the family `2, 7, 9`

Problem type and family selection are biased toward that current focus. The dashboard shows
the focus, why it was picked, and which facts/families are being targeted.

## Privacy

All data stays in the browser (`localStorage`, keys prefixed `mc_`). There is no server,
no account, no tracking, and no network calls. "Export" and "Copy analysis prompt" only put
data on *your* clipboard / downloads for *you* to share with an AI if you choose.

## Deploy to GitHub Pages

1. Push these files to the repo's default branch.
2. Repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**.
3. Open the published URL (e.g. `https://<user>.github.io/math-connections/`).

After pushing an update, a hard-refresh (or append `?v=2`) avoids the Pages CDN cache.

## For developers / reviewers

- One file, plain HTML/CSS/vanilla JS, heavily sectioned and commented.
- **Self-tests:** open the dev console and run `runSelfTests()` (or load with `#test` in the
  URL). They check problem-generation invariants, config validation/clamping (fuzzed with
  junk), mastery promote/demote bounds, and weighted selection. Expect `0 failed`.
- **Node smoke test:** run `node tests/practice-core.test.js`.
- Key areas in `index.html`: fact-family math (§4), mastery + selection (§5), config
  validation (§6), problem generation (§8), session flow (§9), equation rendering (§10),
  the results dump + analysis prompt (§12), self-tests (§14).
- Data schema: each logged problem and the exported dump carry `schemaVersion`.

## License

MIT — see [LICENSE](LICENSE).
