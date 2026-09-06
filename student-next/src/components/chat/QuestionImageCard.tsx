"use client";

import { useState } from "react";
import { Lightbox, Skeleton } from "@/components/ui/ui";
import type { QuestionImage } from "@/lib/types";

/**
 * 题目图片卡——本项目最硬的验收组件：
 * 图片直出（不转文字）+ 加载骨架 + 点击放大看高清原图。
 */
export default function QuestionImageCard({ image }: { image: QuestionImage }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(false);

  return (
    <div className="max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative">
        {!loaded && !failed && <Skeleton className="h-44 w-full rounded-none" />}
        {failed ? (
          <div className="flex h-40 items-center justify-center text-sm text-red-400">
            题目图片加载失败（{image.image_url}）
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image.image_url}
            alt={image.caption ?? "题目图片"}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            onClick={() => loaded && setZoom(true)}
            className={
              "w-full " + (loaded ? "block h-auto cursor-zoom-in" : "hidden")
            }
          />
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs text-slate-400">{image.caption ?? "题目图片"}</span>
        <button
          onClick={() => setZoom(true)}
          disabled={!loaded}
          className="text-xs font-medium text-indigo-500 hover:text-indigo-600 disabled:text-slate-300"
        >
          查看原图
        </button>
      </div>
      {zoom && <Lightbox src={image.hires_url ?? image.image_url} onClose={() => setZoom(false)} />}
    </div>
  );
}
