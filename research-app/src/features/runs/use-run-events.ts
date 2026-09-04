/**
 * 通用 RunEvent SSE 订阅 composable（M0 冻结 GET /runs/{id}/events）。
 *
 * 供 F4 评审验证 run / 管家研究循环 run 使用：
 * - 订阅 runId 变化自动重连（AbortController 取消旧流）。
 * - lastEvent 保留最近一条事件（进度展示），terminal（completed/failed）触发回调。
 * - 网络错误可观察（error ref），不静默；断线不自动重连（轮询查询兜底状态）。
 */
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { consumeRunEventStream, type RunEventView } from '@shared/lib/sse';
import { config } from '@app/config';

export interface UseRunEventsOptions {
  onEvent?: (event: RunEventView) => void;
  onComplete?: (event: RunEventView | null) => void;
}

export function useRunEvents(runId: MaybeRefOrGetter<string | null>, options: UseRunEventsOptions = {}) {
  const lastEvent = ref<RunEventView | null>(null);
  const streaming = ref(false);
  const error = ref<string | null>(null);
  let controller: AbortController | null = null;
  let generation = 0;

  function stop(): void {
    generation += 1;
    controller?.abort();
    controller = null;
    streaming.value = false;
  }

  watch(
    () => toValue(runId),
    (id) => {
      stop();
      if (!id) return;
      const gen = generation;
      const ctl = new AbortController();
      controller = ctl;
      streaming.value = true;
      error.value = null;
      lastEvent.value = null;
      const eventsUrl = `${config.apiBaseUrl}/runs/${encodeURIComponent(id)}/events`;
      void consumeRunEventStream(
        { eventsUrl, signal: ctl.signal },
        {
          onEvent: (event) => {
            if (gen !== generation) return;
            lastEvent.value = event;
            options.onEvent?.(event);
            if (event.event_type === 'run.completed' || event.event_type === 'run.failed') {
              options.onComplete?.(event);
              if (gen === generation) {
                streaming.value = false;
                ctl.abort();
              }
            }
          },
          onError: (err) => {
            if (gen !== generation || err.kind === 'aborted') return;
            error.value = err.message;
            if (!err.retryable) {
              streaming.value = false;
              ctl.abort();
            }
          },
        },
      );
    },
    { immediate: true },
  );

  onScopeDispose(stop);

  const progressMessage = computed(() => lastEvent.value?.progress?.message ?? null);

  return { lastEvent, streaming, error, progressMessage, stop };
}
