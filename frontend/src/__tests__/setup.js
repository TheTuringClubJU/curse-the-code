import '@testing-library/jest-dom';

// Mock Web Audio API for jsdom test runner
class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }
  resume() { return Promise.resolve(); }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      connect: () => {},
    };
  }
  createBuffer() {
    return {
      getChannelData: () => new Float32Array(100),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
}

window.AudioContext = MockAudioContext;
window.webkitAudioContext = MockAudioContext;

// Mock 2D and WebGL Contexts using Proxy so any Canvas method call works smoothly
const noop = () => {};
const createMock2DContext = () => new Proxy({
  canvas: {},
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w || 512) * (h || 512) * 4)) }),
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w || 512) * (h || 512) * 4)) }),
  measureText: () => ({ width: 0 }),
  createLinearGradient: () => ({ addColorStop: noop }),
  createRadialGradient: () => ({ addColorStop: noop }),
}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return noop;
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  }
});

const createMockWebGLContext = () => new Proxy({
  canvas: {},
  getExtension: () => null,
  getParameter: () => 0,
  createTexture: () => ({}),
  createBuffer: () => ({}),
  createProgram: () => ({}),
  createShader: () => ({}),
}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return noop;
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  }
});

HTMLCanvasElement.prototype.getContext = function (contextType) {
  if (contextType === '2d') {
    return createMock2DContext();
  }
  return createMockWebGLContext();
};

HTMLCanvasElement.prototype.toDataURL = function () {
  return 'data:image/png;base64,';
};

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
}
if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}
