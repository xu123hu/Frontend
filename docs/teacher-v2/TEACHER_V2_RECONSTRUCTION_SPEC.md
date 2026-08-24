# Teacher V2 Reconstruction Contract

**Status:** Approved for implementation on 2026-08-24
**Scope:** Replace the legacy teacher experience. Student routes remain in the existing application.

## Outcome

Teacher V2 is a separate Next/React application that takes over every formal `/teacher/*` route. The first screen, `/teacher/today`, contains an always-visible AI teaching copilot workspace. The copilot and every manual teacher action invoke the same bounded tool runtime and produce the same business objects.

## Non-negotiable constraints

- Do not continue development in legacy Vue teacher page files or preserve their layout as a V2 base.
- Every V2 capability must identify one or more cloned GitHub sources, fixed commits, licenses, source paths, and exact adopted responsibility before coding.
- Reuse source code only under compatible terms and preserve notices. AGPL/GPL projects may establish workflow and acceptance patterns but their code is never copied into this application.
- Do not introduce an independent mathematics-validation feature. Only include validation behavior when an adopted reference implementation supplies that behavior; teacher confirmation remains the release gate.
- No network-scraped or research-only question content may be published to students. Imported questions require an uploader-supplied source statement and teacher review before entering the publishable bank.
- A confirmation is required before publishing an assignment, changing formal grades, publishing a resource, or changing classroom/student-facing state.
- The legacy implementation is deleted only after its replacement has passed API, student-linkage, browser, screenshot, and reference-comparison acceptance.

## Reference ledger

| Responsibility | Source and fixed clone | License | Reuse boundary |
|---|---|---|---|
| Copilot runtime, plugin tree, scoped tools, session events, pre-execution approval | `deepseek-ai/deepseek-harness` at `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` | MIT | Direct runtime/package integration and attributed adapted tool plugins. Never expose coding-shell or file-system tools to teachers. |
| Today dashboard, class progress aggregation | `freeCodeCamp/classroom` at `182e8b43b8c196381b6f68f2bdcc10618207c24a` | BSD-3-Clause | Adapt dashboard and detail-view code with notices. Replace coding-course vocabulary with class, assignment, lesson and evidence objects. |
| Lesson material ingestion, lesson package artifacts, teacher approval policy | `epaproditus/claw-ed` at `e76e9db6ea8df9891148c61d4494de7d382f61d7` | MIT | Integrate/adapt ingestion, artifact and approval concepts with notices; Chinese senior-high math content remains our approved teacher material. |
| Question filtering, question basket, worksheet export | `sdmf6/math-atlas` at `b8022192c5cca91957cfd43babf02f49512e08b4` | MIT | Adapt reusable Next/React question-basket modules with notices. Its demo examination content is not automatically imported. |
| Editable question collection and publishable collection lifecycle | `project-sunbird/sunbird-collection-editor` at `622aa805ffe142c0d312e7bfddd4ae8dc4c4812b` | MIT | Adapt collection-editor components/state patterns with notices. |
| Document and PDF text extraction | `microsoft/markitdown` at `9dc0d6579b8739c9d0671ff205e071e3053c7df1` | MIT | Direct dependency/service integration with notices. |
| Photograph/image OCR | `PaddlePaddle/PaddleOCR` at `2661c7c0ef5c613e8f93c6e93b2e052399f0f854` | Apache-2.0 | Direct inference adapter/dependency integration with notices. |
| High-school math import and paper-composition workflow benchmark | `JudgePeach/math-question-bank` at `e3fb0dcb84c3cff466af4647dd0d76e0e8d6c0a7` | AGPL-3.0 | Product-flow reference only; no source code, styles, templates, or bundled content copied. |

## Runtime model

The DeepSeek Harness runtime is a Node service beside the existing FastAPI service. It owns tool registration, scoped tool visibility, session events and teacher approval requests. It does not own domain persistence. Each teacher tool calls a narrow authenticated FastAPI domain endpoint and returns a domain Artifact, pending action, or read-only evidence.

```
Teacher message or manual click
  -> Teacher V2 command surface
  -> Harness session + scoped teacher tools
  -> pre-execute: identity, class scope, role and confirmation policy
  -> existing FastAPI teacher domain service
  -> Artifact / draft / evidence / pending action
  -> post-execute: append session/audit event
  -> teacher confirms effect
  -> existing student-facing publication or state endpoint
```

### Initial tool plugins

| Plugin | Tool | Effect |
|---|---|---|
| `teacher-context` | `read_today`, `read_classes`, `read_assignments`, `read_resources` | Read-only evidence. |
| `teacher-lessons` | `adapt_lesson`, `create_lesson_artifact`, `create_slides` | Creates editable drafts only. |
| `teacher-question-bank` | `upload_question_source`, `review_import_candidates`, `build_question_collection` | Creates import candidates and quiz-set drafts only. |
| `teacher-assessment` | `create_assignment_draft`, `publish_assignment` | Draft is automatic; publish always asks for teacher confirmation. |
| `teacher-grading` | `open_grading_workspace`, `confirm_score` | Score confirmation is always teacher-confirmed. |
| `teacher-classroom` | `prepare_classroom_mode`, `publish_classroom_mode` | Student-facing mode change always asks for confirmation. |

## Question-bank policy

The current `question_bank` contains 24 rows with no source value and is not a publishable inventory. It is quarantined from V2 selection until a teacher reviews source and usage status. The legacy `capability_gateway._local_quiz_templates` path is removed from all teacher tool paths.

V2 supports three intake modes:

1. Teacher uploads a PDF, Word document, image, or existing question collection.
2. MarkItDown extracts document text; PaddleOCR supplies image text; both outputs are saved as source material rather than silently converted into published questions.
3. Teacher reviews each candidate question, source statement, answer and analysis, then explicitly adds it to the private teacher/school bank.

Only reviewed bank questions enter MathAtlas-style filtering and basket building. A shortage results in a visible shortage state; no filler question is generated.

## Formal route takeover

| Gate | Formal route | Replacement | Must prove before takeover |
|---|---|---|---|
| 0 | shared shell | `TeacherV2Root` + visible Today copilot | only teacher tools in the active scene are exposed; no legacy assistant panel remains. |
| 1 | `/teacher/assign` | `AssessmentStudioV2` | upload/review source -> basket -> collection draft -> teacher confirm -> published assignment is visible to the student endpoint. |
| 2 | `/teacher/prep` | `LessonStudioV2` | material -> editable lesson artifact -> teacher confirmation -> downloadable/reusable output. |
| 3 | `/teacher/resources` | `ResourceLibraryV2` | upload -> parser state -> source location -> usable lesson/assessment input. |
| 4 | `/teacher/today` | `TodayCopilotV2` | visible copilot resolves an approved tool call and shows actual artifacts, pending items and class evidence. |
| 5 | `/teacher/classroom` | `ClassroomControlV2` | confirmed classroom action is received by student-facing state and can be observed back on the teacher page. |
| 6 | `/teacher/classes` | `ClassEvidenceV2` | student assignments/classroom results aggregate into teacher evidence without exposing engineering fields. |
| 7 | `/teacher/grading` | existing `GradingV2` under new root | score confirmation remains audited and its V2 route has no legacy view dependency. |

## Legacy removal rule

After each gate passes, remove that route's legacy page, store adapters used only by it, legacy route import and related legacy CSS. Keep only Git history as rollback; do not retain a hidden Legacy switch, duplicate page, or CSS fallback.

## First acceptance demonstration

At 1366x768, a teacher on Today can enter: “把我上传的函数单调性练习整理成高二（3）班周作业。” The tool runtime must create a reviewable question-source/import Artifact, present an honest shortage or reviewed basket, create an assignment draft only after teacher selection, require a distinct publish confirmation, and show the published item through the existing student assignment API. No invented questions, `count=` strings, workflow identifiers or disabled assistant message may appear.
