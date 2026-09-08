import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 纯 UI 状态：侧栏折叠、抽屉开关、个人中心开关。
 * 严禁在此保存服务端事实（02 §5.1）。
 */
export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false);
  const personalCenterOpen = ref(false);
  const agentOpen = ref(false);
  const agentTab = ref<'chat' | 'tasks'>('chat');
  // 空 = 尚未选定项目，切换器回落「选择项目」；演示/真实项目名都由页面写入，
  // 不把 mock 时代的「演示项目」当默认值（live 模式下会误导）。
  const currentProjectName = ref('');
  const systemHealthy = ref(true);

  const agentDrawerOpen = computed(() => agentOpen.value);

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
  function togglePersonalCenter(): void {
    personalCenterOpen.value = !personalCenterOpen.value;
  }
  function toggleAgent(): void {
    agentOpen.value = !agentOpen.value;
  }
  function setAgentTab(tab: 'chat' | 'tasks'): void {
    agentTab.value = tab;
    agentOpen.value = true;
  }
  function setProjectName(name: string): void {
    currentProjectName.value = name;
  }
  function setSystemHealthy(healthy: boolean): void {
    systemHealthy.value = healthy;
  }

  return {
    sidebarCollapsed,
    personalCenterOpen,
    agentOpen,
    agentTab,
    currentProjectName,
    systemHealthy,
    agentDrawerOpen,
    toggleSidebar,
    togglePersonalCenter,
    toggleAgent,
    setAgentTab,
    setProjectName,
    setSystemHealthy,
  };
});
