/**
 * 文献 mock 内存库（CR-F2-01..08 契约草案数据）。
 *
 * 仅 dev/test；生产构建不进 bundle。UI 常驻「契约草案数据源」徽标。
 * 检索命中/核验状态含负向样例：撤稿（retracted）、元数据-only（metadata_only）、
 * 版本更新（updated）——06 §4 证据要求的三类负向测试在草案层即可演练。
 */
import type { LitAnnotation, LitChunk, LitCollection, LitItem, LitNote, SearchHit } from '@entities/literature/types';
import type { RunEventView } from '@shared/lib/sse';

export interface LiteratureStore {
  collections: LitCollection[];
  items: LitItem[];
  notes: LitNote[];
  annotations: LitAnnotation[];
  chunksByItem: Map<string, LitChunk[]>;
  searchCatalog: SearchHit[];
  /** runId → RunEvent 帧序列（document_parse 事件脚本）。 */
  runEventScripts: Map<string, { frame: RunEventView; delayMs: number }[]>;
  /** uploadId → 上传记录（模拟服务端判定 zip_bomb/corrupted）。 */
  uploads: Map<string, { name: string; sizeBytes: number; failureCode: string | null; itemId: string | null }>;
  /** 文件名 → 解析尝试次数（mock 演练：首次 timeout 失败可重试、重试后成功）。 */
  uploadAttempts: Map<string, number>;
}

export function emptyLiteratureStore(): LiteratureStore {
  return {
    collections: [],
    items: [],
    notes: [],
    annotations: [],
    chunksByItem: new Map(),
    searchCatalog: [],
    runEventScripts: new Map(),
    uploads: new Map(),
    uploadAttempts: new Map(),
  };
}

const iso = (offsetMs: number) => new Date(Date.now() - offsetMs).toISOString();
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function seedLiterature(tenantId: string, projectId: string): LiteratureStore {
  const store = emptyLiteratureStore();

  const collections: LitCollection[] = [
    { id: 'col-core', tenant_id: tenantId, project_id: projectId, name: '核心理论', parent_id: null, item_count: 0, version: 1, created_at: iso(30 * DAY) },
    { id: 'col-edu', tenant_id: tenantId, project_id: projectId, name: '教育研究', parent_id: null, item_count: 0, version: 1, created_at: iso(28 * DAY) },
    { id: 'col-todo', tenant_id: tenantId, project_id: projectId, name: '待读', parent_id: null, item_count: 0, version: 1, created_at: iso(7 * DAY) },
    { id: 'col-hlm', tenant_id: tenantId, project_id: projectId, name: '分层模型', parent_id: 'col-core', item_count: 0, version: 1, created_at: iso(20 * DAY) },
  ];

  type Seed = Partial<Omit<LitItem, 'source_identifier'>> & {
    title: string;
    doi: string | null;
    authors: string[];
    year: number;
    source_identifier_scheme?: 'doi' | 'arxiv' | 'openalex' | 'internal';
    source_identifier_value?: string;
  };
  const seeds: Seed[] = [
    { title: 'Hierarchical Linear Models: Applications and Data Analysis Methods', doi: '10.4324/9781410611739', authors: ['Stephen W. Raudenbush', 'Anthony S. Bryk'], year: 2002, venue: 'SAGE Publications', collection_ids: ['col-core', 'col-hlm'], tags: ['HLM', '方法论'], verification: 'verified_exact', full_text_availability: 'available', abstract: '分层线性模型的标准参考书，覆盖二层数据的估计与解释。' },
    { title: 'The Florida state assessment of mathematics: a multilevel analysis', doi: '10.1080/00220679809597562', authors: ['Xiaofeng Liu'], year: 1998, venue: 'The Journal of Educational Research', collection_ids: ['col-edu', 'col-hlm'], tags: ['HLM', '数学成绩'], verification: 'verified_fuzzy', full_text_availability: 'available', abstract: '对州级数学测评的多层分析。' },
    { title: 'Teacher effects on student achievement: a multilevel approach', doi: '10.1007/s11251-004-2564-z', authors: ['Jaap Scheerens'], year: 2005, venue: 'Instructional Science', collection_ids: ['col-edu'], tags: ['教师效应'], verification: 'verified_exact', full_text_availability: 'metadata_only', abstract: '教师效应对学生成就的多层研究。' },
    { title: 'The geometry of elliptic curves and reflection properties', doi: '10.1016/S0723-0869(00)00052-1', authors: ['Heinrich Dorrie'], year: 1965, venue: 'Elemente der Mathematik', collection_ids: ['col-core'], tags: ['椭圆', '光学性质'], verification: 'verified_exact', full_text_availability: 'available', abstract: '圆锥曲线反射性质的经典处理。' },
    { title: 'Lean 4: the power user guide', doi: null, authors: ['Leonardo de Moura', 'Sebastian Ullrich'], year: 2023, venue: 'Open monograph', collection_ids: ['col-core'], tags: ['Lean', '形式化'], verification: 'local_only', full_text_availability: 'available', source_identifier_scheme: 'arxiv', source_identifier_value: '2303.10555' },
    { title: 'A meta-analysis of mathematics interventions', doi: '10.3102/0034654319877001', authors: ['Xin Ma', 'Jun Ma'], year: 2020, venue: 'Review of Educational Research', collection_ids: ['col-edu'], tags: ['元分析'], verification: 'verified_fuzzy', full_text_availability: 'available', version_status: 'updated' },
    { title: 'On the stability of KAM tori under perturbations', doi: '10.1007/s002220100171', authors: ['Jurgen Poschel'], year: 2001, venue: 'Inventiones mathematicae', collection_ids: ['col-core'], tags: ['KAM', '动力系统'], verification: 'verified_exact', full_text_availability: 'available' },
    { title: 'Symmetric functions and Hall polynomials', doi: '10.1093/oso/9780198504505.001.0001', authors: ['Ian G. Macdonald'], year: 1995, venue: 'Oxford Science Publications', collection_ids: ['col-todo'], tags: ['组合', '对称函数'], verification: 'verified_exact', full_text_availability: 'metadata_only' },
    { title: 'Constructive approximation of elliptic measure', doi: '10.4007/annals.2011.173.2.5', authors: ['László Lovász', 'Balázs Szegedy'], year: 2011, venue: 'Annals of Mathematics', collection_ids: ['col-todo'], tags: ['图极限'], verification: 'conflicting', full_text_availability: 'restricted' },
    { title: 'Cognitive strategy instruction for adolescents: retracted report', doi: '10.1037/edu0000234', authors: ['Anonymous'], year: 2016, venue: 'Journal of Educational Psychology', collection_ids: ['col-edu'], tags: ['需复核'], verification: 'verified_exact', full_text_availability: 'available', version_status: 'retracted' },
    { title: 'Bayesian multilevel models for educational data', doi: '10.1214/12-AOAS569', authors: ['Andrew Gelman', 'Jennifer Hill'], year: 2013, venue: 'The Annals of Applied Statistics', collection_ids: ['col-hlm'], tags: ['贝叶斯', 'HLM'], verification: 'verified_exact', full_text_availability: 'available' },
    { title: 'Differential geometry of curves and surfaces', doi: '10.1007/978-3-319-06681-2', authors: ['Manfredo P. do Carmo'], year: 2016, venue: 'Birkhäuser', collection_ids: ['col-core'], tags: ['微分几何'], verification: 'verified_exact', full_text_availability: 'metadata_only' },
  ];

  const items: LitItem[] = seeds.map((s, i) => {
    const scheme = s.source_identifier_scheme ?? 'doi';
    const value = s.source_identifier_value ?? s.doi!;
    return {
      id: `item-${String(i + 1).padStart(3, '0')}`,
      tenant_id: tenantId,
      project_id: projectId,
      title: s.title,
      authors: s.authors,
      year: s.year,
      venue: s.venue ?? null,
      doi: s.doi,
      abstract: s.abstract ?? null,
      source_identifier: { scheme, value },
      rights_status: s.full_text_availability === 'available' ? 'open' : s.full_text_availability === 'restricted' ? 'restricted' : 'metadata_only',
      full_text_availability: s.full_text_availability ?? 'unknown',
      pdf_artifact_id: (s.full_text_availability ?? 'unknown') === 'available' ? `art-pdf-${i + 1}` : null,
      verification: s.verification ?? 'not_found',
      version_status: s.version_status ?? 'current',
      collection_ids: s.collection_ids ?? [],
      tags: s.tags ?? [],
      version: 1,
      created_at: iso((60 - i * 2) * DAY),
      updated_at: iso((30 - i) * DAY),
    } as LitItem;
  });

  for (const col of collections) {
    col.item_count = items.filter((it) => it.collection_ids.includes(col.id)).length;
  }

  const notes: LitNote[] = [
    { id: 'note-1', tenant_id: tenantId, item_id: 'item-001', content: '第二章的两层模型记号与我们的记号表冲突：他们的 β 是固定效应。写作用例前必须统一。', version: 1, created_at: iso(5 * DAY), updated_at: iso(5 * DAY) },
    { id: 'note-2', tenant_id: tenantId, item_id: 'item-010', content: '已撤稿——正文引用前必须核对撤稿声明与再分析数据。', version: 1, created_at: iso(2 * DAY), updated_at: iso(2 * DAY) },
  ];

  const annotations: LitAnnotation[] = [
    {
      id: 'anno-1',
      tenant_id: tenantId,
      item_id: 'item-001',
      page_index: 3,
      bbox: [92.4, 410.2, 505.8, 436.9],
      char_start: 1024,
      char_end: 1180,
      quoted_text: 'The level-1 model represents the relationship among the within-school variables.',
      quoted_text_sha256: 'a3f1c2…mock',
      anchor_status: 'anchored',
      comment: '层1模型定义——与我们 3.2 节对应。',
      color: '#f2a93b',
      author_id: 'user-alpha-1',
      version: 1,
      created_at: iso(4 * DAY),
      updated_at: iso(4 * DAY),
    },
    {
      id: 'anno-2',
      tenant_id: tenantId,
      item_id: 'item-001',
      page_index: 7,
      bbox: null,
      char_start: null,
      char_end: null,
      quoted_text: '未能在当前版式重定位的历史批注。',
      quoted_text_sha256: 'b7e2d1…mock',
      anchor_status: 'needs_reanchor',
      comment: '旧版 PDF 的图注，重锚失败。',
      color: '#d64545',
      author_id: 'user-alpha-1',
      version: 1,
      created_at: iso(9 * DAY),
      updated_at: iso(9 * DAY),
    },
  ];

  // item-001 的切分结果（DocumentIR blocks 视图）：覆盖公式/代码/表格/引用完整性样例。
  const chunks: LitChunk[] = [
    { block_id: 'blk-01', type: 'heading', page_index: 1, bbox: [72, 72, 540, 96], text: '1. Introduction', latex: null, content_hash: 'h-01', integrity: 'intact', confirmed: false },
    { block_id: 'blk-02', type: 'paragraph', page_index: 1, bbox: [72, 100, 540, 180], text: 'Multilevel models partition variance…', latex: null, content_hash: 'h-02', integrity: 'intact', confirmed: false },
    { block_id: 'blk-03', type: 'display_math', page_index: 2, bbox: [140, 210, 470, 248], text: null, latex: 'y_{ij} = \\beta_{0j} + \\beta_{1j}x_{ij} + r_{ij}', content_hash: 'h-03', integrity: 'intact', confirmed: false },
    { block_id: 'blk-04', type: 'table', page_index: 3, bbox: [72, 300, 540, 520], text: '[Table 3.1 School-level covariates]', latex: null, content_hash: 'h-04', integrity: 'intact', confirmed: false },
    { block_id: 'blk-05', type: 'citation', page_index: 4, bbox: [72, 540, 540, 560], text: 'Bryk, A. S., & Raudenbush, S. W. (1992).', latex: null, content_hash: 'h-05', integrity: 'suspect', confirmed: false },
  ];

  const searchCatalog: SearchHit[] = [
    { title: 'Algebraic geometry and arithmetic curves', authors: ['Qing Liu'], year: 2002, venue: 'Oxford Graduate Texts', source: 'crossref', source_identifier: { scheme: 'doi', value: '10.1093/acprof:oso/9780198502845.001.0001' }, has_full_text: true, rights_status: 'licensed', version_status: 'current', already_in_library: false },
    { title: 'Multilevel analysis: techniques and applications', authors: ['Joop Hox', 'Mirjam Moerbeek', 'Rens van de Schoot'], year: 2017, venue: 'Routledge', source: 'openalex', source_identifier: { scheme: 'doi', value: '10.4324/9781315650982' }, has_full_text: false, rights_status: 'metadata_only', version_status: 'current', already_in_library: false },
    { title: 'A survey of elliptic curve reflection principles', authors: ['H. W. Lenstra'], year: 1987, venue: 'J. Number Theory', source: 'arxiv', source_identifier: { scheme: 'arxiv', value: '1987.04567' }, has_full_text: true, rights_status: 'open', version_status: 'current', already_in_library: false },
    { title: 'The Florida state assessment of mathematics: a multilevel analysis', authors: ['Xiaofeng Liu'], year: 1998, venue: 'The Journal of Educational Research', source: 'crossref', source_identifier: { scheme: 'doi', value: '10.1080/00220679809597562' }, has_full_text: true, rights_status: 'open', version_status: 'current', already_in_library: true },
    { title: 'Retracted: cognitive strategy instruction meta-review', authors: ['Anonymous'], year: 2019, venue: 'Educational Psychology Review', source: 'openalex', source_identifier: { scheme: 'doi', value: '10.1007/ret-2019-x' }, has_full_text: false, rights_status: 'metadata_only', version_status: 'retracted', already_in_library: false },
    { title: 'Expression of concern: Bayesian hierarchical modeling note', authors: ['A. Reviewer'], year: 2021, venue: 'Bayesian Analysis', source: 'crossref', source_identifier: { scheme: 'doi', value: '10.1214/eoc-2021-01' }, has_full_text: true, rights_status: 'open', version_status: 'expression_of_concern', already_in_library: false },
  ];

  store.collections = collections;
  store.items = items;
  store.notes = notes;
  store.annotations = annotations;
  store.chunksByItem.set('item-001', chunks);
  store.searchCatalog = searchCatalog;
  return store;
}

/** 10,000 条压测条目（TC-F02-10；仅在显式 seed-stress 后生成）。 */
export function generateStressItems(tenantId: string, projectId: string, count: number, startIndex: number): LitItem[] {
  const topics = ['方差分析', '李群表示', '随机矩阵', '谱图理论', '多层模型', '椭圆曲线', '不动点定理', '测度集中'];
  const venues = ['J. Algebra', 'Ann. Statist.', 'Geom. Dedicata', 'Proc. AMS', 'Comm. Math. Phys.'];
  return Array.from({ length: count }, (_, i) => {
    const n = startIndex + i;
    return {
      id: `item-stress-${String(n).padStart(5, '0')}`,
      tenant_id: tenantId,
      project_id: projectId,
      title: `压测条目 ${n}：${topics[n % topics.length]}的${n % 2 === 0 ? '存在性' : '稳定性'}分析`,
      authors: [`作者${n % 97}`, `作者${(n + 13) % 97}`],
      year: 1980 + (n % 46),
      venue: venues[n % venues.length],
      doi: `10.9000/stress.${n}`,
      abstract: null,
      source_identifier: { scheme: 'doi', value: `10.9000/stress.${n}` },
      rights_status: 'metadata_only',
      full_text_availability: 'metadata_only',
      pdf_artifact_id: null,
      verification: 'not_found',
      version_status: 'current',
      collection_ids: ['col-stress'],
      tags: ['压测'],
      version: 1,
      created_at: iso(n * 1000),
      updated_at: iso(n * 1000),
    } satisfies LitItem;
  });
}

export function emptyCollection(id: string, tenantId: string, projectId: string, name: string): LitCollection {
  return { id, tenant_id: tenantId, project_id: projectId, name, parent_id: null, item_count: 0, version: 1, created_at: iso(0) };
}

export { HOUR, DAY };
