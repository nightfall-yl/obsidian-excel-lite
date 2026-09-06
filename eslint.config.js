import obsidianPlugin from 'eslint-plugin-obsidianmd';

export default [
  ...obsidianPlugin.configs.recommended,
  {
    rules: {
      // Type assertions for ICellData & { n?: { pattern: string } } are needed
      // because ICellData does not expose the 'n' property in its type definition,
      // but it is used at runtime for number format patterns.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
];