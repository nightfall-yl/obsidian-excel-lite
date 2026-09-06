import { describe, it, expect } from 'vitest';
import { parseSheetFile, workbookDataToMarkdown, createBlankSheetData, isSheetFile } from './data-utils';

describe('createBlankSheetData', () => {
  it('should create a blank workbook with default sheet', () => {
    const data = createBlankSheetData('test-path');
    expect(data.id).toBe('test-path');
    expect(data.name).toBe('test-path');
    expect(data.sheetOrder).toEqual(['sheet-1']);
    expect(data.sheets['sheet-1']).toBeDefined();
    expect(data.sheets['sheet-1'].rowCount).toBe(100);
    expect(data.sheets['sheet-1'].columnCount).toBe(26);
    expect(data.sheets['sheet-1'].cellData).toEqual({});
  });

  it('should use default id when no path given', () => {
    const data = createBlankSheetData();
    expect(data.id).toBe('new-sheet');
  });
});

describe('workbookDataToMarkdown', () => {
  it('should produce frontmatter + sheet code block', () => {
    const data = createBlankSheetData('test');
    const markdown = workbookDataToMarkdown(data);
    expect(markdown).toContain('---');
    expect(markdown).toContain('excel-lite: parsed');
    expect(markdown).toContain('```sheet');
    expect(markdown).toContain('```');
    expect(markdown).toContain(JSON.stringify(data));
  });
});

describe('parseSheetFile', () => {
  it('should parse a valid sheet markdown file', () => {
    const data = createBlankSheetData('test');
    const markdown = workbookDataToMarkdown(data);
    const parsed = parseSheetFile(markdown, 'test');
    expect(parsed).toBeDefined();
    expect(parsed!.id).toBe('test');
    expect(parsed!.sheetOrder).toEqual(['sheet-1']);
  });

  it('should return undefined for non-sheet content', () => {
    const result = parseSheetFile('# Hello\n\nThis is a note.');
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty content', () => {
    const result = parseSheetFile('');
    expect(result).toBeUndefined();
  });

  it('should handle invalid JSON gracefully', () => {
    const content = '---\nexcel-lite: parsed\n---\n\n```sheet\n{invalid json\n```';
    const result = parseSheetFile(content);
    expect(result).toBeUndefined();
  });
});

describe('isSheetFile', () => {
  it('should detect frontmatter key', () => {
    expect(isSheetFile('excel-lite:')).toBe(true);
  });

  it('should detect sheet code block', () => {
    expect(isSheetFile('```sheet')).toBe(true);
  });

  it('should return false for plain text', () => {
    expect(isSheetFile('hello world')).toBe(false);
  });
});