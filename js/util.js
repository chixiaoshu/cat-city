/* CAT / TRANSFORM CITY — shared helpers */
(function () {
  'use strict';
  const CTC = (window.CTC = window.CTC || {});
  const U = (CTC.util = {});

  U.TAU = Math.PI * 2;
  U.deg = (d) => (d * Math.PI) / 180;
  U.clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.inv = (a, b, v) => U.clamp((v - a) / (b - a));
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeInCubic = (t) => t * t * t;
  U.easeOutBack = (t, s = 1.70158) => {
    const c3 = s + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  };
  U.easeOutElastic = (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  };
  /* mechanical, ratcheting ease: n little overshooting clicks */
  U.ratchet = (t, n = 3) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const x = t * n;
    const i = Math.floor(x);
    const f = x - i;
    return (i + U.easeOutBack(U.clamp(f * 1.25), 2.2)) / n;
  };
  /* wrap angle into [0, TAU) */
  U.wrap = (a) => ((a % U.TAU) + U.TAU) % U.TAU;
  /* signed shortest angular difference b - a in (-PI, PI] */
  U.angDiff = (a, b) => {
    let d = U.wrap(b - a);
    if (d > Math.PI) d -= U.TAU;
    return d;
  };

  /* seeded random */
  U.rng = function (seed) {
    let s = seed >>> 0;
    const f = function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (a, b) => a + (b - a) * f();
    f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  };
  U.rand = U.rng(20261119);

  U.polar = (phi, r, y = 0, out) => (out || new THREE.Vector3()).set(r * Math.cos(phi), y, r * Math.sin(phi));
  U.tangent = (phi, out) => (out || new THREE.Vector3()).set(-Math.sin(phi), 0, Math.cos(phi));
  U.radial = (phi, out) => (out || new THREE.Vector3()).set(Math.cos(phi), 0, Math.sin(phi));

  U.canvasTex = function (w, h, draw, opts = {}) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    if (opts.repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    }
    t.anisotropy = 4;
    return t;
  };

  /* merge several (possibly indexed) geometries into one non-indexed geometry with vertex colours */
  U.merge = function (parts) {
    const pos = [];
    const nor = [];
    const col = [];
    const uv = [];
    const c = new THREE.Color();
    for (const p of parts) {
      let g = p.geo;
      if (p.matrix) g = g.clone().applyMatrix4(p.matrix);
      g = g.index ? g.toNonIndexed() : g;
      if (!g.attributes.normal) g.computeVertexNormals();
      c.set(p.color === undefined ? 0xffffff : p.color);
      const P = g.attributes.position.array;
      const Nn = g.attributes.normal.array;
      const UV = g.attributes.uv ? g.attributes.uv.array : null;
      for (let i = 0; i < P.length; i++) {
        pos.push(P[i]);
        nor.push(Nn[i]);
      }
      const n = P.length / 3;
      for (let i = 0; i < n; i++) {
        col.push(c.r, c.g, c.b);
        if (UV) uv.push(UV[i * 2], UV[i * 2 + 1]);
        else uv.push(0, 0);
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return out;
  };

  U.mat4 = (pos, rot, scl) => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    if (rot) q.setFromEuler(rot instanceof THREE.Euler ? rot : new THREE.Euler(rot[0] || 0, rot[1] || 0, rot[2] || 0));
    m.compose(
      pos instanceof THREE.Vector3 ? pos : new THREE.Vector3(pos[0], pos[1], pos[2]),
      q,
      scl ? (scl instanceof THREE.Vector3 ? scl : new THREE.Vector3(scl[0], scl[1], scl[2])) : new THREE.Vector3(1, 1, 1)
    );
    return m;
  };

  U.fmtTime = (h) => {
    h = ((h % 24) + 24) % 24;
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  };

  /* multi-stop colour ramp: stops = [[hour, hex], ...] sorted, wraps at 24 */
  U.ramp = function (stops) {
    const cols = stops.map((s) => [s[0], new THREE.Color(s[1])]);
    const tmp = new THREE.Color();
    return function (h, out) {
      out = out || tmp;
      h = ((h % 24) + 24) % 24;
      for (let i = 0; i < cols.length; i++) {
        const a = cols[i];
        const b = cols[(i + 1) % cols.length];
        const ha = a[0];
        let hb = b[0];
        if (hb <= ha) hb += 24;
        let hh = h;
        if (hh < ha) hh += 24;
        if (hh >= ha && hh <= hb) {
          return out.copy(a[1]).lerp(b[1], U.smooth((hh - ha) / (hb - ha)));
        }
      }
      return out.copy(cols[0][1]);
    };
  };
  U.scalarRamp = function (stops) {
    return function (h) {
      h = ((h % 24) + 24) % 24;
      for (let i = 0; i < stops.length; i++) {
        const a = stops[i];
        const b = stops[(i + 1) % stops.length];
        let hb = b[0];
        if (hb <= a[0]) hb += 24;
        let hh = h;
        if (hh < a[0]) hh += 24;
        if (hh >= a[0] && hh <= hb) return U.lerp(a[1], b[1], U.smooth((hh - a[0]) / (hb - a[0])));
      }
      return stops[0][1];
    };
  };
})();
