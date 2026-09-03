/**
 * 浏览器端 mock 会话持久化：模拟「服务端会话/偏好在页面刷新后仍有效」的真实语义。
 * MSW 浏览器模式 handlers 在页面上下文执行，内存库随刷新重置；
 * 用 sessionStorage 快照恢复会话事实，使 TC-F01-02/07（刷新不丢）可被真实验证。
 * 仅 VITE_USE_MOCK=true 的浏览器环境生效；node 契约测试无 sessionStorage，自动跳过。
 * 不写入业务数据本身（项目/任务仍每次重新种子），不污染 localStorage。
 */
import type { db as DbShape, TenantRecord } from './db';

type Db = typeof DbShape;
type UserPreferences = TenantRecord['preferences'] extends Map<string, infer P> ? P : never;

const KEY = 'rs-mock-session-snapshot';

interface Snapshot {
  sessions: Record<string, { tenantId: string; userId: string }>;
  preferences: Record<string, UserPreferences>; // `${tenantId}:${userId}`
}

function hasStorage(): boolean {
  return typeof sessionStorage !== 'undefined';
}

function readSnapshot(): Snapshot {
  if (!hasStorage()) return { sessions: {}, preferences: {} };
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { sessions: {}, preferences: {} };
    const parsed = JSON.parse(raw) as Snapshot;
    return {
      sessions: parsed.sessions ?? {},
      preferences: parsed.preferences ?? {},
    };
  } catch {
    return { sessions: {}, preferences: {} };
  }
}

/** 种子后调用：把快照中的会话/偏好事实恢复到内存库。 */
export function restoreSessions(db: Db): void {
  const snap = readSnapshot();
  for (const [sessionId, ref] of Object.entries(snap.sessions)) {
    const tenant = db.tenants.get(ref.tenantId);
    if (tenant && tenant.accounts.some((a) => a.user_id === ref.userId)) {
      tenant.sessions.set(sessionId, ref.userId);
    }
  }
  for (const [key, prefs] of Object.entries(snap.preferences)) {
    const [tenantId, userId] = key.split(':');
    const tenant = db.tenants.get(tenantId ?? '');
    if (tenant && userId) tenant.preferences.set(userId, prefs);
  }
}

/** 会话/偏好变更后调用：把当前事实写入快照。 */
export function persistSessions(db: Db): void {
  if (!hasStorage()) return;
  const snap: Snapshot = { sessions: {}, preferences: {} };
  for (const tenant of db.tenants.values()) {
    for (const [sessionId, userId] of tenant.sessions) {
      snap.sessions[sessionId] = { tenantId: tenant.tenantId, userId };
    }
    for (const [userId, prefs] of tenant.preferences) {
      snap.preferences[`${tenant.tenantId}:${userId}`] = prefs;
    }
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    // 存储不可用（隐私模式等）：mock 退化为刷新丢会话，属可观察行为，不伪装。
  }
}
