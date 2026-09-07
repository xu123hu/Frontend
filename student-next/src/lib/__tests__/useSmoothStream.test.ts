import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSmoothStream } from "../useSmoothStream";

/** rAF 桩：收集回调，由测试手动逐帧推进 */
let queue: FrameRequestCallback[];
function flushFrames(n: number): void {
  for (let i = 0; i < n; i++) {
    const cb = queue.shift();
    if (!cb) return;
    act(() => cb(performance.now()));
  }
}

beforeEach(() => {
  queue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    queue.push(cb);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("useSmoothStream", () => {
  it("非激活态立即返回全文（后台标签/rAF 冻结也正确）", () => {
    const { result } = renderHook(() => useSmoothStream("全文内容ABC", false));
    expect(result.current).toBe("全文内容ABC");
  });

  it("激活态经 rAF 逐步揭示，最终收敛到全文", () => {
    const full = "一二三四五六七八九十".repeat(6); // 60 字
    const { result } = renderHook(() => useSmoothStream(full, true));
    expect(result.current).toBe(""); // 初始未揭示
    flushFrames(60);
    expect(result.current).toBe(full);
  });

  it("流结束（active→false）一帧内 snap 到全文", () => {
    const full = "这段文本比较长，用于验证 snap 行为是否正确可靠。";
    const { result, rerender } = renderHook(({ active }) => useSmoothStream(full, active), {
      initialProps: { active: true },
    });
    // 未推进任何帧（如后台标签 rAF 冻结）
    expect(result.current).toBe("");
    rerender({ active: false });
    expect(result.current).toBe(full); // 修复点：非激活直出全文，不依赖 rAF
  });

  it("内容收缩（重生成）时从头揭示新全文", () => {
    const long = "很长的旧回答".repeat(20);
    const { result, rerender } = renderHook(({ text, active }) => useSmoothStream(text, active), {
      initialProps: { text: long, active: true },
    });
    flushFrames(40);
    const short = "新的短回答";
    rerender({ text: short, active: true });
    flushFrames(60);
    expect(result.current).toBe(short);
  });
});
