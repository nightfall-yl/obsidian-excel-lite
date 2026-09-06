import obsidianPlugin from 'eslint-plugin-obsidianmd';

export default [
  ...obsidianPlugin.configs.recommended,
  {
    rules: {
      // Univer types have module resolution issues that cause IWorkbookData etc.
      // to resolve to 'any', which triggers this rule as a false positive.
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      // Type assertions for ICellData & { n?: { pattern: string } } are needed
      // because ICellData does not expose the 'n' property in its type definition,
      // but it is used at runtime for number format patterns.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
];