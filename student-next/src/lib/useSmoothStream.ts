"use client";

import { useEffect, useRef, useState } from "react";

/**
 * rAF 平滑打字机：把"可见文本增速"与上游 delta 突发解耦（模式参考 DeepTutor
 * useSmoothStreamText，代码为本项目新写）。流结束后一帧内 snap 到全文。
 */
export function useSmoothStream(full: string, active: boolean, enabled = true): string {
  const [shownLen, setShownLen] = useState(active && enabled ? 0 : full.length);
  const shownRef = useRef(active && enabled ? 0 : full.length);

  useEffect(() => {
    if (!enabled || !active) {
      shownRef.current = full.length;
      setShownLen(full.length);
      return;
    }
    // 内容收缩（重生成/重试）时回退
    if (shownRef.current > full.length) {
      shownRef.current = 0;
    }
    let raf = 0;
    const tick = () => {
      const backlog = full.length - shownRef.current;
      if (backlog > 0) {
        // 每帧揭示 max(2, 积压/6)，上限 24 字/帧：积压越大追得越快，但不瞬间喷完
        const step = Math.min(24, Math.max(2, Math.ceil(backlog / 6)));
        shownRef.current = Math.min(full.length, shownRef.current + step);
        setShownLen(shownRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [full, active, enabled]);

  return enabled ? full.slice(0, shownLen) : full;
}
