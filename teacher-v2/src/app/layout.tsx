import type { Metadata } from 'next'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import './teacher-v2.css'

export const metadata: Metadata = {
  title: '智学数研｜教师工作台',
  description: '高中数学教师的教学工作台',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
