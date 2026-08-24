# Teacher V2 Foundation and Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the new Teacher V2 application foundation, visible Today copilot and source-reviewed assessment workflow, then formally take over `/teacher/assign`.

**Architecture:** A new Next/React teacher application is built from MIT/BSD reference-source modules and served beside the existing Vue/student application. A DeepSeek Harness runtime exposes only scoped teacher tools and delegates domain writes to the existing FastAPI teacher services. The assessment route combines uploaded source processing, reviewed question candidates, question basket, editable collection and teacher-confirmed publication.

**Tech Stack:** Next/React/TypeScript, DeepSeek Harness/Cordis, FastAPI, PostgreSQL, MarkItDown, PaddleOCR, Playwright, Vitest, pytest.

**Spec:** `docs/teacher-v2/TEACHER_V2_RECONSTRUCTION_SPEC.md`

## Global Constraints

- Use only reference code named in the spec and preserve their required notices.
- Do not copy from AGPL/GPL sources.
- Do not generate filler questions or publish imported questions before teacher review.
- `publish_assignment`, formal grade confirmation, resource publication and classroom state changes require explicit teacher confirmation.
- Work only in the two Teacher V2 worktrees; do not modify parent working trees.
- Do not take over a formal route until its end-to-end student linkage and browser evidence pass.

---

### Task 1: Create the Teacher V2 Next application from approved permissive sources

**Files:**
- Create: `teacher-v2/package.json`
- Create: `teacher-v2/next.config.mjs`
- Create: `teacher-v2/src/app/layout.tsx`
- Create: `teacher-v2/src/app/teacher/today/page.tsx`
- Create: `teacher-v2/src/reference-notices/NOTICE.md`
- Test: `teacher-v2/src/app/teacher/today/page.test.tsx`

**Interfaces:**
- Consumes: MathAtlas MIT UI modules and freeCodeCamp Classroom BSD dashboard modules after attribution-preserving extraction.
- Produces: `TeacherV2Root` and a Next route for `/teacher/today` with no legacy Vue dependency.

- [ ] **Step 1: Write the failing page test**

```tsx
it('renders the always-visible teaching copilot before dashboard evidence', async () => {
  render(<TodayPage />)
  expect(screen.getByRole('heading', { name: '教学管家' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: '直接交代教学任务' })).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix teacher-v2 test -- today/page.test.tsx`

Expected: FAIL because the Teacher V2 page does not exist.

- [ ] **Step 3: Add the minimum Next application and attributed reference notices**

```tsx
export default function TodayPage() {
  return <main><h1>教学管家</h1><label>直接交代教学任务<input aria-label="直接交代教学任务" /></label></main>
}
```

- [ ] **Step 4: Run page test and production build**

Run: `npm --prefix teacher-v2 test -- today/page.test.tsx && npm --prefix teacher-v2 run build`

Expected: PASS and a successful Next production build.

- [ ] **Step 5: Commit**

```bash
git add teacher-v2 docs/teacher-v2
git commit -m "feat(teacher-v2): establish attributed next application"
```

### Task 2: Mount the DeepSeek Harness teacher runtime and scoped tool policy

**Files:**
- Create: `services/teacher-harness/package.json`
- Create: `services/teacher-harness/src/runtime.ts`
- Create: `services/teacher-harness/src/plugins/teacher-context.ts`
- Create: `services/teacher-harness/src/plugins/teacher-assessment.ts`
- Create: `services/teacher-harness/src/plugins/teacher-policy.ts`
- Test: `services/teacher-harness/src/runtime.test.ts`

**Interfaces:**
- Consumes: `@deepseek-ai/dsh-tools` registrations and FastAPI internal teacher endpoints.
- Produces: `POST /teacher-copilot/turn` returning `{ sessionId, events, pendingApproval?, artifact? }`.

- [ ] **Step 1: Write failing tool-policy tests**

```ts
it('asks before publish_assignment and never asks before read_assignments', async () => {
  expect(await policyFor('publish_assignment')).toEqual({ kind: 'ask' })
  expect(await policyFor('read_assignments')).toEqual({ kind: 'allow' })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix services/teacher-harness test -- runtime.test.ts`

Expected: FAIL because the runtime and policy plugins do not exist.

- [ ] **Step 3: Implement only scoped teacher plugins**

```ts
ctx.tools.register(defineTool({ name: 'publish_assignment', execute }))
ctx.on('tools/pre-execute', async (execution, next) =>
  execution.name === 'publish_assignment' ? { kind: 'ask', reason: '发布作业需要教师确认' } : next())
```

- [ ] **Step 4: Run unit tests and a runtime smoke turn**

Run: `npm --prefix services/teacher-harness test && npm --prefix services/teacher-harness run smoke`

Expected: PASS; the smoke turn lists teacher-only tools and returns a pending approval for publication.

- [ ] **Step 5: Commit**

```bash
git add services/teacher-harness
git commit -m "feat(teacher-v2): add harness-backed teacher tool runtime"
```

### Task 3: Add source-aware question import without filler generation

**Files:**
- Modify: `services/api/app/domains/teacher/assessment.py`
- Modify: `services/api/app/domains/teacher/capability_gateway.py`
- Create: `services/api/app/domains/teacher/question_import.py`
- Create: `services/api/tests/test_teacher_question_import.py`
- Modify: `services/api/app/domains/teacher/router.py`

**Interfaces:**
- Consumes: uploaded resource id, `source_statement`, MarkItDown/PaddleOCR extraction result.
- Produces: `question_import` Artifact with candidate rows in `pending_teacher_review` state; `quiz_set` generation receives only reviewed, publishable bank rows.

- [ ] **Step 1: Write failing backend tests**

```python
async def test_imported_candidate_cannot_be_selected_before_teacher_review(client, teacher_headers):
    imported = await client.post('/api/teacher/question-imports', headers=teacher_headers, json={
        'resource_id': RESOURCE_ID, 'source_statement': '教师自有练习', 'class_id': CLASS_ID,
    })
    assert imported.status_code == 201
    quiz = await client.post('/api/teacher/quizzes/generate', headers=teacher_headers, json=REQUEST)
    assert imported.json()['artifact_id'] not in [item.get('source_ref') for item in quiz.json()['payload']['items']]
```

- [ ] **Step 2: Run targeted test to verify it fails**

Run: `pytest services/api/tests/test_teacher_question_import.py -v`

Expected: FAIL because no source-review state exists.

- [ ] **Step 3: Implement import/review states and remove local template selection**

```python
if available_count < target:
    warnings.append(f'题库仅有 {available_count}/{target} 道严格命中题，请上传资料或调整范围、题型或题量后再发布。')
# capability_gateway must delegate create_quiz to assessment.generate_quiz;
# it must not call _local_quiz_templates.
```

- [ ] **Step 4: Run targeted and existing assessment tests**

Run: `pytest services/api/tests/test_teacher_question_import.py services/api/tests/test_m3_teacher_assessment.py -v`

Expected: PASS; shortages remain shortages and unreviewed candidates never publish.

- [ ] **Step 5: Commit**

```bash
git add services/api/app/domains/teacher services/api/tests/test_teacher_question_import.py
git commit -m "feat(teacher-v2): add reviewed source question import"
```

### Task 4: Build Assessment Studio from MathAtlas and Sunbird collection patterns

**Files:**
- Create: `teacher-v2/src/app/teacher/assign/page.tsx`
- Create: `teacher-v2/src/features/assessment/QuestionSourceUpload.tsx`
- Create: `teacher-v2/src/features/assessment/QuestionBasket.tsx`
- Create: `teacher-v2/src/features/assessment/CollectionReview.tsx`
- Create: `teacher-v2/src/lib/teacher-api.ts`
- Test: `teacher-v2/src/features/assessment/assessment-flow.test.tsx`

**Interfaces:**
- Consumes: Harness event stream and FastAPI question-import, reviewed-bank, quiz artifact, assignment draft and publish APIs.
- Produces: a reviewable collection and confirmation prompt; never an automatic student publication.

- [ ] **Step 1: Write the failing browser-level component test**

```tsx
it('requires separate review and publication confirmation after source upload', async () => {
  render(<AssessmentStudio />)
  await userEvent.upload(screen.getByLabelText('上传题目资料'), file)
  expect(await screen.findByText('等待教师审题')).toBeVisible()
  expect(screen.queryByRole('button', { name: '发布给学生' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix teacher-v2 test -- assessment-flow.test.tsx`

Expected: FAIL because Assessment Studio does not exist.

- [ ] **Step 3: Adapt the approved reference modules**

```tsx
<QuestionSourceUpload onImported={setImportArtifact} />
<QuestionBasket items={reviewedItems} onRemove={removeFromBasket} />
<CollectionReview collection={draftCollection} onCreateDraft={createAssignmentDraft} />
```

- [ ] **Step 4: Run component tests, API-contract tests and browser journey**

Run: `npm --prefix teacher-v2 test && npm --prefix teacher-v2 run e2e -- assessment-source-to-publish.spec.ts`

Expected: PASS; browser evidence shows upload -> review -> draft -> distinct publish confirmation -> student API visibility.

- [ ] **Step 5: Commit**

```bash
git add teacher-v2
git commit -m "feat(teacher-v2): build source-reviewed assessment studio"
```

### Task 5: Take over `/teacher/assign` and remove its legacy implementation

**Files:**
- Modify: `src/router/index.js`
- Modify: dev/proxy configuration for `/teacher/*` to Teacher V2
- Delete: `src/pages/teacher/TeacherAssignView.vue`
- Delete: legacy assessment-only stores/styles/tests identified by import graph
- Test: `e2e/teacher-v2-assignment-takeover.spec.ts`

**Interfaces:**
- Consumes: verified Teacher V2 Assessment Studio URL and existing student assignment endpoint.
- Produces: formal `/teacher/assign` with no legacy Vue page import.

- [ ] **Step 1: Write the failing takeover assertion**

```ts
test('formal assignment route is served by Teacher V2 and never renders legacy quick settings', async ({ page }) => {
  await page.goto('/teacher/assign')
  await expect(page.getByText('上传题目资料')).toBeVisible()
  await expect(page.getByText('快速设置')).toHaveCount(0)
})
```

- [ ] **Step 2: Run it to verify it fails against Legacy**

Run: `npx playwright test e2e/teacher-v2-assignment-takeover.spec.ts`

Expected: FAIL because `/teacher/assign` currently imports `TeacherAssignView.vue`.

- [ ] **Step 3: Proxy formal teacher route and delete Legacy files**

Configure the existing Nginx edge (production) and Vite dev proxy (development) to reverse-proxy `/teacher/*` and `/_next/*` to Teacher V2 before the Vue SPA fallback. The proxy forwards the original host, cookie and authorization headers, so the browser stays on the formal same-origin URL. Remove the Vue `TeacherAssignView` route import and its route-only CSS; do not implement an external navigation or an iframe.

- [ ] **Step 4: Run full acceptance suite**

Run: `npm test && npm run build && npx playwright test e2e/teacher-v2-assignment-takeover.spec.ts && pytest services/api/tests/test_m3_teacher_assessment.py services/api/tests/test_teacher_question_import.py -v`

Expected: PASS with an artifact screenshot and an observed published student assignment.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(teacher-v2): take over formal assessment route"
```

## Follow-on route cards

- Lesson Studio V2: Claw-ED source ingestion and editable lesson artifacts; then `/teacher/prep` takeover.
- Resource Library V2: MarkItDown/PaddleOCR processing states and reuse-to-lesson/assessment actions; then `/teacher/resources` takeover.
- Today Copilot V2: freeCodeCamp dashboard aggregation plus Harness conversation as the first screen; then `/teacher/today` takeover.
- Classroom and class evidence: existing student state plus confirmed actions; then `/teacher/classroom` and `/teacher/classes` takeovers.
- Grading integration: mount existing Grading V2 inside the Teacher V2 root, verify confirmation audit, then delete the legacy grading import.

## Self-review

- Spec coverage: Tasks 1–2 establish the V2 source-based frontend and Harness runtime; Tasks 3–5 deliver the first full upload-to-student loop and first formal route deletion. Follow-on cards cover every remaining formal route.
- Placeholder scan: no `TODO` or deferred implementation placeholders in Tasks 1–5; each task has concrete source files, tests, commands and output contracts.
- Type consistency: runtime returns `pendingApproval`; FastAPI owns `Artifact`, `quiz_set` and assignment state; Teacher V2 consumes those exact concepts rather than creating a second business model.
