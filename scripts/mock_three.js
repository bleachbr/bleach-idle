/**
 * Minimal Three.js stub for headless Node.js tests without node_modules/three.
 */

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
}

export class Euler {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
}

export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
  set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
  copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
}

export class Color {
  constructor(color) { this.set(color); }
  set(c) { this.color = c; return this; }
  setHex(hex) { this.hex = hex; return this; }
}

export class Object3D {
  constructor() {
    this.name = '';
    this.children = [];
    this.parent = null;
    this.userData = {};
    this.position = new Vector3();
    this.rotation = new Euler();
    this.quaternion = new Quaternion();
    this.scale = new Vector3(1, 1, 1);
  }

  add(child) {
    if (child) {
      child.parent = this;
      this.children.push(child);
    }
    return this;
  }

  remove(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parent = null;
      this.children.splice(idx, 1);
    }
    return this;
  }

  traverse(fn) {
    fn(this);
    for (const child of [...this.children]) {
      child.traverse(fn);
    }
  }

  rotateZ(angle) {
    this.rotation.z += angle;
    return this;
  }
}

export class Scene extends Object3D {}
export class Group extends Object3D {}

export class Material {
  constructor(opts = {}) {
    this.color = new Color(0xffffff);
    this.map = null;
    this.needsUpdate = false;
    Object.assign(this, opts);
  }
}

export class MeshStandardMaterial extends Material {}
export class MeshBasicMaterial extends Material {}

export class BufferGeometry {
  constructor() {}
  translate(x, y, z) { return this; }
  rotateX(angle) { return this; }
  rotateY(angle) { return this; }
  rotateZ(angle) { return this; }
  scale(x, y, z) { return this; }
  dispose() {}
}

export class PlaneGeometry extends BufferGeometry {
  constructor(w = 1, h = 1) {
    super();
    this.w = w;
    this.h = h;
  }
}

export class CircleGeometry extends BufferGeometry {
  constructor(radius = 1, segments = 8) {
    super();
    this.radius = radius;
    this.segments = segments;
  }
}

export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

export class CanvasTexture {
  constructor(canvas) {
    this.canvas = canvas;
    this.magFilter = null;
    this.minFilter = null;
    this.colorSpace = null;
    this.needsUpdate = false;
  }
}

export const NearestFilter = 1003;
export const LinearFilter = 1006;
export const SRGBColorSpace = 'srgb';
export const DoubleSide = 2;
