# Grading V2 — Reference Evidence

**Status:** implementation evidence complete for the reference; reconstruction not yet coded
**Module route:** `/teacher/grading`
**Primary workflow:** Gradescope question-focused grading
**Secondary source trace:** WeBWorK manual grader

## 1. Why this is the primary model

The Legacy page chooses a student from a top `<select>`, shows a large answer area, then shows a right-side score form. It makes switching, evidence, score reasoning, and forward progress separate actions. That is explicitly rejected.

Gradescope documents a grading surface with three core regions — submission, rubric, and bottom action bar — and a `Next Ungraded` action that avoids simultaneous work on the same submission. It also documents question-specific rubrics and keyboard navigation. See [grading with rubrics](https://guides.gradescope.com/hc/en-us/articles/22249389005709-Grading-submissions-with-rubrics) and [submission navigation](https://guides.gradescope.com/hc/en-us/articles/37290703633677-Submission-navigation-and-keyboard-shortcuts).

The GradeScope product is closed source. Its public instructor documentation is workflow/screen evidence only; no logo, brand asset, source, or code is reused.

## 2. Open-source secondary reference: verified trace

| Evidence | Verified value |
|---|---|
| Repository | `https://github.com/openwebwork/webwork2.git` |
| Local clone | `D:\frontend\research-repos\webwork2` |
| Commit | `69664deb143244d3397d26c37033e339e4fd2267` |
| License | dual GPL-2.0-or-later or Artistic License 1.0 (`LICENSE`) |
| Reuse classification | C: workflow/data-model study only; no source-code copying |
| Product scope | open-source online homework/course-management front end for mathematics and sciences |

### Route → page → view → service/data trace

| Trace layer | Source evidence | What is learned |
|---|---|---|
| Route | `lib/WeBWorK/Utils/Routes.pm` — `instructor_problem_grader` at `/grader/#setID/<problemID:num>` | a grader is contextualized by a problem inside a set, not an isolated input form |
| Page/controller | `lib/WeBWorK/ContentGenerator/Instructor/ProblemGrader.pm` | checks instructor permission, resolves set/problem/users, loads student problem and past answer, persists only explicit grading changes |
| Page template | `templates/ContentGenerator/Instructor/ProblemGrader.html.ep` | manual grader has explicit grading controls and student/problem context |
| Client behavior | `htdocs/js/ProblemGrader/problemgrader.js`, `singleproblemgrader.js` | grading interaction is a dedicated client surface |
| Related composition | `lib/WeBWorK/HTML/SingleProblemGrader.pm` and `templates/HTML/SingleProblemGrader/grader.html.ep` | score/comment control is tied to rendered mathematical work |
| Data model | `lib/WeBWorK/DB/Record/UserProblem.pm`, user-problem/past-answer reads in `ProblemGrader.pm` | original attempt, current score and instructor comment remain separately attributable |

The same clone confirms the assessment-builder companion trace: `/instructor/setmaker` → `Instructor::SetMaker` → `templates/ContentGenerator/Instructor/SetMaker*.html.ep` → `htdocs/js/SetMaker/setmaker.js`. It is evidence for explicit candidate selection and set membership, not a UI to copy.

## 3. Evidence-derived screen model

```text
Assignment / class / question / progress / filters
┌────────────────┬─────────────────────────────────┬─────────────────────────────┐
│ Submission     │ Student original work            │ Question + rubric           │
│ queue           │ text, scan or handwritten image │ scoring evidence             │
│ anonymous label │ zoom / rotate / page navigation │ AI suggestion (review only)  │
│ status / review │ annotations (when supported)    │ teacher score + feedback     │
├────────────────┴─────────────────────────────────┴─────────────────────────────┤
│ Previous · Mark for review · Save draft · Confirm and next                      │
└────────────────────────────────────────────────────────────────────────────────┘
```

| Region | Object/state | Required interaction |
|---|---|---|
| Header | assignment, class, question, queue progress, filters | switch question/filter while retaining a deep-linkable selected submission |
| Queue | `SubmissionItem`, `ungraded/review/confirmed` | select, filter, skip, view current item; no top-level select-only navigation |
| Work viewer | original text/file/page, privacy label | render original work; image zoom/rotate/page navigation where the file supports it |
| Rubric/evidence | standard answer, scoring standard, item evidence, suggestion version | show why; rubric selection or manual score must remain distinguishable from AI advice |
| Teacher decision | final score, feedback, suggestion version | accept or override; write a versioned, idempotent final decision only after teacher action |
| Action bar | previous, mark-review, save/confirm-next | always exposes the next work-saving action; keyboard never hijacks text-entry fields |

## 4. Mapping to current verified contracts

The existing teacher backend already exposes an authorized queue, detail, suggestion, confirmation, batch confirmation and raw-file path:

```text
GET  /teacher/grading/queue
GET  /teacher/grading/{submission_item_id}
POST /teacher/grading/{submission_item_id}/suggest
POST /teacher/grading/{submission_item_id}/confirm
POST /teacher/grading/batch-confirm
GET  /teacher/grading/{submission_item_id}/file
```

`GradingDetail` includes original answer/file, assignment title, question text/type/options, standard answer, analysis, score suggestion and version. The domain confirmation path checks teacher/class scope, decision, suggestion version and idempotency before writing a formal score and updating mastery. These are retained.

V2 must add a semantic workspace adapter only where the existing queue cannot provide assignment/question grouping, stable review state, rubric-point reasoning, or a user-safe next-ungraded lock. It may not bypass the confirmation route or write formal grades directly from the UI.

## 5. Required high-school-mathematics tests

1. Multiple-choice monotonicity question: show options, standard answer and deterministic evidence; accept is only available with persisted trusted context.
2. Open response about `f(x)=x^3-3x`: show original derivation, score-point explanations and allow an evidence-backed manual override; no automatic formal grade.
3. The `a=0` boundary case: a missing classification is presented as a rubric/evidence gap, not a confidence percentage; teacher feedback is persisted.
4. Handwritten/photo submission: raw file is loaded inside teacher scope; unreadable or unsupported content moves to manual review without guessed correctness.
5. Refresh/direct URL returns to the same queue item; confirm advances to a non-confirmed item; an interrupted/version-conflicted confirmation is recoverable.
6. Only confirmed final scores update the downstream mastery/insight fixture.

## 6. Rejected Legacy patterns

- top-level student `<select>` as the main queue;
- giant generic answer panel with no assignment/question progress context;
- a side score form that hides scoring evidence and next action;
- any `confidence` percentage, `type=rule`, raw workflow, or fake completion message;
- score/mastery writes that do not require the teacher-confirmed versioned endpoint.
