/* eslint-disable @typescript-eslint/no-explicit-any */

// Obsidian global declarations for activeWindow / activeDocument
declare var activeWindow: Window & {
  createEl<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: { cls?: string; attr?: Record<string, string>; text?: string },
  ): HTMLElementTagNameMap[K];
  createDiv(options?: { cls?: string; attr?: Record<string, string> }): HTMLDivElement;
  createSpan(options?: { cls?: string; attr?: Record<string, string> }): HTMLSpanElement;
};
declare var activeDocument: Document;

declare module '@univerjs/core/facade' {
  import type { Univer, IWorkbookData } from '@univerjs/core';

  export interface FUniver {
    Event: {
      LifeCycleChanged: string;
      CommandExecuted: string;
    };
    createWorkbook(data: IWorkbookData): FWorkbook;
    getActiveWorkbook(): FWorkbook | null;
    addEvent(event: string, callback: (res: any) => void): { dispose: () => void };
    disposeUnit(id: string): void;
    dispose(): void;
    setPermissionDialogVisible(visible: boolean): void;
    executeCommand(id: string, params: any): boolean;
  }

  export interface FWorkbook {
    getId(): string;
    save(): IWorkbookData;
    getActiveSheet(): FWorksheet | null;
    setActiveSheet(sheetId: string): void;
    getWorkbookPermission(): {
      setReadOnly(): void;
    };
    getSheets(): FWorksheet[];
  }

  export interface FWorksheet {
    getSheetId(): string;
    getName(): string;
    getSheet(): { id: string; name: string };
    getSelection(): FSelection | null;
  }

  export interface FSelection {
    getActiveRange(): FRange | null;
  }

  export interface FRange {
    getRow(): number;
    getColumn(): number;
    getHeight(): number;
    getWidth(): number;
  }

  export const FUniver: {
    newAPI(univer: Univer): FUniver;
  };
}

declare module '@univerjs/core' {
  interface Univer {
    __getInjector(): any;
  }
}

declare module '@univerjs/design/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/design/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/docs-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/docs-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-formula/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-formula/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-formula-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-formula-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-numfmt-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-numfmt-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-filter-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-filter-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-sort/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-sort/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-sort-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-sort-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/find-replace/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/find-replace/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/thread-comment-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/thread-comment-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-thread-comment-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-thread-comment-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-hyper-link-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-hyper-link-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-note-ui/lib/es/locale/zh-CN' {
  const value: Record<string, any>;
  export default value;
}
declare module '@univerjs/sheets-note-ui/lib/es/locale/en-US' {
  const value: Record<string, any>;
  export default value;
}
