/**
 * 科研项目实体。
 *
 * 契约依据：M4 OpenAPI v2.0 `ProjectCreate`（title/research_question/domain/stage/visibility）
 * + 02 §4 通用字段（UUIDv7、version 乐观锁、tenant_id、RFC 3339、deleted_at 软删除）。
 * M4 v2.0 的响应 data 尚为空 schema → 已提交 CR-F1-05 请 Agent 2 冻结完整 Project 读模型。
 */

export type ProjectStage = 'discovery' | 'verification' | 'writing' | 'review' | 'published';
export type ProjectVisibility = 'private' | 'team';

/** M4 ProjectCreate 原样：创建请求体。 */
export interface ProjectCreate {
  title: string;
  research_question: string;
  domain: string;
  stage?: ProjectStage;
  visibility?: ProjectVisibility;
}

/** ProjectCreate + 02 §4 通用字段推导的读模型（CR-F1-05）。 */
export interface Project {
  id: string;
  tenant_id: string;
  title: string;
  research_question: string;
  domain: string;
  stage: ProjectStage;
  visibility: ProjectVisibility;
  version: number;
  created_at: string;
  updated_at: string;
}

export function isProjectCreateValid(input: Partial<ProjectCreate>): string[] {
  const errors: string[] = [];
  if (!input.title || input.title.trim().length === 0) errors.push('title');
  if (input.title && input.title.length > 120) errors.push('title:maxLength');
  if (!input.research_question || input.research_question.trim().length === 0) errors.push('research_question');
  if (input.research_question && input.research_question.length > 2000) errors.push('research_question:maxLength');
  if (!input.domain || input.domain.trim().length === 0) errors.push('domain');
  return errors;
}
