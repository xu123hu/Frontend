# Grading V2 — Backend-to-Workspace Mapping

**Gate:** PRE-CODE GATE — complete
**Rule:** `GradingWorkspace` is the only V2 screen model. Vue components do not compose a second business model from endpoint fragments, infer official scores, or invent scoring data. The server remains the authority for teacher/class scope, suggestions, final confirmation, idempotency, audit and mastery update.

## Target server projection

```text
GET /teacher/grading/workspace
  ?class_id=&assignment_id=&item_no=&status=&submission_item_id=
→ GradingWorkspace
  context { class, assignment, question, filters, progress }
  queue[] { submissionItemId, anonymousLabel, state, manualReview, selected }
  selected { work, file, question, scoring, suggestion, confirmedDecision }
  navigation { previousId, nextUngradedId }
  availableContext { assignments[], questions[] }

POST /teacher/grading/{submission_item_id}/review
→ persisted manual review action (not a formal score)
```

The endpoint is an additive V2 read projection, not a replacement for the existing raw endpoints. It performs one authorized server-side join across `Assignment → Submission → SubmissionItem → QuizItem` and returns a typed, display-safe view; it must not leak student names or bypass `confirm_grade`.

## Current API → V2 object/component/state

| Existing API | Existing field | V2 field / owner | Transform | Missing? | Backend change required? | Frontend adapter? |
|---|---|---|---|---|---|---|
| `GET /teacher/grading/queue` | `submission_item_id` | `SubmissionQueueEntry.submissionItemId` | direct UUID string | no | no; retained as legacy/compatibility source | yes, only inside `gradingWorkspaceAdapter` while the V2 projection is introduced |
| same | `student_label` | `anonymousLabel` | direct; never replace with a real student name | no | no | yes |
| same | `status: unprocessed\|low_confidence\|confirmed` | `state: ungraded\|review\|confirmed` | map `low_confidence` to automatic-review evidence; preserve confirmed | **yes**: manual “稍后复看” cannot be represented separately | **yes**: workspace joins latest audited manual-review action; do not overload/reset `needs_review` | yes |
| same | `confidence` | none | intentionally omitted from teacher UI; it is not a score criterion | no | no | adapter discards it except where backend converts it to a human-readable evidence reason |
| same | `suggestion_score`, `teacher_final_score` | `suggestion.proposedScore`, `confirmedDecision.finalScore` | display only; neither value is a UI-calculated official score | no | no | yes |
| `GET /teacher/grading/{id}` | `original_answer`, `file_id` | `WorkViewer.text`, `SubmissionViewer.file` | direct, with server-authorized file loader | no | no | yes |
| same | `assignment_title`, `question_text`, `question_type`, `options` | `WorkspaceContext.assignment/question` and `WorkViewer.question` | direct typed projection | **yes**: queue cannot select/filter/group by this context without N+1 detail calls | **yes**: the Workspace endpoint returns context plus available assignment/question choices | yes |
| same | `standard_answer`, `answer_analysis`, `scoring_standard` | `RubricEvidencePanel.standardAnswer`, `.analysis`, `.fallbackStandard` | direct; fallback is labelled as incomplete, never expanded into made-up rubric items | **yes**: actual full mark and point rubric are absent from current model | **yes**: additive `QuizItem.max_score` and `grading_rubric` schema; old rows return `rubricStatus: missing` and require manual review | yes |
| same | `suggestion.{suggestion_id,version,suggestion_score,evidence,review_needed}` | `AISuggestion` / `TeacherDecision` binding | direct versioned projection; show evidence, not confidence | **yes**: current rationale is not consistently score-point structured | no schema break required: normalize existing rationale to `evidence[]`; future generators emit structured entries | yes |
| `POST /teacher/grading/{id}/suggest` | `class_id`, `client_request_id` → suggestion | `AISuggestion.refresh` | explicit request/refresh only; route is never allowed to write a formal grade | no | no | yes; action refetches Workspace selection on success |
| `POST /teacher/grading/{id}/confirm` | `suggestion_id`, `decision`, `final_score`, `teacher_feedback`, `version`, idempotency key | `TeacherDecision` → `ConfirmAndNext` | direct request; the only action that can persist official score/mastery | no | no; preserve existing scope, optimistic-version, idempotency and `TeacherAction` audit | yes; adapter owns idempotency key and then refetches Workspace/next candidate |
| `POST /teacher/grading/batch-confirm` | `items[]` | future trusted-objective bulk action | unavailable in first reference reconstruction; it must not become a shortcut around individual evidence/review | no | no | none in initial V2 page |
| `GET /teacher/grading/{id}/file` | authorized content bytes + MIME | `SubmissionViewer` | generate/revoke object URL only after successful scoped response | no | no | yes |
| **new** `GET /teacher/grading/workspace` | joined assignment/question/queue/selection/navigation/review state | `GradingWorkspace` store and all five screen regions | server-side typed projection; one screen model | yes | **yes**: additive router/schema/domain serializer and contract tests | minimal unwrapping only; no component-level joins |
| **new** `POST /teacher/grading/{id}/review` | `state`, optional teacher note, idempotency key | `TeacherReviewAction` | writes an audited manual-review state and advances only after response | yes | **yes**: store `TeacherAction(action_type='grading.review.set')`; workspace reads latest state per item. This leaves automatic `needs_review` semantics intact. | yes |

## Data ownership and prohibitions

| V2 object | Authoritative data | Explicit prohibition |
|---|---|---|
| `SubmissionQueue` | Workspace `queue` | no client-side grouping based on labels, confidence or array position |
| `WorkViewer` / `SubmissionViewer` | Workspace `selected.work` and scoped file endpoint | no fixture answer in a production component; no raw unscoped file URL |
| `RubricEvidencePanel` | Workspace `selected.scoring` and `selected.suggestion.evidence` | no inferred max score, rubric criterion or mathematical verdict |
| `TeacherDecision` | existing confirmation request/response | no direct write to `SubmissionItem.score`, mastery or toast-only success |
| `ConfirmAndNext` | server `navigation.nextUngradedId` after a confirmed response | no “next item” chosen by a stale local array |
| `TeacherReviewAction` | new review endpoint + audit record | do not repurpose `needs_review`, which represents automated/OCR/trust review and is cleared by confirmation |

## Required V2 contract tests

1. Workspace selection and next-ungraded navigation are server-derived for a single assignment/question across high-school math submissions.
2. A missing rubric/full-mark field returns an explicit `rubricStatus: missing`; the UI does not invent points and requires an explicit teacher decision.
3. Marking for review survives refresh/deep link, remains distinct from automatic review, and writes a scoped/idempotent audit event.
4. Confirm uses the existing version/idempotency path; only a successful response changes final score/mastery and returns the next candidate.
5. The mock implements the same Workspace and review contracts from one deterministic senior-high-mathematics fixture.
