/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}

/** 编译期常量（vite.config.ts define 注入）：是否启用 MSW 契约草案。生产构建为 false，msw 不进产物。 */
declare const __USE_MOCK__: boolean;
