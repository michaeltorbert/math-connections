(function initMathConnections() {
  "use strict";

  const Core = window.PracticeCore;
  const STORAGE_KEY = "math-connections-results-v1";

  const els = {
    appShell: document.querySelector(".app-shell"),
    parentToggle: document.getElementById("parent-toggle"),
    parentPanel: document.getElementById("parent-panel"),
    firstTryScore: document.getElementById("first-try-score"),
    needsPracticeScore: document.getElementById("needs-practice-score"),
    questionCount: document.getElementById("question-count"),
    numberModel: document.getElementById("number-model"),
    problemKicker: document.getElementById("problem-kicker"),
    problemTitle: document.getElementById("problem-title"),
    givenEquation: document.getElementById("given-equation"),
    answerForm: document.getElementById("answer-form"),
    feedback: document.getElementById("feedback"),
    hintButton: document.getElementById("hint-button"),
    skipButton: document.getElementById("skip-button"),
    checkButton: document.getElementById("check-button"),
    nextButton: document.getElementById("next-button"),
    learnerName: document.getElementById("learner-name"),
    rangeMax: document.getElementById("range-max"),
    targetQuestions: document.getElementById("target-questions"),
    adaptiveToggle: document.getElementById("adaptive-toggle"),
    newSessionButton: document.getElementById("new-session-button"),
    summaryList: document.getElementById("summary-list"),
    downloadJson: document.getElementById("download-json"),
    downloadCsv: document.getElementById("download-csv"),
    copyAiPrompt: document.getElementById("copy-ai-prompt"),
    clearData: document.getElementById("clear-data"),
    coachPlanInput: document.getElementById("coach-plan-input"),
    applyPlan: document.getElementById("apply-plan"),
    clearPlan: document.getElementById("clear-plan"),
    planStatus: document.getElementById("plan-status"),
  };

  const state = {
    storage: loadStorage(),
    settings: Core.normalizeSettings({}),
    session: null,
    problem: null,
    problemStartedAt: 0,
    attemptNumber: 0,
    hintsUsed: 0,
    problemLocked: false,
    rng: Core.createRng(Date.now()),
  };

  boot();

  function boot() {
    hydrateSettings();
    bindEvents();
    startSession();
  }

  function hydrateSettings() {
    const stored = state.storage.settings || {};
    const plan = state.storage.activeCoachPlan || {};
    state.settings = Core.normalizeSettings(Object.assign({}, stored, plan));
    els.learnerName.value = state.settings.learnerName;
    els.rangeMax.value = String(state.settings.rangeMax);
    els.targetQuestions.value = String(state.settings.targetQuestions);
    els.adaptiveToggle.checked = state.settings.adaptive;
    renderPlanStatus();
  }

  function bindEvents() {
    els.parentToggle.addEventListener("click", toggleParentPanel);
    els.answerForm.addEventListener("submit", onSubmitAnswer);
    els.nextButton.addEventListener("click", () => {
      if (state.session && state.session.endedAt) {
        startSession();
      } else {
        nextProblem();
      }
    });
    els.hintButton.addEventListener("click", showHint);
    els.skipButton.addEventListener("click", skipProblem);
    els.newSessionButton.addEventListener("click", () => {
      saveSettingsFromForm();
      startSession();
    });
    els.downloadJson.addEventListener("click", downloadJson);
    els.downloadCsv.addEventListener("click", downloadCsv);
    els.copyAiPrompt.addEventListener("click", copyAiPrompt);
    els.clearData.addEventListener("click", clearData);
    els.applyPlan.addEventListener("click", applyCoachPlan);
    els.clearPlan.addEventListener("click", clearCoachPlan);

    [els.learnerName, els.rangeMax, els.targetQuestions, els.adaptiveToggle].forEach(
      (control) => {
        control.addEventListener("change", saveSettingsFromForm);
      },
    );
  }

  function toggleParentPanel() {
    const willShow = els.parentPanel.hidden;
    els.parentPanel.hidden = !willShow;
    els.appShell.classList.toggle("tools-open", willShow);
    els.parentToggle.setAttribute("aria-expanded", String(willShow));
    if (willShow) renderSummary();
  }

  function startSession() {
    const session = {
      id: `s_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      learnerName: state.settings.learnerName,
      startedAt: new Date().toISOString(),
      endedAt: null,
      settingsSnapshot: Core.normalizeSettings(state.settings),
      attempts: [],
    };
    state.storage.sessions.push(session);
    state.session = session;
    saveStorage();
    nextProblem();
  }

  function nextProblem() {
    if (state.session && getCompletedProblems(state.session.attempts).length >= state.settings.targetQuestions) {
      finishSession();
      return;
    }

    state.problem = Core.createProblem({
      settings: state.settings,
      attempts: allAttempts(),
      rng: state.rng,
    });
    state.problemStartedAt = performance.now();
    state.attemptNumber = 0;
    state.hintsUsed = 0;
    state.problemLocked = false;
    renderProblem();
    updateProgress();
  }

  function renderProblem() {
    const problem = state.problem;
    els.problemKicker.textContent = problem.kicker;
    els.problemTitle.textContent = problem.title;
    els.givenEquation.textContent = problem.givenEquation;
    els.feedback.textContent = "";
    els.feedback.classList.remove("needs-work");
    els.checkButton.classList.remove("hidden");
    els.nextButton.classList.add("hidden");
    els.nextButton.textContent = "Next";
    els.hintButton.disabled = false;
    els.skipButton.disabled = false;
    renderNumberModel(problem.factFamily);
    renderAnswerForm(problem);
  }

  function renderNumberModel(family) {
    const partA = family.parts[0];
    const partB = family.parts[1];
    els.numberModel.innerHTML = "";

    const wholeRow = document.createElement("div");
    wholeRow.className = "whole-row";
    wholeRow.append(
      modelLabel("Whole", family.whole),
      counterBox("whole", partA, partB),
    );

    const partsRow = document.createElement("div");
    partsRow.className = "parts-row";

    const left = document.createElement("div");
    left.append(modelLabel("Part", partA), counterBox("part-a", partA, 0));

    const right = document.createElement("div");
    right.append(modelLabel("Part", partB), counterBox("part-b", 0, partB));

    partsRow.append(left, right);
    els.numberModel.append(wholeRow, partsRow);
  }

  function modelLabel(label, value) {
    const row = document.createElement("div");
    row.className = "model-label";
    row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    return row;
  }

  function counterBox(className, partA, partB) {
    const box = document.createElement("div");
    box.className = `counter-box ${className}`;
    const grid = document.createElement("div");
    grid.className = "counter-grid";

    for (let index = 0; index < partA; index += 1) {
      const counter = document.createElement("span");
      counter.className = "counter a";
      grid.append(counter);
    }
    for (let index = 0; index < partB; index += 1) {
      const counter = document.createElement("span");
      counter.className = "counter b";
      grid.append(counter);
    }

    box.append(grid);
    return box;
  }

  function renderAnswerForm(problem) {
    els.answerForm.innerHTML = "";

    for (const field of problem.fields) {
      const row = document.createElement("label");
      row.className = "equation-row";
      row.dataset.fieldId = field.id;

      if (field.before) row.append(document.createTextNode(`${field.before} `));

      const input = document.createElement("input");
      input.type = "number";
      input.inputMode = "numeric";
      input.min = "0";
      input.max = String(problem.rangeMax);
      input.name = field.id;
      input.setAttribute("aria-label", field.label);
      row.append(input);

      if (field.after) row.append(document.createTextNode(` ${field.after}`));
      els.answerForm.append(row);
    }

    const firstInput = els.answerForm.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  function onSubmitAnswer(event) {
    event.preventDefault();
    if (state.problemLocked) {
      nextProblem();
      return;
    }

    const answers = {};
    for (const input of els.answerForm.elements) {
      if (input.name) answers[input.name] = input.value;
    }

    state.attemptNumber += 1;
    const attempt = Core.gradeProblem(state.problem, answers, state.attemptNumber, {
      learnerName: state.settings.learnerName,
      sessionId: state.session.id,
      responseMs: performance.now() - state.problemStartedAt,
      hintsUsed: state.hintsUsed,
    });

    state.session.attempts.push(attempt);
    saveStorage();
    paintFieldResults(attempt.fieldResults);

    if (attempt.isCorrect) {
      state.problemLocked = true;
      els.feedback.textContent =
        state.attemptNumber === 1 ? "Yes. That family matches." : "Yes. Keep that fact together.";
      els.feedback.classList.remove("needs-work");
      els.checkButton.classList.add("hidden");
      els.nextButton.classList.remove("hidden");
      els.hintButton.disabled = true;
      els.skipButton.disabled = true;
      updateProgress();
      renderSummary();
      return;
    }

    els.feedback.textContent = state.hintsUsed > 0
      ? "Try the colored parts one more time."
      : "One part does not match yet.";
    els.feedback.classList.add("needs-work");
    updateProgress();
    renderSummary();
  }

  function paintFieldResults(results) {
    for (const result of results) {
      const input = els.answerForm.querySelector(`[name="${result.id}"]`);
      if (!input) continue;
      input.classList.toggle("field-right", result.isCorrect);
      input.classList.toggle("field-wrong", !result.isCorrect);
    }
  }

  function showHint() {
    state.hintsUsed += 1;
    const family = state.problem.factFamily;
    els.feedback.textContent = `${family.parts[0]} and ${family.parts[1]} are the parts. ${family.whole} is the whole.`;
    els.feedback.classList.remove("needs-work");
  }

  function skipProblem() {
    state.attemptNumber += 1;
    const blankAnswers = Object.fromEntries(state.problem.fields.map((field) => [field.id, ""]));
    const attempt = Core.gradeProblem(state.problem, blankAnswers, state.attemptNumber, {
      learnerName: state.settings.learnerName,
      sessionId: state.session.id,
      responseMs: performance.now() - state.problemStartedAt,
      hintsUsed: state.hintsUsed,
      skipped: true,
    });
    state.session.attempts.push(attempt);
    saveStorage();
    state.problemLocked = true;
    els.feedback.textContent = `The family is ${state.problem.correctFacts.join(", ")}.`;
    els.feedback.classList.add("needs-work");
    els.checkButton.classList.add("hidden");
    els.nextButton.classList.remove("hidden");
    els.hintButton.disabled = true;
    els.skipButton.disabled = true;
    updateProgress();
    renderSummary();
  }

  function finishSession() {
    state.session.endedAt = new Date().toISOString();
    saveStorage();
    els.problemKicker.textContent = "Session done";
    els.problemTitle.textContent = "Nice work";
    els.givenEquation.textContent = "";
    els.answerForm.innerHTML = "";
    els.feedback.textContent = "Start a new session when ready.";
    els.feedback.classList.remove("needs-work");
    els.checkButton.classList.add("hidden");
    els.nextButton.textContent = "Again";
    els.nextButton.classList.remove("hidden");
    els.hintButton.disabled = true;
    els.skipButton.disabled = true;
    renderSummary();
  }

  function updateProgress() {
    const current = state.session ? Core.summarizeAttempts(state.session.attempts) : null;
    const done = state.session ? getCompletedProblems(state.session.attempts).length : 0;
    const firstTry = current ? current.firstTryCorrect : 0;
    const needsPractice = current ? current.needsPractice : 0;
    els.firstTryScore.textContent = `${firstTry}/${done}`;
    els.needsPracticeScore.textContent = String(needsPractice);
    els.questionCount.textContent = `${Math.min(done + 1, state.settings.targetQuestions)}/${state.settings.targetQuestions}`;
  }

  function getCompletedProblems(attempts) {
    const seen = new Map();
    for (const attempt of attempts || []) {
      if (!seen.has(attempt.problemId)) {
        seen.set(attempt.problemId, { correct: false, skipped: false });
      }
      const item = seen.get(attempt.problemId);
      item.correct = item.correct || attempt.isCorrect;
      item.skipped = item.skipped || attempt.skipped;
    }
    return Array.from(seen.values()).filter((item) => item.correct || item.skipped);
  }

  function renderSummary() {
    const dump = Core.createResultDump(state.storage, state.settings);
    const summary = dump.summary;
    const weakFacts = summary.weakestFactFamilies.slice(0, 3).map((item) => item.key).join("; ") || "None yet";
    const weakTypes =
      summary.weakestProblemTypes.slice(0, 2).map((item) => readableType(item.key)).join("; ") || "None yet";

    els.summaryList.innerHTML = "";
    [
      ["Done", `${summary.finishedProblems} (${summary.completedProblems} correct)`],
      ["First try", `${Math.round(summary.firstTryAccuracy * 100)}%`],
      ["Facts", weakFacts],
      ["Types", weakTypes],
    ].forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "summary-item";
      row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      els.summaryList.append(row);
    });
  }

  function readableType(type) {
    return {
      relatedSubtractions: "addition to subtraction",
      relatedAddition: "subtraction to addition",
      visualModel: "visual model",
      missingPart: "missing part",
    }[type] || type;
  }

  function saveSettingsFromForm() {
    const base = Core.normalizeSettings({
      learnerName: els.learnerName.value,
      rangeMax: Number(els.rangeMax.value),
      targetQuestions: Number(els.targetQuestions.value),
      adaptive: els.adaptiveToggle.checked,
    });
    state.storage.settings = base;
    state.settings = Core.normalizeSettings(Object.assign({}, base, state.storage.activeCoachPlan || {}));
    saveStorage();
    renderPlanStatus();
  }

  function downloadJson() {
    const dump = Core.createResultDump(state.storage, state.settings);
    downloadFile("math-connections-results.json", JSON.stringify(dump, null, 2), "application/json");
  }

  function downloadCsv() {
    const csv = Core.attemptsToCsv(allAttempts());
    downloadFile("math-connections-attempts.csv", csv, "text/csv");
  }

  async function copyAiPrompt() {
    const dump = Core.createResultDump(state.storage, state.settings);
    const prompt = Core.buildAiPrompt(dump);
    try {
      await navigator.clipboard.writeText(prompt);
      els.copyAiPrompt.textContent = "Copied";
    } catch (error) {
      els.coachPlanInput.value = prompt;
      els.planStatus.textContent = "Prompt placed in the text box.";
      els.copyAiPrompt.textContent = "Ready";
    }
    setTimeout(() => {
      els.copyAiPrompt.textContent = "AI prompt";
    }, 1400);
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function clearData() {
    if (!confirm("Clear saved practice results on this browser?")) return;
    localStorage.removeItem(STORAGE_KEY);
    state.storage = loadStorage();
    hydrateSettings();
    startSession();
  }

  function applyCoachPlan() {
    try {
      const plan = Core.parseCoachPlan(els.coachPlanInput.value);
      state.storage.activeCoachPlan = plan;
      state.settings = Core.normalizeSettings(Object.assign({}, state.storage.settings || {}, plan));
      saveStorage();
      hydrateSettings();
      startSession();
      els.planStatus.textContent = plan.planName ? `Using ${plan.planName}.` : "Coach plan active.";
    } catch (error) {
      els.planStatus.textContent = error && error.message ? error.message : "Plan JSON was not applied.";
    }
  }

  function clearCoachPlan() {
    state.storage.activeCoachPlan = null;
    saveStorage();
    hydrateSettings();
    startSession();
  }

  function renderPlanStatus() {
    const plan = state.storage.activeCoachPlan;
    if (!plan) {
      els.planStatus.textContent = "No imported plan.";
      return;
    }
    els.planStatus.textContent = plan.planName ? `Using ${plan.planName}.` : "Coach plan active.";
  }

  function allAttempts() {
    return state.storage.sessions.flatMap((session) => session.attempts || []);
  }

  function loadStorage() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && Array.isArray(parsed.sessions)) {
        return parsed;
      }
    } catch (error) {
      // Ignore corrupted browser storage and start fresh.
    }
    return {
      createdAt: new Date().toISOString(),
      settings: Core.normalizeSettings({}),
      activeCoachPlan: null,
      sessions: [],
    };
  }

  function saveStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.storage));
  }
})();
