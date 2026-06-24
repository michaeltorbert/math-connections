const assert = require("assert");
const Core = require("../src/practice-core");

function testDeterministicProblem() {
  const problem = Core.createProblem({
    rng: Core.createRng(42),
    settings: { rangeMax: 10 },
    type: "relatedSubtractions",
    family: { whole: 9, parts: [4, 5] },
    id: "p_test",
    now: "2026-01-01T00:00:00.000Z",
  });

  assert.strictEqual(problem.givenEquation, "4 + 5 = 9");
  assert.deepStrictEqual(
    problem.fields.map((field) => field.expected),
    [5, 4],
  );
}

function testGrading() {
  const problem = Core.createProblem({
    rng: Core.createRng(1),
    settings: { rangeMax: 10 },
    type: "missingPart",
    family: { whole: 8, parts: [3, 5] },
  });

  const wrong = Core.gradeProblem(
    problem,
    { missingAdd: "4", missingSub: "5" },
    1,
    { responseMs: 1200, hintsUsed: 1, sessionId: "s1" },
  );
  assert.strictEqual(wrong.isCorrect, false);
  assert.strictEqual(wrong.fieldResults[0].isCorrect, false);
  assert.strictEqual(wrong.fieldResults[1].isCorrect, true);

  const right = Core.gradeProblem(
    problem,
    { missingAdd: "5", missingSub: "5" },
    2,
    { responseMs: 1800, hintsUsed: 1, sessionId: "s1" },
  );
  assert.strictEqual(right.isCorrect, true);
}

function testSummary() {
  const problem = Core.createProblem({
    rng: Core.createRng(2),
    settings: { rangeMax: 10 },
    type: "relatedAddition",
    family: { whole: 10, parts: [6, 4] },
    id: "p_summary",
  });
  const attempts = [
    Core.gradeProblem(problem, { addA: "5", addB: "6" }, 1, {
      sessionId: "s1",
      hintsUsed: 0,
    }),
    Core.gradeProblem(problem, { addA: "4", addB: "6" }, 2, {
      sessionId: "s1",
      hintsUsed: 1,
    }),
  ];
  const summary = Core.summarizeAttempts(attempts);
  assert.strictEqual(summary.totalProblems, 1);
  assert.strictEqual(summary.completedProblems, 1);
  assert.strictEqual(summary.finishedProblems, 1);
  assert.strictEqual(summary.skippedProblems, 0);
  assert.strictEqual(summary.firstTryCorrect, 0);
  assert.strictEqual(summary.needsPractice, 1);
  assert(summary.weakestFactFamilies[0].key.includes("4 + 6 = 10"));
}

function testCoachPlanValidation() {
  const plan = Core.parseCoachPlan({
    rangeMax: 20,
    targetQuestions: 16,
    modeWeights: { missingPart: 5 },
    focusFacts: [
      { whole: 12, parts: [7, 5], weight: 4 },
    ],
  });

  assert.strictEqual(plan.rangeMax, 20);
  assert.strictEqual(plan.targetQuestions, 16);
  assert.strictEqual(plan.focusFacts.length, 1);
  assert.deepStrictEqual(plan.focusFacts[0].parts, [7, 5]);

  assert.throws(
    () =>
      Core.parseCoachPlan({
        rangeMax: 10,
        modeWeights: { missingPart: "a lot" },
      }),
    /mode weight/,
  );

  assert.throws(
    () =>
      Core.parseCoachPlan({
        rangeMax: 10,
        focusFacts: [{ whole: 9, parts: [4, 4], weight: 4 }],
      }),
    /focusFacts/,
  );
}

testDeterministicProblem();
testGrading();
testSummary();
testCoachPlanValidation();

console.log("practice-core tests passed");
