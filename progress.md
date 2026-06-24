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
