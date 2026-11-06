import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import { ThreeLobby, initThreeLobby, isWebGLAvailable } from "../src/threeLobby";

function createMockElement(tagName = "div"): any {
  const classes = new Set<string>();
  const listeners: Record<string, Function[]> = {};
  const children: any[] = [];

  const el: any = {
    tagName: tagName.toUpperCase(),
    className: "",
    style: {},
    clientWidth: 800,
    clientHeight: 600,
    children,
    parentElement: null,
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    classList: {
      add: (c: string) => {
        classes.add(c);
        el.className = Array.from(classes).join(" ");
      },
      remove: (c: string) => {
        classes.delete(c);
        el.className = Array.from(classes).join(" ");
      },
      toggle: (c: string, force?: boolean) => {
        const has = classes.has(c);
        const next = force !== undefined ? force : !has;
        if (next) classes.add(c);
        else classes.delete(c);
        el.className = Array.from(classes).join(" ");
        return next;
      },
      contains: (c: string) => classes.has(c),
    },
    addEventListener: (ev: string, fn: Function) => {
      (listeners[ev] ??= []).push(fn);
    },
    removeEventListener: (ev: string, fn: Function) => {
      if (listeners[ev]) {
        listeners[ev] = listeners[ev].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (ev: { type: string }) => {
      listeners[ev.type]?.forEach((fn) => fn(ev));
    },
    prepend: (...items: any[]) => {
      for (const item of items) {
        item.parentElement = el;
        children.unshift(item);
      }
    },
    append: (...items: any[]) => {
      for (const item of items) {
        item.parentElement = el;
        children.push(item);
      }
    },
    remove: vi.fn(function () {
      if (el.parentElement) {
        const idx = el.parentElement.children.indexOf(el);
        if (idx !== -1) el.parentElement.children.splice(idx, 1);
        el.parentElement = null;
      }
    }),
    querySelector: (sel: string) => {
      return children.find((c) => {
        if (sel.startsWith(".")) return c.classList?.contains(sel.slice(1));
        return false;
      }) ?? null;
    },
    closest: (sel: string) => null,
  };
  return el;
}

function createMockRenderer() {
  return {
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    toneMapping: 0,
    toneMappingExposure: 1,
    domElement: createMockElement("canvas"),
  } as unknown as THREE.WebGLRenderer;
}

const savedGlobal = {
  document: (globalThis as any).document,
  window: (globalThis as any).window,
  performance: (globalThis as any).performance,
  requestAnimationFrame: (globalThis as any).requestAnimationFrame,
  cancelAnimationFrame: (globalThis as any).cancelAnimationFrame,
};

describe("ThreeLobby (JH-07)", () => {
  let mockContainer: any;
  let windowListeners: Record<string, Function[]>;

  beforeEach(() => {
    windowListeners = {};
    mockContainer = createMockElement("div");

    (globalThis as any).document = {
      createElement: (tag: string) => createMockElement(tag),
      querySelector: (sel: string) => mockContainer.querySelector(sel),
    };

    (globalThis as any).window = {
      devicePixelRatio: 1,
      innerWidth: 1024,
      innerHeight: 768,
      WebGLRenderingContext: class {},
      addEventListener: (ev: string, fn: Function) => {
        (windowListeners[ev] ??= []).push(fn);
      },
      removeEventListener: (ev: string, fn: Function) => {
        if (windowListeners[ev]) {
          windowListeners[ev] = windowListeners[ev].filter((f) => f !== fn);
        }
      },
      dispatchEvent: (ev: { type: string }) => {
        windowListeners[ev.type]?.forEach((fn) => fn(ev));
      },
    };

    (globalThis as any).requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
    (globalThis as any).cancelAnimationFrame = vi.fn((id) => clearTimeout(id));
    (globalThis as any).performance = { now: () => Date.now() };
  });

  afterEach(() => {
    Object.assign(globalThis, savedGlobal);
  });

  describe("Fallback gracioso quando WebGL não está disponível", () => {
    it("detecta ausência de WebGL sem lançar erro", () => {
      // Remove suporte a WebGL
      delete (globalThis as any).window.WebGLRenderingContext;

      expect(isWebGLAvailable()).toBe(false);

      const lobby = initThreeLobby({ container: mockContainer });
      expect(lobby.isWebGLSupported()).toBe(false);
      expect(mockContainer.classList.contains("three-lobby-fallback")).toBe(true);
      expect(mockContainer.classList.contains("has-3d-lobby")).toBe(false);

      // Métodos continuam operando de forma segura
      expect(() => lobby.pause()).not.toThrow();
      expect(() => lobby.resume()).not.toThrow();
      expect(() => lobby.setGender("f")).not.toThrow();
      expect(lobby.getGender()).toBe("f");
      expect(() => lobby.dispose()).not.toThrow();
    });

    it("triggerEntryTransition resolve imediatamente no fallback", async () => {
      delete (globalThis as any).window.WebGLRenderingContext;

      const lobby = initThreeLobby({ container: mockContainer });
      const onComplete = vi.fn();

      await lobby.triggerEntryTransition(onComplete);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe("Inicialização com WebGL suportado", () => {
    it("inicializa cena, renderer, canvas e flash", () => {
      const mockRenderer = createMockRenderer();
      const lobby = new ThreeLobby({
        container: mockContainer,
        rendererFactory: () => mockRenderer,
      });

      expect(lobby.isWebGLSupported()).toBe(true);
      expect(mockContainer.classList.contains("has-3d-lobby")).toBe(true);
      expect(mockRenderer.setSize).toHaveBeenCalledWith(800, 600);
      expect(mockContainer.children.length).toBeGreaterThanOrEqual(2); // flash + canvas

      lobby.dispose();
    });

    it("respeita preferência do jogador habilitada ou desabilitada", () => {
      const mockRenderer = createMockRenderer();
      const lobby = new ThreeLobby({
        container: mockContainer,
        enabled: false,
        rendererFactory: () => mockRenderer,
      });

      expect(lobby.isEnabled()).toBe(false);
      expect(lobby.isActive()).toBe(false);

      lobby.setEnabled(true);
      expect(lobby.isEnabled()).toBe(true);
      expect(lobby.isActive()).toBe(true);

      lobby.setEnabled(false);
      expect(lobby.isEnabled()).toBe(false);
      expect(lobby.isActive()).toBe(false);

      lobby.dispose();
    });

    it("atualiza modelo e cabelo ao trocar gênero (M/F)", () => {
      const mockRenderer = createMockRenderer();
      const lobby = new ThreeLobby({
        container: mockContainer,
        initialGender: "m",
        rendererFactory: () => mockRenderer,
      });

      expect(lobby.getGender()).toBe("m");

      lobby.setGender("f");
      expect(lobby.getGender()).toBe("f");

      // Transição de volta para masculino
      lobby.setGender("m");
      expect(lobby.getGender()).toBe("m");

      lobby.dispose();
    });
  });

  describe("Desmontagem de recursos e prevenção de memory leak", () => {
    it("descarta geometrias, materiais e renderer ao chamar dispose()", () => {
      const mockRenderer = createMockRenderer();
      const lobby = new ThreeLobby({
        container: mockContainer,
        rendererFactory: () => mockRenderer,
      });

      // Spy em dispose do prototype de BufferGeometry e Material
      const geoDisposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
      const matDisposeSpy = vi.spyOn(THREE.Material.prototype, "dispose");

      lobby.dispose();

      expect(mockRenderer.dispose).toHaveBeenCalled();
      expect(geoDisposeSpy).toHaveBeenCalled();
      expect(matDisposeSpy).toHaveBeenCalled();
      expect(mockContainer.classList.contains("has-3d-lobby")).toBe(false);

      // Chamada repetida de dispose não causa erros
      expect(() => lobby.dispose()).not.toThrow();

      geoDisposeSpy.mockRestore();
      matDisposeSpy.mockRestore();
    });

    it("remove event listeners de window ao chamar dispose()", () => {
      const mockRenderer = createMockRenderer();
      const lobby = new ThreeLobby({
        container: mockContainer,
        rendererFactory: () => mockRenderer,
      });

      expect(windowListeners["resize"]?.length).toBeGreaterThan(0);
      expect(windowListeners["pointermove"]?.length).toBeGreaterThan(0);

      lobby.dispose();

      expect(windowListeners["resize"]?.length).toBe(0);
      expect(windowListeners["pointermove"]?.length).toBe(0);
    });
  });

  describe("Resposta a redimensionamento de janela (resize)", () => {
    it("atualiza proporção da câmera e viewport do renderer", () => {
      const mockRenderer = createMockRenderer();
      const lobby = new ThreeLobby({
        container: mockContainer,
        rendererFactory: () => mockRenderer,
      });

      lobby.resize(1280, 720);
      expect(mockRenderer.setSize).toHaveBeenCalledWith(1280, 720);

      lobby.dispose();
    });

    it("evento window resize invoca resize automaticamente", () => {
      const mockRenderer = createMockRenderer();
      const lobby = new ThreeLobby({
        container: mockContainer,
        rendererFactory: () => mockRenderer,
      });

      mockContainer.clientWidth = 1920;
      mockContainer.clientHeight = 1080;

      // Dispara resize na window
      (globalThis as any).window.dispatchEvent({ type: "resize" });

      expect(mockRenderer.setSize).toHaveBeenCalledWith(1920, 1080);

      lobby.dispose();
    });
  });

  describe("Transição de entrada no mundo (triggerEntryTransition)", () => {
    it("executa transição de câmera com flash de luz e resolve promise", async () => {
      const mockRenderer = createMockRenderer();
      const lobby = new ThreeLobby({
        container: mockContainer,
        rendererFactory: () => mockRenderer,
      });

      const onComplete = vi.fn();
      const transitionPromise = lobby.triggerEntryTransition(onComplete);

      await transitionPromise;
      expect(onComplete).toHaveBeenCalled();

      lobby.dispose();
    });
  });
});
