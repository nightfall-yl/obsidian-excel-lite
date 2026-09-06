import { copyFile, rename, writeFile, readFile, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import process from 'node:process';
import { defineConfig } from 'vite';
import builtins from 'builtin-modules';
import { univerPlugin } from '@univerjs/vite-plugin';

import pkg from './package.json';

const prod = !process.argv.includes('--watch');

function copyBuildOutput() {
  return {
    name: 'copy-build-output',
    async writeBundle() {
      const outDir = resolve(__dirname, 'dist');
      await writeFile(resolve(outDir, 'manifest.json'), `${JSON.stringify({
        id: pkg.name,
        name: 'Excel Lite',
        version: pkg.version,
        minAppVersion: '1.11.0',
        description: pkg.description,
        author: pkg.author,
        isDesktopOnly: false,
      }, null, 2)}\n`);
    },
    async closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      const rootDir = resolve(__dirname);
      const PROCESS_POLYFILL = 'if(typeof window!=="undefined"&&typeof window.process==="undefined"){window.process={env:{NODE_ENV:"production"}};};';
      try {
        const mainJs = await readFile(resolve(outDir, 'main.js'), 'utf-8');
        if (!mainJs.startsWith(PROCESS_POLYFILL)) {
          await writeFile(resolve(outDir, 'main.js'), PROCESS_POLYFILL + '\n' + mainJs);
        }
      } catch (e) { console.warn('[excel-lite:build] prepend process polyfill failed:', e); }
      try {
        await copyFile(resolve(outDir, 'main.js'), join(rootDir, 'main.js'));
      } catch (e) { console.warn('[excel-lite:build] copy main.js failed:', e); }
      try {
        const styleCssPath = resolve(outDir, 'excel-lite.css');
        const stylesCssPath = resolve(outDir, 'styles.css');
        await rename(styleCssPath, stylesCssPath).catch(() => {});
        await copyFile(stylesCssPath, join(rootDir, 'styles.css'));
        const customCss = await readFile(resolve(rootDir, 'src/custom.css'), 'utf-8');
        await appendFile(join(rootDir, 'styles.css'), customCss);
      } catch (e) { console.warn('[excel-lite:build] copy styles.css failed:', e); }
      try {
        await copyFile(resolve(outDir, 'manifest.json'), join(rootDir, 'manifest.json'));
      } catch (e) { console.warn('[excel-lite:build] copy manifest.json failed:', e); }
    },
  };
}

export default defineConfig(() => {
  const dev = process.argv.includes('--watch');

  return {
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    },
    plugins: [
      copyBuildOutput(),
      univerPlugin(),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        'opentype.js/dist/opentype.module': resolve(__dirname, './node_modules/opentype.js/dist/opentype.mjs'),
      },
    },
    optimizeDeps: {
      dedupe: [
        '@univerjs/core',
        '@univerjs/sheets',
      ],
    },
    build: {
      outDir: 'dist',
      lib: {
        entry: './src/main.ts',
        name: 'main',
        fileName: () => 'main.js',
        formats: ['cjs'],
      },
      emptyOutDir: !dev,
      sourcemap: dev ? 'inline' : false,
      target: ['es2020', 'safari14'],
      rollupOptions: {
        output: {
          globals: {
            obsidian: 'obsidian',
          },
          manualChunks: () => 'main.js',
        },
        external: [
          'obsidian',
          'electron',
          '@codemirror/autocomplete',
          '@codemirror/collab',
          '@codemirror/commands',
          '@codemirror/language',
          '@codemirror/lint',
          '@codemirror/search',
          '@codemirror/state',
          '@codemirror/view',
          '@lezer/common',
          '@lezer/highlight',
          '@lezer/lr',
          ...builtins,
        ],
      },
      minify: prod,
    },
  };
});
