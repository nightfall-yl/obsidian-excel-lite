// Mock window.moment for Obsidian emulation in tests
if (typeof window !== 'undefined') {
  (window as any).moment = () => ({
    locale: () => 'en',
    format: (fmt: string) => fmt,
  });
  (window as any).moment.locale = () => 'en';
  (window as any).moment.localeData = () => ({});
}