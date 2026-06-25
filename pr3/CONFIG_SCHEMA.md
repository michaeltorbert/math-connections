# Adaptive Config Schema

This is the contract for the JSON an AI returns (PART 2 of the analysis prompt) and that the
app imports via **Grown-ups → ⚙ Import config**. It retunes practice **without code changes**.

The import is defensive: it is `JSON.parse`d (never `eval`d), unknown keys are ignored, every
number is clamped to a safe range, and malformed `fact` / `family` strings are **dropped**
(the rest of the config still applies). On a hard failure the app keeps the last good config
and shows a non-blocking message — it never crashes or hangs.

## Identifiers

- **Fact family** — canonical string `"a+b=whole"` with `a ≤ b`, e.g. `"3+5=8"`.
  `5+3` and `3+5` are the *same* family; always write the smaller addend first.
- **Fact** — a single direction within a family:
  - addition `"a+b"` (e.g. `"3+5"`)
  - subtraction `"whole-a"` (e.g. `"8-3"` or `"8-5"`)

## Fields

| Field | Type | Range / values | Default | Meaning |
|---|---|---|---|---|
| `schemaVersion` | number | `1` | `1` | Schema version. A mismatch warns but still loads. |
| `configId` | string | ≤ 80 chars | `null` | A label for this config (shown in the dashboard). |
| `createdBy` | string | ≤ 40 chars | `"default"` | Who made it (e.g. `"chatgpt"`, `"claude"`). |
| `note` | string | ≤ 400 chars | `""` | Human note about why; shown to the grown-up. |
| `numberRange.max` | number | `5`–`20` | `10` | Largest whole used. Families with `whole > max` are excluded. |
| `numberRange.min` | number | `0`–`max-1` | `0` | Reserved lower bound. |
| `sessionLength` | number | `3`–`12` | `6` | Problems per session. |
| `emphasizeFamilies` | string[] | family strings | `[]` | Families to show **more** often (weight ×3). Bad entries dropped. |
| `avoidFamilies` | string[] | family strings | `[]` | Families to **exclude**. If this empties the pool, the app falls back to the full in-range set and warns. |
| `emphasizeFacts` | string[] | fact strings | `[]` | Specific facts to drill (weight ×3). |
| `problemTypeMix` | object | weights ≥ 0 | six diagnostic types plus light transfer review | Relative weight for adaptive extra slots after calibration. Every adaptive cycle still guarantees one probe from each diagnostic type. **Auto-normalized** to sum 1, so you may pass plain weights like `{SUB_MISSING_WHOLE:3, COMPANION:2, COMPARE_COMPANION:2}`. |
| `hintBehavior.autoHintAfterWrong` | number | `0`–`5` | `1` | Wrong answers before a hint is auto-shown (`0` = never auto). |
| `hintBehavior.alwaysOfferMorph` | boolean | — | `true` | Legacy compatibility flag. The app now always shows a required connection step after each solved problem. |
| `mastery.streakToMaster` | number | `1`–`8` | `3` | Correct-in-a-row needed to promote a fact one box. |
| `mastery.demoteOnMiss` | boolean | — | `true` | Demote a fact one box on a miss. |
| `ttsRate` | number | `0.6`–`1.4` | `0.92` | Voice speed. |

### Problem types

- `SUB_RESULT` — solve the result blank in a subtraction, e.g. `7 − 4 = □`.
- `SUB_MISSING_PART` — solve the taken-away blank, e.g. `7 − □ = 3`.
- `SUB_MISSING_WHOLE` — solve the first-number blank, e.g. `□ − 4 = 3`.
- `ADD_MISSING_PART` — solve the missing-addend blank, e.g. `□ + 4 = 7`.
- `COMPARE_COMPANION` — show a comparison-dot picture plus a given subtraction, then ask for
  the companion subtraction, e.g. `5 − 4 = 1` → `5 − 1 = 4`.
- `COMPARE_ADD` — show the same comparison situation plus a given subtraction, then ask for a
  matching addition, accepting either addend order, e.g. `4 + 1 = 5` or `1 + 4 = 5`.
- `PICTURE_FAMILY` — use a colored-dot picture to count both parts and the whole, then
  construct `part + part = whole` and `whole − part = part`. Earlier items are staged
  and guided. This is the **PUT TOGETHER** representation, not the main comparison task.
- `COMPANION` — given one subtraction, construct the matching subtraction while keeping
  the whole first, e.g. `5 − 4 = 1` → `5 − 1 = 4`.
- `ADD_TO_SUB` — given an addition, construct both matching subtractions.
- `NOT_FAMILY` — choose which true subtraction belongs to the displayed whole/part family.
- `WHOLE_FIRST` — identify the whole before constructing a subtraction.
- `ADD` — solve the addition, then write both matching subtractions.
- `SUB1` — solve `whole − a = b`, then write the matching addition.
- `SUB2` — solve the mirror subtraction `whole − b = a`, then write the matching addition.
- `CONNECT` — use a small circle picture to write an addition and a matching subtraction.
  Use this to build add→subtract transfer without turning the task into a number-bond diagram.

The local default scheduler is ordered, not random. First it runs a quiet calibration phase:

1. Six sessions of six questions.
2. Each calibration session includes one each of `SUB_RESULT`, `SUB_MISSING_PART`,
   `SUB_MISSING_WHOLE`, `ADD_MISSING_PART`, `COMPANION`, and `COMPARE_COMPANION`.
3. Six fact families are rotated across the six types over the six sessions.
4. The same family is not intentionally reused twice inside one calibration session.

After calibration, the app uses repeating 12-question cycles: six guaranteed probes, three
extra questions from the weakest type, two from the second-weakest type or prerequisite, and
one `SPACED_REVIEW` slot that resolves to a recent weak skill. Imported `problemTypeMix`
weights can nudge the extra slots, but they do not remove the guaranteed probes.

## Examples

### Minimal — bump the level, shorten sessions
```json
{ "numberRange": { "max": 20 }, "sessionLength": 5 }
```

### Targeted — subtraction lagging in the make-10 families
```json
{
  "schemaVersion": 1,
  "configId": "2026-06-24-focus-make10",
  "createdBy": "claude",
  "note": "Adds are solid; take-aways from 10 are shaky. Drill them with the connection shown.",
  "numberRange": { "min": 0, "max": 10 },
  "sessionLength": 6,
  "emphasizeFamilies": ["6+4=10", "7+3=10", "8+2=10"],
  "emphasizeFacts": ["10-6", "10-7", "10-8"],
  "avoidFamilies": [],
  "problemTypeMix": { "SUB_MISSING_WHOLE": 3, "COMPANION": 2, "COMPARE_COMPANION": 2, "ADD_MISSING_PART": 1 },
  "hintBehavior": { "autoHintAfterWrong": 1, "alwaysOfferMorph": true },
  "mastery": { "streakToMaster": 3, "demoteOnMiss": true },
  "ttsRate": 0.92
}
```

## Results dump (what the AI reads)

`⬇ Export results (JSON)` / `📋 Copy analysis prompt` produce:

```jsonc
{
  "meta": { "app", "appVersion", "schemaVersion", "child", "exportedAt", "totalProblems", "dateRange" },
  "activeConfig": { /* the config currently in effect */ },
  "factMastery": { "8-3": { "box": 2, "streak": 0, "attempts": 5, "correct": 2, "lastSeen": 0 }, ... },
  "deficitProfile": {
    "focus": { /* local focus buckets and reasons */ },
    "factStats": { /* per-fact first-try ratios */ },
    "familyStats": { /* addition vs subtraction transfer ratios by family */ },
    "skillStats": { /* per-skill first-try ratios */ },
    "representationStats": { /* comparison dots vs put-together dots vs equation ratios */ }
  },
  "diagnosticProfile": {
    "calibration": { "targetProblems": 36, "completedProblems": 18, "complete": false },
    "lifetimeProblemTypes": { "SUB_RESULT": { "seen": 3, "correct": 2, "score": 0.33 }, "...": "..." },
    "recentProblemTypes": { "SUB_RESULT": { "seen": 3, "correct": 2, "score": 0.33 }, "...": "..." }
  },
  "recentProblems": [ /* last 50 problem records for improvement-window analysis */ ],
  "sessions": [ { "id", "startedAt", "endedAt", "length", "summary": { "total", "firstTry" } }, ... ],
  "problems": [ /* one record per problem, schema below */ ]
}
```

Each **problem record**:

```jsonc
{
  "id", "timestamp", "sessionId", "schemaVersion",
  "mode": "factFamily",
  "problemType": "COMPARE_COMPANION", // includes SUB_RESULT | SUB_MISSING_PART | SUB_MISSING_WHOLE | ADD_MISSING_PART | COMPANION | COMPARE_COMPANION plus transfer/review types
  "plannedType": "SPACED_REVIEW",   // original session slot before review/focus resolution; often same as problemType
  "schedulerPhase": "adaptive",     // calibration | adaptive | null
  "schedulerRole": "weakestExtra",  // calibrationProbe | guaranteedProbe | weakestExtra | secondWeakestExtra | secondWeakestPrerequisite | spacedReview
  "schedulerCycleIndex": 2,
  "schedulerCyclePosition": 7,
  "calibrationSessionIndex": null,
  "calibrationTypeIndex": null,
  "factFamilyId": "1+4=5",
  "operands": { "a": 1, "b": 4, "whole": 5 },
  "fact": "5-1",
  "factCanonical": "5-1=4",
  "operation": "structure",         // structure | count | addition | subtraction
  "blankPosition": "subtrahend",
  "skill": "companionSubtraction",
  "representation": "comparisonDots",
  "problemText": "Write the other subtraction. Keep the first number. Switch the other two numbers.",
  "correctAnswer": 1,
  "childAnswer": 4,
  "errorValue": null,
  "attempts": 2,
  "correctFirstTry": false,
  "finalCorrect": true,
  "successAfterHint": true,
  "supportOutcome": "verbalHint",   // independent | verbalHint | relatedAdditionHint | visualModel | afterRetry | notCorrect
  "strategyTag": "countback",       // memory | counton | countback | usedadd | fingers | guessed | null
  "hintUsed": true,
  "hintSequence": ["firstNumberStays", "switchOtherNumbers"],
  "modeledAnswer": false,
  "morphViewed": false,
  "connectionViewed": true,
  "answers": [
    {
      "id": "cmpWhole",
      "fact": "5-1",
      "operation": "subtraction",
      "role": "whole",
      "blankPosition": "whole",
      "skill": "wholeFirst",
      "representation": "comparisonDots",
      "correctAnswer": 5,
      "childAnswer": 5,
      "finalAnswer": 5,
      "correctFirstTry": true,
      "errorCode": null,
      "arithmeticCorrect": null,
      "familyCorrect": null
    },
    {
      "id": "cmpSub",
      "fact": "5-1",
      "operation": "subtraction",
      "role": "subtrahend",
      "skill": "companionSubtraction",
      "representation": "comparisonDots",
      "correctAnswer": 1,
      "childAnswer": 4,
      "finalAnswer": 1,
      "correctFirstTry": false,
      "errorCode": "OTHER_NUMBERS_NOT_SWITCHED",
      "arithmeticCorrect": null,
      "familyCorrect": null
    }
  ],
  "structuralErrorCodes": ["OTHER_NUMBERS_NOT_SWITCHED"],
  "arithmeticCorrect": true,
  "familyCorrect": false,
  "scaffoldLevel": 2,
  "focusId": "companionSubtraction",
  "focusLabel": "write the related subtraction",
  "focusReason": "Kept the first number but did not switch the other two numbers.",
  "focusTargets": { "facts": ["5-1"], "families": ["1+4=5"] },
  "deficitSignals": [
    {
      "id": "companionSubtraction",
      "family": "1+4=5",
      "facts": ["5-1", "5-4"],
      "reason": "kept the first number but did not switch the other two numbers"
    }
  ],
  "timeSpentMs": 8421,
  "range": 10,
  "configId": "2026-06-24-focus-make10"
}
```

**To analyze structure:** inspect `structuralErrorCodes` separately from ordinary arithmetic
accuracy. `PART_MINUS_PART` means the submitted equation may be arithmetically true but does
not belong to the displayed family because it did not keep the whole first.

Structural codes currently used:

- `FIRST_NUMBER_CHANGED` — did not keep the first number fixed in a comparison companion task.
- `OTHER_NUMBERS_NOT_SWITCHED` — copied the given subtraction or failed to switch the other two numbers.
- `ADDED_ALL_VISIBLE_DOTS` — treated a comparison picture as a put-together picture and used all visible dots.
- `TRUE_BUT_NOT_MATCHING` — wrote a true equation that does not match the given subtraction.
- `MATCHING_ADDITION_ERROR` — did not write a valid matching addition for the given subtraction.
- `PART_MINUS_PART` — wrote a true part-minus-part equation instead of starting with the whole.
- `WHOLE_NOT_FIRST` / `WRONG_WHOLE` — did not keep the displayed family whole first.
- `TRUE_BUT_OTHER_FAMILY` — wrote a true equation from a different fact family.
- `PARTS_NOT_SWITCHED` / `WRONG_PART_POSITION` — kept the whole first but did not use the matching switched parts.
- `DUPLICATE_SUBTRACTION` — repeated one subtraction instead of writing both matching subtraction facts.
- `ARITHMETIC_ERROR` — used the family whole and parts, but the subtraction arithmetic was wrong.
- `PICTURE_PART_COUNT_ERROR` — miscounted one of the colored parts in the picture.
- `PICTURE_WHOLE_COUNT_ERROR` — did not identify the whole as all of the dots together.
- `PICTURE_ADDITION_ARITHMETIC_ERROR` — used picture numbers but did not write a true addition.

**To analyze comparison transfer:** for `COMPARE_COMPANION`, inspect whether the child changed
the first number, failed to switch the other two numbers, or added all visible comparison dots.
For `COMPARE_ADD`, inspect whether the child can turn the given subtraction into a matching
addition without treating the picture as a put-together total.

**To analyze transfer:** group `answers` rows by `factFamilyId`, then compare first-try
accuracy on `operation:"addition"` vs `operation:"subtraction"` within each family. A family
where addition rows are strong but subtraction rows are weak is a secondary subtraction-drill
candidate after the companion-subtraction work.

**To analyze picture abstraction:** for `PICTURE_FAMILY`, inspect `answers[]` by component:
`operation:"count"` reveals whether the colored parts and whole were counted, `operation:"addition"`
reveals picture-to-symbol addition mapping, and `operation:"subtraction"` reveals whether the
child started from the whole and found the other part.

Each answer row can also include `skill` and `representation`. Current skills include
`countFirstGroup`, `countSecondGroup`, `identifyWhole`, `pictureToAddition`,
`pictureToSubtraction`, `wholeFirst`, `additionToSubtraction`, `companionSubtraction`,
`matchingAddition`, `familyDiscrimination`, `additionRecall`, `subtractionRecall`, and
`subtractionToAddition`.
Representations currently include `comparisonDots`, `putTogetherDots`, `picture`, and `equation`.
