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
  const agentTab = ref<'evidence' | 'comments' | 'citations' | 'tasks'>('tasks');
  const currentProjectName = ref('演示项目');
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
  function setAgentTab(tab: 'evidence' | 'comments' | 'citations' | 'tasks'): void {
    agentTab.value = tab;
    agentOpen.value = true;
  }
  function setProjectName(name: string): void {
    currentProjectName.value = name;
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
  };
});
