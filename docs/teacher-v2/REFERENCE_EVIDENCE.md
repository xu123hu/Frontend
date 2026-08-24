# Teacher V2 reference evidence

All repositories below were cloned under `D:\teacher-v2-reference-repos` before
their interaction patterns were adapted.  The Teacher V2 code is an in-repo Vue
implementation against our APIs; it does not embed, link-frame, or redistribute
the referenced products.

| Formal workspace | Reference repository and pinned commit | License | Source pattern adapted | Our boundary |
| --- | --- | --- | --- | --- |
| Today / visible Butler | `chatscope/chat-ui-kit-react` `8c690cd3ced687551cf9f8eb9000e0a60f302af4` | MIT | Persistent conversation workspace | Our Butler executes only registered teacher tools; confirmation/write boundaries remain our backend. |
| Prep / Classes / Classroom / Resources | `kocherm/paper-lms` `543c3417892c3768a5d2a70a5e3cbe2f680623ee` | MIT | `web/src/pages/CoursePacingPage.jsx`, `EnrollmentTermsPage.jsx`, `ModulesPage.jsx` source-first pacing, roster and external-url patterns | Teacher-owned high-school math sources, API scopes and student delivery are platform-specific. External pages are recorded as references only. |
| Assessment | `mrbubbles/teacherbuddy` `8daa9ccf95e00632121d459243b7be118e114685` | MIT | Teacher quiz construction flow | Only approved source questions may enter our bank; draft/confirm/publish stays explicit. |
| Profile | `nellavio/nellavio-dashboard` `522f2cfc78567c7b64f94e8c1f7da65ea4e02551` | MIT | Account identity and settings information layout | Model credentials are never rendered. |
| Butler tool boundary | `deepseek-ai/DeepSeek-Harness` `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` | MIT | Registry-oriented capability boundary | We preserve platform authorization, teacher confirmation and audit records. |

## Explicit exclusions

- `ai4ed-LessonPlan` was inspected but has no license file in the cloned revision;
  no code, visual asset, or implementation pattern from it is reused.
- Gradescope-like grading patterns are reconstructed from the recorded evidence
  and our own API contract. No branding, screenshots, visual assets, or copied
  implementation are shipped.
- A missing upstream capability does not justify fabricated output. In particular,
  an unconnected video event source remains visibly unavailable; a local lesson
  template is visibly a basic draft and cannot generate a formal PPT.
