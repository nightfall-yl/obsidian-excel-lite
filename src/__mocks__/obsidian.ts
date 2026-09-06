export const Platform = {
  isDesktop: true,
  isMobile: false,
  isDesktopApp: true,
  isMobileApp: false,
  isIosApp: false,
  isAndroidApp: false,
};

export class Plugin {}
export class TFile {}
export class TFolder {}
export class WorkspaceLeaf {}
export class TextFileView {}
export class ViewState {}
export class Notice {}
export class Setting {}
export class SettingTab {}
export class PluginSettingTab {}
export class AbstractInputSuggest {}
export class MarkdownRenderChild {}

export function normalizePath(p: string): string {
  return p;
}

export function debounce(fn: Function, _wait: number): Function {
  return fn;
}

export function setIcon(): void {}