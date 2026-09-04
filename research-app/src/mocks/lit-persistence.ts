/**
 * 批注/笔记的「服务端持久化」替身（仅 MSW 浏览器模式）。
 *
 * 真实后端将批注/笔记存数据库；MSW 是进程内内存库，页面整刷即失。
 * 为支撑 TC-F02-09（批注/笔记刷新后保留）的走查与 E2E，把 annotations/notes
 * 以 sessionStorage 按 tenant 落盘，重播种时回放。Node 测试环境无 sessionStorage 自动跳过。
 */
import type { LiteratureStore } from './literature-db';
import type { LitAnnotation, LitNote } from '@entities/literature/types';

const key = (tenantId: string): string => `research.lit-delta.${tenantId}`;

export function saveLitDelta(tenantId: string, lit: LiteratureStore): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      key(tenantId),
      JSON.stringify({ annotations: lit.annotations, notes: lit.notes }),
    );
  } catch {
    // 容量满/隐私模式：持久化降级，当前会话仍可用（刷新后回退种子数据，可观察）。
  }
}

export function loadLitDelta(tenantId: string): { annotations: LitAnnotation[]; notes: LitNote[] } | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key(tenantId));
    return raw ? (JSON.parse(raw) as { annotations: LitAnnotation[]; notes: LitNote[] }) : null;
  } catch {
    return null;
  }
}
