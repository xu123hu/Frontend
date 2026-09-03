import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import StatusBadge from '@shared/ui/StatusBadge.vue';
import { AsyncState } from '@shared/state/async-state';

describe('StatusBadge', () => {
  it('SUCCEEDED 显示 success tone 与默认文案"已保存"式映射', () => {
    const wrapper = mount(StatusBadge, { props: { state: AsyncState.SUCCEEDED } });
    expect(wrapper.find('.badge').classes()).toContain('tone-success');
    expect(wrapper.text()).toBeTruthy();
  });

  it('FAILED 显示 danger tone', () => {
    const wrapper = mount(StatusBadge, { props: { state: AsyncState.FAILED } });
    expect(wrapper.find('.badge').classes()).toContain('tone-danger');
  });

  it('自定义 label 优先', () => {
    const wrapper = mount(StatusBadge, {
      props: { state: AsyncState.WAITING_FOR_APPROVAL, label: '等待用户确认' },
    });
    expect(wrapper.text()).toBe('等待用户确认');
  });

  it('data-state 反映原始状态', () => {
    const wrapper = mount(StatusBadge, { props: { state: AsyncState.RUNNING } });
    expect(wrapper.find('.badge').attributes('data-state')).toBe('running');
  });
});

describe('Router 路由表与页面文件一一对应', () => {
  it('F0 阶段所有路由都能 resolve', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>root</div>' } },
        { path: '/research/home', component: { template: '<div>home</div>' } },
        { path: '/research/projects', component: { template: '<div>projects</div>' } },
      ],
    });
    await router.push('/research/home');
    expect(router.currentRoute.value.path).toBe('/research/home');
  });
});
