# Teacher V2 reference notices

This directory records the permissive-source components and patterns adapted into Teacher V2. The cited source code remains available in `D:\\teacher-v2-reference-repos` at the listed fixed commit. Teacher V2 does not import any bundled demonstration examination content.

## MathAtlas

- Source: `sdmf6/math-atlas`, commit `b8022192c5cca91957cfd43babf02f49512e08b4`.
- License: MIT, Copyright (c) 2026 MathAtlas.
- Adapted responsibility: question filtering, teacher-selected ordering and question-basket handoff. Original paths: `src/components/FilterableTable.tsx`, `src/app/examBasket/page.tsx`.
- The MIT license notice and permission statement shall accompany substantial portions of adapted code.

## freeCodeCamp Classroom

- Source: `freeCodeCamp/classroom`, commit `182e8b43b8c196381b6f68f2bdcc10618207c24a`.
- License: BSD-3-Clause.
- Adapted responsibility: classroom evidence table relationship: learner/class identity, recent activity, completion meter and next action. Original path: `components/dashtable_v2.js`.
- This product replaces coding-course vocabulary and sample data with audited high-school mathematics class evidence.

## DeepSeek Harness

- Source: `deepseek-ai/deepseek-harness`, commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`.
- License: MIT.
- Adapted responsibility: session event model and tool execution boundary. Runtime implementation is introduced in the paired backend worktree; original path: `packages/core/tools/README.md`.

## Chatscope Chat UI Kit React

- Source: `chatscope/chat-ui-kit-react`, commit `8c690cd3ced687551cf9f8eb9000e0a60f302af4`.
- License: MIT, Copyright (c) 2020-2022 chatscope.io.
- Direct dependency and adapted components: `MainContainer`, `ChatContainer`, `ConversationHeader`, `MessageList`, `Message`, `MessageSeparator`, and `MessageInput`. Original paths: `src/components/ChatContainer/ChatContainer.jsx`, `src/components/MessageList/MessageList.jsx`, `src/components/MessageInput/MessageInput.jsx`.
- Teacher V2 keeps the required MIT notice and substitutes only the domain labels, tool cards and confirmation flow; it does not represent an external chat integration.

## TeacherBuddy

- Source: `mrbubbles-src/teacherbuddy`, commit `8daa9ccf95e00632121d459243b7be118e114685`.
- License: MIT, Copyright (c) 2026 TeacherBuddy contributors.
- Adapted responsibility: teacher task shell and two-pane quiz-draft editing workflow. Original paths: `components/app-shell.tsx`, `components/quizzes/quiz-editor.tsx`, `components/quizzes/quiz-editor-form.tsx`.
- V2 replaces localStorage-only quiz state with the audited Math Arena draft/confirm/publish workflow.

## Nellavio Dashboard

- Source: `nellavio/nellavio`, commit `522f2cfc78567c7b64f94e8c1f7da65ea4e02551`.
- License: MIT, Copyright (c) 2023 Mateusz Wyrębek.
- Adapted responsibility: teacher profile header, account side panel, preference sections and activity layout. Original paths: `src/components/views/profile/ProfileView.tsx`, `ProfileHeaderCard.tsx`, `ProfileSidebar.tsx`.
- V2 will bind these regions only to the authenticated teacher profile and model preference records; no mock identity is retained.

## Paper LMS

- Source: `kocherm/paper-lms`, commit `543c3417892c3768a5d2a70a5e3cbe2f680623ee`.
- License: MIT, Copyright (c) 2026 Michael Kocher.
- Adapted responsibility: filterable resource commons, explicit source detail, favorites and teacher-controlled import. Original paths: `web/src/pages/CommonsPage.jsx`, `web/src/components/CommonsCard.jsx`, `web/src/pages/FilesPage.jsx`.
- External links (including Bilibili) remain metadata with source and copyright notices; V2 does not copy or redistribute third-party media.
