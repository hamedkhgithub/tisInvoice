import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // 🎯 تنظیم سقف اخطار حجم فایل به ۱۰۰۰ کیلوبایت (۱ مگابایت) برای حذف پیام هشدار
    chunkSizeWarningLimit: 1000
  },

  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
})