<script setup lang="ts">
/**
 * 新建项目弹窗（黄金链路一 TC-F01-05）。
 * 必填字段与 M4 ProjectCreate 冻结契约一致：title(≤120)、research_question(≤2000)、domain；
 * 可选 stage/visibility。提交携带 Idempotency-Key（crypto.randomUUID）。
 * 状态：编辑中 / 提交中 / 字段校验错误 / 提交失败可重试 / 成功跳转。
 */
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { useCreateProject } from '@features/projects/use-projects';
import { useUiStore } from '@app/stores/ui';
import { ApiError } from '@app/api/client';
import { useDialogA11y } from '@shared/lib/use-dialog-a11y';
import type { ProjectStage, ProjectVisibility } from '@entities/project/types';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; created: [projectId: string] }>();

const ui = useUiStore();
const createMutation = useCreateProject();

const dialogRoot = ref<HTMLDivElement | null>(null);
const titleInput = ref<HTMLInputElement | null>(null);
// TC-X01-05：弹窗 Escape 关闭 + 焦点陷阱；层栈保证与 AI 抽屉同开时只关最上层。
useDialogA11y(
  dialogRoot,
  computed(() => props.open),
  () => emit('close'),
  () => titleInput.value,
);

const title = ref('');
const researchQuestion = ref('');
const domain = ref('');
const stage = ref<ProjectStage>('discovery');
const visibility = ref<ProjectVisibility>('private');

const localFieldErrors = ref<Record<string, string>>({});
const submitError = ref<string | null>(null);
const idempotencyKey = ref('');

const isSubmitting = computed(() => createMutation.isPending.value);

const STAGE_OPTIONS: Array<{ value: ProjectStage; label: string }> = [
  { value: 'discovery', label: '发现期' },
  { value: 'verification', label: '验证期' },
  { value: 'writing', label: '写作期' },
  { value: 'review', label: '评审期' },
  { value: 'published', label: '已发表' },
];
const DOMAIN_OPTIONS = ['数学', '数学教育', '应用数学', '统计学', '其他'];

watch(
  () => props.open,
  (open) => {
    if (open) {
      title.value = '';
      researchQuestion.value = '';
      domain.value = '';
      stage.value = 'discovery';
      visibility.value = 'private';
      localFieldErrors.value = {};
      submitError.value = null;
      idempotencyKey.value = crypto.randomUUID();
    }
  },
);

function validate(): boolean {
  const errors: Record<string, string> = {};
  if (!title.value.trim()) errors.title = '请填写项目标题。';
  else if (title.value.length > 120) errors.title = '标题不能超过 120 字。';
  if (!researchQuestion.value.trim()) errors.research_question = '请填写研究问题。';
  else if (researchQuestion.value.length > 2000) errors.research_question = '研究问题不能超过 2000 字。';
  if (!domain.value) errors.domain = '请选择学科领域。';
  localFieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function submit(): Promise<void> {
  submitError.value = null;
  if (!validate()) return;
  try {
    const project = await createMutation.mutateAsync({
      input: {
        title: title.value.trim(),
        research_question: researchQuestion.value.trim(),
        domain: domain.value,
        stage: stage.value,
        visibility: visibility.value,
      },
      idempotencyKey: idempotencyKey.value,
    });
    ui.setProjectName(project.title);
    emit('created', project.id);
  } catch (err) {
    if (err instanceof ApiError) {
      if (Object.keys(err.fieldErrors).length > 0) {
        const mapped: Record<string, string> = {};
        for (const [key, msg] of Object.entries(err.fieldErrors)) mapped[key] = msg;
        localFieldErrors.value = mapped;
      }
      submitError.value = err.fieldErrors.title ?? err.message;
    } else {
      submitError.value = '创建失败，请重试。';
    }
  }
}
</script>

<template>
  <div
    v-if="open"
    class="overlay"
    @click.self="emit('close')"
  >
    <div
      ref="dialogRoot"
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
    >
      <header class="dialog-head">
        <h2 id="create-project-title">
          新建科研项目
        </h2>
        <button
          type="button"
          class="icon-btn"
          aria-label="关闭弹窗"
          @click="emit('close')"
        >
          <X :size="16" />
        </button>
      </header>

      <form
        class="form"
        novalidate
        @submit.prevent="submit"
      >
        <div class="field">
          <label for="proj-title">项目标题 <span
            class="req"
            aria-hidden="true"
          >*</span></label>
          <input
            id="proj-title"
            ref="titleInput"
            v-model="title"
            type="text"
            maxlength="120"
            :aria-invalid="!!localFieldErrors.title"
            :aria-describedby="localFieldErrors.title ? 'proj-title-error' : undefined"
            placeholder="例如：椭圆光学性质的形式化验证"
          >
          <p
            v-if="localFieldErrors.title"
            id="proj-title-error"
            class="error"
            role="alert"
          >
            {{ localFieldErrors.title }}
          </p>
        </div>

        <div class="field">
          <label for="proj-rq">研究问题 <span
            class="req"
            aria-hidden="true"
          >*</span></label>
          <textarea
            id="proj-rq"
            v-model="researchQuestion"
            rows="3"
            maxlength="2000"
            :aria-invalid="!!localFieldErrors.research_question"
            :aria-describedby="localFieldErrors.research_question ? 'proj-rq-error' : undefined"
            placeholder="一句话说明要回答的核心问题与证据要求"
          />
          <p
            v-if="localFieldErrors.research_question"
            id="proj-rq-error"
            class="error"
            role="alert"
          >
            {{ localFieldErrors.research_question }}
          </p>
        </div>

        <div class="row">
          <div class="field">
            <label for="proj-domain">学科领域 <span
              class="req"
              aria-hidden="true"
            >*</span></label>
            <select
              id="proj-domain"
              v-model="domain"
            >
              <option
                value=""
                disabled
              >
                请选择
              </option>
              <option
                v-for="d in DOMAIN_OPTIONS"
                :key="d"
                :value="d"
              >
                {{ d }}
              </option>
            </select>
            <p
              v-if="localFieldErrors.domain"
              class="error"
              role="alert"
            >
              {{ localFieldErrors.domain }}
            </p>
          </div>
          <div class="field">
            <label for="proj-stage">当前阶段</label>
            <select
              id="proj-stage"
              v-model="stage"
            >
              <option
                v-for="s in STAGE_OPTIONS"
                :key="s.value"
                :value="s.value"
              >
                {{ s.label }}
              </option>
            </select>
          </div>
        </div>

        <fieldset class="field">
          <legend>可见性</legend>
          <label class="radio">
            <input
              v-model="visibility"
              type="radio"
              value="private"
              name="visibility"
            >
            私有（仅自己）
          </label>
          <label class="radio">
            <input
              v-model="visibility"
              type="radio"
              value="team"
              name="visibility"
            >
            团队（教学团队内可见）
          </label>
        </fieldset>

        <p
          v-if="submitError"
          class="submit-error"
          role="alert"
        >
          {{ submitError }}
          <button
            type="button"
            class="retry"
            @click="submit"
          >
            重试
          </button>
        </p>

        <footer class="dialog-foot">
          <button
            type="button"
            class="btn"
            :disabled="isSubmitting"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="submit"
            class="btn primary"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? '创建中…' : '创建项目' }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(23, 43, 77, 0.45);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 60;
}
.dialog {
  width: min(520px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--surface);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}
.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
}
.dialog-head h2 {
  margin: 0;
  font-size: var(--font-size-xl);
}
.icon-btn {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 7px;
  min-height: 30px;
  min-width: 30px;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
}
.form {
  padding: 16px 20px 20px;
  display: grid;
  gap: 14px;
}
.field {
  display: grid;
  gap: 5px;
}
.field label,
.field legend {
  font-size: var(--font-size-sm);
  font-weight: 700;
}
.req {
  color: var(--danger);
}
.field input[type='text'],
.field textarea,
.field select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 9px;
  font: inherit;
  background: #fff;
}
.field input[aria-invalid='true'],
.field textarea[aria-invalid='true'] {
  border-color: var(--danger);
}
.field textarea {
  resize: vertical;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
fieldset.field {
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 10px 12px;
}
.radio {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin-top: 4px;
}
.error {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-xs);
  display: flex;
  align-items: center;
  gap: 4px;
}
.error::before {
  content: '⚠';
}
.submit-error {
  margin: 0;
  padding: 9px 11px;
  background: var(--danger-bg);
  border: 1px solid var(--danger-bg);
  border-radius: 7px;
  color: var(--danger);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: 8px;
}
.retry {
  border: 1px solid var(--danger);
  background: #fff;
  color: var(--danger);
  border-radius: 6px;
  padding: 2px 9px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}
.dialog-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
.btn {
  min-height: 34px;
  padding: 6px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  cursor: pointer;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
