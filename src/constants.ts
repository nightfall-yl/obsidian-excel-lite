export const VIEW_TYPE_SHEET = 'excel-view';
export const FRONTMATTER_KEY = 'excel-lite';
export const SHEET_PLUS_FRONTMATTER_KEY = 'excel-pro-plugin';
export const SHEET_FRONTMATTER_KEYS = [FRONTMATTER_KEY, SHEET_PLUS_FRONTMATTER_KEY];
export const FRONTMATTER = ['---', '', `${FRONTMATTER_KEY}: parsed`, '', '---', '', ''].join('\n');
export const DEFAULT_CONTENT = ['```sheet', '{}', '```'].join('\n');
export const BLANK_CONTENT = `${FRONTMATTER}\n${DEFAULT_CONTENT}`;
