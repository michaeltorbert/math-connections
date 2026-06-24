Original prompt: Add picture-to-equation practice to PR 3 so it targets James's Math Mammoth colored-group / fact-family difficulty, not only symbolic equation-to-equation transformation.

## 2026-06-24

- Current branch: `claude/james-practice-app` for `michaeltorbert/math-connections`.
- Goal: add a `PICTURE_FAMILY` mode centered on picture-to-equation abstraction, with existing symbolic modes retained as secondary reinforcement.
- Attached review direction: four picture problems per six-question session, guided early and Mammoth-style independent later; measure counting parts, finding whole, addition construction, subtraction whole-first structure, and optional second subtraction independently.
- Browser automation note from prior run: Playwright/Chromium and GUI screenshot paths were blocked by local macOS sandbox permissions. Use Node self-tests, syntax extraction, live Pages marker checks, and any available browser fallback.
- Implemented `PICTURE_FAMILY` as the default primary mode: default type plan is four picture-family problems, one companion problem, and one not-family problem, with the final picture item forced to independent scaffold level 4.
- Added staged picture checking for guided levels: count parts/whole, then write addition, then write subtraction while the same picture remains visible.
- Added picture row grading for unordered addition, whole-first subtraction, part-minus-part errors, arithmetic remainder errors, and picture count errors.
- Bumped `APP_VERSION` to `1.2.0` for export and Pages-preview marker verification.
- Current local checks after implementation: `npm test` passed with 244 assertions; embedded script syntax extraction passed.
- Claude local consult found no blockers and one diagnostic edge case: correct picture parts with a wrong addition sum, such as `3 + 4 = 6`, should be `PICTURE_ADDITION_ARITHMETIC_ERROR`, not `PICTURE_WHOLE_COUNT_ERROR`. Fixed and added a regression assertion.
- Follow-up direction from ChatGPT/Codex: combine picture, parts/whole, addition, subtraction, companion subtraction, family discrimination, and spaced review as a sequenced tutor; do not randomly mix techniques.
- Updated default scheduler to an ordered six-screen sequence: `PICTURE_FAMILY`, `PICTURE_FAMILY`, `ADD_TO_SUB`, `COMPANION`, `NOT_FAMILY`, `SPACED_REVIEW`. Longer default sessions now extend explicitly with review/targeted representation slots instead of falling through to implicit random generation.
- Non-review items share a session anchor family where possible, so the same part-whole relationship moves across picture, addition-to-subtraction, companion subtraction, and family-discrimination prompts.
- Added answer-row `skill` and `representation` metadata plus export-level `deficitProfile.skillStats` and `deficitProfile.representationStats`.
- Added autonomous picture correction state: first wrong logs conceptual feedback, second wrong reveals added scaffold, third wrong models the relationship and logs `modeledAnswer`.
- Updated `README.md`, `CONFIG_SCHEMA.md`, and `AGENTS.md` to preserve the sequenced multi-representation direction and GitHub/process guardrails.
- Current local checks after sequenced-tutor rework: `scripts/git-safety-check.sh` passed, `npm test` passed with 247 assertions, embedded script syntax extraction passed, and `git diff --check` passed.
- Playwright visual smoke remains blocked by local macOS/Chromium sandbox permissions: `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer... Permission denied (1100)`.
