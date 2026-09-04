/**
 * Citation.js（MIT）无内置类型声明：最小声明以消除 TS7016。
 * 仅声明本项目使用的 API 面（Cite 构造 + format('bibtex')）。
 * reuse-ledger card-18 采用；仅 mock/导出引用生成使用。
 */
declare module '@citation-js/core' {
  export interface CiteOptions {
    forceType?: string;
  }
  export default class Cite {
    constructor(data: Record<string, unknown> | Record<string, unknown>[] | string, options?: CiteOptions);
    format(format: string): string;
  }
}

declare module '@citation-js/plugin-bibtex' {
  // 副作用插件：导入即注册输入/输出格式，无导出需要。
}
