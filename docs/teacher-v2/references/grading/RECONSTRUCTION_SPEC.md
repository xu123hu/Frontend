# Grading V2 — Reconstruction Specification

**Status:** V2 hard-similarity and focused-browser gates passed on `codex/teacher-v2-grading-frontend` (2026-08-24); deployment migration still requires an available PostgreSQL instance.
**Primary reference:** Gradescope instructor grading workflow
**Secondary reference:** verified WebWork manual-grader source trace
**Official route takeover:** `/teacher/grading` replaces the Legacy component only after the acceptance gate passes.

## User job

As a senior-high-school mathematics teacher, I grade one question across a class without repeatedly locating the question, rereading the scoring standard, or losing my place. I can see the original solution, why a score is suggested, make the final judgment, and immediately continue. The formal score and any mastery update occur only after my explicit decision.

## Business objects and contract

```text
GradingWorkspace
  assignment + class + selectedQuestion + filters + queue[] + selectedSubmissionItem
SubmissionItem
  originalWork + file/pages + question + standardAnswer + rubric + suggestion + reviewState
GradeDecision
  suggestionId + version + accept|override + finalScore? + feedback? + idempotencyKey
```

The frontend must use the single typed `GradingWorkspace` API/service adapter specified in [`BACKEND_TO_V2_MAPPING.md`](./BACKEND_TO_V2_MAPPING.md). Components may display state and request actions, but they may not calculate a final grade, hard-code student answers, compose a second data model from endpoint fragments, or write official grade/mastery values.

## Layout and behavior

1. The header binds the selected class, assignment, current question, `n / total` progress, and filter state.
2. The left queue is visible at desktop size and contains anonymous labels by default, grading status, review marker, and current selection. It supports filtering/selection without reloading the workstation.
3. The center viewer shows question context and original student work. It uses text, image, or file views according to the returned content, with safe zoom/rotate/page navigation for image-like submissions.
4. The right panel first explains scoring: full mark, standard answer/analysis, rubric or scoring points, and suggestion evidence. It then exposes teacher feedback and a clearly labeled final score decision.
5. The bottom action bar contains Previous, Mark for review, and Confirm and next. `Enter` confirms only when focus is not in an editable input; keyboard mappings have visible equivalents. Mark-for-review persists separately from automatic/OCR review and does not write a formal score.
6. A neutral integrity signal is supplementary evidence only: it may say “建议人工复核” with a reason but never labels a student as cheating or applies a score.

## State and error handling

| State | V2 behavior |
|---|---|
| loading | skeletal workstation regions; no stale decision controls |
| empty | explain why no submissions require grading and offer a real assignment-publishing path |
| ready | selected item is deep-linkable and queue/context agree |
| manual review | no automatic accept action without trusted evidence; teacher can score explicitly |
| confirming | controls lock only for the affected decision; response is awaited and verified |
| version conflict | keep unsaved feedback, reload current evidence, explain that the score changed elsewhere |
| file failure | retain item and show a retry/manual-review route; never fabricate a preview |
| permission error | remove inaccessible work and explain scope safely |

## Teacher-confirmed flow

```text
Open assignment/question
  → select next ungraded item
  → review original work and scoring evidence
  → accept suggestion OR override with teacher feedback
  → versioned/idempotent confirmation succeeds
  → persisted final score; only then update mastery
  → select next ungraded item and update the URL
```

## Acceptance gate

- Reference evidence in the sibling file remains valid and its source/license claims are checked again before implementation.
- Component, service, API and backend field names agree; teacher/class scope is enforced by the server.
- Tests cover all six high-school-mathematics cases in the evidence file, including conflict, refresh and untrusted context.
- Browser checks cover click, queue/filter, text/image work view, feedback input, accept, override, review, keyboard, cancel/retry, refresh and direct URL at 1366×768 and 1440×900.
- The test proves a persisted teacher confirmation and downstream effect; a text response or visual toast is insufficient.
- Reference/Legacy/V2 screenshots demonstrate that the final workspace no longer resembles the Legacy select-plus-form composition.
- The initial V2 screenshot is checked against [`REFERENCE_SCREEN_MAP.md`](./REFERENCE_SCREEN_MAP.md). A recognisable top-select + generic-answer-panel + detached-side-score-form composition is a **hard fail**: delete the V2 page and reconstruct from this specification; do not apply a CSS/card/drawer patch and do not change Legacy.
- Until this gate passes, the V2 shell is limited to the grading workstation. No full Teacher OS shell, global V2 navigation, design-system buildout or speculative cross-module component layer is in scope.

## V2 evidence record — 2026-08-24

- Browser evidence: `artifacts/teacher-v2/grading/v2-ready-1366x768.png`, `v2-ready-1440x900.png`, `v2-review-refresh.png`, and `v2-file-error.png`.
- V2 browser command: `PW_PORT=5194 npx playwright test e2e/teacher-grading-v2.spec.ts --project=chromium --workers=1` — **3 passed**.
- Full teacher contracts: frontend `test/teacher` — **67 passed**; backend Workspace/review, grading, and assignment-materialization regression — **43 passed**.
- The route loader for `/teacher/grading` now resolves only `TeacherGradingV2View.vue`; `TeacherGradingView.vue`, the Legacy grading API wrapper, and the Legacy store have no modifications in this branch.
- The full `e2e/m3-teacher.spec.ts` suite has a separately reproduced, non-Grading failure at `/teacher/today` (missing “今日工作台”); the updated grading journey itself passes. This is not used to claim a clean whole-teacher-suite result.
- The visual hard-gate verdict and region-by-region comparison are recorded in [`COMPARISON.md`](../../../../artifacts/teacher-v2/grading/COMPARISON.md).
- The original-work surface renders senior-high-math TeX through the existing sanitized math renderer; it does not expose raw commands such as `\\pm` or `\\infty`, including when a source omits `$...$` delimiters. The Workspace API supplies `匿名作答 #001`-style labels to make the blind-grading purpose explicit. A reviewed source rubric is materialized from `QuestionBank.annotate_meta` without invention, and teacher overrides above the persisted `max_score` are rejected before formal score/mastery writes.
