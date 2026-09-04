/**
 * MSW 内存库：契约草案数据（CR-F1-01..04 + M4 v2.0 /projects、/runs）。
 *
 * 仅用于 dev/test（VITE_USE_MOCK=true），生产构建不进入 bundle（main.ts 动态 import）。
 * 数据可观察：UI 顶部显示「契约草案数据源」徽标（DataSourceBadge）。
 *
 * 租户场景（TC-F01-08）：
 * - 手机号 138****0001 → tenant-alpha（拥有项目 proj-alpha-1）
 * - 手机号 139****0002 → tenant-beta（无任何项目，访问 proj-alpha-1 必须 403 且不泄露存在性）
 */
import type { Account, UserPreferences } from '@entities/session/types';
import type { Project } from '@entities/project/types';
import type { Run } from '@entities/run/types';
import type { LiteratureStore } from './literature-db';
import type { WritingStore } from './writing-db';
import type { StewardStore } from './steward-db';

/** 伪 UUIDv7（48bit 毫秒时间戳 + 随机段），仅 mock 使用。 */
export function uuidv7Mock(): string {
  const ts = Date.now();
  const hex = ts.toString(16).padStart(12, '0');
  const rand = crypto.randomUUID().replace(/-/g, '').slice(12, 24);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7${rand.slice(0, 3)}-a${rand.slice(3, 6)}-b${rand.slice(6, 12)}`;
}

export interface TenantRecord {
  tenantId: string;
  accounts: Account[];
  passwordless: { phone: string; otp: string; issuedAt: number } | null;
  sessions: Map<string, string>; // sessionId -> user_id
  preferences: Map<string, UserPreferences>; // user_id -> prefs
  projects: Project[];
  runs: Run[];
  projectCreatedKeys: Map<string, Project>; // idempotency key -> project
  otpRequestCount: number;
  /** 文献域（CR-F2-01..08 草案）：懒初始化（首次命中文献端点时播种）。 */
  literature?: LiteratureStore;
  /** 写作域（CR-F3-01..04 草案）：懒初始化（首次命中写作端点时播种）。 */
  writing?: WritingStore;
  /** 管家域（CR-F4-05/06 草案）：懒初始化（首次命中管家端点/发起研究循环时播种）。 */
  steward?: StewardStore;
}

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

function seedTenant(
  tenantId: string,
  user: Omit<Account, 'tenant_id'>,
  projects: Project[],
  runs: Run[],
): TenantRecord {
  return {
    tenantId,
    accounts: [{ ...user, tenant_id: tenantId }],
    passwordless: null,
    sessions: new Map(),
    preferences: new Map(),
    projects,
    runs,
    projectCreatedKeys: new Map(),
    otpRequestCount: 0,
  };
}

function seedProject(
  id: string,
  tenantId: string,
  title: string,
  researchQuestion: string,
  domain: string,
  stage: Project['stage'],
  updatedAgoMs: number,
): Project {
  return {
    id,
    tenant_id: tenantId,
    title,
    research_question: researchQuestion,
    domain,
    stage,
    visibility: 'private',
    version: 1,
    created_at: iso(updatedAgoMs + 86_400_000),
    updated_at: iso(updatedAgoMs),
  };
}

function seedRun(id: string, tenantId: string, projectId: string, runType: Run['run_type'], status: Run['status'], createdAgoMs: number): Run {
  return {
    id,
    tenant_id: tenantId,
    project_id: projectId,
    run_type: runType,
    status,
    reasoning_policy_id: 'standard',
    budget: {
      max_cost_minor_units: 5000,
      currency: 'CNY',
      max_runtime_seconds: 1800,
      max_parallel_tasks: 4,
      max_sources: 20,
    },
    spent: { cost_minor_units: 120, model_tokens: 8600, runtime_seconds: 240, tool_calls: 6 },
    created_by: 'user-alpha-1',
    created_at: iso(createdAgoMs),
    updated_at: iso(createdAgoMs - 60_000),
    version: 2,
  };
}

export const db: { tenants: Map<string, TenantRecord>; phoneIndex: Map<string, string> } = {
  tenants: new Map(),
  phoneIndex: new Map(),
};

export function seedDb(): void {
  db.tenants.clear();
  db.phoneIndex.clear();

  const tenantAlpha = 'tenant-alpha-0001';
  const tenantBeta = 'tenant-beta-0001';

  const alphaProjects = [
    seedProject(
      'proj-alpha-1',
      tenantAlpha,
      '高中数学建模训练论文',
      '如何用分层线性模型解释不同学校数学建模成绩差异，并给出可复核的证据链？',
      '数学教育',
      'verification',
      3_600_000,
    ),
    seedProject(
      'proj-alpha-2',
      tenantAlpha,
      '椭圆光学性质的形式化验证',
      '椭圆上任意点反射线聚焦性质是否可由 SymPy 符号推导与 Lean 形式化双重确认？',
      '数学',
      'writing',
      86_400_000,
    ),
  ];

  const alphaRuns = [
    seedRun('run-alpha-1', tenantAlpha, 'proj-alpha-1', 'literature_search', 'running', 600_000),
    seedRun('run-alpha-2', tenantAlpha, 'proj-alpha-2', 'math_verification', 'queued', 1_800_000),
    seedRun('run-alpha-3', tenantAlpha, 'proj-alpha-1', 'translation', 'succeeded', 7_200_000),
  ];

  const tenantAlphaRecord = seedTenant(
    tenantAlpha,
    {
      user_id: 'user-alpha-1',
      display_name: '林研究员',
      phone_masked: '138****0001',
      created_at: iso(90 * 86_400_000),
    },
    alphaProjects,
    alphaRuns,
  );
  const tenantBetaRecord = seedTenant(
    tenantBeta,
    {
      user_id: 'user-beta-1',
      display_name: '跨租户审查员',
      phone_masked: '139****0002',
      created_at: iso(30 * 86_400_000),
    },
    [],
    [],
  );

  tenantAlphaRecord.preferences.set('user-alpha-1', {
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    // 邮件通知默认关闭：让偏好修改用例（TC-F01-07）验证「关闭→开启→刷新保留」的完整状态迁移。
    notifications: { email: false, in_app: true },
  });
  tenantBetaRecord.preferences.set('user-beta-1', {
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    notifications: { email: false, in_app: true },
  });

  db.tenants.set(tenantAlpha, tenantAlphaRecord);
  db.tenants.set(tenantBeta, tenantBetaRecord);
  db.phoneIndex.set('13800000001', tenantAlpha);
  db.phoneIndex.set('13900000002', tenantBeta);
}

export function findTenantByPhone(phone: string): TenantRecord | null {
  const tenantId = db.phoneIndex.get(phone);
  return tenantId ? db.tenants.get(tenantId) ?? null : null;
}

export function findTenantBySession(sessionId: string): { tenant: TenantRecord; userId: string } | null {
  for (const tenant of db.tenants.values()) {
    const userId = tenant.sessions.get(sessionId);
    if (userId) return { tenant, userId };
  }
  return null;
}

/** 默认演示账户：无真实后端时给走查一个可预期入口（仅 mock）。 */
export const DEMO_PHONE = '13800000001';
export const DEMO_OTP = '888888';
