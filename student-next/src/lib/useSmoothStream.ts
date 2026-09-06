"use client";

import { useEffect, useRef, useState } from "react";

/**
 * rAF 平滑打字机：把"可见文本增速"与上游 delta 突发解耦（模式参考 DeepTutor
 * useSmoothStreamText，代码为本项目新写）。
 * 关键约束：后台标签页 rAF 会被浏览器冻结——因此非激活（流已结束）态直接返回全文，
 * 绝不经由 rAF 补偿，否则后台标签会出现"文本永远为空"的事故。
 */
export function useSmoothStream(full: string, active: boolean, enabled = true): string {
  const [shownLen, setShownLen] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    if (!enabled || !active) return; // 非流式态：渲染层直接取全文
    // 内容收缩（重生成/重试）时从头揭示
    if (shownRef.current > full.length) shownRef.current = 0;
    let raf = requestAnimationFrame(function tick() {
      const backlog = full.length - shownRef.current;
      if (backlog > 0) {
        // 每帧揭示 max(2, 积压/6)，上限 24 字/帧：积压越大追得越快，但不瞬间喷完
        const step = Math.min(24, Math.max(2, Math.ceil(backlog / 6)));
        shownRef.current = Math.min(full.length, shownRef.current + step);
        setShownLen(shownRef.current);
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [full, active, enabled]);

  return enabled && active ? full.slice(0, shownLen) : full;
}
