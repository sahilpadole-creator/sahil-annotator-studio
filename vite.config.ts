import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative paths so the build works under any GitHub Pages URL (https://user.github.io/<repo>/)
  base: './',
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/*.mp4', '**/*.zip']
    }
  },
  preview: {
    port: 5174,
    host: true
  }
});
