# Teacher OS V2 Blueprint

**Status:** approved architecture; no UI implementation has started
**Scope:** ordinary Chinese senior-high-school mathematics teaching only
**Route policy:** an accepted V2 module immediately replaces its matching `/teacher/*` route; the Legacy page remains code-only rollback material.

## 1. Decision and evidence hierarchy

This blueprint is a reconstruction contract, not an incremental-refactor checklist.

1. The product owner's current V2 instruction wins: replace Legacy page models rather than improve them.
2. The M3 v2.1 requirement analysis is business, domain, and acceptance evidence. It cannot preserve a Legacy layout or override this blueprint.
3. Existing APIs, authorization, Artifact lifecycle, mathematical rendering, idempotency, and audit behavior are reusable only after trace verification.
4. No module may use a GitHub project as a reference until its evidence pack records a real clone, license, source trace, and mapping. A candidate is not evidence.

## 2. Teacher job and product boundary

The product is an AI teaching steward that understands the current class, lesson, assignment, and student evidence. It is not a chat-first AI toolkit or a research platform.

The supported teaching loop is:

```text
student work / video / question
  → class evidence and actionable insight
  → teacher revises the next lesson
  → lesson artifacts (PPT, practice, board outline)
  → publish assignment or classroom activity
  → submissions
  → assisted grading + teacher confirmation
  → class analytics / intervention result
  → next lesson
```

Teacher V2 excludes modelling coaching, paper review, research fact checking, model training, and algorithm-calibration screens. These are research/platform concerns, not teacher routes or teacher capabilities.

## 3. Core business objects and non-negotiable state

| Object | Owns | Required state/guard |
|---|---|---|
| `Course`, `Class`, `StudentGroup` | stable teaching context | teacher membership is checked server-side |
| `Lesson`, `LessonSegment` | a teachable class period and its timeline | draft → confirmed → published → archived; confirmed changes version |
| `TeachingArtifact` | lesson plan, slide deck, quiz, board outline, explanation, grading suggestion | draft artifact is editable; publication is teacher-confirmed and auditable |
| `Assessment`, `Question`, `Assignment` | blueprint, source/verification data, and distribution | scope/difficulty are measured from items; unpublished work is not visible to students |
| `Submission`, `SubmissionItem`, `Rubric`, `Grade` | original student work and final decision | AI advice never writes final score or mastery; teacher confirmation is versioned and idempotent |
| `ActionableInsight`, `Intervention` | evidence → recommended action → outcome | contains time window, sample size, evidence and direct teaching action |
| `ClassroomSession` | live teaching state and post-class review | lesson/class context is explicit; writes back only through confirmation gates |
| `Resource`, `AgentRun` | reusable source material and explainable assistance | resource processing is a real state machine; risky agent writes become draft artifacts |

Every teacher-visible screen has `loading`, `empty`, `partial`, `error`, and permission states. AI capabilities additionally have `idle`, `configuring`, `queued`, `running`, `preview`, `needs_confirmation`, `completed`, `failed`, `cancelled`, and `retry`. No `setTimeout` completion, fake toast, raw workflow ID, confidence percentage, or debug string is acceptable.

## 4. V2 information architecture and route migration

| V2 domain | Official route after acceptance | Product job | Legacy policy |
|---|---|---|---|
| Today | `/teacher/today` | decide the next best teaching action | replace dashboard cards and raw counters |
| Lesson and artifacts | `/teacher/prep` | adapt an existing lesson into a teachable class period | replace form CRUD; retain lesson Artifact API |
| Assessment | `/teacher/assign` | compose, preview, publish and follow an assessment | replace scenario-card builder; retain question/assignment services |
| Grading workstation | `/teacher/grading` | grade one question across submissions continuously | replace the select + answer + side-form layout |
| Classroom | `/teacher/classroom` | run a live lesson, quick check and review | replace tool collection; retain student-mode synchronization |
| Classes and analytics | `/teacher/classes` | notice changes, inspect evidence and intervene | replace dashboard-first analysis; retain authorized aggregation |
| Resources | `/teacher/resources` | reuse a material in the next lesson or assessment | replace file-browser model; retain upload/processing services |
| Teaching steward | global contextual layer | initiate/explain business actions in current context | replace isolated chat UI; never become a primary route |

V2 route replacement is gated per module. A route changes only when all of the following are true: its evidence pack is complete, reference and contract tests pass, the browser journey passes at 1366×768 and 1440×900, the capability produces/persists the intended artifact, and a Reference vs Legacy vs V2 comparison is recorded. A failed module route stays on Legacy and is fixed in the V2 implementation, not patched in Legacy.

## 5. Requirement analysis mapped to V2 modules

| Requirement cluster | V2 reconstruction decision | Required result |
|---|---|---|
| F0 Today | action center, not KPI dashboard | next lesson, ranked tasks, 1–3 evidence-backed insights, next action in at most two clicks |
| F1/F2 lesson and PPT | a lesson object has a structured timeline and child artifacts | adapt existing PPT/Word/materials; local suggestion diffs; page preview/lock/export; real downloadable PPTX or explicit basic-template mode |
| F3 assessment | task-type-first builder with a blueprint secondary surface | source/verification per question, question replacement isolation, preview, publish confirmation, student delivery |
| F4/F5 grading and integrity | continuous question-focused workstation; neutral review signals inside evidence | assignment/question context, queue, original work, rubric/evidence, teacher final decision, audit and next item |
| F6/F8 classes | recent changes first; detailed mastery as secondary drill-down | evidence-backed trend and action, class membership/server-side `class_id` authorization, no fabricated risk list |
| F7/F9 classroom/video | one live control surface and review loop | student mode sync, response distribution, replay hotspot → action, post-class outcome |
| F10/F11 intervention/explainer | a completion of grading or classroom work, not a separate menu | recommended three discussable items, variant/practice/board/explanation artifacts, later effectiveness comparison |
| F13 | invisible event support with concise teacher explanation | confirmed teaching action can be compared with later similar-work outcome |

## 6. Reference map and evidence gate

Each implementation unit selects one primary reference and, only when necessary, one secondary reference. The table lists candidates, not completed evidence, except where noted.

| Module | Primary product/workflow reference | GitHub source required before code | Reuse classification |
|---|---|---|---|
| Grading | Gradescope grading workflow | `openwebwork/webwork2` (**cloned and traced**) | Gradescope workflow only; WebWork dual GPL-2.0/Artistic source is concept-only |
| Assessment | WebWork SetMaker / PG parameterized problems | `openwebwork/webwork2`, `openwebwork/pg`, `mindskip/xzs` | clone/license/trace required; map objects, never copy legacy visuals |
| Lesson/PPT | structured material adaptation | `ueberdosis/tiptap`, `arnog/mathlive`, `gitbrent/PptxGenJS` | verify exact license/version; use only compatible components/contracts |
| Today/steward | task prioritization and human-in-the-loop actions | `moodle/moodle`, `langchain-ai/langgraph` | workflow and state concepts only until verified |
| Classroom/video | live activity and interactive learning artifact | `bigbluebutton/bigbluebutton`, `h5p/h5p-editor-php-library` | source trace required; no GPL code copy by default |
| Classes/analytics | grade/learning evidence drill-down | `moodle/moodle`, an evidence-backed analytics component candidate | trace before declaring a reference |
| Resources/document understanding | reusable content and cited extraction | `infiniflow/ragflow`, `h5p/h5p-editor-php-library` | only verified adapter/object patterns |
| Mathematical verification/explainer | deterministic mathematics and rendering | `sympy/sympy`, `KaTeX/KaTeX`, `ManimCommunity/manim`, `jsxgraph/jsxgraph` | use licenses and capability boundaries verified per integration |

Every module receives `docs/teacher-v2/references/<module>/REFERENCE_EVIDENCE.md` and `RECONSTRUCTION_SPEC.md`. They must include clone path and commit, license, route/page/component/state/service/data trace, screen regions, state transitions, direct inheritance, deliberate adaptations, discarded Legacy patterns, source limits, and acceptance tests.

## 7. Real senior-high-mathematics input test corpus

V2 must be tested against real source material rather than invented one-paragraph lessons. The initial corpus is **transient test input only**; it may not be checked into the repository unless rights and license are verified.

| Input | Verified source use | Assertions |
|---|---|---|
| high-school PPT/DOCX | [Ministry-level monotonicity excellent lesson](https://math.sqnu.edu.cn/info/2128/7074.htm) | PPT/DOCX ingestion retains title, lesson structure, formulas/media provenance; teacher can map it to a lesson and edit it |
| four-period lesson design | [Function monotonicity teaching design](https://zy.21cnjy.com/24644694) | parser/editor preserves objectives, context question, exploration, examples, practice, summary, and source attribution |
| unit-design PDF | [Function-properties unit design](https://statics.scnu.edu.cn/pics/maths/2021/0218/1613615129109322.pdf) | lesson model records textbook/version, prior knowledge, objectives, diagnosis, and technology support instead of flattening it into a prompt |
| assessment blueprint and student work | authorized local structured question-bank records plus student-submission fixtures | knowledge-point/difficulty/score constraints, answer verification, source trace, grade confirmation, and mastery update are exercised |

The representative topic is senior-high-school function monotonicity and extrema. It requires graph-to-symbol transition, definition proof, parameters/boundaries including `a = 0`, and a teacher-confirmed open-response rubric. This is a domain baseline, not a single hard-coded lesson.

## 8. End-to-end acceptance loop

1. A teacher sees an evidence-backed misconception in Today.
2. The teacher opens the current class and lesson, applies only a reviewed 4-minute boundary-example change, and confirms a new lesson version.
3. The teacher generates/reviews a lesson PPT or deterministic basic template and an assessed three-question practice.
4. The teacher publishes after explicit confirmation; students submit.
5. The grading workstation supplies evidence only; the teacher confirms or overrides each final score.
6. The system updates learning evidence from confirmed scores only, surfaces the effect of the intervention, and offers the next lesson action.

The loop fails if it relies on a mock success toast, unverified/generated mathematics, an unconfirmed formal write, a dead control, missing artifact, or a route that cannot be refreshed/deep-linked.

## 9. V2 delivery sequence

1. V2 shell, route guards, context switcher and shared task-state primitives.
2. Grading workstation — first end-to-end proof that Reference-Driven Reconstruction works.
3. Assessment builder — required to create real input for grading.
4. Lesson workspace and child artifacts — required to consume insights and produce PPT/practice.
5. Today action center — directs real work into completed modules.
6. Classes/analytics and intervention loop.
7. Classroom/video and post-class review.
8. Resources and teaching-steward cross-page integration.

Each phase includes its own source evidence, reference comparison, contract tests, browser journey, screenshots, and formal route takeover. No phase is marked complete merely because it renders.
