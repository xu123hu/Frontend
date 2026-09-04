/**
 * 文献实体（Zotero 式心智模型：条目/集合/标签/附件/笔记/批注）。
 *
 * 契约依据（CR-F2-02..06 推导，待 Agent 2 冻结）：
 * - M4 §8.2 文献与知识库：DOI 优先去重、核验状态、BM25/标签/笔记/PDF 标注。
 * - 02 §4 通用字段：UUIDv7、tenant_id、version 乐观锁、RFC 3339。
 * - 02 §6 API 约定：游标分页、If-Match/version、签名 URL 下载。
 * - 冻结引用：SourceScheme/RightsStatus/BlockType/CitationVersionStatus 直接取自
 *   M0 openapi（m0-schema.gen.d.ts），不在本文件重复定义枚举。
 */

/** M0 冻结 SourceScheme 子集（检索/条目使用 doi/arxiv/openalex/internal）。 */
export type LitSourceScheme = 'doi' | 'arxiv' | 'openalex' | 'internal';

/** M0 冻结 RightsStatus（权限字段随上传/导入继承——02 §5.3）。 */
export type LitRightsStatus = 'open' | 'licensed' | 'user_provided' | 'metadata_only' | 'restricted' | 'unknown';

/** 全文可用性（检索结果区分元数据来源与全文可得性——06 §4 步骤 1）。 */
export type FullTextAvailability = 'available' | 'metadata_only' | 'restricted' | 'unknown';

/** M0 冻结 CitationVersionStatus（撤稿/版本冲突负向展示）。 */
export type CitationVersionStatus = 'current' | 'updated' | 'retracted' | 'expression_of_concern' | 'unknown';

/** 条目集合归属：一个条目可属于多个集合（Zotero 心智）。 */
export interface LitCollection {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  parent_id: string | null;
  item_count: number;
  version: number;
  created_at: string;
}

/** 文献条目读模型。 */
export interface LitItem {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  abstract: string | null;
  /** 权威标识（M0 SourceIdentifier 结构）。 */
  source_identifier: { scheme: LitSourceScheme; value: string };
  rights_status: LitRightsStatus;
  full_text_availability: FullTextAvailability;
  /** PDF 附件 artifact id（无全文为 null）。 */
  pdf_artifact_id: string | null;
  /** 核验状态（M4 §8.2 六态）。 */
  verification: 'verified_exact' | 'verified_fuzzy' | 'conflicting' | 'not_found' | 'source_unavailable' | 'local_only';
  version_status: CitationVersionStatus;
  collection_ids: string[];
  tags: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

/** 检索命中（三源聚合；CitationRecord 冻结字段视图）。 */
export interface SearchHit {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  source: 'crossref' | 'openalex' | 'arxiv';
  source_identifier: { scheme: LitSourceScheme; value: string };
  has_full_text: boolean;
  rights_status: LitRightsStatus;
  version_status: CitationVersionStatus;
  /** 已在库中（DOI 去重提示）。 */
  already_in_library: boolean;
}

/** 笔记（独立子对象，不内嵌条目）。 */
export interface LitNote {
  id: string;
  tenant_id: string;
  item_id: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** 锚定状态：bbox 失效→文本重锚→仍失败必须显式警示（design §3.2 候选 C）。 */
export type AnchorStatus = 'anchored' | 'needs_reanchor';

/** PDF 批注（结构对齐 M0 冻结 Locator + EvidenceRecord 引文哈希）。 */
export interface LitAnnotation {
  id: string;
  tenant_id: string;
  item_id: string;
  page_index: number | null;
  bbox: [number, number, number, number] | null;
  char_start: number | null;
  char_end: number | null;
  /** 引文原文（哈希校验兜底锚定）。 */
  quoted_text: string;
  quoted_text_sha256: string;
  anchor_status: AnchorStatus;
  comment: string;
  color: string;
  author_id: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** M0 冻结 BlockType（Chunk 完整性判定依据）。 */
export type ChunkBlockType = 'heading' | 'paragraph' | 'display_math' | 'inline_math' | 'figure' | 'table' | 'caption' | 'citation' | 'footnote' | 'code';

/** 切分结果（= DocumentIR.DocumentBlock 视图 + 入库确认状态，CR-F2-06）。 */
export interface LitChunk {
  block_id: string;
  type: ChunkBlockType;
  page_index: number | null;
  bbox: [number, number, number, number] | null;
  text: string | null;
  /** 公式块的 LaTeX（完整性检查对象）。 */
  latex: string | null;
  content_hash: string;
  /** 块完整性：公式/代码/表格/引用块是否未被切断。 */
  integrity: 'intact' | 'suspect';
  confirmed: boolean;
}

/** 批量导入文件校验失败原因（06 §2：非法、超限、Zip Bomb、类型不支持——不静默丢弃）。 */
export type ImportRejectionReason = 'invalid_type' | 'too_large' | 'zip_bomb' | 'corrupted_pdf' | 'parse_failed';

/** 上传预处理参数（默认值由服务端契约给定——提示词红线，前端只透传 M0 约定选项）。 */
export interface IngestOptions {
  chunk_granularity: 'section' | 'page' | 'paragraph';
  chunk_by_section: boolean;
  chunk_overlap: number;
}
