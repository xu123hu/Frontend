import { defineStore } from 'pinia'

let seq = 0

export const useToastStore = defineStore('toast', {
  state: () => ({ items: [] }),
  actions: {
    show(text, type = 'info', duration = 2600) {
      const id = ++seq
      this.items.push({ id, text, type })
      setTimeout(() => {
        this.items = this.items.filter((t) => t.id !== id)
      }, duration)
    },
    success(text) { this.show(text, 'success') },
    error(text) { this.show(text, 'error', 3600) },
    info(text) { this.show(text, 'info') },
  },
})
