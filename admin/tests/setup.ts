// Test Environment Setup & Browser Shims for Node 24 Test Runner

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;

if (typeof (globalThis as any).window === 'undefined') {
  const listeners: Record<string, Array<(event: any) => void>> = {};

  (globalThis as any).window = {
    location: {
      href: 'https://nexgate.co.in/admin',
      pathname: '/admin/dashboard',
      reload: () => {},
    },
    addEventListener: (type: string, listener: (event: any) => void) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    },
    removeEventListener: (type: string, listener: (event: any) => void) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter(l => l !== listener);
    },
    dispatchEvent: (event: any) => {
      const type = event?.type;
      if (listeners[type]) {
        listeners[type].forEach(l => l(event));
      }
      return true;
    },
    URL: {
      createObjectURL: () => 'blob:mock-url',
      revokeObjectURL: () => {},
    },
  };
}

if (typeof (globalThis as any).CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params: { detail?: any } = {}) {
      this.type = type;
      this.detail = params.detail;
    }
  };
}

export { mockStorage };

