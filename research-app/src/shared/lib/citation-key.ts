/**
 * 引用 key 生成（纯函数，可单测）。
 *
 * 红线（CR-F3-04 / GJ4-02-F）：引用 key 只能来自已核验 CitationRecord，
 * 由前端生成稳定 key（作者姓-年份-标题首词），冲突 key 加后缀。
 */

/** 归一化：转小写、去重音符号/非字母数字、连字符折叠。 */
function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

export function citationKeyFromItem(item: {
  authors: string[];
  year: number | null;
  title: string;
}): string {
  const family = item.authors[0]?.split(/\s+/).pop() ?? 'anon';
  const year = item.year ?? 0;
  const title = normalize(item.title).split('-').slice(0, 3).join('-');
  return `${normalize(family)}${year}${title ? `-${title}` : ''}`;
}

/** 冲突 key 加数字后缀（与已存在 key 集比对）。 */
export function dedupeCitationKey(base: string, existing: Set<string>): string {
  let key = base;
  let i = 2;
  while (existing.has(key)) {
    key = `${base}${i}`;
    i++;
  }
  return key;
}
