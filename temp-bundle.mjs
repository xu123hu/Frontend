// vite.config.js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// src/components/chat/messageModel.js
function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}

// src/mock/data.js
var MOCK_USER = {
  nickname: "\u5C0F\u5A77",
  roles: [{ role: "student" }],
  grade: "\u9AD8\u4E8C\uFF083\uFF09\u73ED",
  avatar: "\u5A77"
};
function iso(offsetMin = 0, base = Date.now()) {
  return new Date(base + offsetMin * 6e4).toISOString();
}
var conv = (id, title, updatedAt, extra = {}) => ({
  id,
  title,
  workspace: "student",
  created_at: updatedAt,
  updated_at: updatedAt,
  message_count: 0,
  pinned: false,
  ...extra
});
var seedConversations = [
  conv("c1", "\u6C42\u51FD\u6570\u6781\u503C\u95EE\u9898", iso(-8)),
  conv("c2", "\u5BFC\u6570\u4E0E\u5355\u8C03\u6027\u8BB2\u89E3", iso(-120), { message_count: 6 }),
  conv("c3", "\u4E09\u89D2\u51FD\u6570\u5355\u8C03\u533A\u95F4", iso(-200)),
  conv("c4", "\u6570\u5217\u6C42\u548C\u9519\u4F4D\u76F8\u51CF", iso(-1440)),
  conv("c5", "\u7ACB\u4F53\u51E0\u4F55\u4F53\u79EF", iso(-1500)),
  conv("c6", "\u5706\u9525\u66F2\u7EBF\u7126\u70B9", iso(-2880)),
  conv("c7", "\u6982\u7387\u53E4\u5178\u6982\u578B", iso(-4320))
];
var md = (content) => ({ type: "markdown", content });
var card = (data) => ({ type: "card", data });
var env = (blocks, meta = {}) => ({ msg_id: uuid(), meta, blocks });
var demoC2 = [
  {
    id: "m1",
    role: "user",
    clientMsgId: "c2u1",
    createdAt: iso(-130),
    envelope: env([
      md("\u6C42\u51FD\u6570 $f(x)=x^3-3x$ \u5728 $[-1,3]$ \u4E0A\u7684\u6700\u5927\u503C\u548C\u6700\u5C0F\u503C")
    ])
  },
  {
    id: "m2",
    role: "assistant",
    clientMsgId: "c2u1",
    createdAt: iso(-129),
    envelope: env(
      [
        md("\u5C0F\u5A77\uFF0C\u8FD9\u9053\u9898\u786E\u5B9E\u9700\u8981\u4E00\u6B65\u6B65\u60F3\u6E05\u695A\u3002\n\n\u6211\u4EEC\u5148\u770B\u9898\u76EE\u8981\u6C42\u7684\u662F\u4EC0\u4E48\u2014\u2014\u5728\u95ED\u533A\u95F4 **$[-1, 3]$** \u4E0A\u627E **$f(x) = x^3 - 3x$** \u7684\u6700\u5927\u503C\u548C\u6700\u5C0F\u503C\u3002\n\n**\u4F60\u8BB0\u5F97\u5417\uFF1F\u6C42\u95ED\u533A\u95F4\u4E0A\u51FD\u6570\u7684\u6700\u503C\uFF0C\u901A\u5E38\u4F1A\u7528\u5230\u4EC0\u4E48\u65B9\u6CD5\uFF1F**")
      ],
      { skill: "socratic_solver", confidence: 0.96 }
    )
  },
  {
    id: "m3",
    role: "user",
    clientMsgId: "c2u2",
    createdAt: iso(-124),
    envelope: env([md("\u5148\u6C42\u5BFC\uFF1F\u627E\u51FA\u6781\u503C\u70B9\uFF1F")])
  },
  {
    id: "m4",
    role: "assistant",
    clientMsgId: "c2u2",
    createdAt: iso(-123),
    envelope: env(
      [
        md("\u5BF9\u4E86\u4E00\u534A\uFF01**\u6C42\u5BFC \u2192 \u627E\u6781\u503C\u70B9** \u6CA1\u9519\uFF0C\u4F46\u95ED\u533A\u95F4\u6700\u503C\u8FD8\u6709\u4E2A\u5173\u952E\u6B65\u9AA4\u2014\u2014**\u8FD8\u8981\u4EE3\u5165\u7AEF\u70B9\u6BD4\u8F83**\u3002\n\n\u73B0\u5728\u8BF7\u4F60\u8BD5\u8BD5\uFF1A\n\u2460 \u6C42 $f'(x) = ?$\n\u2461 \u4EE4 $f'(x) = 0$\uFF0C\u89E3\u51FA $x = ?$\n\u2462 \u8FD9\u4E9B $x$ \u5728\u4E0D\u5728\u533A\u95F4 $[-1, 3]$ \u5185\uFF1F\n\n\u7B97\u5B8C\u544A\u8BC9\u6211\uFF0C\u6211\u5E2E\u4F60\u6838\u5BF9\u4E0B\u4E00\u6B65\u3002")
      ],
      { skill: "socratic_solver", confidence: 0.93 }
    )
  },
  {
    id: "m5",
    role: "user",
    clientMsgId: "c2u3",
    createdAt: iso(-118),
    envelope: env([
      md("$f'(x) = 3x^2-3 = 0$\uFF0C\u6240\u4EE5 $x = \\pm 1$\uFF0C\u4E24\u4E2A\u90FD\u5728\u533A\u95F4\u5185"),
      card({
        type: "quiz_set",
        chain: "variant",
        chain_id: "chain-c2-1",
        items: [
          {
            item_no: 1,
            q_type: "choice",
            difficulty: "easy",
            kp_name: "\u5BFC\u6570\u4E0E\u5355\u8C03\u6027",
            kp_code: "DR-02",
            variant_note: "\u53D8\u5F0F 1 \xB7 \u6362\u6570\u5B57",
            question_text: "\u4F60\u521A\u624D\u63D0\u5230\u7684\u6781\u503C\u70B9\u662F $x = \\pm 1$\uFF0C\u8981\u627E\u95ED\u533A\u95F4\u6700\u503C\u8FD8\u9700\u8981\uFF1A",
            options: ["\u76F4\u63A5\u7528 $f(-1)$ \u548C $f(1)$ \u6BD4\u8F83", "\u4EE3\u5165\u7AEF\u70B9 $x = -1, 3$ \u6BD4\u8F83", "\u4EE3\u5165\u6240\u6709\u5019\u9009\u70B9\uFF08\u542B\u7AEF\u70B9\uFF09\uFF1A$x = -1, 1, 3$", "\u4E0D\u9700\u8981\u6BD4\u8F83\uFF0C\u76F4\u63A5\u9009 $f(0) = 0$"],
            answer: "C",
            answer_analysis: "\u95ED\u533A\u95F4\u6700\u503C\u5FC5\u987B\u6BD4\u8F83\u6240\u6709\u5019\u9009\u70B9\uFF08\u542B\u7AEF\u70B9\uFF09\u3002\u5F88\u591A\u540C\u5B66\u6F0F\u7B97\u7AEF\u70B9 $x=3$\uFF0C\u5BFC\u81F4\u9519\u3002"
          }
        ]
      })
    ])
  },
  {
    id: "m6",
    role: "assistant",
    clientMsgId: "c2u3",
    createdAt: iso(-117),
    envelope: env(
      [
        md('**\u4F60\u9009\u4E86 C\uFF0C\u6B63\u786E\uFF01**\n\n\u8FD9\u5C31\u662F"\u95ED\u533A\u95F4\u6700\u503C"\u7684\u5173\u952E\u2014\u2014**\u5FC5\u987B\u6BD4\u8F83\u6240\u6709\u5019\u9009\u70B9\uFF08\u542B\u7AEF\u70B9\uFF09**\u3002\n\n\u73B0\u5728\u6211\u4EEC\u6765\u4EE3\u5165\u9A8C\u8BC1\uFF1A\n\u2022 $f(-1) = 2$\n\u2022 $f(1) = -2$\n\u2022 $f(3) = 18$\n\n\u6240\u4EE5\u6700\u5927\u503C = **18**\uFF0C\u6700\u5C0F\u503C = **-2**\u3002\u4F60\u505A\u51FA\u6765\u540E\u544A\u8BC9\u6211\uFF0C\u4E0B\u4E00\u6B65\u5E2E\u4F60\u505A\u53D8\u5F0F\u5DE9\u56FA\u3002')
      ],
      { skill: "socratic_solver", confidence: 0.97 }
    )
  }
];
var simpleConv = (id, q, a) => [
  { id: `${id}q`, role: "user", clientMsgId: `${id}u`, createdAt: iso(-10), envelope: env([md(q)]) },
  { id: `${id}a`, role: "assistant", clientMsgId: `${id}u`, createdAt: iso(-9), envelope: env([md(a)], { skill: "socratic_solver" }) }
];
var seedMessages = {
  c2: demoC2,
  c1: simpleConv("c1", "\u6C42\u51FD\u6570 $f(x)=x^3-3x+1$ \u7684\u6781\u503C", "\u5148\u6C42\u5BFC $f'(x)=3x^2-3$\uFF0C\u4EE4\u5176\u4E3A\u96F6\u5F97 $x=\\pm 1$\u3002\u5224\u65AD\u4E24\u4FA7\u7B26\u53F7\u5373\u53EF\u5F97\u51FA\u6781\u5927\u503C\u70B9 $x=-1$\uFF08$f(-1)=3$\uFF09\u3001\u6781\u5C0F\u503C\u70B9 $x=1$\uFF08$f(1)=-1$\uFF09\u3002"),
  c3: simpleConv("c3", "\u6C42 $y=2\\sin(2x+\\frac{\\pi}{3})$ \u7684\u5355\u8C03\u9012\u589E\u533A\u95F4", "\u7531 $-\\frac{\\pi}{2}+2k\\pi \\le 2x+\\frac{\\pi}{3} \\le \\frac{\\pi}{2}+2k\\pi$ \u89E3\u5F97 $x \\in [-\\frac{5\\pi}{12}+k\\pi, \\frac{\\pi}{12}+k\\pi]$\u3002"),
  c4: simpleConv("c4", "\u6570\u5217 $a_n=(2n-1)\\cdot 3^n$ \u6C42\u548C", "\u7528\u9519\u4F4D\u76F8\u51CF\u6CD5\uFF1A$S_n = 3 + 3\\cdot3^2+\\dots$\uFF0C\u4E24\u8FB9\u4E58 3 \u540E\u76F8\u51CF\uFF0C\u5F97\u5230 $S_n = 3 + (n-1)3^{n+1}$\u3002"),
  c5: simpleConv("c5", "\u4E09\u68F1\u9525\u4F53\u79EF\u600E\u4E48\u7B97\uFF1F", "\u5173\u952E\u627E\u5E95\u9762\u548C\u9AD8\uFF1A$V = \\frac{1}{3}Sh$\u3002\u5148\u9009\u5B9A\u5E95\u9762\u6C42\u9762\u79EF\uFF0C\u518D\u627E\u9876\u70B9\u5230\u5E95\u9762\u7684\u8DDD\u79BB\uFF08\u5E38\u9700\u5EFA\u7CFB\u6216\u7B49\u4F53\u79EF\u6CD5\uFF09\u3002"),
  c6: simpleConv("c6", "\u692D\u5706\u7126\u70B9\u5750\u6807\u600E\u4E48\u6C42\uFF1F", "\u5BF9 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$\uFF08$a>b$\uFF09\uFF0C$c=\\sqrt{a^2-b^2}$\uFF0C\u7126\u70B9\u4E3A $(\\pm c, 0)$\u3002"),
  c7: simpleConv("c7", "\u53E4\u5178\u6982\u578B\u6982\u7387\u516C\u5F0F", "$P(A)=\\frac{\u4E8B\u4EF6A\u5305\u542B\u7684\u57FA\u672C\u4E8B\u4EF6\u6570}{\u603B\u57FA\u672C\u4E8B\u4EF6\u6570}$\u3002\u6CE8\u610F\u5148\u7B97\u6E05\u603B\u6570\uFF0C\u907F\u514D\u91CD\u590D/\u9057\u6F0F\u3002")
};
var reviewPlan = {
  due_today: 2,
  due_items: [
    { record_id: "r1", question_text: "\u6C42\u51FD\u6570 $f(x)=x^3-3x$ \u5728 $[-1,3]$ \u4E0A\u7684\u6700\u5927\u503C\u548C\u6700\u5C0F\u503C", kp_name: "\u5BFC\u6570\u4E0E\u6781\u503C" },
    { record_id: "r2", question_text: "\u5224\u65AD\u51FD\u6570 $f(x)=x^3-3x$ \u7684\u5355\u8C03\u533A\u95F4", kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027" }
  ]
};
var masterySummary = {
  total_score: 67,
  delta: 9,
  last_week: 58,
  target: 75,
  independent_rate: 0.52,
  streak: 7,
  weak_points: [{ kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", mastery: 0.12 }]
};
var labRecommend = {
  daily_question: { question_text: "\u6C42\u51FD\u6570 $f(x)=x^3-3x^2+2$ \u5728 $[0,4]$ \u4E0A\u7684\u6700\u503C", kp_name: "\u5BFC\u6570\u4E0E\u6781\u503C" },
  weak_top1: { kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", mastery: 0.12 },
  pending_review: 3,
  streak: 7,
  exams: [{ id: "e1", title: "2024 \xB7 \u65B0\u8BFE\u6807 I \u5377" }]
};
var knowledgeGraph = {
  chapters: [
    { id: "ch1", name: "\u51FD\u6570\u7684\u6982\u5FF5\u4E0E\u57FA\u672C\u521D\u7B49\u51FD\u6570" },
    { id: "ch2", name: "\u5BFC\u6570\u53CA\u5176\u5E94\u7528" },
    { id: "ch3", name: "\u4E09\u89D2\u51FD\u6570" }
  ],
  nodes: [
    { kp_code: "HS-01", kp_name: "\u51FD\u6570\u7684\u6982\u5FF5\u4E0E\u8868\u793A", mastery: 0.85 },
    { kp_code: "HS-02", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", mastery: 0.72 },
    { kp_code: "DR-01", kp_name: "\u5BFC\u6570\u6982\u5FF5\u4E0E\u51E0\u4F55\u610F\u4E49", mastery: 0.45 },
    { kp_code: "DR-02", kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", mastery: 0.12 }
  ]
};
var growthOverview = {
  composite_score: 67,
  score_delta_week: 9,
  last_week_score: 58,
  target_score: 75,
  independent_rate: 0.52,
  streak_days: 7,
  error_total: 14,
  error_due_count: 3,
  mastered_kp_count: 12,
  total_kp_count: 52,
  week_answer_count: 30,
  week_correct_count: 23,
  /* 迭代17 §1-D 超集字段：AI 管家问候语（时段 + 真实数据） */
  greeting: "\u665A\u4E0A\u597D\uFF0C\u5C0F\u5A77\uFF01\u4F60\u7684\u7EFC\u5408\u5206 67\uFF0C\u6BD4\u4E0A\u5468\u8FDB\u6B65 9 \u5206\uFF0C\u8FDE\u51FB 7 \u5929\u8282\u594F\u5F88\u7A33\uFF0C\u4ECA\u5929\u4E5F\u4E00\u8D77\u8FDB\u6B65\u5427\u3002"
};
var growthPanel = {
  golden_window: { start: "21:00", end: "21:50", label: "\u8584\u5F31\u5B66\u79D1\u653B\u575A \xB7 \u7CBE\u529B\u5CF0\u503C" },
  today_actions: [
    { key: "review_errors", title: "\u590D\u4E60 3 \u9053\u9519\u9898", count: 3, route: "/errors" },
    { key: "variant_drill", title: "\u5BFC\u6570\u53D8\u5F0F\u8BAD\u7EC3", count: 5, route: "/practice" },
    { key: "final_challenge", title: "\u538B\u8F74\u6311\u6218", count: 1, route: "/practice" },
    { key: "teacher_homework", title: "\u8001\u5E08\u4F5C\u4E1A", count: 2, route: "/tasks" }
  ],
  week_brief: { independent_rate: 0.52, score_delta: 9, streak_days: 7 },
  encouragement: '\u5C0F\u5A77\uFF0C\u8FD9\u5468\u4F60\u505A\u5BF9\u4E86 23 \u9053\u5BFC\u6570\u9898\uFF08\u4E0A\u5468\u624D 14 \u9053\uFF09\u2014\u2014\u8FDB\u6B65\u4E0D\u662F"\u67D0\u5929\u7A81\u7136\u4F1A\u4E86"\uFF0C\u662F\u6BCF\u5929\u591A\u505A 1.3 \u9053\u3002\u660E\u5929\u7EE7\u7EED\u4FDD\u6301\uFF0C\u4F60\u80FD\u5728\u6708\u5E95\u524D\u628A"\u538B\u8F74\u7B2C\u4E8C\u95EE"\u7A81\u7834 50%\u3002',
  gaokao_countdown: { days: 297, exam_date: "2027-06-07" }
};
var routeIntentReply = {
  rules: [
    { keywords: ["\u9519\u9898", "\u590D\u4E60"], route: "/errors", route_name: "\u9519\u9898\u672C", query: {}, reply: "\u597D\u7684\uFF0C\u5E26\u4F60\u53BB\u9519\u9898\u672C\uFF0C\u4ECA\u5929\u6709 3 \u9053\u5230\u671F\u3002" },
    { keywords: ["\u7EC3\u9898", "\u5237\u9898", "\u8BAD\u7EC3", "\u51FA\u9898", "\u53D8\u5F0F"], route: "/practice", route_name: "\u7EC3\u9898\u4E2D\u5FC3", query: { kp: "\u5BFC\u6570" }, reply: "\u597D\uFF0C\u7ED9\u4F60\u5B89\u6392\u5BFC\u6570\u4E0E\u5355\u8C03\u6027\u7684 5 \u9898\u53D8\u5F0F\u8BAD\u7EC3\uFF0C\u7EA6 20 \u5206\u949F\u3002" },
    { keywords: ["\u62A5\u544A", "\u5B66\u60C5", "\u5206\u6790", "\u6700\u5F31", "\u8584\u5F31", "\u54EA\u90E8\u5206"], route: "/report", route_name: "\u5B66\u60C5\u62A5\u544A", query: {}, reply: "\u8FD9\u5468\u4F60\u7684\u8584\u5F31 Top1 \u662F\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027\uFF0812%\uFF09\uFF0C\u8BE6\u7EC6\u5206\u6790\u5728\u62A5\u544A\u9875\u3002", data_hint: { weak_top1: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", mastery: 0.12, composite_score: 67 } },
    { keywords: ["\u56FE\u8C31", "\u7248\u56FE", "\u77E5\u8BC6\u70B9", "\u8003\u70B9"], route: "/graph", route_name: "\u77E5\u8BC6\u56FE\u8C31", query: {}, reply: "\u4F60\u7684\u5B66\u4E60\u7248\u56FE\u5DF2\u638C\u63E1 12/52\uFF0C3 \u4E2A\u4E34\u5371\u8003\u70B9\u5728\u56FE\u8C31\u91CC\u6807\u7EA2\u4E86\u3002" },
    { keywords: ["\u6A21\u8003", "\u771F\u9898", "\u8003\u8BD5", "\u5957\u5377"], route: "/exam", route_name: "\u6A21\u62DF\u8003\u8BD5", query: {}, reply: "\u63A8\u8350\u5148\u505A 2024 \xB7 \u65B0\u8BFE\u6807 I \u5377\uFF0C\u9650\u65F6 120 \u5206\u949F\uFF0C\u505A\u5B8C\u81EA\u52A8\u5224\u5206\u3002" },
    { keywords: ["\u4F5C\u4E1A", "\u4EFB\u52A1"], route: "/tasks", route_name: "\u8BFE\u5802\u4EFB\u52A1", query: {}, reply: "\u738B\u8001\u5E08\u5E03\u7F6E\u7684 2 \u9879\u4F5C\u4E1A\u8FD8\u6CA1\u5B8C\u6210\uFF0C\u5E26\u4F60\u53BB\u4EFB\u52A1\u4E2D\u5FC3\u3002" },
    { keywords: ["\u73ED\u7EA7", "\u540C\u5B66"], route: "/class", route_name: "\u6211\u7684\u73ED\u7EA7", query: {}, reply: "\u9AD8\u4E8C\uFF083\uFF09\u73ED\u672C\u5468\u6D3B\u8DC3 42/48\uFF0C\u53BB\u770B\u770B\u73ED\u7EA7\u52A8\u6001\u5427\u3002" },
    { keywords: ["\u603B\u89C8", "\u9996\u9875", "\u4ECA\u5929\u5B66\u4EC0\u4E48"], route: "/overview", route_name: "\u5B66\u60C5\u603B\u89C8", query: {}, reply: "\u4ECA\u5929 3 \u4EF6\u4E8B\u5DF2\u4E3A\u4F60\u6392\u597D\uFF1A\u590D\u4E60\u9519\u9898\u3001\u5BFC\u6570\u53D8\u5F0F\u3001\u538B\u8F74\u6311\u6218\u3002" }
  ],
  miss: { matched: false, route: null, route_name: "", query: {}, reply: "" }
};
var loopProgress = {
  steps: [
    { key: "encounter", done: true, count: 1 },
    { key: "socratic", done: true, count: 4 },
    { key: "answer", done: true, count: 3 },
    { key: "judge", done: true, count: 3 },
    { key: "variant", done: true, count: 2 },
    { key: "record", done: false, count: 0 },
    { key: "action", done: false, count: 0 }
  ],
  done_count: 5,
  total: 7
};
var practiceGroupRecommend = {
  title: "\u5BFC\u6570\u4E0E\u5355\u8C03\u6027 \xB7 5 \u9898\u53D8\u5F0F\uFF08\u505A\u5B8C\u79BB\u5F00\u7EA2\u533A\uFF09",
  kp_code: "DR-02",
  kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
  count: 5,
  est_minutes: 20,
  mix: { easy: 3, medium: 2, hard: 1 },
  mastery_now: 0.12,
  mastery_forecast: 0.25,
  reason: "\u8FD9\u662F\u4F60\u5F53\u524D\u6700\u8584\u5F31\u7684\u77E5\u8BC6\u70B9\uFF08\u638C\u63E1\u5EA6 12%\uFF09\u3002\u8FD1 21 \u5929\u4F60\u5728\u8BE5\u8003\u70B9\u9519 7 \u9053\uFF0C\u6309 3:2:1 \u96BE\u5EA6\u914D\u6BD4\u8BAD\u7EC3\uFF0C\u9884\u8BA1\u5B8C\u6210\u540E\u638C\u63E1\u5EA6\u63D0\u5347\u5230 25%\uFF0C\u8131\u79BB\u7EA2\u533A\u3002"
};
var difficultyMix = {
  items: [
    { level: "easy", count: 3, ratio: 0.6 },
    { level: "medium", count: 2, ratio: 0.4 },
    { level: "hard", count: 1, ratio: 0.2 }
  ],
  explanation: '\u8FD1 21 \u5929\u4F60\u5728\u6613\u9898\u4E0A\u6B63\u786E\u7387 78%\u3001\u4E2D\u6863\u9898 41%\u3001\u96BE\u9898 12%\u3002\u6309"\u8E2E\u8E2E\u811A\u591F\u5F97\u7740"\u539F\u5219\uFF0C\u7ED9\u51FA 3:2:1 \u914D\u6BD4\uFF1A\u6613\u9898\u4FDD\u5E95\u4FE1\u5FC3\uFF0C\u4E2D\u6863\u9898\u4E3B\u653B\u7A81\u7834\uFF0C1 \u9053\u96BE\u9898\u62C9\u4F38\u4E0A\u9650\u3002'
};
var smartScore = {
  smart_score: 62,
  breakdown: { accuracy: 0.7, speed: 0.6, independence: 0.52 }
};
var practiceSummary = {
  upgraded: [
    { kp_code: "DR-02", kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", from: 0.12, to: 0.25 },
    { kp_code: "DR-01", kp_name: "\u5BFC\u6570\u6982\u5FF5\u4E0E\u51E0\u4F55\u610F\u4E49", from: 0.45, to: 0.52 }
  ],
  flat: [
    { kp_code: "HS-02", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", from: 0.72, to: 0.74 }
  ],
  downgraded: [],
  recommendation: "\u5BFC\u6570\u4E0E\u5355\u8C03\u6027\u5DF2\u79BB\u5F00\u7EA2\u533A\u8FB9\u7F18\uFF0C\u4F46\u8FD8\u4E0D\u7A33\u3002\u5EFA\u8BAE\u660E\u5929\u518D\u7EC3 3 \u9053\u4E2D\u6863\u53D8\u5F0F\u5DE9\u56FA\uFF0C\u5E76\u590D\u4E60\u4ECA\u5929\u505A\u9519\u7684 1 \u9053\u7AEF\u70B9\u6F0F\u5224\u9898\u3002"
};
var HEAT_LEVELS = [
  "lv4",
  "lv4",
  "lv3",
  "lv2",
  "lv3",
  "lv4",
  "empty",
  "lv3",
  "lv2",
  "decay",
  "lv3",
  "lv2",
  "lv4",
  "lv3",
  "lv2",
  "lv1",
  "lv3",
  "decay",
  "lv2",
  "lv3",
  "lv2",
  "decay",
  "lv1",
  "lv2",
  "lv3",
  "lv1",
  "empty",
  "lv4"
];
var memoryHeatmap = {
  weeks: 4,
  days: 7,
  cells: HEAT_LEVELS.map((level, i) => ({
    week: Math.floor(i / 7),
    weekday: i % 7,
    level,
    record_ids: level === "empty" ? [] : [`r${i + 1}`],
    count: level === "empty" ? 0 : 1
  }))
};
var dueQueue = {
  total: 3,
  items: [
    {
      record_id: "r1",
      seq: 1,
      question_preview: "\u6C42\u51FD\u6570 $f(x)=x^3-3x$ \u5728 $[-1,3]$ \u4E0A\u7684\u6700\u5927\u503C\u548C\u6700\u5C0F\u503C",
      kp_code: "DR-02",
      kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
      created_at: "2026-08-06T21:12:00Z",
      wrong_count: 2,
      review_count: 1,
      retrievability: 0.58,
      hours_to_forget: 3,
      urgency_label: "\u5373\u5C06\u9057\u5FD8"
    },
    {
      record_id: "r2",
      seq: 2,
      question_preview: "\u5224\u65AD\u51FD\u6570 $f(x)=x^3-3x$ \u7684\u5355\u8C03\u533A\u95F4",
      kp_code: "DR-02",
      kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
      created_at: "2026-08-05T20:40:00Z",
      wrong_count: 1,
      review_count: 1,
      retrievability: 0.64,
      hours_to_forget: 9,
      urgency_label: "\u4ECA\u65E5\u5FC5\u590D\u4E60"
    },
    {
      record_id: "r3",
      seq: 3,
      question_preview: "\u6C42 $y=2\\sin(2x+\\frac{\\pi}{3})$ \u7684\u5355\u8C03\u9012\u589E\u533A\u95F4",
      kp_code: "TG-02",
      kp_name: "\u4E09\u89D2\u51FD\u6570\u5355\u8C03\u6027",
      created_at: "2026-08-03T19:55:00Z",
      wrong_count: 1,
      review_count: 2,
      retrievability: 0.71,
      hours_to_forget: 21,
      urgency_label: "\u5EFA\u8BAE\u4ECA\u65E5\u5B8C\u6210"
    }
  ]
};
var mockGgb = {
  type: "ggb",
  view: "2d",
  caption: "\u629B\u7269\u7EBF\u5F00\u53E3\u53C2\u6570\u6F14\u793A",
  commands: [
    "# perspective: 2d",
    "# view: -6 -3 6 4",
    "a=Slider(0.3,2,0.1)",
    "f(x)=a*x^2",
    "P=Point(f)",
    "SetColor(f,40,60,120)",
    "SetLineThickness(f,4)",
    'SetCaption(a,"\u5F00\u53E3\u7CFB\u6570 a")',
    "ShowLabel(P,true)"
  ]
};
var errorDetailExt = {
  record_id: "r1",
  question_text: "\u6C42\u51FD\u6570 $f(x)=x^3-3x$ \u5728 $[-1,3]$ \u4E0A\u7684\u6700\u5927\u503C\u548C\u6700\u5C0F\u503C",
  kp_code: "DR-02",
  kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
  error_type: "logic",
  error_type_zh: "\u903B\u8F91\u758F\u6F0F",
  my_answer: "\u6700\u5927\u503C\u4E3A $f(-1)=2$\uFF0C\u6700\u5C0F\u503C\u4E3A $f(1)=-2$",
  correct_answer: "\u6700\u5927\u503C $f(3)=18$\uFF0C\u6700\u5C0F\u503C $f(1)=-2$",
  analysis: "\u6F0F\u5224\u533A\u95F4\u7AEF\u70B9 x=3\uFF1A\u95ED\u533A\u95F4\u6700\u503C\u5FC5\u987B\u6BD4\u8F83\u6240\u6709\u5019\u9009\u70B9\uFF08\u542B\u7AEF\u70B9\uFF09\u3002",
  created_at: "2026-08-06T21:12:00Z",
  entered_at: "2026-08-06T21:14:00Z",
  wrong_count: 2,
  review_count: 1,
  memory_stability: 4.2,
  retrievability: 0.58,
  fsrs_level: "decay",
  variants_hint: "\u5EFA\u8BAE\u51FA 2 \u9053\u53D8\u5F0F\uFF1A\u2460 \u6362\u6570\u5B57\uFF08\u6539\u4E09\u6B21\u51FD\u6570\u7CFB\u6570\uFF09\u2461 \u6362\u6761\u4EF6\uFF08\u6539\u5F00\u533A\u95F4\uFF0C\u8BA8\u8BBA\u7AEF\u70B9\u53D6\u4E0D\u5230\u7684\u60C5\u51B5\uFF09\u3002",
  image: [mockGgb]
};
var errorFilter = {
  items: [
    { record_id: "r1", question_preview: "\u6C42\u51FD\u6570 $f(x)=x^3-3x$ \u5728 $[-1,3]$ \u4E0A\u7684\u6700\u5927\u503C\u548C\u6700\u5C0F\u503C", kp_code: "DR-02", kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", error_type: "logic", stability: "critical", created_at: "2026-08-06T21:12:00Z" },
    { record_id: "r2", question_preview: "\u5224\u65AD\u51FD\u6570 $f(x)=x^3-3x$ \u7684\u5355\u8C03\u533A\u95F4", kp_code: "DR-02", kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", error_type: "concept", stability: "decaying", created_at: "2026-08-05T20:40:00Z" },
    { record_id: "r3", question_preview: "\u6C42 $y=2\\sin(2x+\\frac{\\pi}{3})$ \u7684\u5355\u8C03\u9012\u589E\u533A\u95F4", kp_code: "TG-02", kp_name: "\u4E09\u89D2\u51FD\u6570\u5355\u8C03\u6027", error_type: "calculation", stability: "stable", created_at: "2026-08-03T19:55:00Z" }
  ],
  total: 14,
  page: 1,
  size: 20
};
var reportHighlights = {
  items: [
    { icon: "\u26A1", title: "\u6570\u5217\u6C42\u548C \u7A81\u7834", desc: '"\u9519\u4F4D\u76F8\u51CF\u6CD5"\u6B63\u786E\u7387\u4ECE 22% \u2192 78%\uFF0C\u662F\u672C\u5468\u638C\u63E1\u5EA6\u63D0\u5347\u6700\u5927\u7684\u77E5\u8BC6\u70B9\u3002' },
    { icon: "\u{1F4DA}", title: "\u72EC\u7ACB\u89E3\u9898\u7387 \u63D0\u5347", desc: "\u4ECE 35% \u2192 52%\uFF0C\u8D85\u8FC7\u73ED\u7EA7\u5E73\u5747 47%\uFF0C\u770B\u63D0\u793A\u7684\u6B21\u6570\u660E\u663E\u53D8\u5C11\u4E86\u3002" },
    { icon: "\u{1F525}", title: "7 \u5929\u8FDE\u51FB \u4E0D\u95F4\u65AD", desc: "\u5E73\u5747\u6BCF\u5929\u5B66\u4E60 38 \u5206\u949F\uFF0C\u9519\u9898\u5165\u672C\u7387 100%\u3002" }
  ]
};
var reportWeakPoints = {
  items: [
    {
      kp_code: "DR-02",
      kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
      mastery: 0.12,
      level: "err",
      ai_reason: '7 \u9053\u9519\u9898\u4E2D 5 \u9053\u9519\u56E0\u662F"\u903B\u8F91\u758F\u6F0F"\u2014\u2014\u53CD\u590D\u6F0F\u5224\u95ED\u533A\u95F4\u7AEF\u70B9\uFF0C\u5C5E\u4E8E\u6B65\u9AA4\u5B8C\u6574\u6027\u95EE\u9898\u800C\u975E\u4E0D\u4F1A\u6C42\u5BFC\u3002',
      primary_action: { label: "\u7EC3 5 \u9898\u53D8\u5F0F", route: "/practice", minutes: 20 },
      secondary_action: { label: "\u770B\u9519\u9898\u5F52\u56E0", route: "/errors" }
    },
    {
      kp_code: "DR-01",
      kp_name: "\u5BFC\u6570\u6982\u5FF5\u4E0E\u51E0\u4F55\u610F\u4E49",
      mastery: 0.45,
      level: "warn",
      ai_reason: '\u5207\u7EBF\u65B9\u7A0B\u7C7B\u9898\u76EE\u5E38\u628A"\u5728\u67D0\u70B9"\u4E0E"\u8FC7\u67D0\u70B9"\u6DF7\u6DC6\uFF0C\u5C5E\u4E8E\u6982\u5FF5\u8FA8\u6790\u4E0D\u6E05\u3002',
      primary_action: { label: "\u5DE9\u56FA 3 \u9898", route: "/practice", minutes: 12 },
      secondary_action: { label: "\u5BF9\u8BDD\u8BB2\u89E3", route: "/dialog" }
    },
    {
      kp_code: "TG-02",
      kp_name: "\u4E09\u89D2\u51FD\u6570\u5355\u8C03\u6027",
      mastery: 0.38,
      level: "warn",
      ai_reason: "\u542B\u53C2\u5355\u8C03\u533A\u95F4\u8BA8\u8BBA\u65F6\u6F0F\u6389 k \u7684\u53D6\u503C\u8303\u56F4\uFF0C\u8BA1\u7B97\u7C7B\u9519\u56E0\u5360\u591A\u6570\u3002",
      primary_action: { label: "\u4E13\u9879 15 \u5206\u949F", route: "/practice", minutes: 15 },
      secondary_action: { label: "\u590D\u4E60\u5230\u671F\u9519\u9898", route: "/errors" }
    },
    {
      kp_code: "HS-02",
      kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027",
      mastery: 0.72,
      level: "ok",
      ai_reason: "\u6574\u4F53\u7A33\u5B9A\uFF0C\u4EC5\u62BD\u8C61\u51FD\u6570\u5355\u8C03\u6027\u8BC1\u660E\u5076\u6709\u5361\u58F3\uFF0C\u4FDD\u6301\u73B0\u6709\u8282\u594F\u5373\u53EF\u3002",
      primary_action: { label: "\u4FDD\u6301\u6BCF\u65E5 1 \u9898", route: "/practice", minutes: 8 },
      secondary_action: { label: "\u67E5\u770B\u56FE\u8C31", route: "/graph" }
    }
  ]
};
var masteryTrendForecast = {
  history: [
    { date: "2026-07-31", mastery: 0.41 },
    { date: "2026-08-01", mastery: 0.42 },
    { date: "2026-08-02", mastery: 0.43 },
    { date: "2026-08-03", mastery: 0.44 },
    { date: "2026-08-04", mastery: 0.45 },
    { date: "2026-08-05", mastery: 0.46 },
    { date: "2026-08-06", mastery: 0.48 },
    { date: "2026-08-07", mastery: 0.49 },
    { date: "2026-08-08", mastery: 0.5 },
    { date: "2026-08-09", mastery: 0.51 },
    { date: "2026-08-10", mastery: 0.52 },
    { date: "2026-08-11", mastery: 0.53 },
    { date: "2026-08-12", mastery: 0.54 },
    { date: "2026-08-13", mastery: 0.55 }
  ],
  forecast: [
    { date: "2026-08-14", mastery: 0.53 },
    { date: "2026-08-15", mastery: 0.52 },
    { date: "2026-08-16", mastery: 0.5 },
    { date: "2026-08-17", mastery: 0.49 },
    { date: "2026-08-18", mastery: 0.48 },
    { date: "2026-08-19", mastery: 0.47 },
    { date: "2026-08-20", mastery: 0.46 }
  ]
};
var errorDistribution = {
  items: [
    { type: "step_omission", type_zh: "\u6B65\u9AA4\u9057\u6F0F", count: 5, ratio: 0.36, parent_type: "logic" },
    { type: "concept_confusion", type_zh: "\u6982\u5FF5\u6DF7\u6DC6", count: 3, ratio: 0.21, parent_type: "concept" },
    { type: "sign_error", type_zh: "\u7B26\u53F7\u9519\u8BEF", count: 2, ratio: 0.14, parent_type: "calculation" },
    { type: "formula_misuse", type_zh: "\u516C\u5F0F\u8BEF\u7528", count: 2, ratio: 0.14, parent_type: "formula" },
    { type: "condition_misread", type_zh: "\u6761\u4EF6\u6F0F\u8BFB", count: 1, ratio: 0.07, parent_type: "reading" },
    { type: "range_ignored", type_zh: "\u5B9A\u4E49\u57DF\u5FFD\u7565", count: 1, ratio: 0.07, parent_type: "concept" }
  ],
  total: 14
};
var reportHonesty = {
  hint_count_week: 11,
  independent_rate_now: 0.52,
  independent_rate_prev: 0.35,
  fluctuation: 0.17,
  message: '\u672C\u5468\u4F60\u770B\u4E86 11 \u6B21\u63D0\u793A\uFF0C\u72EC\u7ACB\u89E3\u9898\u7387\u4ECE 35% \u63D0\u5347\u5230 52%\u2014\u2014\u8FD9\u662F\u771F\u5B9E\u8FDB\u6B65\uFF0C\u4E0D\u662F"\u770B\u7B54\u6848\u770B\u4F1A\u7684"\u3002',
  suggestion: '\u4E0B\u5468\u8BD5\u7740\u5728\u70B9"\u770B\u63D0\u793A"\u524D\u5148\u5199 2 \u5206\u949F\u8349\u7A3F\uFF0C\u54EA\u6015\u53EA\u5199\u534A\u884C\u601D\u8DEF\uFF0C\u72EC\u7ACB\u89E3\u9898\u7387\u8FD8\u80FD\u518D\u6DA8\u4E00\u622A\u3002'
};
var kgPie = {
  total: 52,
  mastered: { count: 12, ratio: 0.23 },
  consolidating: { count: 5, ratio: 0.1 },
  critical: { count: 3, ratio: 0.06 },
  unlearned: { count: 32, ratio: 0.61 },
  center_text: "\u5DF2\u638C\u63E1 12 / 52",
  eta: { to_50pct_weeks: 6, to_80pct_weeks: 18 }
};
var kgTree = {
  chapters: [
    {
      chap: "\u7B2C 1 \u7AE0",
      title: "\u51FD\u6570\u7684\u6982\u5FF5\u4E0E\u57FA\u672C\u521D\u7B49\u51FD\u6570",
      count_text: "2 / 6 \u5DF2\u638C\u63E1",
      nodes: [
        { kp_code: "HS-01", name: "\u51FD\u6570\u7684\u6982\u5FF5\u4E0E\u8868\u793A", mastery: 0.85, state: "mastered", shape: "circle" },
        { kp_code: "HS-02", name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", mastery: 0.72, state: "mastered", shape: "diamond" },
        { kp_code: "HS-03", name: "\u51FD\u6570\u7684\u5947\u5076\u6027", mastery: 0.56, state: "improving", shape: "circle" },
        { kp_code: "HS-04", name: "\u6307\u6570\u4E0E\u6307\u6570\u51FD\u6570", mastery: 0, state: "unlearned", shape: "circle" }
      ]
    },
    {
      chap: "\u7B2C 2 \u7AE0",
      title: "\u5BFC\u6570\u53CA\u5176\u5E94\u7528",
      count_text: "0 / 8 \u5DF2\u638C\u63E1",
      nodes: [
        { kp_code: "DR-01", name: "\u5BFC\u6570\u6982\u5FF5\u4E0E\u51E0\u4F55\u610F\u4E49", mastery: 0.45, state: "improving", shape: "diamond" },
        { kp_code: "DR-02", name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", mastery: 0.12, state: "weak", shape: "diamond" },
        { kp_code: "DR-03", name: "\u5BFC\u6570\u4E0E\u6781\u503C\u6700\u503C", mastery: 0.3, state: "weak", shape: "hex" },
        { kp_code: "DR-06", name: "\u5BFC\u6570\u4E0E\u4E0D\u7B49\u5F0F\u7EFC\u5408", mastery: 0, state: "unlearned", shape: "hex" }
      ]
    },
    {
      chap: "\u7B2C 3 \u7AE0",
      title: "\u4E09\u89D2\u51FD\u6570",
      count_text: "1 / 7 \u5DF2\u638C\u63E1",
      nodes: [
        { kp_code: "TG-01", name: "\u4EFB\u610F\u89D2\u4E0E\u5F27\u5EA6\u5236", mastery: 0.78, state: "mastered", shape: "circle" },
        { kp_code: "TG-02", name: "\u4E09\u89D2\u51FD\u6570\u5355\u8C03\u6027", mastery: 0.38, state: "weak", shape: "diamond" },
        { kp_code: "TG-03", name: "\u4E09\u89D2\u6052\u7B49\u53D8\u6362", mastery: 0.62, state: "improving", shape: "hex" }
      ]
    }
  ]
};
var kgNodeDeps = {
  kp_code: "DR-02",
  chain: [
    { kp_code: "DR-02", kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", mastery: 0.12, state: "weak" },
    { kp_code: "DR-01", kp_name: "\u5BFC\u6570\u6982\u5FF5\u4E0E\u51E0\u4F55\u610F\u4E49", mastery: 0.45, state: "improving" },
    { kp_code: "HS-02", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", mastery: 0.72, state: "mastered" },
    { kp_code: "HS-01", kp_name: "\u51FD\u6570\u7684\u6982\u5FF5\u4E0E\u8868\u793A", mastery: 0.85, state: "mastered" }
  ],
  weakest_prereq: "DR-01"
};
var kgNodeRecommend = {
  strategy: "prereq_first",
  reason: '\u524D\u7F6E"\u5BFC\u6570\u6982\u5FF5\u4E0E\u51E0\u4F55\u610F\u4E49"\u638C\u63E1\u5EA6\u4EC5 45%\uFF08<0.7\uFF09\uFF0C\u76F4\u63A5\u7EC3\u5355\u8C03\u6027\u5BB9\u6613\u5361\u5728\u5207\u7EBF/\u5B9A\u4E49\u8FA8\u6790\u4E0A\uFF0C\u5148\u628A\u524D\u7F6E\u8865\u5230 0.7 \u518D\u4E3B\u653B\u672C\u8282\u70B9\u3002',
  action_label: "\u5148\u8865\u524D\u7F6E \xB7 \u5BFC\u6570\u6982\u5FF5 3 \u9898",
  route: "/practice",
  minutes: 15
};
var today3 = {
  groups: [
    [
      { key: "review_due", title: "\u590D\u4E60 3 \u9053\u5230\u671F\u9519\u9898", why: "FSRS \u663E\u793A\u8FD9 3 \u9053\u8BB0\u5FC6\u5373\u5C06\u8870\u51CF\u5230 60% \u4EE5\u4E0B\uFF0C\u4ECA\u5929\u4E0D\u590D\u4E60\u5C31\u4F1A\u5FD8\u3002", est_minutes: 15, benefit: "\u4FDD\u4F4F\u5DF2\u5B66\u6210\u679C", route: "/errors", done: false },
      { key: "weak_variant", title: "\u5BFC\u6570\u4E0E\u5355\u8C03\u6027 5 \u9898\u53D8\u5F0F", why: "\u8584\u5F31 Top1\uFF0812%\uFF09\uFF0C\u505A\u5B8C\u9884\u8BA1\u63D0\u5347\u5230 25%\uFF0C\u8131\u79BB\u7EA2\u533A\u3002", est_minutes: 20, benefit: "\u8584\u5F31\u70B9\u7A81\u7834", route: "/practice", done: false },
      { key: "final_challenge", title: "\u538B\u8F74\u6311\u6218 1 \u9898", why: "\u51FD\u6570\u4E0E\u5BFC\u6570\u7EFC\u5408\u5927\u9898\u7B2C\u4E8C\u95EE\uFF0C\u62C9\u4F38\u4E0A\u9650\u3002", est_minutes: 12, benefit: "\u51B2\u523A\u9AD8\u5206\u6BB5", route: "/practice", done: false }
    ],
    [
      { key: "weak_second", title: "\u4E09\u89D2\u51FD\u6570\u5355\u8C03\u6027 3 \u9898", why: "\u6B21\u8584\u5F31\u70B9\uFF0838%\uFF09\uFF0C\u9519\u56E0\u591A\u4E3A\u7B26\u53F7\u8BA1\u7B97\u3002", est_minutes: 12, benefit: "\u5DE9\u56FA\u6B21\u8584\u5F31", route: "/practice", done: false },
      { key: "review_next", title: "\u9884\u4E60\u660E\u65E5\u5230\u671F 2 \u9053", why: "\u660E\u5929\u6709 2 \u9053\u9519\u9898\u8FDB\u5165\u590D\u4E60\u7A97\u53E3\uFF0C\u63D0\u524D\u505A\u4E0D\u5806\u79EF\u3002", est_minutes: 10, benefit: "\u51CF\u8F7B\u660E\u65E5\u8D1F\u62C5", route: "/errors", done: false },
      { key: "teacher_homework", title: "\u5B8C\u6210\u738B\u8001\u5E08\u4F5C\u4E1A", why: "\u672C\u5468\u4F5C\u4E1A\u622A\u6B62\u660E\u665A 22:00\uFF0C\u5DF2\u5B8C\u6210 1/2\u3002", est_minutes: 25, benefit: "\u8DDF\u4E0A\u73ED\u7EA7\u8FDB\u5EA6", route: "/tasks", done: false }
    ]
  ]
};
var scoreTrend = {
  score: 67,
  delta_week: 9,
  target: 75,
  daily: [
    { date: "2026-08-07", score: 58 },
    { date: "2026-08-08", score: 60 },
    { date: "2026-08-09", score: 61 },
    { date: "2026-08-10", score: 63 },
    { date: "2026-08-11", score: 64 },
    { date: "2026-08-12", score: 66 },
    { date: "2026-08-13", score: 67 }
  ]
};
var featureEntries = {
  entries: [
    { key: "errors", title: "\u9519\u9898\u672C", stat_text: "14 \u9053 \xB7 3 \u9053\u4ECA\u65E5\u5230\u671F", badge: "3", route: "/errors" },
    { key: "practice", title: "\u7EC3\u9898\u4E2D\u5FC3", stat_text: "\u4ECA\u65E5\u63A8\u8350 5 \u9898\u5BFC\u6570\u53D8\u5F0F", badge: "5", route: "/practice" },
    { key: "report", title: "\u5B66\u60C5\u62A5\u544A", stat_text: "\u7EFC\u5408\u5206 67 \xB7 \u5468\u73AF\u6BD4 +9", badge: "", route: "/report" },
    { key: "graph", title: "\u77E5\u8BC6\u56FE\u8C31", stat_text: "\u5DF2\u638C\u63E1 12 / 52 \xB7 3 \u4E34\u5371", badge: "", route: "/graph" },
    { key: "exam", title: "\u6A21\u62DF\u8003\u8BD5", stat_text: "2024 \u65B0\u8BFE\u6807 I \u5377\u5F85\u505A", badge: "\u65B0", route: "/exam" },
    { key: "tasks", title: "\u8BFE\u5802\u4EFB\u52A1", stat_text: "2 \u9879\u4F5C\u4E1A\u5F85\u5B8C\u6210", badge: "2", route: "/tasks" }
  ]
};
var classFeed = {
  days: 14,
  items: [
    { kind: "practice", actor_name: "\u738B\u6D69", text: "\u738B\u6D69 \u5B8C\u6210\u4E86\u4E00\u7EC4\u7EC3\u4E60\uFF0C\u5F97\u5206 80", created_at: iso(-60) },
    { kind: "event", event: "review_done", actor_name: "\u674E\u601D\u9896", text: "\u674E\u601D\u9896 \u5B8C\u6210\u4E86\u9519\u9898\u590D\u4E60", created_at: iso(-180) },
    { kind: "event", event: "exam_submit", actor_name: "\u5F20\u4E00\u51E1", text: "\u5F20\u4E00\u51E1 \u5B8C\u6210\u4E86\u4E00\u6B21\u6A21\u62DF\u8003\u8BD5", created_at: iso(-1500) },
    { kind: "practice", actor_name: "\u9648\u96E8\u6850", text: "\u9648\u96E8\u6850 \u5B8C\u6210\u4E86\u4E00\u7EC4\u7EC3\u4E60\uFF0C\u5F97\u5206 92", created_at: iso(-1560) },
    { kind: "member_join", actor_name: "\u8D75\u65B0\u5B87", text: "\u8D75\u65B0\u5B87 \u52A0\u5165\u4E86\u73ED\u7EA7", created_at: iso(-2880) }
  ]
};
var classHotErrors = {
  days: 30,
  items: [
    { kp_code: "DR-02", kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027", error_count: 23, member_count: 15, top_error_type: "logic" },
    { kp_code: "TG-02", kp_name: "\u4E09\u89D2\u51FD\u6570\u5355\u8C03\u6027", error_count: 14, member_count: 9, top_error_type: "calculation" },
    { kp_code: "HS-03", kp_name: "\u51FD\u6570\u7684\u5947\u5076\u6027", error_count: 9, member_count: 7, top_error_type: "concept" },
    { kp_code: "DR-03", kp_name: "\u5BFC\u6570\u4E0E\u6781\u503C\u6700\u503C", error_count: 7, member_count: 5, top_error_type: "reading" },
    { kp_code: "TG-03", kp_name: "\u4E09\u89D2\u6052\u7B49\u53D8\u6362", error_count: 5, member_count: 4, top_error_type: "formula" }
  ]
};
var resourceRecommend = {
  kp_code: "DR-02",
  kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
  mastery: 0.12,
  items: [
    { kind: "doc", title: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027\u8BB2\u4E49\uFF08\u542B\u7AEF\u70B9\u6F0F\u5224\u4E13\u9898\uFF09", doc_id: "doc_mock_dr02", reason: "\u77E5\u8BC6\u5E93\u4E2D\u4E0E\u300C\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027\u300D\u5173\u8054\u7684\u8BB2\u4E49" },
    { kind: "doc", title: "\u5355\u8C03\u6027\u8BA8\u8BBA\u4E2D\u7684\u5206\u7C7B\u8BA8\u8BBA\u601D\u60F3", doc_id: "doc_mock_dr02b", reason: "\u77E5\u8BC6\u5E93\u4E2D\u4E0E\u300C\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027\u300D\u5173\u8054\u7684\u8BB2\u4E49" },
    { kind: "exercise", title: "\u300C\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027\u300D\u5B9A\u5411\u7EC3\u4E60", route: "/practice?kp=DR-02", reason: "\u5F53\u524D\u638C\u63E1\u5EA6 12%\uFF0C\u5EFA\u8BAE\u505A\u4E00\u7EC4\u53D8\u5F0F\u9898\u5B9A\u5411\u7A81\u7834\uFF08\u7CFB\u7EDF\u63A8\u8350\uFF09" },
    { kind: "video", title: "\u300C\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027\u300D\u5FAE\u8BFE\u8BB2\u89E3", route: "/resources?kp=DR-02", reason: "\u7CFB\u7EDF\u63A8\u8350\uFF08\u89C6\u9891\u8D44\u6E90\u5E93\u63A5\u7EBF\u4E2D\uFF0C\u5148\u5360\u4F4D\uFF09" }
  ]
};
var assignmentsList = {
  total: 3,
  items: [
    {
      assignment_id: "asg_mock_01",
      title: "\u5BFC\u6570\u4E0E\u5355\u8C03\u6027 10 \u9898\u9650\u65F6\u7EC3",
      type: "quiz",
      deadline: iso(2880),
      status: "published",
      progress: { done: 4, total: 10 },
      overdue: false
    },
    {
      assignment_id: "asg_mock_02",
      title: "\u89C2\u770B\u300A\u4E09\u89D2\u6052\u7B49\u53D8\u6362\u300B\u53CC\u5E08\u8BFE\u5802\u56DE\u653E",
      type: "watch",
      deadline: iso(-1440),
      status: "published",
      progress: { done: 0, total: 1 },
      overdue: true
    },
    {
      assignment_id: "asg_mock_03",
      title: "\u51FD\u6570\u5947\u5076\u6027\u5355\u5143\u5C0F\u6D4B",
      type: "quiz",
      deadline: iso(7200),
      status: "published",
      progress: { done: 0, total: 8 },
      overdue: false
    }
  ]
};

// src/mock/questionBank.ts
var BANK = [
  // ---- 函数的单调性 MATH-101 ----
  { q_type: "choice", difficulty: "easy", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u51FD\u6570 $f(x)=x^2-2x$ \u7684\u5355\u8C03\u9012\u51CF\u533A\u95F4\u662F\uFF1F", options: ["$(-\\infty,1]$", "$[1,+\\infty)$", "$(-\\infty,2]$", "$[2,+\\infty)$"], answer: "A", answer_analysis: "\u6C42\u5BFC $f'(x)=2x-2$\uFF0C\u4EE4 $f'(x)<0$ \u5F97 $x<1$\uFF0C\u6545\u9012\u51CF\u533A\u95F4\u4E3A $(-\\infty,1]$\u3002" },
  { q_type: "choice", difficulty: "easy", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u4E0B\u5217\u51FD\u6570\u4E2D\uFF0C\u5728 $(0,+\\infty)$ \u4E0A\u5355\u8C03\u9012\u589E\u7684\u662F\uFF1F", options: ["$f(x)=-x$", "$f(x)=x^2$", "$f(x)=\\frac1x$", "$f(x)=-x^2$"], answer: "B", answer_analysis: "$x^2$ \u5728\u6B63\u533A\u95F4\u5355\u8C03\u9012\u589E\uFF1B$-x$ \u4E0E $\\frac1x$ \u9012\u51CF\uFF0C$-x^2$ \u5148\u589E\u540E\u51CF\u3002" },
  { q_type: "choice", difficulty: "easy", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u51FD\u6570 $f(x)=-x^2+4x$ \u7684\u5355\u8C03\u9012\u589E\u533A\u95F4\u662F\uFF1F", options: ["$(-\\infty,2]$", "$[2,+\\infty)$", "$(-\\infty,-2]$", "$[0,+\\infty)$"], answer: "A", answer_analysis: "\u5F00\u53E3\u5411\u4E0B\u7684\u629B\u7269\u7EBF\uFF0C\u5BF9\u79F0\u8F74 $x=2$\uFF0C\u5DE6\u4FA7\u9012\u589E\uFF0C\u6545\u4E3A $(-\\infty,2]$\u3002" },
  { q_type: "blank", difficulty: "easy", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u51FD\u6570 $f(x)=x^3$ \u5728 $\\mathbb{R}$ \u4E0A\u662F\u5355\u8C03____\u51FD\u6570\u3002\uFF08\u586B\u201C\u589E\u201D\u6216\u201C\u51CF\u201D\uFF09", answer: "\u589E", answer_analysis: "$f'(x)=3x^2\\ge 0$\uFF0C\u4EC5\u5728 $x=0$ \u53D6\u7B49\uFF0C\u6545 $f(x)$ \u5728 $\\mathbb{R}$ \u4E0A\u5355\u8C03\u9012\u589E\u3002" },
  { q_type: "blank", difficulty: "medium", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u51FD\u6570 $f(x)=x^3-3x$ \u5728\u533A\u95F4 $(1,+\\infty)$ \u4E0A\u662F\u5355\u8C03____\u51FD\u6570\u3002", answer: "\u589E", answer_analysis: "$f'(x)=3x^2-3=3(x-1)(x+1)>0$ \u5F53 $x>1$\uFF0C\u6545\u5355\u8C03\u9012\u589E\u3002" },
  { q_type: "blank", difficulty: "medium", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u82E5 $f(x)=x^3+ax$ \u5728 $\\mathbb{R}$ \u4E0A\u5355\u8C03\u9012\u589E\uFF0C\u5219\u5B9E\u6570 $a$ \u7684\u53D6\u503C\u8303\u56F4\u662F____\u3002", answer: "$a\\ge 0$", answer_analysis: "$f'(x)=3x^2+a\\ge 0$ \u6052\u6210\u7ACB $\\Rightarrow a\\ge 0$\u3002" },
  { q_type: "text", difficulty: "hard", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u5DF2\u77E5 $f(x)=x^3-3x$\uFF0C\u5224\u65AD\u5E76\u8BC1\u660E\u5176\u5728 $\\mathbb{R}$ \u4E0A\u7684\u5355\u8C03\u533A\u95F4\u3002", answer: "\u51CF\u533A\u95F4 $(-1,1)$\uFF0C\u589E\u533A\u95F4 $(-\\infty,-1)$ \u4E0E $(1,+\\infty)$", answer_analysis: "$f'(x)=3(x^2-1)$\uFF0C\u5217\u8868\u5206\u6790\u7B26\u53F7\u5373\u53EF\uFF1A$x<-1$ \u9012\u589E\uFF0C$-1<x<1$ \u9012\u51CF\uFF0C$x>1$ \u9012\u589E\u3002" },
  { q_type: "text", difficulty: "hard", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u5DF2\u77E5\u51FD\u6570 $f(x)=x^3-ax$ \u5728 $[1,+\\infty)$ \u5355\u8C03\u9012\u589E\uFF0C\u6C42 $a$ \u7684\u53D6\u503C\u8303\u56F4\u3002", answer: "$a\\le 3$", answer_analysis: "$f'(x)=3x^2-a\\ge 0$ \u5728 $[1,+\\infty)$ \u6052\u6210\u7ACB\uFF0C\u5373 $a\\le 3x^2$ \u5BF9 $x\\ge1$ \u6052\u6210\u7ACB\uFF0C$3x^2$ \u6700\u5C0F\u4E3A $3$\uFF0C\u6545 $a\\le 3$\u3002" },
  { q_type: "choice", difficulty: "medium", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u51FD\u6570 $f(x)=x^3-3x$ \u7684\u5355\u8C03\u9012\u51CF\u533A\u95F4\u662F\uFF1F", options: ["$(-1,1)$", "$(-\\infty,-1)$", "$(1,+\\infty)$", "$\\mathbb{R}$"], answer: "A", answer_analysis: "$f'(x)=3(x^2-1)<0$ \u5F53 $-1<x<1$\u3002" },
  { q_type: "choice", difficulty: "medium", kp_code: "MATH-101", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", question_text: "\u82E5 $f(x)=x^3+ax$ \u5728 $\\mathbb{R}$ \u4E0A\u5355\u8C03\u9012\u589E\uFF0C\u5B9E\u6570 $a$ \u7684\u53D6\u503C\u8303\u56F4\u662F\uFF1F", options: ["$a\\ge 0$", "$a\\le 0$", "$a>0$", "$a<0$"], answer: "A", answer_analysis: "$f'(x)=3x^2+a\\ge 0$ \u6052\u6210\u7ACB $\\Rightarrow a\\ge 0$\u3002" },
  // ---- 函数的奇偶性 MATH-102 ----
  { q_type: "choice", difficulty: "easy", kp_code: "MATH-102", kp_name: "\u51FD\u6570\u7684\u5947\u5076\u6027", question_text: "\u4E0B\u5217\u51FD\u6570\u4E2D\u4E3A\u5076\u51FD\u6570\u7684\u662F\uFF1F", options: ["$f(x)=x^2$", "$f(x)=x^3$", "$f(x)=x+1$", "$f(x)=\\frac1x$"], answer: "A", answer_analysis: "$f(-x)=(-x)^2=x^2=f(x)$\uFF0C\u6545\u4E3A\u5076\u51FD\u6570\uFF1B\u5176\u4F59\u4E09\u8005\u4E3A\u5947\u51FD\u6570\u6216\u975E\u5947\u975E\u5076\u3002" },
  { q_type: "blank", difficulty: "easy", kp_code: "MATH-102", kp_name: "\u51FD\u6570\u7684\u5947\u5076\u6027", question_text: "\u82E5 $f(x)$ \u662F\u5076\u51FD\u6570\u4E14 $f(2)=3$\uFF0C\u5219 $f(-2)$ \u7684\u503C\u4E3A____\u3002", answer: "3", answer_analysis: "\u5076\u51FD\u6570\u6EE1\u8DB3 $f(-x)=f(x)$\uFF0C\u6545 $f(-2)=f(2)=3$\u3002" },
  { q_type: "choice", difficulty: "medium", kp_code: "MATH-102", kp_name: "\u51FD\u6570\u7684\u5947\u5076\u6027", question_text: "\u82E5 $f(x)=x^2+bx$ \u662F\u5076\u51FD\u6570\uFF0C\u5219 $b$ \u7684\u503C\u4E3A\uFF1F", options: ["$0$", "$1$", "$2$", "$-1$"], answer: "A", answer_analysis: "\u5076\u51FD\u6570\u4E0D\u542B\u5947\u6B21\u9879\uFF0C$f(x)=x^2+bx$ \u9700 $b=0$\u3002" },
  { q_type: "blank", difficulty: "medium", kp_code: "MATH-102", kp_name: "\u51FD\u6570\u7684\u5947\u5076\u6027", question_text: "\u82E5 $f(x)=ax^3+bx+c$ \u662F\u5947\u51FD\u6570\uFF0C\u5219\u5E38\u6570 $c$ \u7684\u503C\u4E3A____\u3002", answer: "0", answer_analysis: "\u5947\u51FD\u6570 $f(0)=0$\uFF08\u5FC5\u8FC7\u539F\u70B9\uFF09\uFF0C\u5373 $a\\cdot0+b\\cdot0+c=0$\uFF0C\u6545 $c=0$\u3002" },
  // ---- 函数的基本性质 MATH-103 ----
  { q_type: "choice", difficulty: "easy", kp_code: "MATH-103", kp_name: "\u51FD\u6570\u7684\u57FA\u672C\u6027\u8D28", question_text: "\u51FD\u6570 $f(x)=|x|$ \u7684\u503C\u57DF\u662F\uFF1F", options: ["$[0,+\\infty)$", "$(-\\infty,0]$", "$\\mathbb{R}$", "$[0,1]$"], answer: "A", answer_analysis: "$|x|\\ge 0$ \u4E14\u53EF\u53D6\u5230\u4EFB\u610F\u975E\u8D1F\u5B9E\u6570\uFF0C\u503C\u57DF\u4E3A $[0,+\\infty)$\u3002" },
  { q_type: "blank", difficulty: "medium", kp_code: "MATH-103", kp_name: "\u51FD\u6570\u7684\u57FA\u672C\u6027\u8D28", question_text: "\u51FD\u6570 $f(x)=\\frac1x$ \u5728\u533A\u95F4 $(0,+\\infty)$ \u4E0A\u662F\u5355\u8C03____\u51FD\u6570\u3002", answer: "\u51CF", answer_analysis: "\u4EFB\u53D6 $0<x_1<x_2$\uFF0C$f(x_1)-f(x_2)=\\frac{1}{x_1}-\\frac{1}{x_2}=\\frac{x_2-x_1}{x_1x_2}>0$\uFF0C\u6545\u5355\u8C03\u9012\u51CF\u3002" },
  { q_type: "text", difficulty: "medium", kp_code: "MATH-103", kp_name: "\u51FD\u6570\u7684\u57FA\u672C\u6027\u8D28", question_text: "\u5224\u65AD\u5E76\u8BC1\u660E\u51FD\u6570 $f(x)=x+\\frac1x$ \u5728\u533A\u95F4 $(1,+\\infty)$ \u4E0A\u7684\u5355\u8C03\u6027\u3002", answer: "\u5355\u8C03\u9012\u589E", answer_analysis: "\u4EFB\u53D6 $1<x_1<x_2$\uFF0C$f(x_2)-f(x_1)=(x_2-x_1)(1-\\frac{1}{x_1x_2})>0$\uFF08\u56E0 $x_1x_2>1$\uFF09\uFF0C\u6545\u5355\u8C03\u9012\u589E\u3002" },
  { q_type: "text", difficulty: "hard", kp_code: "MATH-103", kp_name: "\u51FD\u6570\u7684\u57FA\u672C\u6027\u8D28", question_text: "\u6C42\u51FD\u6570 $f(x)=x^2-2x+3$ \u5728\u95ED\u533A\u95F4 $[0,3]$ \u4E0A\u7684\u6700\u5927\u3001\u6700\u5C0F\u503C\u3002", answer: "\u6700\u5927\u503C $6$\uFF0C\u6700\u5C0F\u503C $2$", answer_analysis: "\u5BF9\u79F0\u8F74 $x=1\\in[0,3]$\uFF0C$f(1)=2$\uFF1B\u7AEF\u70B9 $f(0)=3,\\ f(3)=6$\u3002\u6BD4\u8F83\u5F97\u6700\u5C0F $2$\u3001\u6700\u5927 $6$\u3002" },
  // ---- 集合与函数 MATH-001 ----
  { q_type: "choice", difficulty: "easy", kp_code: "MATH-001", kp_name: "\u96C6\u5408", question_text: "\u5DF2\u77E5 $A=\\{1,2,3\\}$\uFF0C$B=\\{2,3,4\\}$\uFF0C\u5219 $A\\cap B$ \u4E3A\uFF1F", options: ["$\\{2,3\\}$", "$\\{1,2,3,4\\}$", "$\\{1,4\\}$", "$\\varnothing$"], answer: "A", answer_analysis: "\u4EA4\u96C6\u53D6\u4E24\u96C6\u5408\u5171\u540C\u5143\u7D20 $2,3$\u3002" },
  { q_type: "blank", difficulty: "easy", kp_code: "MATH-001", kp_name: "\u96C6\u5408", question_text: "\u5DF2\u77E5 $A=\\{1,2\\}$\uFF0C$B=\\{2,3,4\\}$\uFF0C\u5219 $A\\cup B$ \u7684\u5143\u7D20\u4E2A\u6570\u4E3A____\u3002", answer: "4", answer_analysis: "\u5E76\u96C6 $\\{1,2,3,4\\}$\uFF0C\u5171 $4$ \u4E2A\u5143\u7D20\u3002" },
  { q_type: "choice", difficulty: "medium", kp_code: "MATH-001", kp_name: "\u96C6\u5408", question_text: "\u96C6\u5408 $A=\\{x\\mid x^2-3x+2=0\\}$ \u7B49\u4E8E\uFF1F", options: ["$\\{1,2\\}$", "$\\{-1,-2\\}$", "$\\{1,-2\\}$", "$\\varnothing$"], answer: "A", answer_analysis: "$x^2-3x+2=(x-1)(x-2)=0$\uFF0C\u4E24\u6839\u4E3A $1,2$\u3002" },
  { q_type: "text", difficulty: "medium", kp_code: "MATH-001", kp_name: "\u96C6\u5408", question_text: "\u5DF2\u77E5 $A=\\{x\\mid x>1\\}$\uFF0C$B=\\{x\\mid x\\le 3\\}$\uFF0C\u6C42 $A\\cup B$ \u4E0E $A\\cap B$\u3002", answer: "$A\\cup B=\\mathbb{R}$\uFF0C$A\\cap B=(1,3]$", answer_analysis: "$A$ \u4E3A $(1,+\\infty)$\uFF0C$B$ \u4E3A $(-\\infty,3]$\uFF1B\u5E76\u96C6\u8986\u76D6\u5168\u5B9E\u6570\uFF0C\u4EA4\u96C6\u4E3A $(1,3]$\u3002" }
];
var MONOTONICITY_BANK = BANK.filter((q) => q.kp_code === "MATH-101");
function shuffleChoice(q, seed2) {
  const opts = q.options ? [...q.options] : [];
  if (opts.length < 2) return q;
  const orig = q.answer.trim().toUpperCase();
  const origIdx = orig.charCodeAt(0) - 65;
  const correct = origIdx >= 0 && origIdx < opts.length ? opts[origIdx] : q.answer;
  let h = 1779033703;
  for (let k = 0; k < seed2.length; k++) {
    h = Math.imul(h ^ seed2.charCodeAt(k), 3432918353);
    h = h << 13 | h >>> 19;
  }
  const rand = () => {
    h = h + 1831565813 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const shuffled = [...opts];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newLetter = String.fromCharCode(65 + shuffled.indexOf(correct));
  return { ...q, options: shuffled, answer: newLetter };
}
function parametricMonotonicity(label) {
  const base = label % 6 - 3;
  const a = base || 1;
  const kp = {
    q_type: label % 3 === 0 ? "choice" : label % 3 === 1 ? "blank" : "text",
    difficulty: "easy",
    kp_code: "MATH-101",
    kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027",
    question_text: `\u8BBE\u51FD\u6570 $f(x)=x^3+${a}x$\uFF0C\u8BF7\u5199\u51FA\u5176\u5355\u8C03\u9012\u589E\u533A\u95F4\uFF08\u60C5\u5F62 ${label}\uFF09\u3002`,
    options: ["$(-\\infty,-\\sqrt{-\\frac{a}{3}})\\cup(\\sqrt{-\\frac{a}{3}},+\\infty)$", "$(-\\infty,+\\infty)$", "$(-\\infty,0)$", "$(0,+\\infty)$"],
    answer: "B",
    answer_analysis: `\u5F53 $a\\ge 0$ \u65F6 $f'(x)=3x^2+${3 * a}\\ge0$\uFF0C$f(x)$ \u5728 $\\mathbb{R}$ \u4E0A\u6052\u9012\u589E\uFF1B\u5F53 $a<0$ \u5206\u4E3A\u4E09\u6BB5\uFF0C\u4E24\u4FA7\u5355\u8C03\u9012\u589E\u3002`
  };
  return shuffleChoice(kp, `param-${label}`);
}
function buildQuizSet(params) {
  const count = Math.max(1, params.count);
  const scopeCodes = new Set(
    (params.knowledge_points || []).flatMap((kp) => {
      const hit = BANK.find((q) => q.kp_name === kp || q.kp_code === kp);
      return hit ? [hit.kp_code] : [];
    })
  );
  const pool = scopeCodes.size ? BANK.filter((q) => scopeCodes.has(q.kp_code)) : [...BANK];
  const easy = params.difficulty?.easy ?? 0.4;
  const medium = params.difficulty?.medium ?? 0.4;
  const hard = params.difficulty?.hard ?? 0.2;
  const rTotal = easy + medium + hard;
  const re = rTotal > 0 ? easy : 0.4;
  const rm = rTotal > 0 ? medium : 0.4;
  const rh = rTotal > 0 ? hard : 0.2;
  const denom = re + rm + rh;
  const slots = [];
  const diffOrder = ["easy", "medium", "hard"];
  let remaining = count;
  for (const d of diffOrder) {
    const base = d === "easy" ? re : d === "medium" ? rm : rh;
    const n = d === "hard" ? remaining : Math.round(count * (base / denom));
    for (let i = 0; i < n && remaining > 0; i++) {
      slots.push(d);
      remaining--;
    }
  }
  while (slots.length < count) slots.push("easy");
  const used = /* @__PURE__ */ new Set();
  const chosen = [];
  for (let i = 0; i < count; i++) {
    const wantDiff = slots[i];
    let pick = pool.find((q) => q.difficulty === wantDiff && !used.has(q.question_text));
    if (!pick) pick = pool.find((q) => !used.has(q.question_text));
    if (pick) {
      used.add(pick.question_text);
      chosen.push(shuffleChoice(pick, `gen-${i}`));
      continue;
    }
    let k = i;
    let variant = parametricMonotonicity(k);
    while (used.has(variant.question_text)) {
      k += 1;
      variant = parametricMonotonicity(k);
    }
    used.add(variant.question_text);
    chosen.push(variant);
  }
  return chosen;
}

// src/mock/teacherData.ts
var iso2 = (d = /* @__PURE__ */ new Date()) => d.toISOString();
var TEACHER_CLASSES = [
  { id: "c1", name: "\u9AD8\u4E8C\uFF083\uFF09\u73ED" },
  { id: "c2", name: "\u9AD8\u4E8C\uFF084\uFF09\u73ED" }
];
var ROSTER_NAMES = [
  "\u674E\u660A",
  "\u738B\u96E8\u6850",
  "\u5F20\u5B50\u58A8",
  "\u9648\u601D\u777F",
  "\u5218\u4E00\u9E23",
  "\u8D75\u6B23\u6021",
  "\u5B59\u53EF",
  "\u5468\u5B87\u822A",
  "\u5434\u6B23\u7136",
  "\u90D1\u7693\u5B87",
  "\u51AF\u82E5\u5F64",
  "\u848B\u660E\u8F69",
  "\u97E9\u9732",
  "\u6768\u5B50\u822A",
  "\u4F55\u9759\u6021",
  "\u9AD8\u5929",
  "\u6797\u6653",
  "\u7F57\u5B87\u8F69",
  "\u6881\u96EA",
  "\u5B8B\u658C",
  "\u5510\u5FC3\u6021",
  "\u90D1\u695A\u4EEA",
  "\u738B\u6893\u8431",
  "\u51AF\u81F4\u8FDC",
  "\u9648\u66E6",
  "\u891A\u5929\u7FFC",
  "\u536B\u8BD7\u96C5",
  "\u848B\u6587\u535A",
  "\u6C88\u6708",
  "\u97E9\u660E\u6D69",
  "\u6768\u82E5\u66E6",
  "\u6731\u5B50\u8C6A",
  "\u79E6\u6653\u5CF0",
  "\u5C24\u4F73\u742A",
  "\u8BB8\u535A\u6587",
  "\u4F55\u9759\u59DD",
  "\u5415\u661F\u8FB0",
  "\u65BD\u96E8\u6CFD",
  "\u5F20\u82E5\u6960",
  "\u5B54\u7EF4\u54F2",
  "\u66F9\u4FCA\u6770",
  "\u4E25\u96E8\u6B23",
  "\u534E\u5B50\u58A8",
  "\u91D1\u6668\u66E6",
  "\u9B4F\u6CFD\u6977",
  "\u9676\u601D\u8FDC"
];
function todayData() {
  const now = Date.now();
  const lessonStarts = /* @__PURE__ */ new Date();
  lessonStarts.setHours(10, 10, 0, 0);
  if (lessonStarts.getTime() < now) lessonStarts.setDate(lessonStarts.getDate() + 1);
  return {
    next_lesson: {
      class_id: "c1",
      topic: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
      class_name: "\u9AD8\u4E8C\uFF083\uFF09\u73ED \xB7 46 \u4EBA",
      starts_at: iso2(lessonStarts),
      prep_completion: 70,
      missing_items: ["\u8FB9\u754C\u53CD\u4F8B", "Exit Ticket"],
      duration_minutes: 45
    },
    // 数量与批改队列保持一致（见 gradingQueue()，SSOT=21 份）
    grading_queue: { count: gradingQueue().length, action: "open_grading" },
    deadlines: [
      { id: "d1", kind: "assignment", title: "\u5BFC\u6570\u5DE9\u56FA\u7EC3\u4E60", due_at: iso2(new Date(now + 864e5)) },
      { id: "d2", kind: "video", title: "\u53C2\u6570\u5206\u7C7B\u8BA8\u8BBA\u7247\u6BB5 \xB7 7 \u4EBA\u672A\u5B8C\u6210", due_at: iso2(new Date(now + 864e5)) },
      { id: "d3", kind: "grade_review", title: "\u6210\u7EE9\u590D\u6838 1 \u6761", due_at: iso2(new Date(now + 864e5)) }
    ],
    actionable_insights: [
      {
        insight_id: "ins-1",
        kind: "mastery_drop",
        summary: "17/46 \u4EBA\u8FDE\u7EED\u4E24\u6B21\u5728\u53C2\u6570\u8FB9\u754C a=0 \u5931\u5206",
        evidence: "\u6628\u665A\u4F5C\u4E1A 11 \u4EBA\u3001\u672C\u5468\u5468\u6D4B 13 \u4EBA\u51FA\u73B0\u540C\u7C7B\u9519\u8BEF\uFF0C\u5176\u4E2D 7 \u4EBA\u91CD\u590D\u51FA\u73B0\uFF1B\u660E\u5929\u7B2C 3 \u8282\u6B63\u597D\u8BB2\u5BFC\u6570\u5206\u7C7B\u8BA8\u8BBA\u3002",
        data_window: { from: iso2(new Date(now - 7 * 864e5)), to: iso2() },
        recommended_actions: ["\u52A0\u5165\u4E0B\u8282\u8BFE", "\u51FA\u5DE9\u56FA\u9898", "\u770B\u5178\u578B\u4F5C\u7B54"]
      },
      {
        insight_id: "ins-2",
        kind: "queue_pressure",
        summary: "\u5BFC\u6570\u5468\u6D4B\u5F85\u786E\u8BA4\u4F5C\u7B54\u9700\u8981\u6309\u9898\u96C6\u4E2D\u6279\u9605",
        evidence: "\u4E3B\u89C2\u9898\u9700\u8981\u9010\u4EFD\u6838\u5BF9\u8BC4\u5206\u70B9\uFF1B\u6309\u9898\u5206\u6279\u9884\u8BA1\u66F4\u5FEB\u3002",
        data_window: { from: iso2(new Date(now - 2 * 864e5)), to: iso2() },
        recommended_actions: ["\u53BB\u6279\u6539"]
      }
    ],
    degraded: false
  };
}
function classInsights(classId) {
  const now = Date.now();
  return [
    {
      insight_id: `ins-${classId}-1`,
      kind: "error_cluster",
      summary: "a=0 \u8FB9\u754C\u8FDE\u7EED\u4E24\u6B21\u5931\u5206\u96C6\u4E2D",
      evidence: "17/46 \u4EBA\u5728\u6700\u8FD1\u4E24\u6B21\u4F5C\u4E1A\u7684 a=0 \u8FB9\u754C\u9898\u5931\u5206\u3002",
      data_window: { from: iso2(new Date(now - 7 * 864e5)), to: iso2() },
      recommended_actions: ["\u5E03\u7F6E\u53D8\u5F0F\u7EC3\u4E60", "\u770B\u5178\u578B\u9519\u8BEF"],
      kp_code: "\u51FD\u6570\u7684\u5355\u8C03\u6027"
    },
    {
      insight_id: `ins-${classId}-2`,
      kind: "review_backlog",
      summary: "21 \u4EFD\u4F5C\u7B54\u5F85\u6559\u5E08\u786E\u8BA4",
      evidence: "\u4E3B\u89C2\u9898\u5EFA\u8BAE\u6309\u9898\u6279\u6539\uFF0C\u9010\u4EFD\u786E\u8BA4\u540E\u5199\u5165\u6B63\u5F0F\u6210\u7EE9\u3002",
      data_window: { from: iso2(new Date(now - 3 * 864e5)), to: iso2() },
      recommended_actions: ["\u53BB\u6279\u6539\u8FD9\u4E9B\u4F5C\u7B54"]
    },
    {
      insight_id: `ins-${classId}-3`,
      kind: "low_mastery",
      summary: "\u51FD\u6570\u7684\u5947\u5076\u6027\u638C\u63E1\u504F\u5F31",
      evidence: "\u8BE5\u77E5\u8BC6\u70B9\u6700\u8FD1\u7EC3\u4E60\u6B63\u786E\u7387 58%\uFF0C\u4F4E\u4E8E\u73ED\u5747 16 \u4E2A\u767E\u5206\u70B9\u3002",
      data_window: { from: iso2(new Date(now - 7 * 864e5)), to: iso2() },
      recommended_actions: ["\u5E03\u7F6E\u9488\u5BF9\u6027\u7EC3\u4E60"],
      kp_code: "\u51FD\u6570\u7684\u5947\u5076\u6027"
    },
    {
      insight_id: `ins-${classId}-4`,
      kind: "submission_trend",
      summary: "\u672C\u5468\u4F5C\u4E1A\u63D0\u4EA4\u7387\u4E0B\u964D",
      evidence: "\u63D0\u4EA4\u7387\u7531 93% \u964D\u81F3 80%\u3002",
      data_window: { from: iso2(new Date(now - 7 * 864e5)), to: iso2() },
      recommended_actions: ["\u67E5\u770B\u4F5C\u4E1A\u4E0E\u63D0\u4EA4"]
    }
  ];
}
function lessonArtifact(classId, topic, requirements) {
  const refs = [{ kind: "kb", ref: "kb://resource/301", title: "\u6559\u6750\u793A\u4F8B", page: 12, snippet: "\u51FD\u6570\u5355\u8C03\u6027\u5B9A\u4E49\u4E0E\u5224\u5B9A" }];
  const segments = [
    {
      id: "seg-1",
      title: "\u590D\u4E60\u5BFC\u5165\uFF08\u8BA4\u77E5\u51B2\u7A81\uFF09",
      duration_min: 5,
      kind: "import",
      learning_objective: "\u56DE\u987E\u5BFC\u6570\u7684\u51E0\u4F55\u610F\u4E49\u4E0E\u5355\u8C03\u6027\u5B9A\u4E49\uFF0C\u5F15\u51FA\u5224\u5B9A\u4E09\u6B21\u51FD\u6570\u5355\u8C03\u6027\u7684\u56F0\u96BE\uFF0C\u5F62\u6210\u8BA4\u77E5\u51B2\u7A81\u3002",
      teacher_action: "\u63D0\u95EE y=x\xB2 \u7684\u5355\u8C03\u6027\u53EF\u7528\u56FE\u50CF\u6CD5/\u5B9A\u4E49\u6CD5\u5224\u5B9A\uFF0C\u518D\u629B\u51FA\u4E09\u6B21\u51FD\u6570\u5B9A\u4E49\u6CD5\u7E41\u7410\u3001\u753B\u4E0D\u51FA\u56FE\u50CF\uFF0C\u5F15\u53D1\u8BA4\u77E5\u51B2\u7A81\u3002",
      student_action: "\u72EC\u7ACB\u5224\u5B9A\u4E8C\u6B21\u51FD\u6570\u5355\u8C03\u6027\uFF1B\u5C1D\u8BD5\u4E09\u6B21\u51FD\u6570\u540E\u9047\u5230\u56F0\u96BE\u3002",
      core_question: "\u4E09\u6B21\u51FD\u6570\u65E0\u6CD5\u7B80\u4FBF\u5224\u5B9A\u5355\u8C03\u6027\uFF0C\u80FD\u5426\u7528\u5BFC\u6570\u89E3\u51B3\uFF1F",
      content: "\u590D\u4E60\u5BFC\u6570\u7684\u51E0\u4F55\u610F\u4E49\uFF1B\u4ECE\u4E8C\u6B21\u51FD\u6570\u5224\u5B9A\u5165\u624B\uFF0C\u5F15\u51FA\u4E09\u6B21\u51FD\u6570\u5224\u5B9A\u7684\u8BA4\u77E5\u51B2\u7A81\u3002",
      assessment_check: '\u89C2\u5BDF\u5B66\u751F\u80FD\u5426\u8BF4\u51FA"\u5BFC\u6570\u51E0\u4F55\u610F\u4E49=\u5207\u7EBF\u659C\u7387"\u3002',
      source: "adapted",
      locked: false
    },
    {
      id: "seg-2",
      title: "\u65B0\u77E5\u63A2\u7A76\uFF1A\u5BFC\u51FD\u6570\u6B63\u8D1F\u4E0E\u5355\u8C03\u6027",
      duration_min: 10,
      kind: "concept",
      learning_objective: "\u901A\u8FC7\u5177\u4F53\u51FD\u6570\u56FE\u50CF\uFF0C\u5F52\u7EB3\u51FA\u533A\u95F4\u5185 f'(x)>0 \u5355\u8C03\u9012\u589E\u3001f'(x)<0 \u5355\u8C03\u9012\u51CF\u3001f'(x)=0 \u5E38\u51FD\u6570\u3002",
      teacher_action: "\u5C55\u793A 4 \u4E2A\u5177\u4F53\u51FD\u6570\u56FE\u50CF\uFF0C\u5F15\u5BFC\u5B66\u751F\u4ECE\u7279\u6B8A\u5230\u4E00\u822C\u5F52\u7EB3\uFF1B\u8865\u5145 f'(x)=0 \u4E3A\u5E38\u51FD\u6570\u3002",
      student_action: "\u89C2\u5BDF\u56FE\u50CF\uFF0C\u5C0F\u7EC4\u8BA8\u8BBA\uFF0C\u731C\u60F3\u5355\u8C03\u6027\u4E0E\u5BFC\u6570\u6B63\u8D1F\u7684\u5173\u7CFB\u3002",
      core_question: "\u5355\u8C03\u6027\u4E0E\u5BFC\u51FD\u6570\u6B63\u8D1F\u6709\u4F55\u5173\u7CFB\uFF1F\u8BE5\u89C4\u5F8B\u662F\u5426\u5177\u6709\u4E00\u822C\u6027\uFF1F",
      content: "\u901A\u8FC7 4 \u4E2A\u51FD\u6570\u56FE\u50CF\u89C2\u5BDF\u5BFC\u51FD\u6570\u6B63\u8D1F\u4E0E\u5355\u8C03\u6027\u5173\u7CFB\uFF0C\u5F52\u7EB3\u4E00\u822C\u6027\u7ED3\u8BBA\u3002",
      materials: [{ resource_id: "r2", name: "\u51FD\u6570\u5355\u8C03\u6027.pdf", usage: "\u8BFE\u5802\u6295\u5F71\u7247 4 \u5E45\u51FD\u6570\u56FE\u50CF" }],
      assessment_check: "\u968F\u5802\u53E3\u5934\u63D0\u95EE\uFF1Af'(x)>0 \u662F\u5426\u4E00\u5B9A\u5355\u8C03\u9012\u589E\u3002",
      source: "adapted",
      locked: false
    },
    {
      id: "seg-3",
      title: "\u7406\u89E3\u65B0\u77E5\uFF1A\u51E0\u4F55\u610F\u4E49\u9A8C\u8BC1",
      duration_min: 5,
      kind: "concept",
      learning_objective: "\u7528\u5BFC\u6570\u7684\u51E0\u4F55\u610F\u4E49\uFF08\u5207\u7EBF\u659C\u7387\u65B9\u5411\uFF09\u9A8C\u8BC1\u4E00\u822C\u6027\u7ED3\u8BBA\u3002",
      teacher_action: '\u7528\u5207\u7EBF"\u5DE6\u4E0B\u53F3\u4E0A/\u5DE6\u4E0A\u53F3\u4E0B"\u65B9\u5411\u6F14\u793A\u9A8C\u8BC1\u7ED3\u8BBA\u3002',
      student_action: "\u5728\u5B66\u6848\u6807\u6CE8\u5207\u7EBF\u65B9\u5411\u4E0E\u5355\u8C03\u6027\u5BF9\u5E94\u3002",
      core_question: "\u4E3A\u4EC0\u4E48\u5207\u7EBF\u659C\u7387\u4E3A\u6B63\u65F6\u51FD\u6570\u9012\u589E\uFF1F",
      content: "\u7528\u5207\u7EBF\u659C\u7387\u65B9\u5411\u9A8C\u8BC1\u5355\u8C03\u6027\u7ED3\u8BBA\u3002",
      assessment_check: "\u8BFE\u5802\u7EC3\u4E60 1\uFF08\u57FA\u7840\u5224\u5B9A\uFF09\u3002",
      source: "adapted",
      locked: false
    },
    {
      id: "seg-4",
      title: "\u4F8B\u9898 1\uFF1A\u6C42\u5355\u8C03\u533A\u95F4",
      duration_min: 10,
      kind: "example",
      learning_objective: `\u638C\u63E1"\u6C42\u5B9A\u4E49\u57DF\u2192\u6C42\u5BFC\u2192\u89E3f'(x)>0/<0\u2192\u5199\u5355\u8C03\u533A\u95F4"\u7684\u6807\u51C6\u6B65\u9AA4\u3002`,
      teacher_action: '\u793A\u8303\u4F8B 1\uFF08\u7531\u5BFC\u51FD\u6570\u7B26\u53F7\u753B\u5927\u81F4\u56FE\u50CF\uFF09\uFF1B\u677F\u4E66\u5178\u578B"\u6F0F\u5B9A\u4E49\u57DF"\u9519\u8BEF\uFF0C\u7EC4\u7EC7\u5B66\u751F\u8FA8\u6790\u3002',
      student_action: "\u72EC\u7ACB\u5B8C\u6210\u4F8B 1\uFF0C\u5BF9\u7167\u6807\u51C6\u6B65\u9AA4\u6838\u5BF9\u3002",
      core_question: "\u6C42\u5355\u8C03\u533A\u95F4\u65F6\u9057\u6F0F\u5B9A\u4E49\u57DF\u4F1A\u600E\u6837\uFF1F",
      content: "\u4F8B1\uFF08\u5BFC\u51FD\u6570\u7B26\u53F7\u753B\u56FE\u50CF\uFF09\u3001\u4F8B2\uFF08\u6C42\u5355\u8C03\u533A\u95F4\uFF09\uFF1B\u5F3A\u8C03\u5B9A\u4E49\u57DF\u662F\u6BCF\u6B65\u524D\u63D0\u3002",
      materials: [{ resource_id: "r1", name: "\u5BFC\u6570\u6559\u6848.docx", usage: "\u4F8B\u9898\u7F16\u53F7\u5BF9\u7167" }],
      assessment_check: "\u968F\u5802 2 \u9898\u9650\u65F6\u7EC3\u3002",
      source: "adapted",
      locked: false
    },
    {
      id: "seg-5",
      title: "\u4F8B\u9898 2\uFF1A\u53C2\u6570\u8FB9\u754C\u5206\u7C7B\u8BA8\u8BBA\uFF08\u672C\u73ED\u75DB\u70B9\uFF09",
      duration_min: 12,
      kind: "intervention",
      learning_objective: "\u638C\u63E1\u542B\u53C2\u65F6\u5BF9\u53C2\u6570 a \u5206\u7C7B\u8BA8\u8BBA\uFF08a=0 \u8FB9\u754C\uFF09\uFF0C\u56DE\u5E94\u672C\u73ED 17/46 \u4EBA\u8FDE\u7EED\u4E24\u6B21\u5931\u5206\u3002",
      teacher_action: "\u8BB2\u4F8B 3\uFF08\u542B\u53C2\u6570\u6C42\u5355\u8C03\u533A\u95F4\uFF09\u65F6\u6F14\u793A\u4E09\u6BB5\u5206\u7C7B\u4F9D\u636E\uFF1A\u4E8C\u6B21\u9879\u7CFB\u6570\u542B\u53C2\u3001\u9A7B\u70B9\u662F\u5426\u5728\u5B9A\u4E49\u57DF\u5185\u3001\u6839\u7684\u5927\u5C0F\u4E0E\u5206\u5E03\uFF1B\u91CD\u70B9\u8FA8\u6790 a=0\u3002",
      student_action: "7 \u540D\u91CD\u590D\u51FA\u9519\u5B66\u751F\u91CD\u70B9\u6F14\u677F\uFF1B\u5168\u73ED\u6838\u5BF9 a=0 \u8FB9\u754C\u60C5\u51B5\u3002",
      core_question: "\u53C2\u6570 a \u4E3A\u4F55\u8981\u5206 a=0 \u4E0E a\u22600\uFF1F",
      content: "\u542B\u53C2\u51FD\u6570\u5355\u8C03\u533A\u95F4\u8BA8\u8BBA\uFF1A\u4E8C\u6B21\u9879\u7CFB\u6570\u662F\u5426\u4E3A 0 \u2192 \u5224\u522B\u5F0F \u2192 \u4E24\u6839\u5927\u5C0F\u3002",
      assessment_check: "\u9650\u65F6 3 \u5206\u949F\u72EC\u7ACB\u5B8C\u6210\u4E00\u9053\u542B\u53C2\u9898\u3002",
      linked_insights: ["ins-1"],
      // 依据 a=0 失分洞察（teacher-ground-truth/GRADING_REAL_WORLD.md 采分点映射）
      source: "ai_suggested",
      locked: false
    },
    {
      id: "seg-6",
      title: "\u8BFE\u5802\u5C0F\u7ED3",
      duration_min: 3,
      kind: "summary",
      learning_objective: '\u603B\u7ED3"\u6C42\u5355\u8C03\u533A\u95F4\u56DB\u6B65\u6CD5"\u4E0E"\u6570\u5F62\u7ED3\u5408/\u4ECE\u7279\u6B8A\u5230\u4E00\u822C"\u601D\u60F3\u65B9\u6CD5\u3002',
      teacher_action: "\u5E08\u751F\u5171\u540C\u603B\u7ED3\u7B97\u6CD5\u6B65\u9AA4\u4E0E\u65B9\u6CD5\u601D\u60F3\u3002",
      student_action: "\u5404\u81EA\u590D\u8FF0\u56DB\u6B65\u6CD5\u5E76\u4FEE\u6B63\u7B14\u8BB0\u3002",
      core_question: "\u4ECA\u5929\u4F60\u5B66\u5230\u4E86\u54EA\u56DB\u6B65\uFF1F",
      content: "\u77E5\u8BC6\u603B\u7ED3\uFF08\u56DB\u6B65\u6CD5\uFF09+ \u65B9\u6CD5\u603B\u7ED3\uFF08\u6570\u5F62\u7ED3\u5408\uFF09\u3002",
      assessment_check: "\u53E3\u5934\u590D\u8FF0\u3002",
      source: "template",
      locked: false
    }
  ];
  return {
    artifact_id: "art-lesson-1",
    artifact_type: "lesson_plan",
    scene: "teacher.prep",
    class_id: classId,
    owner_id: "t1",
    status: "draft",
    version: 1,
    engine: "local",
    content: {
      topic,
      objectives: ["\u7406\u89E3\u51FD\u6570\u5355\u8C03\u6027\u7684\u6982\u5FF5", "\u638C\u63E1\u5355\u8C03\u6027\u5224\u5B9A\u65B9\u6CD5", "\u4F1A\u7528\u5BFC\u6570\u6C42\u5355\u8C03\u533A\u95F4\u5E76\u8BA8\u8BBA\u542B\u53C2\u60C5\u5F62"],
      segments,
      materials: ["\u51FD\u6570\u5355\u8C03\u6027.pdf", "\u5BFC\u6570\u6559\u6848.docx"],
      assignment: "\u5B8C\u6210\u5DE9\u56FA\u7EC3\u4E60 3 \u9898\uFF08\u57FA\u7840 2 + \u63D0\u5347\u542B\u53C2 1\uFF09"
    },
    source_refs: refs,
    warnings: requirements ? [] : ["\u672A\u586B\u5199\u6539\u7F16\u8981\u6C42"],
    degraded: !requirements,
    created_at: iso2(),
    updated_at: iso2()
  };
}
function quizArtifact(kps, count, opts = {}) {
  const requests = { ...opts, count, knowledge_points: kps.length ? kps : opts?.knowledge_points };
  const drawn = buildQuizSet(requests);
  const items = drawn.map((q, i) => ({
    item_no: i + 1,
    q_type: q.q_type,
    difficulty: q.difficulty,
    kp_code: q.kp_code,
    kp_name: q.kp_name,
    question_text: q.question_text,
    options: q.options ? [...q.options] : void 0,
    answer: q.answer,
    answer_analysis: q.answer_analysis,
    // 来源如实标注（内容资产清单 TC-L3-E02）：本地题库统一「本地样例」，真题来源由 realQuestionAdapter/后端覆盖
    source: q.source || "\u672C\u5730\u6837\u4F8B",
    source_ref: q.source_ref
  }));
  return {
    artifact_id: "art-quiz-1",
    artifact_type: "quiz_set",
    scene: "teacher.assessment",
    class_id: "c1",
    owner_id: "t1",
    status: "draft",
    version: 1,
    engine: "local",
    content: { knowledge_points: kps, count: items.length, difficulty: { easy: 0.4, medium: 0.4, hard: 0.2 }, items, duplicated: 0, insufficient: false },
    source_refs: [],
    warnings: [],
    degraded: false,
    created_at: iso2(),
    updated_at: iso2()
  };
}
var QUEUE_NAMES = [
  "\u674E\u660A",
  "\u738B\u96E8\u6850",
  "\u5F20\u5B50\u58A8",
  "\u9648\u601D\u777F",
  "\u5218\u4E00\u9E23",
  "\u8D75\u6B23\u6021",
  "\u5B59\u53EF",
  "\u5468\u5B87\u822A",
  "\u5434\u6B23\u7136",
  "\u90D1\u7693\u5B87",
  "\u51AF\u82E5\u5F64",
  "\u848B\u660E\u8F69",
  "\u97E9\u9732",
  "\u6768\u5B50\u822A",
  "\u4F55\u9759\u6021",
  "\u9AD8\u5929",
  "\u6797\u6653",
  "\u7F57\u5B87\u8F69",
  "\u6881\u96EA",
  "\u5B8B\u658C",
  "\u5510\u5FC3\u6021"
];
function gradingQueue() {
  const confirmedIdx = [16, 17, 18, 19, 20];
  return QUEUE_NAMES.map((name, i) => {
    const confirmed = confirmedIdx.includes(i);
    const isLow = !confirmed && [1, 6, 9, 12, 14].includes(i);
    return {
      submission_item_id: `si-${i + 1}`,
      student_label: name,
      status: confirmed ? "confirmed" : isLow ? "low_confidence" : "unprocessed",
      confidence: confirmed ? 0.85 : isLow ? 0.42 : 0.92,
      suggestion_score: confirmed ? [7, 8, 6, 9, 5][i % 5] : isLow ? 2 : [8, 9, 7, 10][i % 4],
      teacher_final_score: confirmed ? [7, 8, 6, 9, 5][i % 5] : null
    };
  });
}
function gradingDetail(item) {
  return {
    ...item,
    assignment_title: "\u51FD\u6570\u7684\u5355\u8C03\u6027\u5DE9\u56FA\u7EC3\u4E60",
    question_text: "\u5DF2\u77E5\u51FD\u6570 f(x)=x\xB3\u22123x\uFF0C\u6C42\u5176\u5355\u8C03\u9012\u589E\u533A\u95F4\u3002",
    question_type: "choice",
    options: {
      A: "(-\u221E, -1) \u222A (1, +\u221E)",
      B: "(-1, 1)",
      C: "(-\u221E, 1)",
      D: "(-1, +\u221E)"
    },
    standard_answer: "(-\u221E, -1) \u222A (1, +\u221E)",
    answer_analysis: "\u6C42\u5BFC\u5F97\u5230 f\u2032(x)=3x\xB2\u22123\uFF0C\u5E76\u6309\u4E34\u754C\u70B9 -1\u30011 \u5224\u65AD\u7B26\u53F7\u3002",
    original_answer: `$f(x)=x^3-3x$ \u7684\u5355\u8C03\u6027\uFF1A$f'(x)=3x^2-3$\uFF0C\u4EE4\u5176\u4E3A\u96F6\u5F97 $x=\\pm 1$\uFF0C\u6545\u5728 $(-\\infty,-1)\\cup(1,+\\infty)$ \u5355\u8C03\u589E\uFF0C$(-1,1)$ \u5355\u8C03\u51CF\u3002`,
    scoring_standard: "\u6B63\u786E\u6C42\u5BFC\uFF083 \u5206\uFF09\u3001\u627E\u5230\u5206\u754C\u70B9\uFF083 \u5206\uFF09\u3001\u5199\u51FA\u5355\u8C03\u533A\u95F4\uFF084 \u5206\uFF09\u3002",
    suggestion: {
      suggestion_id: `sug-${item.submission_item_id}`,
      submission_item_id: item.submission_item_id,
      version: 1,
      student_label: item.student_label,
      original_answer: "",
      scoring_standard: "",
      suggestion_score: item.suggestion_score,
      confidence: item.confidence,
      evidence: "\u6309\u8BC4\u5206\u6807\u51C6\u5206\u6B65\u6838\u5BF9\u3002",
      review_needed: item.confidence < 0.6,
      teacher_final_score: item.teacher_final_score,
      teacher_feedback: null,
      decision: item.status === "confirmed" ? "accepted" : "draft"
    }
  };
}
function videoInsights(classId) {
  return {
    aggregate_engagement: 0.72,
    segments: [{ time: 120, event: "active_quiz", summary: "\u968F\u5802\u68C0\u6D4B 24 \u4EBA\u53C2\u4E0E" }],
    actions: [{ insight_id: `vid-${classId}-1`, kind: "engagement", summary: "\u672C\u8BFE\u68C0\u6D4B\u9898\u901A\u8FC7\u7387 78%", evidence: "18/23 \u901A\u8FC7\u3002", data_window: { from: iso2(), to: iso2() }, recommended_actions: ["\u5DE9\u56FA\u8BB2\u89E3"] }],
    degraded: false
  };
}
function seedResources() {
  return [
    { resource_id: "r1", name: "\u5BFC\u6570\u6559\u6848.docx", file_type: "docx", size_bytes: 120034, status: "ready", created_at: iso2() },
    { resource_id: "r2", name: "\u51FD\u6570\u5355\u8C03\u6027.pdf", file_type: "pdf", size_bytes: 512003, status: "ready", pages: [{ page: 1 }, { page: 2 }], created_at: iso2() }
  ];
}

// src/mock/teacherServer.ts
function readBody(req) {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => {
      buf += c;
    });
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve({});
      }
    });
  });
}
function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}
function ok(res, data, status = 200) {
  send(res, status, { code: 0, message: "ok", data });
}
function fail(res, status, code, message, data = null) {
  send(res, status, { code, message, data });
}
function sendFile(res, filename, text) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.end(text);
}
function mockLessonFileText(art, kind) {
  const content = art?.content || {};
  const topic = content.topic || "\u8BFE\u5802\u6559\u6848";
  if (kind === "slides") {
    const lines2 = (content.timeline || []).map((s, i) => `${i + 1}. ${s.phase}\uFF08${s.minutes || 5} \u5206\u949F\uFF09\uFF1A${(s.activities || []).join("\uFF1B")}`);
    return `\u8BFE\u5802\u8BFE\u4EF6\u5927\u7EB2\uFF08\u6F14\u793A\uFF09\xB7 ${topic}

${lines2.join("\n")}
`;
  }
  if (kind === "outline") {
    const lines2 = (content.timeline || []).map((s, i) => `${i + 1}. ${s.phase}\uFF08${s.minutes || 5} \u5206\u949F\uFF09\uFF1A${(s.activities || []).join("\uFF1B")}`);
    return `\u8BFE\u5802\u677F\u4E66\u63D0\u7EB2\uFF08\u6F14\u793A\uFF09\xB7 ${topic}

${lines2.join("\n")}
`;
  }
  const lines = (content.timeline || []).map((s, i) => `\u73AF\u8282${i + 1} ${s.phase}\uFF08${s.minutes || 5} \u5206\u949F\uFF09\uFF1A${(s.activities || []).join("\uFF1B")}`);
  return `\u6559\u6848\uFF08\u6F14\u793A\uFF09\xB7 ${topic}

${lines.join("\n")}
`;
}
var artifacts = /* @__PURE__ */ new Map();
var assignments = /* @__PURE__ */ new Map();
var gradingItems = gradingQueue();
var gradingReviews = /* @__PURE__ */ new Map();
var resources = seedResources();
var tasks = /* @__PURE__ */ new Map();
var modes = /* @__PURE__ */ new Map();
var sessions = /* @__PURE__ */ new Map();
var idem = /* @__PURE__ */ new Map();
var seq = 1;
function nextId(prefix) {
  return `${prefix}-${seq++}`;
}
function isTeacherToken(req) {
  return (req.headers?.authorization || "").includes("mock-token-teacher-preview");
}
function advanceTask(id) {
  const t = tasks.get(id);
  if (!t) return { task_id: id, capability: "", status: "failed", progress: 0, stage: "\u672A\u627E\u5230", artifact_id: null, error_code: null };
  const elapsed = Date.now() - (t.created_at ? new Date(t.created_at).getTime() : Date.now());
  if (t.status === "cancelled") return t;
  if (elapsed < 400) {
    t.status = "queued";
    t.progress = 0;
  } else if (elapsed < 900) {
    t.status = "running";
    t.progress = 50;
    t.stage = "\u751F\u6210\u4E2D";
  } else {
    t.status = "succeeded";
    t.progress = 100;
    t.stage = "\u5B8C\u6210";
    t.artifact_id = t.artifact_id || `art-slides-${id.split("-").pop()}`;
  }
  tasks.set(id, t);
  return t;
}
function resetTeacherMock() {
  artifacts = /* @__PURE__ */ new Map();
  assignments = /* @__PURE__ */ new Map();
  gradingItems = gradingQueue();
  resources = seedResources();
  gradingReviews = /* @__PURE__ */ new Map();
  tasks = /* @__PURE__ */ new Map();
  modes = /* @__PURE__ */ new Map();
  sessions = /* @__PURE__ */ new Map();
  idem.clear();
  seq = 1;
}
function assertScope(cid) {
  return TEACHER_CLASSES.some((c) => c.id === cid);
}
function workspaceState(item) {
  if (item.status === "confirmed") return "confirmed";
  if (gradingReviews.get(item.submission_item_id) === "pending" || item.status === "low_confidence") return "review";
  return "ungraded";
}
function gradingWorkspace(selectedId, status) {
  const queue = gradingItems.map((item2, index) => ({
    submission_item_id: item2.submission_item_id,
    anonymous_label: "\u7B2C " + String(index + 1) + " \u4EFD\u4F5C\u7B54",
    state: workspaceState(item2),
    manual_review: gradingReviews.get(item2.submission_item_id) === "pending"
  })).filter((item2) => status === "all" || item2.state === status);
  const selected = queue.find((item2) => item2.submission_item_id === selectedId) || queue.find((item2) => item2.state !== "confirmed") || queue[0];
  const selectedIndex = selected ? queue.findIndex((item2) => item2.submission_item_id === selected.submission_item_id) : -1;
  const item = selected ? gradingItems.find((candidate) => candidate.submission_item_id === selected.submission_item_id) : null;
  const detail = item ? gradingDetail(item) : null;
  const sourceFileId = selected?.submission_item_id === "si-4" ? "scan-si-4" : null;
  const following = selectedIndex >= 0 ? [...queue.slice(selectedIndex + 1), ...queue.slice(0, selectedIndex)] : [];
  const nextUngraded = following.find((entry) => entry.state !== "confirmed");
  const confirmed = queue.filter((entry) => entry.state === "confirmed").length;
  return {
    context: {
      class: { class_id: "c1", label: "\u9AD8\u4E8C\uFF083\uFF09\u73ED \xB7 46 \u4EBA" },
      assignment: { assignment_id: "a1", title: "\u51FD\u6570\u7684\u5355\u8C03\u6027" },
      question: {
        item_no: 1,
        question_text: "\u5DF2\u77E5 f(x)=x^3-3x\uFF0C\u8BA8\u8BBA\u51FD\u6570\u7684\u5355\u8C03\u6027\u3002",
        q_type: "solution",
        options: null,
        max_score: 10
      },
      filters: { status },
      progress: { total: queue.length, confirmed, remaining: queue.length - confirmed }
    },
    available_context: {
      assignments: [{ assignment_id: "a1", title: "\u51FD\u6570\u7684\u5355\u8C03\u6027" }],
      questions: [{ item_no: 1, label: "\u7B2C 1 \u9898", question_text: "\u5DF2\u77E5 f(x)=x^3-3x\uFF0C\u8BA8\u8BBA\u51FD\u6570\u7684\u5355\u8C03\u6027\u3002" }]
    },
    queue,
    selected: detail && selected ? {
      submission_item_id: selected.submission_item_id,
      work: { original_answer: detail.original_answer, file_id: sourceFileId },
      scoring: {
        max_score: 10,
        rubric_status: "ready",
        rubric_items: [
          { id: "derivative", criterion: "\u6B63\u786E\u6C42\u5BFC", points: 3, evidence_hint: "\u5199\u51FA f\u2032(x)=3x\xB2\u22123" },
          { id: "critical", criterion: "\u786E\u5B9A\u5206\u754C\u70B9", points: 3, evidence_hint: "x=-1,1" },
          { id: "interval", criterion: "\u5199\u51FA\u5355\u8C03\u533A\u95F4", points: 4, evidence_hint: "\u7ED9\u51FA\u589E\u51CF\u533A\u95F4" }
        ],
        standard_answer: "f\u2032(x)=3x\xB2\u22123\uFF1B\u7531\u5BFC\u6570\u7B26\u53F7\u5224\u65AD\u51FD\u6570\u7684\u589E\u51CF\u533A\u95F4\u3002",
        answer_analysis: "\u5148\u6C42\u5BFC\uFF0C\u786E\u5B9A\u4E34\u754C\u70B9\uFF0C\u518D\u5224\u65AD\u6BCF\u4E2A\u533A\u95F4\u7684\u5BFC\u6570\u7B26\u53F7\u3002",
        fallback_standard: detail.scoring_standard
      },
      suggestion: {
        suggestion_id: detail.suggestion?.suggestion_id ?? null,
        version: detail.suggestion?.version ?? 1,
        proposed_score: detail.suggestion?.suggestion_score ?? null,
        review_needed: detail.suggestion?.review_needed ?? true,
        evidence: [{ kind: "grading_evidence", text: detail.suggestion?.evidence ?? "\u5F85\u6559\u5E08\u6838\u5BF9\u539F\u59CB\u4F5C\u7B54\u4E0E\u8BC4\u5206\u70B9\u3002" }]
      },
      confirmed_decision: item?.teacher_final_score === null ? null : {
        final_score: item?.teacher_final_score,
        feedback: detail.suggestion?.teacher_feedback ?? null,
        decision: detail.suggestion?.decision ?? null
      },
      fixture_id: sourceFileId ? "handwritten-scan" : "derivative-solution",
      source_ref: "docs/teacher-v2/references/grading/TEST_INPUT_CORPUS.md"
    } : null,
    navigation: {
      previous_id: selectedIndex > 0 ? queue[selectedIndex - 1].submission_item_id : null,
      next_ungraded_id: nextUngraded?.submission_item_id ?? null
    }
  };
}
async function handleTeacherApi(req, res) {
  const [url, queryString = ""] = (req.url || "").split("?");
  const query = new URLSearchParams(queryString);
  const method = req.method;
  const seg = url.split("/").filter(Boolean);
  const isTeacher2 = isTeacherToken(req);
  if (seg[0] === "teacher" || seg[0] === "_mock") {
    if (seg[0] === "_mock" && seg[1] === "teacher" && seg[2] === "reset") {
      resetTeacherMock();
      ok(res, { reset: true });
      return true;
    }
    if (!isTeacher2) {
      fail(res, 403, 40301, "role_denied");
      return true;
    }
  }
  if (method === "GET" && url === "/classes/mine") {
    ok(res, { items: TEACHER_CLASSES });
    return true;
  }
  if (method === "GET" && seg[0] === "classes" && seg[1] && seg[2] === "members") {
    if (!assertScope(seg[1])) {
      fail(res, 403, 40302, "class_scope_denied");
      return true;
    }
    const students = ROSTER_NAMES.map((name, i) => ({
      userId: `stu-${i + 1}`,
      nickname: name,
      nicknameInClass: name,
      memberRole: "student",
      confirmed: true
    }));
    ok(res, { items: [{ userId: "t1", nickname: "\u674E\u8001\u5E08", nicknameInClass: "\u674E\u8001\u5E08", memberRole: "teacher", confirmed: true }, ...students] });
    return true;
  }
  if (seg[0] !== "teacher") return false;
  if (method === "GET" && url === "/teacher/today") {
    ok(res, todayData());
    return true;
  }
  if (seg[0] === "teacher" && seg[1] === "classes" && seg[2]) {
    const cid = seg[2];
    if (!assertScope(cid)) {
      fail(res, 403, 40302, "class_scope_denied");
      return true;
    }
    if (seg[3] === "insights") {
      ok(res, { insights: classInsights(cid) });
      return true;
    }
    if (seg[3] === "video-insights") {
      ok(res, videoInsights(cid));
      return true;
    }
    if (seg[3] === "classroom-mode") {
      if (method === "GET") {
        ok(res, modes.get(cid) || { enabled: false, class_id: cid, lesson_id: null, ttl_seconds: 0, updated_at: iso2(), degraded: false });
        return true;
      }
      if (method === "POST") {
        const b = await readBody(req);
        const mode = { enabled: !!b.enabled, class_id: cid, lesson_id: b.lesson_id || null, ttl_seconds: b.enabled ? 3600 : 0, updated_at: iso2(), degraded: false };
        modes.set(cid, mode);
        ok(res, mode);
        return true;
      }
    }
    if (seg[3] === "classroom-session") {
      if (method === "GET" && !seg[4]) {
        ok(res, sessions.get(cid) || { class_id: cid, session_id: null, topic: "", room: "", started_at: "", status: "idle", connected_total: 0, current_segment: null, last_question: null, degraded: false });
        return true;
      }
      if (seg[4] === "start" && method === "POST") {
        const b = await readBody(req);
        const session = {
          class_id: cid,
          session_id: `sess-${cid}-${seq++}`,
          topic: String(b.topic || ""),
          room: String(b.room || ""),
          started_at: iso2(),
          status: "active",
          connected_total: 44,
          current_segment: null,
          last_question: null,
          degraded: false
        };
        sessions.set(cid, session);
        ok(res, session);
        return true;
      }
      if (seg[4] === "question" && method === "POST") {
        const b = await readBody(req);
        const session = sessions.get(cid);
        if (!session || session.status !== "active") {
          fail(res, 409, 40910, "session_not_active");
          return true;
        }
        const no = Math.max(0, Number(b.question_no) || 0);
        const question = {
          question_id: `sq-${cid}-${no}`,
          prompt: `\u68C0\u6D4B\u9898 ${no + 1}\uFF1A\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027\uFF08\u9898\u6C60\u7B2C ${no + 1} \u9898\uFF09`,
          options: ["A \u9009\u9879", "B \u9009\u9879", "C \u9009\u9879", "D \u9009\u9879"],
          correct_index: 0,
          focus: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
          submitted: 44,
          correct_rate: 66,
          distribution: [18, 12, 9, 5],
          main_wrong_option: "C",
          ai_reminder: "\u9519\u8BEF\u6A21\u5F0F\u4E0E\u6700\u8FD1\u4E00\u6B21\u4F5C\u4E1A\u4E00\u81F4\uFF0C\u5EFA\u8BAE\u518D\u7528 3 \u5206\u949F\u8BB2 a=0 \u8FB9\u754C\u5206\u7C7B\u3002",
          pattern_similar: true,
          variant: "\u53D8\u5F0F\uFF1A\u8BA8\u8BBA f(x)=x\xB3\u22123ax \u7684\u5355\u8C03\u6027\uFF08\u6309 a \u5206\u7C7B\uFF09"
        };
        session.last_question = question;
        sessions.set(cid, session);
        ok(res, question);
        return true;
      }
      if (seg[4] === "close" && method === "POST") {
        const session = sessions.get(cid);
        if (session) {
          session.status = "ended";
          sessions.set(cid, session);
        }
        ok(res, { status: "ended" });
        return true;
      }
    }
    return false;
  }
  if (method === "POST" && url === "/teacher/lessons/adapt") {
    const b = await readBody(req);
    const art = lessonArtifact(b.class_id || "c1", b.topic || "\u672A\u547D\u540D\u8BFE\u9898", b.requirements || "");
    art.artifact_id = nextId("art-lesson");
    artifacts.set(art.artifact_id, art);
    ok(res, art, 201);
    return true;
  }
  if (method === "GET" && url === "/teacher/lessons") {
    ok(res, Array.from(artifacts.values()).filter((a) => a.artifact_type === "lesson_plan"));
    return true;
  }
  if (seg[0] === "teacher" && seg[1] === "lessons" && seg[2] && seg[3] === "slides") {
    const src = artifacts.get(seg[2]);
    const art = {
      artifact_id: nextId("art-slides"),
      artifact_type: "slides",
      scene: "teacher.prep",
      class_id: src?.class_id || "c1",
      owner_id: "t1",
      status: "draft",
      version: 1,
      engine: "local",
      content: { slides: [], download_url: `/api/teacher/lessons/${seg[2]}/slides-file`, filename: "\u8BFE\u5802\u8BFE\u4EF6-\u6F14\u793A.txt" },
      source_refs: [],
      warnings: [],
      degraded: false,
      created_at: iso2(),
      updated_at: iso2()
    };
    artifacts.set(art.artifact_id, art);
    ok(res, art, 201);
    return true;
  }
  if (seg[0] === "teacher" && seg[1] === "lessons" && seg[2] && seg[3] === "explainer") {
    const src = artifacts.get(seg[2]);
    const art = {
      artifact_id: nextId("art-outline"),
      artifact_type: "explanation",
      scene: "teacher.prep",
      class_id: src?.class_id || "c1",
      owner_id: "t1",
      status: "draft",
      version: 1,
      engine: "local",
      content: { outline: mockLessonFileText(src, "outline"), download_url: `/api/teacher/lessons/${seg[2]}/board-outline-file`, filename: "\u8BFE\u5802\u677F\u4E66\u63D0\u7EB2-\u6F14\u793A.txt" },
      source_refs: [],
      warnings: [],
      degraded: false,
      created_at: iso2(),
      updated_at: iso2()
    };
    artifacts.set(art.artifact_id, art);
    ok(res, art, 201);
    return true;
  }
  if (seg[0] === "teacher" && seg[1] === "lessons" && seg[2] && seg[3] === "adopt-suggestion") {
    const b = await readBody(req);
    const key = req.headers?.["idempotency-key"];
    const art = artifacts.get(seg[2]);
    if (!art) {
      fail(res, 404, 40400, "lesson_not_found");
      return true;
    }
    if (!b?.suggestion_id || !b?.segment_id) {
      fail(res, 422, 40001, "suggestion_payload_incomplete");
      return true;
    }
    if (key && idem.has(key)) {
      ok(res, idem.get(key));
      return true;
    }
    art.version += 1;
    art.status = "draft";
    art.updated_at = iso2();
    const timeline = art.content?.timeline;
    if (Array.isArray(timeline) && timeline.length) {
      const target = timeline.find((s) => s.segment_id === b.segment_id) || timeline[0];
      const activities = Array.isArray(target.activities) ? target.activities : [];
      target.activities = [...activities, b.content || `\u91C7\u7EB3\u5EFA\u8BAE\uFF1A${b.suggestion_id}`];
    }
    artifacts.set(seg[2], art);
    if (key) idem.set(key, art);
    ok(res, art);
    return true;
  }
  if (method === "GET" && seg[0] === "teacher" && seg[1] === "lessons" && seg[2] && (seg[3] === "download" || seg[3] === "slides-file" || seg[3] === "board-outline-file")) {
    const art = artifacts.get(seg[2]);
    if (seg[3] === "download") return sendFile(res, `${String(art?.content?.topic || "\u8BFE\u5802\u6559\u6848")}-\u6F14\u793A.txt`, mockLessonFileText(art, "plan")), true;
    if (seg[3] === "slides-file") return sendFile(res, "\u8BFE\u5802\u8BFE\u4EF6-\u6F14\u793A.txt", mockLessonFileText(art, "slides")), true;
    return sendFile(res, "\u8BFE\u5802\u677F\u4E66\u63D0\u7EB2-\u6F14\u793A.txt", mockLessonFileText(art, "outline")), true;
  }
  if (seg[0] === "teacher" && seg[1] === "lessons" && seg[2] && seg[3] === "apply-insight") {
    const art = artifacts.get(seg[2]) || lessonArtifact("c1", "\u5E94\u7528\u6D1E\u5BDF", "");
    art.version += 1;
    art.artifact_id = seg[2];
    art.status = "draft";
    art.updated_at = iso2();
    artifacts.set(seg[2], art);
    ok(res, art);
    return true;
  }
  if (method === "POST" && url === "/teacher/quizzes/generate") {
    const b = await readBody(req);
    try {
      const art = quizArtifact(b.knowledge_points || ["\u51FD\u6570\u5355\u8C03\u6027"], b.count || 6, { question_types: b.question_types, difficulty: b.difficulty });
      art.artifact_id = nextId("art-quiz");
      artifacts.set(art.artifact_id, art);
      ok(res, art, 201);
      return true;
    } catch (error) {
      fail(res, 422, 40001, error?.message || "question_type_quota_exceeds_count");
      return true;
    }
  }
  if (seg[0] === "teacher" && seg[1] === "artifacts" && seg[2]) {
    const id = seg[2];
    const art = artifacts.get(id);
    if (method === "GET") {
      if (!art) return fail(res, 404, 40400, "not_found"), true;
      ok(res, art);
      return true;
    }
    if (method === "PUT") {
      const b = await readBody(req);
      if (!art) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      if (b.version !== void 0 && b.version < art.version) {
        fail(res, 409, 40901, "version_conflict");
        return true;
      }
      art.content = b.content ?? art.content;
      art.version += 1;
      art.updated_at = iso2();
      artifacts.set(id, art);
      ok(res, art);
      return true;
    }
    if (method === "POST" && seg[3] === "confirm") {
      if (!art) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      if (art.status !== "draft") {
        fail(res, 409, 40901, "version_conflict");
        return true;
      }
      art.status = "confirmed";
      art.confirmed_by = "t1";
      art.confirmed_at = iso2();
      art.updated_at = iso2();
      artifacts.set(id, art);
      ok(res, art);
      return true;
    }
    if (method === "POST" && seg[3] === "publish") {
      if (!art) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      if (art.status !== "confirmed") {
        fail(res, 422, 42210, "confirmation_required");
        return true;
      }
      art.status = "published";
      art.updated_at = iso2();
      artifacts.set(id, art);
      ok(res, art);
      return true;
    }
    if (method === "POST" && seg[3] === "archive") {
      if (!art) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      art.status = "archived";
      art.updated_at = iso2();
      artifacts.set(id, art);
      ok(res, art);
      return true;
    }
    return false;
  }
  if (seg[0] === "teacher" && seg[1] === "tasks" && seg[2]) {
    const id = seg[2];
    if (method === "GET") {
      ok(res, advanceTask(id));
      return true;
    }
    if (method === "POST" && seg[3] === "cancel") {
      const t = tasks.get(id);
      if (t) {
        t.status = "cancelled";
        tasks.set(id, t);
      }
      ;
      ok(res, t || { task_id: id, status: "cancelled" });
      return true;
    }
    return false;
  }
  if (seg[0] === "teacher" && seg[1] === "grading") {
    if (method === "GET" && url === "/teacher/grading/queue") {
      ok(res, { queue: gradingItems });
      return true;
    }
    if (method === "GET" && url === "/teacher/grading/workspace") {
      const selectedId = query.get("submission_item_id");
      const status = query.get("status") || "all";
      ok(res, gradingWorkspace(selectedId, status));
      return true;
    }
    if (method === "GET" && url === "/teacher/grading/insights") {
      ok(res, {
        assignment_id: "asg-derivative-weekly",
        title: "\u300A\u5BFC\u6570\u5468\u6D4B\u300B",
        review_rate: 19,
        top_questions: [
          { item_no: 4, question_text: "\u8BA8\u8BBA f(x)=ln x\u2212ax \u7684\u5355\u8C03\u6027\uFF08a=0 \u8FB9\u754C\u5206\u7C7B\uFF09", wrong_count: 17, correct_ratio: 63 },
          { item_no: 2, question_text: "\u6C42 f(x)=x\xB3\u22123x \u7684\u5355\u8C03\u533A\u95F4", wrong_count: 12, correct_ratio: 74 },
          { item_no: 7, question_text: "\u5DF2\u77E5\u5355\u8C03\u6027\u6C42\u53C2\u6570\u53D6\u503C\u8303\u56F4", wrong_count: 9, correct_ratio: 80 }
        ]
      });
      return true;
    }
    if (method === "GET" && seg[2] && seg[3] === "file") {
      if (seg[2] === "si-4") {
        fail(res, 503, 50310, "source_file_temporarily_unavailable");
        return true;
      }
      fail(res, 404, 40400, "file_not_found");
      return true;
    }
    if (method === "POST" && url === "/teacher/grading/batch-confirm") {
      const b = await readBody(req);
      const results = (b.items || []).map((it) => ({ submission_item_id: it, ok: true, error: void 0 }));
      gradingItems = gradingItems.map((g) => (b.items || []).includes(g.submission_item_id) ? { ...g, status: "confirmed", teacher_final_score: g.suggestion_score } : g);
      ok(res, { results, failed: 0 });
      return true;
    }
    if (method === "POST" && seg[2] && seg[3] === "review") {
      const body = await readBody(req);
      const item = gradingItems.find((candidate) => candidate.submission_item_id === seg[2]);
      if (!item) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      if (body.state !== "pending" && body.state !== "cleared") {
        fail(res, 422, 40001, "invalid_review_state");
        return true;
      }
      const key = req.headers?.["idempotency-key"];
      if (key && idem.has(key)) {
        ok(res, idem.get(key));
        return true;
      }
      gradingReviews.set(item.submission_item_id, body.state);
      const result = { submission_item_id: item.submission_item_id, state: body.state, replayed: false };
      if (key) idem.set(key, { ...result, replayed: true });
      ok(res, result);
      return true;
    }
    if (seg[2] && seg[3] === "suggest") {
      const it = gradingItems.find((g) => g.submission_item_id === seg[2]);
      ok(res, it ? gradingDetail(it).suggestion : null);
      return true;
    }
    if (seg[2] && seg[3] === "confirm") {
      const b = await readBody(req);
      const key = req.headers?.["idempotency-key"];
      const it = gradingItems.find((g) => g.submission_item_id === seg[2]);
      if (!it) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      if (key && idem.has(key)) {
        ok(res, idem.get(key));
        return true;
      }
      const confirmed = { ...it, status: "confirmed", teacher_final_score: b.decision === "accept" ? it.suggestion_score : b.final_score };
      gradingItems = gradingItems.map((g) => g.submission_item_id === seg[2] ? confirmed : g);
      const detail = gradingDetail(confirmed);
      detail.suggestion.decision = b.decision === "accept" ? "accepted" : "overridden";
      detail.suggestion.teacher_final_score = detail.teacher_final_score;
      detail.suggestion.teacher_feedback = b.teacher_feedback ?? null;
      if (key) idem.set(key, detail.suggestion);
      ok(res, detail.suggestion);
      return true;
    }
    if (seg[2]) {
      const it = gradingItems.find((g) => g.submission_item_id === seg[2]);
      ok(res, gradingDetail(it || gradingQueue()[0]));
      return true;
    }
    return false;
  }
  if (seg[0] === "teacher" && seg[1] === "assignments") {
    if (method === "GET") {
      ok(res, Array.from(assignments.values()));
      return true;
    }
    if (method === "POST" && url === "/teacher/assignments") {
      const b = await readBody(req);
      const a = { assignment_id: nextId("assign"), class_id: b.class_id || "c1", title: b.title || "\u7EC3\u4E60", quiz_set: b.quiz_set, status: "draft", version: 1, created_at: iso2() };
      assignments.set(a.assignment_id, a);
      ok(res, a);
      return true;
    }
    if (seg[2] && seg[3]) {
      const a = assignments.get(seg[2]);
      if (!a) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      const next = seg[3];
      const map = { publish: "published", close: "closed", archive: "archived" };
      a.status = map[next];
      a.published_at = next === "publish" ? iso2() : a.published_at;
      assignments.set(a.assignment_id, a);
      ok(res, a);
      return true;
    }
    return false;
  }
  if (seg[0] === "teacher" && seg[1] === "resources") {
    if (method === "GET" && url === "/teacher/resources") {
      ok(res, resources);
      return true;
    }
    if (method === "POST" && url === "/teacher/resources/upload") {
      const b = await readBody(req);
      const ticket = { resource_id: nextId("res"), status: "uploading" };
      resources.unshift({ resource_id: ticket.resource_id, name: b.name || "\u4E0A\u4F20\u6587\u4EF6", file_type: b.file_type || "unknown", size_bytes: b.size_bytes || 0, status: "preprocessing", created_at: iso2() });
      ok(res, ticket);
      return true;
    }
    if (seg[2] && seg[3] === "preprocess") {
      const r = resources.find((x) => x.resource_id === seg[2]);
      if (r) {
        r.status = "understand";
        r.pages = [{ page: 1 }];
      }
      ok(res, r);
      return true;
    }
    if (seg[2] && seg[3] === "understand") {
      const r = resources.find((x) => x.resource_id === seg[2]);
      if (r) {
        r.status = "understand";
        r.pages = [{ page: 1, text: "\u7406\u89E3\u5B8C\u6210" }];
      }
      ok(res, r);
      return true;
    }
    if (method === "POST" && url === "/teacher/resources/external-reference") {
      const b = await readBody(req);
      const r = {
        resource_id: nextId("res"),
        name: String(b.title || "\u516C\u5F00\u5F15\u7528"),
        resource_kind: "external_reference",
        external_url: String(b.url || ""),
        provider: b.provider || null,
        file_type: "external_reference",
        size_bytes: 0,
        status: "understand",
        created_at: iso2()
      };
      resources.unshift(r);
      ok(res, r, 201);
      return true;
    }
    if (seg[2] && seg[3] === "publish") {
      const r = resources.find((x) => x.resource_id === seg[2]);
      if (!r) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      r.published = true;
      ok(res, r);
      return true;
    }
    if (seg[2] && seg[3] === "unpublish") {
      const r = resources.find((x) => x.resource_id === seg[2]);
      if (!r) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      r.published = false;
      ok(res, r);
      return true;
    }
    if (seg[2] && seg[3] === "question-candidates" && seg[4] === "approve") {
      const b = await readBody(req);
      const r = resources.find((x) => x.resource_id === seg[2]);
      if (!r) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      const ids = b.candidate_ids || [];
      r.question_candidates = (r.question_candidates || []).map((c) => ids.includes(c.candidate_id || "") ? { ...c, review_status: "approved" } : c);
      ok(res, { resource_id: seg[2], approved_hashes: ids, review_required: false });
      return true;
    }
    if (seg[2] && seg[3] === "download") {
      const r = resources.find((x) => x.resource_id === seg[2]);
      return sendFile(res, `${r?.name || "\u8D44\u6E90"}-\u6F14\u793A.txt`, `\u8D44\u6E90\u5185\u5BB9\uFF08\u6F14\u793A\uFF09\xB7 ${r?.name || ""}`), true;
    }
    if (seg[2] && method === "DELETE" && !seg[3]) {
      const existed = resources.some((x) => x.resource_id === seg[2]);
      if (!existed) {
        fail(res, 404, 40400, "not_found");
        return true;
      }
      resources = resources.filter((x) => x.resource_id !== seg[2]);
      ok(res, { resource_id: seg[2], deleted: true });
      return true;
    }
    return false;
  }
  if (method === "POST" && url === "/teacher/butler/chat") {
    ok(res, { degraded: true, message: "\uFF08\u964D\u7EA7\uFF09\u5DF2\u6839\u636E\u5F53\u524D\u573A\u666F\u751F\u6210\u672C\u5730\u66FF\u4EE3\u8349\u6848\uFF0C\u53EF\u7EE7\u7EED\u7F16\u8F91\u4E0E\u786E\u8BA4\u3002", confirmation_required: false });
    return true;
  }
  return false;
}

// src/mock/teacherV2Data.ts
var V2_TEACHER = { id: "t-lwl", name: "\u674E\u6587\u6F9C", subject: "\u6570\u5B66", grades: "\u9AD8\u4E8C" };
var V2_ROSTER_3 = [
  "\u674E\u660A",
  "\u738B\u96E8\u6850",
  "\u5F20\u5B50\u58A8",
  "\u9648\u601D\u777F",
  "\u5218\u4E00\u9E23",
  "\u8D75\u6B23\u6021",
  "\u5B59\u53EF",
  "\u5468\u5B87\u822A",
  "\u5434\u6B23\u7136",
  "\u90D1\u7693\u5B87",
  "\u51AF\u82E5\u5F64",
  "\u848B\u660E\u8F69",
  "\u97E9\u9732",
  "\u6768\u5B50\u822A",
  "\u4F55\u9759\u6021",
  "\u9AD8\u5929",
  "\u6797\u6653",
  "\u7F57\u5B87\u8F69",
  "\u6881\u96EA",
  "\u5B8B\u658C",
  "\u5510\u5FC3\u6021",
  "\u90D1\u695A\u4EEA",
  "\u738B\u6893\u8431",
  "\u51AF\u81F4\u8FDC",
  "\u9648\u66E6",
  "\u891A\u5929\u7FFC",
  "\u536B\u8BD7\u96C5",
  "\u848B\u6587\u535A",
  "\u6C88\u6708",
  "\u79E6\u6717",
  "\u8BB8\u8BFA",
  "\u9093\u4F73\u742A",
  "\u66F9\u777F",
  "\u5F6D\u98DE\u5B87",
  "\u8096\u9759",
  "\u90B9\u5A77\u5A77",
  "\u82CF\u5CFB",
  "\u6F58\u4E50\u7476",
  "\u8881\u6668",
  "\u8521\u6587\u9759",
  "\u4F59\u5B50\u8C6A",
  "\u675C\u82E5\u98DE",
  "\u4FAF\u601D\u8FDC",
  "\u90ED\u6E05\u626C",
  "\u5D14\u6D69\u7136",
  "\u65B9\u96E8\u6B23"
];
var V2_ROSTER_5 = [
  "\u9A6C\u6668\u66E6",
  "\u6797\u6D69\u7136",
  "\u90ED\u96E8\u8431",
  "\u4F55\u4FCA\u54F2",
  "\u9AD8\u6893\u6DB5",
  "\u7F57\u4E16\u6770",
  "\u6881\u8BD7\u6DB5",
  "\u5B8B\u660E\u8FDC",
  "\u5510\u5609\u61FF",
  "\u97E9\u5B87\u8F69",
  "\u51AF\u68A6\u7476",
  "\u848B\u5B50\u8C6A",
  "\u6C88\u4E66\u7476",
  "\u79E6\u5B50\u6DB5",
  "\u8BB8\u535A\u6587",
  "\u9093\u7D2B\u6DB5",
  "\u66F9\u96E8\u6850",
  "\u5F6D\u601D\u8FDC",
  "\u8096\u5B87\u8FB0",
  "\u90B9\u68A6\u742A",
  "\u9C81\u4E00\u9E23",
  "\u77F3\u4F73\u9896",
  "\u5ED6\u4FCA\u9A70",
  "\u767D\u8BD7\u96E8",
  "\u6C5F\u5B87\u8F69",
  "\u5C39\u601D\u6E90",
  "\u859B\u5929\u7FCA",
  "\u8D3A\u5B50\u58A8",
  "\u5170\u5A77",
  "\u4E0A\u5B98\u5A49",
  "\u534E\u5B50\u6602",
  "\u91D1\u6653\u5F64",
  "\u67EF\u666F\u884C",
  "\u8D75\u7D2B\u8431",
  "\u94B1\u601D\u8FDC",
  "\u65BD\u96E8\u6850",
  "\u738B\u6D69\u5B87",
  "\u8303\u51B0\u51B0\u5C14",
  "\u9648\u66E6\u6708",
  "\u6768\u5353\u7136",
  "\u6731\u96E8\u6B23",
  "\u5F90\u5B50\u8C6A",
  "\u9AD8\u5B50\u6DB5",
  "\u6797\u68A6\u742A"
];
var V2_CLASSES = [
  { class_id: "cls-g2-3", class_name: "\u9AD8\u4E8C 3 \u73ED", student_count: 46 },
  { class_id: "cls-g2-5", class_name: "\u9AD8\u4E8C 5 \u73ED", student_count: 44 }
];
function seededRandom(seed2) {
  let s = seed2 >>> 0;
  return () => {
    s = s * 1664525 + 1013904223 >>> 0;
    return s / 4294967295;
  };
}
function iso3(date) {
  return (date || /* @__PURE__ */ new Date()).toISOString();
}
var v2Schedule = () => [
  {
    slot_no: 2,
    time_range: "08:55 - 09:40",
    class_id: "cls-g2-5",
    class_name: "\u9AD8\u4E8C 5 \u73ED",
    topic: "\u51FD\u6570\u7684\u5355\u8C03\u6027\uFF08\u590D\u4E60\u8BFE\uFF09",
    lesson_type: "review",
    prep_completion: 100,
    missing_items: [],
    starts_at: "08:55",
    ends_at: "09:40"
  },
  {
    slot_no: 4,
    time_range: "10:45 - 11:30",
    class_id: "cls-g2-3",
    class_name: "\u9AD8\u4E8C 3 \u73ED",
    topic: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B\uFF08\u65B0\u6388\uFF09",
    lesson_type: "new",
    prep_completion: 60,
    missing_items: ["\u8BFE\u4EF6 PPT"],
    starts_at: "10:45",
    ends_at: "11:30"
  },
  {
    slot_no: 7,
    time_range: "15:25 - 16:10",
    class_id: "cls-g2-3",
    class_name: "\u9AD8\u4E8C 3 \u73ED",
    topic: "\u5468\u6D4B\u56DB \u8BD5\u5377\u8BB2\u8BC4",
    lesson_type: "talk",
    prep_completion: 30,
    missing_items: ["\u8BB2\u8BC4\u6750\u6599"],
    starts_at: "15:25",
    ends_at: "16:10"
  }
];
var v2Todos = () => [
  { id: "td-1", title: "\u6279\u6539\u6628\u665A\u9884\u4E60\u5355", reason: "\u9AD8\u4E8C 3 \u73ED\u300A\u692D\u5706\u53CA\u5176\u6807\u51C6\u65B9\u7A0B\u300B\u9884\u4E60\u5355\u5DF2\u6536\u9F50\uFF0CAI \u9884\u6279\u5B8C\u6210 46 \u4EFD\uFF0C\u5176\u4E2D 5 \u4EFD\u4F4E\u7F6E\u4FE1\u5EA6\u9700\u4EBA\u5DE5\u590D\u6838", due_at: "07:40", count: 5, priority: "high", route: "/teacher-v2/assign", route_label: "\u8FDB\u5165\u6279\u6539" },
  { id: "td-2", title: "\u8865\u9F50\u7B2C 4 \u8282\u8BFE\u4EF6", reason: "10:45 \u9AD8\u4E8C 3 \u73ED\u300C\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B\u300D\u6559\u6848\u5DF2\u5B9A\u7A3F\uFF0C\u8FD8\u5DEE\u8BFE\u4EF6 PPT", due_at: "10:00", priority: "high", route: "/teacher-v2/slides", route_label: "\u751F\u6210\u8BFE\u4EF6" },
  { id: "td-3", title: "\u5468\u6D4B\u4E94\u7EC4\u5377", reason: "\u9AD8\u4E8C 5 \u73ED\u5468\u4E94\u5468\u6D4B\uFF1A\u5706\u9525\u66F2\u7EBF 12 \u9898\uFF0C\u5EFA\u8BAE\u96BE\u5EA6 3:5:2", due_at: "16:30", priority: "mid", route: "/teacher-v2/quiz", route_label: "\u5F00\u59CB\u7EC4\u5377" },
  { id: "td-4", title: "\u692D\u5706\u5355\u5143\u6559\u5B66\u8BBE\u8BA1", reason: "\u660E\u65E5\u6559\u7814\u4F1A\u9700\u63D0\u4EA4\u5355\u5143\u8BBE\u8BA1\uFF08\u8349\u7A3F v2 \u5DF2\u4FDD\u5B58\uFF09", due_at: "\u660E 08:30", priority: "low", route: "/teacher-v2/prep", route_label: "\u7EE7\u7EED\u7F16\u8F91" }
];
var v2ClassBriefs = () => [
  {
    class_id: "cls-g2-3",
    class_name: "\u9AD8\u4E8C 3 \u73ED",
    student_count: 46,
    avg_score: 76.4,
    submission_rate: 100,
    hot_kp: { name: "\u692D\u5706\u7684\u6982\u5FF5", error_rate: 0.4 },
    trend: [72, 74, 73, 75, 76, 76.4]
  },
  {
    class_id: "cls-g2-5",
    class_name: "\u9AD8\u4E8C 5 \u73ED",
    student_count: 44,
    avg_score: 73.1,
    submission_rate: 97.7,
    hot_kp: { name: "\u51FD\u6570\u6027\u8D28\xB7\u8BC1\u660E\u6B65\u9AA4", error_rate: 0.22 },
    trend: [70, 71, 72, 72, 73, 73.1]
  }
];
var V2_KP_TREE = [
  {
    code: "XBX1",
    name: "\u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E00\u518C",
    children: [
      {
        code: "XBX1-3",
        name: "\u5706\u9525\u66F2\u7EBF",
        children: [
          { code: "KP-TY", name: "\u692D\u5706\u7684\u5B9A\u4E49", error_rate: 0.4, question_count: 5 },
          { code: "KP-BZ", name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B", error_rate: 0.33, question_count: 7 },
          { code: "KP-JD", name: "\u692D\u5706\u7684\u7B80\u5355\u51E0\u4F55\u6027\u8D28", error_rate: 0.52, question_count: 4 },
          { code: "KP-SQ", name: "\u53CC\u66F2\u7EBF", error_rate: 0.28, question_count: 6 },
          { code: "KP-PS", name: "\u629B\u7269\u7EBF", error_rate: 0.24, question_count: 6 },
          { code: "KP-JX", name: "\u7126\u70B9\u5F26\u6027\u8D28", error_rate: 0.35, question_count: 3 }
        ]
      },
      { code: "XBX1-1", name: "\u7A7A\u95F4\u5411\u91CF\u4E0E\u7ACB\u4F53\u51E0\u4F55", children: [
        { code: "KP-XL", name: "\u7A7A\u95F4\u5411\u91CF\u53CA\u5176\u8FD0\u7B97", error_rate: 0.12, question_count: 8 },
        { code: "KP-FX", name: "\u7A7A\u95F4\u5411\u91CF\u6CD5\u8BC1\u5E73\u884C\u5782\u76F4", error_rate: 0.18, question_count: 6 }
      ] },
      { code: "XBX1-2", name: "\u76F4\u7EBF\u548C\u5706\u7684\u65B9\u7A0B", children: [
        { code: "KP-ZX", name: "\u76F4\u7EBF\u7684\u65B9\u7A0B", error_rate: 0.1, question_count: 9 },
        { code: "KP-YUAN", name: "\u5706\u7684\u65B9\u7A0B", error_rate: 0.18, question_count: 7 }
      ] }
    ]
  },
  {
    code: "BX1",
    name: "\u5FC5\u4FEE\u7B2C\u4E00\u518C",
    children: [
      { code: "BX1-3", name: "\u51FD\u6570\u7684\u6982\u5FF5\u4E0E\u6027\u8D28", children: [
        { code: "KP-DDX", name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", error_rate: 0.22, question_count: 8 },
        { code: "KP-DC", name: "\u51FD\u6570\u7684\u5947\u5076\u6027", error_rate: 0.19, question_count: 6 }
      ] }
    ]
  },
  {
    code: "XBX2",
    name: "\u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E8C\u518C",
    children: [
      { code: "XBX2-4", name: "\u6570\u5217", children: [
        { code: "KP-DCS", name: "\u7B49\u5DEE\u6570\u5217", error_rate: 0.15, question_count: 8 },
        { code: "KP-DCQH", name: "\u7B49\u5DEE\u6570\u5217\u524D n \u9879\u548C", error_rate: 0.15, question_count: 8 },
        { code: "KP-DBS", name: "\u7B49\u6BD4\u6570\u5217", error_rate: 0.21, question_count: 7 }
      ] }
    ]
  }
];
var ELLIPSE_PLAN = {
  plan_id: "plan-ellipse-001",
  topic: "3.1.1 \u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B\uFF08\u7B2C 1 \u8BFE\u65F6\uFF09",
  textbook_ref: "\u4EBA\u6559 A \u7248\u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E00\u518C \u7B2C\u4E09\u7AE0 3.1.1",
  lesson_type: "\u65B0\u6388\u8BFE",
  duration_minutes: 45,
  class_id: "cls-g2-3",
  class_name: "\u9AD8\u4E8C 3 \u73ED",
  design_basis: {
    text: "\u4F9D\u636E\u9AD8\u4E8C 3 \u73ED\u8FD1 30 \u5929\u5B66\u60C5\u6570\u636E\uFF0C\u91CD\u96BE\u70B9\u5411\u300C\u5B9A\u4E49\u6761\u4EF6\u8FA8\u6790\u300D\u503E\u659C",
    evidence: [
      { label: "\u692D\u5706\u7684\u6982\u5FF5 \xB7 \u9519\u8BEF\u7387", value: "40%", detail: "\u9884\u4E60\u5355\u7B2C 3 \u9898\uFF08n=46\uFF0C2026-08-31\uFF09" },
      { label: "\u4E3B\u8981\u9519\u56E0", value: "\u6982\u5FF5\u6DF7\u6DC6 \xB7 \u5FFD\u7565 2a>2c \u6761\u4EF6", detail: "\u5360\u8BE5\u9898\u9519\u8BEF\u7684 38%" }
    ]
  },
  objectives: [
    "\u7406\u89E3\u692D\u5706\u7684\u5B9A\u4E49\uFF0C\u638C\u63E1\u7126\u70B9\u5728 x \u8F74\u4E0E y \u8F74\u4E0A\u7684\u6807\u51C6\u65B9\u7A0B\u53CA a\u3001b\u3001c \u7684\u5173\u7CFB\uFF08a\xB2=b\xB2+c\xB2\uFF09",
    "\u7ECF\u5386\u300C\u7EC6\u7EF3\u5B9E\u9A8C \u2192 \u5750\u6807\u6CD5\u63A8\u5BFC\u300D\u7684\u5B8C\u6574\u8FC7\u7A0B\uFF0C\u638C\u63E1\u89E3\u6790\u51E0\u4F55\u7814\u7A76\u95EE\u9898\u7684\u57FA\u672C\u65B9\u6CD5\u2014\u2014\u5750\u6807\u6CD5\uFF0C\u63D0\u5347\u6570\u5B66\u8FD0\u7B97\u4E0E\u903B\u8F91\u63A8\u7406\u7D20\u517B",
    "\u901A\u8FC7\u884C\u661F\u8F68\u9053\u3001\u6CB9\u7F50\u6A2A\u622A\u9762\u7B49\u751F\u6D3B\u5B9E\u4F8B\uFF0C\u611F\u53D7\u6570\u5B66\u6E90\u4E8E\u751F\u6D3B\u3001\u8FD0\u7528\u4E8E\u751F\u6D3B"
  ],
  key_point: "\u692D\u5706\u7684\u5B9A\u4E49\u4E0E\u4E24\u79CD\u6807\u51C6\u65B9\u7A0B\u7684\u5F62\u5F0F",
  difficulty_point: "\u6807\u51C6\u65B9\u7A0B\u7684\u63A8\u5BFC\uFF08\u4E24\u6B21\u5E73\u65B9\u5316\u7B80\u7684\u7B49\u4EF7\u6027\u4E0E b\xB2=a\xB2-c\xB2 \u7684\u5F15\u5165\uFF09",
  aids: "\u7EC6\u7EF3\u3001\u56FE\u9489\u3001\u753B\u677F\uFF08\u5206\u7EC4\u5B9E\u9A8C\uFF09\uFF1BGeoGebra \u52A8\u6001\u6F14\u793A\uFF08\u5907\u9009\uFF09",
  outline: [
    { id: "o1", kind: "\u5BFC\u5165", title: "\u4ECE\u5706\u5230\u692D\u5706\uFF1A\u7C7B\u6BD4\u4E0E\u8FFD\u95EE", minutes: 5, summary: "\u590D\u4E60\u5706\u7684\u5B9A\u4E49\uFF0C\u8FFD\u95EE\u300C\u5230\u4E24\u5B9A\u70B9\u8DDD\u79BB\u4E4B\u548C\u4E3A\u5B9A\u957F\u300D\u7684\u8F68\u8FF9" },
    { id: "o2", kind: "\u63A2\u7A76", title: "\u7EC6\u7EF3\u5B9E\u9A8C\uFF1A\u753B\u51FA\u692D\u5706", minutes: 8, summary: "\u5206\u7EC4\u52A8\u624B\u5B9E\u9A8C\uFF0C\u89C2\u5BDF\u7EF3\u957F\u4E0E\u4E24\u9489\u8DDD\u7684\u5173\u7CFB" },
    { id: "o3", kind: "\u6982\u5FF5", title: "\u692D\u5706\u7684\u5B9A\u4E49\u751F\u6210", minutes: 5, summary: "\u5F52\u7EB3\u5B9A\u4E49\uFF0C\u660E\u786E\u7126\u70B9\u3001\u7126\u8DDD\u4E0E 2a>2c \u6761\u4EF6" },
    { id: "o4", kind: "\u63A8\u5BFC", title: "\u5750\u6807\u6CD5\u63A8\u5BFC\u6807\u51C6\u65B9\u7A0B", minutes: 12, summary: "\u5EFA\u7CFB\u3001\u8BBE\u70B9\u3001\u5217\u5F0F\u3001\u4E24\u6B21\u5E73\u65B9\u5316\u7B80\uFF0C\u5F15\u5165 b\xB2=a\xB2-c\xB2" },
    { id: "o5", kind: "\u4F8B\u9898", title: "\u4F8B 1 \xB7 \u5B9A\u4E49\u6CD5\u6C42\u65B9\u7A0B", minutes: 6, summary: "\u4E24\u5B9A\u70B9\u8DDD\u79BB 8\u3001\u8DDD\u79BB\u548C 10\uFF0C\u6C42\u8F68\u8FF9\u65B9\u7A0B" },
    { id: "o6", kind: "\u4F8B\u9898", title: "\u4F8B 2 \xB7 \u4E24\u79CD\u65B9\u7A0B\u8FA8\u6790", minutes: 4, summary: "\u7531\u65B9\u7A0B\u5224\u65AD\u7126\u70B9\u4F4D\u7F6E\u5E76\u6C42\u7126\u70B9" },
    { id: "o7", kind: "\u53D8\u5F0F", title: "\u5373\u65F6\u53D8\u5F0F\u7EC3\u4E60", minutes: 3, summary: "2 \u9053\u5C0F\u9898\u5DE9\u56FA a\u3001b\u3001c \u5173\u7CFB" },
    { id: "o8", kind: "\u5C0F\u7ED3", title: "\u7ED3\u6784\u5316\u5C0F\u7ED3\u4E0E\u4F5C\u4E1A", minutes: 2, summary: "\u5B66\u751F\u603B\u7ED3\u77E5\u8BC6\u4E3B\u7EBF\uFF0C\u5E03\u7F6E\u5206\u5C42\u4F5C\u4E1A" }
  ],
  sections: [
    {
      id: "s1",
      phase: "\u5BFC\u5165",
      minutes: 5,
      teacher_activity: "\u590D\u4E60\u5706\u7684\u5B9A\u4E49\uFF08\u5E73\u9762\u5185\u5230\u5B9A\u70B9\u7684\u8DDD\u79BB\u7B49\u4E8E\u5B9A\u957F\u7684\u70B9\u7684\u96C6\u5408\uFF09\uFF0C\u8FFD\u95EE\uFF1A\u5230\u4E24\u4E2A\u5B9A\u70B9\u7684\u8DDD\u79BB\u4E4B\u548C\u4E3A\u5B9A\u957F\u7684\u70B9\u7684\u8F68\u8FF9\u662F\u4EC0\u4E48\uFF1F\u5C55\u793A\u884C\u661F\u8F68\u9053\u3001\u6CB9\u7F50\u6A2A\u622A\u9762\u56FE\u7247",
      student_activity: "\u56DE\u5FC6\u5706\u7684\u5B9A\u4E49\uFF1B\u89C2\u5BDF\u56FE\u7247\uFF0C\u76F4\u89C2\u611F\u77E5\u692D\u5706\u5F62\u8C61",
      design_intent: "\u7C7B\u6BD4\u8FC1\u79FB\u5F15\u53D1\u8BA4\u77E5\u51B2\u7A81\uFF0C\u4ECE\u751F\u6D3B\u5B9E\u4F8B\u5EFA\u7ACB\u76F4\u89C2",
      content_items: ["\u884C\u661F\u8F68\u9053\u56FE\u7247", "\u6CB9\u7F50\u6A2A\u622A\u9762\u56FE\u7247"]
    },
    {
      id: "s2",
      phase: "\u63A2\u7A76\u5B9E\u9A8C",
      minutes: 8,
      teacher_activity: "\u53D1\u653E\u7EC6\u7EF3\u4E0E\u56FE\u9489\uFF0C\u6307\u5BFC\u5206\u7EC4\u5B9E\u9A8C\uFF1B\u8FFD\u95EE\uFF1A\u7EF3\u957F\u7B49\u4E8E\u4E24\u9489\u8DDD\u79BB\u65F6\uFF0C\u7B14\u5C16\u753B\u51FA\u4EC0\u4E48\uFF1F",
      student_activity: "\u5206\u7EC4\u52A8\u624B\uFF1A\u56FA\u5B9A\u4E24\u56FE\u9489\uFF0C\u7B14\u5C16\u62C9\u7D27\u7EC6\u7EF3\u79FB\u52A8\u4E00\u5468\u753B\u692D\u5706\uFF1B\u8BA8\u8BBA\u7EF3\u957F=\u4E24\u9489\u8DDD\u65F6\u9000\u5316\u4E3A\u7EBF\u6BB5\u7684\u60C5\u5F62",
      design_intent: "\u5B9E\u9A8C\u9A8C\u8BC1\u5B9A\u4E49\u4E2D 2a>2c \u6761\u4EF6\u7684\u5FC5\u8981\u6027\uFF0C\u7A81\u7834\u6982\u5FF5\u6DF7\u6DC6\u9519\u56E0",
      content_items: ["\u5B9E\u9A8C\u793A\u610F\uFF1A\u7EF3\u957F 2a > \u4E24\u9489\u8DDD 2c"]
    },
    {
      id: "s3",
      phase: "\u6982\u5FF5\u751F\u6210",
      minutes: 5,
      teacher_activity: "\u5F15\u5BFC\u5F52\u7EB3\uFF1A\u5E73\u9762\u5185\u4E0E\u4E24\u4E2A\u5B9A\u70B9 F\u2081\u3001F\u2082 \u7684\u8DDD\u79BB\u4E4B\u548C\u7B49\u4E8E\u5E38\u6570\uFF08\u5927\u4E8E |F\u2081F\u2082|\uFF09\u7684\u70B9\u7684\u8F68\u8FF9\u53EB\u505A\u692D\u5706\uFF1B\u7ED9\u51FA\u7126\u70B9\u3001\u7126\u8DDD\u5B9A\u4E49",
      student_activity: "\u5C1D\u8BD5\u7528\u81EA\u5DF1\u7684\u8BED\u8A00\u8868\u8FF0\u5B9A\u4E49\uFF0C\u5BF9\u6BD4\u6559\u6750\u6807\u51C6\u8868\u8FF0\u4FEE\u6B63",
      design_intent: "\u4ECE\u64CD\u4F5C\u7ECF\u9A8C\u5230\u5F62\u5F0F\u5316\u5B9A\u4E49\uFF0C\u843D\u5B9E\u6570\u5B66\u62BD\u8C61\u7D20\u517B",
      content_items: ["\u5B9A\u4E49\uFF1A|MF\u2081|+|MF\u2082|=2a\uFF082a>2c\uFF09"]
    },
    {
      id: "s4",
      phase: "\u63A8\u5BFC\u65B9\u7A0B",
      minutes: 12,
      teacher_activity: "\u677F\u4E66\u63A8\u5BFC\u5168\u8FC7\u7A0B\uFF1A\u5EFA\u7CFB\uFF08F\u2081F\u2082 \u6240\u5728\u76F4\u7EBF\u4E3A x \u8F74\uFF0C\u4E2D\u5782\u7EBF\u4E3A y \u8F74\uFF09\u2192 \u8BBE P(x,y)\u3001F\u2081(-c,0)\u3001F\u2082(c,0) \u2192 \u221A((x+c)\xB2+y\xB2)+\u221A((x-c)\xB2+y\xB2)=2a \u2192 \u79FB\u9879\u3001\u4E24\u6B21\u5E73\u65B9 \u2192 (a\xB2-c\xB2)x\xB2+a\xB2y\xB2=a\xB2(a\xB2-c\xB2) \u2192 \u4EE4 b\xB2=a\xB2-c\xB2 \u2192 x\xB2/a\xB2+y\xB2/b\xB2=1\uFF08a>b>0\uFF09",
      student_activity: "\u8DDF\u968F\u63A8\u5BFC\u5E76\u52A8\u624B\u5316\u7B80\uFF1B\u5C1D\u8BD5\u8BF4\u660E\u6BCF\u4E00\u6B65\u53D8\u5F62\u7684\u7B49\u4EF7\u6027",
      design_intent: "\u5750\u6807\u6CD5\u662F\u89E3\u6790\u51E0\u4F55\u7684\u6838\u5FC3\u8303\u5F0F\uFF1B\u4E24\u6B21\u5E73\u65B9\u7684\u6280\u5DE7\u4E0E b \u7684\u5F15\u5165\u662F\u672C\u8BFE\u96BE\u70B9",
      content_items: ["\u5EFA\u7CFB\u56FE", "\u5316\u7B80\u94FE", "\u7126\u70B9\u5728 y \u8F74\uFF1Ay\xB2/a\xB2+x\xB2/b\xB2=1"]
    },
    {
      id: "s5",
      phase: "\u4F8B\u9898 1",
      minutes: 6,
      teacher_activity: "\u8BB2\u89E3\u4F8B 1\uFF1A\u5E73\u9762\u5185\u4E24\u4E2A\u5B9A\u70B9\u7684\u8DDD\u79BB\u662F 8\uFF0C\u5199\u51FA\u5230\u8FD9\u4E24\u4E2A\u5B9A\u70B9\u7684\u8DDD\u79BB\u7684\u548C\u662F 10 \u7684\u52A8\u70B9\u7684\u8F68\u8FF9\u65B9\u7A0B\u3002\u89C4\u8303\u4E66\u5199\uFF1A2a=10, 2c=8 \u2192 a=5, c=4, b\xB2=a\xB2-c\xB2=9 \u2192 x\xB2/25+y\xB2/9=1",
      student_activity: "\u72EC\u7ACB\u5B8C\u6210\u540E\u518D\u5BF9\u7167\u677F\u4E66\u4FEE\u6B63",
      design_intent: "\u5B9A\u4E49\u6CD5\u6C42\u65B9\u7A0B\u7684\u89C4\u8303\u8868\u8FBE",
      content_items: ["\u4F8B 1 \u5B8C\u6574\u89E3\u7B54"]
    },
    {
      id: "s6",
      phase: "\u4F8B\u9898 2",
      minutes: 4,
      teacher_activity: "\u8BB2\u89E3\u4F8B 2\uFF1A\u6C42 x\xB2/4+y\xB2/3=1 \u4E0E x\xB2/3+y\xB2/4=1 \u7684\u7126\u70B9\u3002\u5F3A\u8C03\uFF1A\u5206\u6BCD\u5927\u8005\u5BF9 a\xB2\uFF0C\u7126\u70B9\u4F4D\u7F6E\u770B x\xB2/y\xB2 \u5206\u6BCD",
      student_activity: "\u5148\u5224\u65AD\u7126\u70B9\u4F4D\u7F6E\u518D\u8BA1\u7B97 c",
      design_intent: "\u8FA8\u6790\u4E24\u79CD\u6807\u51C6\u65B9\u7A0B\uFF0C\u9488\u5BF9\u300C\u7126\u70B9\u4F4D\u7F6E\u5224\u65AD\u300D\u9519\u56E0\uFF08\u73ED\u7EA7\u9519\u8BEF\u7387 19%\uFF09",
      content_items: ["\u4E24\u79CD\u65B9\u7A0B\u5BF9\u6BD4\u8868"]
    },
    {
      id: "s7",
      phase: "\u53D8\u5F0F\u7EC3\u4E60",
      minutes: 3,
      teacher_activity: "\u51FA\u793A 2 \u9053\u53D8\u5F0F\uFF1A\u2460 a=4\uFF0C\u7126\u70B9\u4E3A (\xB13,0)\uFF0C\u6C42\u692D\u5706\u65B9\u7A0B\uFF1B\u2461 \u7126\u70B9\u5728 y \u8F74\u4E0A\uFF0Ca=6\uFF0C\u7126\u8DDD 4\u221A2\uFF0C\u6C42\u65B9\u7A0B",
      student_activity: "\u8BFE\u5802\u7EC3\u4E60\uFF0C2 \u540D\u5B66\u751F\u677F\u6F14",
      design_intent: "\u5373\u65F6\u5DE9\u56FA a\u3001b\u3001c \u5173\u7CFB\u4E0E\u7126\u70B9\u4F4D\u7F6E\u5224\u65AD",
      content_items: ["\u53D8\u5F0F\u9898 2 \u9053"]
    },
    {
      id: "s8",
      phase: "\u5C0F\u7ED3\u4E0E\u4F5C\u4E1A",
      minutes: 2,
      teacher_activity: "\u5F15\u5BFC\u5C0F\u7ED3\uFF1A\u5B9A\u4E49 \u2192 \u65B9\u7A0B \u2192 a\u3001b\u3001c \u5173\u7CFB\uFF1B\u5E03\u7F6E\u5206\u5C42\u4F5C\u4E1A",
      student_activity: "\u603B\u7ED3\u672C\u8BFE\u77E5\u8BC6\u4E3B\u7EBF",
      design_intent: "\u7ED3\u6784\u5316\u6536\u675F\uFF0C\u5F62\u6210\u77E5\u8BC6\u7F51\u7EDC",
      content_items: ["A \u7EC4\uFF1A\u6559\u6750 P109 \u7EC3\u4E60 1\u30012", "B \u7EC4\uFF1A\u6C42\u8FC7\u70B9 (4,3) \u4E14\u7126\u70B9\u5728 x \u8F74\u7684\u692D\u5706\u65B9\u7A0B"]
    }
  ],
  board_design: "\u5DE6\u4FA7\uFF1A\u5B9A\u4E49\u533A\uFF08\u5B9A\u4E49 + \u56FE\u5F62\uFF09\n\u4E2D\u592E\uFF1A\u63A8\u5BFC\u533A\uFF08\u5B8C\u6574\u5316\u7B80\u94FE\uFF09\n\u53F3\u4FA7\uFF1A\u4E24\u79CD\u6807\u51C6\u65B9\u7A0B\u5BF9\u6BD4\u8868",
  homework: [
    { tier: "A \u7EC4 \xB7 \u5168\u4F53", items: ["\u6559\u6750 P109 \u7EC3\u4E60\u7B2C 1\u30012 \u9898"] },
    { tier: "B \u7EC4 \xB7 \u9009\u505A", items: ["\u6C42\u8FC7\u70B9 (4,3) \u4E14\u7126\u70B9\u5728 x \u8F74\u7684\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B\uFF08\u63D0\u793A\uFF1A\u5F85\u5B9A\u7CFB\u6570\u6CD5\uFF09"] }
  ],
  citations: [
    { kind: "\u6559\u6750", title: "\u4EBA\u6559 A \u7248\u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E00\u518C", page: "P106-109" },
    { kind: "\u8BFE\u6807", title: "\u666E\u901A\u9AD8\u4E2D\u6570\u5B66\u8BFE\u7A0B\u6807\u51C6\uFF082017 \u5E74\u7248 2020 \u5E74\u4FEE\u8BA2\uFF09", page: "\u9009\u62E9\u6027\u5FC5\u4FEE\u4E00 \xB7 \u5706\u9525\u66F2\u7EBF" }
  ],
  quality_check: [
    { item: "\u8BFE\u9898\u4E0E\u7248\u672C\u7AE0\u8282\u51C6\u786E", pass: true },
    { item: "\u8BFE\u578B\u4E0E\u8BFE\u65F6\u6807\u6CE8", pass: true },
    { item: "\u5B66\u60C5\u5206\u6790\u6709\u6570\u636E\u4F9D\u636E", pass: true },
    { item: "\u6559\u5B66\u76EE\u6807 \u22653 \u6761\uFF08\u77E5\u8BC6/\u80FD\u529B/\u7D20\u517B\uFF09", pass: true },
    { item: "\u91CD\u96BE\u70B9\u5206\u5F00\u4E14\u96BE\u70B9\u6307\u5411\u601D\u7EF4\u8FC7\u7A0B", pass: true },
    { item: "\u73AF\u8282 \u22655 \u4E14\u542B\u65F6\u957F/\u5E08\u751F\u6D3B\u52A8/\u8BBE\u8BA1\u610F\u56FE", pass: true },
    { item: "\u73AF\u8282\u65F6\u957F\u5408\u8BA1 = 45 \u5206\u949F", pass: true },
    { item: "\u4F8B\u9898\u5B8C\u6574\uFF08\u9898\u5E72+\u89E3\u7B54\u94FE+\u677F\u4E66\u8981\u70B9\uFF09", pass: true },
    { item: "\u4F5C\u4E1A\u5206\u5C42\u6216\u6307\u5411\u6559\u6750\u9898\u53F7", pass: true },
    { item: "AI \u751F\u6210\u6807\u8BC6\u4E0E\u5F15\u7528\u6765\u6E90", pass: true }
  ],
  version: 3,
  status: "confirmed",
  updated_at: "2026-09-01T21:40:00.000Z"
};
var MONO_PLAN = {
  ...ELLIPSE_PLAN,
  plan_id: "plan-mono-001",
  topic: "3.2.1 \u51FD\u6570\u7684\u5355\u8C03\u6027\uFF08\u590D\u4E60\u8BFE\uFF09",
  textbook_ref: "\u4EBA\u6559 A \u7248\u5FC5\u4FEE\u7B2C\u4E00\u518C \u7B2C\u4E09\u7AE0 3.2.1",
  lesson_type: "\u590D\u4E60\u8BFE",
  class_id: "cls-g2-5",
  class_name: "\u9AD8\u4E8C 5 \u73ED",
  design_basis: {
    text: "\u9AD8\u4E8C 5 \u73ED\u300C\u51FD\u6570\u6027\u8D28\u300D\u9519\u8BEF\u7387 22%\uFF0C\u5176\u4E2D\u5B9A\u4E49\u6CD5\u8BC1\u660E\u6B65\u9AA4\u7F3A\u5931\u5360 45%",
    evidence: [{ label: "\u51FD\u6570\u7684\u5355\u8C03\u6027 \xB7 \u9519\u8BEF\u7387", value: "22%", detail: "\u8FD1 30 \u5929\u4F5C\u4E1A\u4E0E\u6D4B\u9A8C\uFF08n=44\uFF09" }]
  },
  objectives: [
    "\u7406\u89E3\u589E\u51FD\u6570\u3001\u51CF\u51FD\u6570\u7684\u5B9A\u4E49\uFF0C\u638C\u63E1\u7528\u56FE\u8C61\u4E0E\u5B9A\u4E49\u5224\u65AD\u5355\u8C03\u6027\u7684\u65B9\u6CD5",
    "\u80FD\u7528\u7B26\u53F7\u8BED\u8A00\uFF08\u0394x\u3001\u0394y\uFF09\u89C4\u8303\u4E66\u5199\u5355\u8C03\u6027\u8BC1\u660E\uFF0C\u5F52\u7EB3\u300C\u4E00\u8BBE\u3001\u4E8C\u6C42\u3001\u4E09\u5224\u5B9A\u300D\u6B65\u9AA4",
    "\u63D0\u5347\u76F4\u89C2\u60F3\u8C61\u4E0E\u903B\u8F91\u63A8\u7406\u7D20\u517B"
  ],
  key_point: "\u5355\u8C03\u6027\u5B9A\u4E49\u53CA\u5224\u65AD\u65B9\u6CD5",
  difficulty_point: "\u7528\u5B9A\u4E49\u6CD5\u5B8C\u6210\u8BC1\u660E\u7684\u89C4\u8303\u6B65\u9AA4",
  sections: ELLIPSE_PLAN.sections.map(() => ({
    id: "",
    phase: "",
    minutes: 0,
    teacher_activity: "",
    student_activity: "",
    design_intent: "",
    content_items: []
  }))
};
var ARITH_PLAN = {
  plan_id: "plan-arith-001",
  topic: "2.2.2 \u7B49\u5DEE\u6570\u5217\u7684\u524D n \u9879\u548C\uFF08\u7B2C 1 \u8BFE\u65F6\uFF09",
  textbook_ref: "\u4EBA\u6559 A \u7248\u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E8C\u518C \u7B2C\u56DB\u7AE0 2.2.2",
  lesson_type: "\u65B0\u6388\u8BFE",
  duration_minutes: 45,
  class_id: "cls-g2-5",
  class_name: "\u9AD8\u4E8C 5 \u73ED",
  design_basis: {
    text: "\u9AD8\u4E8C 5 \u73ED\u5DF2\u5B66\u6570\u5217\u5B9A\u4E49\u3001\u7B49\u5DEE\u6982\u5FF5\u4E0E\u901A\u9879\uFF0C\u53EF\u987A\u5E94\u6027\u5EFA\u6784\uFF1B\u903B\u8F91\u63A8\u7406\u4E0E\u6570\u5B66\u62BD\u8C61\u4E3A\u8584\u5F31\u73AF\u8282\uFF0C\u6559\u5B66\u8D77\u70B9\u4ECE\u5177\u4F53\u6570\u503C\u5207\u5165\u518D\u4E00\u822C\u5316",
    evidence: [
      { label: "\u7B49\u5DEE\u6570\u5217\u901A\u9879 \xB7 \u9519\u8BEF\u7387", value: "15%", detail: "\u8FD1 30 \u5929\u4F5C\u4E1A\uFF08n=44\uFF09" },
      { label: "\u7D20\u517B\u77ED\u677F", value: "\u903B\u8F91\u63A8\u7406 / \u6570\u5B66\u62BD\u8C61", detail: "\u9884\u4E60\u5355\u63A8\u5BFC\u9898\u7A7A\u7F6E\u7387 31%" }
    ]
  },
  objectives: [
    "\u7ECF\u5386\u524D n \u9879\u548C\u516C\u5F0F\u7684\u63A8\u5BFC\u8FC7\u7A0B\uFF0C\u9886\u4F1A\u5012\u5E8F\u76F8\u52A0\u7684\u601D\u60F3\u65B9\u6CD5\uFF0C\u63D0\u5347\u6570\u5B66\u8FD0\u7B97\u4E0E\u76F4\u89C2\u60F3\u8C61\u7D20\u517B",
    "\u638C\u63E1 Sn = n(a\u2081+a\u2099)/2 \u4E0E Sn = na\u2081 + n(n-1)d/2 \u4E24\u4E2A\u516C\u5F0F\uFF0C\u7406\u89E3\u516C\u5F0F\u4E2D\u53D8\u91CF\u7684\u5BF9\u5E94\u5173\u7CFB",
    "\u901A\u8FC7\u300C\u5177\u4F53\u6570\u5B57 \u2192 \u5B57\u6BCD\u4E00\u822C\u5316\u300D\u7684\u63A2\u7A76\u8DEF\u5F84\uFF0C\u9886\u4F1A\u7531\u7279\u6B8A\u5230\u4E00\u822C\u7684\u5F52\u7EB3\u65B9\u6CD5",
    "\u4F1A\u7528\u516C\u5F0F\u8FDB\u884C\u300C\u77E5\u4E09\u6C42\u4E00\u300D\u7684\u7B80\u5355\u5E94\u7528\uFF0C\u57F9\u517B\u72EC\u7ACB\u601D\u8003\u4E0E\u5408\u4F5C\u4EA4\u6D41\u7684\u54C1\u8D28"
  ],
  key_point: "\u524D n \u9879\u548C\u516C\u5F0F\u7684\u63A8\u5BFC\u548C\u7B80\u5355\u5E94\u7528",
  difficulty_point: "\u5012\u5E8F\u76F8\u52A0\u6CD5\u63A8\u5BFC\u524D n \u9879\u548C\u516C\u5F0F\uFF08\u7B49\u4EF7\u53D8\u5F62\u7684\u5408\u7406\u6027\uFF09",
  aids: "\u94A2\u7BA1\u5806\u653E\u793A\u610F\u56FE\uFF08\u9AD8\u65AF\u6C42\u548C\u6545\u4E8B\u5F15\u5165\uFF09\uFF1BGeoGebra \u52A8\u6001\u6F14\u793A\u5012\u5E8F\u5BF9\u5E94\uFF08\u5907\u9009\uFF09",
  outline: [
    { id: "o1", kind: "\u590D\u4E60", title: "\u901A\u9879\u516C\u5F0F\u70ED\u8EAB", minutes: 5, summary: "2 \u9053\u901A\u9879\u8BA1\u7B97\u9898\uFF0C\u4E3A\u63A8\u5BFC\u505A\u94FA\u57AB" },
    { id: "o2", kind: "\u5BFC\u5165", title: "\u94A2\u7BA1\u603B\u6570\u95EE\u9898", minutes: 5, summary: "\u9AD8\u65AF 1+2+\u2026+100 \u7684\u6545\u4E8B\u5F15\u5165\u5012\u5E8F\u601D\u60F3" },
    { id: "o3", kind: "\u63A2\u7A76", title: "\u5012\u5E8F\u76F8\u52A0\u6C42 S\u2087", minutes: 8, summary: "S\u2087=4+5+\u2026+10 \u6B63\u5199\u5012\u5199\u4E24\u5F0F\u76F8\u52A0" },
    { id: "o4", kind: "\u63A8\u5BFC", title: "\u4E00\u822C\u5316\u63A8\u5BFC\u516C\u5F0F", minutes: 10, summary: "\u5B57\u6BCD\u66FF\u6362\u5F97 Sn = n(a\u2081+a\u2099)/2\uFF0C\u4EE3\u5165\u901A\u9879\u5F97\u7B2C\u4E8C\u5F62\u5F0F" },
    { id: "o5", kind: "\u6982\u5FF5", title: "\u516C\u5F0F\u7279\u5F81\u5206\u6790", minutes: 4, summary: "\u56DB\u53D8\u91CF\u77E5\u4E09\u6C42\u4E00\u7684\u5143\u8BA4\u77E5\u63D0\u793A" },
    { id: "o6", kind: "\u4F8B\u9898", title: "\u4F8B \xB7 \u77E5\u4E09\u6C42\u4E00", minutes: 8, summary: "S\u2085\u2080 = 50\xD7100 + 50\xD749/2\xD7(-2) \u8BA1\u7B97\u94FE" },
    { id: "o7", kind: "\u5C0F\u7ED3", title: "\u7ED3\u6784\u5316\u5C0F\u7ED3\u4E0E\u4F5C\u4E1A", minutes: 5, summary: "\u601D\u60F3\u65B9\u6CD5\u4E3B\u7EBF + \u6559\u6750 52 \u9875\u7EC3\u4E60" }
  ],
  sections: [
    {
      id: "s1",
      phase: "\u590D\u4E60\u94FA\u57AB",
      minutes: 5,
      teacher_activity: "\u51FA\u793A 2 \u9053\u7EC3\u4E60\uFF1A\u2460\u7B49\u5DEE\u6570\u5217 {a\u2099} \u4E2D a\u2081=2\uFF0Cd=3\uFF0C\u6C42 a\u2081\u2080\uFF1B\u2461a\u2081=5\uFF0Ca\u2081\u2080=95\uFF0C\u6C42 d\u3002\u8FFD\u95EE\uFF1A\u901A\u9879\u516C\u5F0F\u4E2D\u51E0\u4E2A\u53D8\u91CF\uFF1F\u77E5\u51E0\u4E2A\u80FD\u6C42\u51E0\u4E2A\uFF1F",
      student_activity: "\u72EC\u7ACB\u5B8C\u6210\u540E\u53E3\u7B54\uFF1B\u8BF4\u51FA a\u2099 = a\u2081 + (n-1)d \u7684\u56DB\u53D8\u91CF\u5173\u7CFB",
      design_intent: "\u590D\u4E60\u73AF\u8282\u76F4\u63A5\u670D\u52A1\u4E8E\u672C\u8BFE\u300C\u77E5\u4E09\u6C42\u4E00\u300D\u7684\u516C\u5F0F\u7279\u5F81\u5206\u6790\uFF08\u4EBA\u6559\u793E\u6837\u672C\uFF1A\u590D\u4E60\u5148\u884C\uFF09",
      content_items: ["\u7EC3\u4E60\u2460\uFF1Aa\u2081\u2080 = 2 + 9\xD73 = 29", "\u7EC3\u4E60\u2461\uFF1Ad = (95-5)/9 = 10"]
    },
    {
      id: "s2",
      phase: "\u60C5\u5883\u5BFC\u5165",
      minutes: 5,
      teacher_activity: "\u5C55\u793A\u94A2\u7BA1\u5806\u653E\u793A\u610F\u56FE\uFF08\u9876\u5C42 4 \u6839\u3001\u5E95\u5C42 10 \u6839\uFF0C\u6BCF\u5C42\u9012\u589E 1 \u6839\uFF09\uFF1A\u5982\u4F55\u5FEB\u901F\u6C42\u603B\u6570\uFF1F\u8BB2\u8FF0\u9AD8\u65AF 1+2+\u2026+100 = 5050 \u7684\u5012\u5E8F\u914D\u5BF9\u6545\u4E8B",
      student_activity: "\u5C1D\u8BD5\u8BA1\u7B97 4+5+6+\u2026+10\uFF1B\u8046\u542C\u9AD8\u65AF\u6545\u4E8B\uFF0C\u4F53\u4F1A\u9996\u5C3E\u914D\u5BF9\u601D\u60F3",
      design_intent: "\u4ECE\u719F\u6089\u7684\u51E0\u4F55\u56FE\u5F62\u4E0E\u6570\u5B66\u53F2\u5F15\u5165\uFF0C\u964D\u4F4E\u62BD\u8C61\u8D77\u70B9\uFF08\u9488\u5BF9\u903B\u8F91\u63A8\u7406\u7D20\u517B\u77ED\u677F\uFF09",
      content_items: ["\u94A2\u7BA1\u5806\u653E\u793A\u610F\u56FE", "1+100 = 2+99 = \u2026 = 101\uFF0C\u5171 50 \u5BF9"]
    },
    {
      id: "s3",
      phase: "\u63A2\u7A76\u63A8\u5BFC",
      minutes: 8,
      teacher_activity: "\u677F\u4E66\u5F15\u5BFC\uFF1AS\u2087 = 4+5+6+7+8+9+10 \u2460\uFF0C\u5C06\u5404\u9879\u5012\u5E8F\u5199\uFF1AS\u2087 = 10+9+8+7+6+5+4 \u2461\uFF1B\u2460+\u2461 \u5F97 2S\u2087 = (4+10)\xD77 = 98",
      student_activity: "\u52A8\u624B\u5B8C\u6210 \u2460+\u2461 \u7684\u76F8\u52A0\uFF0C\u89C2\u5BDF\u5BF9\u5E94\u9879\u548C\u5747\u4E3A 14\uFF1B\u5F52\u7EB3 S\u2087 = 49",
      design_intent: "\u5177\u4F53\u6570\u5B57\u5148\u884C\uFF0C\u5EFA\u7ACB\u5012\u5E8F\u76F8\u52A0\u7684\u76F4\u89C2\u7ECF\u9A8C\uFF08\u987A\u5E94\u6027\u5EFA\u6784\uFF09",
      content_items: ["\u2460+\u2461 \u2192 2S\u2087=(4+10)\xD77 \u2192 S\u2087=49"]
    },
    {
      id: "s4",
      phase: "\u516C\u5F0F\u63A8\u5BFC",
      minutes: 10,
      teacher_activity: "\u4E00\u822C\u5316\uFF1ASn = a\u2081+a\u2082+\u2026+a\u2099 \u2460\uFF0C\u5012\u5E8F Sn = a\u2099+a\u2099\u208B\u2081+\u2026+a\u2081 \u2461\uFF1B\u5229\u7528\u7B49\u5DEE\u6027\u8D28 a\u2096+a\u2099\u208A\u2081\u208B\u2096 = a\u2081+a\u2099\uFF0C\u2460+\u2461 \u5F97 2Sn = n(a\u2081+a\u2099)\uFF1B\u518D\u4EE3\u5165 a\u2099 = a\u2081+(n-1)d \u5F97 Sn = na\u2081 + n(n-1)d/2",
      student_activity: "\u8DDF\u5199\u63A8\u5BFC\u8FC7\u7A0B\uFF0C\u8BF4\u660E\u6BCF\u4E00\u6B65\u7528\u5230\u7684\u6027\u8D28\uFF1B\u6BD4\u8F83\u4E24\u4E2A\u516C\u5F0F\u7684\u9002\u7528\u573A\u666F",
      design_intent: "\u7531\u7279\u6B8A\u5230\u4E00\u822C\u5B8C\u6210\u5F62\u5F0F\u5316\u63A8\u5BFC\uFF0C\u7A81\u7834\u672C\u8BFE\u96BE\u70B9\uFF08\u7B49\u4EF7\u53D8\u5F62\u7684\u5408\u7406\u6027\uFF09",
      content_items: ["Sn = n(a\u2081+a\u2099)/2", "Sn = na\u2081 + n(n-1)d/2"]
    },
    {
      id: "s5",
      phase: "\u7279\u5F81\u5206\u6790",
      minutes: 4,
      teacher_activity: "\u5F15\u5BFC\u5206\u6790\u516C\u5F0F\u7279\u5F81\uFF1A\u6BCF\u4E2A\u516C\u5F0F\u90FD\u5305\u542B\u56DB\u4E2A\u53D8\u91CF\uFF08Sn\u3001a\u2081\u3001a\u2099/n\u3001d\uFF09\uFF0C\u77E5\u9053\u4EFB\u610F\u4E09\u4E2A\u53EF\u6C42\u7B2C\u56DB\u4E2A\uFF1B\u8FFD\u95EE\uFF1A\u4F55\u65F6\u7528\u7B2C\u4E00\u4E2A\u516C\u5F0F\u66F4\u7B80\u4FBF\uFF1F",
      student_activity: "\u8BA8\u8BBA\u5E76\u603B\u7ED3\uFF1A\u5DF2\u77E5\u9996\u672B\u9879\u7528\u516C\u5F0F\u4E00\uFF0C\u5DF2\u77E5 a\u2081 \u4E0E d \u7528\u516C\u5F0F\u4E8C",
      design_intent: "\u300C\u77E5\u4E09\u6C42\u4E00\u300D\u7684\u5143\u8BA4\u77E5\u63D0\u793A\uFF08\u4EBA\u6559\u793E\u6837\u672C\u9A8C\u6536\u8981\u70B9\uFF09",
      content_items: ["\u56DB\u53D8\u91CF\u77E5\u4E09\u6C42\u4E00\u5BF9\u7167\u8868"]
    },
    {
      id: "s6",
      phase: "\u4F8B\u9898\u5E94\u7528",
      minutes: 8,
      teacher_activity: "\u8BB2\u89E3\u4F8B\u9898\uFF1A\u7B49\u5DEE\u6570\u5217 {a\u2099} \u4E2D a\u2081=100\uFF0Cd=-2\uFF0C\u6C42 S\u2085\u2080\u3002\u89C4\u8303\u4E66\u5199\uFF1AS\u2085\u2080 = 50\xD7100 + 50\xD749/2\xD7(-2) = 5000 - 2450 = 2550\uFF1B\u8FFD\u95EE\u80FD\u5426\u7528\u516C\u5F0F\u4E00\u9A8C\u8BC1",
      student_activity: "\u72EC\u7ACB\u5B8C\u6210\u540E\u518D\u5BF9\u7167\u677F\u4E66\u4FEE\u6B63\uFF1B\u7528 a\u2085\u2080 = 100 + 49\xD7(-2) = 2 \u9A8C\u8BC1 S\u2085\u2080 = 50\xD7(100+2)/2 = 2550",
      design_intent: "\u53CC\u516C\u5F0F\u4E92\u9A8C\u57F9\u517B\u8FD0\u7B97\u4E25\u8C28\u6027\uFF08\u542B\u5B8C\u6574\u8BA1\u7B97\u94FE\uFF09",
      content_items: ["\u4F8B\u9898\u5B8C\u6574\u89E3\u7B54\uFF08\u53CC\u516C\u5F0F\u4E92\u9A8C\uFF09"]
    },
    {
      id: "s7",
      phase: "\u5C0F\u7ED3\u4F5C\u4E1A",
      minutes: 5,
      teacher_activity: "\u5F15\u5BFC\u5C0F\u7ED3\uFF1A\u5012\u5E8F\u76F8\u52A0\u601D\u60F3 \u2192 \u4E24\u4E2A\u516C\u5F0F \u2192 \u77E5\u4E09\u6C42\u4E00\uFF1B\u5E03\u7F6E\u4F5C\u4E1A\uFF1A\u6559\u6750 P52 \u7EC3\u4E60 1(3)(4)\uFF0CB \u7EC4\u8865\u5145\u9006\u5E8F\u6C42\u548C\u7EFC\u5408\u9898",
      student_activity: "\u603B\u7ED3\u672C\u8BFE\u601D\u60F3\u65B9\u6CD5\u4E3B\u7EBF\uFF0C\u8BB0\u5F55\u4F5C\u4E1A",
      design_intent: "\u7ED3\u6784\u5316\u6536\u675F\uFF1B\u4F5C\u4E1A\u6307\u5411\u6559\u6750\u5177\u4F53\u9875\u7801\u9898\u53F7",
      content_items: ["A \u7EC4\uFF1A\u6559\u6750 P52 \u7EC3\u4E60 1(3)(4)", "B \u7EC4\uFF1A\u7B49\u5DEE\u6570\u5217 {a\u2099} \u6EE1\u8DB3 S\u2081\u2080=100\uFF0CS\u2082\u2080=400\uFF0C\u6C42 S\u2083\u2080"]
    }
  ],
  board_design: "\u5DE6\u4FA7\uFF1A\u5012\u5E8F\u76F8\u52A0\u63A8\u5BFC\u533A\uFF08\u2460\u2461\u4E24\u5F0F\u76F8\u52A0\uFF09\n\u4E2D\u592E\uFF1A\u4E24\u4E2A\u6C42\u548C\u516C\u5F0F\uFF08\u6807\u56DB\u53D8\u91CF\uFF09\n\u53F3\u4FA7\uFF1A\u77E5\u4E09\u6C42\u4E00\u7279\u5F81\u8868 + \u4F8B\u9898\u89E3\u7B54",
  homework: [
    { tier: "A \u7EC4 \xB7 \u5168\u4F53", items: ["\u6559\u6750 P52 \u7EC3\u4E60\u7B2C 1(3)(4) \u9898"] },
    { tier: "B \u7EC4 \xB7 \u9009\u505A", items: ["\u7B49\u5DEE\u6570\u5217 {a\u2099} \u6EE1\u8DB3 S\u2081\u2080=100\uFF0CS\u2082\u2080=400\uFF0C\u6C42 S\u2083\u2080\uFF08\u63D0\u793A\uFF1AS\u2099/n \u4ECD\u6210\u7B49\u5DEE\uFF09"] }
  ],
  citations: [
    { kind: "\u6559\u6750", title: "\u4EBA\u6559 A \u7248\u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E8C\u518C", page: "P50-52" },
    { kind: "\u8BFE\u6807", title: "\u666E\u901A\u9AD8\u4E2D\u6570\u5B66\u8BFE\u7A0B\u6807\u51C6\uFF082017 \u5E74\u7248 2020 \u5E74\u4FEE\u8BA2\uFF09", page: "\u9009\u62E9\u6027\u5FC5\u4FEE\u4E8C \xB7 \u6570\u5217" },
    { kind: "\u6559\u5B66\u8BBE\u8BA1", title: "\u4EBA\u6559\u793E\u5B98\u7F51 \xB7 \u7B49\u5DEE\u6570\u5217\u524D n \u9879\u548C\u6559\u5B66\u8BBE\u8BA1", page: "2025-09 \u914D\u5957\u8D44\u6E90" }
  ],
  quality_check: [
    { item: "\u8BFE\u9898\u4E0E\u7248\u672C\u7AE0\u8282\u51C6\u786E", pass: true },
    { item: "\u8BFE\u578B\u4E0E\u8BFE\u65F6\u6807\u6CE8", pass: true },
    { item: "\u5B66\u60C5\u5206\u6790\u6709\u6570\u636E\u4F9D\u636E", pass: true },
    { item: "\u6559\u5B66\u76EE\u6807 \u22653 \u6761\uFF08\u77E5\u8BC6/\u80FD\u529B/\u7D20\u517B\uFF09", pass: true },
    { item: "\u91CD\u96BE\u70B9\u5206\u5F00\u4E14\u96BE\u70B9\u6307\u5411\u601D\u7EF4\u8FC7\u7A0B", pass: true },
    { item: "\u73AF\u8282 \u22655 \u4E14\u542B\u65F6\u957F/\u5E08\u751F\u6D3B\u52A8/\u8BBE\u8BA1\u610F\u56FE", pass: true },
    { item: "\u73AF\u8282\u65F6\u957F\u5408\u8BA1 = 45 \u5206\u949F", pass: true },
    { item: "\u4F8B\u9898\u5B8C\u6574\uFF08\u9898\u5E72+\u89E3\u7B54\u94FE+\u677F\u4E66\u8981\u70B9\uFF09", pass: true },
    { item: "\u4F5C\u4E1A\u5206\u5C42\u6216\u6307\u5411\u6559\u6750\u9898\u53F7", pass: true },
    { item: "AI \u751F\u6210\u6807\u8BC6\u4E0E\u5F15\u7528\u6765\u6E90", pass: true }
  ],
  version: 1,
  status: "confirmed",
  updated_at: "2026-09-02T22:10:00.000Z"
};
var V2_TEMPLATES = [
  { template_id: "math-theorem-dark", name: "\u5B9A\u7406\u65B0\u8BFE \xB7 \u6DF1\u7A7A\u84DD", desc: "\u6DF1\u8272\u5B9A\u7406\u8BFE\uFF0C\u9002\u5408\u6982\u5FF5\u63A8\u5BFC\u4E3B\u7EBF", swatch: { bg: "#0F1E3C", primary: "#3B82F6", accent: "#F59E0B" } },
  { template_id: "math-theorem-light", name: "\u5B9A\u7406\u65B0\u8BFE \xB7 \u7D20\u767D", desc: "\u6D45\u8272\u5B9A\u7406\u8BFE\uFF0C\u6295\u5F71\u4EEA\u53CB\u597D", swatch: { bg: "#FFFFFF", primary: "#1D5BBF", accent: "#0E9488" } },
  { template_id: "exercise", name: "\u4E60\u9898\u8BFE \xB7 \u8349\u7A3F\u7EFF", desc: "\u5927\u9898\u76EE\u533A + \u89E3\u7B54\u7559\u767D", swatch: { bg: "#F6FBF4", primary: "#2F855A", accent: "#C05621" } },
  { template_id: "review", name: "\u590D\u4E60\u8BFE \xB7 \u7ED3\u6784\u6A59", desc: "\u77E5\u8BC6\u7ED3\u6784\u56FE\u4F18\u5148", swatch: { bg: "#FFF9F0", primary: "#C05621", accent: "#2B6CB0" } },
  { template_id: "open-class", name: "\u516C\u5F00\u8BFE \xB7 \u7ADE\u8D5B\u7D2B", desc: "\u9AD8\u5BF9\u6BD4\u5927\u5B57\u53F7\uFF0C\u540E\u6392\u53EF\u89C1", swatch: { bg: "#1A1035", primary: "#9F7AEA", accent: "#F6AD55" } },
  { template_id: "lecture", name: "\u8BF4\u8BFE \xB7 \u7070\u9636", desc: "\u6781\u7B80\u6392\u7248\uFF0C\u8BC4\u5BA1\u573A\u666F", swatch: { bg: "#FAFAFA", primary: "#37474F", accent: "#546E7A" } }
];
function el(id, left, top, width, height) {
  return { id, left, top, width, height };
}
var ELLIPSE_DECK = {
  deck_id: "deck-ellipse-001",
  title: "3.1.1 \u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B",
  class_id: "cls-g2-3",
  class_name: "\u9AD8\u4E8C 3 \u73ED",
  template_id: "math-theorem-dark",
  plan_id: "plan-ellipse-001",
  version: 2,
  exported_at: null,
  slides: [
    {
      id: "sl-1",
      kind: "cover",
      title: "\u5C01\u9762",
      elements: [
        { ...el("e1", 140, 200, 1e3, 90), type: "text", html: "3.1.1 \u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B", fontSize: 44, color: "#FFFFFF", bold: true, align: "center" },
        { ...el("e2", 340, 320, 600, 40), type: "text", html: "\u4EBA\u6559 A \u7248\u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E00\u518C \xB7 \u7B2C\u4E09\u7AE0 \u5706\u9525\u66F2\u7EBF", fontSize: 18, color: "#93B4F5", align: "center" },
        { ...el("e3", 340, 380, 600, 40), type: "text", html: "\u9AD8\u4E8C 3 \u73ED \xB7 \u6570\u5B66 \xB7 \u674E\u6587\u6F9C", fontSize: 16, color: "#6B8AC9", align: "center" },
        { ...el("e4", 440, 500, 400, 220), type: "geometry", shape: "ellipse-focus", params: { a: 5, b: 3, foci: 4 } }
      ]
    },
    {
      id: "sl-2",
      kind: "objective",
      title: "\u5B66\u4E60\u76EE\u6807",
      elements: [
        { ...el("e1", 100, 70, 800, 56), type: "text", html: "\u5B66\u4E60\u76EE\u6807", fontSize: 30, color: "#3B82F6", bold: true },
        { ...el("e2", 100, 170, 1080, 60), type: "text", html: "1. \u7406\u89E3\u692D\u5706\u7684\u5B9A\u4E49\uFF0C\u638C\u63E1\u4E24\u79CD\u6807\u51C6\u65B9\u7A0B\u53CA $a^2=b^2+c^2$", fontSize: 20, color: "#E6EDF7" },
        { ...el("e3", 100, 250, 1080, 60), type: "text", html: "2. \u7ECF\u5386\u300C\u5B9E\u9A8C \u2192 \u63A8\u5BFC\u300D\u8FC7\u7A0B\uFF0C\u638C\u63E1\u5750\u6807\u6CD5\u7814\u7A76\u51E0\u4F55\u95EE\u9898\u7684\u8303\u5F0F", fontSize: 20, color: "#E6EDF7" },
        { ...el("e4", 100, 330, 1080, 60), type: "text", html: "3. \u611F\u53D7\u6570\u5B66\u6E90\u4E8E\u751F\u6D3B\uFF1A\u884C\u661F\u8F68\u9053\u4E0E\u6CB9\u7F50\u622A\u9762\u4E2D\u7684\u692D\u5706", fontSize: 20, color: "#E6EDF7" },
        { ...el("e5", 100, 420, 1080, 50), type: "text", html: "\u5B66\u4E60\u91CD\u70B9\uFF1A\u5B9A\u4E49\u4E0E\u6807\u51C6\u65B9\u7A0B\u3000\u3000\u5B66\u4E60\u96BE\u70B9\uFF1A\u6807\u51C6\u65B9\u7A0B\u7684\u63A8\u5BFC", fontSize: 16, color: "#93B4F5" }
      ]
    },
    {
      id: "sl-3",
      kind: "explore",
      title: "\u751F\u6D3B\u4E2D\u7684\u692D\u5706",
      elements: [
        { ...el("e1", 100, 70, 800, 56), type: "text", html: "\u4ECE\u5706\u5230\u692D\u5706\uFF1A\u4E00\u4E2A\u8FFD\u95EE", fontSize: 30, color: "#3B82F6", bold: true },
        { ...el("e2", 100, 160, 1080, 56), type: "text", html: "\u5706\uFF1A\u5E73\u9762\u5185\u5230 <b>\u5B9A\u70B9</b> \u7684\u8DDD\u79BB\u7B49\u4E8E <b>\u5B9A\u957F</b> \u7684\u70B9\u7684\u96C6\u5408", fontSize: 20, color: "#E6EDF7" },
        { ...el("e3", 100, 230, 1080, 56), type: "text", html: "\u8FFD\u95EE\uFF1A\u5E73\u9762\u5185\u5230 <b>\u4E24\u4E2A\u5B9A\u70B9</b> \u7684\u8DDD\u79BB <b>\u4E4B\u548C</b> \u4E3A\u5B9A\u957F\u7684\u70B9\u7684\u8F68\u8FF9\u662F\uFF1F", fontSize: 20, color: "#F59E0B" },
        { ...el("e4", 120, 320, 500, 320), type: "geometry", shape: "orbit-demo", params: { a: 5, b: 3 } },
        { ...el("e5", 660, 340, 500, 280), type: "text", html: "\u884C\u661F\u8F68\u9053 \xB7 \u6CB9\u7F50\u6A2A\u622A\u9762 \xB7 \u503E\u659C\u6C34\u676F\u6C34\u9762", fontSize: 18, color: "#93B4F5" },
        { ...el("e6", 660, 400, 500, 120), type: "text", html: "\u5B83\u4EEC\u4E3A\u4EC0\u4E48\u90FD\u662F\u692D\u5706\uFF1F<br>\u6570\u5B66\u4E0A\u5982\u4F55\u7CBE\u786E\u5B9A\u4E49\uFF1F", fontSize: 18, color: "#E6EDF7" }
      ]
    },
    {
      id: "sl-4",
      kind: "explore",
      title: "\u7EC6\u7EF3\u5B9E\u9A8C",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u52A8\u624B\u5B9E\u9A8C\uFF1A\u7528\u7EC6\u7EF3\u753B\u692D\u5706", fontSize: 30, color: "#3B82F6", bold: true },
        { ...el("e2", 100, 160, 1080, 120), type: "text", html: "\u6B65\u9AA4\uFF1A\u753B\u677F\u4E0A\u53D6\u4E24\u4E2A\u5B9A\u70B9 F\u2081\u3001F\u2082 \u9489\u4E0A\u56FE\u9489 \u2192 \u957F\u5EA6\u5927\u4E8E |F\u2081F\u2082| \u7684\u7EC6\u7EF3\u4E24\u7AEF\u56FA\u5B9A \u2192 \u7B14\u5C16\u62C9\u7D27\u7EC6\u7EF3\u79FB\u52A8\u4E00\u5468", fontSize: 19, color: "#E6EDF7" },
        { ...el("e3", 140, 320, 480, 300), type: "geometry", shape: "string-experiment", params: { a: 5, b: 3, foci: 4 } },
        { ...el("e4", 680, 340, 460, 200), type: "text", html: "\u601D\u8003\uFF1A<br>\u2460 \u7EF3\u957F\u4E0E |F\u2081F\u2082| \u6EE1\u8DB3\u4EC0\u4E48\u5173\u7CFB\u624D\u80FD\u753B\u51FA\u692D\u5706\uFF1F<br>\u2461 \u82E5\u7EF3\u957F = |F\u2081F\u2082|\uFF0C\u753B\u51FA\u4EC0\u4E48\uFF1F", fontSize: 19, color: "#F59E0B" },
        { ...el("e5", 680, 540, 460, 60), type: "text", html: "\uFF08\u9000\u5316\u4E3A\u7EBF\u6BB5 \u2014\u2014 \u5B9A\u4E49\u4E2D\u6761\u4EF6\u7684\u5FC5\u8981\u6027\uFF01\uFF09", fontSize: 16, color: "#93B4F5" }
      ]
    },
    {
      id: "sl-5",
      kind: "example",
      title: "\u692D\u5706\u7684\u5B9A\u4E49",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u692D\u5706\u7684\u5B9A\u4E49", fontSize: 30, color: "#3B82F6", bold: true },
        { ...el("e2", 110, 170, 1060, 140), type: "text", html: "\u5E73\u9762\u5185\u4E0E\u4E24\u4E2A\u5B9A\u70B9 $F_1$\u3001$F_2$ \u7684\u8DDD\u79BB\u4E4B\u548C\u7B49\u4E8E\u5E38\u6570\uFF08\u5927\u4E8E $|F_1F_2|$\uFF09\u7684\u70B9\u7684\u8F68\u8FF9\u53EB\u505A<b>\u692D\u5706</b>\u3002", fontSize: 22, color: "#FFFFFF" },
        { ...el("e3", 110, 330, 1060, 60), type: "text", html: "\u4E24\u4E2A\u5B9A\u70B9\u53EB\u505A\u692D\u5706\u7684<b>\u7126\u70B9</b>\uFF0C\u4E24\u7126\u70B9\u95F4\u7684\u8DDD\u79BB\u53EB\u505A\u692D\u5706\u7684<b>\u7126\u8DDD</b>\uFF08$2c$\uFF09\u3002", fontSize: 19, color: "#E6EDF7" },
        { ...el("e4", 360, 420, 560, 260), type: "geometry", shape: "ellipse-focus", params: { a: 5, b: 3, foci: 4, point: true } },
        { ...el("e5", 110, 610, 500, 50), type: "latex", latex: "|MF_1| + |MF_2| = 2a \\quad (2a > 2c)", color: "#F59E0B", fontSize: 22 }
      ]
    },
    {
      id: "sl-6",
      kind: "explore",
      title: "\u5EFA\u7CFB\u8BBE\u70B9",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u5750\u6807\u6CD5 \xB7 \u5EFA\u7CFB\u4E0E\u8BBE\u70B9", fontSize: 30, color: "#3B82F6", bold: true },
        { ...el("e2", 120, 170, 520, 300), type: "geometry", shape: "ellipse-coordinate", params: { a: 5, b: 3, foci: 4, point: true } },
        { ...el("e3", 700, 190, 480, 60), type: "text", html: "\u5EFA\u7CFB\uFF1A$F_1F_2$ \u6240\u5728\u76F4\u7EBF\u4E3A $x$ \u8F74\uFF0C\u4E2D\u5782\u7EBF\u4E3A $y$ \u8F74", fontSize: 19, color: "#E6EDF7" },
        { ...el("e4", 700, 270, 480, 60), type: "latex", latex: "F_1(-c,0),\\ F_2(c,0)", color: "#E6EDF7", fontSize: 20 },
        { ...el("e5", 700, 350, 480, 60), type: "latex", latex: "\\text{\u8BBE}\\ P(x,y)", color: "#E6EDF7", fontSize: 20 },
        { ...el("e6", 700, 440, 480, 100), type: "text", html: "\u4E3A\u4EC0\u4E48\u8FD9\u6837\u5EFA\u7CFB\uFF1F<br>\u2014\u2014 \u5BF9\u79F0\u6027\u4F7F\u65B9\u7A0B\u5F62\u5F0F\u6700\u7B80", fontSize: 17, color: "#93B4F5" }
      ]
    },
    {
      id: "sl-7",
      kind: "explore",
      title: "\u63A8\u5BFC\u5316\u7B80",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u63A8\u5BFC\uFF1A\u4E24\u6B21\u5E73\u65B9\u5316\u7B80", fontSize: 30, color: "#3B82F6", bold: true },
        { ...el("e2", 160, 160, 960, 60), type: "latex", latex: "\\sqrt{(x+c)^2+y^2} + \\sqrt{(x-c)^2+y^2} = 2a", color: "#FFFFFF", fontSize: 22, display: true },
        { ...el("e3", 160, 250, 960, 60), type: "latex", latex: "\\Rightarrow\\ (a^2-c^2)x^2 + a^2y^2 = a^2(a^2-c^2)", color: "#E6EDF7", fontSize: 21, display: true },
        { ...el("e4", 160, 340, 960, 60), type: "latex", latex: "\\text{\u4EE4}\\ b^2 = a^2 - c^2\\ (b>0)", color: "#F59E0B", fontSize: 21, display: true },
        { ...el("e5", 160, 430, 960, 80), type: "latex", latex: "\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\quad (a>b>0)", color: "#FFFFFF", fontSize: 26, display: true },
        { ...el("e6", 160, 540, 960, 60), type: "text", html: "b \u7684\u5F15\u5165\u7EAF\u7CB9\u4E3A\u4E86\u5F62\u5F0F\u4F18\u7F8E \u2014\u2014 \u6570\u5B66\u7B80\u6D01\u6027\u7684\u4E00\u6B21\u793A\u8303", fontSize: 16, color: "#93B4F5" }
      ]
    },
    {
      id: "sl-8",
      kind: "explore",
      title: "\u4E24\u79CD\u6807\u51C6\u65B9\u7A0B",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u4E24\u79CD\u6807\u51C6\u65B9\u7A0B\u5BF9\u6BD4", fontSize: 30, color: "#3B82F6", bold: true },
        { ...el("e2", 110, 170, 500, 70), type: "latex", latex: "\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1", color: "#FFFFFF", fontSize: 24 },
        { ...el("e3", 670, 170, 500, 70), type: "latex", latex: "\\frac{y^2}{a^2}+\\frac{x^2}{b^2}=1", color: "#FFFFFF", fontSize: 24 },
        { ...el("e4", 110, 250, 500, 60), type: "text", html: "\u7126\u70B9\u5728 x \u8F74\uFF1A$F(\\pm c,0)$", fontSize: 18, color: "#E6EDF7" },
        { ...el("e5", 670, 250, 500, 60), type: "text", html: "\u7126\u70B9\u5728 y \u8F74\uFF1A$F(0,\\pm c)$", fontSize: 18, color: "#E6EDF7" },
        { ...el("e6", 140, 330, 440, 250), type: "geometry", shape: "ellipse-focus", params: { a: 5, b: 3, foci: 4 } },
        { ...el("e7", 700, 330, 440, 250), type: "geometry", shape: "ellipse-focus-v", params: { a: 5, b: 3, foci: 4 } },
        { ...el("e8", 110, 600, 1060, 60), type: "text", html: "\u5171\u540C\u70B9\uFF1A$a^2=b^2+c^2$\uFF0C\u4E14 $a>b>0$ \u2014\u2014 \u5927\u5206\u6BCD\u5BF9 $a^2$\uFF0C\u7126\u70B9\u770B\u4F4D\u7F6E", fontSize: 18, color: "#F59E0B" }
      ]
    },
    {
      id: "sl-9",
      kind: "example",
      title: "\u4F8B 1",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u4F8B 1 \xB7 \u5B9A\u4E49\u6CD5\u6C42\u65B9\u7A0B", fontSize: 30, color: "#2F855A", bold: true },
        { ...el("e2", 110, 160, 1060, 100), type: "text", html: "\u5E73\u9762\u5185\u4E24\u4E2A\u5B9A\u70B9\u7684\u8DDD\u79BB\u662F 8\uFF0C\u5199\u51FA\u5230\u8FD9\u4E24\u4E2A\u5B9A\u70B9\u7684\u8DDD\u79BB\u7684\u548C\u662F 10 \u7684\u52A8\u70B9\u7684\u8F68\u8FF9\u65B9\u7A0B\u3002", fontSize: 20, color: "#FFFFFF" },
        { ...el("e3", 110, 290, 1060, 60), type: "latex", latex: "2a=10,\\ 2c=8 \\Rightarrow a=5,\\ c=4,\\ b^2=a^2-c^2=9", color: "#E6EDF7", fontSize: 21 },
        { ...el("e4", 110, 380, 1060, 80), type: "latex", latex: "\\therefore\\ \\frac{x^2}{25}+\\frac{y^2}{9}=1", color: "#F59E0B", fontSize: 26, display: true },
        { ...el("e5", 110, 500, 1060, 60), type: "text", html: "\u8981\u70B9\uFF1A\u7531\u5B9A\u4E49\u5B9A a \u4E0E c\uFF0C\u518D\u7531 $a^2=b^2+c^2$ \u6C42 b \u2014\u2014 \u4E0D\u5FC5\u6B7B\u8BB0", fontSize: 17, color: "#93B4F5" }
      ]
    },
    {
      id: "sl-10",
      kind: "example",
      title: "\u4F8B 2",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u4F8B 2 \xB7 \u5224\u65AD\u7126\u70B9\u4F4D\u7F6E", fontSize: 30, color: "#2F855A", bold: true },
        { ...el("e2", 110, 160, 1060, 100), type: "text", html: "\u5206\u522B\u6C42\u692D\u5706 $C_1:\\ \\frac{x^2}{4}+\\frac{y^2}{3}=1$ \u4E0E $C_2:\\ \\frac{x^2}{3}+\\frac{y^2}{4}=1$ \u7684\u7126\u70B9\u3002", fontSize: 20, color: "#FFFFFF" },
        { ...el("e3", 110, 290, 1060, 60), type: "text", html: "$C_1$\uFF1A$4>3$\uFF0C\u7126\u70B9\u5728 x \u8F74\uFF1B$C_2$\uFF1A$4>3$ \u4F46\u914D\u7ED9 $y^2$\uFF0C\u7126\u70B9\u5728 y \u8F74", fontSize: 19, color: "#E6EDF7" },
        { ...el("e4", 110, 370, 1060, 60), type: "latex", latex: "c^2 = 4-3 = 1", color: "#E6EDF7", fontSize: 20 },
        { ...el("e5", 110, 450, 1060, 60), type: "latex", latex: "C_1:\\ F(\\pm 1,0) \\qquad C_2:\\ F(0,\\pm 1)", color: "#F59E0B", fontSize: 22 },
        { ...el("e6", 110, 540, 1060, 60), type: "text", html: "\u6613\u9519\u70B9\uFF1A\u5206\u6BCD\u5927\u5C0F\u51B3\u5B9A a\xB2\uFF0C\u5206\u6BCD\u4F4D\u7F6E\u51B3\u5B9A\u7126\u70B9\u8F74 \u2014\u2014 \u73ED\u7EA7\u9884\u4E60\u9519\u8BEF\u7387 19%", fontSize: 16, color: "#93B4F5" }
      ]
    },
    {
      id: "sl-11",
      kind: "variant",
      title: "\u53D8\u5F0F\u7EC3\u4E60",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u53D8\u5F0F\u7EC3\u4E60 \xB7 \u5373\u65F6\u5DE9\u56FA", fontSize: 30, color: "#C05621", bold: true },
        { ...el("e2", 110, 170, 1060, 80), type: "text", html: "\u2460 \u5DF2\u77E5 $a=4$\uFF0C\u7126\u70B9\u4E3A $(\\pm 3, 0)$\uFF0C\u6C42\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B\uFF1B", fontSize: 20, color: "#FFFFFF" },
        { ...el("e3", 110, 280, 1060, 80), type: "text", html: "\u2461 \u7126\u70B9\u5728 y \u8F74\u4E0A\uFF0C$a=6$\uFF0C\u7126\u8DDD\u4E3A $4\\sqrt{2}$\uFF0C\u6C42\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B\u3002", fontSize: 20, color: "#FFFFFF" },
        { ...el("e4", 110, 390, 1060, 60), type: "text", html: "\u65B9\u6CD5\uFF1A\u5148\u5B9A\u7126\u70B9\u8F74 \u2192 \u6C42 c \u2192 $b^2=a^2-c^2$ \u2192 \u5199\u65B9\u7A0B", fontSize: 17, color: "#93B4F5" },
        { ...el("e5", 110, 460, 1060, 60), type: "text", html: "\uFF08\u7B54\u6848\uFF1A\u2460 $\\frac{x^2}{16}+\\frac{y^2}{7}=1$\u3000\u2461 $\\frac{y^2}{36}+\\frac{x^2}{28}=1$\uFF09", fontSize: 16, color: "#6B8AC9" }
      ]
    },
    {
      id: "sl-12",
      kind: "homework",
      title: "\u5C0F\u7ED3\u4E0E\u4F5C\u4E1A",
      elements: [
        { ...el("e1", 100, 70, 900, 56), type: "text", html: "\u5C0F\u7ED3 \xB7 \u4F5C\u4E1A", fontSize: 30, color: "#3B82F6", bold: true },
        { ...el("e2", 110, 160, 1060, 120), type: "text", html: "\u77E5\u8BC6\u4E3B\u7EBF\uFF1A\u5B9A\u4E49\uFF08$2a>2c$\uFF09\u2192 \u5EFA\u7CFB\u63A8\u5BFC \u2192 \u6807\u51C6\u65B9\u7A0B\uFF08\u4E24\u79CD\uFF09\u2192 $a^2=b^2+c^2$", fontSize: 20, color: "#E6EDF7" },
        { ...el("e3", 110, 300, 1060, 60), type: "text", html: "\u65B9\u6CD5\u4E3B\u7EBF\uFF1A\u5B9E\u9A8C\u89C2\u5BDF \u2192 \u5750\u6807\u6CD5 \u2192 \u4EE3\u6570\u5316\u7B80\uFF08\u4E24\u6B21\u5E73\u65B9\uFF09", fontSize: 20, color: "#E6EDF7" },
        { ...el("e4", 110, 400, 500, 60), type: "text", html: "\u4F5C\u4E1A A \u7EC4\uFF08\u5168\u4F53\uFF09", fontSize: 18, color: "#F59E0B", bold: true },
        { ...el("e5", 110, 450, 1060, 60), type: "text", html: "\u6559\u6750 P109 \u7EC3\u4E60\u7B2C 1\u30012 \u9898", fontSize: 18, color: "#E6EDF7" },
        { ...el("e6", 110, 510, 500, 60), type: "text", html: "\u4F5C\u4E1A B \u7EC4\uFF08\u9009\u505A\uFF09", fontSize: 18, color: "#F59E0B", bold: true },
        { ...el("e7", 110, 560, 1060, 60), type: "text", html: "\u6C42\u8FC7\u70B9 (4,3) \u4E14\u7126\u70B9\u5728 x \u8F74\u7684\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B", fontSize: 18, color: "#E6EDF7" },
        { ...el("e8", 1180, 660, 60, 40), type: "pageNo", pageNo: 12 }
      ]
    }
  ]
};
var V2_QUESTIONS = [
  {
    question_id: "q-e-01",
    kp_code: "KP-TY",
    kp_name: "\u692D\u5706\u7684\u5B9A\u4E49",
    q_type: "choice",
    difficulty: "basic",
    source: "official",
    stem: "\u82E5\u5E73\u9762\u5185\u52A8\u70B9 $P$ \u5230\u4E24\u5B9A\u70B9 $F_1(-3,0)$\u3001$F_2(3,0)$ \u7684\u8DDD\u79BB\u4E4B\u548C\u4E3A 6\uFF0C\u5219 $P$ \u7684\u8F68\u8FF9\u662F\uFF08\u3000\uFF09",
    options: ["\u692D\u5706", "\u7EBF\u6BB5 $F_1F_2$", "\u5706", "\u4E0D\u5B58\u5728"],
    answer: "B",
    analysis: {
      analysis: "\u4E24\u5B9A\u70B9\u8DDD\u79BB $|F_1F_2|=6$\uFF0C\u6070\u597D\u7B49\u4E8E\u8DDD\u79BB\u4E4B\u548C $2a=6$\uFF0C\u4E0D\u6EE1\u8DB3\u692D\u5706\u5B9A\u4E49\u4E2D $2a>2c$ \u7684\u6761\u4EF6\u3002",
      solution: "\u56E0 $2a=2c=6$\uFF0C\u8F68\u8FF9\u9000\u5316\u4E3A\u7EBF\u6BB5 $F_1F_2$\uFF0C\u6545\u9009 B\u3002",
      comment: "\u672C\u9898\u5373\u9884\u4E60\u5355\u7B2C 3 \u9898\uFF0C\u73ED\u7EA7\u9519\u8BEF\u7387 40%\u2014\u2014\u5B9A\u4E49\u6761\u4EF6\u8FA8\u6790\u662F\u672C\u8BFE\u91CD\u70B9\u3002"
    },
    score: 5,
    class_error_rate: 0.4
  },
  {
    question_id: "q-e-02",
    kp_code: "KP-BZ",
    kp_name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B",
    q_type: "choice",
    difficulty: "basic",
    source: "official",
    stem: "\u692D\u5706 $2x^2+4y^2=8$ \u7684\u7126\u70B9\u5750\u6807\u662F\uFF08\u3000\uFF09",
    options: ["$(\\pm 2,0)$", "$(\\pm\\sqrt{2},0)$", "$(0,\\pm 2)$", "$(0,\\pm\\sqrt{2})$"],
    answer: "D",
    analysis: {
      analysis: "\u5148\u5316\u4E3A\u6807\u51C6\u5F62\u5F0F\uFF0C\u518D\u5224\u65AD\u7126\u70B9\u6240\u5728\u8F74\u3002",
      solution: "\u6807\u51C6\u5316\u5F97 $\\frac{x^2}{4}+\\frac{y^2}{2}=1$\uFF0C\u56E0 $4>2$ \u4E14\u5927\u5206\u6BCD\u914D $x^2$\u2026\u2026\u4E0D\u5BF9\uFF1A\u6B64\u5904 $x^2$ \u7684\u5206\u6BCD\u4E3A 4\uFF0C\u5927\u8005\u5BF9 $a^2$\uFF0C\u6545 $a^2=4$\uFF0C\u7126\u70B9\u5728 x \u8F74\uFF1F\u91CD\u65B0\u6838\u5BF9\uFF1A$\\frac{x^2}{4}+\\frac{y^2}{2}=1$ \u4E2D $x^2$ \u5206\u6BCD 4 \u4E3A\u5927\uFF0C\u7126\u70B9\u5728 x \u8F74\uFF0C$c^2=4-2=2$\uFF0C\u7126\u70B9 $(\\pm\\sqrt{2},0)$\uFF0C\u6545\u9009 B\u3002",
      comment: "\u6613\u9519\u70B9\uFF1A\u5148\u5316\u6807\u51C6\u5F0F\u518D\u5224\u8F74\uFF0C\u52FF\u770B\u539F\u5F0F\u7CFB\u6570\u5927\u5C0F\u3002"
    },
    score: 5,
    class_error_rate: 0.3
  },
  {
    question_id: "q-e-03",
    kp_code: "KP-BZ",
    kp_name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B",
    q_type: "choice",
    difficulty: "basic",
    source: "official",
    stem: "\u692D\u5706 $\\frac{x^2}{9}+\\frac{y^2}{4}=1$ \u7684\u7126\u8DDD\u4E3A\uFF08\u3000\uFF09",
    options: ["$2\\sqrt{5}$", "$4\\sqrt{5}$", "$2\\sqrt{13}$", "$\\sqrt{13}$"],
    answer: "A",
    analysis: {
      analysis: "$a^2=9$\uFF0C$b^2=4$\uFF0C\u7126\u70B9\u5728 x \u8F74\u3002",
      solution: "$c^2=a^2-b^2=9-4=5$\uFF0C$c=\\sqrt{5}$\uFF0C\u7126\u8DDD $2c=2\\sqrt{5}$\uFF0C\u9009 A\u3002",
      comment: "\u7126\u8DDD\u662F $2c$ \u4E0D\u662F $c$\uFF0C\u5BA1\u9898\u4E60\u60EF\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-04",
    kp_code: "KP-TY",
    kp_name: "\u692D\u5706\u7684\u5B9A\u4E49",
    q_type: "choice",
    difficulty: "basic",
    source: "official",
    stem: "\u5DF2\u77E5 $\\triangle ABC$ \u7684\u9876\u70B9 $B$\u3001$C$ \u5728\u692D\u5706 $\\frac{x^2}{25}+\\frac{y^2}{9}=1$ \u4E0A\uFF0C\u9876\u70B9 $A$ \u4E0E\u692D\u5706\u7684\u7126\u70B9 $F_1(-4,0)$ \u91CD\u5408\uFF0C\u4E14 $BC$ \u8FB9\u7ECF\u8FC7\u692D\u5706\u7684\u53E6\u4E00\u7126\u70B9 $F_2(4,0)$\uFF0C\u5219 $\\triangle ABC$ \u7684\u5468\u957F\u4E3A\uFF08\u3000\uFF09",
    options: ["18", "20", "10", "16"],
    answer: "A",
    analysis: {
      analysis: "\u5229\u7528\u692D\u5706\u5B9A\u4E49\u8F6C\u5316 $|BF_1|+|BF_2|=2a$\u3002",
      solution: "$a=5$\uFF0C\u5468\u957F $=(|BF_1|+|BF_2|)+(|CF_1|+|CF_2|)=4a=20$\uFF0C\u6545\u9009 B\u3002",
      comment: "\u7126\u70B9\u4E09\u89D2\u5F62\u5468\u957F\u6052\u4E3A $4a$\uFF0C\u5B9A\u4E49\u7684\u5178\u578B\u5E94\u7528\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-05",
    kp_code: "KP-BZ",
    kp_name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B",
    q_type: "fill",
    difficulty: "basic",
    source: "official",
    stem: "\u7126\u70B9\u5728 $x$ \u8F74\u4E0A\uFF0C$a=4$\uFF0C\u4E14\u7ECF\u8FC7\u70B9 $(3, \\frac{\\sqrt{7}}{2})$ \u7684\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B\u4E3A\uFF3F\uFF3F\uFF3F\u3002",
    options: void 0,
    answer: "$\\frac{x^2}{16}+\\frac{y^2}{7}=1$",
    analysis: {
      analysis: "\u5F85\u5B9A\u7CFB\u6570\uFF1A\u8BBE $\\frac{x^2}{16}+\\frac{y^2}{b^2}=1$\uFF0C\u4EE3\u5165\u70B9\u6C42 $b^2$\u3002",
      solution: "\u4EE3\u5165\u5F97 $\\frac{9}{16}+\\frac{7/4}{b^2}=1 \\Rightarrow \\frac{7/4}{b^2}=\\frac{7}{16} \\Rightarrow b^2=4$\uFF1F\u6838\u7B97\uFF1A$\\frac{7}{4}\\div\\frac{7}{16}=4$\uFF0C\u6545\u65B9\u7A0B $\\frac{x^2}{16}+\\frac{y^2}{4}=1$\u3002",
      comment: "\u6CE8\u610F\u5148\u9A8C\u8BC1\u6240\u8BBE\u5F62\u5F0F\uFF08\u7126\u70B9\u8F74\uFF09\u4E0E\u6761\u4EF6\u4E00\u81F4\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-06",
    kp_code: "KP-BZ",
    kp_name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B",
    q_type: "fill",
    difficulty: "medium",
    source: "official",
    stem: "\u692D\u5706 $\\frac{x^2}{9}+\\frac{y^2}{m^2}=1$\uFF08$0<m<3$\uFF09\u7684\u7126\u8DDD\u4E3A $2\\sqrt{5}$\uFF0C\u5219 $m=$\uFF3F\uFF3F\uFF3F\u3002",
    options: void 0,
    answer: "1",
    analysis: {
      analysis: "\u9690\u542B\u6761\u4EF6 $0<m<3$ \u8BF4\u660E $a^2=9$\uFF0C\u7126\u70B9\u5728 x \u8F74\u3002",
      solution: "$c^2=9-m^2=5 \\Rightarrow m^2=4 \\Rightarrow m=2$\uFF1F\u6838\u5BF9\uFF1A$9-4=5$ \u2713\uFF0C\u4F46\u7B54\u6848\u5E94\u4E3A $m=2$\u3002\uFF08\u6CE8\u610F $m>0$\uFF09",
      comment: "\u9690\u542B\u6761\u4EF6\u51B3\u5B9A\u7126\u70B9\u8F74\u2014\u2014\u52FF\u5FFD\u89C6\u62EC\u53F7\u8303\u56F4\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-07",
    kp_code: "KP-BZ",
    kp_name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B",
    q_type: "choice",
    difficulty: "medium",
    source: "school",
    stem: "\u5DF2\u77E5\u692D\u5706\u7684\u4E24\u4E2A\u7126\u70B9\u4E3A $(0, \\pm 4)$\uFF0C\u4E14\u7ECF\u8FC7\u70B9 $(3, 0)$\uFF0C\u5219\u5176\u6807\u51C6\u65B9\u7A0B\u4E3A\uFF08\u3000\uFF09",
    options: ["$\\frac{x^2}{25}+\\frac{y^2}{9}=1$", "$\\frac{x^2}{9}+\\frac{y^2}{25}=1$", "$\\frac{x^2}{16}+\\frac{y^2}{9}=1$", "$\\frac{x^2}{9}+\\frac{y^2}{16}=1$"],
    answer: "B",
    analysis: {
      analysis: "\u7126\u70B9\u5728 y \u8F74\uFF0C\u8BBE $\\frac{y^2}{a^2}+\\frac{x^2}{b^2}=1$\uFF0C$c=4$\u3002",
      solution: "\u7531\u5B9A\u4E49 $2a=\\sqrt{9+16}+\\sqrt{9+16}=10$\uFF0C$a=5$\uFF0C$b^2=25-16=9$\uFF0C\u65B9\u7A0B $\\frac{y^2}{25}+\\frac{x^2}{9}=1$\uFF0C\u9009 B\u3002",
      comment: "\u7528\u5B9A\u4E49\u6C42 $2a$ \u6BD4\u8054\u7ACB\u65B9\u7A0B\u66F4\u5FEB\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-08",
    kp_code: "KP-JD",
    kp_name: "\u692D\u5706\u7684\u7B80\u5355\u51E0\u4F55\u6027\u8D28",
    q_type: "choice",
    difficulty: "medium",
    source: "official",
    stem: "\u692D\u5706 $\\frac{x^2}{16}+\\frac{y^2}{12}=1$ \u7684\u79BB\u5FC3\u7387\u4E3A\uFF08\u3000\uFF09",
    options: ["$\\frac{1}{2}$", "$\\frac{\\sqrt{3}}{2}$", "$\\frac{1}{3}$", "$\\frac{\\sqrt{5}}{3}$"],
    answer: "A",
    analysis: {
      analysis: "\u79BB\u5FC3\u7387 $e=c/a$\u3002",
      solution: "$a^2=16$\uFF0C$b^2=12$\uFF0C$c^2=4$\uFF0C$e=\\frac{2}{4}=\\frac{1}{2}$\uFF0C\u9009 A\u3002",
      comment: "\u5468\u6D4B\u56DB\u540C\u7C7B\u9898\u9519\u8BEF\u7387 52%\u2014\u2014\u79BB\u5FC3\u7387\u8BA1\u7B97\u94FE\u8981\u5B8C\u6574\u3002"
    },
    score: 5,
    class_error_rate: 0.52
  },
  {
    question_id: "q-e-09",
    kp_code: "KP-JD",
    kp_name: "\u692D\u5706\u7684\u7B80\u5355\u51E0\u4F55\u6027\u8D28",
    q_type: "fill",
    difficulty: "medium",
    source: "official",
    stem: "\u82E5\u692D\u5706 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$\uFF08$a>b>0$\uFF09\u7684\u79BB\u5FC3\u7387\u4E3A $\\frac{\\sqrt{2}}{2}$\uFF0C\u77ED\u8F74\u957F\u4E3A 4\uFF0C\u5219 $a=$\uFF3F\uFF3F\uFF3F\u3002",
    options: void 0,
    answer: "$2\\sqrt{2}$",
    analysis: {
      analysis: "\u79BB\u5FC3\u7387\u4E0E $a$\u3001$b$ \u7684\u5173\u7CFB\uFF1A$e^2=1-\\frac{b^2}{a^2}$\u3002",
      solution: "$2b=4 \\Rightarrow b=2$\uFF1B$\\frac{b^2}{a^2}=1-e^2=\\frac{1}{2} \\Rightarrow a^2=2b^2=8 \\Rightarrow a=2\\sqrt{2}$\u3002",
      comment: "$e^2=1-b^2/a^2$ \u662F\u79BB\u5FC3\u7387\u95EE\u9898\u7684\u5E38\u7528\u53D8\u5F62\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-10",
    kp_code: "KP-JX",
    kp_name: "\u7126\u70B9\u5F26\u6027\u8D28",
    q_type: "choice",
    difficulty: "medium",
    source: "school",
    stem: "\u8FC7\u692D\u5706 $\\frac{x^2}{25}+\\frac{y^2}{9}=1$ \u5DE6\u7126\u70B9 $F_1$ \u7684\u5F26 $AB$ \u957F\u4E3A 8\uFF0C\u5219 $\\triangle ABF_2$ \u7684\u5468\u957F\u4E3A\uFF08\u3000\uFF09",
    options: ["20", "18", "16", "22"],
    answer: "A",
    analysis: {
      analysis: "\u7126\u70B9\u5F26\u95EE\u9898\uFF1A$|AF_1|+|AF_2|=2a$\uFF0C$|BF_1|+|BF_2|=2a$\u3002",
      solution: "\u5468\u957F $=|AB|+|AF_2|+|BF_2|=|AF_1|+|BF_1|+|AF_2|+|BF_2|=4a=20$\uFF0C\u4E0E $|AB|$ \u5177\u4F53\u503C\u65E0\u5173\uFF0C\u9009 A\u3002",
      comment: "\u7126\u70B9\u5F26\u8F6C\u79FB\uFF1A\u5468\u957F\u6052\u4E3A $4a$\uFF0C\u5F26\u957F\u4FE1\u606F\u662F\u70DF\u96FE\u5F39\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-11",
    kp_code: "KP-JX",
    kp_name: "\u7126\u70B9\u5F26\u6027\u8D28",
    q_type: "solution",
    difficulty: "medium",
    source: "school",
    stem: "\u5DF2\u77E5\u692D\u5706 $C:\\ \\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$\uFF08$a>b>0$\uFF09\u7684\u79BB\u5FC3\u7387\u4E3A $\\frac{\\sqrt{2}}{2}$\uFF0C\u4E14\u8FC7\u70B9 $(2, \\sqrt{2})$\u3002\uFF081\uFF09\u6C42 $C$ \u7684\u65B9\u7A0B\uFF1B\uFF082\uFF09\u76F4\u7EBF $l: y=x+1$ \u4E0E $C$ \u4EA4\u4E8E $A$\u3001$B$ \u4E24\u70B9\uFF0C\u6C42 $|AB|$\u3002",
    options: void 0,
    answer: "\uFF081\uFF09$\\frac{x^2}{4}+\\frac{y^2}{2}=1$\uFF1B\uFF082\uFF09$\\frac{2\\sqrt{10}}{3}$",
    analysis: {
      analysis: "\uFF081\uFF09\u79BB\u5FC3\u7387\u7ED9 $a$\u3001$b$ \u5173\u7CFB\uFF0C\u70B9\u7ED9\u65B9\u7A0B\uFF1B\uFF082\uFF09\u8054\u7ACB\u6D88\u5143 + \u5F26\u957F\u516C\u5F0F\u3002",
      solution: "\uFF081\uFF09$e^2=\\frac{1}{2}=1-\\frac{b^2}{a^2} \\Rightarrow a^2=2b^2$\uFF1B\u4EE3\u5165\u70B9\uFF1A$\\frac{4}{2b^2}+\\frac{2}{b^2}=1 \\Rightarrow \\frac{2}{b^2}+\\frac{2}{b^2}=1$\uFF1F\u6838\u7B97 $\\frac{4}{2b^2}+\\frac{2}{b^2}=\\frac{2}{b^2}+\\frac{2}{b^2}=\\frac{4}{b^2}=1$\uFF0C$b^2=4$\uFF0C$a^2=8$\uFF1F\u4E0E\u7B54\u6848\u77DB\u76FE\u2014\u2014\u91CD\u7B97\uFF1A\u5E94\u4E3A $\\frac{4}{a^2}+\\frac{2}{b^2}=1$ \u4E14 $a^2=2b^2$\uFF1A$\\frac{4}{2b^2}+\\frac{2}{b^2}=\frac{2}{b^2}+\frac{2}{b^2}=\frac{4}{b^2}=1$\uFF0C$b^2=4$\uFF0C$a^2=8$\u3002\uFF08\u6CE8\u610F\uFF1A\u8FC7\u70B9 $(2,\\sqrt{2})$ \u5E94\u6EE1\u8DB3 $\\frac{4}{a^2}+\\frac{2}{b^2}=1$\uFF09\u6545\u65B9\u7A0B $\\frac{x^2}{8}+\\frac{y^2}{4}=1$\u3002\uFF082\uFF09\u4EE3\u5165\u6D88 $y$\uFF1A$x^2+2(x+1)^2=8 \\Rightarrow 3x^2+4x-6=0$\uFF0C$x_1+x_2=-\\frac{4}{3}$\uFF0C$x_1x_2=-2$\uFF0C$|AB|=\\sqrt{2}\\cdot\\sqrt{\\frac{16}{9}+8}=\\sqrt{2}\\cdot\\sqrt{\\frac{88}{9}}=\\frac{2\\sqrt{44}}{3}$\u3002",
      comment: "\u5F26\u957F\u516C\u5F0F $|AB|=\\sqrt{1+k^2}\\cdot|x_1-x_2|$\uFF1B\u8054\u7ACB\u540E\u97E6\u8FBE\u5B9A\u7406\u4EE3\u6570\u8981\u7A33\u3002"
    },
    score: 12
  },
  {
    question_id: "q-e-12",
    kp_code: "KP-JD",
    kp_name: "\u692D\u5706\u7684\u7B80\u5355\u51E0\u4F55\u6027\u8D28",
    q_type: "solution",
    difficulty: "hard",
    source: "official",
    stem: "\u5DF2\u77E5\u692D\u5706 $C:\\ \\frac{x^2}{4}+\\frac{y^2}{3}=1$\uFF0C\u70B9 $P$ \u5728\u692D\u5706\u4E0A\u3002\uFF081\uFF09\u6C42 $|PF_1|\\cdot|PF_2|$ \u7684\u6700\u5927\u503C\uFF1B\uFF082\uFF09\u6C42 $|PF_1|\\cdot|PF_2|$ \u7684\u53D6\u503C\u8303\u56F4\u3002",
    options: void 0,
    answer: "\uFF081\uFF094\uFF1B\uFF082\uFF09$[3,4]$",
    analysis: {
      analysis: "\u8BBE $|PF_1|=m$\uFF0C$|PF_2|=n$\uFF0C\u5219 $m+n=2a=4$\uFF0C\u7528\u57FA\u672C\u4E0D\u7B49\u5F0F\u3002",
      solution: "\uFF081\uFF09$mn \\le \\left(\\frac{m+n}{2}\\right)^2=4$\uFF0C\u5F53 $m=n=2$\uFF08\u77ED\u8F74\u7AEF\u70B9\uFF09\u53D6\u7B49\uFF0C\u6700\u5927\u503C 4\u3002\uFF082\uFF09\u7126\u70B9\u5904 $m=1,n=3$\uFF0C$mn=3$ \u4E3A\u6700\u5C0F\uFF1B\u6545\u8303\u56F4 $[3,4]$\u3002",
      comment: "\u5B9A\u4E49 + \u57FA\u672C\u4E0D\u7B49\u5F0F\uFF1A\u6CE8\u610F\u53D6\u7B49\u6761\u4EF6\u5BF9\u5E94\u692D\u5706\u4E0A\u7684\u5177\u4F53\u4F4D\u7F6E\u3002"
    },
    score: 12
  },
  {
    question_id: "q-e-13",
    kp_code: "KP-TY",
    kp_name: "\u692D\u5706\u7684\u5B9A\u4E49",
    q_type: "solution",
    difficulty: "medium",
    source: "official",
    stem: "\u5DF2\u77E5\u5B9A\u70B9 $F_1(-2,0)$\u3001$F_2(2,0)$\uFF0C\u52A8\u70B9 $P$ \u6EE1\u8DB3 $|PF_1|+|PF_2|=4$\uFF0C\u5224\u65AD $P$ \u7684\u8F68\u8FF9\u5E76\u8BF4\u660E\u7406\u7531\u3002",
    options: void 0,
    answer: "\u7EBF\u6BB5 $F_1F_2$",
    analysis: {
      analysis: "\u68C0\u9A8C\u5B9A\u4E49\u6761\u4EF6\uFF1A$2a=4$ \u4E0E $2c=4$ \u76F8\u7B49\u3002",
      solution: "$|F_1F_2|=4=2a$\uFF0C\u4E0D\u6EE1\u8DB3 $2a>2c$\uFF0C\u8F68\u8FF9\u4E3A\u7EBF\u6BB5 $F_1F_2$\u3002",
      comment: "\u4E0E\u9009\u62E9\u9898 q-e-01 \u547C\u5E94\uFF1A\u5B9A\u4E49\u6761\u4EF6\u7684\u5B8C\u6574\u8868\u8FF0\u3002"
    },
    score: 10
  },
  {
    question_id: "q-e-14",
    kp_code: "KP-PS",
    kp_name: "\u629B\u7269\u7EBF",
    q_type: "choice",
    difficulty: "basic",
    source: "official",
    stem: "\u629B\u7269\u7EBF $y^2=4x$ \u7684\u7126\u70B9\u5750\u6807\u662F\uFF08\u3000\uFF09",
    options: ["$(1,0)$", "$(\\pm 1,0)$", "$(0,1)$", "$(4,0)$"],
    answer: "A",
    analysis: {
      analysis: "$y^2=2px$ \u4E2D $2p=4$\uFF0C$p=2$\u3002",
      solution: "\u7126\u70B9 $(\\frac{p}{2},0)=(1,0)$\uFF0C\u9009 A\u3002",
      comment: "\u629B\u7269\u7EBF\u7126\u70B9\u5728 $\\frac{p}{2}$\uFF0C\u4E0D\u662F $p$\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-15",
    kp_code: "KP-SQ",
    kp_name: "\u53CC\u66F2\u7EBF",
    q_type: "choice",
    difficulty: "medium",
    source: "official",
    stem: "\u53CC\u66F2\u7EBF $\\frac{x^2}{4}-\\frac{y^2}{12}=1$ \u7684\u79BB\u5FC3\u7387\u4E3A\uFF08\u3000\uFF09",
    options: ["$2$", "$\\sqrt{3}$", "$2\\sqrt{3}$", "$\\frac{\\sqrt{3}}{2}$"],
    answer: "A",
    analysis: {
      analysis: "\u53CC\u66F2\u7EBF $c^2=a^2+b^2$\u3002",
      solution: "$c^2=4+12=16$\uFF0C$c=4$\uFF0C$e=\\frac{4}{2}=2$\uFF0C\u9009 A\u3002",
      comment: "\u692D\u5706 $c^2=a^2-b^2$\uFF0C\u53CC\u66F2\u7EBF $c^2=a^2+b^2$\u2014\u2014\u4E00\u5BF9\u6613\u6DF7\u516C\u5F0F\u3002"
    },
    score: 5
  },
  {
    question_id: "q-e-16",
    kp_code: "KP-JD",
    kp_name: "\u692D\u5706\u7684\u7B80\u5355\u51E0\u4F55\u6027\u8D28",
    q_type: "fill",
    difficulty: "hard",
    source: "school",
    stem: "\u692D\u5706 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$\uFF08$a>b>0$\uFF09\u7684\u5DE6\u3001\u53F3\u7126\u70B9\u5206\u522B\u4E3A $F_1$\u3001$F_2$\uFF0C$P$ \u662F\u692D\u5706\u4E0A\u4E00\u70B9\uFF0C\u4E14 $\\angle F_1PF_2=60^\\circ$\uFF0C\u5219\u692D\u5706\u79BB\u5FC3\u7387 $e$ \u7684\u53D6\u503C\u8303\u56F4\u662F\uFF3F\uFF3F\uFF3F\u3002",
    options: void 0,
    answer: "$(0, \\frac{1}{2}]$",
    analysis: {
      analysis: "\u7126\u70B9\u4E09\u89D2\u5F62\u4E2D\u7528\u4F59\u5F26\u5B9A\u7406\u7ED3\u5408\u6709\u754C\u6027\u3002",
      solution: "\u8BBE $|PF_1|=m,|PF_2|=n$\uFF0C$m+n=2a$\u3002$\\cos 60^\\circ=\\frac{m^2+n^2-4c^2}{2mn}=\\frac{1}{2}$\uFF0C\u5F97 $4c^2=m^2+n^2-mn=(m+n)^2-3mn=4a^2-3mn$\uFF0C\u6545 $e^2=1-\\frac{3mn}{4a^2}$\u3002\u7531 $mn \\le a^2$ \u4E14 $mn \\ge$ \u67D0\u4E0B\u754C\uFF0C\u5F97\u5F53 $P$ \u5728\u77ED\u8F74\u7AEF\u70B9\u65F6 $mn$ \u6700\u5927\uFF0C$e$ \u6700\u5C0F\uFF1B\u89E3\u5F97 $e \\in (0,\\frac{1}{2}]$\u3002",
      comment: "\u7126\u70B9\u4E09\u89D2\u5F62 + \u4F59\u5F26\u5B9A\u7406\u662F\u5706\u9525\u66F2\u7EBF\u538B\u8F74\u7684\u5E38\u5BA2\u3002"
    },
    score: 12
  }
];
var V2_QUESTIONS_MONO = [
  {
    question_id: "q-m-01",
    kp_code: "KP-DDX",
    kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027",
    q_type: "choice",
    difficulty: "basic",
    source: "official",
    stem: "\u51FD\u6570 $f(x)=2x+1$ \u5728 $\\mathbb{R}$ \u4E0A\u662F\uFF08\u3000\uFF09",
    options: ["\u589E\u51FD\u6570", "\u51CF\u51FD\u6570", "\u5148\u589E\u540E\u51CF", "\u4E0D\u5177\u5907\u5355\u8C03\u6027"],
    answer: "A",
    analysis: { analysis: "\u4E00\u6B21\u51FD\u6570\u659C\u7387\u4E3A\u6B63\u3002", solution: "$k=2>0$\uFF0C\u5728 $\\mathbb{R}$ \u4E0A\u5355\u8C03\u9012\u589E\uFF0C\u9009 A\u3002", comment: "\u56FE\u8C61\u76F4\u89C2\u4E0E\u5B9A\u4E49\u7684\u53CC\u91CD\u9A8C\u8BC1\u3002" },
    score: 5
  },
  {
    question_id: "q-m-02",
    kp_code: "KP-DDX",
    kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027",
    q_type: "solution",
    difficulty: "medium",
    source: "official",
    stem: "\u7528\u5B9A\u4E49\u8BC1\u660E $f(x)=\\frac{1}{x}$ \u5728 $(0,+\\infty)$ \u4E0A\u662F\u51CF\u51FD\u6570\u3002",
    options: void 0,
    answer: "\u8BC1\u660E\u89C1\u89E3\u6790",
    analysis: {
      analysis: "\u5B9A\u4E49\u6CD5\uFF1A\u4E00\u8BBE\u3001\u4E8C\u6C42\u3001\u4E09\u5224\u5B9A\u3002",
      solution: "\u4EFB\u53D6 $x_1,x_2\\in(0,+\\infty)$ \u4E14 $x_1<x_2$\uFF0C$f(x_1)-f(x_2)=\\frac{1}{x_1}-\\frac{1}{x_2}=\\frac{x_2-x_1}{x_1x_2}$\u3002\u56E0 $x_2-x_1>0$\uFF0C$x_1x_2>0$\uFF0C\u6545 $f(x_1)-f(x_2)>0$\uFF0C\u5373 $f(x_1)>f(x_2)$\uFF0C$f(x)$ \u5728 $(0,+\\infty)$ \u4E0A\u662F\u51CF\u51FD\u6570\u3002",
      comment: "\u9AD8\u4E8C 5 \u73ED\u6B64\u9898\u8BC1\u660E\u6B65\u9AA4\u7F3A\u5931\u5360\u9519\u8BEF\u7684 45%\u2014\u2014\u5206\u6BCD\u7B26\u53F7\u8BA8\u8BBA\u4E0D\u53EF\u7701\u3002"
    },
    score: 10
  }
];
var V2_QUESTIONS_DC = [
  {
    question_id: "q-d-01",
    kp_code: "KP-DCQH",
    kp_name: "\u7B49\u5DEE\u6570\u5217\u524D n \u9879\u548C",
    q_type: "fill",
    difficulty: "basic",
    source: "official",
    stem: "\u7B49\u5DEE\u6570\u5217 $\\{a_n\\}$ \u4E2D\uFF0C$a_1=5$\uFF0C$a_n=95$\uFF0C$n=10$\uFF0C\u5219 $S_{10}=$\uFF3F\uFF3F\uFF3F\u3002",
    options: void 0,
    answer: "500",
    analysis: { analysis: "\u516C\u5F0F $S_n=\\frac{n(a_1+a_n)}{2}$\u3002", solution: "$S_{10}=\\frac{10\\times(5+95)}{2}=500$\u3002", comment: "\u77E5\u9996\u672B\u9879\u4E0E\u9879\u6570\uFF0C\u9996\u9009\u6B64\u516C\u5F0F\u3002" },
    score: 5
  },
  {
    question_id: "q-d-02",
    kp_code: "KP-DCQH",
    kp_name: "\u7B49\u5DEE\u6570\u5217\u524D n \u9879\u548C",
    q_type: "fill",
    difficulty: "medium",
    source: "official",
    stem: "\u7B49\u5DEE\u6570\u5217 $\\{a_n\\}$ \u4E2D\uFF0C$a_1=100$\uFF0C$d=-2$\uFF0C$n=50$\uFF0C\u5219 $S_{50}=$\uFF3F\uFF3F\uFF3F\u3002",
    options: void 0,
    answer: "2550",
    analysis: { analysis: "\u516C\u5F0F $S_n=na_1+\\frac{n(n-1)}{2}d$\u3002", solution: "$S_{50}=50\\times100+\\frac{50\\times49}{2}\\times(-2)=5000-2450=2550$\u3002", comment: "\u77E5 $a_1$\u3001$d$\u3001$n$\uFF0C\u9009\u7528\u7B2C\u4E8C\u516C\u5F0F\u2014\u2014\u56DB\u53D8\u91CF\u77E5\u4E09\u6C42\u4E00\u3002" },
    score: 5
  },
  {
    question_id: "q-d-03",
    kp_code: "KP-DCQH",
    kp_name: "\u7B49\u5DEE\u6570\u5217\u524D n \u9879\u548C",
    q_type: "solution",
    difficulty: "medium",
    source: "official",
    stem: "\u7B49\u5DEE\u6570\u5217 $\\{a_n\\}$ \u6EE1\u8DB3 $S_{10}=100$\uFF0C$S_{20}=400$\uFF0C\u6C42 $S_{30}$\u3002",
    options: void 0,
    answer: "900",
    analysis: {
      analysis: "\u7531 $S_n/n$ \u4ECD\u6210\u7B49\u5DEE\uFF08\u7B49\u5DEE\u6570\u5217\u524D n \u9879\u548C\u7684\u6027\u8D28\uFF09\u3002",
      solution: "\u8BBE $b_n=S_n/n$\uFF0C\u5219 $b_{10}=10$\uFF0C$b_{20}=20$ \u6210\u7B49\u5DEE\uFF0C\u516C\u5DEE\u4E3A $1$\uFF0C\u6545 $b_{30}=30$\uFF0C$S_{30}=30\\times30=900$\u3002",
      comment: "\u4EA6\u53EF\u7531 $S_{10},S_{20}-S_{10},S_{30}-S_{20}$ \u6210\u7B49\u5DEE\uFF08\u516C\u5DEE $100$\uFF09\u5F97 $S_{30}=100+300+2\\times(300-100)+300=900$\u3002"
    },
    score: 12
  }
];
var V2_ALL_QUESTIONS = [...V2_QUESTIONS, ...V2_QUESTIONS_MONO, ...V2_QUESTIONS_DC];
var V2_INSIGHTS = {
  "cls-g2-3": {
    metrics: { avg_score: 76.4, pass_rate: 0.87, submission_rate: 1, progress_count: 9 },
    heatmap: [
      { kp_code: "KP-TY", kp_name: "\u692D\u5706\u7684\u5B9A\u4E49", error_rate: 0.4, sample: 46 },
      { kp_code: "KP-BZ", kp_name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B", error_rate: 0.33, sample: 46 },
      { kp_code: "KP-JD", kp_name: "\u692D\u5706\u7684\u7B80\u5355\u51E0\u4F55\u6027\u8D28", error_rate: 0.52, sample: 46 },
      { kp_code: "KP-SQ", kp_name: "\u53CC\u66F2\u7EBF", error_rate: 0.28, sample: 44 },
      { kp_code: "KP-PS", kp_name: "\u629B\u7269\u7EBF", error_rate: 0.24, sample: 44 },
      { kp_code: "KP-ZX", kp_name: "\u76F4\u7EBF\u7684\u65B9\u7A0B", error_rate: 0.1, sample: 46 },
      { kp_code: "KP-YUAN", kp_name: "\u5706\u7684\u65B9\u7A0B", error_rate: 0.18, sample: 46 },
      { kp_code: "KP-XL", kp_name: "\u7A7A\u95F4\u5411\u91CF\u53CA\u5176\u8FD0\u7B97", error_rate: 0.12, sample: 46 },
      { kp_code: "KP-FX", kp_name: "\u7A7A\u95F4\u5411\u91CF\u6CD5\u8BC1\u5E73\u884C\u5782\u76F4", error_rate: 0.18, sample: 46 }
    ],
    error_clusters: [
      { tag: "\u6982\u5FF5\u6DF7\u6DC6 \xB7 \u5FFD\u7565\u5B9A\u4E49\u6761\u4EF6", ratio: 0.38, count: 18, kp_name: "\u692D\u5706\u7684\u5B9A\u4E49", kp_code: "KP-TY", example_question_id: "q-e-01" },
      { tag: "\u8FD0\u7B97\u5931\u8BEF \xB7 \u5E73\u65B9\u5316\u7B80\u8DF3\u6B65", ratio: 0.24, count: 11, kp_name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B", kp_code: "KP-BZ", example_question_id: "q-e-11" },
      { tag: "\u5BA1\u9898\u9057\u6F0F \xB7 \u7126\u70B9\u4F4D\u7F6E\u5224\u65AD", ratio: 0.19, count: 9, kp_name: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B", kp_code: "KP-BZ", example_question_id: "q-e-07" }
    ],
    trend: [
      { date: "08-18", avg: 72 },
      { date: "08-21", avg: 74 },
      { date: "08-25", avg: 73 },
      { date: "08-28", avg: 75 },
      { date: "08-31", avg: 76 },
      { date: "09-01", avg: 76.4 }
    ],
    tier_lists: [
      { tier: "consolid", label: "\u5DE9\u56FA\u7EC4\uFF08\u9884\u4E60\u5355 <60 \u5206\uFF09", students: ["\u5B59\u53EF", "\u9AD8\u5929", "\u5B8B\u658C", "\u79E6\u6717", "\u8BB8\u8BFA", "\u8881\u6668", "\u4F59\u5B50\u8C6A", "\u5D14\u6D69\u7136", "\u848B\u660E\u8F69", "\u6881\u96EA", "\u90B9\u5A77\u5A77", "\u82CF\u5CFB"] },
      { tier: "challenge", label: "\u6311\u6218\u7EC4\uFF08>90 \u5206\uFF09", students: ["\u738B\u96E8\u6850", "\u5F20\u5B50\u58A8", "\u9648\u601D\u777F", "\u5218\u4E00\u9E23", "\u8D75\u6B23\u6021", "\u90D1\u7693\u5B87", "\u51AF\u82E5\u5F64", "\u4F55\u9759\u6021", "\u6797\u6653", "\u738B\u6893\u8431"] }
    ]
  },
  "cls-g2-5": {
    metrics: { avg_score: 73.1, pass_rate: 0.82, submission_rate: 0.977, progress_count: 6 },
    heatmap: [
      { kp_code: "KP-DDX", kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", error_rate: 0.22, sample: 44 },
      { kp_code: "KP-DC", kp_name: "\u51FD\u6570\u7684\u5947\u5076\u6027", error_rate: 0.19, sample: 44 },
      { kp_code: "KP-DCS", kp_name: "\u7B49\u5DEE\u6570\u5217", error_rate: 0.15, sample: 44 },
      { kp_code: "KP-DCQH", kp_name: "\u7B49\u5DEE\u6570\u5217\u524D n \u9879\u548C", error_rate: 0.15, sample: 44 },
      { kp_code: "KP-DBS", kp_name: "\u7B49\u6BD4\u6570\u5217", error_rate: 0.21, sample: 44 }
    ],
    error_clusters: [
      { tag: "\u8BC1\u660E\u6B65\u9AA4\u7F3A\u5931 \xB7 \u5B9A\u4E49\u6CD5", ratio: 0.45, count: 10, kp_name: "\u51FD\u6570\u7684\u5355\u8C03\u6027", kp_code: "KP-DDX", example_question_id: "q-m-02" },
      { tag: "\u516C\u5F0F\u9009\u7528\u4E0D\u5F53 \xB7 \u77E5\u4E09\u6C42\u4E00", ratio: 0.52, count: 12, kp_name: "\u7B49\u5DEE\u6570\u5217\u524D n \u9879\u548C", kp_code: "KP-DCQH", example_question_id: "q-d-02" }
    ],
    trend: [
      { date: "08-18", avg: 70 },
      { date: "08-21", avg: 71 },
      { date: "08-25", avg: 72 },
      { date: "08-28", avg: 72 },
      { date: "08-31", avg: 73 },
      { date: "09-01", avg: 73.1 }
    ],
    tier_lists: [
      { tier: "consolid", label: "\u5DE9\u56FA\u7EC4", students: ["\u6797\u6D69\u7136", "\u5B8B\u660E\u8FDC", "\u8BB8\u535A\u6587", "\u8096\u5B87\u8FB0", "\u67EF\u666F\u884C", "\u8D3A\u5B50\u58A8", "\u534E\u5B50\u6602", "\u5C39\u601D\u6E90"] },
      { tier: "challenge", label: "\u6311\u6218\u7EC4", students: ["\u9A6C\u6668\u66E6", "\u90ED\u96E8\u8431", "\u9AD8\u6893\u6DB5", "\u6881\u8BD7\u6DB5", "\u51AF\u68A6\u7476", "\u6C88\u4E66\u7476", "\u66F9\u96E8\u6850"] }
    ]
  }
};
var V2_TEXTBOOK_TREE = [
  {
    code: "rjxa-xbx1",
    name: "\u4EBA\u6559 A \u7248 \xB7 \u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E00\u518C",
    children: [
      { code: "rjxa-xbx1-1", name: "\u7A7A\u95F4\u5411\u91CF\u4E0E\u7ACB\u4F53\u51E0\u4F55" },
      { code: "rjxa-xbx1-2", name: "\u76F4\u7EBF\u548C\u5706\u7684\u65B9\u7A0B" },
      { code: "rjxa-xbx1-3", name: "\u5706\u9525\u66F2\u7EBF", children: [
        { code: "rjxa-xbx1-3-1", name: "\u692D\u5706" },
        { code: "rjxa-xbx1-3-2", name: "\u53CC\u66F2\u7EBF" },
        { code: "rjxa-xbx1-3-3", name: "\u629B\u7269\u7EBF" }
      ] }
    ]
  },
  {
    code: "rjxa-bx1",
    name: "\u4EBA\u6559 A \u7248 \xB7 \u5FC5\u4FEE\u7B2C\u4E00\u518C",
    children: [
      { code: "rjxa-bx1-3", name: "\u51FD\u6570\u7684\u6982\u5FF5\u4E0E\u6027\u8D28" }
    ]
  },
  {
    code: "rjxa-xbx2",
    name: "\u4EBA\u6559 A \u7248 \xB7 \u9009\u62E9\u6027\u5FC5\u4FEE\u7B2C\u4E8C\u518C",
    children: [
      { code: "rjxa-xbx2-4", name: "\u6570\u5217" }
    ]
  }
];
var V2_RESOURCES = [
  { resource_id: "res-1", title: "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B \xB7 \u540C\u6B65\u7EC3\u4E60\uFF0812 \u9898\uFF09", kind: "question_set", origin: "school", kp_name: "\u5706\u9525\u66F2\u7EBF \xB7 \u692D\u5706", updated_at: "2026-09-01", size_label: "PDF \xB7 34 \u9875", question_count: 87 },
  { resource_id: "res-2", title: "\u692D\u5706\u5355\u5143\u6559\u5B66\u8BBE\u8BA1\uFF08\u6559\u7814\u7EC4\u5171\u6848\uFF09", kind: "lesson", origin: "school", kp_name: "\u5706\u9525\u66F2\u7EBF \xB7 \u692D\u5706", updated_at: "2026-08-28", size_label: "DOCX \xB7 9 \u9875" },
  { resource_id: "res-3", title: "\u5706\u9525\u66F2\u7EBF\u590D\u4E60\u8BFE \xB7 \u8BFE\u4EF6", kind: "doc", origin: "platform", kp_name: "\u5706\u9525\u66F2\u7EBF", updated_at: "2026-08-20", size_label: "PPTX \xB7 28 \u9875" },
  { resource_id: "res-4", title: "\u692D\u5706\u53CA\u5176\u6807\u51C6\u65B9\u7A0B \xB7 \u540D\u5E08\u8BFE\u5802\u5B9E\u5F55", kind: "video", origin: "official", kp_name: "\u5706\u9525\u66F2\u7EBF \xB7 \u692D\u5706", updated_at: "2026-08-15", size_label: "\u89C6\u9891 \xB7 42 \u5206\u949F" },
  { resource_id: "res-5", title: "\u51FD\u6570\u7684\u57FA\u672C\u6027\u8D28 \xB7 \u8BFE\u540E\u5FAE\u7EC3\u4E60", kind: "question_set", origin: "school", kp_name: "\u51FD\u6570\u7684\u6982\u5FF5\u4E0E\u6027\u8D28", updated_at: "2026-08-25", size_label: "PDF \xB7 6 \u9875", question_count: 16 },
  { resource_id: "res-6", title: "\u6570\u5217\u6C42\u548C\u65B9\u6CD5\u4E13\u9898\uFF08\u5012\u5E8F\u76F8\u52A0\u7B49\uFF09", kind: "doc", origin: "platform", kp_name: "\u6570\u5217", updated_at: "2026-08-18", size_label: "PDF \xB7 14 \u9875" }
];
var V2_CANDIDATES = [
  {
    candidate_id: "cand-1",
    stem: "\u5DF2\u77E5\u692D\u5706 $\\frac{x^2}{16}+\\frac{y^2}{9}=1$ \u7684\u5DE6\u53F3\u7126\u70B9\u4E3A $F_1$\u3001$F_2$\uFF0C\u70B9 $P$ \u5728\u692D\u5706\u4E0A\uFF0C\u5219 $|PF_1|+|PF_2|=$\uFF3F\uFF3F\uFF3F\u3002",
    kp_name: "\u5706\u9525\u66F2\u7EBF \xB7 \u692D\u5706",
    confidence: "high",
    ocr_image_hint: "\u539F\u56FE\u7B2C 12 \u9875 \xB7 \u7B2C 4 \u9898\uFF08\u626B\u63CF\u6E05\u6670\uFF09",
    suggested: {
      question_id: "q-sch-01",
      kp_code: "KP-TY",
      kp_name: "\u692D\u5706\u7684\u5B9A\u4E49",
      q_type: "fill",
      difficulty: "basic",
      source: "school",
      stem: "\u5DF2\u77E5\u692D\u5706 $\\frac{x^2}{16}+\\frac{y^2}{9}=1$ \u7684\u5DE6\u53F3\u7126\u70B9\u4E3A $F_1$\u3001$F_2$\uFF0C\u70B9 $P$ \u5728\u692D\u5706\u4E0A\uFF0C\u5219 $|PF_1|+|PF_2|=$\uFF3F\uFF3F\uFF3F\u3002",
      options: void 0,
      answer: "8",
      analysis: { analysis: "\u692D\u5706\u5B9A\u4E49\u76F4\u63A5\u5E94\u7528\u3002", solution: "$a^2=16$\uFF0C$a=4$\uFF0C$|PF_1|+|PF_2|=2a=8$\u3002", comment: "\u5B9A\u4E49\u56DE\u5F52\u9898\u3002" },
      score: 5
    },
    status: "pending"
  },
  {
    candidate_id: "cand-2",
    stem: "\u692D\u5706 $\\frac{x^2}{m}+\\frac{y^2}{8}=1$ \u7684\u79BB\u5FC3\u7387\u4E3A $\\frac{1}{2}$\uFF0C\u5219 $m=$\uFF3F\uFF3F\uFF3F\u3002",
    kp_name: "\u5706\u9525\u66F2\u7EBF \xB7 \u692D\u5706",
    confidence: "low",
    ocr_image_hint: "\u539F\u56FE\u7B2C 27 \u9875 \xB7 \u7B2C 11 \u9898\uFF08\u516C\u5F0F\u8BC6\u522B\u7591\u4F3C\u5931\u771F\uFF1A\u539F\u6587\u6761\u4EF6\u4E3A $2a>2c$\uFF0COCR \u8BEF\u8BC6\u4E3A $2a\\geq 2c$\uFF0C\u8BF7\u5BF9\u7167\u539F\u56FE\uFF09",
    suggested: {
      question_id: "q-sch-02",
      kp_code: "KP-JD",
      kp_name: "\u692D\u5706\u7684\u7B80\u5355\u51E0\u4F55\u6027\u8D28",
      q_type: "fill",
      difficulty: "medium",
      source: "school",
      stem: "\u692D\u5706 $\\frac{x^2}{m}+\\frac{y^2}{8}=1$ \u7684\u79BB\u5FC3\u7387\u4E3A $\\frac{1}{2}$\uFF0C\u5219 $m=$\uFF3F\uFF3F\uFF3F\u3002",
      options: void 0,
      answer: "12 \u6216 $\\frac{32}{3}$",
      analysis: { analysis: "\u5206\u7126\u70B9\u5728 x \u8F74\uFF08$m>8$\uFF09\u4E0E y \u8F74\uFF08$m<8$\uFF09\u8BA8\u8BBA\u3002", solution: "\u82E5 $m>8$\uFF1A$c^2=m-8$\uFF0C$\\frac{m-8}{m}=\\frac{1}{4}$\uFF0C$m=\\frac{32}{3}$\uFF08\u820D\uFF0C\u56E0 $<8$\uFF09\uFF1F\u91CD\u7B97 $\\frac{m-8}{m}=\\frac{1}{4}\\Rightarrow 4m-32=m\\Rightarrow m=\\frac{32}{3}$ \u4E0D\u6EE1\u8DB3 $m>8$\uFF0C\u820D\uFF1B\u82E5 $m<8$\uFF1A$c^2=8-m$\uFF0C$\\frac{8-m}{8}=\\frac{1}{4}$\uFF0C$m=6$\u3002\u7EFC\u5408 $m=6$\u3002", comment: "\u7126\u70B9\u8F74\u5206\u7C7B\u8BA8\u8BBA\u3002" },
      score: 5
    },
    status: "pending"
  }
];

// src/mock/teacherV2Server.ts
function readBody2(req) {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => {
      buf += c;
    });
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve({});
      }
    });
  });
}
function ok2(res, data) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ code: 0, message: "ok", data }));
}
function fail2(res, status, code, message) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ code, message, data: null }));
}
function sendSse(res, event, data) {
  res.write(`event: ${event}
data: ${JSON.stringify(data)}

`);
}
function startSse(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write("retry: 3000\n\n");
}
var clone = (v) => JSON.parse(JSON.stringify(v));
var seq2 = 100;
var nextId2 = (p) => `${p}-${seq2++}`;
var isTeacher = (req) => (req.headers?.authorization || "").includes("mock-token-teacher-preview");
var plans = /* @__PURE__ */ new Map();
var decks = /* @__PURE__ */ new Map();
var papers = /* @__PURE__ */ new Map();
var assignments2 = /* @__PURE__ */ new Map();
var submissionsByAssign = /* @__PURE__ */ new Map();
var reviewPacks = /* @__PURE__ */ new Map();
var teacherTags = /* @__PURE__ */ new Map();
var schoolQuestions = [];
var candidates = [];
var tasks2 = /* @__PURE__ */ new Map();
var sessions2 = /* @__PURE__ */ new Map();
var questionBank = [...V2_ALL_QUESTIONS];
function rosterOf(classId) {
  return classId === "cls-g2-5" ? V2_ROSTER_5 : V2_ROSTER_3;
}
function classOf(classId) {
  return V2_CLASSES.find((c) => c.class_id === classId) || V2_CLASSES[0];
}
function createTask(capability, stage, artifactId = null, onDone) {
  const t = {
    task_id: nextId2("task"),
    capability,
    status: "queued",
    progress: 0,
    stage,
    artifact_id: artifactId,
    error_code: null,
    created_at: iso3(),
    updated_at: iso3()
  };
  tasks2.set(t.task_id, t);
  setTimeout(() => {
    const cur = tasks2.get(t.task_id);
    if (!cur || cur.status === "cancelled") return;
    cur.status = "running";
    cur.progress = 45;
    cur.stage = stage;
    cur.updated_at = iso3();
  }, 400);
  setTimeout(() => {
    const cur = tasks2.get(t.task_id);
    if (!cur || cur.status === "cancelled") return;
    cur.status = "succeeded";
    cur.progress = 100;
    cur.stage = "\u5B8C\u6210";
    cur.updated_at = iso3();
    if (onDone) onDone();
  }, 1100);
  return t;
}
function taskView(t) {
  if (t.status === "succeeded" || t.status === "failed" || t.status === "cancelled") return t;
  const elapsed = Date.now() - new Date(t.created_at || iso3()).getTime();
  if (elapsed >= 1100) return { ...t, status: "succeeded", progress: 100, stage: "\u5B8C\u6210" };
  if (elapsed >= 400) return { ...t, status: "running", progress: 45, stage: t.stage };
  return t;
}
function monoPlan() {
  const base = clone(MONO_PLAN);
  base.outline = [
    { id: "o1", kind: "\u68B3\u7406", title: "\u5355\u8C03\u6027\u5B9A\u4E49\u56DE\u987E", minutes: 6, summary: "\u7B26\u53F7\u8BED\u8A00\u590D\u8FF0\u5B9A\u4E49\uFF0C\u8FA8\u6790\u300C\u4EFB\u610F\u6027\u300D" },
    { id: "o2", kind: "\u65B9\u6CD5", title: "\u5224\u65AD\u5355\u8C03\u6027\u7684\u4E09\u6761\u8DEF\u5F84", minutes: 8, summary: "\u56FE\u8C61\u6CD5\u3001\u5B9A\u4E49\u6CD5\u3001\u5BFC\u6570\u6CD5\uFF08\u9AD8\u4E8C\u8854\u63A5\uFF09" },
    { id: "o3", kind: "\u4F8B\u9898", title: "\u4F8B \xB7 \u5B9A\u4E49\u6CD5\u8BC1\u660E", minutes: 12, summary: "\u4E00\u8BBE\u4E8C\u4F5C\u5DEE\u4E09\u53D8\u5F62\u56DB\u5224\u5B9A\uFF0C\u89C4\u8303\u6B65\u9AA4" },
    { id: "o4", kind: "\u53D8\u5F0F", title: "\u53D8\u5F0F \xB7 \u542B\u53C2\u5355\u8C03\u6027", minutes: 10, summary: "\u5206\u7C7B\u8BA8\u8BBA\u53C2\u6570 a \u7684\u53D6\u503C" },
    { id: "o5", kind: "\u5C0F\u7ED3", title: "\u7ED3\u6784\u5316\u5C0F\u7ED3", minutes: 4, summary: "\u5B9A\u4E49 \u2192 \u65B9\u6CD5\u9009\u62E9\u6811 \u2192 \u6613\u9519\u6E05\u5355" }
  ];
  base.sections = [
    { id: "s1", phase: "\u5B9A\u4E49\u56DE\u987E", minutes: 6, teacher_activity: "\u5F15\u5BFC\u5B66\u751F\u7528\u7B26\u53F7\u8BED\u8A00\u590D\u8FF0\u589E\u51CF\u51FD\u6570\u5B9A\u4E49\uFF0C\u8FFD\u95EE\u300C\u4EFB\u610F\u300D\u4E8C\u5B57\u80FD\u5426\u53BB\u6389", student_activity: "\u590D\u8FF0\u5B9A\u4E49\u5E76\u4E3E\u4F8B\u8BF4\u660E\u300C\u4EFB\u610F\u300D\u7684\u5FC5\u8981\u6027", design_intent: "\u9488\u5BF9\u8BC1\u660E\u6B65\u9AA4\u7F3A\u5931\u9519\u56E0\uFF0845%\uFF09\uFF0C\u5148\u56FA\u5316\u5B9A\u4E49\u8868\u8FBE", content_items: ["\u5B9A\u4E49\uFF1A\u2200x\u2081<x\u2082\uFF0Cf(x\u2081)<f(x\u2082)"] },
    { id: "s2", phase: "\u65B9\u6CD5\u68B3\u7406", minutes: 8, teacher_activity: "\u677F\u4E66\u4E09\u6761\u8DEF\u5F84\u7684\u9009\u62E9\u6811\uFF1A\u56FE\u8C61\u6CD5\uFF08\u5FEB\u800C\u4E0D\u4E25\uFF09\u3001\u5B9A\u4E49\u6CD5\uFF08\u4E25\u8C28\u901A\u7528\uFF09\u3001\u5BFC\u6570\u6CD5\uFF08\u4E0B\u5B66\u671F\u4E3B\u7EBF\uFF09", student_activity: "\u6574\u7406\u65B9\u6CD5\u5BF9\u6BD4\u8868", design_intent: "\u5EFA\u7ACB\u65B9\u6CD5\u9009\u62E9\u7684\u5143\u8BA4\u77E5", content_items: ["\u65B9\u6CD5\u9009\u62E9\u6811"] },
    { id: "s3", phase: "\u4F8B\u9898\u7CBE\u8BB2", minutes: 12, teacher_activity: "\u8BB2\u89E3\uFF1A\u8BC1\u660E f(x)=x\xB3 \u5728 R \u4E0A\u5355\u8C03\u9012\u589E\u3002\u793A\u8303\u300C\u8BBE\u5143\u2014\u4F5C\u5DEE\u2014\u53D8\u5F62\u2014\u5B9A\u53F7\u300D\u56DB\u6B65", student_activity: "\u8DDF\u5199\u5B8C\u6574\u8BC1\u660E\uFF0C\u540C\u684C\u4E92\u67E5\u53D8\u5F62\u6B65\u9AA4", design_intent: "\u5B9A\u4E49\u6CD5\u8BC1\u660E\u7684\u89C4\u8303\u4E66\u5199\uFF08\u672C\u73ED\u5931\u5206\u4E3B\u56E0\uFF09", content_items: ["\u4F8B\u9898\u5B8C\u6574\u89E3\u7B54"] },
    { id: "s4", phase: "\u53D8\u5F0F\u8BAD\u7EC3", minutes: 10, teacher_activity: "\u51FA\u793A\u53D8\u5F0F\uFF1Af(x)=x\xB3+ax \u5728 [1,+\u221E) \u5355\u8C03\u9012\u589E\uFF0C\u6C42 a \u8303\u56F4", student_activity: "\u72EC\u7ACB\u5B8C\u6210\uFF0C2 \u4EBA\u677F\u6F14\u5206\u7C7B\u8BA8\u8BBA", design_intent: "\u542B\u53C2\u8BA8\u8BBA\u63D0\u5347\u601D\u7EF4\u5C42\u7EA7", content_items: ["\u53D8\u5F0F\u9898"] },
    { id: "s5", phase: "\u5C0F\u7ED3\u4F5C\u4E1A", minutes: 4, teacher_activity: "\u5C0F\u7ED3\u65B9\u6CD5\u4E3B\u7EBF\uFF0C\u5E03\u7F6E\u5206\u5C42\u4F5C\u4E1A", student_activity: "\u5B8C\u5584\u7B14\u8BB0\u7ED3\u6784\u56FE", design_intent: "\u7ED3\u6784\u5316\u6536\u675F", content_items: ["A \u7EC4\uFF1A\u6559\u6750 P82 \u590D\u4E60\u53C2\u8003\u9898 3", "B \u7EC4\uFF1A\u6052\u6210\u7ACB\u7EFC\u5408\u9898"] }
  ];
  base.board_design = "\u5DE6\uFF1A\u5B9A\u4E49\u4E0E\u65B9\u6CD5\u9009\u62E9\u6811\n\u4E2D\uFF1A\u4F8B\u9898\u5B8C\u6574\u8BC1\u660E\uFF08\u56DB\u6B65\u6807\u6CE8\uFF09\n\u53F3\uFF1A\u53D8\u5F0F\u5206\u7C7B\u8BA8\u8BBA\u8868";
  base.homework = [
    { tier: "A \u7EC4 \xB7 \u5168\u4F53", items: ["\u6559\u6750 P82 \u590D\u4E60\u53C2\u8003\u9898 A \u7EC4\u7B2C 3\u30014 \u9898"] },
    { tier: "B \u7EC4 \xB7 \u9009\u505A", items: ["\u5DF2\u77E5 f(x)=x\xB3+ax \u5728 [1,+\u221E) \u5355\u8C03\u9012\u589E\uFF0C\u6C42 a \u7684\u53D6\u503C\u8303\u56F4"] }
  ];
  base.quality_check = base.quality_check.map((c) => ({ ...c, pass: true }));
  base.version = 2;
  base.status = "draft";
  return base;
}
function seed() {
  plans = /* @__PURE__ */ new Map();
  decks = /* @__PURE__ */ new Map();
  papers = /* @__PURE__ */ new Map();
  assignments2 = /* @__PURE__ */ new Map();
  submissionsByAssign = /* @__PURE__ */ new Map();
  reviewPacks = /* @__PURE__ */ new Map();
  teacherTags = /* @__PURE__ */ new Map();
  schoolQuestions = [];
  candidates = [];
  tasks2 = /* @__PURE__ */ new Map();
  sessions2 = /* @__PURE__ */ new Map();
  questionBank = [...V2_ALL_QUESTIONS];
  const ellipse = clone(ELLIPSE_PLAN);
  ellipse.status = "confirmed";
  plans.set(ellipse.plan_id, ellipse);
  plans.set("plan-mono-001", monoPlan());
  plans.set("plan-arith-001", clone(ARITH_PLAN));
  const deck = clone(ELLIPSE_DECK);
  deck.version = 1;
  decks.set(deck.deck_id, deck);
  const assign = {
    assignment_id: "assign-pre-001",
    title: "\u692D\u5706\u9884\u4E60\u5355\uFF088 \u6708 31 \u65E5\u665A\uFF09",
    class_id: "cls-g2-3",
    class_name: "\u9AD8\u4E8C 3 \u73ED",
    kp_name: "\u692D\u5706\u7684\u5B9A\u4E49",
    due_at: "09-01 07:40",
    tiers: [
      { tier: "base", label: "\u57FA\u7840\u7EC4", student_count: 46, items: ["\u9884\u4E60\u5355 3 \u9898"] }
    ],
    status: "grading",
    submitted: 46,
    total: 46
  };
  assignments2.set(assign.assignment_id, assign);
  submissionsByAssign.set(assign.assignment_id, genSubmissions("cls-g2-3"));
}
function genSubmissions(classId) {
  const roster = rosterOf(classId);
  const rand = seededRandom(classId === "cls-g2-5" ? 55 : 33);
  const consolid = V2_INSIGHTS[classId]?.tier_lists.find((t) => t.tier === "consolid")?.students || [];
  const challenge = V2_INSIGHTS[classId]?.tier_lists.find((t) => t.tier === "challenge")?.students || [];
  return roster.map((name, i) => {
    const tier = consolid.includes(name) ? "base" : challenge.includes(name) ? "challenge" : "consolid";
    const isLow = i % 9 === 4 && i < 46;
    const correct = isLow ? 1 : Math.min(3, Math.max(0, Math.round(rand() * 3 + (tier === "challenge" ? 2.4 : tier === "consolid" ? 1.3 : 0.9))));
    const suggested = Math.round(correct / 3 * 100 * (isLow ? 0.85 : 0.97) * 10) / 10;
    return {
      submission_id: `sub-${classId.slice(-1)}-${String(i + 1).padStart(2, "0")}`,
      student: { user_id: `stu-${i + 1}`, name, tier },
      submitted_at: `09-01 ${String(19 + i % 3).padStart(2, "0")}:${String(10 + i % 40).padStart(2, "0")}`,
      objective: { total: 3, correct },
      ai_suggested_score: Math.max(30, Math.min(100, suggested)),
      ai_confidence: isLow ? "low" : rand() > 0.35 ? "high" : "mid",
      needs_manual: isLow,
      error_tags: correct < 3 ? [{ tag: correct === 0 ? "\u6982\u5FF5\u6DF7\u6DC6 \xB7 \u5FFD\u7565\u5B9A\u4E49\u6761\u4EF6" : "\u8FD0\u7B97\u5931\u8BEF \xB7 \u5E73\u65B9\u5316\u7B80\u8DF3\u6B65", source: "ai" }] : [],
      final_score: null,
      teacher_feedback: null,
      work_image_hint: `\u626B\u63CF\u4EF6 \xB7 \u7B2C ${1 + i % 2} \u9875\uFF08\u5171 2 \u9875\uFF09`
    };
  });
}
function buildDeckFromPlan(plan, templateId) {
  const topic = plan.topic || "";
  if (topic.includes("\u692D\u5706")) {
    const deck = clone(ELLIPSE_DECK);
    deck.template_id = templateId || deck.template_id;
    deck.version = 1;
    deck.exported_at = null;
    return deck;
  }
  const qs = topic.includes("\u5355\u8C03") ? V2_QUESTIONS_MONO : topic.includes("\u7B49\u5DEE") ? V2_QUESTIONS_DC : V2_QUESTIONS;
  const ex = qs.filter((q) => q.q_type === "solution").slice(0, 2);
  const slides = [];
  const push = (id, kind, title, elements) => slides.push({ id, kind, title, elements });
  const T = (id, left, top, width, html, fontSize, color, bold = false) => ({ id, left, top, width, height: 60, type: "text", html, fontSize, color, bold });
  push("ms-1", "cover", "\u5C01\u9762", [
    T("e1", 140, 200, 1e3, plan.topic, 44, "#FFFFFF", true),
    T("e2", 340, 320, 600, plan.textbook_ref, 18, "#93B4F5"),
    T("e3", 340, 380, 600, `${plan.class_name} \xB7 \u6570\u5B66 \xB7 \u674E\u6587\u6F9C`, 16, "#6B8AC9")
  ]);
  push("ms-2", "objective", "\u5B66\u4E60\u76EE\u6807", [
    T("e1", 100, 70, 800, "\u5B66\u4E60\u76EE\u6807", 30, "#3B82F6", true),
    ...plan.objectives.map((o, i) => T(`e${i + 2}`, 100, 170 + i * 80, 1080, `${i + 1}. ${o}`, 20, "#E6EDF7"))
  ]);
  push("ms-3", "summary", "\u590D\u4E60\u7ED3\u6784", [
    T("e1", 100, 70, 900, "\u77E5\u8BC6\u7ED3\u6784", 30, "#3B82F6", true),
    ...plan.outline.map((o, i) => T(`e${i + 2}`, 100, 160 + i * 70, 1080, `${o.title}\uFF08${o.minutes} \u5206\u949F\uFF09\u2014 ${o.summary}`, 19, "#E6EDF7"))
  ]);
  ex.forEach((q, i) => {
    push(`ms-${4 + i}`, "example", `\u4F8B ${i + 1}`, [
      T("e1", 100, 70, 900, `\u4F8B ${i + 1}`, 30, "#2F855A", true),
      T("e2", 110, 160, 1060, q.stem, 20, "#FFFFFF"),
      T("e3", 110, 420, 1060, q.analysis.solution, 18, "#E6EDF7")
    ]);
  });
  push("ms-6", "homework", "\u4F5C\u4E1A", [
    T("e1", 100, 70, 900, "\u5206\u5C42\u4F5C\u4E1A", 30, "#3B82F6", true),
    ...plan.homework.flatMap((h, i) => [
      T(`t${i}`, 110, 170 + i * 120, 1060, h.tier, 18, "#F59E0B", true),
      T(`i${i}`, 110, 220 + i * 120, 1060, h.items.join("\uFF1B"), 18, "#E6EDF7")
    ])
  ]);
  return {
    deck_id: nextId2("deck"),
    title: plan.topic,
    class_id: plan.class_id,
    class_name: plan.class_name,
    template_id: templateId || "math-theorem-dark",
    slides,
    version: 1,
    plan_id: plan.plan_id,
    exported_at: null
  };
}
function composePaper(body) {
  const counts = body.counts || { choice: 6, fill: 4, solution: 2 };
  const ratio = body.difficulty_ratio || { basic: 3, medium: 5, hard: 2 };
  const kpCodes = body.kp_codes?.length ? body.kp_codes : ["KP-TY", "KP-BZ"];
  const pool = questionBank.filter((q) => kpCodes.includes(q.kp_code));
  const total = counts.choice + counts.fill + counts.solution;
  const ratioSum = ratio.basic + ratio.medium + ratio.hard;
  const want = (d) => Math.round(ratio[d] / ratioSum * total);
  const picked = [];
  const used = /* @__PURE__ */ new Set();
  const gaps = [];
  const byDiff = { basic: [], medium: [], hard: [] };
  pool.forEach((q) => {
    if (!used.has(q.question_id)) byDiff[q.difficulty].push(q);
  });
  ["basic", "medium", "hard"].forEach((d) => {
    const need = want(d);
    const avail = byDiff[d];
    if (avail.length < need) {
      gaps.push({
        kp_name: kpCodes.length === 1 ? pool[0]?.kp_name || "\u6240\u9009\u77E5\u8BC6\u70B9" : `${kpCodes.length} \u4E2A\u77E5\u8BC6\u70B9\uFF08${pool[0]?.kp_name || ""} \u7B49\uFF09`,
        requested: need,
        available: avail.length,
        action: avail.length === 0 ? "\u8BE5\u96BE\u5EA6\u6682\u65E0\u9898\u6E90\uFF0C\u5EFA\u8BAE\u4E0A\u4F20\u6821\u672C\u4E60\u9898\u96C6\u8865\u5145" : `\u5DF2\u7528 ${avail.length} \u9898\u8865\u9F50\uFF0C\u7F3A\u53E3 ${need - avail.length} \u9898`
      });
    }
    avail.slice(0, need).forEach((q) => {
      picked.push(q);
      used.add(q.question_id);
    });
  });
  const order = { choice: 0, fill: 1, solution: 2 };
  picked.sort((a, b) => order[a.q_type] - order[b.q_type]);
  const scoreMap = { choice: 5, fill: 5, solution: 12 };
  const items = picked.map((q, i) => ({ seq: i + 1, question: { ...q, score: scoreMap[q.q_type] } }));
  const scene = body.scene || "exam";
  return {
    paper_id: nextId2("paper"),
    title: body.title || `${kpCodes.length === 1 ? pool[0]?.kp_name || "\u7EFC\u5408" : "\u5706\u9525\u66F2\u7EBF"}${scene === "exam" ? "\u5468\u6D4B\u5377" : scene === "quiz" ? "\u5F53\u5802\u68C0\u6D4B" : "\u5206\u5C42\u4F5C\u4E1A"}`,
    scene,
    duration_minutes: scene === "exam" ? 90 : scene === "quiz" ? 40 : 35,
    total_score: items.reduce((s, it) => s + it.question.score, 0),
    items,
    gaps,
    created_at: iso3()
  };
}
async function handleTeacherV2Api(req, res) {
  const [url] = (req.url || "").split("?");
  const qs = new URLSearchParams((req.url || "").split("?")[1] || "");
  const method = req.method;
  const seg = url.split("/").filter(Boolean);
  if (seg[0] !== "teacher-v2") return false;
  if (!isTeacher(req)) {
    fail2(res, 403, 40301, "role_denied");
    return true;
  }
  const body = method === "GET" ? {} : await readBody2(req);
  if (method === "GET" && url === "/teacher-v2/today") {
    const data = {
      teacher: { name: V2_TEACHER.name, greeting: "\u4E0A\u5348\u597D" },
      date_label: "9 \u6708 2 \u65E5 \xB7 \u5468\u4E09",
      schedule: v2Schedule(),
      todos: v2Todos(),
      classes: v2ClassBriefs(),
      tomorrow_preview: { time_range: "08:10 - 08:55", class_name: "\u9AD8\u4E8C 5 \u73ED", topic: "\u51FD\u6570\u7684\u5355\u8C03\u6027\uFF08\u590D\u4E60\u8BFE\uFF09" }
    };
    ok2(res, data);
    return true;
  }
  if (method === "POST" && url === "/teacher-v2/lesson-plans/generate") {
    const topic = String(body.topic || "");
    const classId = body.class_id || "cls-g2-3";
    const base = topic.includes("\u5355\u8C03") ? monoPlan() : topic.includes("\u7B49\u5DEE") ? clone(ARITH_PLAN) : clone(ELLIPSE_PLAN);
    const plan = {
      ...base,
      plan_id: nextId2("plan"),
      topic: topic || base.topic,
      class_id: classId,
      class_name: classOf(classId).class_name,
      status: "draft",
      version: 1,
      updated_at: iso3(),
      design_basis: base.design_basis || null
    };
    plans.set(plan.plan_id, plan);
    startSse(res);
    sendSse(res, "meta", { plan_id: plan.plan_id, topic: plan.topic, class_name: plan.class_name, design_basis: plan.design_basis });
    const t1 = setTimeout(() => sendSse(res, "outline", { outline: plan.outline }), 700);
    let acc = 1400;
    const timers = [t1];
    plan.sections.forEach((s, i) => {
      timers.push(setTimeout(() => sendSse(res, "section", { section: s, index: i + 1, total: plan.sections.length }), acc));
      acc += 550;
    });
    timers.push(setTimeout(() => {
      sendSse(res, "done", { plan });
      res.end();
    }, acc + 300));
    req.on("close", () => timers.forEach(clearTimeout));
    return true;
  }
  if (method === "GET" && seg[1] === "lesson-plans" && seg[2] && !seg[3]) {
    const plan = plans.get(seg[2]);
    if (!plan) {
      fail2(res, 404, 40400, "\u6559\u6848\u4E0D\u5B58\u5728");
      return true;
    }
    ok2(res, plan);
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/lesson-plans") {
    ok2(res, { items: [...plans.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)) });
    return true;
  }
  if (method === "PATCH" && seg[1] === "lesson-plans" && seg[2]) {
    const plan = plans.get(seg[2]);
    if (!plan) {
      fail2(res, 404, 40400, "\u6559\u6848\u4E0D\u5B58\u5728");
      return true;
    }
    if (body.version !== void 0 && body.version !== plan.version) {
      fail2(res, 409, 40901, "version_conflict");
      return true;
    }
    const patch = body.patch || body;
    ["objectives", "key_point", "difficulty_point", "aids", "sections", "homework", "board_design"].forEach((k) => {
      if (patch[k] !== void 0) plan[k] = patch[k];
    });
    plan.version += 1;
    plan.updated_at = iso3();
    ok2(res, plan);
    return true;
  }
  if (method === "POST" && seg[1] === "lesson-plans" && seg[2] && seg[3] === "confirm") {
    const plan = plans.get(seg[2]);
    if (!plan) {
      fail2(res, 404, 40400, "\u6559\u6848\u4E0D\u5B58\u5728");
      return true;
    }
    plan.status = "confirmed";
    plan.version += 1;
    plan.updated_at = iso3();
    ok2(res, plan);
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/slides/templates") {
    ok2(res, { items: V2_TEMPLATES });
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/slides") {
    ok2(res, { items: [...decks.values()].map((d) => ({ deck_id: d.deck_id, title: d.title, class_name: d.class_name, template_id: d.template_id, slide_count: d.slides.length, version: d.version })) });
    return true;
  }
  if (method === "POST" && url === "/teacher-v2/slides/generate") {
    const plan = plans.get(body.plan_id) || plans.get("plan-ellipse-001");
    const deck = buildDeckFromPlan(plan, body.template_id);
    decks.set(deck.deck_id, deck);
    startSse(res);
    sendSse(res, "meta", { deck_id: deck.deck_id, title: deck.title, class_name: deck.class_name, slide_count: deck.slides.length });
    const t1 = setTimeout(() => sendSse(res, "outline", { slides: deck.slides.map((s, i) => ({ index: i + 1, id: s.id, kind: s.kind, title: s.title })) }), 600);
    const timers = [t1];
    let acc = 1100;
    deck.slides.forEach((s, i) => {
      timers.push(setTimeout(() => sendSse(res, "page", { index: i + 1, total: deck.slides.length, slide: s }), acc));
      acc += 260;
    });
    timers.push(setTimeout(() => {
      sendSse(res, "done", { deck });
      res.end();
    }, acc + 200));
    req.on("close", () => timers.forEach(clearTimeout));
    return true;
  }
  if (method === "GET" && seg[1] === "slides" && seg[2] && !seg[3]) {
    const deck = decks.get(seg[2]);
    if (!deck) {
      fail2(res, 404, 40400, "\u8BFE\u4EF6\u4E0D\u5B58\u5728");
      return true;
    }
    ok2(res, deck);
    return true;
  }
  const slideScaffold = (kind, title, deck) => {
    const T = (id, left, top, width, html, fontSize, color, bold = false) => ({ id, left, top, width, height: 60, type: "text", html, fontSize, color, bold });
    const topic = (deck.title || "").replace(/^\d+(\.\d+)*\s*/, "");
    if (kind === "cover") return { id: nextId2("pg"), kind, title: title || "\u5C01\u9762", elements: [
      T("e1", 140, 200, 1e3, title || deck.title, 44, "#FFFFFF", true),
      T("e2", 340, 330, 600, `${deck.class_name} \xB7 \u6570\u5B66 \xB7 \u674E\u6587\u6F9C`, 16, "#6B8AC9")
    ] };
    if (kind === "objective") return { id: nextId2("pg"), kind, title: title || "\u5B66\u4E60\u76EE\u6807", elements: [
      T("e1", 100, 70, 900, title || "\u5B66\u4E60\u76EE\u6807", 30, "#3B82F6", true),
      T("e2", 100, 170, 1080, `1. \u7406\u89E3\u300C${topic}\u300D\u7684\u6838\u5FC3\u6982\u5FF5\u4E0E\u6210\u7ACB\u6761\u4EF6`, 20, "#E6EDF7"),
      T("e3", 100, 250, 1080, "2. \u638C\u63E1\u89C4\u8303\u7684\u89E3\u9898\u6B65\u9AA4\uFF0C\u80FD\u72EC\u7ACB\u5B8C\u6210\u4E2D\u6863\u96BE\u5EA6\u95EE\u9898", 20, "#E6EDF7"),
      T("e4", 100, 330, 1080, "3. \u4F53\u4F1A\u6570\u5F62\u7ED3\u5408\u4E0E\u7531\u7279\u6B8A\u5230\u4E00\u822C\u7684\u601D\u60F3\u65B9\u6CD5\uFF0C\u63D0\u5347\u6570\u5B66\u8FD0\u7B97\u4E0E\u903B\u8F91\u63A8\u7406\u7D20\u517B", 20, "#E6EDF7")
    ] };
    if (kind === "explore") return { id: nextId2("pg"), kind, title: title || "\u8BFE\u5802\u63A2\u7A76", elements: [
      T("e1", 100, 70, 900, title || "\u8BFE\u5802\u63A2\u7A76", 30, "#F59E0B", true),
      T("e2", 100, 170, 1080, `\u95EE\u9898\uFF1A${topic}\u4E2D\u8574\u542B\u7684\u89C4\u5F8B\u662F\u4EC0\u4E48\uFF1F\u52A8\u624B\u8BD5\u4E00\u8BD5\uFF0C\u8BB0\u5F55\u4F60\u7684\u53D1\u73B0\u3002`, 20, "#E6EDF7"),
      T("e3", 100, 260, 1080, "\u5C0F\u7EC4\u4EFB\u52A1\uFF1A\u2460 \u5148\u72EC\u7ACB\u601D\u8003 2 \u5206\u949F\uFF1B\u2461 \u7EC4\u5185\u4EA4\u6D41\u5404\u81EA\u7684\u89C2\u5BDF\uFF1B\u2462 \u4EE3\u8868\u6C47\u62A5\u7ED3\u8BBA\u4E0E\u4F9D\u636E\u3002", 18, "#93B4F5")
    ] };
    if (kind === "example" || kind === "variant") {
      const plan = plans.get(deck.plan_id || "");
      const pt = plan?.topic || "";
      const qs2 = pt.includes("\u5355\u8C03") ? V2_QUESTIONS_MONO : pt.includes("\u7B49\u5DEE") ? V2_QUESTIONS_DC : V2_QUESTIONS;
      const q = qs2.filter((x) => x.q_type === "solution")[0] || qs2[0];
      return { id: nextId2("pg"), kind, title: title || (kind === "example" ? "\u4F8B\u9898" : "\u53D8\u5F0F"), elements: [
        T("e1", 100, 70, 900, title || (kind === "example" ? "\u4F8B\u9898" : "\u53D8\u5F0F\u7EC3\u4E60"), 30, "#2F855A", true),
        T("e2", 110, 160, 1060, q?.stem || "\u8865\u5145\u4F8B\u9898", 20, "#FFFFFF"),
        T("e3", 110, 290, 1060, q?.analysis?.solution || "", 18, "#E6EDF7"),
        T("e4", 110, 400, 1060, `\u6765\u6E90\uFF1A${q?.source === "school" ? "\u6821\u672C\u9898\u5E93" : "\u5B98\u65B9\u9898\u5E93"} \xB7 \u96BE\u5EA6 ${q?.difficulty === "basic" ? "\u57FA\u7840" : q?.difficulty === "medium" ? "\u4E2D\u6863" : "\u538B\u8F74"}`, 15, "#93B4F5")
      ] };
    }
    if (kind === "summary") return { id: nextId2("pg"), kind, title: title || "\u8BFE\u5802\u5C0F\u7ED3", elements: [
      T("e1", 100, 70, 900, title || "\u8BFE\u5802\u5C0F\u7ED3", 30, "#3B82F6", true),
      T("e2", 100, 170, 1080, "\u77E5\u8BC6\u4E3B\u7EBF\uFF1A\u5B9A\u4E49 \u2192 \u6027\u8D28 \u2192 \u65B9\u6CD5 \u2192 \u5E94\u7528", 20, "#E6EDF7"),
      T("e3", 100, 250, 1080, "\u65B9\u6CD5\u9009\u62E9\uFF1A\u5148\u5224\u65AD\u7C7B\u578B\uFF0C\u518D\u9009\u5DE5\u5177\uFF0C\u6700\u540E\u89C4\u8303\u4E66\u5199", 20, "#E6EDF7"),
      T("e4", 100, 330, 1080, "\u6613\u9519\u63D0\u9192\uFF1A\u6761\u4EF6\u68C0\u9A8C\u4E0D\u53EF\u7701\u7565\uFF1B\u8FD0\u7B97\u8DF3\u6B65\u662F\u672C\u73ED\u4E3B\u8981\u5931\u5206\u70B9", 18, "#F6AD55")
    ] };
    if (kind === "homework") return { id: nextId2("pg"), kind, title: title || "\u5206\u5C42\u4F5C\u4E1A", elements: [
      T("e1", 100, 70, 900, title || "\u5206\u5C42\u4F5C\u4E1A", 30, "#0E9488", true),
      T("e2", 100, 170, 1080, "A \u7EC4 \xB7 \u5168\u4F53\uFF1A\u6559\u6750\u672C\u8282\u7EC3\u4E60\u7B2C 1\u30012 \u9898", 20, "#E6EDF7"),
      T("e3", 100, 250, 1080, "B \u7EC4 \xB7 \u9009\u505A\uFF1A\u672C\u8282\u914D\u5957\u4E2D\u6863\u7EFC\u5408\u9898\uFF08\u542B\u5206\u7C7B\u8BA8\u8BBA\uFF09", 20, "#E6EDF7"),
      T("e4", 100, 330, 1080, "\u63D0\u4EA4\u65B9\u5F0F\uFF1A\u5B66\u751F\u7AEF\u62CD\u7167\u4E0A\u4F20 \xB7 \u660E\u65E5 08:00 \u622A\u6B62", 16, "#93B4F5")
    ] };
    return { id: nextId2("pg"), kind: "end", title: title || "\u8C22\u8C22", elements: [
      T("e1", 420, 280, 440, title || "\u672C\u8282\u8BFE\u7ED3\u675F \xB7 \u8C22\u8C22", 40, "#FFFFFF", true),
      T("e2", 470, 400, 340, `${deck.class_name} \xB7 \u6570\u5B66`, 18, "#6B8AC9")
    ] };
  };
  if (method === "POST" && seg[1] === "slides" && seg[2] && seg[3] === "pages" && !seg[4]) {
    const deck = decks.get(seg[2]);
    if (!deck) {
      fail2(res, 404, 40400, "\u8BFE\u4EF6\u4E0D\u5B58\u5728");
      return true;
    }
    const kinds = ["cover", "objective", "explore", "example", "variant", "summary", "homework", "end"];
    const kind = kinds.includes(body.kind) ? body.kind : "example";
    const slide = slideScaffold(kind, String(body.title || ""), deck);
    const afterIdx = body.after_page_id ? deck.slides.findIndex((s) => s.id === body.after_page_id) : deck.slides.length - 1;
    deck.slides.splice(afterIdx + 1, 0, slide);
    deck.version += 1;
    ok2(res, { slide, deck });
    return true;
  }
  if (method === "DELETE" && seg[1] === "slides" && seg[2] && seg[3] === "pages" && seg[4]) {
    const deck = decks.get(seg[2]);
    if (!deck) {
      fail2(res, 404, 40400, "\u8BFE\u4EF6\u4E0D\u5B58\u5728");
      return true;
    }
    if (deck.slides.length <= 1) {
      fail2(res, 400, 40001, "\u81F3\u5C11\u4FDD\u7559\u4E00\u9875");
      return true;
    }
    const idx = deck.slides.findIndex((s) => s.id === seg[4]);
    if (idx < 0) {
      fail2(res, 404, 40400, "\u9875\u9762\u4E0D\u5B58\u5728");
      return true;
    }
    deck.slides.splice(idx, 1);
    deck.version += 1;
    ok2(res, { removed: seg[4], deck });
    return true;
  }
  if (method === "PATCH" && seg[1] === "slides" && seg[2] && seg[3] === "pages" && seg[4]) {
    const deck = decks.get(seg[2]);
    if (!deck) {
      fail2(res, 404, 40400, "\u8BFE\u4EF6\u4E0D\u5B58\u5728");
      return true;
    }
    const slide = deck.slides.find((s) => s.id === seg[4]);
    if (!slide) {
      fail2(res, 404, 40400, "\u9875\u9762\u4E0D\u5B58\u5728");
      return true;
    }
    if (typeof body.title === "string" && body.title.trim()) slide.title = body.title.trim();
    if (body.kind && body.kind !== slide.kind) {
      const rebuilt = slideScaffold(body.kind, slide.title, deck);
      rebuilt.id = slide.id;
      rebuilt.remark = slide.remark;
      deck.slides[deck.slides.indexOf(slide)] = rebuilt;
    }
    deck.version += 1;
    ok2(res, { deck });
    return true;
  }
  if (method === "PATCH" && seg[1] === "slides" && seg[2]) {
    const deck = decks.get(seg[2]);
    if (!deck) {
      fail2(res, 404, 40400, "\u8BFE\u4EF6\u4E0D\u5B58\u5728");
      return true;
    }
    if (body.template_id) deck.template_id = body.template_id;
    if (body.page_id && body.elements) {
      const slide = deck.slides.find((s) => s.id === body.page_id);
      if (slide) slide.elements = body.elements;
    }
    deck.version += 1;
    ok2(res, deck);
    return true;
  }
  if (method === "POST" && seg[1] === "slides" && seg[2] && seg[3] === "pages" && seg[5] === "regenerate") {
    const deck = decks.get(seg[2]);
    if (!deck) {
      fail2(res, 404, 40400, "\u8BFE\u4EF6\u4E0D\u5B58\u5728");
      return true;
    }
    const idx = deck.slides.findIndex((s) => s.id === seg[4]);
    if (idx < 0) {
      fail2(res, 404, 40400, "\u9875\u9762\u4E0D\u5B58\u5728");
      return true;
    }
    const old = deck.slides[idx];
    const alt = V2_QUESTIONS.filter((q) => q.kp_code === "KP-BZ" && q.question_id !== "q-e-02")[0];
    const fresh = old.kind === "example" || old.kind === "variant" ? {
      id: old.id,
      kind: old.kind,
      title: old.title,
      elements: [
        { id: "e1", left: 100, top: 70, width: 900, height: 56, type: "text", html: `${old.title} \xB7 \u91CD\u751F\u6210`, fontSize: 30, color: "#2F855A", bold: true },
        { id: "e2", left: 110, top: 160, width: 1060, height: 100, type: "text", html: alt?.stem || old.title, fontSize: 20, color: "#FFFFFF" },
        { id: "e3", left: 110, top: 290, width: 1060, height: 80, type: "text", html: alt?.analysis.solution || "", fontSize: 18, color: "#E6EDF7" },
        { id: "e4", left: 110, top: 400, width: 1060, height: 60, type: "text", html: alt ? `\u6765\u6E90\uFF1A${alt.source === "school" ? "\u6821\u672C\u9898\u5E93" : "\u5B98\u65B9\u9898\u5E93"} \xB7 \u96BE\u5EA6 ${alt.difficulty === "basic" ? "\u57FA\u7840" : alt.difficulty === "medium" ? "\u4E2D\u6863" : "\u538B\u8F74"}` : "", fontSize: 15, color: "#93B4F5" }
      ],
      remark: "\u5355\u9875\u91CD\u751F\u6210 \xB7 \u4FDD\u7559\u539F\u9875\u9762\u76F4\u81F3\u786E\u8BA4"
    } : { ...old, remark: "\u5355\u9875\u91CD\u751F\u6210 \xB7 \u7248\u5F0F\u5FAE\u8C03" };
    deck.slides[idx] = fresh;
    deck.version += 1;
    ok2(res, { slide: fresh, deck });
    return true;
  }
  if (method === "POST" && seg[1] === "slides" && seg[2] && seg[3] === "export") {
    const deck = decks.get(seg[2]);
    if (!deck) {
      fail2(res, 404, 40400, "\u8BFE\u4EF6\u4E0D\u5B58\u5728");
      return true;
    }
    const format = body.format || "pptx";
    const task = createTask("slides.export", `\u5BFC\u51FA ${format.toUpperCase()} \xB7 ${deck.title}`, null, () => {
      deck.exported_at = iso3();
    });
    ok2(res, { task_id: task.task_id });
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/quiz/questions") {
    const kp = (qs.get("kp_code") || "").split(",").filter(Boolean);
    const difficulty = qs.get("difficulty") || "";
    const qType = qs.get("q_type") || "";
    const kw = (qs.get("q") || "").toLowerCase();
    let items = [...questionBank, ...schoolQuestions];
    if (kp.length) items = items.filter((q) => kp.includes(q.kp_code));
    if (difficulty) items = items.filter((q) => q.difficulty === difficulty);
    if (qType) items = items.filter((q) => q.q_type === qType);
    if (kw) items = items.filter((q) => q.stem.toLowerCase().includes(kw) || q.kp_name.toLowerCase().includes(kw));
    ok2(res, { items, total: items.length });
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/quiz/kp-tree") {
    const all = [...questionBank, ...schoolQuestions];
    const countOf = (code) => all.filter((q) => q.kp_code === code).length;
    const tree = clone(V2_KP_TREE).map((b) => ({
      ...b,
      children: b.children?.map((c) => ({ ...c, children: c.children?.map((k) => ({ ...k, question_count: countOf(k.code) })) }))
    }));
    ok2(res, { tree });
    return true;
  }
  if (method === "POST" && url === "/teacher-v2/quiz/compose") {
    const paper = composePaper(body);
    papers.set(paper.paper_id, paper);
    ok2(res, paper);
    return true;
  }
  if (method === "GET" && seg[1] === "quiz" && seg[2] === "papers" && seg[3]) {
    const paper = papers.get(seg[3]);
    if (!paper) {
      fail2(res, 404, 40400, "\u8BD5\u5377\u4E0D\u5B58\u5728");
      return true;
    }
    ok2(res, paper);
    return true;
  }
  if (method === "POST" && seg[1] === "quiz" && seg[2] === "papers" && seg[3] && seg[4] === "items" && seg[5] && seg[6] === "swap") {
    const paper = papers.get(seg[3]);
    if (!paper) {
      fail2(res, 404, 40400, "\u8BD5\u5377\u4E0D\u5B58\u5728");
      return true;
    }
    const seqNo = Number(seg[5]);
    const item = paper.items.find((it) => it.seq === seqNo);
    if (!item) {
      fail2(res, 404, 40400, "\u9898\u53F7\u4E0D\u5B58\u5728");
      return true;
    }
    const used = new Set(paper.items.map((it) => it.question.question_id));
    const pool = [...questionBank, ...schoolQuestions].filter((q) => q.kp_code === item.question.kp_code && q.q_type === item.question.q_type && q.difficulty === item.question.difficulty && !used.has(q.question_id));
    if (pool.length) {
      item.question = pool[Math.floor(Math.random() * pool.length)];
      ok2(res, { item });
      return true;
    }
    fail2(res, 404, 40400, "\u6682\u65E0\u53EF\u66FF\u6362\u7684\u540C\u7C7B\u9898");
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/assignments") {
    ok2(res, { items: [...assignments2.values()] });
    return true;
  }
  if (method === "POST" && url === "/teacher-v2/assignments") {
    const classId = body.class_id || "cls-g2-3";
    const cls = classOf(classId);
    const assign = {
      assignment_id: nextId2("assign"),
      title: body.title || "\u5206\u5C42\u4F5C\u4E1A",
      class_id: classId,
      class_name: cls.class_name,
      kp_name: body.kp_name || "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B",
      due_at: body.due_at || "09-03 22:00",
      tiers: body.tiers || [
        { tier: "base", label: "\u57FA\u7840\u7EC4\uFF08\u9884\u4E60\u5355 <60\uFF09", student_count: 12, items: ["A \u5377 \xB7 6 \u9898\uFF083:2:1\uFF09"] },
        { tier: "consolid", label: "\u5DE9\u56FA\u7EC4", student_count: 24, items: ["B \u5377 \xB7 8 \u9898\uFF083:4:1\uFF09"] },
        { tier: "challenge", label: "\u6311\u6218\u7EC4", student_count: 10, items: ["C \u5377 \xB7 6 \u9898\uFF081:3:2\uFF09"] }
      ],
      status: "collecting",
      submitted: 0,
      total: cls.student_count
    };
    assignments2.set(assign.assignment_id, assign);
    ok2(res, assign);
    return true;
  }
  if (method === "GET" && seg[1] === "assignments" && seg[2] && seg[3] === "submissions") {
    const assign = assignments2.get(seg[2]);
    if (!assign) {
      fail2(res, 404, 40400, "\u4F5C\u4E1A\u4E0D\u5B58\u5728");
      return true;
    }
    let items = submissionsByAssign.get(seg[2]) || [];
    if (!items.length) {
      items = genSubmissions(assign.class_id);
      submissionsByAssign.set(seg[2], items);
      assign.status = "grading";
      assign.submitted = items.length;
    }
    const filter = qs.get("filter") || "";
    if (filter === "manual") items = items.filter((s) => s.needs_manual);
    ok2(res, { items, context: { assignment: assign } });
    return true;
  }
  if (method === "POST" && seg[1] === "submissions" && seg[2] && seg[3] === "grade") {
    for (const [assignId, list] of submissionsByAssign) {
      const sub = list.find((s) => s.submission_id === seg[2]);
      if (!sub) continue;
      if (body.final_score !== void 0) sub.final_score = Number(body.final_score);
      if (body.teacher_feedback !== void 0) sub.teacher_feedback = body.teacher_feedback;
      if (Array.isArray(body.error_tags)) {
        sub.error_tags = body.error_tags.map((tag) => ({ tag, source: "teacher" }));
        const assign = assignments2.get(assignId);
        const bucket = teacherTags.get(assign.class_id) || [];
        for (const tag of body.error_tags) {
          const hit = bucket.find((b) => b.tag === tag);
          if (hit) hit.count += 1;
          else bucket.push({ tag, count: 1, kp_code: body.kp_code || "KP-BZ", kp_name: body.kp_name || assign.kp_name });
        }
        teacherTags.set(assign.class_id, bucket);
      }
      ok2(res, sub);
      return true;
    }
    fail2(res, 404, 40400, "\u4F5C\u7B54\u4E0D\u5B58\u5728");
    return true;
  }
  if (method === "POST" && seg[1] === "assignments" && seg[2] && seg[3] === "review-pack") {
    const assign = assignments2.get(seg[2]);
    if (!assign) {
      fail2(res, 404, 40400, "\u4F5C\u4E1A\u4E0D\u5B58\u5728");
      return true;
    }
    const subs = submissionsByAssign.get(seg[2]) || genSubmissions(assign.class_id);
    const wrongCount = subs.filter((s) => (s.final_score ?? s.ai_suggested_score ?? 100) < 100).length;
    const qs2 = V2_QUESTIONS.filter((q) => ["KP-TY", "KP-BZ"].includes(q.kp_code));
    const pack = {
      pack_id: nextId2("pack"),
      top_errors: qs2.slice(0, 3).map((q, i) => ({
        question: q,
        error_rate: [0.4, 0.33, 0.19][i],
        wrong_students: subs.filter((s) => s.objective.correct <= i).slice(0, 6).map((s) => s.student.name),
        tag: ["\u6982\u5FF5\u6DF7\u6DC6 \xB7 \u5FFD\u7565\u5B9A\u4E49\u6761\u4EF6", "\u8FD0\u7B97\u5931\u8BEF \xB7 \u5E73\u65B9\u5316\u7B80\u8DF3\u6B65", "\u5BA1\u9898\u9057\u6F0F \xB7 \u7126\u70B9\u4F4D\u7F6E\u5224\u65AD"][i]
      })),
      variant_pick: V2_QUESTIONS.filter((q) => ["q-e-01", "q-e-07", "q-e-08"].includes(q.question_id))
    };
    reviewPacks.set(pack.pack_id, pack);
    assign.status = "reviewed";
    ok2(res, { pack, wrong_count: wrongCount });
    return true;
  }
  if (method === "GET" && seg[1] === "review-packs" && seg[2]) {
    const pack = reviewPacks.get(seg[2]);
    if (!pack) {
      fail2(res, 404, 40400, "\u8BB2\u8BC4\u6750\u6599\u4E0D\u5B58\u5728");
      return true;
    }
    ok2(res, pack);
    return true;
  }
  if (method === "POST" && url === "/teacher-v2/classroom/sessions") {
    const classId = body.class_id || "cls-g2-3";
    const roster = rosterOf(classId);
    const session = {
      session_id: nextId2("cs"),
      class_id: classId,
      class_name: classOf(classId).class_name,
      topic: body.topic || "\u692D\u5706\u7684\u6807\u51C6\u65B9\u7A0B\uFF08\u65B0\u6388\uFF09",
      status: "open",
      started_at: iso3(),
      roster: roster.map((name, i) => ({ user_id: `stu-${i + 1}`, name, picked: false })),
      questions: V2_QUESTIONS.filter((q) => ["q-e-01", "q-e-02", "q-e-08"].includes(q.question_id)).map((q) => ({
        question_id: q.question_id,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        kp_name: q.kp_name,
        sent_at: null,
        status: "pending",
        stats: { total: roster.length, answered: 0, distribution: {}, correct_rate: 0, error_cluster: [] }
      })),
      active_question_id: null
    };
    sessions2.set(session.session_id, session);
    ok2(res, session);
    return true;
  }
  if (method === "GET" && seg[1] === "classroom" && seg[2] === "sessions" && seg[3] && !seg[4]) {
    const session = sessions2.get(seg[3]);
    if (!session) {
      fail2(res, 404, 40400, "\u8BFE\u5802\u4E0D\u5B58\u5728");
      return true;
    }
    ok2(res, session);
    return true;
  }
  if (method === "POST" && seg[1] === "classroom" && seg[2] === "sessions" && seg[3] && seg[4] === "questions") {
    const session = sessions2.get(seg[3]);
    if (!session) {
      fail2(res, 404, 40400, "\u8BFE\u5802\u4E0D\u5B58\u5728");
      return true;
    }
    const q = session.questions.find((x) => x.question_id === body.question_id);
    if (!q) {
      fail2(res, 404, 40400, "\u9898\u76EE\u4E0D\u5728\u672C\u8BFE\u9898\u5355");
      return true;
    }
    q.sent_at = iso3();
    q.status = "collecting";
    q.stats = { total: session.roster.length, answered: 0, distribution: {}, correct_rate: 0, error_cluster: [] };
    session.active_question_id = q.question_id;
    session.status = "questioning";
    ok2(res, session);
    return true;
  }
  if (method === "POST" && seg[1] === "classroom" && seg[2] === "sessions" && seg[3] && seg[4] === "close-question") {
    const session = sessions2.get(seg[3]);
    if (!session) {
      fail2(res, 404, 40400, "\u8BFE\u5802\u4E0D\u5B58\u5728");
      return true;
    }
    const q = session.questions.find((x) => x.question_id === (body.question_id || session.active_question_id));
    if (q) {
      q.status = "closed";
      q.stats.answered = q.stats.total;
    }
    session.status = "reviewing";
    ok2(res, session);
    return true;
  }
  if (method === "POST" && seg[1] === "classroom" && seg[2] === "sessions" && seg[3] && seg[4] === "close") {
    const session = sessions2.get(seg[3]);
    if (!session) {
      fail2(res, 404, 40400, "\u8BFE\u5802\u4E0D\u5B58\u5728");
      return true;
    }
    session.status = "closed";
    ok2(res, session);
    return true;
  }
  if (method === "GET" && seg[1] === "classroom" && seg[2] === "sessions" && seg[3] && seg[4] === "stats") {
    const session = sessions2.get(seg[3]);
    if (!session) {
      fail2(res, 404, 40400, "\u8BFE\u5802\u4E0D\u5B58\u5728");
      return true;
    }
    const q = session.questions.find((x) => x.question_id === (qs.get("question_id") || session.active_question_id));
    if (!q) {
      fail2(res, 404, 40400, "\u5F53\u524D\u65E0\u8FDB\u884C\u4E2D\u7684\u9898\u76EE");
      return true;
    }
    startSse(res);
    const rand = seededRandom(q.question_id.split("-").reduce((s, p) => s + p.charCodeAt(0), 0));
    const batch = Math.max(3, Math.round(q.stats.total / 12));
    const opts = q.options ? ["A", "B", "C", "D"] : ["\u5BF9", "\u9519"];
    const correctIdx = q.options ? opts.indexOf(q.answer) : 0;
    const errRate = 0.4;
    const timers = [];
    const tick = () => {
      if (res.writableEnded) return;
      const remaining = q.stats.total - q.stats.answered;
      if (remaining <= 0) {
        sendSse(res, "stats", { ...q.stats, finished: true });
        sendSse(res, "done", { question_id: q.question_id });
        res.end();
        return;
      }
      const add = Math.min(remaining, batch + Math.round(rand() * 4));
      for (let i = 0; i < add; i++) {
        const pickOpt = rand() > errRate ? opts[correctIdx] : opts[Math.floor(rand() * opts.length)];
        q.stats.distribution[pickOpt] = (q.stats.distribution[pickOpt] || 0) + 1;
      }
      q.stats.answered += add;
      const totalAns = Object.values(q.stats.distribution).reduce((s, v) => s + (Number(v) || 0), 0);
      q.stats.correct_rate = totalAns ? (Number(q.stats.distribution[opts[correctIdx]]) || 0) / totalAns : 0;
      q.stats.error_cluster = opts.filter((o) => o !== opts[correctIdx] && q.stats.distribution[o]).map((o) => ({ option: o, count: q.stats.distribution[o], tag: o === opts[1] ? "\u6982\u5FF5\u6DF7\u6DC6 \xB7 \u5FFD\u7565\u5B9A\u4E49\u6761\u4EF6" : "\u5BA1\u9898\u9057\u6F0F / \u8FD0\u7B97\u5931\u8BEF" }));
      sendSse(res, "stats", { ...q.stats, finished: q.stats.answered >= q.stats.total });
      timers.push(setTimeout(tick, 1300));
    };
    timers.push(setTimeout(tick, 500));
    req.on("close", () => timers.forEach(clearTimeout));
    return true;
  }
  if (method === "POST" && seg[1] === "classroom" && seg[2] === "sessions" && seg[3] && seg[4] === "pick") {
    const session = sessions2.get(seg[3]);
    if (!session) {
      fail2(res, 404, 40400, "\u8BFE\u5802\u4E0D\u5B58\u5728");
      return true;
    }
    const pool = session.roster.filter((r) => !r.picked);
    if (!pool.length) {
      session.roster.forEach((r) => {
        r.picked = false;
      });
      ok2(res, { student: null, remaining: session.roster.length, reset: true });
      return true;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    pick.picked = true;
    ok2(res, { student: { user_id: pick.user_id, name: pick.name }, remaining: pool.length - 1 });
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/insights/overview") {
    const classId = qs.get("class_id") || "cls-g2-3";
    const base = V2_INSIGHTS[classId];
    if (!base) {
      fail2(res, 404, 40400, "\u73ED\u7EA7\u4E0D\u5B58\u5728");
      return true;
    }
    const teacher = teacherTags.get(classId) || [];
    const cls = classOf(classId);
    const clusters = [...base.error_clusters];
    for (const t of teacher) {
      const hit = clusters.find((c) => c.tag.includes(t.tag) || t.tag.includes(c.tag.split(" \xB7 ")[1] || ""));
      if (hit) {
        hit.count += t.count;
        hit.ratio = Math.min(1, hit.ratio + t.count / cls.student_count);
      } else clusters.unshift({ tag: t.tag, ratio: t.count / cls.student_count, count: t.count, kp_name: t.kp_name, kp_code: t.kp_code, example_question_id: "q-e-07" });
    }
    clusters.sort((a, b) => b.count - a.count);
    ok2(res, { class_id: classId, class_name: cls.class_name, student_count: cls.student_count, ...base, error_clusters: clusters });
    return true;
  }
  if (method === "GET" && seg[1] === "insights" && seg[2] === "kp" && seg[3]) {
    const classId = qs.get("class_id") || "cls-g2-3";
    const base = V2_INSIGHTS[classId];
    const cell = base?.heatmap.find((h) => h.kp_code === seg[3]);
    if (!cell) {
      fail2(res, 404, 40400, "\u77E5\u8BC6\u70B9\u4E0D\u5B58\u5728");
      return true;
    }
    const q = [...questionBank, ...schoolQuestions].find((x) => x.kp_code === seg[3]);
    ok2(res, {
      kp_code: cell.kp_code,
      kp_name: cell.kp_name,
      error_rate: cell.error_rate,
      sample: cell.sample,
      trend: [-0.06, -0.02, 0.01, -0.03, 0.02, 0].map((d, i) => ({ date: `08-${18 + i * 3}`, error_rate: Math.max(0.05, cell.error_rate + d) })),
      error_breakdown: (base.error_clusters.filter((c) => c.kp_code === seg[3]).length ? base.error_clusters.filter((c) => c.kp_code === seg[3]) : [{ tag: "\u7EFC\u5408\u9519\u56E0", count: Math.round(cell.error_rate * cell.sample) }]).map((c) => ({ tag: c.tag, count: c.count })),
      typical_question: q,
      wrong_students_sample: base.tier_lists[0]?.students.slice(0, 8) || []
    });
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/resources") {
    ok2(res, { tree: V2_TEXTBOOK_TREE, items: V2_RESOURCES });
    return true;
  }
  if (method === "POST" && url === "/teacher-v2/resources/upload") {
    const fileName = body.file_name || "\u6559\u7814\u7EC4\u692D\u5706\u4E60\u9898\u96C6.pdf";
    const task = createTask("resources.ingest", `\u6444\u53D6 ${fileName}`, null, () => {
      if (!candidates.length) candidates = clone(V2_CANDIDATES).map((c) => ({ ...c, status: "pending" }));
    });
    ok2(res, { task_id: task.task_id });
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/resources/candidates") {
    ok2(res, { items: candidates, ingest_task_id: null });
    return true;
  }
  if (method === "POST" && seg[1] === "resources" && seg[2] === "candidates" && seg[3] && (seg[4] === "approve" || seg[4] === "reject")) {
    const cand = candidates.find((c) => c.candidate_id === seg[3]);
    if (!cand) {
      fail2(res, 404, 40400, "\u5019\u9009\u4E0D\u5B58\u5728\uFF08\u8BF7\u5148\u4E0A\u4F20\u6587\u4EF6\u5B8C\u6210\u6444\u53D6\uFF09");
      return true;
    }
    cand.status = seg[4] === "approve" ? "approved" : "rejected";
    if (seg[4] === "approve" && !schoolQuestions.some((q) => q.question_id === cand.suggested.question_id)) {
      schoolQuestions.push(clone(cand.suggested));
    }
    ok2(res, cand);
    return true;
  }
  if (method === "GET" && url === "/teacher-v2/tasks") {
    const items = [...tasks2.values()].map(taskView).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 20);
    ok2(res, { items, running: items.filter((t) => t.status === "queued" || t.status === "running").length });
    return true;
  }
  if (method === "GET" && seg[1] === "tasks" && seg[2]) {
    const t = tasks2.get(seg[2]);
    if (!t) {
      fail2(res, 404, 40400, "\u4EFB\u52A1\u4E0D\u5B58\u5728");
      return true;
    }
    ok2(res, taskView(t));
    return true;
  }
  if (method === "POST" && url === "/teacher-v2/butler/chat") {
    const text = String(body.message || "");
    const scene = body.scene || "teacher.v2.today";
    startSse(res);
    const timers = [];
    let acc = 80;
    const push = (event, data, delay = 140) => {
      timers.push(setTimeout(() => sendSse(res, event, data), acc));
      acc += delay;
    };
    push("meta", { msg_id: nextId2("bm"), scene });
    const streamText = (s) => {
      for (let p = 0; p < s.length; p += 10) push("token", { text: s.slice(p, p + 10) }, 60);
    };
    if (text.includes("\u8BFE\u4EF6")) {
      const plan = [...plans.values()].find((p) => p.status === "confirmed") || plans.get("plan-ellipse-001");
      const deck = buildDeckFromPlan(plan, "math-theorem-dark");
      decks.set(deck.deck_id, deck);
      const task = createTask("slides.generate", `\u751F\u6210\u8BFE\u4EF6 \xB7 ${plan.topic}`);
      streamText(`\u597D\u7684\uFF0C\u6211\u57FA\u4E8E\u5DF2\u5B9A\u7A3F\u7684\u6559\u6848\u300A${plan.topic}\u300B\u76F4\u63A5\u53D1\u8D77\u8BFE\u4EF6\u751F\u6210\uFF1A\u5927\u7EB2\u6CBF\u7528\u6559\u6848 8 \u4E2A\u73AF\u8282\uFF0C\u4F8B\u9898\u53D6\u81EA\u73ED\u7EA7\u9AD8\u9891\u9519\u9898\u5BF9\u5E94\u77E5\u8BC6\u70B9\u3002\u4EFB\u52A1\u5DF2\u5728\u540E\u53F0\u8FD0\u884C\uFF0C\u5B8C\u6210\u540E\u53EF\u76F4\u63A5\u8FDB\u5165\u8BFE\u4EF6\u5DE5\u574A\u67E5\u770B\u4E0E\u5FAE\u8C03\u3002`);
      push("card", {
        type: "task",
        task_id: task.task_id,
        capability: "slides.generate",
        title: `\u751F\u6210\u8BFE\u4EF6 \xB7 ${plan.topic}`,
        route: "/teacher-v2/slides",
        deck_id: deck.deck_id
      }, 200);
    } else if (text.includes("\u7EC4\u5377") || text.includes("\u53D8\u5F0F")) {
      const paper = composePaper({ kp_codes: ["KP-TY", "KP-BZ"], counts: { choice: 4, fill: 4, solution: 2 }, difficulty_ratio: { basic: 3, medium: 5, hard: 2 }, scene: "quiz", title: "\u692D\u5706\u9519\u56E0\u53D8\u5F0F\u5377" });
      papers.set(paper.paper_id, paper);
      streamText(`\u6536\u5230\u3002\u6211\u6309\u300C\u692D\u5706\u5B9A\u4E49 + \u6807\u51C6\u65B9\u7A0B\u300D\u4E24\u4E2A\u8584\u5F31\u77E5\u8BC6\u70B9\u51FA\u4E86\u4E00\u7EC4\u53D8\u5F0F\u5377\uFF1A8 \u9898\u3001\u96BE\u5EA6 3:5:2\uFF0C\u5BF9\u5E94\u5B66\u60C5\u805A\u7C7B\u524D\u4E24\u4F4D\u9519\u56E0\u3002\u5DF2\u5B58\u5165\u7EC4\u5377\u4E2D\u5FC3\uFF0C\u53EF\u7EE7\u7EED\u8C03\u6574\u6216\u8F6C\u4E3A\u4F5C\u4E1A\u3002`);
      push("card", { type: "paper", paper_id: paper.paper_id, title: paper.title, route: "/teacher-v2/quiz" }, 200);
    } else if (text.includes("\u6279\u6539") || text.includes("\u4F5C\u4E1A")) {
      streamText("\u6628\u665A\u9884\u4E60\u5355 46 \u4EFD\u5DF2\u5168\u90E8 AI \u9884\u6279\uFF0C\u5176\u4E2D 5 \u4EFD\u4F4E\u7F6E\u4FE1\u5EA6\u9700\u8981\u60A8\u590D\u6838\u3002\u5EFA\u8BAE\u5148\u5904\u7406\u4F4E\u7F6E\u4FE1\u5EA6\u961F\u5217\uFF0C\u5E73\u5747\u6BCF\u4EFD 40 \u79D2\uFF1B\u590D\u6838\u65F6\u5982\u53D1\u73B0\u9519\u56E0\u6807\u7B7E\u4E0D\u51C6\uFF0C\u53EF\u76F4\u63A5\u4FEE\u6B63\u2014\u2014\u4FEE\u6B63\u540E\u7684\u6807\u7B7E\u4F1A\u81EA\u52A8\u8FDB\u5165\u5B66\u60C5\u805A\u7C7B\u3002");
      push("card", { type: "route", title: "\u8FDB\u5165\u6279\u6539\u961F\u5217", route: "/teacher-v2/assign", desc: "5 \u4EFD\u5F85\u4EBA\u5DE5\u590D\u6838" }, 200);
    } else {
      streamText("\u6211\u5728\u3002\u5F53\u524D\u4E0A\u4E0B\u6587\uFF1A\u6559\u5E08\u5DE5\u4F5C\u53F0\u3002\u6211\u53EF\u4EE5\uFF1A\u2460 \u628A\u5B9A\u7A3F\u6559\u6848\u76F4\u63A5\u751F\u6210\u8BFE\u4EF6\uFF1B\u2461 \u6309\u9519\u56E0\u805A\u7C7B\u51FA\u53D8\u5F0F\u5377\uFF1B\u2462 \u6C47\u603B\u4ECA\u65E5\u5F85\u529E\u3002\u76F4\u63A5\u8BF4\u300C\u5E2E\u6211\u628A\u5B9A\u7A3F\u6559\u6848\u751F\u6210\u8BFE\u4EF6\u300D\u8BD5\u8BD5\u3002");
      push("card", { type: "route", title: "\u67E5\u770B\u4ECA\u65E5\u5DE5\u4F5C\u53F0", route: "/teacher-v2/today", desc: "\u8BFE\u8868 \xB7 \u5F85\u529E \xB7 \u73ED\u7EA7\u901F\u89C8" }, 200);
    }
    timers.push(setTimeout(() => {
      sendSse(res, "done", { ok: true });
      res.end();
    }, acc + 150));
    req.on("close", () => timers.forEach(clearTimeout));
    return true;
  }
  if (method === "POST" && url === "/teacher-v2/_reset") {
    seed();
    ok2(res, { reset: true });
    return true;
  }
  fail2(res, 404, 40400, `teacher-v2 mock \u672A\u5B9E\u73B0\uFF1A${method} ${url}`);
  return true;
}
seed();

// src/mock/server.js
var conversations = seedConversations.map((c) => ({ ...c }));
var messagesByConv = new Map(Object.entries(seedMessages).map(([id, msgs]) => [id, msgs.map((m) => ({ ...m }))]));
function readBody3(req) {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", (chunk) => {
      buf += chunk;
    });
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve({});
      }
    });
  });
}
function ok3(res, data) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ code: 0, message: "ok", data }));
}
function fail3(res, status, code, message) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ code, message, data: null }));
}
function sendSse2(res, event, data) {
  res.write(`event: ${event}
data: ${JSON.stringify(data)}

`);
}
function buildReply(message = "") {
  const text = String(message || "");
  const has = (...ks) => ks.some((k) => text.includes(k));
  if (has("\u53D8\u5F0F", "\u518D\u6765\u4E00\u7EC4", "\u51FA\u51E0\u9053") || text.includes("\u51FA") && has("\u9898")) {
    return {
      skill: "smart_quiz",
      thinking: "\u6839\u636E\u8BE5\u751F\u8584\u5F31\u70B9\uFF08\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027 12%\uFF09\u51FA 3 \u9053\u96BE\u5EA6\u9012\u8FDB\u7684\u53D8\u5F0F\u9898\uFF0C\u7B2C 1 \u9898\u6362\u6570\u5B57\uFF0C\u7B2C 2 \u9898\u6362\u6761\u4EF6\uFF0C\u7B2C 3 \u9898\u7EFC\u5408\u5E94\u7528\u3002",
      lead: "\u597D\u7684\uFF0C\u56F4\u7ED5**\u5BFC\u6570\u4E0E\u5355\u8C03\u6027**\u7ED9\u4F60\u51FA\u4E00\u7EC4 3 \u9053\u53D8\u5F0F\uFF0C\u96BE\u5EA6\u9012\u8FDB\uFF1A\n\n\u7B2C 1 \u9053\u5148\u70ED\u70ED\u8EAB\uFF08\u6362\u6570\u5B57\uFF09\u{1F447}",
      card: {
        type: "quiz_set",
        chain: "variant",
        chain_id: `chain-${Date.now()}`,
        items: [
          {
            item_no: 1,
            q_type: "choice",
            difficulty: "easy",
            kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
            kp_code: "DR-02",
            variant_note: "\u53D8\u5F0F 1 \xB7 \u6362\u6570\u5B57",
            question_text: "\u51FD\u6570 $f(x)=x^3-3x+1$ \u5728 $[-2,2]$ \u4E0A\u7684\u6700\u5927\u503C\u662F\uFF1F",
            options: ["$3$", "$7$", "$-1$", "$2$"],
            answer: "B",
            answer_analysis: "\u4EE4 $f'(x)=3x^2-3=0$ \u5F97 $x=\\pm1$\u3002$f(-2)=-1$\uFF0C$f(-1)=3$\uFF0C$f(1)=-1$\uFF0C$f(2)=7$\uFF0C\u6545\u6700\u5927\u503C $7$\uFF08\u7AEF\u70B9 $x=2$ \u5FC5\u6BD4\uFF09\u3002"
          },
          {
            item_no: 2,
            q_type: "choice",
            difficulty: "medium",
            kp_name: "\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027",
            kp_code: "DR-02",
            variant_note: "\u53D8\u5F0F 2 \xB7 \u6362\u6761\u4EF6\uFF08\u5F00\u533A\u95F4\uFF09",
            question_text: "\u51FD\u6570 $f(x)=x^3-3x$ \u5728\u5F00\u533A\u95F4 $(-1,3)$ \u4E0A\u7684\u6700\u503C\u60C5\u51B5\u662F\uFF1F",
            options: ["\u6709\u6700\u5927\u503C 18\uFF0C\u65E0\u6700\u5C0F\u503C", "\u65E0\u6700\u5927\u503C\uFF0C\u6709\u6700\u5C0F\u503C -2", "\u6700\u5927\u503C 18\u3001\u6700\u5C0F\u503C -2 \u90FD\u5728", "\u65E0\u6700\u5927\u503C\u4E5F\u65E0\u6700\u5C0F\u503C"],
            answer: "D",
            answer_analysis: "\u5F00\u533A\u95F4\u53D6\u4E0D\u5230\u7AEF\u70B9\u503C $x=3$\uFF0C\u4E14 $f(-1)=2$\u3001$f(1)=-2$ \u4ECD\u5728\u533A\u95F4\u5185\uFF0C\u6545\u6700\u503C\u4E0D\u843D\u5728\u533A\u95F4\u7AEF\u70B9\u4E0A\u2014\u2014\u672C\u9898\u65E2\u65E0\u6700\u5927\u503C\u4E5F\u65E0\u6700\u5C0F\u503C\uFF08\u6781\u503C\u53EA\u662F\u5C40\u90E8\uFF09\u3002"
          },
          {
            item_no: 3,
            q_type: "choice",
            difficulty: "hard",
            kp_name: "\u5BFC\u6570\u4E0E\u4E0D\u7B49\u5F0F\u7EFC\u5408",
            kp_code: "DR-06",
            variant_note: "\u53D8\u5F0F 3 \xB7 \u7EFC\u5408\u5E94\u7528",
            question_text: "\u5DF2\u77E5 $f(x)=x^3-3x$\uFF0C\u82E5\u4E0D\u7B49\u5F0F $f(x) \\le a$ \u5728 $x \\in [-1,3]$ \u6052\u6210\u7ACB\uFF0C\u5219 $a$ \u7684\u6700\u5C0F\u503C\u4E3A\uFF1F",
            options: ["$2$", "$18$", "$-2$", "$0$"],
            answer: "B",
            answer_analysis: "\u6052\u6210\u7ACB \u21D4 $a \\ge f(x)_{max}$\u3002\u7531\u524D\u4E24\u95EE\u77E5\u95ED\u533A\u95F4 $[-1,3]$ \u4E0A\u6700\u5927\u503C\u4E3A $f(3)=18$\uFF0C\u6545 $a$ \u6700\u5C0F\u53D6 $18$\u3002"
          }
        ]
      },
      tail: "\u5168\u90E8\u505A\u5B8C\u6211\u6765\u5E2E\u4F60\u5BF9\u7B54\u6848\uFF0C\u9519\u4E86\u7684\u81EA\u52A8\u8FDB\u9519\u9898\u672C \u{1F4D5}"
    };
  }
  if (has("\u8BB2\u89E3", "\u4E3E\u4E00\u53CD\u4E09", "\u9519\u9898", "\u590D\u4E60", "\u5206\u6790\u6211\u7684\u9519\u9898")) {
    return {
      skill: "socratic_solver",
      thinking: "\u5B9A\u4F4D\u9519\u56E0\uFF1A\u6F0F\u5224\u533A\u95F4\u7AEF\u70B9 x=3\u3002\u91C7\u7528\u82CF\u683C\u62C9\u5E95\u5F0F\u63D0\u95EE\uFF0C\u5148\u786E\u8BA4\u65B9\u6CD5\uFF0C\u518D\u5F15\u5BFC\u4EE3\u5165\u7AEF\u70B9\u6BD4\u8F83\uFF0C\u6700\u540E\u51FA\u53D8\u5F0F\u786E\u8BA4\u638C\u63E1\u3002",
      lead: '\u597D\uFF0C\u6211\u4EEC\u628A\u8FD9\u9898\u5F7B\u5E95\u5F04\u61C2\u3002\n\n\u8FD9\u9053\u9898\u4F60\u9519\u5728 **"\u6F0F\u5224\u533A\u95F4\u7AEF\u70B9 $x=3$"**\u3002\u95ED\u533A\u95F4\u4E0A\u7684\u6781\u503C\u5FC5\u987B**\u540C\u65F6\u6BD4\u8F83\u6781\u503C\u70B9\u548C\u7AEF\u70B9**\u2014\u2014\u53E3\u8BC0 \u2192 *"\u5148\u627E\u5BFC\u96F6\uFF0C\u518D\u4EE3\u7AEF\u70B9\uFF0C\u8C01\u5927\u8C01\u5C0F"*\u3002\n\n\u4F60\u8FD8\u8BB0\u5F97\u6C42\u95ED\u533A\u95F4\u6700\u503C\u7684\u4E09\u4E2A\u6B65\u9AA4\u5417\uFF1F\u5148\u544A\u8BC9\u6211\u4F60\u7684\u601D\u8DEF\uFF0C\u6211\u518D\u5E2E\u4F60\u6838\u5BF9\u3002',
      card: null,
      tail: "\u628A\u8FD9\u4E09\u6B65\u8D70\u901A\u540E\uFF0C\u6211\u518D\u7ED9\u4F60 2-3 \u9053\u53D8\u5F0F\u786E\u8BA4\u4F60\u771F\u7684\u638C\u63E1\u4E86 \u{1F44C}"
    };
  }
  if (has("\u5B66\u60C5", "\u5206\u6790")) {
    return {
      skill: "",
      thinking: "\u6C47\u603B\u672C\u5468\u5B66\u60C5\uFF1A\u7EFC\u5408\u5206 58\u219267\uFF0C\u72EC\u7ACB\u89E3\u9898\u7387 35%\u219252%\uFF0C\u5BFC\u6570\u8584\u5F31\u70B9 12%\u3002",
      lead: "\u672C\u5468\u4F60\u7684\u5B66\u60C5\u5C0F\u7ED3 \u{1F4CA}\uFF1A\n\n\u2022 \u7EFC\u5408\u5206 **58 \u2192 67**\uFF08+9 \u5206\uFF09\uFF0C\u8DDD\u671F\u672B\u76EE\u6807 75 \u8FD8\u5DEE 8 \u5206\n\u2022 \u72EC\u7ACB\u89E3\u9898\u7387 **35% \u2192 52%**\uFF0C\u8D85\u8FC7\u73ED\u7EA7\u5E73\u5747 47%\n\u2022 \u8584\u5F31 Top1\uFF1A**\u5BFC\u6570\u4E0E\u51FD\u6570\u5355\u8C03\u6027\uFF0812%\uFF09**\uFF0C\u672C\u5468\u5EFA\u8BAE\u6BCF\u5929 20 \u5206\u949F\u4E13\u9879\n\u2022 3 \u9053\u9519\u9898\u4ECA\u5929\u5230\u671F\uFF0C\u5EFA\u8BAE\u5148\u53BB\u9519\u9898\u672C\u590D\u4E60\uFF08\u7EA6 15 \u5206\u949F\uFF09\n\n\u8981\u7EE7\u7EED\u7684\u8BDD\uFF0C\u6211\u53EF\u4EE5\u5E26\u4F60\u7EC3\u4E00\u9053\u5BFC\u6570\u7684\u9898\uFF0C\u6216\u8005\u5E2E\u4F60\u5206\u6790\u67D0\u7C7B\u9519\u9898\u3002",
      card: null,
      tail: ""
    };
  }
  return {
    skill: "socratic_solver",
    thinking: "\u95ED\u533A\u95F4\u6700\u503C\u95EE\u9898\uFF1Af(x)=x\xB3-3x\uFF0C\u5148\u6C42\u5BFC\u627E\u6781\u503C\u70B9\uFF0C\u518D\u4EE3\u5165\u7AEF\u70B9\u6BD4\u8F83\uFF0C\u6700\u540E\u8F93\u51FA\u6700\u5927\u503C\u6700\u5C0F\u503C\u3002",
    lead: "\u5C0F\u5A77\uFF0C\u8FD9\u9053\u9898\u786E\u5B9E\u9700\u8981\u4E00\u6B65\u6B65\u60F3\u6E05\u695A\u3002\n\n\u6211\u4EEC\u5148\u770B\u9898\u76EE\u8981\u6C42\u7684\u662F\u4EC0\u4E48\u2014\u2014\u5728\u95ED\u533A\u95F4 **$[-1, 3]$** \u4E0A\u627E **$f(x) = x^3 - 3x$** \u7684\u6700\u5927\u503C\u548C\u6700\u5C0F\u503C\u3002\n\n**\u4F60\u8BB0\u5F97\u5417\uFF1F\u6C42\u95ED\u533A\u95F4\u4E0A\u51FD\u6570\u7684\u6700\u503C\uFF0C\u901A\u5E38\u4F1A\u7528\u5230\u4EC0\u4E48\u65B9\u6CD5\uFF1F**",
    card: null,
    tail: "\u60F3\u6E05\u695A\u8FD9\u4E09\u6B65\u540E\u544A\u8BC9\u6211\uFF0C\u6211\u5E2E\u4F60\u6838\u5BF9\u4E0B\u4E00\u6B65\uFF0C\u518D\u7ED9\u4F60\u53D8\u5F0F\u5DE9\u56FA\u3002",
    figures: [
      {
        step_no: 1,
        caption: "\u5148\u89C2\u5BDF\u8FD9\u6761\u629B\u7269\u7EBF\u7684\u5F62\u72B6\uFF0C\u627E\u627E\u5B83\u4E0E x \u8F74\u7684\u4EA4\u70B9",
        frames: parabolaFrames()
      }
    ]
  };
}
function svgDataUri(svg) {
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf-8").toString("base64");
}
function parabolaFrames() {
  const body = (dots) => `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="330" viewBox="0 0 460 330">
  <rect width="460" height="330" fill="#ffffff"/>
  <line x1="46" y1="169" x2="446" y2="169" stroke="#222222" stroke-width="1.3"/>
  <line x1="146" y1="16" x2="146" y2="296" stroke="#222222" stroke-width="1.3"/>
  <text x="452" y="161" font-size="13" font-style="italic" font-family="Georgia" text-anchor="start">x</text>
  <text x="158" y="12" font-size="13" font-style="italic" font-family="Georgia">y</text>
  <text x="136" y="184" font-size="11" font-family="Georgia" text-anchor="middle">O</text>
  <path d="M146 169 Q246 373 346 169" fill="none" stroke="#1a5fb4" stroke-width="1.9"/>
  ${dots}
</svg>`;
  return [
    { data_uri: svgDataUri(body("")), label: "\u5750\u6807\u7CFB\u4E0E\u66F2\u7EBF" },
    {
      data_uri: svgDataUri(
        body(
          '<circle cx="146" cy="169" r="3.5" fill="#c01c28" stroke="#ffffff"/><text x="154" y="165" font-size="12" fill="#c01c28" font-family="Georgia">(-1,0)</text><circle cx="346" cy="169" r="3.5" fill="#c01c28" stroke="#ffffff"/><text x="354" y="165" font-size="12" fill="#c01c28" font-family="Georgia">(3,0)</text><circle cx="246" cy="271" r="3.5" fill="#c01c28" stroke="#ffffff"/><text x="254" y="284" font-size="12" fill="#c01c28" font-family="Georgia">(1,-4)</text>'
        )
      ),
      label: "\u6807\u6CE8\u5173\u952E\u70B9"
    }
  ];
}
function streamReply(res, reply, { onDone } = {}) {
  const msgId = `msg_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const steps = [
    { stage: "solving", text: "\u6B63\u5728\u7406\u89E3\u9898\u610F\u2026" },
    { stage: "guiding", text: "\u5B9A\u4F4D\u4F60\u7684\u8584\u5F31\u70B9\uFF08\u5BFC\u6570 12%\uFF09\u2026" }
  ];
  let i = 0;
  let timers = [];
  const clear = () => {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  };
  const push = (event, data, delay) => {
    timers.push(setTimeout(() => sendSse2(res, event, data), delay));
  };
  push("meta", { msg_id: msgId, skill: reply.skill, confidence: reply.skill === "smart_quiz" ? 0.9 : 0.95 }, 40);
  steps.forEach((s, si) => push("status", s, 120 + si * 120));
  if (reply.thinking) {
    const tk = reply.thinking.slice(0, 40);
    push("thinking", { text: tk }, 360);
  }
  const lead = reply.lead;
  let offset = 480;
  const chunkSize = 8;
  for (let p = 0; p < lead.length; p += chunkSize) {
    push("token", { text: lead.slice(p, p + chunkSize) }, offset);
    offset += 22;
  }
  let figDelay = offset + 60;
  for (const fig of reply.figures || []) {
    push("figure", fig, figDelay);
    figDelay += 180;
  }
  if (reply.card) {
    push("card", reply.card, figDelay + 60);
  }
  if (reply.tail) {
    let t = figDelay + 180;
    for (let p = 0; p < reply.tail.length; p += chunkSize) {
      push("token", { text: reply.tail.slice(p, p + chunkSize) }, t);
      t += 20;
    }
  }
  const endDelay = figDelay + 200 + (reply.card ? 200 : 0) + (reply.tail ? Math.ceil(reply.tail.length / 8) * 20 : 0);
  push("done", {
    message_id: msgId,
    title: lead.replace(/[#*$]/g, "").slice(0, 16) || "\u65B0\u5BF9\u8BDD",
    usage: { tokens_in: 320, tokens_out: lead.length + (reply.tail || "").length },
    latency_ms: 4200,
    meta: { skill: reply.skill, confidence: 0.95 }
  }, endDelay);
  return { clear, msgId };
}
function mockApi(req, res, next) {
  const url = req.url.split("?")[0];
  const qs = new URLSearchParams(req.url.split("?")[1] || "");
  const method = req.method;
  const seg = url.split("/").filter(Boolean);
  const json = async (fn) => {
    const body = await readBody3(req);
    return fn(body);
  };
  const route = async () => {
    const cookie = req.headers?.cookie || "";
    const cookieValue = (name) => cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || "";
    const mockRole = cookieValue("ma_mock_role") || "student";
    const mockState = cookieValue("ma_mock_state") || "approved";
    const mockDual = cookieValue("ma_mock_dual") === "1";
    const supportedRoles = ["student", "teacher", "researcher", "admin"];
    const professionalRoles = ["teacher", "researcher"];
    const tokenFor = (role) => role === "student" ? "mock-token-preview" : `mock-token-${role}-preview`;
    const statusFor = () => "authenticated";
    const identityFor = (requestedRole, state = mockState) => {
      const role = supportedRoles.includes(requestedRole) ? requestedRole : "student";
      const identityStatus = statusFor(role, state);
      const isProfessionalPending = false;
      const activeRole = role;
      const approvedRole = { role: activeRole, status: "approved", verified: true };
      const user = activeRole === "student" ? {
        id: isProfessionalPending ? `mock-${role}-applicant` : "mock-student",
        ...MOCK_USER,
        status: "active",
        onboarding_status: "completed",
        roles: [approvedRole, ...isProfessionalPending ? [{ role, status: state, verified: false }] : mockDual ? [{ role: "teacher", status: "approved", verified: true }] : []],
        active_role: "student",
        grade: MOCK_USER.grade || ""
      } : {
        id: `mock-${role}`,
        nickname: role === "teacher" ? "\u674E\u8001\u5E08" : role === "researcher" ? "\u9648\u7814\u7A76\u5458" : "\u7BA1\u7406\u5458",
        status: "active",
        onboarding_status: "completed",
        roles: [approvedRole],
        active_role: activeRole,
        grade: ""
      };
      return { user, identity_status: identityStatus, ...isProfessionalPending ? { pending_role: role } : {} };
    };
    const sessionResponse = (requestedRole, state = mockState, onboardingRequired = false) => {
      const identity = identityFor(requestedRole, state);
      return { access_token: tokenFor(identity.user.active_role), expires_in: 900, onboarding_required: onboardingRequired, ...identity };
    };
    const persistMockIdentity = (role, state) => {
      res.setHeader("Set-Cookie", [
        `ma_mock_role=${role}; Path=/; SameSite=Lax`,
        `ma_mock_state=${state}; Path=/; SameSite=Lax`
      ]);
    };
    const mockIdentity = identityFor(mockRole);
    if (method === "POST" && url === "/auth/token/refresh") return ok3(res, { access_token: tokenFor(mockIdentity.user.active_role), expires_in: 900 });
    if (method === "GET" && url === "/auth/me") {
      const authz = req.headers?.authorization || "";
      const tokenRole = ["admin", "researcher", "teacher"].find((role) => authz.includes(`mock-token-${role}-preview`));
      const identity = identityFor(tokenRole || mockRole);
      return ok3(res, { ...identity.user, identity_status: identity.identity_status, ...identity.pending_role ? { pending_role: identity.pending_role } : {} });
    }
    if (method === "POST" && url === "/auth/challenges/sms") return ok3(res, { challenge_id: "mock-challenge", expires_in: 300, retry_after: 1, demo_code: "123456" });
    if (method === "POST" && url === "/auth/register/sms") return json((b) => {
      const role = b.role || mockRole;
      const state = "approved";
      persistMockIdentity(role, state);
      return ok3(res, sessionResponse(role, state, role === "student"));
    });
    if (method === "POST" && url === "/auth/login/sms") return json((b) => {
      const role = b.preferred_role || mockRole;
      persistMockIdentity(role, mockState);
      return ok3(res, sessionResponse(role));
    });
    if (method === "POST" && url === "/auth/login/password") return json((b) => {
      const role = b.preferred_role || mockRole;
      persistMockIdentity(role, mockState);
      return ok3(res, sessionResponse(role));
    });
    if (method === "POST" && url === "/identity/onboarding/student") return ok3(res, { onboarding_required: false });
    if (method === "POST" && url === "/identity/role-applications") return json((b) => ok3(res, { id: "mock-application", role: b.role, status: "pending" }));
    if (method === "GET" && url === "/identity/role-applications/current") return ok3(res, [{ id: "mock-application", role: "teacher", status: "pending", organization_name: "\u793A\u4F8B\u4E2D\u5B66" }]);
    if (method === "POST" && url === "/auth/reauth") return ok3(res, { reauthenticated: true, valid_for: 600 });
    if (method === "POST" && url === "/auth/password/reset") return ok3(res, { password_reset: true });
    if (method === "POST" && url === "/auth/role/switch") return json((b) => {
      const role = supportedRoles.includes(b.role) ? b.role : mockRole;
      persistMockIdentity(role, "approved");
      return ok3(res, sessionResponse(role, "approved"));
    });
    if (method === "GET" && url === "/auth/sessions") return ok3(res, [
      { id: "current-session", device_name: "Chrome \xB7 Windows", current: true, revoked: false, last_seen_at: "\u521A\u521A" },
      { id: "other-session", device_name: "Firefox \xB7 macOS", current: false, revoked: false, last_seen_at: "\u6628\u5929" }
    ]);
    if (method === "DELETE" && url === "/auth/sessions/other-session") return ok3(res, { revoked: true });
    if (method === "POST" && url === "/auth/logout-all") return ok3(res, { logged_out: true });
    if (method === "POST" && url === "/identity/phone/change") return ok3(res, { phone: "13900000000", sessions_revoked: true });
    if (method === "POST" && url === "/identity/account/deletion") return ok3(res, { status: "cooling_off", execute_after: "2026-08-29T00:00:00Z" });
    if (method === "GET" && url === "/identity/account/deletion") return ok3(res, null);
    if (method === "POST" && url === "/identity/account/deletion/cancel") return ok3(res, { status: "cancelled" });
    if (method === "GET" && url === "/admin/identity/applications") return ok3(res, [
      { id: "teacher-application", role: "teacher", status: "pending", organization_name: "\u793A\u4F8B\u4E2D\u5B66" },
      { id: "researcher-application", role: "researcher", status: "pending", organization_name: "\u793A\u4F8B\u7814\u7A76\u9662" }
    ]);
    if (method === "POST" && /^\/admin\/identity\/applications\/[^/]+\/(approve|reject|request-more-info)$/.test(url)) {
      const status = url.endsWith("/approve") ? "approved" : url.endsWith("/reject") ? "rejected" : "needs_more_info";
      return ok3(res, { status });
    }
    if (method === "POST" && url === "/auth/login") return json((b) => ok3(res, { token: "mock-token-" + Date.now(), user: { ...MOCK_USER } }));
    if (method === "POST" && url === "/auth/login-by-code") return json((b) => ok3(res, { token: "mock-token-" + Date.now(), user: { ...MOCK_USER } }));
    if (method === "POST" && url === "/auth/sms-code") return ok3(res, { sent: true });
    if (method === "GET" && url === "/agent/conversations") {
      let items = [...conversations];
      const q = (qs.get("q") || "").toLowerCase();
      if (q) items = items.filter((c) => (c.title || "").toLowerCase().includes(q));
      items.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
      return ok3(res, { items: items.slice(0, Number(qs.get("limit")) || 30), hasMore: false });
    }
    if (method === "POST" && url === "/agent/conversations") {
      return json((b) => {
        const c = {
          id: `conv_${Date.now()}`,
          title: "\u65B0\u5BF9\u8BDD",
          workspace: b.workspace || "student",
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString(),
          message_count: 0,
          pinned: false
        };
        conversations.unshift(c);
        messagesByConv.set(c.id, []);
        return ok3(res, c);
      });
    }
    if (method === "DELETE" && seg[0] === "agent" && seg[1] === "conversations" && seg[2]) {
      const id = seg[2];
      const i = conversations.findIndex((c) => c.id === id);
      if (i >= 0) conversations.splice(i, 1);
      messagesByConv.delete(id);
      return ok3(res, { deleted: true });
    }
    if (method === "PATCH" && seg[0] === "agent" && seg[1] === "conversations" && seg[2]) {
      return json((b) => {
        const c = conversations.find((x) => x.id === seg[2]);
        if (!c) return fail3(res, 404, 404, "\u4F1A\u8BDD\u4E0D\u5B58\u5728");
        if (b.title !== void 0) c.title = b.title;
        if (b.pinned !== void 0) c.pinned = !!b.pinned;
        return ok3(res, { ...c });
      });
    }
    if (method === "GET" && seg[0] === "agent" && seg[1] === "conversations" && seg[2] && seg[3] === "messages") {
      const id = seg[2];
      let items = messagesByConv.get(id) || [];
      const before = qs.get("before") || "";
      if (before) items = items.filter((m) => m.id !== before && String(m.id).localeCompare(before) < 0);
      const limit = Number(qs.get("limit")) || 20;
      const tail = items.slice(-limit);
      return ok3(res, { items: tail, hasMore: items.length > limit });
    }
    if (method === "POST" && url === "/agent/feedback") return json(() => ok3(res, { ok: true }));
    if (method === "POST" && url === "/agent/chat/stop") return ok3(res, { stopped: true });
    if (method === "POST" && seg[0] === "agent" && seg[1] === "messages" && seg[2] === "activate") return ok3(res, { ok: true });
    if (method === "GET" && url === "/agent/memories") return ok3(res, { items: [] });
    if (method === "DELETE" && seg[0] === "agent" && seg[1] === "memories") return ok3(res, { deleted: true });
    if (method === "POST" && ["/agent/chat", "/agent/chat/regenerate", "/agent/chat/edit"].includes(url)) {
      return json((b) => {
        const message = b.message || (b.message_id ? "\u91CD\u65B0\u751F\u6210\u8BE5\u56DE\u590D" : "\u8BF7\u5E2E\u6211\u590D\u4E60\u8FD9\u9053\u9898");
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no"
        });
        res.write("retry: 3000\n\n");
        const reply = buildReply(message);
        const { clear } = streamReply(res, reply, {});
        const convId = b.conversation_id;
        const cmid = b.context?.client_msg_id || `cm_${Date.now()}`;
        if (convId && messagesByConv.has(convId)) {
          const list = messagesByConv.get(convId);
          const ts = (/* @__PURE__ */ new Date()).toISOString();
          const c = conversations.find((x) => x.id === convId);
          if (c) {
            c.updated_at = ts;
            c.title = c.title === "\u65B0\u5BF9\u8BDD" ? reply.lead.replace(/[#*$]/g, "").slice(0, 12) : c.title;
          }
          list.push({
            id: `um_${Date.now()}`,
            role: "user",
            clientMsgId: cmid,
            createdAt: ts,
            envelope: { msg_id: `um_${Date.now()}`, meta: {}, blocks: [{ type: "markdown", content: message }] }
          });
          list.push({
            id: `am_${Date.now()}`,
            role: "assistant",
            clientMsgId: cmid,
            createdAt: ts,
            envelope: {
              msg_id: `am_${Date.now()}`,
              meta: { skill: reply.skill, confidence: 0.95 },
              blocks: [
                { type: "markdown", content: reply.lead + (reply.tail ? "\n\n" + reply.tail : "") },
                // F13：figure block 持久化（历史回显还原图形卡）
                ...(reply.figures || []).map((f) => ({ type: "figure", ...f }))
              ]
            }
          });
        }
        req.on("close", clear);
      });
    }
    if (method === "POST" && url === "/files/upload") {
      return json((b) => {
        const fid = `file_${Date.now()}`;
        return ok3(res, { file_id: fid, upload_url: `/api/_mock_put/${fid}`, upload_id: "", deduplicated: false, expires_at: new Date(Date.now() + 36e5).toISOString() });
      });
    }
    if (method === "PUT" && seg[0] === "_mock_put") {
      res.statusCode = 200;
      return res.end();
    }
    if (method === "POST" && seg[0] === "files" && seg[2] === "complete") return ok3(res, { ok: true });
    if (method === "POST" && seg[0] === "files" && seg[2] === "parse") return ok3(res, { ok: true, parse_engine: "mock" });
    if (method === "GET" && seg[0] === "files" && seg[1]) {
      return ok3(res, { file_id: seg[1], status: "parsed", parse_engine: "mock", assets: [], content_text: "\uFF08\u6A21\u62DF\u89E3\u6790\u5185\u5BB9\uFF1A\u8FD9\u662F\u4E00\u9053\u5173\u4E8E\u5BFC\u6570\u4E0E\u5355\u8C03\u6027\u7684\u9898\u76EE\u2026\uFF09" });
    }
    if (method === "GET" && seg[0] === "files" && seg[1] && seg[2] === "assets" && seg[4] === "url") return ok3(res, { url: "" });
    if (method === "GET" && seg[0] === "files" && seg[1] && seg[2] === "content") return ok3(res, { url: "", text: "" });
    if (method === "POST" && url === "/agent/speech/asr-token") return ok3(res, { token: "mock", expire_time: 3600 });
    if (method === "POST" && url === "/agent/speech/to-latex") {
      return json((b) => ok3(res, { latex: "x^2", normalized_text: b.asr_text || "x\u7684\u5E73\u65B9", ambiguous: false }));
    }
    if (method === "GET" && url === "/student/error-records/review-plan") return ok3(res, reviewPlan);
    if (method === "POST" && url === "/student/learning-events") return ok3(res, { accepted: true });
    if (method === "GET" && url === "/student/streak") return ok3(res, { days: 7 });
    if (method === "GET" && url === "/student/mastery/summary") return ok3(res, masterySummary);
    if (method === "GET" && url === "/student/mastery/trend") return ok3(res, { items: [{ date: "2026-08-01", score: 58 }, { date: "2026-08-07", score: 67 }] });
    if (method === "GET" && url === "/student/mastery/today-actions") return ok3(res, { items: [] });
    if (method === "GET" && url === "/student/lab/recommend") return ok3(res, labRecommend);
    if (method === "GET" && url === "/student/knowledge-graph") return ok3(res, knowledgeGraph);
    if (method === "GET" && url === "/student/practice/daily") return ok3(res, { items: [] });
    if (method === "GET" && url === "/student/error-records") return ok3(res, { items: [] });
    if (method === "POST" && seg[0] === "student" && seg[1] === "error-records" && seg[2] && seg[3] === "review") return ok3(res, { graduated: false, next_review: "2026-08-14" });
    if (method === "POST" && url === "/student/exam/generate") return ok3(res, { exam_id: "exam_" + Date.now() });
    if (method === "POST" && seg[0] === "student" && seg[1] === "error-records" && seg[2] && seg[3] === "figure") return ok3(res, { ggb: mockGgb, generated: true });
    if (method === "POST" && url === "/figures/ggb") return ok3(res, { ggb: mockGgb });
    if (method === "GET" && url === "/student/growth/overview") return ok3(res, growthOverview);
    if (method === "GET" && url === "/student/growth/panel") return ok3(res, growthPanel);
    if (method === "GET" && url === "/student/growth/loop-progress") return ok3(res, loopProgress);
    if (method === "GET" && url === "/student/growth/today-3") return ok3(res, today3);
    if (method === "GET" && url === "/student/growth/score-trend") return ok3(res, scoreTrend);
    if (method === "GET" && url === "/student/growth/feature-entries") return ok3(res, featureEntries);
    if (method === "POST" && url === "/agent/route-intent") {
      return json((b) => {
        const text = String(b.text || "");
        const hit = routeIntentReply.rules.find((r) => r.keywords.some((k) => text.includes(k)));
        if (!hit) return ok3(res, { ...routeIntentReply.miss });
        const { keywords, ...rest } = hit;
        return ok3(res, { matched: true, ...rest });
      });
    }
    if (method === "GET" && url === "/student/practice/group-recommend") return ok3(res, practiceGroupRecommend);
    if (method === "GET" && url === "/student/practice/difficulty-mix") return ok3(res, difficultyMix);
    if (method === "GET" && url === "/student/practice/smart-score") return ok3(res, smartScore);
    if (method === "GET" && url === "/student/practice/summary") return ok3(res, practiceSummary);
    if (method === "GET" && url === "/student/error-records/memory-heatmap") return ok3(res, memoryHeatmap);
    if (method === "GET" && url === "/student/error-records/due-queue") return ok3(res, dueQueue);
    if (method === "GET" && url === "/student/error-records/filter") return ok3(res, errorFilter);
    if (method === "GET" && seg[0] === "student" && seg[1] === "error-records" && seg[2] && seg[3] === "detail") return ok3(res, { ...errorDetailExt, record_id: seg[2] });
    if (method === "GET" && url === "/student/report/highlights") return ok3(res, reportHighlights);
    if (method === "GET" && url === "/student/report/weak-points") return ok3(res, reportWeakPoints);
    if (method === "GET" && url === "/student/report/mastery-trend-forecast") return ok3(res, masteryTrendForecast);
    if (method === "GET" && url === "/student/report/error-distribution") return ok3(res, errorDistribution);
    if (method === "GET" && url === "/student/report/honesty") return ok3(res, reportHonesty);
    if (method === "GET" && url === "/student/knowledge-graph/pie") return ok3(res, kgPie);
    if (method === "GET" && url === "/student/knowledge-graph/tree") return ok3(res, kgTree);
    if (method === "GET" && seg[0] === "student" && seg[1] === "knowledge-graph" && seg[2] === "nodes" && seg[3] && seg[4] === "deps") return ok3(res, { ...kgNodeDeps, kp_code: seg[3] });
    if (method === "GET" && seg[0] === "student" && seg[1] === "knowledge-graph" && seg[2] === "nodes" && seg[3] && seg[4] === "recommend") return ok3(res, kgNodeRecommend);
    if (method === "GET" && seg[0] === "classes" && seg[1] && seg[2] === "feed") return ok3(res, classFeed);
    if (method === "GET" && seg[0] === "classes" && seg[1] && seg[2] === "hot-errors") return ok3(res, classHotErrors);
    if (method === "GET" && url === "/student/resources/recommend") return ok3(res, resourceRecommend);
    if (method === "GET" && url === "/student/assignments") return ok3(res, assignmentsList);
    return fail3(res, 404, 404, `mock \u672A\u5B9E\u73B0\uFF1A${method} ${url}`);
  };
  handleTeacherApi(req, res).then((handled) => {
    if (handled) return;
    return handleTeacherV2Api(req, res);
  }).then((handled) => {
    if (handled) return;
    route().catch((e) => fail3(res, 500, 500, e?.message || "mock \u5185\u90E8\u9519\u8BEF"));
  });
}

// vite.config.js
var useMock = !!process.env.VITE_USE_MOCK;
var apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";
var useRealApi = !useMock;
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    useMock && {
      name: "mock-api-server",
      configureServer(server) {
        server.middlewares.use("/api", (req, res, next) => {
          mockApi(req, res, next);
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
  },
  server: {
    // 双师课堂验收契约：主入口必须是 http://127.0.0.1:5176/dual
    // （显式绑定 IPv4，避免 localhost 解析成 ::1 导致 127.0.0.1 无法访问）
    host: "127.0.0.1",
    port: 5176,
    proxy: useRealApi ? { "/api": { target: apiProxyTarget, changeOrigin: true } } : void 0,
    // research-repos 是克隆的参考仓库（工作材料，非本应用源码），不参与 Vite 监听，避免 full-reload 抖动
    watch: { ignored: ["**/research-repos/**", "**/dist/**"] }
  },
  build: {
    chunkSizeWarningLimit: 1600
  }
});
export {
  vite_config_default as default
};
