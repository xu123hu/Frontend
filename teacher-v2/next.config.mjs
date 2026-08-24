import { fileURLToPath } from 'node:url'

const teacherV2Root = fileURLToPath(new URL('.', import.meta.url))

export default {
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: teacherV2Root,
  },
}
