"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import type { GraphData, GraphNode } from "@/lib/types";

/**
 * 知识图谱：cytoscape 动态渲染（force 布局），节点选中 → 右侧详情。
 * 节点色按掌握度：弱（红-琥珀）→ 强（靛蓝-青）。
 */
function masteryColor(m: number) {
  if (m < 0.4) return "#dc2626";
  if (m < 0.55) return "#f59e0b";
  if (m < 0.7) return "#6366f1";
  return "#06b6d4";
}

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<{ destroy: () => void; on: (e: string, cb: (args: unknown) => void) => void; nodes: () => { json: () => unknown } } | null>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  useEffect(() => {
    fetch(apiUrl("/student/knowledge-graph"))
      .then((r) => r.json())
      .then((d: GraphData) => setData(d));
  }, []);

  useEffect(() => {
    if (!data || !containerRef.current) return;
    let disposed = false;
    (async () => {
      const cytoscape = (await import("cytoscape")).default;
      if (disposed || !containerRef.current) return;
      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...data.nodes.map((n) => ({
            data: { id: n.kp_code, label: n.name, mastery: n.mastery, bg: masteryColor(n.mastery) },
          })),
          ...data.edges.map((e) => ({
            data: { source: e.source, target: e.target, label: e.relation },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "data(bg)",
              color: "#334155",
              "font-size": 11,
              width: 42,
              height: 42,
              "border-width": 2,
              "border-color": "#ffffff",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": "#cbd5e1",
              "target-arrow-color": "#cbd5e1",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              label: "data(label)",
              "font-size": 9,
              color: "#94a3b8",
            },
          },
          {
            selector: "node:selected",
            style: { "border-width": 4, "border-color": "#4f46e5" },
          },
        ],
        layout: { name: "cose", animate: true, padding: 30 },
      });
      cy.on("tap", "node", (args: unknown) => {
        const { target } = args as { target: { data: (k: string) => unknown } };
        setSelected({
          kp_code: String(target.data("id")),
          name: String(target.data("label")),
          mastery: Number(target.data("mastery")),
        });
      });
      cyRef.current = cy as unknown as typeof cyRef.current;
    })();
    return () => {
      disposed = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [data]);

  return (
    <div className="pt-8">
      <h1 className="text-xl font-bold">知识图谱 · 圆锥曲线</h1>
      <p className="mt-1 text-sm text-slate-500">
        节点颜色 = 掌握度（红 → 琥珀 → 靛蓝 → 青），拖拽平移 / 滚轮缩放 / 点节点看详情
      </p>
      <div className="mt-5 flex gap-4">
        <div
          ref={containerRef}
          className="h-[560px] flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-white/90 shadow-sm"
        />
        <aside className="w-72 shrink-0">
          {selected ? (
            <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
              <h2 className="text-[15px] font-semibold">{selected.name}</h2>
              <p className="mt-1 text-xs text-slate-400">{selected.kp_code}</p>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>掌握度</span>
                  <span className="font-medium" style={{ color: masteryColor(selected.mastery) }}>
                    {(selected.mastery * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${selected.mastery * 100}%`, background: masteryColor(selected.mastery) }}
                  />
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-indigo-50/70 p-3 text-sm leading-6 text-slate-600">
                掌握度偏低时，AI 会优先围绕该知识点出题并在对话中引导补弱。
              </div>
              <a
                href="/practice"
                className="bg-brand-gradient mt-4 block rounded-full py-2 text-center text-sm font-medium text-white shadow hover:opacity-90"
              >
                针对它练 3 题 →
              </a>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/60 p-6 text-sm text-slate-400">
              点击任意知识点节点查看掌握度与练习入口
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
