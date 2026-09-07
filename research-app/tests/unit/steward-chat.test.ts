import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendStewardChat } from '@features/steward/api';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI 管家真实对话 API', () => {
  it('向后端发送会话与推理策略并读取令牌用量', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          content: '建议先核对定义。',
          usage: { prompt_tokens: 10, completion_tokens: 6, total_tokens: 16 },
          reasoning_policy_id: 'rigorous',
          degraded: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await sendStewardChat(
      [{ role: 'user', content: '如何验证这个结论？' }],
      'rigorous',
    );

    expect(result.content).toContain('核对定义');
    expect(result.usage.total_tokens).toBe(16);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/research/v1/steward/chat');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      messages: [{ role: 'user', content: '如何验证这个结论？' }],
      reasoning_policy_id: 'rigorous',
    });
  });
});
