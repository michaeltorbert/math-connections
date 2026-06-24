(function initPracticeCore(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PracticeCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function buildPracticeCore() {
  "use strict";

  const PROBLEM_TYPES = [
    "relatedSubtractions",
    "relatedAddition",
    "visualModel",
    "missingPart",
  ];

  const DEFAULT_MODE_WEIGHTS = {
    relatedSubtractions: 3,
    relatedAddition: 3,
    visualModel: 2,
    missingPart: 2,
  };

  const DEFAULT_SETTINGS = {
    learnerName: "James",
    rangeMax: 10,
    targetQuestions: 12,
    adaptive: true,
    modeWeights: DEFAULT_MODE_WEIGHTS,
    focusFacts: [],
  };

  function createRng(seed) {
    let value = Number.isFinite(seed) ? seed >>> 0 : Date.now() >>> 0;
    return function rng() {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function clampRange(rangeMax) {
    const numeric = Number(rangeMax);
    if (numeric <= 10) return 10;
    return 20;
  }

  function normalizeSettings(settings) {
    const merged = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const modeWeights = Object.assign(
      {},
      DEFAULT_MODE_WEIGHTS,
      merged.modeWeights || {},
    );

    return {
      learnerName: String(merged.learnerName || "James").trim() || "James",
      rangeMax: clampRange(merged.rangeMax),
      targetQuestions: Math.max(4, Math.min(40, Number(merged.targetQuestions) || 12)),
      adaptive: merged.adaptive !== false,
      modeWeights,
      focusFacts: normalizeFocusFacts(merged.focusFacts, clampRange(merged.rangeMax)),
      planName: merged.planName || merged.name || "",
      notesForParent: Array.isArray(merged.notesForParent) ? merged.notesForParent : [],
    };
  }

  function normalizeFocusFacts(facts, rangeMax) {
    if (!Array.isArray(facts)) return [];

    return facts
      .map((fact) => {
        const whole = Number(fact && fact.whole);
        const parts = Array.isArray(fact && fact.parts) ? fact.parts.map(Number) : [];
        const weight = Math.max(1, Math.min(20, Number(fact && fact.weight) || 1));
        if (
          !Number.isInteger(whole) ||
          whole < 2 ||
          whole > rangeMax ||
          parts.length !== 2 ||
          !Number.isInteger(parts[0]) ||
          !Number.isInteger(parts[1]) ||
          parts[0] < 0 ||
          parts[1] < 0 ||
          parts[0] + parts[1] !== whole
        ) {
          return null;
        }
        return { whole, parts: [parts[0], parts[1]], weight };
      })
      .filter(Boolean);
  }

  function weightedPick(items, getWeight, rng) {
    const weighted = items
      .map((item) => ({ item, weight: Math.max(0, Number(getWeight(item)) || 0) }))
      .filter((entry) => entry.weight > 0);

    if (weighted.length === 0) return items[0];

    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }
    return weighted[weighted.length - 1].item;
  }

  function buildAdaptiveFocus(attempts, rangeMax) {
    const recent = (attempts || []).slice(-40);
    const factScores = new Map();
    const typeScores = Object.assign({}, DEFAULT_MODE_WEIGHTS);

    for (const attempt of recent) {
      if (!attempt || attempt.isCorrect) continue;
      const whole = Number(attempt.factFamily && attempt.factFamily.whole);
      const parts = attempt.factFamily && attempt.factFamily.parts;
      if (Number.isInteger(whole) && Array.isArray(parts) && whole <= rangeMax) {
        const key = `${whole}:${parts[0]}:${parts[1]}`;
        factScores.set(key, (factScores.get(key) || 0) + 2);
      }
      if (attempt.problemType && typeScores[attempt.problemType] !== undefined) {
        typeScores[attempt.problemType] += 1;
      }
    }

    return {
      focusFacts: Array.from(factScores.entries()).map(([key, weight]) => {
        const [whole, partA, partB] = key.split(":").map(Number);
        return { whole, parts: [partA, partB], weight };
      }),
      modeWeights: typeScores,
    };
  }

  function chooseFactFamily(settings, rng, attempts) {
    const normalized = normalizeSettings(settings);
    const adaptive = normalized.adaptive
      ? buildAdaptiveFocus(attempts, normalized.rangeMax).focusFacts
      : [];
    const focusFacts = normalized.focusFacts.concat(adaptive);

    if (focusFacts.length > 0 && rng() < 0.68) {
      const picked = weightedPick(focusFacts, (fact) => fact.weight, rng);
      return {
        whole: picked.whole,
        parts: maybeSwapParts(picked.parts, rng),
      };
    }

    const whole = randomInt(rng, 3, normalized.rangeMax);
    const partA = randomInt(rng, 1, whole - 1);
    const partB = whole - partA;

    return {
      whole,
      parts: maybeSwapParts([partA, partB], rng),
    };
  }

  function maybeSwapParts(parts, rng) {
    return rng() < 0.5 ? [parts[1], parts[0]] : [parts[0], parts[1]];
  }

  function chooseProblemType(settings, rng, attempts) {
    const normalized = normalizeSettings(settings);
    const adaptiveWeights = normalized.adaptive
      ? buildAdaptiveFocus(attempts, normalized.rangeMax).modeWeights
      : {};
    const weights = Object.assign(
      {},
      DEFAULT_MODE_WEIGHTS,
      normalized.modeWeights,
      adaptiveWeights,
    );

    return weightedPick(PROBLEM_TYPES, (type) => weights[type], rng);
  }

  function createProblem(options) {
    const opts = options || {};
    const rng = opts.rng || Math.random;
    const settings = normalizeSettings(opts.settings);
    const attempts = opts.attempts || [];
    const family = opts.family || chooseFactFamily(settings, rng, attempts);
    const type = opts.type || chooseProblemType(settings, rng, attempts);
    const now = opts.now || new Date().toISOString();
    const id = opts.id || `p_${Date.now()}_${Math.floor(rng() * 100000)}`;

    return buildProblem(id, type, family, settings.rangeMax, now);
  }

  function buildProblem(id, type, family, rangeMax, createdAt) {
    const partA = family.parts[0];
    const partB = family.parts[1];
    const whole = family.whole;
    const base = {
      id,
      type,
      createdAt,
      rangeMax,
      factFamily: { whole, parts: [partA, partB] },
      skillTags: [
        "fact-family",
        `within-${rangeMax}`,
        `whole-${whole}`,
        `part-${partA}`,
        `part-${partB}`,
      ],
      correctFacts: [
        `${partA} + ${partB} = ${whole}`,
        `${partB} + ${partA} = ${whole}`,
        `${whole} - ${partA} = ${partB}`,
        `${whole} - ${partB} = ${partA}`,
      ],
    };

    if (type === "relatedSubtractions") {
      return Object.assign(base, {
        title: "Find the take-away facts",
        kicker: "Addition tells subtraction",
        givenEquation: `${partA} + ${partB} = ${whole}`,
        fields: [
          field("subA", `${whole} - ${partA} =`, partB, "first subtraction answer"),
          field("subB", `${whole} - ${partB} =`, partA, "second subtraction answer"),
        ],
        skillTags: base.skillTags.concat(["addition-to-subtraction"]),
      });
    }

    if (type === "relatedAddition") {
      return Object.assign(base, {
        title: "Put it back together",
        kicker: "Subtraction tells addition",
        givenEquation: `${whole} - ${partA} = ${partB}`,
        fields: [
          field("addA", `${partA} +`, partB, "missing addend", `= ${whole}`),
          field("addB", `${partB} +`, partA, "other missing addend", `= ${whole}`),
        ],
        skillTags: base.skillTags.concat(["subtraction-to-addition"]),
      });
    }

    if (type === "missingPart") {
      return Object.assign(base, {
        title: "Same missing piece",
        kicker: "One part works twice",
        givenEquation: "",
        fields: [
          field("missingAdd", `${partA} +`, partB, "missing part in addition", `= ${whole}`),
          field("missingSub", `${whole} - ${partA} =`, partB, "missing part in subtraction"),
        ],
        skillTags: base.skillTags.concat(["missing-part"]),
      });
    }

    return Object.assign(base, {
      title: "Name the family",
      kicker: "Picture to numbers",
      givenEquation: "",
      fields: [
        field("visualAddLeft", "", partA, "left addend", `+ ${partB} = ${whole}`),
        field("visualSubA", `${whole} -`, partA, "part removed", `= ${partB}`),
        field("visualSubB", `${whole} -`, partB, "other part removed", `= ${partA}`),
      ],
      skillTags: base.skillTags.concat(["visual-model"]),
    });
  }

  function field(id, before, expected, label, after) {
    return {
      id,
      before,
      after: after || "",
      expected,
      label,
    };
  }

  function gradeProblem(problem, submittedAnswers, attemptNumber, meta) {
    const answers = submittedAnswers || {};
    const fieldResults = problem.fields.map((item) => {
      const raw = answers[item.id];
      const numeric = Number(raw);
      const isBlank = raw === "" || raw === null || raw === undefined;
      const isCorrect = !isBlank && Number.isInteger(numeric) && numeric === item.expected;
      return {
        id: item.id,
        expected: item.expected,
        submitted: isBlank ? "" : numeric,
        isCorrect,
      };
    });

    const now = new Date().toISOString();
    const isCorrect = fieldResults.every((result) => result.isCorrect);
    return {
      id: `a_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      createdAt: now,
      learnerName: meta && meta.learnerName,
      sessionId: meta && meta.sessionId,
      problemId: problem.id,
      problemType: problem.type,
      factFamily: clone(problem.factFamily),
      expectedAnswers: problem.fields.map((item) => ({
        id: item.id,
        expected: item.expected,
      })),
      submittedAnswers: fieldResults.map((item) => ({
        id: item.id,
        submitted: item.submitted,
      })),
      fieldResults,
      isCorrect,
      attemptNumberForProblem: attemptNumber,
      responseMs: Math.max(0, Number(meta && meta.responseMs) || 0),
      hintsUsed: Math.max(0, Number(meta && meta.hintsUsed) || 0),
      skipped: Boolean(meta && meta.skipped),
      skillTags: problem.skillTags.slice(),
    };
  }

  function summarizeAttempts(attempts) {
    const list = Array.isArray(attempts) ? attempts : [];
    const problemMap = new Map();
    const typeStats = new Map();
    const factStats = new Map();
    const skillStats = new Map();

    for (const attempt of list) {
      if (!attempt || !attempt.problemId) continue;
      if (!problemMap.has(attempt.problemId)) {
        problemMap.set(attempt.problemId, {
          attempts: 0,
          correct: false,
          firstTryCorrect: false,
          skipped: false,
          hintsUsed: 0,
          factFamily: clone(attempt.factFamily),
          problemType: attempt.problemType,
        });
      }

      const problem = problemMap.get(attempt.problemId);
      problem.attempts += 1;
      problem.correct = problem.correct || Boolean(attempt.isCorrect);
      problem.skipped = problem.skipped || Boolean(attempt.skipped);
      problem.hintsUsed = Math.max(problem.hintsUsed, Number(attempt.hintsUsed) || 0);
      if (attempt.attemptNumberForProblem === 1 && attempt.isCorrect) {
        problem.firstTryCorrect = true;
      }

      bumpStat(typeStats, attempt.problemType || "unknown", attempt);
      const factKey = factFamilyKey(attempt.factFamily);
      bumpStat(factStats, factKey, attempt);
      for (const tag of attempt.skillTags || []) {
        bumpStat(skillStats, tag, attempt);
      }
    }

    const problems = Array.from(problemMap.values());
    const completed = problems.filter((problem) => problem.correct).length;
    const skipped = problems.filter((problem) => problem.skipped).length;
    const finished = problems.filter((problem) => problem.correct || problem.skipped).length;
    const firstTry = problems.filter((problem) => problem.firstTryCorrect).length;
    const needsPractice = problems.filter(
      (problem) => !problem.firstTryCorrect || problem.hintsUsed > 0 || problem.skipped,
    ).length;

    return {
      generatedAt: new Date().toISOString(),
      totalAttempts: list.length,
      totalProblems: problems.length,
      completedProblems: completed,
      skippedProblems: skipped,
      finishedProblems: finished,
      firstTryCorrect: firstTry,
      needsPractice,
      firstTryAccuracy:
        problems.length === 0 ? 0 : Number((firstTry / problems.length).toFixed(3)),
      weakestProblemTypes: rankWeakness(typeStats, 4),
      weakestFactFamilies: rankWeakness(factStats, 8),
      weakestSkills: rankWeakness(skillStats, 8),
    };
  }

  function bumpStat(map, key, attempt) {
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { key, attempts: 0, wrong: 0, hints: 0 });
    }
    const stat = map.get(key);
    stat.attempts += 1;
    if (!attempt.isCorrect) stat.wrong += 1;
    stat.hints += Number(attempt.hintsUsed) || 0;
  }

  function rankWeakness(map, limit) {
    return Array.from(map.values())
      .map((stat) => ({
        key: stat.key,
        attempts: stat.attempts,
        wrong: stat.wrong,
        hints: stat.hints,
        score: stat.wrong * 2 + stat.hints,
      }))
      .filter((stat) => stat.score > 0)
      .sort((a, b) => b.score - a.score || b.attempts - a.attempts)
      .slice(0, limit);
  }

  function factFamilyKey(family) {
    if (!family || !Array.isArray(family.parts)) return "unknown";
    const parts = family.parts.slice().sort((a, b) => a - b);
    return `${parts[0]} + ${parts[1]} = ${family.whole}`;
  }

  function createResultDump(storage, settings) {
    const sessions = storage && Array.isArray(storage.sessions) ? storage.sessions : [];
    const attempts = sessions.flatMap((session) => session.attempts || []);
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      app: "math-connections",
      activeSettings: normalizeSettings(settings),
      summary: summarizeAttempts(attempts),
      sessions,
    };
  }

  function attemptsToCsv(attempts) {
    const rows = [
      [
        "createdAt",
        "sessionId",
        "problemId",
        "problemType",
        "whole",
        "partA",
        "partB",
        "attemptNumber",
        "isCorrect",
        "skipped",
        "hintsUsed",
        "responseMs",
        "expected",
        "submitted",
        "skillTags",
      ],
    ];

    for (const attempt of attempts || []) {
      const expected = (attempt.expectedAnswers || [])
        .map((item) => `${item.id}:${item.expected}`)
        .join("|");
      const submitted = (attempt.submittedAnswers || [])
        .map((item) => `${item.id}:${item.submitted}`)
        .join("|");
      rows.push([
        attempt.createdAt,
        attempt.sessionId,
        attempt.problemId,
        attempt.problemType,
        attempt.factFamily && attempt.factFamily.whole,
        attempt.factFamily && attempt.factFamily.parts && attempt.factFamily.parts[0],
        attempt.factFamily && attempt.factFamily.parts && attempt.factFamily.parts[1],
        attempt.attemptNumberForProblem,
        attempt.isCorrect,
        attempt.skipped,
        attempt.hintsUsed,
        attempt.responseMs,
        expected,
        submitted,
        (attempt.skillTags || []).join("|"),
      ]);
    }

    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }

  function csvEscape(value) {
    const text = value === undefined || value === null ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function buildAiPrompt(resultDump) {
    return [
      "Analyze this addition/subtraction fact-family practice log for a six-year-old learner.",
      "Focus on misconceptions, weak fact families, problem types that need repetition, and whether the range should stay within 10 or move to 20.",
      "Return concise parent guidance and, if useful, a coach plan JSON matching this schema:",
      '{"rangeMax":10,"targetQuestions":12,"adaptive":true,"modeWeights":{"relatedSubtractions":3,"relatedAddition":2,"visualModel":2,"missingPart":4},"focusFacts":[{"whole":9,"parts":[4,5],"weight":4}],"notesForParent":["..."]}',
      "",
      JSON.stringify(resultDump, null, 2),
    ].join("\n");
  }

  function parseCoachPlan(text) {
    const parsed = typeof text === "string" ? JSON.parse(text) : text;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Coach plan must be a JSON object.");
    }

    const rangeMax = parsed.rangeMax === undefined ? DEFAULT_SETTINGS.rangeMax : parsed.rangeMax;
    const targetQuestions =
      parsed.targetQuestions === undefined ? DEFAULT_SETTINGS.targetQuestions : parsed.targetQuestions;
    if (![10, 20].includes(Number(rangeMax))) {
      throw new Error("Coach plan rangeMax must be 10 or 20.");
    }
    if (
      !Number.isFinite(Number(targetQuestions)) ||
      Number(targetQuestions) < 4 ||
      Number(targetQuestions) > 40
    ) {
      throw new Error("Coach plan targetQuestions must be between 4 and 40.");
    }

    validateModeWeights(parsed.modeWeights);
    validateCoachFocusFacts(parsed.focusFacts, clampRange(rangeMax));

    const normalized = normalizeSettings({
      rangeMax,
      targetQuestions,
      adaptive: parsed.adaptive,
      modeWeights: parsed.modeWeights,
      focusFacts: parsed.focusFacts,
      planName: parsed.name,
      notesForParent: parsed.notesForParent,
    });
    return normalized;
  }

  function validateModeWeights(modeWeights) {
    if (modeWeights === undefined) return;
    if (!modeWeights || typeof modeWeights !== "object" || Array.isArray(modeWeights)) {
      throw new Error("Coach plan modeWeights must be an object.");
    }

    let total = 0;
    for (const type of PROBLEM_TYPES) {
      if (modeWeights[type] === undefined) continue;
      const value = Number(modeWeights[type]);
      if (!Number.isFinite(value) || value < 0 || value > 20) {
        throw new Error(`Coach plan mode weight for ${type} must be between 0 and 20.`);
      }
      total += value;
    }
    if (Object.keys(modeWeights).some((key) => !PROBLEM_TYPES.includes(key))) {
      throw new Error("Coach plan modeWeights includes an unknown problem type.");
    }
    if (Object.keys(modeWeights).length > 0 && total <= 0) {
      throw new Error("Coach plan modeWeights must leave at least one problem type enabled.");
    }
  }

  function validateCoachFocusFacts(focusFacts, rangeMax) {
    if (focusFacts === undefined) return;
    if (!Array.isArray(focusFacts)) {
      throw new Error("Coach plan focusFacts must be an array.");
    }
    const normalized = normalizeFocusFacts(focusFacts, rangeMax);
    if (normalized.length !== focusFacts.length) {
      throw new Error("Coach plan focusFacts must be valid part-part-whole facts.");
    }
  }

  function clone(value) {
    return value ? JSON.parse(JSON.stringify(value)) : value;
  }

  return {
    PROBLEM_TYPES,
    DEFAULT_SETTINGS,
    DEFAULT_MODE_WEIGHTS,
    createRng,
    normalizeSettings,
    normalizeFocusFacts,
    buildAdaptiveFocus,
    chooseFactFamily,
    chooseProblemType,
    createProblem,
    gradeProblem,
    summarizeAttempts,
    createResultDump,
    attemptsToCsv,
    buildAiPrompt,
    parseCoachPlan,
    factFamilyKey,
  };
});
