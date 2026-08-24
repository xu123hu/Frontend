# Grading V2 — Senior-High-Mathematics Test Input Corpus

**Purpose:** input provenance for the V2 grading tests. This manifest is not a content-distribution bundle. No third-party PPT, Word document, PDF, student work, brand asset, or assessment page is copied into the product repository.

| Fixture ID | Actual teaching evidence | Grading test purpose | Rights / retention |
|---|---|---|---|
| monotonicity-choice | [陕西师范大学数学与统计学院公开优秀课：人教 A 版高中数学必修一 1.3.1《函数的单调性与最大（小）值》](https://math.sqnu.edu.cn/info/2128/7074.htm)，页面提供公开 PPT/DOCX 下载，访问日期：2026-08-24。 | Assignment/question context and objective-option rendering for the high-school “函数单调性” teaching unit. | Test provenance only; store title, URL, access date and derived structured facts. Do not commit or redistribute the PPT/DOCX. |
| derivative-solution | 上述优秀课主题，交叉参照 [华南师范大学公开《函数性质》单元教学设计 PDF](https://statics.scnu.edu.cn/pics/maths/2021/0218/1613615129109322.pdf)，访问日期：2026-08-24。 | Multi-step derivative solution, persisted score-point evidence and teacher override for f(x)=x^3-3x monotonicity. | Test provenance only; no source page/PDF image or text is copied. The repository fixture is a short structured test record with its own source reference. |
| parameter-boundary | 上述华南师范大学公开单元设计中“分类讨论”教学目标，访问日期：2026-08-24。 | A missing a=0 classification is represented as an evidence/rubric gap requiring review, not a confidence percentage. | Test provenance only; the source is not asserted to provide a numerical rubric or score. |
| handwritten-scan | A teacher-owned or explicitly authorized, anonymized handwritten-answer derivative created for the test suite; approval reference must be recorded before a real image is introduced. | Scoped file retrieval, file-load failure and manual-review flow. | Never commit a student’s original work. Until a documented approval reference exists, use a generated anonymous derivative only in local test storage. |
| version-conflict | Existing services/api/tests/test_m3_teacher_grading.py formal-confirmation contract. | Recover from a stale suggestion version without silently overwriting a grade. | Code-contract evidence; no teaching asset. |
| confirmed-mastery | Existing services/api/tests/test_m3_teacher_grading.py confirmation/mastery assertions. | Prove that only a successful teacher confirmation updates the downstream mastery record. | Code-contract evidence; no teaching asset. |

## Fixture use rule

Every V2 backend/mock fixture carries one fixture_id and one source_ref. The test may render a short mathematical prompt, expected mathematical step, rubric criterion, answer analysis, or anonymous synthetic answer only when its source row is present above. A missing rubric/full mark stays explicit as rubric_status: missing; no UI, adapter, mock, or test fabricates scoring points.

## Reference boundary

The interaction reference remains Gradescope’s public grading documentation, and the GitHub workflow/data-model reference remains the locally verified openwebwork/webwork2 clone documented in REFERENCE_EVIDENCE.md. The teaching sources above establish the Chinese senior-high-mathematics context; they do not authorize copying their presentation, lesson-plan, assessment, or branding designs.
