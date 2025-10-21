/// <reference path="../typings/naimo.d.ts" />

import './style.css'
import { createApp } from 'vue'
import App from './App.vue'

// ==================== 热重载 ====================
if (import.meta.hot) {
  // 监听 preload 文件变化事件
  import.meta.hot.on('preload-changed', async (data) => {
    console.log('📝 检测到 preload 变化:', data)
    // 触发 preload 构建
    console.log('🔨 正在触发 preload 构建...')
    try {
      const response = await fetch('/__preload_build')
      const result = await response.json()
      if (result.success) {
        console.log('✅ Preload 构建完成')
        // 构建成功后，触发热重载
        await window.naimo.hot()
        console.log('🔄 Preload 热重载完成')
        location.reload()
      } else {
        console.error('❌ Preload 构建失败')
      }
    } catch (error) {
      console.error('❌ 触发 preload 构建失败:', error)
    }
  })
}

// ==================== Vue 应用初始化 ====================
const app = createApp(App)
app.mount('#app')

console.log('循环帧检测工具初始化完成')

