/**
 * 设计令牌（S16）—— TS 侧常量镜像。
 * 数值与 src/app/theme/ailp.css 完全一致（单一数据源为 CSS：组件样式一律读 CSS 变量；
 * 本文件仅服务于需要 JS 里做计算的场景，例如进度条百分比、渐变角度等，避免硬编码品牌色）。
 */
export const designTokens = {
  color: {
    primary: {
      50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
      400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
      800: '#3730a3', 900: '#312e81',
    },
    accent: {
      50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
      400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2',
    },
    success: { 500: '#10b981', 600: '#059669' },
    warning: { 500: '#f59e0b', 600: '#d97706' },
    error: { 500: '#ef4444', 600: '#dc2626' },
    violet: '#8b5cf6',
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 20, '2xl': 28, full: 9999 },
  fontSize: { xs: 12, sm: 12, base: 14, lg: 16, xl: 18, '2xl': 21, '3xl': 24, hero: 34 },
} as const;

export type DesignColor = (typeof designTokens.color)['primary'][keyof (typeof designTokens.color)['primary']] | (typeof designTokens.color)['accent'][keyof (typeof designTokens.color)['accent']] | (typeof designTokens.color)['success'][keyof (typeof designTokens.color)['success']] | (typeof designTokens.color)['warning'][keyof (typeof designTokens.color)['warning']] | (typeof designTokens.color)['error'][keyof (typeof designTokens.color)['error']] | (typeof designTokens.color)['violet'];
