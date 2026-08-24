# Grading V2 — Reference / Legacy / V2 Comparison

**Review date:** 2026-08-24  
**Verdict:** **PASS — Legacy Similarity Hard Fail not triggered**

## Evidence under review

- Primary reference: `docs/teacher-v2/references/grading/reference-gradescope-01.png`
- Rejected baseline: `docs/teacher-v2/references/grading/legacy-grading.png`
- V2 browser evidence: `v2-ready-1366x768.png`, `v2-ready-1440x900.png`, `v2-review-refresh.png`, `v2-file-error.png`
- Region contract: `docs/teacher-v2/references/grading/REFERENCE_SCREEN_MAP.md`

| Region | Reference product pattern | Legacy baseline | V2 result | Verdict |
|---|---|---|---|---|
| A | Assignment/question context stays attached to grading. | Page title only; durable question context is absent. | Server Workspace shows class, assignment, question, progress, and a queue filter in one header. | pass |
| B | Original student work is the primary center surface. | Generic answer card below a top student selector. | Original senior-high-math derivative solution stays central; scoped source-file failure remains visible with retry and no fake preview. | pass |
| C | Visible rubric/evidence beside work. | Detached final-score form with no persistent point rubric. | Actual 10-point, 3/3/4 rubric, standard answer, evidence, teacher decision, feedback and score field share the right panel. | pass |
| D | Submission queue plus next-ungraded navigation. | Top real-name student `<select>`. | Desktop anonymous queue, explicit automatic versus manual-review state, server-derived next selection, and deep-linkable `submission_item_id`. | pass |
| E | Persistent continuous action rail. | Score form submit is separated from continuation. | Viewport-bound bottom rail exposes Previous, manual review (M), and versioned Confirm and next (Enter). | pass |

## Hard-fail decision

The V2 screenshots do **not** retain the rejected `top student select + generic answer panel + detached side score form` skeleton. They show a three-column question-focused workstation with an anonymous queue, central source work, adjacent score-point rubric/evidence, and a continuous bottom action rail. No Legacy component was edited or used as a visual base.

This is an adaptation of the documented product pattern only. No Gradescope branding, imagery, copy, colour asset, or page layout has been copied.

## Browser proof

`PW_PORT=5194 npx playwright test e2e/teacher-grading-v2.spec.ts --project=chromium --workers=1` completed with **3 passed**:

1. Question-focused derivative-solution workstation at `/teacher/grading?submission_item_id=si-2`.
2. Manual review of an initially ungraded submission survives refresh; explicit teacher override advances through the server-provided next item.
3. A scoped source-file retrieval failure shows retry/manual-review guidance and no fabricated image preview.

The updated M3 grading journey separately passed. The unrelated existing `/teacher/today` browser journey fails before it reaches grading (missing “今日工作台”) and is intentionally not treated as a V2 success.

## Corrective visual check — mathematical notation and anonymity

The original-work surface renders inline TeX through the repository's existing sanitized `LatexText` component, rather than presenting source such as `\\pm` or `\\infty` in a plain-text block. The focused component test covers both delimited and bare high-school-math TeX across the header, original work, standard answer, and evidence. The fresh 1366×768 browser screenshot uses bare `\\pm`, `\\infty`, and `\\cup` source and visibly displays `±`, `∞`, and `∪` instead. Queue labels are supplied by the server as `匿名作答 #001` so the number is clearly an anonymous blind-grading identifier, not a student name or an unexplained assignment number.
