# Grading V2 — Reference Screen Map

**Gate:** PRE-CODE GATE — complete
**Purpose:** make the primary workflow visually auditable before any V2 component is written. These files are product-study evidence only. They are not UI assets, templates, or code to copy.

## Evidence inventory

| File | Provenance | What it proves | Retention rule |
|---|---|---|---|
| `reference-gradescope-01.png` | Screenshot of Gradescope’s official public guide attachment, source [Grading submissions with rubrics](https://guides.gradescope.com/hc/en-us/articles/22249389005709-Grading-submissions-with-rubrics) | The same grading surface binds a question context, original submission, rubric and a persistent action bar. | Documentation evidence only; do not ship it or reuse any image, logo, copy, colour or layout asset. |
| `reference-gradescope-02.png` | Screenshot of a second official public guide attachment from the same source | A rubric is a visible vertical set of score-bearing criteria, rather than a detached score form. | Documentation evidence only; no visual/brand asset reuse. |
| `legacy-grading.png` | Copy of the repository’s existing browser evidence `artifacts/teacher-refactor/round-05/02-grading-deeplink.png`; SHA-256 `11AAC356A7BCBDB4A35C8915686AA7EBEB30C041638FF5A6808FC683B6B9DEB7` | The Legacy product skeleton: page header → top student `<select>` → generic answer panel → detached score form. | Regression/comparison evidence only; never use it as a design target. |

## Region map — Primary reference

The labels below refer to `reference-gradescope-01.png`; they are a mapping of product responsibilities, not a pixel-copy instruction.

| Region | Visible evidence | Task / interaction learned | **KEEP AS PRODUCT PATTERN** | **ADAPT FOR 智学数研** | **DO NOT COPY** |
|---|---|---|---|---|---|
| A — assignment/question context | Question label/title and question switcher at the top of the grading surface | Keep grading focused on one question inside an assignment; show progress and context before evaluating work. | Question-focused context remains visible while moving through submissions. | Chinese senior-high mathematics: show class, assignment, question number, knowledge point and current/total progress; context is sourced from the teacher’s authorized assignment. | Gradescope wording, question labels, geometry, logos, colours and controls. |
| B — submitted work | Large central `Student submission` area with the original hand-written response | The original work is the primary reading surface; no score is decided without it. | Work viewer has first-class space and supports original text or a scanned/file answer. | Render LaTeX safely; support Chinese handwritten/photographed solutions, zoom, rotate and page navigation when the returned file permits; preserve anonymous label by default. | Any sample work, annotations, typography, image treatment or page layout from the reference. |
| C — rubric/scoring | Right-side `Rubric` stack with score-bearing criteria | A score must be explained against visible criteria, not hidden in an isolated form. | Evidence and rubric stay adjacent to the work and teacher decision. | Display the actual high-school-math full mark, score points, standard answer/analysis and evidence returned by the workspace; use neutral “建议人工复核” wording when proof is incomplete. | Rubric text, scoring labels, iconography, colours and visual card styling. |
| D — navigation / Next Ungraded | Sidebar submission navigation plus current-submission count and `Next Ungraded` in the bottom bar | Continuation is part of grading: select/skip a submission and advance to a safe next ungraded item without returning to a global select. | Dedicated queue and explicit “next ungraded” semantics. | Anonymous queue with `待批 / 复看 / 已确认`, assignment/question filters, deep-linkable `submission_item_id`, and server-derived next candidate; no student identity exposure by default. | The side rail visuals, status icons, terminology and button positions. |
| E — grading actions | Bottom persistent action bar containing previous/next actions | Make the next legitimate action available while the teacher still sees the work and evidence. | Persistent action bar with visible click targets and keyboard equivalents. | `上一份` / `稍后复看 (M)` / `确认并下一份 (Enter)`; only the explicit confirm calls the versioned idempotent formal-score endpoint. | Exact action labels, keybindings beyond the documented product pattern, colours, arrangement, brands or assets. |

## Legacy comparison baseline

`legacy-grading.png` visibly demonstrates the rejected composition: the queue is a top `<select>`, the central view is a generic answer box, and final scoring is a detached form. It lacks an assignment/question workstation with a simultaneous queue, original work, rubric evidence and continuous action rail.

## Legacy Similarity Hard Fail

The first V2 browser screenshot is a **hard reconstruction gate**. If its primary product skeleton is still recognizably:

```text
top student select + generic answer panel + detached side score form
```

the result is **FAIL**. Do not repair it by changing CSS, adding cards, opening a drawer, or moving a few controls. Delete the V2 page implementation, return to `RECONSTRUCTION_SPEC.md`, and reconstruct the page tree from the Region A–E contract. Legacy remains untouched.

## Minimal-shell limit

Until this reference reconstruction passes, V2 may contain only the local shell necessary for this workstation: route container, V2 grading layout, queue, work viewer, rubric/evidence, decision action bar and their state adapters. Do not create a full Teacher OS design system, global V2 navigation, token programme, cross-module provider, or speculative shared component hierarchy.
