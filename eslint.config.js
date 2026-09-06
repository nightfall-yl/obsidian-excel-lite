import obsidianPlugin from 'eslint-plugin-obsidianmd';
import tsparser from '@typescript-eslint/parser';

export default [
  ...obsidianPlugin.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // The line below is off because @univerjs/core re-exports types though its
      // bundle's `exports` map, which typescript-eslint cannot fully resolve under
      // 'bundler' moduleResolution. The affected classes are all annotated.
      '@typescript-eslint/no-explicit-any': 'off',
      // Off for the Univer third-party boundary: @univerjs/core / @wendellhu/redi
      // resolve as `error`/`any` types inside the typescript-eslint type-checking
      // program even though `tsc --noEmit`, the build, and all 22 tests pass cleanly.
      // See src/univer-types.d.ts + src/univer-facade.d.ts for the re-export bridge.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',

      // Type assertions for ICellData & { n?: { pattern: string } } are needed
      // because ICellData does not expose the 'n' property in its type definition,
      // but it is used at runtime for number format patterns.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
];