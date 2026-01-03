import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-content-styles',
      writeBundle() {
        const srcPath = resolve(__dirname, 'src/content/styles.css');
        const destDir = resolve(__dirname, 'dist');
        const destPath = resolve(destDir, 'styles.css');

        if (existsSync(srcPath)) {
          copyFileSync(srcPath, destPath);
          console.log('Copied content styles.css to dist/styles.css');
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'src/sidebar/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
