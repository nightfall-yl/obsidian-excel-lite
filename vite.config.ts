import { copyFile, rename, writeFile, readFile, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import process from 'node:process';
import { builtinModules } from 'module';
import { defineConfig } from 'vite';
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
        // Replace createElement("script") from bundled Preact library's formAction handler
        // These are safe: they come from Preact's virtual DOM property diffing code
        // and are only reached when a button has a formAction function prop,
        // which never happens in the spreadsheet plugin.
        let builtJs = await readFile(resolve(outDir, 'main.js'), 'utf-8');
        const scriptCreationPattern = /createElement\(["']script["']\)/g;
        const scriptCreationCount = (builtJs.match(scriptCreationPattern) || []).length;
        if (scriptCreationCount > 0) {
          builtJs = builtJs.replace(scriptCreationPattern, 'createElement("noscript")');
          await writeFile(resolve(outDir, 'main.js'), builtJs);
          console.log(`[excel-lite:build] replaced ${scriptCreationCount} createElement("script") calls`);
        }
        await copyFile(resolve(outDir, 'main.js'), join(rootDir, 'main.js'));
      } catch (e) { console.warn('[excel-lite:build] copy main.js failed:', e); }
      try {
        const styleCssPath = resolve(outDir, 'excel-lite.css');
        const stylesCssPath = resolve(outDir, 'styles.css');
        await rename(styleCssPath, stylesCssPath).catch(() => {});
        await copyFile(stylesCssPath, join(rootDir, 'styles.css'));
        const customCss = await readFile(resolve(rootDir, 'src/custom.css'), 'utf-8');
        await appendFile(join(rootDir, 'styles.css'), customCss);
        // Strip !important from built CSS (Obsidian review guideline)
        let builtCss = await readFile(join(rootDir, 'styles.css'), 'utf-8');
        const importantCount = (builtCss.match(/!important/g) || []).length;
        builtCss = builtCss.replace(/\s*!important/g, '');
        // Restore dark-variant specificity after stripping `!important`.
        // Tailwind gates `dark:` utilities via `:where(.univer-dark,.univer-dark *)`,
        // which contributes ZERO specificity. Without `!important`, a paired base
        // utility (e.g. `univer-bg-white`) ties at (0,1,0) and wins by source order,
        // leaving menu/status/formula bars white in dark mode. Rewriting `:where`→`:is`
        // raises the dark variant to (0,2,0) so it wins — no `!important` needed and
        // the rules stay inert outside a `.univer-dark` ancestor.
        builtCss = builtCss.replace(/:where\(\.univer-dark,\.univer-dark \*\)/g, ':is(.univer-dark,.univer-dark *)');
        // Deduplicate CSS properties within each selector block (Tailwind fallback patterns)
        for (let prev = ''; builtCss !== prev;) {
          prev = builtCss;
          builtCss = builtCss.replace(/\{([^{}]*)\}/g, (_m, content) => {
            const parts = content.split(';').filter(Boolean);
            const seen = new Map();
            const deduped = [];
            for (let k = parts.length - 1; k >= 0; k--) {
              const decl = parts[k].trim();
              const colonIdx = decl.indexOf(':');
              if (colonIdx === -1) { deduped.unshift(decl); continue; }
              const prop = decl.slice(0, colonIdx).trim();
              if (!seen.has(prop)) { seen.set(prop, true); deduped.unshift(decl); }
            }
            return '{' + deduped.join(';') + '}';
          });
        }
        // Strip unsupported browser features for Obsidian 1.9.12
        // columns:/column-gap:... — multicolumn partially supported (keep grid-template-columns:)
        // text-decoration-line:... — non-standard, not supported
        builtCss = builtCss.replace(/(^|[;{])\s*(columns|column-gap|text-decoration-line):[^;{}]+/g, '$1');
        // extended-system-fonts: ui-sans-serif / ui-monospace — not supported
        builtCss = builtCss.replace(/\bui-sans-serif,\s*/g, '');
        builtCss = builtCss.replace(/\bui-monospace,\s*/g, '');
        await writeFile(join(rootDir, 'styles.css'), builtCss);
        if (importantCount > 0) console.log(`[excel-lite:build] stripped ${importantCount} !important declarations`);
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
          ...builtinModules,
        ],
      },
      minify: prod,
    },
  };
});
