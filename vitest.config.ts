import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      obsidian: resolve(__dirname, './src/__mocks__/obsidian.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    deps: {
      optimizer: {
        ssr: {
          exclude: ['obsidian'],
        },
      },
    },
    server: {
      deps: {
        inline: ['obsidian'],
      },
    },
  },
});