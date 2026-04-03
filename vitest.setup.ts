import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

if (!globalThis.matchMedia) {
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

class DOMMatrixReadOnlyMock {
  m22: number;

  m41: number;

  m42: number;

  constructor(transform?: string) {
    const translateMatch =
      typeof transform === 'string'
        ? transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/)
        : null;

    this.m22 = 1;
    this.m41 = translateMatch ? Number(translateMatch[1]) : 0;
    this.m42 = translateMatch ? Number(translateMatch[2]) : 0;
  }
}

if (!globalThis.DOMMatrixReadOnly) {
  Object.defineProperty(globalThis, 'DOMMatrixReadOnly', {
    configurable: true,
    writable: true,
    value: DOMMatrixReadOnlyMock,
  });
}
