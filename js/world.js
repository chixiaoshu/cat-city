/* CAT / TRANSFORM CITY — the world.
 *
 * Every visible piece of the sleeping cat is a rigid paper part with two poses:
 * one on the cat, one in the city. A single global progress value P (0 = cat,
 * 1 = city) drives every part through its own little window of the
 * choreography: lift off the body, flip, travel, land, ratchet upward.
 *
 *   fur plates  -> rooftops (fur side up: the city keeps its tabby stripes)
 *   spine plates-> Main Street (flipped over: asphalt was on the underside)
 *   inner body  -> the groundwork the districts stand on (morph target)
 *   tail        -> the Circle Line railway; tail tip -> the locomotive
 *   ears        -> observatory & radio towers;  whiskers -> cableways
 *   eyelids     -> bridges over Belly Lake;     muzzle -> Town Hall dome
 *   nose        -> the Nose Spire;              skull  -> Cranium Plaza
 *   paws        -> plazas whose fountains are toe beans
 *   collar      -> lake promenade; bell -> the bell tower; heart -> Purr Reactor
 */
(function () {
  'use strict';
  const T = THREE;
  const U = CTC.util;
  const W = (CTC.world = {});

  // ---------------------------------------------------------------- layout
  const R = 8, RW = 4.5, RH = 3.6;
  const N = 14, M = 6;
  const SPAN = U.deg(282);
  const PHI0 = U.deg(-62);
  const DPHI = SPAN / N;
  const THICK = 0.14;
  const GROUND = 0.12;
  const RAIL_R = 14.6;
  const CUSHION_R = 18.6;
  const ROWS = [
    { r: 4.9, d: 1.05, road: false },
    { r: 6.65, d: 1.2, road: false },
    { r: 8.0, d: 1.0, road: true },
    { r: 9.0, d: 1.0, road: true },
    { r: 10.45, d: 1.35, road: false },
    { r: 12.35, d: 1.45, road: false },
  ];
  const LANES = { prom: 3.98, alleyIn: 5.78, main: 8.5, alleyOut: 11.5, outer: 13.55 };
  const PHI_C = PHI0 + SPAN + (U.TAU - SPAN) / 2; // civic centre angle
  const HEAD_PHI = PHI0 + SPAN + U.deg(19);
  Object.assign(W, { R, RW, RH, N, M, SPAN, PHI0, DPHI, GROUND, RAIL_R, ROWS, LANES, PHI_C, CUSHION_R });

  const fs = (s) => 0.86 + 0.16 * Math.sin(Math.PI * Math.min(1, s * 1.1)) - 0.12 * s;
  function surf(s, a, out, k = 1) {
    const phi = PHI0 + s * SPAN;
    const f = fs(s) * k;
    const rr = R - RW * f * Math.cos(a);
    return (out || new T.Vector3()).set(rr * Math.cos(phi), RH * f * Math.sin(a), rr * Math.sin(phi));
  }
  const UP = new T.Vector3(0, 1, 0);
  function quatFromXY(x, y) {
    const z = new T.Vector3().crossVectors(x, y).normalize();
    const m = new T.Matrix4().makeBasis(x.clone().normalize(), y.clone().normalize(), z);
    return new T.Quaternion().setFromRotationMatrix(m);
  }
  function quatFromYZ(y, z) {
    const yy = y.clone().normalize();
    const x = new T.Vector3().crossVectors(yy, z).normalize();
    const zz = new T.Vector3().crossVectors(x, yy).normalize();
    return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, yy, zz));
  }
  const cityQuat = (phi, flip) => {
    const t = U.tangent(phi);
    return flip ? quatFromXY(t.negate(), UP.clone().negate()) : quatFromXY(t, UP);
  };

  // ------------------------------------------------------------ materials
  const rnd = U.rng(7);
  const paperTex = U.canvasTex(
    256,
    256,
    (g, w, h) => {
      const id = g.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const v = 232 + Math.random() * 23;
        id.data[i * 4] = v;
        id.data[i * 4 + 1] = v - 2;
        id.data[i * 4 + 2] = v - 6;
        id.data[i * 4 + 3] = 255;
      }
      g.putImageData(id, 0, 0);
      g.strokeStyle = 'rgba(120,90,60,0.07)';
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6.28, l = 4 + Math.random() * 14;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
    },
    { repeat: true }
  );
  W.paperTex = paperTex;
  const mat = (color, o = {}) =>
    new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.9, metalness: 0, flatShading: true, map: paperTex }, o));
  W.mat = mat;

  const COL = {
    fur: 0xe8843c,
    furDark: 0xc65f27,
    furLight: 0xf0a15a,
    cream: 0xf6e2c0,
    pink: 0xf29aae,
    inner: 0xb4522a,
    kraft: 0xd8bf96,
    asphalt: 0x585468,
    edge: 0xf7ecd9,
    under: 0xc9a27a,
    eye: 0x3a2418,
    gold: 0xe8b84a,
    red: 0xd8383d,
    cushion: 0x8fb0a6,
    water: 0x4fa7b0,
  };
  W.COL = COL;

  const asphaltTex = U.canvasTex(
    128,
    128,
    (g, w, h) => {
      g.fillStyle = '#5a566c';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 600; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
        g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      g.fillStyle = '#efe6cf';
      g.fillRect(0, 4, w, 5);
      g.fillRect(0, h - 9, w, 5);
      g.fillStyle = '#f2c14e';
      for (let x = 14; x < w - 22; x += 26) g.fillRect(x, h / 2 - 3, 13, 6);
      g.fillStyle = '#efe6cf';
      for (let y = 14; y < h - 14; y += 12) g.fillRect(2, y, 12, 7);
    }
  );
  const asphaltMat = new T.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95, flatShading: true });
  const edgeMat = mat(COL.edge);
  const underMat = mat(COL.under);

  // windows: 8x8 grid; map (day) and emissive (night) share one random layout
  const winRnd = U.rng(99);
  const litLayout = [];
  for (let i = 0; i < 64; i++) litLayout.push(winRnd() < 0.62 ? 0.55 + winRnd() * 0.45 : 0);
  const winDraw = (lit) => (g, w, h) => {
    g.fillStyle = lit ? '#000' : '#ffffff';
    g.fillRect(0, 0, w, h);
    if (!lit) {
      const id = g.getImageData(0, 0, w, h);
      for (let i = 0; i < w * h; i++) {
        const v = 236 + Math.random() * 19;
        id.data[i * 4] = id.data[i * 4 + 1] = v;
        id.data[i * 4 + 2] = v - 4;
      }
      g.putImageData(id, 0, 0);
    }
    const c = w / 8;
    for (let i = 0; i < 64; i++) {
      const x = (i % 8) * c, y = Math.floor(i / 8) * c;
      if (lit) {
        const l = litLayout[i];
        if (!l) continue;
        g.fillStyle = `rgba(255,${200 + l * 40},${110 + l * 80},${l})`;
      } else g.fillStyle = '#5d6a86';
      g.fillRect(x + c * 0.3, y + c * 0.22, c * 0.4, c * 0.5);
      if (!lit) {
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x + c * 0.3, y + c * 0.22, c * 0.4, c * 0.08);
        g.fillStyle = '#e9dccb';
        g.fillRect(x + c * 0.26, y + c * 0.72, c * 0.48, c * 0.06);
      }
    }
  };
  const winMap = U.canvasTex(256, 256, winDraw(false), { repeat: true });
  const winEmi = U.canvasTex(256, 256, winDraw(true), { repeat: true });
  const WALL_COLS = [0xfbeee0, 0xf7d6d0, 0xd5e8d4, 0xd3e0f0, 0xfbe7b5, 0xe6dcf2];
  const wallMats = WALL_COLS.map(
    (c) =>
      new T.MeshStandardMaterial({
        color: c,
        map: winMap,
        emissiveMap: winEmi,
        emissive: 0xffc36b,
        emissiveIntensity: 0,
        roughness: 0.9,
        flatShading: true,
      })
  );
  W.wallMats = wallMats;

  // glow sprite
  const glowTex = U.canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
  W.glowTex = glowTex;
  const glows = [];
  function glow(color, size) {
    const s = new T.Sprite(
      new T.SpriteMaterial({ map: glowTex, color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })
    );
    s.scale.set(size, size, size);
    s.userData.size = size;
    glows.push(s);
    return s;
  }

  // ------------------------------------------------------------ geometry
  /* thin slab from a convex polygon in local coords (top surface), extruded down */
  function slabGeo(pts, thick) {
    const n = pts.length;
    let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
    for (const p of pts) {
      minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x);
      minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z);
    }
    const uvOf = (p) => [(p.x - minx) / (maxx - minx || 1), (p.z - minz) / (maxz - minz || 1)];
    const bot = pts.map((p) => new T.Vector3(p.x, p.y - thick, p.z));
    const pos = [], uv = [];
    const g = new T.BufferGeometry();
    const push = (p, u) => { pos.push(p.x, p.y, p.z); uv.push(u[0], u[1]); };
    let start = 0;
    for (let i = 1; i < n - 1; i++) { push(pts[0], uvOf(pts[0])); push(pts[i], uvOf(pts[i])); push(pts[i + 1], uvOf(pts[i + 1])); }
    g.addGroup(start, pos.length / 3 - start, 0);
    start = pos.length / 3;
    for (let i = 1; i < n - 1; i++) { push(bot[0], uvOf(bot[0])); push(bot[i + 1], uvOf(bot[i + 1])); push(bot[i], uvOf(bot[i])); }
    g.addGroup(start, pos.length / 3 - start, 1);
    start = pos.length / 3;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      push(pts[i], [0, 0]); push(bot[i], [0, 1]); push(bot[j], [1, 1]);
      push(pts[i], [0, 0]); push(bot[j], [1, 1]); push(pts[j], [1, 0]);
    }
    g.addGroup(start, pos.length / 3 - start, 2);
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  /* take a world-space polygon on the cat's surface, build a slab mesh and its cat pose */
  function surfacePiece(worldPts, outward, xHint) {
    const c = new T.Vector3();
    worldPts.forEach((p) => c.add(p));
    c.divideScalar(worldPts.length);
    let n = new T.Vector3().subVectors(worldPts[1], worldPts[0]).cross(new T.Vector3().subVectors(worldPts[2], worldPts[0])).normalize();
    if (n.dot(outward) < 0) {
      worldPts = worldPts.slice().reverse();
      n.negate();
    }
    const x = xHint.clone().addScaledVector(n, -xHint.dot(n)).normalize();
    const z = new T.Vector3().crossVectors(x, n).normalize();
    const local = worldPts.map((p) => {
      const d = new T.Vector3().subVectors(p, c);
      return new T.Vector3(d.dot(x), d.dot(n), d.dot(z));
    });
    let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
    local.forEach((p) => { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); minz = Math.min(minz, p.z); maxz = Math.max(maxz, p.z); });
    const q = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, n, z));
    return { local, center: c, quat: q, normal: n, sx: maxx - minx, sz: maxz - minz };
  }

  // ------------------------------------------------------------ part system
  const pieces = [];
  const details = [];
  W.pieces = pieces;
  W.details = details;
  W.pickables = [];
  W.onLand = null;
  W.onPop = null;

  const _wq = new T.Quaternion();
  class Piece {
    constructor(obj, o) {
      this.wiggle = 0;
      this.wiggleAxis = new T.Vector3(0, 0, 1);
      this.obj = obj;
      obj.rotation.order = 'XYZ';
      this.catPos = o.catPos.clone();
      this.catQuat = o.catQuat.clone();
      this.catScale = (o.catScale || new T.Vector3(1, 1, 1)).clone();
      this.cityPos = o.cityPos.clone();
      this.cityQuat = o.cityQuat.clone();
      this.cityScale = (o.cityScale || this.catScale).clone();
      this.a = o.a;
      this.b = o.b;
      this.lift = (o.lift || new T.Vector3(0, 1, 0)).clone();
      this.hover = o.hover !== undefined ? o.hover : 1.6;
      this.arc = o.arc !== undefined ? o.arc : 2.0;
      this.extraY = o.extraY || null;
      this.kind = o.kind || 'part';
      this.k = o.k || 0;
      this.catNormal = (o.catNormal || UP).clone();
      this.ruffle = 0;
      this.lastQ = -1;
      this.q = 0;
      this.p0 = new T.Vector3();
      this.p1 = new T.Vector3();
      this.p2 = new T.Vector3();
      pieces.push(this);
    }
    update(P) {
      const q = U.clamp((P - this.a) / (this.b - this.a));
      this.q = q;
      const o = this.obj;
      if (q <= 0) {
        o.position.copy(this.catPos).addScaledVector(this.catNormal, this.ruffle);
        o.quaternion.copy(this.catQuat);
        if (this.wiggle) o.quaternion.multiply(_wq.setFromAxisAngle(this.wiggleAxis, this.wiggle));
        o.scale.copy(this.catScale);
      } else if (q >= 1) {
        o.position.copy(this.cityPos);
        o.quaternion.copy(this.cityQuat);
        o.scale.copy(this.cityScale);
      } else if (q < 0.2) {
        const t = U.easeOutCubic(q / 0.2);
        o.position.copy(this.catPos).addScaledVector(this.lift, t);
        o.quaternion.copy(this.catQuat);
        o.scale.copy(this.catScale);
      } else if (q < 0.8) {
        const t = U.easeInOutCubic((q - 0.2) / 0.6);
        this.p0.copy(this.catPos).add(this.lift);
        this.p2.copy(this.cityPos);
        this.p2.y += this.hover;
        this.p1.addVectors(this.p0, this.p2).multiplyScalar(0.5);
        this.p1.y = Math.max(this.p0.y, this.p2.y) + this.arc;
        const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        o.position.set(
          a * this.p0.x + b * this.p1.x + c * this.p2.x,
          a * this.p0.y + b * this.p1.y + c * this.p2.y,
          a * this.p0.z + b * this.p1.z + c * this.p2.z
        );
        o.quaternion.slerpQuaternions(this.catQuat, this.cityQuat, t);
        o.scale.lerpVectors(this.catScale, this.cityScale, t);
      } else {
        const t = U.easeInCubic((q - 0.8) / 0.2);
        o.position.copy(this.cityPos);
        o.position.y += this.hover * (1 - t);
        o.quaternion.copy(this.cityQuat);
        o.scale.copy(this.cityScale);
      }
      if (this.extraY && q >= 1) o.position.y += this.extraY(P);
      if (this.lastQ >= 0) {
        if (this.lastQ < 1 && q >= 1 && W.onLand) W.onLand(this, true);
        if (this.lastQ > 0 && q <= 0 && W.onLand) W.onLand(this, false);
      }
      this.lastQ = q;
    }
  }

  class Detail {
    constructor(obj, a, b, mode = 'pop') {
      this.obj = obj;
      this.a = a;
      this.b = b;
      this.mode = mode;
      this.base = obj.scale.clone();
      this.rx = obj.rotation.x;
      obj.rotation.order = 'YXZ';
      this.last = -1;
      obj.visible = false;
      details.push(this);
    }
    update(P) {
      const d = U.clamp((P - this.a) / (this.b - this.a));
      const o = this.obj;
      o.visible = d > 0.002;
      if (this.last >= 0 && this.last < 0.5 && d >= 0.5 && W.onPop && this.mode === 'pop') W.onPop(this);
      this.last = d;
      if (!o.visible) return;
      if (this.mode === 'pop') {
        const e = Math.max(0.001, U.easeOutBack(d, 2.0));
        o.scale.set(this.base.x * e, this.base.y * e, this.base.z * e);
        o.rotation.x = this.rx - (1 - U.easeOutCubic(d)) * 1.45;
      } else if (this.mode === 'grow') {
        const e = Math.max(0.001, U.easeOutCubic(d));
        o.scale.set(this.base.x, this.base.y * e, this.base.z);
      } else if (this.mode === 'spread') {
        const e = Math.max(0.001, U.easeOutBack(d, 1.2));
        o.scale.set(this.base.x * e, this.base.y, this.base.z * e);
      } else if (this.mode === 'fade') {
        o.scale.copy(this.base);
        if (o.material) o.material.opacity = d;
      }
    }
  }
  W.Piece = Piece;
  W.Detail = Detail;

  function info(obj, data) {
    obj.traverse((m) => {
      if (m.isMesh) {
        m.userData.info = data;
        W.pickables.push(m);
      }
    });
  }
  function shadows(obj, cast = true, recv = true) {
    obj.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = cast;
        m.receiveShadow = recv;
      }
    });
  }

  // ------------------------------------------------------------ names
  const DISTRICTS = [
    { name: 'Haunch Heights', from: 'the haunches', ks: [-1, 0, 1, 2] },
    { name: 'Tuna Wharf', from: 'belly & lower back', ks: [3, 4, 5, 6] },
    { name: 'Ribcage Downtown', from: 'ribs & mid-back', ks: [7, 8, 9, 10] },
    { name: 'Scruff Quarter', from: 'shoulders & scruff', ks: [11, 12, 13] },
  ];
  const districtOf = (k) => DISTRICTS.find((d) => d.ks.includes(k)) || DISTRICTS[0];
  W.districtOf = districtOf;
  const ROW_ANAT = ['belly fur (inside the curl)', 'lower flank', 'spine', 'spine', 'upper flank', 'outer flank'];
  const GENERIC = {
    'Haunch Heights': ['Purrington Flats', 'The Kneading Arms', 'Biscuit Row', 'Snooze Terrace', 'Mittens Walk-up', 'Loaf Apartments', 'Velvet Paw Lofts', 'Sunspot Mansions'],
    'Tuna Wharf': ['Sardine Cold Store', 'Net Loft No. 2', 'Tin Can Cannery', 'Salmon Exchange', 'Kipper & Sons', 'Dockside Dormitory', 'The Brine House'],
    'Ribcage Downtown': ['The Kibble Exchange', 'Grand Hotel Meowtropole', 'Scratching Post Tower', 'Treat Trust Bank', 'Whisker Court', 'Tabby Towers', 'The Loaf Building'],
    'Scruff Quarter': ['Cardigan House', 'Old Litter Post Office', 'The Dozing Gardens', 'Hairpin Lofts', 'Scruff Hall', 'Cushion Court'],
  };
  const QUIRKS = [
    'Residents: mostly asleep.',
    'Every tenant is named Mochi. Mail delivery is chaos.',
    'Sunniest windowsill in the district — booked until 2031.',
    'One resident is a very loud tenor. He sings at 3 a.m.',
    'Lift is out of order. Nobody minds; everyone jumps.',
    'A strict no-dogs policy, enforced by a single elderly tortoiseshell.',
    'The radiators are warm. The waiting list is long.',
    'Rent is paid in dead moths. Landlord is not thrilled.',
    'Built on the exact spot where the cat had an itch.',
    'Contains 41 cardboard boxes, 3 of them furniture.',
    'Rooftop reserved for the 12:30 nap.',
    'Haunted by a friendly ghost who knocks pens off desks.',
  ];
  const SPECIAL = {
    '4,4': { name: 'Tuna Works', desc: 'Cannery & chimney. The smoke comes out fish-shaped because the workers insisted.', deco: 'chimney', h: 2.3 },
    '5,5': { name: 'Yarn Mill', desc: 'Spins the moon’s spare thread into city blankets.', deco: 'yarn', h: 2.0 },
    '8,5': { name: 'Ministry of Naps', desc: 'The tallest building in the city. Almost always empty: everyone is napping elsewhere.', deco: 'antenna', h: 5.6 },
    '9,4': { name: 'Laser Dot Arcade', desc: 'Where the red dot lives. Nobody has ever caught it. (Try the laser tool.)', deco: 'laser', h: 3.4 },
    '7,1': { name: 'Bureau of Sunbeams', desc: 'Tracks every sunbeam in the city and reserves the warmest ones.', deco: 'solar', h: 2.4 },
    '6,0': { name: 'Fish Market', desc: 'Opens at 18:00 sharp. Closes when the fish run out (18:04).', deco: 'awning', h: 0.7 },
    '11,4': { name: 'Library of Lost Hair Ties', desc: '4,812 hair ties, all recovered from under sofas. None returned.', deco: 'tank', h: 2.6 },
    '12,1': { name: 'Hairball Clinic', desc: 'Walk-ins welcome. Please knock (on the table, then push something off it).', deco: 'cross', h: 1.6 },
    '10,0': { name: 'Catnip Café', desc: 'Lakeside. Service is unpredictable. Ambience: extremely relaxed.', deco: 'awning', h: 0.9 },
    '1,4': { name: 'Museum of Cardboard Boxes', desc: 'Free entry. Exhibits are frequently occupied.', deco: 'box', h: 1.8 },
    '2,1': { name: 'School of Knocking Things Off Tables', desc: 'Advanced classes in gravity, taught by experience.', deco: 'bell', h: 1.6 },
    '0,5': { name: 'Treat Trust Bank', desc: 'Interest paid in crunchies, compounded at dinner time.', deco: 'tank', h: 2.0 },
    '-1,4': { name: 'Tailbone Terminal', desc: 'Main station of the Circle Line. Built where the tail meets the body.', deco: 'clock', h: 1.5 },
    '13,5': { name: 'Old Litter Post Office', desc: 'Delivers every letter, eventually — after sitting on it for a while.', deco: 'antenna', h: 1.8 },
    '7,5': { name: 'Grand Hotel Meowtropole', desc: 'Five stars, eight lives remaining. Breakfast served on the windowsill.', deco: 'antenna', h: 4.4 },
  };

  // ------------------------------------------------------------ build
  W.build = function (scene) {
    W.scene = scene;
    const root = (W.root = new T.Group());
    scene.add(root);
    const catGroup = (W.catGroup = new T.Group());
    root.add(catGroup);
    W.buildings = [];
    W.envBuild(scene);

    // --- cushion (ground) -------------------------------------------------
    const cushion = new T.Mesh(new T.CylinderGeometry(CUSHION_R, CUSHION_R + 0.4, 1.4, 96, 1), mat(COL.cushion));
    cushion.position.y = -0.7;
    cushion.receiveShadow = true;
    root.add(cushion);
    const piping = new T.Mesh(new T.TorusGeometry(CUSHION_R + 0.05, 0.22, 6, 96), mat(0xe9d8b8));
    piping.rotation.x = Math.PI / 2;
    piping.position.y = -0.02;
    root.add(piping);
    // tufted buttons in the cushion
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * U.TAU + 0.2;
      const b = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.06, 8), mat(0x6f938a));
      b.position.copy(U.polar(a, 16.6, 0.01));
      root.add(b);
    }
    W.cushion = cushion;
    info(cushion, { title: 'The Cushion', formerly: 'where the cat sleeps', desc: 'Countryside, parkland, and the softest ground for 18 units in any direction.' });

    // --- inner body / groundwork (morph target) ---------------------------
    const coreMat = mat(COL.inner);
    W.coreMat = coreMat;
    const SUB = 3, A = 12;
    const rumpCore = surf(0, Math.PI / 2, null, 0).setY(0).addScaledVector(U.tangent(PHI0), 0.6);
    for (let k = -1; k < N; k++) {
      const pos = [], posCity = [], uv = [], idx = [];
      for (let si = 0; si <= SUB; si++) {
        const s = (k + si / SUB) / N;
        const phi = PHI0 + s * SPAN;
        for (let ai = 0; ai <= A; ai++) {
          const a = (ai / A) * Math.PI;
          // segment -1 starts folded up small, hidden inside the rump
          const p = k >= 0 ? surf(s, a, null, 0.965) : surf(0, a, null, 0.965).sub(rumpCore).multiplyScalar(0.3).add(rumpCore);
          pos.push(p.x, p.y, p.z);
          const rr = U.lerp(3.55, 13.35, ai / A);
          const yy = ai === 0 || ai === A ? 0 : GROUND;
          posCity.push(rr * Math.cos(phi), yy, rr * Math.sin(phi));
          uv.push(s * 4, ai / A);
        }
      }
      const row = A + 1;
      for (let si = 0; si < SUB; si++)
        for (let ai = 0; ai < A; ai++) {
          const a0 = si * row + ai, a1 = a0 + 1, b0 = a0 + row, b1 = b0 + 1;
          idx.push(a0, b0, b1, a0, b1, a1);
        }
      // end caps (rump / neck) as fans
      const addCap = (si, flip) => {
        const s = (k + si / SUB) / N;
        const c = surf(s, Math.PI / 2, null, 0.0);
        const base = pos.length / 3;
        pos.push(c.x, 0.8, c.z);
        const phi = PHI0 + s * SPAN;
        posCity.push(R * Math.cos(phi), GROUND, R * Math.sin(phi));
        uv.push(0.5, 0.5);
        for (let ai = 0; ai < A; ai++) {
          const i0 = si * row + ai, i1 = i0 + 1;
          if (flip) idx.push(base, i1, i0);
          else idx.push(base, i0, i1);
        }
      };
      if (k === 0) addCap(0, false);
      if (k === N - 1) addCap(SUB, true);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.morphAttributes.position = [new T.Float32BufferAttribute(posCity, 3)];
      g.computeVertexNormals();
      const m = new T.Mesh(g, coreMat);
      m.morphTargetInfluences = [0];
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.coreK = k;
      catGroup.add(m);
      (W.cores = W.cores || []).push(m);
      info(m, { title: 'The Groundwork', formerly: 'the warm inside of the cat', desc: 'Flattened flat as a biscuit. Every district stands on it. Pleasantly warm underfoot.' });
    }

    // --- fur plates -> rooftops & Main Street ------------------------------
    const plateStart = (k) => 0.16 + (k + 1) * 0.02;
    W.plateStart = plateStart;
    const furColor = (k, j) => {
      if (j === 0) return COL.cream;
      const stripe = (k + (j >= 4 ? 1 : 0)) % 3 === 1;
      let c = new T.Color(stripe ? COL.furDark : COL.fur);
      if (j === 5 || j === 1) c.lerp(new T.Color(COL.furLight), 0.25);
      c.offsetHSL(0, 0, (rnd() - 0.5) * 0.04);
      return c;
    };
    const AL = [0, 1, 2, 3, 4, 5, 6].map((j) => (j / 6) * Math.PI);
    const buildPlate = (k, j, worldPts, outward, xHint, isCap) => {
      const sp = surfacePiece(worldPts, outward, xHint);
      const geo = slabGeo(sp.local, THICK);
      const row = ROWS[j];
      const furMat = mat(furColor(k, j));
      const mesh = new T.Mesh(geo, [furMat, row.road ? asphaltMat : underMat, edgeMat]);
      shadows(mesh);
      catGroup.add(mesh);
      const kk = isCap ? -1 : k;
      const phi = PHI0 + (kk + 0.5) * DPHI;
      const dist = districtOf(kk);
      const fill = row.road ? 1.04 : isCap ? 0.62 : 0.78;
      const tl = row.r * DPHI * fill;
      const cityScale = new T.Vector3(tl / sp.sx, 1, (row.road ? row.d * 1.02 : row.d) / sp.sz);
      const start = plateStart(kk) + j * 0.006;
      const lift = sp.normal.clone().multiplyScalar(0.9 + j * 0.12);
      let cityY = GROUND + (row.road ? 0.0 : THICK);
      const piece = new Piece(mesh, {
        catPos: sp.center,
        catQuat: sp.quat,
        cityPos: U.polar(phi, row.r, cityY),
        cityQuat: cityQuat(phi, row.road),
        cityScale,
        a: start,
        b: start + 0.2,
        lift,
        catNormal: sp.normal,
        hover: 1.2 + j * 0.25,
        arc: 1.2 + (j % 3) * 0.6,
        kind: row.road ? 'road' : 'roof',
        k: kk,
      });
      piece.j = j;
      if (row.road) {
        info(mesh, {
          title: 'Main Street',
          formerly: 'the spine (' + dist.from + ')',
          desc: 'The backbone of the city, flipped over. The asphalt was on the underside of the fur all along.',
          catTitle: 'spine · ' + dist.from,
        });
        return piece;
      }
      // building beneath the roof
      const key = kk + ',' + j;
      const sp2 = SPECIAL[key];
      let h;
      if (sp2 && sp2.h) h = sp2.h;
      else {
        const base = dist.name === 'Ribcage Downtown' ? 2.6 : dist.name === 'Tuna Wharf' ? 1.5 : dist.name === 'Scruff Quarter' ? 1.5 : 1.25;
        h = base * (j === 0 ? 0.55 : j === 1 ? 0.85 : j === 4 ? 1.0 : 1.2) * (0.75 + rnd() * 0.6);
        if (dist.name === 'Ribcage Downtown' && j >= 4) h += rnd() * 1.6;
      }
      h = Math.max(0.6, h);
      const inset = 0.9;
      const foot = sp.local.map((p) => new T.Vector2(p.x * cityScale.x * inset, p.z * cityScale.z * inset));
      const wallGeo = wallGeometry(foot, h);
      const wm = wallMats[Math.floor(rnd() * wallMats.length)];
      const wall = new T.Mesh(wallGeo, wm);
      shadows(wall);
      wall.position.copy(U.polar(phi, row.r, GROUND));
      wall.quaternion.copy(cityQuat(phi, false));
      wall.visible = false;
      catGroup.add(wall);
      const wa = start + 0.215, wb = start + 0.31;
      const building = {
        k: kk, j, phi, r: row.r, d: row.d, h, tl: tl * inset,
        roofY: GROUND + h + THICK,
        doorR: j <= 1 ? LANES.alleyIn : LANES.alleyOut,
        name: sp2 ? sp2.name : GENERIC[dist.name][(Math.abs(kk * 7 + j * 3)) % GENERIC[dist.name].length],
        district: dist.name,
        wall, roof: mesh, special: sp2 ? key : null,
        residents: 0,
        wa, wb,
      };
      W.buildings.push(building);
      wall.userData.building = building;
      piece.extraY = (P) => h * U.ratchet(U.clamp((P - wa) / (wb - wa)), 3);
      W.walls = W.walls || [];
      W.walls.push({ wall, a: wa, b: wb, h, building });
      const desc = sp2 ? sp2.desc : QUIRKS[(Math.abs(kk * 5 + j * 11)) % QUIRKS.length];
      const inf = {
        title: building.name,
        formerly: 'fur plate · ' + ROW_ANAT[j] + ', ' + dist.from,
        desc,
        district: dist.name,
        catTitle: ROW_ANAT[j] + ' · ' + dist.from,
        catFuture: building.name,
        building,
      };
      info(mesh, inf);
      info(wall, inf);
      roofDecor(building, mesh, cityScale, sp, start + 0.3);
      return piece;
    };
    for (let k = 0; k < N; k++) {
      const s0 = k / N, s1 = (k + 1) / N;
      for (let j = 0; j < M; j++) {
        const c00 = surf(s0, AL[j]), c10 = surf(s1, AL[j]), c11 = surf(s1, AL[j + 1]), c01 = surf(s0, AL[j + 1]);
        const mid = surf((s0 + s1) / 2, (AL[j] + AL[j + 1]) / 2);
        const spineMid = surf((s0 + s1) / 2, Math.PI / 2, null, 0);
        spineMid.y = 0;
        const out = new T.Vector3().subVectors(mid, spineMid).normalize();
        const xh = new T.Vector3().subVectors(c10, c00).add(new T.Vector3().subVectors(c11, c01));
        buildPlate(k, j, [c00, c10, c11, c01], out, xh, false);
      }
    }
    // rump: a rounded truncated cone of plates (segment -1) plus one end plate
    {
      const t0 = U.tangent(PHI0);
      const spine0 = surf(0, Math.PI / 2, null, 0);
      spine0.y = 0;
      const back = spine0.clone().addScaledVector(t0, -2.0);
      const Q = AL.map((a) => {
        const p = surf(0, a);
        return back.clone().add(p.sub(spine0).multiplyScalar(0.42));
      });
      const axis = spine0.clone().addScaledVector(t0, -1.0);
      for (let j = 0; j < M; j++) {
        const pa = surf(0, AL[j]), pb = surf(0, AL[j + 1]);
        const mid = pa.clone().add(pb).add(Q[j]).add(Q[j + 1]).multiplyScalar(0.25);
        const out = mid.clone().sub(axis).normalize();
        const xh = new T.Vector3().subVectors(pa, Q[j]).add(new T.Vector3().subVectors(pb, Q[j + 1]));
        buildPlate(-1, j, [Q[j], pa, pb, Q[j + 1]], out, xh, false);
      }
      // the very end of the cat -> the station canopy
      const sp = surfacePiece(Q.slice(), t0.clone().negate(), U.radial(PHI0));
      const geo = slabGeo(sp.local, THICK);
      const mesh = new T.Mesh(geo, [mat(COL.furDark), underMat, edgeMat]);
      shadows(mesh);
      catGroup.add(mesh);
      const sphi = PHI0 - U.deg(8);
      new Piece(mesh, {
        catPos: sp.center, catQuat: sp.quat, catNormal: sp.normal,
        cityPos: U.polar(sphi, RAIL_R + 1.1, 1.25 + THICK), cityQuat: quatFromXY(U.tangent(sphi), UP),
        cityScale: new T.Vector3(3.6 / sp.sx, 1, 1.5 / sp.sz),
        a: plateStart(-1) + 0.1, b: plateStart(-1) + 0.32, lift: t0.clone().multiplyScalar(-1.2), hover: 1.6, arc: 2.2, kind: 'canopy',
      });
      info(mesh, { title: 'Tailbone Terminal canopy', formerly: 'the very end of the cat', desc: 'Keeps the rain off the Circle Line platform. Faintly warm. Nobody asks why.', catTitle: 'rump', catFuture: 'the station canopy' });
    }

    buildHead(catGroup);
    buildTail(catGroup);
    buildCityDetails(catGroup);
    W.catCenter = new T.Vector3(0, 1.8, 0);
  };

  /* extruded walls for a footprint polygon, windows mapped in world units */
  function wallGeometry(foot, h) {
    const pos = [], uv = [];
    const n = foot.length;
    let acc = 0;
    const UNIT = 0.42 * 8;
    const VUNIT = 0.5 * 8;
    // order footprint counter-clockwise when seen from above (+y): signed area in x/z
    let area = 0;
    for (let i = 0; i < n; i++) {
      const a = foot[i], b = foot[(i + 1) % n];
      area += a.x * b.y - b.x * a.y;
    }
    const f = area < 0 ? foot : foot.slice().reverse();
    for (let i = 0; i < n; i++) {
      const a = f[i], b = f[(i + 1) % n];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const u0 = acc / UNIT, u1 = (acc + len) / UNIT;
      acc += len;
      const v1 = h / VUNIT;
      pos.push(a.x, 0, a.y, b.x, 0, b.y, b.x, 1, b.y, a.x, 0, a.y, b.x, 1, b.y, a.x, 1, a.y);
      uv.push(u0, 0, u1, 0, u1, v1, u0, 0, u1, v1, u0, v1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    // make sure faces point outward (flip if centroid test fails)
    const p = g.attributes.position, nn = g.attributes.normal;
    const ax = p.getX(0) + p.getX(1), az = p.getZ(0) + p.getZ(1);
    if (nn.getX(0) * ax + nn.getZ(0) * az < 0) {
      const arr = p.array;
      for (let i = 0; i < arr.length; i += 9) {
        for (let c = 0; c < 3; c++) {
          const t = arr[i + 3 + c];
          arr[i + 3 + c] = arr[i + 6 + c];
          arr[i + 6 + c] = t;
        }
      }
      const uva = g.attributes.uv.array;
      for (let i = 0; i < uva.length; i += 6) {
        for (let c = 0; c < 2; c++) {
          const t = uva[i + 2 + c];
          uva[i + 2 + c] = uva[i + 4 + c];
          uva[i + 4 + c] = t;
        }
      }
      g.computeVertexNormals();
    }
    return g;
  }

  // ------------------------------------------------------------ roof decor
  const decoGeo = {
    tank: U.merge([
      { geo: new T.CylinderGeometry(0.16, 0.16, 0.3, 8), matrix: U.mat4([0, 0.27, 0]), color: 0xa8775a },
      { geo: new T.ConeGeometry(0.18, 0.14, 8), matrix: U.mat4([0, 0.49, 0]), color: 0x7b5b48 },
      { geo: new T.BoxGeometry(0.03, 0.12, 0.03), matrix: U.mat4([0.1, 0.06, 0.1]), color: 0x555 },
      { geo: new T.BoxGeometry(0.03, 0.12, 0.03), matrix: U.mat4([-0.1, 0.06, -0.1]), color: 0x555 },
      { geo: new T.BoxGeometry(0.03, 0.12, 0.03), matrix: U.mat4([0.1, 0.06, -0.1]), color: 0x555 },
      { geo: new T.BoxGeometry(0.03, 0.12, 0.03), matrix: U.mat4([-0.1, 0.06, 0.1]), color: 0x555 },
    ]),
    chimney: U.merge([
      { geo: new T.BoxGeometry(0.16, 0.42, 0.16), matrix: U.mat4([0, 0.21, 0]), color: 0xb9553e },
      { geo: new T.BoxGeometry(0.2, 0.05, 0.2), matrix: U.mat4([0, 0.43, 0]), color: 0x6b3a2c },
    ]),
    bigChimney: U.merge([
      { geo: new T.CylinderGeometry(0.16, 0.24, 1.6, 8), matrix: U.mat4([0, 0.8, 0]), color: 0xc9cfd6 },
      { geo: new T.CylinderGeometry(0.17, 0.17, 0.12, 8), matrix: U.mat4([0, 1.2, 0]), color: 0xd8383d },
      { geo: new T.CylinderGeometry(0.17, 0.17, 0.12, 8), matrix: U.mat4([0, 0.8, 0]), color: 0xd8383d },
    ]),
    antenna: U.merge([
      { geo: new T.CylinderGeometry(0.02, 0.03, 1.1, 4), matrix: U.mat4([0, 0.55, 0]), color: 0x6a6a7a },
      { geo: new T.BoxGeometry(0.3, 0.02, 0.02), matrix: U.mat4([0, 0.8, 0]), color: 0x6a6a7a },
      { geo: new T.BoxGeometry(0.2, 0.02, 0.02), matrix: U.mat4([0, 0.95, 0]), color: 0x6a6a7a },
      { geo: new T.SphereGeometry(0.04, 6, 4), matrix: U.mat4([0, 1.12, 0]), color: 0xff4444 },
    ]),
    bed: U.merge([
      { geo: new T.TorusGeometry(0.17, 0.07, 5, 10), matrix: U.mat4([0, 0.06, 0], [Math.PI / 2, 0, 0]), color: 0x4f7fa8 },
      { geo: new T.CylinderGeometry(0.16, 0.16, 0.04, 10), matrix: U.mat4([0, 0.03, 0]), color: 0xf2ead8 },
    ]),
    bed2: U.merge([
      { geo: new T.TorusGeometry(0.17, 0.07, 5, 10), matrix: U.mat4([0, 0.06, 0], [Math.PI / 2, 0, 0]), color: 0xc4504a },
      { geo: new T.CylinderGeometry(0.16, 0.16, 0.04, 10), matrix: U.mat4([0, 0.03, 0]), color: 0xf2ead8 },
    ]),
    planter: U.merge([
      { geo: new T.BoxGeometry(0.4, 0.1, 0.16), matrix: U.mat4([0, 0.05, 0]), color: 0x9a6a4a },
      { geo: new T.IcosahedronGeometry(0.1, 0), matrix: U.mat4([-0.12, 0.15, 0]), color: 0x6aa86a },
      { geo: new T.IcosahedronGeometry(0.12, 0), matrix: U.mat4([0.05, 0.17, 0]), color: 0x7fbf6a },
      { geo: new T.IcosahedronGeometry(0.08, 0), matrix: U.mat4([0.15, 0.14, 0]), color: 0xe98aa6 },
    ]),
    solar: U.merge([
      { geo: new T.BoxGeometry(0.5, 0.03, 0.3), matrix: U.mat4([0, 0.16, 0], [-0.5, 0, 0]), color: 0x34507a },
      { geo: new T.BoxGeometry(0.5, 0.03, 0.3), matrix: U.mat4([0, 0.16, 0.35], [-0.5, 0, 0]), color: 0x34507a },
      { geo: new T.BoxGeometry(0.04, 0.16, 0.04), matrix: U.mat4([0, 0.08, 0]), color: 0x777 },
      { geo: new T.BoxGeometry(0.04, 0.16, 0.04), matrix: U.mat4([0, 0.08, 0.35]), color: 0x777 },
    ]),
    box: U.merge([
      { geo: new T.BoxGeometry(0.5, 0.36, 0.42), matrix: U.mat4([0, 0.18, 0]), color: 0xc8955e },
      { geo: new T.BoxGeometry(0.5, 0.02, 0.2), matrix: U.mat4([0, 0.4, 0.27], [0.9, 0, 0]), color: 0xb5834f },
      { geo: new T.BoxGeometry(0.5, 0.02, 0.2), matrix: U.mat4([0, 0.4, -0.27], [-0.9, 0, 0]), color: 0xb5834f },
    ]),
    awning: U.merge([
      { geo: new T.BoxGeometry(0.9, 0.04, 0.5), matrix: U.mat4([0, 0.5, 0], [0.25, 0, 0]), color: 0xe24e4e },
      { geo: new T.BoxGeometry(0.3, 0.045, 0.5), matrix: U.mat4([0, 0.505, 0], [0.25, 0, 0]), color: 0xffffff },
      { geo: new T.BoxGeometry(0.04, 0.5, 0.04), matrix: U.mat4([0.4, 0.25, 0.2]), color: 0x8a6a4a },
      { geo: new T.BoxGeometry(0.04, 0.5, 0.04), matrix: U.mat4([-0.4, 0.25, 0.2]), color: 0x8a6a4a },
    ]),
    cross: U.merge([
      { geo: new T.BoxGeometry(0.36, 0.12, 0.06), matrix: U.mat4([0, 0.5, 0]), color: 0x4fbf8f },
      { geo: new T.BoxGeometry(0.12, 0.36, 0.06), matrix: U.mat4([0, 0.5, 0]), color: 0x4fbf8f },
      { geo: new T.BoxGeometry(0.03, 0.32, 0.03), matrix: U.mat4([0, 0.16, 0]), color: 0x777 },
    ]),
    clock: U.merge([
      { geo: new T.BoxGeometry(0.34, 0.9, 0.34), matrix: U.mat4([0, 0.45, 0]), color: 0xf1e3c8 },
      { geo: new T.ConeGeometry(0.3, 0.4, 4), matrix: U.mat4([0, 1.1, 0], [0, Math.PI / 4, 0]), color: 0x6c4a8a },
      { geo: new T.CylinderGeometry(0.13, 0.13, 0.04, 12), matrix: U.mat4([0, 0.7, 0.18], [Math.PI / 2, 0, 0]), color: 0xffffff },
    ]),
    bell: U.merge([
      { geo: new T.BoxGeometry(0.3, 0.5, 0.3), matrix: U.mat4([0, 0.25, 0]), color: 0xf1e3c8 },
      { geo: new T.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), matrix: U.mat4([0, 0.38, 0]), color: 0xe8b84a },
      { geo: new T.ConeGeometry(0.24, 0.24, 4), matrix: U.mat4([0, 0.62, 0], [0, Math.PI / 4, 0]), color: 0x3a6a8a },
    ]),
  };
  const decoMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
  W.decoMat = decoMat;
  W.decoGeo = decoGeo;
  const yarnTex = U.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#d85a8a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,220,235,0.6)';
    g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      const y = (i / 26) * h * 1.6 - h * 0.3;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + 20, w * 0.7, y - 25, w, y + 8);
      g.stroke();
    }
  });
  W.yarnTex = yarnTex;

  function roofDecor(b, roof, cs, sp, a) {
    const comp = (s) => new T.Vector3(s / cs.x, s, s / cs.z);
    const add = (geo, lx, lz, s, matOverride) => {
      const m = new T.Mesh(geo, matOverride || decoMat);
      m.position.set(lx / cs.x, 0, lz / cs.z);
      m.scale.copy(comp(s));
      shadows(m);
      roof.add(m);
      new Detail(m, a + Math.random() * 0.03, a + 0.07 + Math.random() * 0.03);
      return m;
    };
    const ox = (b.tl * 0.5 - 0.25) * (Math.random() * 2 - 1);
    const oz = (b.d * 0.5 - 0.25) * (Math.random() * 2 - 1);
    const sk = b.special && SPECIAL[b.special].deco;
    if (sk === 'chimney') {
      b.chimney = add(decoGeo.bigChimney, 0.3, 0, 1);
      add(decoGeo.chimney, -0.5, 0.2, 1.2);
    } else if (sk === 'yarn') {
      const y = add(new T.SphereGeometry(0.42, 12, 10), 0, 0, 1, new T.MeshStandardMaterial({ map: yarnTex, roughness: 0.9 }));
      y.position.y = 0.38;
    } else if (sk === 'laser') {
      const dot = add(new T.SphereGeometry(0.14, 10, 8), 0, 0, 1, new T.MeshBasicMaterial({ color: 0xff2030 }));
      dot.position.y = 0.3;
      b.laserDot = dot;
      add(decoGeo.antenna, 0.5, 0.2, 0.8);
    } else if (sk && decoGeo[sk]) {
      add(decoGeo[sk], ox * 0.5, oz * 0.5, 1);
    } else {
      const r = Math.random();
      const pick = r < 0.2 ? null : r < 0.38 ? 'tank' : r < 0.54 ? 'chimney' : r < 0.66 ? 'antenna' : r < 0.76 ? 'bed' : r < 0.9 ? 'planter' : 'solar';
      if (pick) add(decoGeo[pick], ox, oz, 1);
      if (Math.random() < 0.1) add(decoGeo.bed2, -ox * 0.8, -oz * 0.6, 1);
    }
  }

  // ------------------------------------------------------------ head
  function buildHead(parent) {
    const hc = U.polar(HEAD_PHI, 7.35, 2.05);
    const t = U.tangent(HEAD_PHI), u = U.radial(HEAD_PHI);
    const fwd = t.clone().multiplyScalar(Math.cos(0.42)).addScaledVector(u, -Math.sin(0.42)).normalize();
    // head is tilted: nose a little down, rolled onto its side (sleeping)
    const hq = quatFromYZ(UP, fwd);
    hq.multiply(new T.Quaternion().setFromEuler(new T.Euler(0.18, 0, -0.2)));
    W.headPos = hc.clone();
    W.headQuat = hq.clone();
    W.headFwd = fwd.clone();
    const hm = new T.Matrix4().compose(hc, hq, new T.Vector3(1, 1, 1));
    const lp = (x, y, z) => new T.Vector3(x, y, z).applyMatrix4(hm);
    const lq = (ex, ey, ez) => hq.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(ex, ey, ez)));
    const lqq = (q) => hq.clone().multiply(q);

    const C = U.polar(PHI_C, 8.4, 0);
    W.civic = C;
    const head = (W.head = {});

    // skull -> Cranium Plaza
    const skull = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat(COL.fur));
    shadows(skull);
    parent.add(skull);
    new Piece(skull, {
      catPos: hc, catQuat: hq, catScale: new T.Vector3(2.45, 2.0, 2.2),
      cityPos: C.clone().setY(-0.02), cityQuat: cityQuat(PHI_C), cityScale: new T.Vector3(2.7, 0.26, 2.7),
      a: 0.5, b: 0.66, lift: new T.Vector3(0, 0.6, 0), hover: 0.6, arc: 0.8, kind: 'head',
    });
    info(skull, { title: 'Cranium Plaza', formerly: 'the skull', desc: 'The city’s thinking happens here — mostly about dinner.', catTitle: 'head', catFuture: 'Cranium Plaza' });
    head.skull = skull;
    // forehead tabby stripes -> plaza paving stripes
    for (let i = -1; i <= 1; i++) {
      const st = new T.Mesh(new T.BoxGeometry(0.16, 0.08, 0.9), mat(COL.furDark));
      shadows(st);
      parent.add(st);
      const c = C.clone().addScaledVector(U.radial(PHI_C), i * 0.55);
      c.y = 0.24;
      new Piece(st, {
        catPos: lp(i * 0.42, 1.82, 0.9 - Math.abs(i) * 0.1), catQuat: lq(-0.55, i * -0.15, 0),
        cityPos: c, cityQuat: cityQuat(PHI_C), cityScale: new T.Vector3(1.2, 1, 3.4),
        a: 0.56, b: 0.68, lift: new T.Vector3(0, 0.8, 0), hover: 0.8, arc: 0.6,
      });
    }

    // muzzle -> Town Hall dome
    const muzzle = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat(COL.cream));
    shadows(muzzle);
    parent.add(muzzle);
    new Piece(muzzle, {
      catPos: lp(0, -0.55, 1.75), catQuat: hq, catScale: new T.Vector3(1.15, 0.78, 0.82),
      cityPos: C.clone().setY(0.2), cityQuat: cityQuat(PHI_C), cityScale: new T.Vector3(1.05, 1.05, 1.05),
      a: 0.6, b: 0.74, lift: fwd.clone().multiplyScalar(0.8), hover: 1.5, arc: 1.4, kind: 'head',
    });
    info(muzzle, { title: 'Town Hall', formerly: 'the muzzle', desc: 'Council meets daily. Motions are carried by whoever sits on the paperwork first.', catTitle: 'muzzle', catFuture: 'Town Hall dome' });

    // nose -> spire
    const nose = new T.Mesh(new T.OctahedronGeometry(1, 0), mat(COL.pink));
    shadows(nose);
    parent.add(nose);
    new Piece(nose, {
      catPos: lp(0, -0.18, 2.5), catQuat: hq, catScale: new T.Vector3(0.3, 0.2, 0.22),
      cityPos: C.clone().setY(1.25), cityQuat: cityQuat(PHI_C), cityScale: new T.Vector3(0.32, 1.25, 0.32),
      a: 0.66, b: 0.78, lift: fwd.clone().multiplyScalar(0.6).add(new T.Vector3(0, 0.5, 0)), hover: 2.2, arc: 1.8, kind: 'nose',
    });
    const noseInfo = { title: 'The Nose Spire', formerly: 'the nose', desc: 'Tallest point of Town Hall. Do not boop. (Please boop.)', catTitle: 'nose', catFuture: 'the Nose Spire', boop: true };
    info(nose, noseInfo);
    head.nose = nose;

    // ears -> towers
    const earGeo = new T.ConeGeometry(0.8, 1.6, 4, 1);
    earGeo.translate(0, 0.8, 0);
    const innerGeo = new T.ConeGeometry(0.52, 1.15, 4, 1);
    innerGeo.translate(0, 0.575, 0);
    W.towerTops = [];
    [1, -1].forEach((side, i) => {
      const g = new T.Group();
      const outer = new T.Mesh(earGeo, mat(COL.fur));
      const inner = new T.Mesh(innerGeo, mat(COL.pink));
      inner.position.set(0, 0.05, 0.3);
      inner.rotation.y = Math.PI / 4;
      outer.rotation.y = Math.PI / 4;
      g.add(outer, inner);
      shadows(g);
      parent.add(g);
      const towerPhi = PHI_C + side * U.deg(10);
      const cityPos = U.polar(towerPhi, 11.7, 0);
      const toC = U.radial(towerPhi).negate();
      const towerScale = new T.Vector3(0.72, 3.4, 0.72);
      (W.ears = W.ears || []).push(new Piece(g, {
        catPos: lp(side * 1.25, 1.45, -0.15), catQuat: lq(-0.15, 0, -side * 0.38), catScale: new T.Vector3(1, 1, 1),
        cityPos, cityQuat: quatFromYZ(UP, toC), cityScale: towerScale,
        a: 0.56 + i * 0.03, b: 0.72 + i * 0.03, lift: new T.Vector3(0, 1.5, 0), hover: 2.5, arc: 2.0, kind: 'ear',
      }));
      const top = cityPos.clone().setY(1.6 * 3.4 - 0.5);
      W.towerTops.push(top);
      const beacon = glow(0xff4040, 1.6);
      beacon.position.copy(cityPos).setY(1.6 * 3.4 + 0.1);
      W.root.add(beacon);
      beacon.userData.blink = true;
      beacon.userData.gate = 0.78;
      info(
        g,
        side > 0
          ? { title: 'Left Ear Observatory', formerly: 'the left ear', desc: 'Listens for can-openers across three districts. Has never missed one.', catTitle: 'left ear', catFuture: 'Left Ear Observatory' }
          : { title: 'Right Ear Radio', formerly: 'the right ear', desc: 'Broadcasts 24-hour purr radio on 98.6 FM. Tonight: more purring.', catTitle: 'right ear', catFuture: 'Right Ear Radio tower' }
      );
    });

    // eyes -> bridges over Belly Lake
    const eyeGeo = new T.TorusGeometry(0.42, 0.075, 5, 12, Math.PI);
    [1, -1].forEach((side, i) => {
      const e = new T.Mesh(eyeGeo, mat(COL.eye));
      shadows(e);
      parent.add(e);
      const bphi = PHI_C + side * U.deg(26);
      const uu = U.radial(bphi);
      new Piece(e, {
        catPos: lp(side * 0.85, 0.35, 1.98), catQuat: lq(0.1, side * 0.42, Math.PI), catScale: new T.Vector3(1, 1, 1),
        cityPos: U.polar(bphi, 2.45, 0.02), cityQuat: quatFromXY(uu, UP), cityScale: new T.Vector3(3.1, 1.55, 3.4),
        a: 0.64 + i * 0.02, b: 0.78 + i * 0.02, lift: fwd.clone().multiplyScalar(0.8), hover: 1.2, arc: 2.6, kind: 'eye',
      });
      info(e, { title: side > 0 ? 'Sleepyeye Bridge (East)' : 'Sleepyeye Bridge (West)', formerly: 'a closed eyelid', desc: 'Connects the shore to the Purr Reactor. Still closes on Sundays.', catTitle: 'closed eye', catFuture: 'Sleepyeye Bridge' });
    });

    // whiskers -> cableways from the ear towers
    const wGeo = new T.CylinderGeometry(0.022, 0.022, 1, 4);
    wGeo.translate(0, 0.5, 0);
    W.cables = [];
    [1, -1].forEach((side, si) => {
      for (let i = 0; i < 3; i++) {
        const w = new T.Mesh(wGeo, mat(0xf7f0e6));
        w.castShadow = true;
        parent.add(w);
        const base = new T.Vector3(side * 0.92, -0.55 + (1 - i) * 0.14, 2.0);
        const dirL = new T.Vector3(side, 0.18 - i * 0.18, 0.3).normalize();
        const qL = new T.Quaternion().setFromUnitVectors(UP, dirL);
        const top = W.towerTops[si];
        const endPhi = PHI_C + side * U.deg(36 + i * 21);
        const end = U.polar(endPhi, 13.0 - i * 0.2, 2.9);
        const dir = new T.Vector3().subVectors(end, top);
        const len = dir.length();
        dir.normalize();
        new Piece(w, {
          catPos: lp(base.x, base.y, base.z), catQuat: lqq(qL), catScale: new T.Vector3(1, 2.1, 1),
          cityPos: top, cityQuat: new T.Quaternion().setFromUnitVectors(UP, dir), cityScale: new T.Vector3(1.6, len, 1.6),
          a: 0.7 + i * 0.012, b: 0.82 + i * 0.012, lift: new T.Vector3(side * 0.5, 0.6, 0), hover: 0.0, arc: 3.0, kind: 'whisker',
        });
        W.cables.push({ a: top, b: end, side, i });
        info(w, { title: 'Whisker Cableway', formerly: 'a whisker', desc: 'Gondolas run from the ear towers to the outer districts. Measures whether things fit through gaps. (They do.)', catTitle: 'whisker', catFuture: 'a cableway' });
      }
    });

    // front paws -> Bean Plazas (flipped: toe beans become fountains)
    const pawGeo = new T.IcosahedronGeometry(1, 1);
    const beanMat = mat(COL.pink);
    const mkPaw = () => {
      const g = new T.Group();
      const p = new T.Mesh(pawGeo, mat(COL.cream));
      p.scale.set(0.75, 0.42, 1.2);
      g.add(p);
      const beans = [[-0.33, 0.62, 0.12], [-0.11, 0.85, 0.13], [0.11, 0.85, 0.13], [0.33, 0.62, 0.12], [0, 0.05, 0.27]];
      beans.forEach(([x, z, r]) => {
        const b = new T.Mesh(new T.SphereGeometry(1, 10, 6), beanMat);
        b.scale.set(r, r * 0.7, r);
        b.position.set(x, -0.33, z * 0.9 - 0.1);
        g.add(b);
      });
      shadows(g);
      return g;
    };
    W.plazas = [];
    [1, -1].forEach((side, i) => {
      const g = mkPaw();
      parent.add(g);
      const pphi = PHI_C + side * U.deg(15);
      const cp = U.polar(pphi, 5.2, 0.2);
      new Piece(g, {
        catPos: lp(side * 0.95, -1.62, 1.35), catQuat: lq(0.12, side * 0.18, 0), catScale: new T.Vector3(1, 1, 1),
        cityPos: cp, cityQuat: cityQuat(pphi).multiply(new T.Quaternion().setFromEuler(new T.Euler(0, Math.PI / 2, Math.PI))), cityScale: new T.Vector3(2.6, 0.5, 2.2),
        a: 0.46 + i * 0.03, b: 0.62 + i * 0.03, lift: new T.Vector3(0, 1.4, 0), hover: 1.4, arc: 1.6, kind: 'paw',
      });
      W.plazas.push({ phi: pphi, r: 5.2, name: side > 0 ? 'Bean Plaza East' : 'Bean Plaza West', y: 0.24 });
      info(g, { title: side > 0 ? 'Bean Plaza East' : 'Bean Plaza West', formerly: 'a front paw', desc: 'The fountains are toe beans. Yes, really. Locals sit here to be adored.', catTitle: 'front paw', catFuture: 'Bean Plaza' });
    });
    // hind paw -> Heel Park
    {
      const g = mkPaw();
      parent.add(g);
      const t0 = U.tangent(PHI0 + U.deg(6));
      const cp = U.polar(PHI0 - U.deg(13), 11.9, 0.2);
      new Piece(g, {
        catPos: U.polar(PHI0 + U.deg(6), 12.7, 0.42), catQuat: quatFromYZ(UP, t0.clone().negate().addScaledVector(U.radial(PHI0), 0.6)), catScale: new T.Vector3(1.05, 1, 1.1),
        cityPos: cp, cityQuat: cityQuat(PHI0 - U.deg(13)).multiply(new T.Quaternion().setFromEuler(new T.Euler(0, 0, Math.PI))), cityScale: new T.Vector3(2.4, 0.5, 2.0),
        a: 0.4, b: 0.56, lift: new T.Vector3(0, 1.4, 0), hover: 1.2, arc: 1.2, kind: 'paw',
      });
      W.plazas.push({ phi: PHI0 - U.deg(13), r: 11.9, name: 'Heel Park', y: 0.24 });
      info(g, { title: 'Heel Park', formerly: 'a back foot', desc: 'Smells faintly of grass and judgement. Excellent for sprawling.', catTitle: 'back paw', catFuture: 'Heel Park' });
    }

    // collar -> lake promenade ring; bell -> bell tower
    {
      const s = 0.965;
      const sp = surf(s, Math.PI / 2, null, 0);
      sp.y = 0;
      const phi = PHI0 + s * SPAN;
      const f = fs(s);
      const tor = new T.Mesh(new T.TorusGeometry(1, 0.05, 6, 40), mat(COL.red));
      shadows(tor);
      parent.add(tor);
      const qCat = quatFromXY(U.radial(phi), UP);
      new Piece(tor, {
        catPos: sp, catQuat: qCat, catScale: new T.Vector3(RW * f * 1.03, RH * f * 1.03, 4),
        cityPos: new T.Vector3(0, 0.1, 0), cityQuat: new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, 0)), cityScale: new T.Vector3(3.82, 3.82, 3.4),
        a: 0.6, b: 0.72, lift: new T.Vector3(0, 0.6, 0), hover: 0.8, arc: 1.5, kind: 'collar',
      });
      info(tor, { title: 'Collar Promenade', formerly: 'the collar', desc: 'Red brick, very fashionable. Runs right around Belly Lake.', catTitle: 'collar', catFuture: 'Collar Promenade' });
      // bell
      const bell = new T.Group();
      const bm = mat(COL.gold, { roughness: 0.35, metalness: 0.6, map: null });
      const b1 = new T.Mesh(new T.SphereGeometry(0.34, 12, 8), bm);
      const b2 = new T.Mesh(new T.TorusGeometry(0.1, 0.03, 4, 8), bm);
      b2.position.y = 0.36;
      const b3 = new T.Mesh(new T.BoxGeometry(0.4, 0.04, 0.05), mat(0x5a3a1a));
      b3.position.y = -0.05;
      bell.add(b1, b2, b3);
      shadows(bell);
      parent.add(bell);
      const ca = U.deg(118);
      const cp = sp.clone().addScaledVector(U.radial(phi), -RW * f * 1.03 * Math.cos(ca) * 1.04);
      cp.y = RH * f * 1.03 * Math.sin(ca) - 0.25;
      const towerPos = U.polar(PHI_C, 12.6, 0);
      new Piece(bell, {
        catPos: cp, catQuat: qCat, catScale: new T.Vector3(1, 1, 1),
        cityPos: towerPos.clone().setY(3.05), cityQuat: cityQuat(PHI_C), cityScale: new T.Vector3(1.1, 1.1, 1.1),
        a: 0.68, b: 0.8, lift: new T.Vector3(0, 1.0, 0), hover: 2, arc: 2.5, kind: 'bell',
      });
      W.bell = bell;
      const bInfo = { title: 'The Collar Bell', formerly: 'the bell on the collar', desc: 'Rings at night to call everyone home — then the city folds up. Click to ring it now.', catTitle: 'collar bell', catFuture: 'the Bell Tower', bell: true };
      info(bell, bInfo);
      // tower that the bell lands on
      const tower = new T.Group();
      const tm = mat(0xf1e3c8);
      const col = (x, z) => {
        const c = new T.Mesh(new T.BoxGeometry(0.16, 2.8, 0.16), tm);
        c.position.set(x, 1.4, z);
        tower.add(c);
      };
      col(0.4, 0.4); col(-0.4, 0.4); col(0.4, -0.4); col(-0.4, -0.4);
      const cap = new T.Mesh(new T.ConeGeometry(0.75, 0.9, 4), mat(0x6c4a8a));
      cap.position.y = 3.85;
      cap.rotation.y = Math.PI / 4;
      const slab = new T.Mesh(new T.BoxGeometry(1.05, 0.12, 1.05), tm);
      slab.position.y = 3.4;
      const base = new T.Mesh(new T.BoxGeometry(1.2, 0.3, 1.2), tm);
      base.position.y = 0.15;
      tower.add(cap, slab, base);
      tower.position.copy(towerPos);
      tower.rotation.y = -PHI_C;
      shadows(tower);
      parent.add(tower);
      new Detail(tower, 0.6, 0.7, 'grow');
      info(tower, bInfo);
    }

    // heart -> Purr Reactor
    {
      const g = new T.Group();
      const shape = new T.Shape();
      const x = 0, y = 0;
      shape.moveTo(x + 5, y + 5);
      shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
      shape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
      shape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
      shape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
      shape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
      shape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
      const hg = new T.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 1.5, bevelThickness: 1.5, curveSegments: 10 });
      hg.center();
      hg.rotateZ(Math.PI);
      const hmat = new T.MeshStandardMaterial({ color: 0xff4f6d, emissive: 0xff2050, emissiveIntensity: 0.4, roughness: 0.4, flatShading: true });
      const heart = new T.Mesh(hg, hmat);
      heart.scale.setScalar(0.055);
      g.add(heart);
      const ringMat = mat(COL.gold, { roughness: 0.3, metalness: 0.7, map: null });
      const r1 = new T.Mesh(new T.TorusGeometry(0.95, 0.04, 6, 40), ringMat);
      const r2 = new T.Mesh(new T.TorusGeometry(1.1, 0.04, 6, 40), ringMat);
      g.add(r1, r2);
      new Detail(r1, 0.8, 0.86);
      new Detail(r2, 0.82, 0.88);
      shadows(g, true, false);
      parent.add(g);
      const inside = surf(0.78, Math.PI / 2, null, 0).setY(1.7);
      new Piece(g, {
        catPos: inside, catQuat: new T.Quaternion(), catScale: new T.Vector3(1, 1, 1),
        cityPos: new T.Vector3(0, 1.55, 0), cityQuat: new T.Quaternion(), cityScale: new T.Vector3(1.15, 1.15, 1.15),
        a: 0.68, b: 0.84, lift: new T.Vector3(0, 3.2, 0), hover: 1.0, arc: 2.5, kind: 'heart',
      });
      W.heart = { group: g, mesh: heart, mat: hmat, r1, r2 };
      const hi = { title: 'The Purr Reactor', formerly: 'the heart', desc: 'Powers the city at roughly 26 purrs per second. Rub it and see what happens.', catTitle: 'heart (it’s in there somewhere)', catFuture: 'the Purr Reactor', heart: true };
      info(g, hi);
      const light = new T.PointLight(0xff6a8a, 0, 14, 2);
      light.position.set(0, 1.6, 0);
      W.root.add(light);
      W.heart.light = light;
      const hglow = glow(0xff5a7a, 4.5);
      hglow.position.set(0, 1.55, 0);
      hglow.userData.gate = 0.8;
      W.root.add(hglow);
      W.heart.glow = hglow;
      // island
      const island = new T.Mesh(new T.CylinderGeometry(1.05, 1.25, 0.3, 16), mat(COL.kraft));
      island.position.y = 0.05;
      shadows(island);
      parent.add(island);
      new Detail(island, 0.64, 0.72, 'spread');
    }

    // Z's above the sleeping head
    W.zs = [];
    const zTex = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#fff';
      g.font = 'italic 700 52px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('z', 32, 34);
    });
    for (let i = 0; i < 3; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData.phase = i / 3;
      W.root.add(s);
      W.zs.push(s);
    }
  }

  // ------------------------------------------------------------ tail
  function buildTail(parent) {
    const pts = [
      [PHI0 + U.deg(1), 10.6, 1.9],
      [PHI0 - U.deg(6), 12.3, 1.2],
      [PHI0 - U.deg(17), 13.1, 0.7],
      [PHI0 - U.deg(30), 12.7, 0.55],
      [PHI0 - U.deg(41), 11.2, 0.5],
      [PHI0 - U.deg(47), 9.1, 0.5],
      [PHI0 - U.deg(50), 7.0, 0.48],
      [PHI0 - U.deg(53), 5.3, 0.45],
    ].map(([p, r, y]) => U.polar(p, r, y));
    const curve = new T.CatmullRomCurve3(pts, false, 'centripetal');
    const NS = 16;
    const sp = curve.getSpacedPoints(NS + 1);
    const segGeo = new T.CylinderGeometry(1, 1, 1, 7, 1);
    segGeo.rotateX(Math.PI / 2);
    const rails = [];
    W.tailSegs = [];
    for (let i = 0; i <= NS; i++) {
      const a = sp[i], b = sp[i + 1];
      const tip = i === NS;
      const dir = new T.Vector3().subVectors(b, a);
      const len = dir.length();
      dir.normalize();
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const rad = U.lerp(0.62, 0.36, i / NS);
      const segMat = mat(tip ? COL.cream : i % 3 === 1 ? COL.furDark : COL.fur);
      const mesh = new T.Mesh(tip ? new T.IcosahedronGeometry(1, 1) : segGeo, segMat);
      shadows(mesh);
      parent.add(mesh);
      const catQuat = quatFromYZ(UP.clone().addScaledVector(dir, -dir.y).normalize(), dir);
      const catScale = tip ? new T.Vector3(rad * 1.05, rad * 1.0, len * 0.75) : new T.Vector3(rad, rad, len * 1.12);
      const theta = PHI0 - U.deg(4) - (i + 0.5) * (U.TAU / NS);
      if (!tip) {
        const chord = 2 * RAIL_R * Math.sin(U.TAU / NS / 2) * 1.04;
        const tdir = U.tangent(theta).negate();
        (W.tailPieces = W.tailPieces || []).push(new Piece(mesh, {
          catPos: mid, catQuat, catScale,
          cityPos: U.polar(theta, RAIL_R, 0.06), cityQuat: quatFromYZ(UP, tdir), cityScale: new T.Vector3(0.62, 0.12, chord),
          a: 0.03 + i * 0.011, b: 0.15 + i * 0.011, lift: new T.Vector3(0, 0.9, 0), hover: 0.9, arc: 1.2, kind: 'tail', k: i,
        }));
        info(mesh, { title: 'The Circle Line', formerly: 'the tail', desc: 'Sixteen sections of track, one train, no timetable. Trains run when they feel like it.', catTitle: 'tail', catFuture: 'the Circle Line railway' });
      } else {
        const loco = new Piece(mesh, {
          catPos: mid, catQuat, catScale,
          cityPos: U.polar(PHI0 - U.deg(8), RAIL_R, 0.5), cityQuat: quatFromYZ(UP, U.tangent(PHI0 - U.deg(8)).negate()), cityScale: new T.Vector3(0.46, 0.42, 0.95),
          a: 0.22, b: 0.36, lift: new T.Vector3(0, 1.4, 0), hover: 1.5, arc: 1.6, kind: 'loco',
        });
        W.loco = loco;
        // locomotive bits (children ride along; hidden on the cat)
        const cs = loco.cityScale;
        const comp = (x, y, z) => new T.Vector3(x / cs.x, y / cs.y, z / cs.z);
        const chim = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 0.35, 8), mat(0x3c3c48));
        chim.position.set(0, 0.42 / cs.y, 0.45 / cs.z);
        chim.scale.copy(comp(1, 1, 1));
        const cab = new T.Mesh(new T.BoxGeometry(0.5, 0.42, 0.42), mat(COL.red));
        cab.position.set(0, 0.28 / cs.y, -0.62 / cs.z);
        cab.scale.copy(comp(1, 1, 1));
        const cabRoof = new T.Mesh(new T.BoxGeometry(0.58, 0.06, 0.5), mat(0x3c3c48));
        cabRoof.position.set(0, 0.52 / cs.y, -0.62 / cs.z);
        cabRoof.scale.copy(comp(1, 1, 1));
        const lamp = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), new T.MeshBasicMaterial({ color: 0xfff2b0 }));
        lamp.position.set(0, 0.12 / cs.y, 0.98 / cs.z);
        lamp.scale.copy(comp(1, 1, 1));
        [chim, cab, cabRoof, lamp].forEach((c) => {
          shadows(c);
          mesh.add(c);
          new Detail(c, 0.36, 0.42);
        });
        const lg = glow(0xfff0b0, 1.8);
        lg.position.set(0, 0.12 / cs.y, 1.05 / cs.z);
        lg.userData.gate = 0.4;
        mesh.add(lg);
        info(mesh, { title: 'The Tip Express', formerly: 'the tip of the tail', desc: 'The only train on the Circle Line. Click to toot. Click a lot and it may get ideas.', catTitle: 'tail tip', catFuture: 'the locomotive', train: true });
      }
      W.tailSegs.push(mesh);
    }
    // rails, sleepers and the station
    const railMat = mat(0x4a4a58, { map: null, roughness: 0.5, metalness: 0.4 });
    [-0.24, 0.24].forEach((o) => {
      const r = new T.Mesh(new T.TorusGeometry(RAIL_R + o, 0.035, 4, 160), railMat);
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.16;
      parent.add(r);
      new Detail(r, 0.3, 0.38, 'grow');
      rails.push(r);
    });
    const sleeperGeo = new T.BoxGeometry(0.75, 0.05, 0.12);
    const sl = new T.InstancedMesh(sleeperGeo, mat(0x7a5a44), 150);
    const m4 = new T.Matrix4();
    for (let i = 0; i < 150; i++) {
      const a = (i / 150) * U.TAU;
      m4.compose(U.polar(a, RAIL_R, 0.13), quatFromXY(U.radial(a), UP), new T.Vector3(1, 1, 1));
      sl.setMatrixAt(i, m4);
    }
    sl.receiveShadow = true;
    parent.add(sl);
    new Detail(sl, 0.28, 0.36, 'grow');
    // carriages
    W.carriages = [];
    const carGeo = new T.BoxGeometry(0.6, 0.5, 1.3);
    const winTex = U.canvasTex(128, 64, (g, w, h) => {
      g.fillStyle = '#2f7f8a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#f6e7c8';
      g.fillRect(0, h * 0.78, w, h * 0.1);
      for (let i = 0; i < 4; i++) {
        const x = 8 + i * 30;
        g.fillStyle = '#fbe9b8';
        g.fillRect(x, 12, 22, 22);
        // a passenger silhouette: cat head with ears
        g.fillStyle = ['#e8843c', '#333', '#999', '#f4f0e8'][i];
        g.beginPath();
        g.arc(x + 11, 28, 6, Math.PI, 0);
        g.lineTo(x + 17, 20);
        g.lineTo(x + 14, 23);
        g.lineTo(x + 8, 23);
        g.lineTo(x + 5, 20);
        g.closePath();
        g.fill();
      }
    });
    const carMat = [mat(0x2f7f8a), mat(0x2f7f8a), mat(0x3c3c48), mat(0x2f7f8a), mat(0x2f7f8a, { map: winTex }), mat(0x2f7f8a, { map: winTex })];
    const carSide = new T.MeshStandardMaterial({ map: winTex, roughness: 0.8, flatShading: true });
    for (let i = 0; i < 3; i++) {
      const c = new T.Mesh(carGeo, [carSide, carSide, carMat[2], carMat[3], carMat[0], carMat[1]]);
      shadows(c);
      parent.add(c);
      const d = new Detail(c, 0.38 + i * 0.02, 0.44 + i * 0.02);
      c.userData.detail = d;
      W.carriages.push(c);
      info(c, { title: 'Circle Line carriage', formerly: '—', desc: 'Window seats only. Passengers ride purely for the view and the gentle rocking.', train: true });
    }
    // station
    const st = new T.Group();
    const plat = new T.Mesh(new T.BoxGeometry(1.0, 0.25, 3.2), mat(0xe6d6bb));
    plat.position.y = 0.12;
    st.add(plat);
    [-1.3, 0, 1.3].forEach((z) => {
      const p = new T.Mesh(new T.BoxGeometry(0.08, 1.1, 0.08), mat(0x555566));
      p.position.set(0.0, 0.7, z);
      st.add(p);
    });
    const sphi = PHI0 - U.deg(8);
    st.position.copy(U.polar(sphi, RAIL_R + 1.1, 0));
    st.quaternion.copy(quatFromXY(U.radial(sphi), UP));
    shadows(st);
    parent.add(st);
    new Detail(st, 0.32, 0.4);
    info(st, { title: 'Circle Line Platform', formerly: '—', desc: 'Trains stop here for exactly as long as it takes someone to decide whether to get on.' });
    W.stationPhi = sphi;
  }

  // ------------------------------------------------------------ city details
  function buildCityDetails(parent) {
    // lake
    const lake = new T.Mesh(
      new T.CylinderGeometry(3.78, 3.78, 0.1, 64),
      new T.MeshStandardMaterial({ color: COL.water, roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.92 })
    );
    lake.position.y = 0.04;
    lake.receiveShadow = true;
    parent.add(lake);
    new Detail(lake, 0.6, 0.72, 'spread');
    W.lake = lake;
    info(lake, { title: 'Belly Lake', formerly: 'the warm spot inside the curl', desc: 'Fishing permitted. Fish not consulted. Ripples are purrs from the reactor.' });
    // purr ripples
    W.ripples = [];
    for (let i = 0; i < 4; i++) {
      const r = new T.Mesh(new T.TorusGeometry(1, 0.03, 3, 48), new T.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0, depthWrite: false }));
      r.rotation.x = Math.PI / 2;
      r.position.y = 0.1;
      parent.add(r);
      W.ripples.push(r);
    }
    // boats
    W.boats = [];
    const boatGeo = U.merge([
      { geo: new T.BoxGeometry(0.28, 0.1, 0.62), matrix: U.mat4([0, 0.05, 0]), color: 0xc9663e },
      { geo: new T.BoxGeometry(0.22, 0.03, 0.5), matrix: U.mat4([0, 0.11, 0]), color: 0xf2e2c4 },
      { geo: new T.BoxGeometry(0.12, 0.1, 0.18), matrix: U.mat4([0, 0.18, -0.1]), color: 0x333333 },
      { geo: new T.BoxGeometry(0.1, 0.09, 0.09), matrix: U.mat4([0, 0.26, -0.02]), color: 0x333333 },
      { geo: new T.CylinderGeometry(0.008, 0.008, 0.7, 3), matrix: U.mat4([0, 0.4, 0.2], [0.8, 0, 0]), color: 0x6a4a2a },
    ]);
    for (let i = 0; i < 3; i++) {
      const b = new T.Mesh(boatGeo, decoMat);
      b.castShadow = true;
      parent.add(b);
      const d = new Detail(b, 0.74 + i * 0.02, 0.8 + i * 0.02);
      W.boats.push({ mesh: b, a: i * 2.1, r: 2.2 + i * 0.45, speed: 0.08 + i * 0.03, detail: d });
      info(b, { title: 'Fishing boat', formerly: '—', desc: 'The skipper has been waiting for a bite since Tuesday. Optimism: unshaken.' });
    }
    // street lamps along Main Street
    const postGeo = U.merge([
      { geo: new T.CylinderGeometry(0.025, 0.035, 0.85, 5), matrix: U.mat4([0, 0.42, 0]), color: 0x3c3c48 },
      { geo: new T.BoxGeometry(0.14, 0.03, 0.03), matrix: U.mat4([0.05, 0.84, 0]), color: 0x3c3c48 },
    ]);
    const bulbMat = new T.MeshStandardMaterial({ color: 0xfff1c4, emissive: 0xffc860, emissiveIntensity: 0, roughness: 0.5 });
    W.bulbMat = bulbMat;
    for (let k = -1; k <= N; k++) {
      const phi = PHI0 + k * DPHI;
      [7.38, 9.62].forEach((r, i) => {
        const g = new T.Group();
        const p = new T.Mesh(postGeo, decoMat);
        p.castShadow = true;
        const bulb = new T.Mesh(new T.SphereGeometry(0.07, 6, 4), bulbMat);
        bulb.position.set(0.12, 0.8, 0);
        g.add(p, bulb);
        const gl = glow(0xffc870, 1.3);
        gl.position.set(0.12, 0.8, 0);
        gl.userData.gate = 0.5;
        g.add(gl);
        g.position.copy(U.polar(phi, r, GROUND + 0.12));
        g.rotation.y = -phi + (i ? Math.PI : 0);
        parent.add(g);
        const ks = W.plateStart(Math.min(k, N - 1));
        new Detail(g, ks + 0.3, ks + 0.36);
      });
    }
    // trees
    const treeGeos = [0x6aa86a, 0x7fbf6a, 0x4f9a6f, 0x93c26a].map((c) =>
      U.merge([
        { geo: new T.CylinderGeometry(0.05, 0.07, 0.35, 5), matrix: U.mat4([0, 0.17, 0]), color: 0x7a5a44 },
        { geo: new T.ConeGeometry(0.42, 0.75, 6), matrix: U.mat4([0, 0.6, 0]), color: c },
        { geo: new T.ConeGeometry(0.32, 0.55, 6), matrix: U.mat4([0, 0.95, 0]), color: new T.Color(c).offsetHSL(0, 0, 0.05).getHex() },
      ])
    );
    const blossom = U.merge([
      { geo: new T.CylinderGeometry(0.05, 0.07, 0.45, 5), matrix: U.mat4([0, 0.22, 0]), color: 0x7a5a44 },
      { geo: new T.IcosahedronGeometry(0.42, 0), matrix: U.mat4([0, 0.7, 0]), color: 0xf5a9c0 },
      { geo: new T.IcosahedronGeometry(0.3, 0), matrix: U.mat4([0.25, 0.85, 0.1]), color: 0xfbc4d4 },
    ]);
    const tr = U.rng(31);
    W.trees = [];
    const placeTree = (phi, r, geo, s) => {
      const t = new T.Mesh(geo, decoMat);
      t.position.copy(U.polar(phi, r, 0));
      t.rotation.y = tr() * 6;
      t.scale.setScalar(s);
      t.castShadow = true;
      parent.add(t);
      const a = 0.62 + U.wrap(phi - PHI0) / U.TAU * 0.24;
      new Detail(t, a, a + 0.06);
      W.trees.push(t);
      info(t, { title: 'A tree', formerly: '—', desc: tr() < 0.5 ? 'Climbed weekly. Descended reluctantly, with help.' : 'Currently occupied by one bird and three very interested cats.' });
    };
    for (let i = 0; i < 80; i++) {
      const phi = tr() * U.TAU;
      if (Math.abs(U.angDiff(phi, PHI0 - U.deg(8))) < U.deg(9)) continue;
      const r = tr() < 0.5 ? U.lerp(15.5, 17.9, tr()) : U.lerp(15.6, 16.6, tr());
      placeTree(phi, r, treeGeos[Math.floor(tr() * 4)], 0.8 + tr() * 0.6);
    }
    // blossoms in the civic quarter, by the lake
    for (let i = 0; i < 14; i++) {
      const phi = PHI_C + (tr() - 0.5) * U.deg(70);
      const r = tr() < 0.5 ? U.lerp(4.3, 6.4, tr()) : U.lerp(10.0, 11.0, tr());
      const ph = Math.abs(U.angDiff(phi, PHI_C));
      if (r < 6.5 && ph < U.deg(24)) continue;
      if (r > 9 && ph < U.deg(16)) continue;
      placeTree(phi, r, blossom, 0.7 + tr() * 0.4);
    }
    // gondolas on the whisker cables
    W.gondolas = [];
    const gGeo = U.merge([
      { geo: new T.BoxGeometry(0.34, 0.26, 0.34), matrix: U.mat4([0, -0.32, 0]), color: 0xd8383d },
      { geo: new T.BoxGeometry(0.36, 0.05, 0.36), matrix: U.mat4([0, -0.17, 0]), color: 0x3c3c48 },
      { geo: new T.BoxGeometry(0.28, 0.1, 0.36), matrix: U.mat4([0, -0.3, 0]), color: 0xfbe9b8 },
      { geo: new T.CylinderGeometry(0.012, 0.012, 0.18, 3), matrix: U.mat4([0, -0.08, 0]), color: 0x3c3c48 },
    ]);
    W.cables.forEach((c, i) => {
      const g = new T.Mesh(gGeo, decoMat);
      g.castShadow = true;
      parent.add(g);
      new Detail(g, 0.84, 0.9);
      W.gondolas.push({ mesh: g, cable: c, u: (i * 0.37) % 1, dir: i % 2 ? 1 : -1 });
      info(g, { title: 'Whisker gondola', formerly: '—', desc: 'Capacity: one cat, or one cat pretending to be two.' });
    });
    // cable end pylons
    W.cables.forEach((c) => {
      const p = new T.Mesh(new T.BoxGeometry(0.14, c.b.y, 0.14), mat(0x6a6a7a));
      p.position.copy(c.b).setY(c.b.y / 2);
      p.castShadow = true;
      parent.add(p);
      new Detail(p, 0.66, 0.72, 'grow');
    });
    // smoke puffs from Tuna Works
    W.smoke = [];
    const smokeMat = new T.MeshStandardMaterial({ color: 0xf4f0ea, roughness: 1, flatShading: true, transparent: true, opacity: 0.85 });
    const fishShape = new T.Shape();
    fishShape.moveTo(-0.5, 0);
    fishShape.quadraticCurveTo(-0.1, 0.35, 0.3, 0.05);
    fishShape.lineTo(0.55, 0.25);
    fishShape.lineTo(0.5, 0);
    fishShape.lineTo(0.55, -0.25);
    fishShape.lineTo(0.3, -0.05);
    fishShape.quadraticCurveTo(-0.1, -0.35, -0.5, 0);
    const fishGeo = new T.ExtrudeGeometry(fishShape, { depth: 0.12, bevelEnabled: false });
    fishGeo.center();
    W.fishShapeGeo = fishGeo;
    for (let i = 0; i < 10; i++) {
      const s = new T.Mesh(fishGeo, smokeMat.clone());
      s.visible = false;
      parent.add(s);
      W.smoke.push({ mesh: s, t: i / 10 });
    }
    // the box (a secret)
    {
      const g = new T.Group();
      const body = new T.Mesh(new T.BoxGeometry(0.9, 0.6, 0.75), mat(0xc8955e));
      body.position.y = 0.3;
      const flapMat = mat(0xb5834f);
      const fl = [];
      [[0, 0.6, 0.375, 1], [0, 0.6, -0.375, -1]].forEach(([x, y, z, s]) => {
        const f = new T.Group();
        f.position.set(x, y, z);
        const fm = new T.Mesh(new T.BoxGeometry(0.9, 0.03, 0.36), flapMat);
        fm.position.z = 0.18 * s;
        f.add(fm);
        f.rotation.x = s * 0.5;
        f.userData.s = s;
        g.add(f);
        fl.push(f);
      });
      const label = new T.Mesh(
        new T.PlaneGeometry(0.5, 0.18),
        new T.MeshBasicMaterial({
          map: U.canvasTex(128, 48, (c, w, h) => {
            c.fillStyle = '#e7c48f';
            c.fillRect(0, 0, w, h);
            c.fillStyle = '#5a3a1a';
            c.font = '700 22px monospace';
            c.textAlign = 'center';
            c.fillText('FRAGILE', w / 2, 31);
          }),
        })
      );
      label.position.set(0, 0.35, 0.381);
      g.add(body, label);
      const cphi = PHI0 - U.deg(22);
      g.position.copy(U.polar(cphi, 16.3, 0));
      g.rotation.y = -cphi + 1.2;
      shadows(g);
      parent.add(g);
      new Detail(g, 0.86, 0.92);
      W.box = { group: g, flaps: fl, phi: cphi, r: 16.3, open: 0 };
      info(g, { title: 'An unattended box', formerly: '—', desc: 'Nobody knows who left it here. Everybody wants to sit in it.', box: true });
    }
  }

  // ------------------------------------------------------------ environment
  W.envBuild = function (scene) {
    const skyU = { top: { value: new T.Color() }, bot: { value: new T.Color() }, glowC: { value: new T.Color() }, sunDir: { value: new T.Vector3() } };
    const sky = new T.Mesh(
      new T.SphereGeometry(300, 32, 16),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: skyU,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 glowC; uniform vec3 sunDir; varying vec3 vP;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
          void main(){ float y = clamp(vP.y*1.15+0.08,0.0,1.0); vec3 c = mix(bot, top, pow(y,0.65));
            float g = max(dot(vP, sunDir),0.0); c += glowC*pow(g,8.0)*0.55; c += glowC*pow(g,64.0)*0.6;
            c += (h(gl_FragCoord.xy)-0.5)*0.018; gl_FragColor = vec4(c,1.0);}`,
      })
    );
    sky.renderOrder = -10;
    scene.add(sky);
    W.sky = { mesh: sky, u: skyU };
    // stars
    const sg = new T.BufferGeometry();
    const sp = [];
    const sr = U.rng(5);
    for (let i = 0; i < 700; i++) {
      const th = sr() * U.TAU, y = 0.05 + sr() * 0.95;
      const rr = Math.sqrt(1 - y * y);
      sp.push(Math.cos(th) * rr * 260, y * 260, Math.sin(th) * rr * 260);
    }
    sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
    const stars = new T.Points(sg, new T.PointsMaterial({ color: 0xfff6e0, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(stars);
    W.stars = stars;
    // moon (secretly a ball of yarn)
    const moonMat = new T.MeshBasicMaterial({ color: 0xfff3d1, fog: false });
    const moon = new T.Mesh(new T.SphereGeometry(7, 24, 16), moonMat);
    scene.add(moon);
    const mglow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xfff0c8, blending: T.AdditiveBlending, transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    mglow.scale.set(60, 60, 1);
    scene.add(mglow);
    W.moon = { mesh: moon, glow: mglow, mat: moonMat, yarn: false };
    moon.userData.info = { title: 'The Moon', formerly: '—', desc: 'Pale, round, and suspiciously fluffy-looking tonight.', moon: true };
    W.pickables.push(moon);
    // sun disc
    const sun = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0xfff2c0, blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    sun.scale.set(70, 70, 1);
    scene.add(sun);
    W.sunSprite = sun;
    // paper clouds
    W.clouds = [];
    const cm = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.96 });
    W.cloudMat = cm;
    const cr = U.rng(11);
    for (let i = 0; i < 9; i++) {
      const parts = [];
      const n = 3 + Math.floor(cr() * 3);
      for (let j = 0; j < n; j++)
        parts.push({ geo: new T.IcosahedronGeometry(1, 0), matrix: U.mat4([j * 1.3 - n * 0.6, cr() * 0.5, cr() * 0.8], [cr(), cr(), cr()], [1.1 + cr(), 0.8 + cr() * 0.5, 1 + cr() * 0.5]) });
      const g = U.merge(parts);
      const c = new T.Mesh(g, cm);
      c.castShadow = true;
      scene.add(c);
      W.clouds.push({ mesh: c, a: cr() * U.TAU, r: 46 + cr() * 30, y: 16 + cr() * 14, s: 0.006 + cr() * 0.008, sc: 1.6 + cr() * 1.6 });
    }
    // lights
    const hemi = new T.HemisphereLight(0xffffff, 0x8a7a6a, 0.6);
    scene.add(hemi);
    const sunL = new T.DirectionalLight(0xffffff, 1);
    sunL.castShadow = true;
    sunL.shadow.mapSize.set(2048, 2048);
    const sc = sunL.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 140;
    sunL.shadow.bias = -0.0008;
    sunL.shadow.normalBias = 0.06;
    scene.add(sunL);
    scene.add(sunL.target);
    const moonL = new T.DirectionalLight(0x8aa0ff, 0.2);
    scene.add(moonL);
    W.lights = { hemi, sun: sunL, moon: moonL };
    scene.fog = new T.Fog(0x000000, 60, 170);
  };

  // time-of-day palettes
  const skyTop = U.ramp([[0, 0x070a22], [4.6, 0x141a45], [5.8, 0x3a4a8a], [7.2, 0x6fa5d8], [12, 0x6ab8e6], [16.5, 0x6c9ed6], [18.4, 0x4a4f9a], [19.6, 0x251f5a], [21, 0x0e1030]]);
  const skyBot = U.ramp([[0, 0x1a1840], [4.6, 0x3a2a5a], [5.8, 0xf3a07e], [7.2, 0xffe0b8], [12, 0xf4f1e4], [16.5, 0xffe2b0], [18.4, 0xff9a6a], [19.6, 0xd75a78], [21, 0x2c1e4c]]);
  const sunCol = U.ramp([[5.5, 0xff8a5a], [7.5, 0xffe2b8], [12, 0xfff6e8], [16.5, 0xffe0b0], [18.6, 0xff7a4a], [19.5, 0xff5a4a], [0, 0x000000]]);
  const sunInt = U.scalarRamp([[0, 0], [5.4, 0], [6.4, 0.55], [9, 0.95], [15, 0.95], [18.2, 0.55], [19.3, 0.08], [20, 0]]);
  const hemiInt = U.scalarRamp([[0, 0.5], [5, 0.5], [7, 0.58], [12, 0.62], [17, 0.58], [19.5, 0.5], [21, 0.5]]);
  const hemiSky = U.ramp([[0, 0x6a7ad0], [6, 0xf0c0a0], [12, 0xffffff], [18, 0xffc6a0], [20, 0x7a6ac0]]);
  W.nightOf = U.scalarRamp([[0, 1], [4.8, 1], [6.6, 0], [18.4, 0], [20.2, 1]]);
  const tmpC = new T.Color(), tmpV = new T.Vector3();

  W.env = function (hour, camera) {
    const night = W.nightOf(hour);
    W.night = night;
    const top = skyTop(hour, new T.Color()), bot = skyBot(hour, new T.Color());
    W.sky.u.top.value.copy(top);
    W.sky.u.bot.value.copy(bot);
    W.scene.fog.color.copy(bot).lerp(top, 0.35);
    // sun travels east→west over the diorama
    const a = ((hour - 6) / 12) * Math.PI;
    const sd = new T.Vector3(Math.cos(a) * 0.85, Math.sin(a), 0.42).normalize();
    W.sky.u.sunDir.value.copy(sd);
    W.sky.u.glowC.value.copy(sunCol(hour, tmpC)).multiplyScalar(U.clamp(sd.y * 3 + 0.6));
    const L = W.lights;
    const si = sunInt(hour);
    L.sun.intensity = si * 1.05;
    L.sun.color.copy(sunCol(hour, tmpC));
    const sdl = sd.y > 0.08 ? sd : new T.Vector3(sd.x, 0.08, sd.z).normalize();
    const md = new T.Vector3(-0.55, 0.62, -0.56).normalize();
    // the key light is the sun by day and the moon by night (one shadow caster)
    L.sun.position.copy(sdl).lerp(md, night).normalize().multiplyScalar(60);
    L.sun.color.lerp(new T.Color(0x9fb2ff), night);
    L.sun.intensity = si * 1.05 + night * 0.62;
    L.sun.target.position.set(0, 0, 0);
    L.hemi.intensity = hemiInt(hour);
    L.hemi.color.copy(hemiSky(hour, tmpC));
    L.moon.intensity = 0;
    L.moon.position.copy(md).multiplyScalar(60);
    W.sunSprite.position.copy(sd).multiplyScalar(220);
    W.sunSprite.material.opacity = U.clamp(sd.y * 4 + 0.3) * (1 - night);
    W.moon.mesh.position.copy(md).multiplyScalar(200);
    W.moon.glow.position.copy(W.moon.mesh.position).multiplyScalar(0.98);
    W.moon.mesh.visible = night > 0.05;
    W.moon.glow.material.opacity = night * 0.45;
    W.stars.material.opacity = Math.pow(night, 1.5);
    W.cloudMat.color.copy(new T.Color(0xffffff).lerp(new T.Color(0x5a5a8a), night * 0.8));
  };

  // ------------------------------------------------------------ per-frame
  W.trainTheta = PHI0 - U.deg(8);
  W.trainSpeed = 0.11;
  W.trainBoost = 0;
  W.trainWait = 3;
  W.shake = 0;
  W.purrPulse = 0;
  W.overpurr = 0;
  let clock = 0;
  const rippleT = [0, 0.25, 0.5, 0.75];

  W.update = function (P, hour, dt, state) {
    clock += dt;
    const breathe = Math.sin(clock * 1.6);
    W.breath = breathe * 0.5 + 0.5;
    const asleep = 1 - U.clamp(P * 8);
    const st = W.stretch || 0;
    W.catGroup.scale.set(1 + (breathe * 0.012 + st * 0.035) * asleep, 1 + (breathe * 0.03 + st * 0.09) * asleep, 1 + (breathe * 0.012 + st * 0.035) * asleep);
    // signs of life: ear twitches and a slow tail sway
    if (asleep > 0.5) {
      W._tw = (W._tw === undefined ? 4 : W._tw) - dt * (1 + st * 6);
      if (W._tw <= 0) {
        W._tw = 3 + Math.random() * 6;
        W._twEar = Math.random() < 0.5 ? 0 : 1;
        W._twT = 0;
      }
      if (W._twT !== undefined && W._twT < 1) {
        W._twT += dt / 0.55;
        const t = Math.min(1, W._twT);
        W.ears[W._twEar].wiggle = Math.sin(t * Math.PI * 4) * 0.24 * (1 - t);
      }
      W._tf = (W._tf || 0) + dt * (0.7 + st * 4);
      const tp = W.tailPieces;
      for (let i = 0; i < 4; i++) {
        const p = i < 3 ? tp[tp.length - 3 + i] : W.loco;
        p.wiggleAxis.set(0, 1, 0);
        p.wiggle = Math.sin(W._tf * 1.4 - i * 0.7) * (0.05 + i * 0.04) * (0.6 + 0.4 * Math.sin(W._tf * 0.31));
      }
    }

    // train state
    const day = state === 'day';
    if (day && P >= 1) {
      const sp = W.trainSpeed * (1 + W.trainBoost * 9);
      W.trainBoost = Math.max(0, W.trainBoost - dt * 0.08);
      if (W.trainWait > 0) W.trainWait -= dt;
      else {
        const before = U.wrap(W.trainTheta - W.stationPhi);
        W.trainTheta -= sp * dt;
        const after = U.wrap(W.trainTheta - W.stationPhi);
        if (after > before && W.trainBoost < 0.05) W.trainWait = 3.5; // passed the station
      }
    }
    const th = W.trainTheta;
    const loco = W.loco;
    loco.cityPos.copy(U.polar(th, RAIL_R, 0.5));
    loco.cityQuat.copy(quatFromYZ(UP, U.tangent(th).negate()));

    for (let i = 0; i < pieces.length; i++) pieces[i].update(P);
    for (let i = 0; i < details.length; i++) details[i].update(P);
    // walls
    for (const w of W.walls) {
      const e = U.clamp((P - w.a) / (w.b - w.a));
      w.wall.visible = e > 0.001;
      if (w.wall.visible) w.wall.scale.y = Math.max(0.001, w.h * U.ratchet(e, 3));
      if (w.lastE !== undefined && W.onWall) {
        if (w.lastE < 1 && e >= 1) W.onWall(w, true);
      }
      w.lastE = e;
    }
    // groundwork morph
    for (const c of W.cores) {
      const s = W.plateStart(c.userData.coreK);
      c.morphTargetInfluences[0] = U.easeInOutCubic(U.clamp((P - s - 0.04) / 0.12));
    }
    W.coreMat.color.set(COL.inner).lerp(new T.Color(COL.kraft), U.clamp((P - 0.2) / 0.4));

    // carriages follow the loco
    W.carriages.forEach((c, i) => {
      const a = th + (i + 1) * (1.55 / RAIL_R);
      c.position.copy(U.polar(a, RAIL_R, 0.42));
      c.quaternion.copy(quatFromYZ(UP, U.tangent(a).negate()));
      c.position.y += Math.abs(Math.sin(clock * 9 + i)) * 0.02 * (day ? 1 : 0);
    });

    // boats bob around the lake
    W.boats.forEach((b) => {
      b.a += b.speed * dt * (P >= 1 ? 1 : 0);
      b.mesh.position.copy(U.polar(b.a, b.r, 0.07 + Math.sin(clock * 2 + b.a) * 0.02));
      b.mesh.rotation.y = -b.a;
    });
    // gondolas
    W.gondolas.forEach((g) => {
      if (P >= 1) {
        g.u += g.dir * dt * 0.05;
        if (g.u > 1) { g.u = 1; g.dir = -1; }
        if (g.u < 0) { g.u = 0; g.dir = 1; }
      }
      const u = 0.08 + g.u * 0.84;
      g.mesh.position.lerpVectors(g.cable.a, g.cable.b, u);
      g.mesh.rotation.z = Math.sin(clock * 1.3 + u * 5) * 0.06;
    });
    // heart / Purr Reactor
    const H = W.heart;
    W.purrPulse += dt * (1.1 + W.overpurr * 3);
    const beat = Math.pow(Math.max(0, Math.sin(W.purrPulse * Math.PI * 2)), 6);
    const hs = 0.055 * (1 + beat * 0.12 + W.overpurr * 0.1);
    H.mesh.scale.setScalar(hs);
    H.mesh.rotation.y += dt * (0.6 + W.overpurr * 4);
    H.r1.rotation.x += dt * 0.7;
    H.r1.rotation.y += dt * 0.4;
    H.r2.rotation.z += dt * 0.5;
    H.r2.rotation.x -= dt * 0.3;
    const cityOn = U.clamp((P - 0.8) / 0.15);
    H.mat.emissiveIntensity = 0.35 + beat * 0.6 + W.night * 0.6 + W.overpurr;
    H.light.intensity = cityOn * (W.night * 1.4 + beat * 0.4 + W.overpurr * 2);
    W.overpurr = Math.max(0, W.overpurr - dt * 0.25);
    // ripples
    W.ripples.forEach((r, i) => {
      rippleT[i] += dt * 0.32;
      if (rippleT[i] > 1) rippleT[i] -= 1;
      const t = rippleT[i];
      const s = 1.2 + t * 2.4;
      r.scale.set(s, s, 1);
      r.material.opacity = cityOn * (1 - t) * 0.6;
      r.visible = cityOn > 0;
    });
    // smoke fish from the Tuna Works chimney
    const tw = W.buildings.find((b) => b.chimney);
    if (tw) {
      const top = new T.Vector3();
      tw.chimney.getWorldPosition(top);
      top.y += 1.6;
      const on = tw.chimney.visible && P >= 0.95 && hour > 6.5 && hour < 20.5;
      W.smoke.forEach((s) => {
        s.t += dt * 0.12;
        if (s.t > 1) s.t -= 1;
        s.mesh.visible = on;
        if (!on) return;
        s.mesh.position.set(top.x + s.t * 2.2, top.y + s.t * 2.6, top.z + Math.sin(s.t * 6) * 0.3);
        const sc = 0.4 + s.t * 0.9;
        s.mesh.scale.setScalar(sc);
        s.mesh.rotation.set(0, 0.6, Math.sin(clock * 2 + s.t * 9) * 0.25);
        s.mesh.material.opacity = 0.85 * (1 - s.t);
      });
    }
    const arcade = W.buildings.find((b) => b.laserDot);
    if (arcade) arcade.laserDot.position.x = Math.sin(clock * 3.1) * 0.4 / (arcade.roof.scale.x || 1);

    // night lights
    const lightsOn = U.clamp((W.night - 0.15) / 0.5) * U.clamp((P - 0.25) / 0.2);
    const flick = 1 + W.overpurr * Math.sin(clock * 30) * 0.5;
    W.wallMats.forEach((m) => (m.emissiveIntensity = lightsOn * 1.0 * flick));
    W.bulbMat.emissiveIntensity = lightsOn * 1.5;
    glows.forEach((g) => {
      const gate = g.userData.gate !== undefined ? g.userData.gate : 0.8;
      const vis = P >= gate ? 1 : 0;
      let o = lightsOn * vis;
      if (g.userData.blink) o *= 0.5 + 0.5 * (Math.sin(clock * 3) > 0 ? 1 : 0.2);
      if (g === H.glow) o = cityOn * (0.35 + W.night * 0.5 + beat * 0.3 + W.overpurr * 0.5);
      g.material.opacity = o;
      g.visible = o > 0.01 && (g.parent === W.root || g.parent.visible);
    });

    // clouds drift
    W.clouds.forEach((c) => {
      c.a += c.s * dt;
      c.mesh.position.copy(U.polar(c.a, c.r, c.y));
      c.mesh.scale.setScalar(c.sc);
      c.mesh.rotation.y = -c.a;
    });

    // Z's
    const zOn = asleep * (state === 'sleep' || state === 'intro' ? 1 : 0);
    W.zs.forEach((z) => {
      z.userData.phase = (z.userData.phase + dt * 0.18) % 1;
      const t = z.userData.phase;
      z.position.copy(W.headPos).addScaledVector(W.headFwd, -0.5);
      z.position.y += 2.6 + t * 3.2;
      z.position.x += Math.sin(t * 6) * 0.4;
      const s = 0.5 + t * 0.9;
      z.scale.set(s, s, s);
      z.material.opacity = zOn * Math.sin(t * Math.PI) * 0.85;
    });

    // city-wide sneeze jiggle
    if (W.shake > 0) {
      W.shake = Math.max(0, W.shake - dt * 1.2);
      const s = W.shake;
      W.catGroup.position.set(Math.sin(clock * 47) * 0.12 * s, Math.abs(Math.sin(clock * 31)) * 0.2 * s, Math.cos(clock * 53) * 0.12 * s);
      W.catGroup.scale.y *= 1 - Math.sin(clock * 40) * 0.05 * s;
    } else W.catGroup.position.set(0, 0, 0);

    // ruffle decay
    for (const p of pieces) if (p.ruffle > 0) p.ruffle = Math.max(0, p.ruffle - dt * 0.9);
  };

  /* fur ruffles up around a stroke point */
  W.ruffle = function (pt, amt) {
    for (const p of pieces) {
      if (p.q > 0 || (p.kind !== 'roof' && p.kind !== 'road')) continue;
      const d = p.catPos.distanceTo(pt);
      if (d < 2.6) p.ruffle = Math.min(0.45, Math.max(p.ruffle, (1 - d / 2.6) * amt));
    }
  };

  /* height of the walkable surface at x,z (city mode) */
  W.heightAt = function (x, z) {
    const r = Math.hypot(x, z);
    const phi = Math.atan2(z, x);
    const u = U.wrap(phi - (PHI0 - DPHI));
    if (r < 1.25) return 0.25;
    if (r < 3.75) return -1; // water
    if (r > CUSHION_R) return -2;
    if (u <= SPAN + DPHI) {
      const k = Math.min(N - 1, Math.floor(u / DPHI) - 1);
      for (let j = 0; j < M; j++) {
        const row = ROWS[j];
        if (Math.abs(r - row.r) < row.d * 0.45) {
          if (row.road) return GROUND + THICK;
          const b = W.byKJ[k + ',' + j];
          if (b) {
            const cu = (k + 1.5) * DPHI;
            const half = (b.tl * 0.5) / r;
            if (Math.abs(u - cu) < half && b.wall.visible) return b.roofY;
          }
        }
      }
      if (r > 3.6 && r < 13.3) return GROUND;
    }
    const dc = Math.hypot(x - W.civic.x, z - W.civic.z);
    if (dc < 2.5) return 0.24;
    for (const p of W.plazas) {
      if (Math.hypot(x - Math.cos(p.phi) * p.r, z - Math.sin(p.phi) * p.r) < 1.1) return 0.3;
    }
    return 0.02;
  };

  W.indexBuildings = function () {
    W.byKJ = {};
    W.buildings.forEach((b) => (W.byKJ[b.k + ',' + b.j] = b));
  };
})();
