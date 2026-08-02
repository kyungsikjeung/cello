import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
  server: { host: '127.0.0.1', port: 4318, strictPort: true },
  build: {
    rollupOptions: {
      input: { landing: 'index.html', admin: 'admin.html', preview: 'preview.html' }
    }
  }
});
