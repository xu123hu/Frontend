"use client";

import { useSmoothStream } from "@/lib/useSmoothStream";

/** 流式文本：流式中显示打字机光标；结束后原样呈现全文。 */
export default function StreamText({
  text,
  streaming,
  className = "",
}: {
  text: string;
  streaming: boolean;
  className?: string;
}) {
  const shown = useSmoothStream(text, streaming);
  return (
    <div className={"whitespace-pre-wrap leading-7 " + className}>
      {shown}
      {streaming && <span className="stream-cursor" />}
    </div>
  );
}
