<script setup lang="ts">
/**
 * 统一输入框（S16 组件库唯一实现，H17）。
 * 支持 label / hint / error（校验回显）/ 前后缀插槽 / textarea 形态。
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    label?: string;
    hint?: string;
    error?: string;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'search';
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    autofocus?: boolean;
    id?: string;
    name?: string;
    textarea?: boolean;
    rows?: number;
  }>(),
  {
    modelValue: '',
    label: undefined,
    hint: undefined,
    error: undefined,
    placeholder: undefined,
    type: 'text',
    disabled: false,
    readonly: false,
    required: false,
    autofocus: false,
    id: undefined,
    name: undefined,
    textarea: false,
    rows: 3,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();

const inputId = computed(() => props.id ?? `app-input-${Math.random().toString(36).slice(2, 9)}`);
const hasError = computed(() => Boolean(props.error));

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement | HTMLTextAreaElement).value);
}
</script>

<template>
  <div
    class="app-input"
    :class="{ 'has-error': hasError, disabled }"
  >
    <label
      v-if="label"
      :for="inputId"
      class="input-label"
    >
      {{ label }}
      <span
        v-if="required"
        class="req"
        aria-hidden="true"
      >*</span>
    </label>
    <textarea
      v-if="textarea"
      :id="inputId"
      :name="name"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :autofocus="autofocus"
      :rows="rows"
      class="input-field"
      @input="onInput"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
    />
    <div
      v-else
      class="input-slot"
    >
      <slot name="prefix" />
      <input
        :id="inputId"
        :name="name"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autofocus="autofocus"
        class="input-field"
        @input="onInput"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      >
      <slot name="suffix" />
    </div>
    <p
      v-if="error"
      class="input-error"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      class="input-hint"
    >
      {{ hint }}
    </p>
  </div>
</template>

<style scoped>
.app-input {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}
.input-label {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--ailp-foreground);
}
.req {
  color: var(--ailp-error-500);
  margin-left: 2px;
}
.input-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ailp-input);
  border-radius: var(--radius-md);
  background: var(--ailp-card);
  padding: 0 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-slot:focus-within {
  border-color: var(--ailp-ring);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.input-field {
  width: 100%;
  border: 1px solid var(--ailp-input);
  border-radius: var(--radius-md);
  background: var(--ailp-card);
  padding: 7px 12px;
  font-size: var(--font-size-base);
  color: var(--ailp-foreground);
  font-family: var(--font);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-field::placeholder {
  color: var(--ailp-gray-400);
}
.input-field:focus {
  border-color: var(--ailp-ring);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.input-error {
  margin: 0;
  color: var(--ailp-error-600);
  font-size: var(--font-size-sm);
}
.input-hint {
  margin: 0;
  color: var(--ailp-muted-foreground);
  font-size: var(--font-size-sm);
}
.has-error .input-field,
.has-error .input-slot {
  border-color: var(--ailp-error-500);
}
.app-input.disabled {
  opacity: 0.6;
}
</style>
