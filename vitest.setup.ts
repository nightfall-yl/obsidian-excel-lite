// Mock window.moment for Obsidian emulation in tests
if (typeof window !== 'undefined') {
  (window as any).moment = () => ({
    locale: () => 'en',
    format: (fmt: string) => fmt,
  });
  (window as any).moment.locale = () => 'en';
  (window as any).moment.localeData = () => ({});

  // Polyfill Path2D — @univerjs/sheets-filter-ui imports it at module load time
  if (typeof (window as any).Path2D === 'undefined') {
    (window as any).Path2D = class Path2D {
      constructor(_path?: string | Path2D) {}
      addPath(_path: Path2D, _transform?: DOMMatrix2DInit) {}
      closePath() {}
      moveTo(_x: number, _y: number) {}
      lineTo(_x: number, _y: number) {}
      bezierCurveTo(_cp1x: number, _cp1y: number, _cp2x: number, _cp2y: number, _x: number, _y: number) {}
      quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number) {}
      arc(_x: number, _y: number, _radius: number, _startAngle: number, _endAngle: number, _counterclockwise?: boolean) {}
      arcTo(_x1: number, _y1: number, _x2: number, _y2: number, _radius: number) {}
      ellipse(_x: number, _y: number, _radiusX: number, _radiusY: number, _rotation: number, _startAngle: number, _endAngle: number, _counterclockwise?: boolean) {}
      rect(_x: number, _y: number, _width: number, _height: number) {}
    };
  }
}