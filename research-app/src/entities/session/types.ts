/**
 * 会话与账户实体。
 *
 * 契约状态：**契约草案（CR-F1-01..04）**。
 * 字段推导依据：02 §4（UUIDv7 标识、tenant_id 租户字段、RFC 3339 时间）；
 * M4 §11 安全门禁（OIDC/短期 token/HttpOnly cookie）。
 * Agent 2 冻结 auth 端点后如有差异，以冻结契约为准调整本文件与 mocks。
 */

export interface Account {
  /** UUIDv7（02 §4） */
  user_id: string;
  /** UUIDv7（02 §4）：所有租户数据携带 tenant_id */
  tenant_id: string;
  display_name: string;
  /** 脱敏手机号，如 138****1234 */
  phone_masked: string;
  created_at: string;
}

export type SessionStatus = 'probing' | 'authenticated' | 'anonymous';

export interface UserPreferences {
  /** UI 语言：zh-CN / en-US（06 §3 步骤 5：修改语言，刷新后保留） */
  language: 'zh-CN' | 'en-US';
  timezone: string;
  notifications: {
    email: boolean;
    in_app: boolean;
  };
}
