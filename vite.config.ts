// Конфигурация сборки.
// npm run build         — обычная сборка в dist/ (несколько файлов, для хостинга и Electron/Tauri)
// npm run build:single  — один самодостаточный HTML в dist-single/ (открывается двойным кликом)
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 4000,
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
  },
}));
