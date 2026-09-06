"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { Pill } from "@/components/ui/ui";
import type { GraphEdge, GraphNode } from "@/lib/types";

/**
 * 知识图谱：B2-2 nodes + edges 分端点拉取；cytoscape 力导向。
 * 契约 v1 节点无掌握度字段（FE 已增补请求），先以统一主色渲染。
 */
export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cyRef = useRef<any>(null);
  const [data, setData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(apiUrl("/knowledge-graph/nodes?limit=50")).then((r) => r.json()),
      fetch(apiUrl("/knowledge-graph/edges")).then((r) => r.json()),
    ])
      .then(([n, e]) => setData({ nodes: n.items, edges: e.items }))
      .catch(() => setData({ nodes: [], edges: [] }));
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
          ...data.nodes.map((n) => ({ data: { id: n.code, label: n.name } })),
          ...data.edges.map((e) => ({
            data: { source: e.src, target: e.dst, label: e.edge_type === "prerequisite" ? "前置" : e.edge_type === "composed_of" ? "包含" : "关联" },
          })),
        ],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "#6366f1",
              color: "#334155",
              "font-size": 11,
              width: 40,
              height: 40,
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
          { selector: "node:selected", style: { "border-width": 4, "border-color": "#4f46e5" } },
        ],
        layout: { name: "cose", animate: true, padding: 30 },
      });
      cy.on("tap", "node", (args: unknown) => {
        const { target } = args as { target: { data: (k: string) => unknown } };
        const code = String(target.data("id"));
        setSelected(data.nodes.find((n) => n.code === code) ?? null);
      });
      cyRef.current = cy;
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
      <p className="mt-1 text-sm text-slate-500">拖拽平移 / 滚轮缩放 / 点节点看详情并直达专项练习</p>
      <div className="mt-5 flex gap-4">
        <div
          ref={containerRef}
          className="h-[560px] flex-1 overflow-hidden rounded-3xl border border-slate-100 bg-white/90 shadow-sm"
        />
        <aside className="w-72 shrink-0">
          {selected ? (
            <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
              <h2 className="text-[15px] font-semibold">{selected.name}</h2>
              <p className="mt-1 text-xs text-slate-400">{selected.code}</p>
              <p className="mt-2 text-xs text-slate-400">{selected.path}</p>
              <div className="mt-4 rounded-2xl bg-indigo-50/70 p-3 text-sm leading-6 text-slate-600">
                围绕该知识点出题练手，AI 会在对话中引导补弱。
              </div>
              <a
                href={`/practice?mode=special&kp_codes=${encodeURIComponent(selected.code)}`}
                className="bg-brand-gradient mt-4 block rounded-full py-2 text-center text-sm font-medium text-white shadow hover:opacity-90"
              >
                针对它练 5 题 →
              </a>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/60 p-6 text-sm text-slate-400">
              点击任意知识点节点查看详情与练习入口
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 px-2">
            <Pill tone="slate">{data?.nodes.length ?? 0} 节点</Pill>
            <Pill tone="slate">{data?.edges.length ?? 0} 关系</Pill>
          </div>
        </aside>
      </div>
    </div>
  );
}
