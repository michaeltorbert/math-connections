# Math Connections

A child-facing practice app for addition/subtraction fact families, built for a
six-year-old learner. It runs as a static site and stores practice history in
the browser.

## Run

Open `index.html` in a browser. For local serving:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## What It Practices

- Turning addition facts into related subtraction facts.
- Turning subtraction facts into related addition facts.
- Connecting a visual part-part-whole model to equations.
- Finding the same missing part in addition and subtraction.

The default range is within 10, with untimed practice and a short session length.

## Logging And AI Analysis

Every answer check is stored in `localStorage`, including:

- learner name
- session id and timestamps
- problem type
- fact family parts and whole
- expected answers and submitted answers
- per-field correctness
- attempt number for that problem
- response time
- hint usage
- skill tags

Use the Parent tools panel to download a JSON result dump or CSV. The JSON dump
also includes a compact summary with weakest fact families and problem types.
Results live in this browser's `localStorage`; export JSON regularly if you
want a durable record. The log includes response times, hint usage, and skipped
questions, so clear the data on shared devices when you no longer need it.

The app can copy an AI-analysis prompt that asks for:

- misconception patterns
- facts that need more repetition
- whether the number range should change
- an optional coach plan JSON

## Coach Plan Format

An AI tool can return a coach plan and the plan can be pasted into Parent tools.

```json
{
  "name": "Missing parts within 10",
  "rangeMax": 10,
  "targetQuestions": 12,
  "adaptive": true,
  "modeWeights": {
    "relatedSubtractions": 3,
    "relatedAddition": 2,
    "visualModel": 2,
    "missingPart": 4
  },
  "focusFacts": [
    { "whole": 9, "parts": [4, 5], "weight": 4 },
    { "whole": 10, "parts": [6, 4], "weight": 3 }
  ],
  "notesForParent": [
    "Keep the range within 10 until missing-part questions are steady."
  ]
}
```

If no plan is imported, the app adapts from recent wrong answers and hints.
Imported plans are validated before use. Invalid focus facts or non-numeric mode
weights are rejected instead of silently changing the practice mix.

## Checks

```sh
node --check src/practice-core.js
node --check src/app.js
node tests/practice-core.test.js
```
