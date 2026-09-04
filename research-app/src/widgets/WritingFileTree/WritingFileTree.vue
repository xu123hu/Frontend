<script setup lang="ts">
/**
 * 写作文件树（TC-F04-01）：列出文稿文件（main.tex / sections / references.bib）。
 */
import { FileCode2, FileText, FolderTree } from 'lucide-vue-next';
import type { ManuscriptFile } from '@entities/writing/types';

defineProps<{
  files: ManuscriptFile[];
  activePath: string | null;
}>();

const emit = defineEmits<{ select: [path: string] }>();

function icon(path: string): typeof FileText {
  return path.endsWith('.bib') ? FileText : FileCode2;
}
</script>

<template>
  <div
    class="file-tree"
    aria-label="文稿文件树"
  >
    <p class="tree-title">
      <FolderTree :size="13" />
      文件
    </p>
    <ul class="tree">
      <li
        v-for="f in files"
        :key="f.id"
      >
        <button
          type="button"
          class="file-row"
          :class="{ active: f.path === activePath }"
          :aria-current="f.path === activePath ? 'true' : undefined"
          @click="emit('select', f.path)"
        >
          <component
            :is="icon(f.path)"
            :size="13"
          />
          <span class="name">{{ f.path }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.file-tree {
  display: grid;
  gap: 6px;
}
.tree-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--text-muted);
}
.tree {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: var(--font-size-xs);
  color: var(--text);
  cursor: pointer;
}
.file-row:hover {
  background: var(--subtle-bg);
}
.file-row.active {
  background: var(--primary-soft);
  color: var(--primary);
}
.name {
  font-family: var(--mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
