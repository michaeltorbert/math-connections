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
| `problemTypeMix` | object | weights ≥ 0 | `{ADD:.30, SUB1:.27, SUB2:.27, CONNECT:.16}` | Relative likelihood of each problem type. **Auto-normalized** to sum 1, so you may pass plain weights like `{ADD:1, SUB1:2, SUB2:2, CONNECT:1}`. |
| `hintBehavior.autoHintAfterWrong` | number | `0`–`5` | `1` | Wrong answers before a hint is auto-shown (`0` = never auto). |
| `hintBehavior.alwaysOfferMorph` | boolean | — | `true` | Offer the "Show the connection" animation after a correct ADD. |
| `mastery.streakToMaster` | number | `1`–`8` | `3` | Correct-in-a-row needed to promote a fact one box. |
| `mastery.demoteOnMiss` | boolean | — | `true` | Demote a fact one box on a miss. |
| `ttsRate` | number | `0.6`–`1.4` | `0.92` | Voice speed. |

### Problem types

- `ADD` — find the whole (`a + b = ?`).
- `SUB1` — find a part, take-away framing (`whole − a = ?`).
- `SUB2` — the mirror part (`whole − b = ?`).
- `CONNECT` — a subtraction with the matching addition shown as a scaffold
  (`You know a + b = whole. So whole − a = ?`). Use this to build add→subtract transfer.

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
  "problemTypeMix": { "ADD": 0.15, "SUB1": 0.3, "SUB2": 0.3, "CONNECT": 0.25 },
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
  "sessions": [ { "id", "startedAt", "endedAt", "length", "summary": { "total", "firstTry" } }, ... ],
  "problems": [ /* one record per problem, schema below */ ]
}
```

Each **problem record**:

```jsonc
{
  "id", "timestamp", "sessionId", "schemaVersion",
  "mode": "factFamily",
  "problemType": "SUB1",            // ADD | SUB1 | SUB2 | CONNECT
  "factFamilyId": "3+5=8",
  "operands": { "a": 3, "b": 5, "whole": 8 },
  "fact": "8-3",
  "factCanonical": "8-3=5",
  "operation": "subtraction",       // addition | subtraction
  "problemText": "8 apples. 3 are red. How many are green?",
  "correctAnswer": 5,
  "childAnswer": 4,
  "errorValue": -1,                 // childAnswer - correctAnswer (0 if right). Clusters off-by-one / reversals.
  "attempts": 2,
  "correctFirstTry": false,
  "strategyTag": "countback",       // memory | counton | countback | usedadd | fingers | guessed | null
  "hintUsed": true,
  "morphViewed": false,
  "timeSpentMs": 8421,
  "range": 10,
  "configId": "2026-06-24-focus-make10"
}
```

**To analyze transfer:** group `problems` by `factFamilyId`, then compare `correctFirstTry`
on `operation:"addition"` vs `operation:"subtraction"` within each family. A family where
addition is strong but subtraction is weak is a prime CONNECT-drill candidate.
