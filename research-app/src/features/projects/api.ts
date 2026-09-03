/**
 * 项目 API：M4 OpenAPI v2.0 /projects（需求级冻结契约）。
 * - GET  /projects：列表（cursor 分页，CR-F1-05 请求数据字段冻结）
 * - POST /projects：创建（必填 title/research_question/domain；Idempotency-Key 头）
 * - GET  /projects/{id}：详情（403 不泄露存在性由响应保证）
 */
import { apiRequest } from '@app/api/client';
import type { Project, ProjectCreate } from '@entities/project/types';

export interface ProjectPage {
  items: Project[];
  next_cursor: string | null;
}

export function fetchProjects(limit = 20, cursor?: string, signal?: AbortSignal): Promise<ProjectPage> {
  return apiRequest<ProjectPage>('/projects', {
    query: { limit, cursor },
    signal,
  }).then((envelope) => envelope.data);
}

export function fetchProject(projectId: string, signal?: AbortSignal): Promise<Project> {
  return apiRequest<Project>(`/projects/${encodeURIComponent(projectId)}`, { signal }).then(
    (envelope) => envelope.data,
  );
}

export function createProject(
  input: ProjectCreate,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<Project> {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: input,
    idempotencyKey,
    signal,
  }).then((envelope) => envelope.data);
}
