/**
 * 弹窗/抽屉可访问性行为（TC-X01-05）：
 * - Escape 关闭「最上层」弹出层（层栈管理：弹窗(z60)与 AI 抽屉同时存在时只关顶层）
 * - Tab 焦点循环（焦点陷阱），打开时聚焦初始元素
 */
import { type Ref, watch, onBeforeUnmount, nextTick } from 'vue';

interface Layer {
  isOpen: () => boolean;
  close: () => void;
  container: () => HTMLElement | null;
}

const layers: Layer[] = [];
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function trapTab(event: KeyboardEvent, container: HTMLElement | null): void {
  if (!container) return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
  if (focusables.length === 0) return;
  const first = focusables[0]!;
  const last = focusables[focusables.length - 1]!;
  const active = document.activeElement;
  const inside = active instanceof Node && container.contains(active);
  if (!inside) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' && event.key !== 'Tab') return;
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i]!;
    if (!layer.isOpen()) continue;
    if (event.key === 'Escape') {
      event.preventDefault();
      layer.close();
    } else {
      trapTab(event, layer.container());
    }
    return;
  }
}

let listening = false;
function ensureListener(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('keydown', onDocumentKeydown, true);
}

export function useDialogA11y(
  container: Ref<HTMLElement | null>,
  isOpen: Ref<boolean>,
  close: () => void,
  initialFocus?: () => HTMLElement | null,
): void {
  const layer: Layer = { isOpen: () => isOpen.value, close, container: () => container.value };
  layers.push(layer);
  ensureListener();

  watch(isOpen, (open) => {
    if (!open) return;
    void nextTick(() => {
      const target = initialFocus?.() ?? container.value;
      target?.focus();
    });
  });

  onBeforeUnmount(() => {
    const index = layers.indexOf(layer);
    if (index >= 0) layers.splice(index, 1);
  });
}
