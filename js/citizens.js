/* CAT / TRANSFORM CITY — the residents: ~240 tiny cats with homes, jobs and naps */
(function () {
  'use strict';
  const T = THREE;
  const U = CTC.util;
  const W = CTC.world;
  const C = (CTC.citizens = {});

  const COUNT = 240;
  const FUR = [0xe8843c, 0x2b2b30, 0xf4efe6, 0x9a9aa4, 0xc98a52, 0x6b4a3a, 0xf0c48a, 0x44444c, 0xd9d2c5, 0xb86a3a];
  const NAMES = ['Mochi', 'Biscuit', 'Pickles', 'Tofu', 'Miso', 'Noodle', 'Pepper', 'Clementine', 'Waffles', 'Sardine', 'Bean', 'Juniper', 'Professor', 'Nimbus', 'Dumpling', 'Socks', 'Olive', 'Turnip', 'Gnocchi', 'Pudding', 'Marmalade', 'Haiku', 'Captain', 'Fig', 'Toast', 'Basil', 'Sesame', 'Lentil', 'Mango', 'Chowder', 'Pip', 'Velvet', 'Momo', 'Kiki', 'Bao', 'Ziggy', 'Earl Grey', 'Mr. Whiskers', 'Duchess', 'Plum'];
  const JOBS = ['tuna inspector', 'professional napper', 'window-sill critic', 'box tester (senior)', 'bird watcher, unlicensed', 'night-shift purr operator', 'yarn mill foreman', 'gondola attendant', 'mouse consultant', 'keyboard warmer', 'sunbeam surveyor', 'Main Street sweeper', 'fish market auctioneer', 'reactor belly-rubber', 'tail-train conductor', 'retired', 'poet', 'Town Hall paperweight', 'cushion fluffer', 'library shusher'];

  const agents = (C.agents = []);
  C.laser = { active: false, x: 0, z: 0, y: 0 };
  C.fish = [];
  C.forceHome = false;
  C.chasers = 0;

  // ---------------------------------------------------------------- build
  C.build = function (scene) {
    const parts = [
      { geo: new T.BoxGeometry(0.17, 0.15, 0.32), matrix: U.mat4([0, 0.15, 0]) },
      { geo: new T.BoxGeometry(0.16, 0.14, 0.14), matrix: U.mat4([0, 0.26, 0.18]) },
      { geo: new T.ConeGeometry(0.04, 0.08, 3), matrix: U.mat4([0.05, 0.36, 0.18]) },
      { geo: new T.ConeGeometry(0.04, 0.08, 3), matrix: U.mat4([-0.05, 0.36, 0.18]) },
      { geo: new T.BoxGeometry(0.08, 0.05, 0.03), matrix: U.mat4([0, 0.24, 0.255]), color: 0xffffff },
      { geo: new T.BoxGeometry(0.035, 0.035, 0.24), matrix: U.mat4([0, 0.27, -0.25], [0.9, 0, 0]) },
      { geo: new T.BoxGeometry(0.045, 0.08, 0.045), matrix: U.mat4([0.055, 0.04, 0.11]) },
      { geo: new T.BoxGeometry(0.045, 0.08, 0.045), matrix: U.mat4([-0.055, 0.04, 0.11]) },
      { geo: new T.BoxGeometry(0.045, 0.08, 0.045), matrix: U.mat4([0.055, 0.04, -0.11]) },
      { geo: new T.BoxGeometry(0.045, 0.08, 0.045), matrix: U.mat4([-0.055, 0.04, -0.11]) },
    ];
    const geo = U.merge(parts);
    geo.scale(1.25, 1.25, 1.25);
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
    const mesh = new T.InstancedMesh(geo, m, COUNT);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
    C.mesh = mesh;
    mesh.userData.citizens = true;

    const r = U.rng(424242);
    const bl = W.buildings;
    const weights = bl.map((b) => b.h * b.tl * b.d);
    const tot = weights.reduce((a, b) => a + b, 0);
    const pickB = () => {
      let x = r() * tot;
      for (let i = 0; i < bl.length; i++) {
        x -= weights[i];
        if (x <= 0) return bl[i];
      }
      return bl[bl.length - 1];
    };
    const col = new T.Color();
    for (let i = 0; i < COUNT; i++) {
      const home = pickB();
      home.residents++;
      const work = r() < 0.4 ? bl.filter((b) => b.special)[Math.floor(r() * bl.filter((b) => b.special).length)] : pickB();
      const a = {
        i, home, work,
        name: NAMES[Math.floor(r() * NAMES.length)] + (r() < 0.15 ? ' the ' + ['Brave', 'Round', 'Loud', 'Elder', 'Small', 'Magnificent'][Math.floor(r() * 6)] : ''),
        age: 1 + Math.floor(r() * 14),
        job: JOBS[Math.floor(r() * JOBS.length)],
        lazy: r(),
        phi: home.phi, r: home.doorR, x: 0, z: 0, y: W.GROUND,
        heading: r() * 6.28,
        state: 'inside', vis: 0, visT: 0,
        path: [], pi: 0, speed: 0.8 + r() * 0.4, timer: r() * 3,
        pose: 'walk', bob: r() * 10, activity: 'at home', where: null,
        jump: null, roof: null, eat: 0,
      };
      col.set(FUR[Math.floor(r() * FUR.length)]);
      col.offsetHSL(0, 0, (r() - 0.5) * 0.06);
      mesh.setColorAt(i, col);
      agents.push(a);
    }
    mesh.instanceColor.needsUpdate = true;

    buildMouse(scene);
    buildHearts(scene);
    C.fishGeo = U.merge([
      { geo: new T.OctahedronGeometry(0.2, 0), matrix: U.mat4([0, 0, 0], null, [0.5, 0.9, 1.4]), color: 0x9fc3d6 },
      { geo: new T.ConeGeometry(0.12, 0.18, 3), matrix: U.mat4([0, 0, -0.33], [-Math.PI / 2, 0, 0], [0.3, 1, 1]), color: 0x7aa3bf },
    ]);
    C.fishMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.4, flatShading: true });
  };

  // ---------------------------------------------------------------- mouse (secret)
  function buildMouse(scene) {
    const g = new T.Group();
    const gm = new T.MeshStandardMaterial({ color: 0x8d8d96, roughness: 0.8, flatShading: true });
    const body = new T.Mesh(new T.IcosahedronGeometry(0.16, 0), gm);
    body.scale.set(0.8, 0.7, 1.3);
    body.position.y = 0.11;
    const ear1 = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.02, 8), new T.MeshStandardMaterial({ color: 0xf2a0b0 }));
    ear1.rotation.x = Math.PI / 2;
    ear1.position.set(0.07, 0.22, 0.12);
    const ear2 = ear1.clone();
    ear2.position.x = -0.07;
    const tail = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 0.35, 3), new T.MeshStandardMaterial({ color: 0xf2a0b0 }));
    tail.rotation.x = Math.PI / 2 - 0.3;
    tail.position.set(0, 0.08, -0.33);
    g.add(body, ear1, ear2, tail);
    g.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.userData.info = { title: 'A mouse', formerly: '—', desc: 'Lives here rent-free. Absolutely nobody has noticed. Yet.', mouse: true };
        W.pickables.push(m);
      }
    });
    g.visible = false;
    scene.add(g);
    C.mouse = { group: g, phi: W.PHI0 + 2.0, r: 16.8, tphi: 0, tr: 0, wait: 2, moving: false, found: false };
  }

  // ---------------------------------------------------------------- floating hearts
  function buildHearts(scene) {
    const tex = U.canvasTex(64, 64, (g) => {
      g.fillStyle = '#ff5a7a';
      g.font = '48px serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('♥', 32, 36);
    });
    C.hearts = [];
    for (let i = 0; i < 24; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      scene.add(s);
      C.hearts.push({ s, t: 1 });
    }
  }
  C.heartAt = function (x, y, z, n = 1) {
    for (let k = 0; k < n; k++) {
      const h = C.hearts.find((h) => h.t >= 1);
      if (!h) return;
      h.t = 0;
      h.s.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4);
      h.vx = (Math.random() - 0.5) * 0.3;
      h.s.visible = true;
    }
  };

  // ---------------------------------------------------------------- navigation
  const L = () => W.LANES;
  function spoke(phi) {
    const u = U.wrap(phi - (W.PHI0 - W.DPHI));
    if (u > W.SPAN + W.DPHI) return phi;
    return W.PHI0 - W.DPHI + Math.round(u / W.DPHI) * W.DPHI;
  }
  function laneFor(r1, r2) {
    const lanes = [L().alleyIn, L().main, L().alleyOut];
    const m = (r1 + r2) / 2;
    let best = lanes[1];
    if (r1 < 7.4 && r2 < 7.4) best = L().alleyIn;
    else if (r1 > 9.6 && r2 > 9.6 && r1 < 13 && r2 < 13) best = L().alleyOut;
    else if (r1 > 13 && r2 > 13) best = L().outer;
    else best = lanes.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
    return best;
  }
  function plan(a, phi, r) {
    a.path = [];
    a.pi = 0;
    const close = Math.abs(a.r - r) < 0.25 && Math.abs(U.angDiff(a.phi, phi)) * a.r < 5;
    if (close) {
      a.path.push({ phi, r });
      return;
    }
    const sa = spoke(a.phi), sb = spoke(phi);
    const lane = laneFor(a.r, r);
    a.path.push({ phi: sa, r: a.r });
    a.path.push({ phi: sa, r: lane });
    a.path.push({ phi: sb, r: lane });
    a.path.push({ phi: sb, r });
    a.path.push({ phi, r });
  }
  C.plan = plan;
  C.spoke = spoke;
  function go(a, phi, r, activity, then, speed) {
    plan(a, phi, r);
    a.state = 'walk';
    a.pose = 'walk';
    a.activity = activity;
    a.then = then || 'idle';
    a.walkSpeed = speed || a.speed;
  }
  const doorOf = (b, rr) => ({ phi: b.phi + (rr() - 0.5) * (b.tl / b.r) * 0.7, r: b.doorR });

  // ---------------------------------------------------------------- behaviour
  function decide(a, hour) {
    const rr = Math.random;
    const set = (pose, t, activity) => {
      a.state = 'idle';
      a.pose = pose;
      a.timer = t;
      if (activity) a.activity = activity;
    };
    if (C.forceHome || hour >= 21.4 || hour < 6.15) {
      const d = doorOf(a.home, rr);
      return go(a, d.phi, d.r, 'hurrying home to ' + a.home.name, 'enter', C.forceHome ? 1.7 : 1.1);
    }
    const r = rr();
    if (hour < 9) {
      if (a.where !== 'work') {
        const d = doorOf(a.work, rr);
        a.where = 'work';
        return go(a, d.phi, d.r, 'commuting to ' + a.work.name, 'idle', 1.05);
      }
      return set(rr() < 0.5 ? 'sit' : 'walk', 3 + rr() * 6, 'working at ' + a.work.name + ' (allegedly)');
    }
    if (hour < 12) {
      if (r < 0.55) {
        if (rr() < 0.5) return set('sit', 4 + rr() * 8, 'working hard at ' + a.work.name);
        const d = doorOf(a.work, rr);
        return go(a, d.phi + (rr() - 0.5) * 0.25, d.r, 'pacing outside ' + a.work.name);
      }
      if (r < 0.8) return goPlaza(a, 'loafing at ');
      return goLake(a);
    }
    if (hour < 14.2) {
      if (r < 0.58) return goRoof(a, hour);
      if (r < 0.8) return goPlaza(a, 'napping at ', 'sleep');
      return set('sleep', 6 + rr() * 10, 'napping in the middle of the street');
    }
    if (hour < 17) {
      if (r < 0.35) return goLake(a);
      if (r < 0.6) return goPlaza(a, 'playing at ');
      if (r < 0.8) {
        const d = doorOf(a.work, rr);
        a.where = 'work';
        return go(a, d.phi, d.r, 'back to ' + a.work.name + ' (reluctantly)');
      }
      return set('sit', 3 + rr() * 6, 'grooming thoroughly');
    }
    if (hour < 20) {
      if (r < 0.45) {
        const fm = W.buildings.find((b) => b.name === 'Fish Market') || a.work;
        const d = doorOf(fm, rr);
        return go(a, d.phi + (rr() - 0.5) * 0.22, d.r + (rr() - 0.5) * 0.25, 'queueing at the Fish Market');
      }
      if (r < 0.75) return goPlaza(a, 'evening gossip at ');
      return goLake(a);
    }
    if (r < 0.55) {
      const d = doorOf(a.home, rr);
      return go(a, d.phi, d.r, 'heading home to ' + a.home.name, 'enter');
    }
    return set('sit', 3 + rr() * 5, 'watching the lights come on');
  }
  function goPlaza(a, verb, then) {
    const rr = Math.random;
    const opts = W.plazas.concat([{ phi: W.PHI_C, r: 8.4, name: 'Cranium Plaza' }]);
    const p = opts[Math.floor(rr() * opts.length)];
    const ang = (rr() - 0.5) * (1.4 / p.r);
    go(a, p.phi + ang, p.r + (rr() - 0.5) * 1.3, verb + p.name, then === 'sleep' ? 'sleep' : 'idle');
  }
  function goLake(a) {
    const u = Math.random() * W.SPAN;
    go(a, W.PHI0 + u, W.LANES.prom, 'fishing at Belly Lake', 'fish');
  }
  function goRoof(a, hour) {
    // nearest-ish building, often home or work
    const rr = Math.random;
    let b = rr() < 0.5 ? a.home : a.work;
    if (rr() < 0.4) {
      const near = W.buildings.filter((x) => Math.abs(U.angDiff(x.phi, a.phi)) < W.DPHI * 2.5);
      if (near.length) b = near[Math.floor(rr() * near.length)];
    }
    const d = doorOf(b, rr);
    a.roofTarget = b;
    go(a, d.phi, d.r, 'off to nap on the roof of ' + b.name, 'roof');
  }

  function arrive(a, hour) {
    const then = a.then;
    if (then === 'enter') {
      a.state = 'entering';
      a.visT = 0;
      a.activity = 'at home in ' + a.home.name;
      a.where = 'home';
      return;
    }
    if (then === 'roof' && a.roofTarget) {
      const b = a.roofTarget;
      const phi = b.phi + (Math.random() - 0.5) * (b.tl / b.r) * 0.6;
      const r = b.r + (Math.random() - 0.5) * b.d * 0.5;
      a.jump = { t: 0, dur: 0.75, fx: a.x, fy: a.y, fz: a.z, tphi: phi, tr: r, ty: b.roofY + 0.01, then: 'roofsleep' };
      a.state = 'jump';
      a.roof = b;
      a.activity = 'napping on the roof of ' + b.name;
      return;
    }
    if (then === 'fish') {
      a.state = 'idle';
      a.pose = 'sit';
      a.timer = 6 + Math.random() * 10;
      a.heading = Math.atan2(-a.x, -a.z);
      a.faceFixed = true;
      return;
    }
    if (then === 'sleep') {
      a.state = 'idle';
      a.pose = 'sleep';
      a.timer = 8 + Math.random() * 10;
      return;
    }
    a.state = 'idle';
    a.pose = Math.random() < 0.6 ? 'sit' : 'walk';
    a.timer = 3 + Math.random() * 7;
  }

  // ---------------------------------------------------------------- per-frame
  const dummy = new T.Object3D();
  let clock = 0;
  C.update = function (dt, hour, P, state) {
    clock += dt;
    const mesh = C.mesh;
    const city = P >= 0.97;
    mesh.visible = P > 0.85;
    const folding = state === 'fold' || state === 'bell';
    const laser = C.laser;
    let chasers = 0;
    const landedFish = C.fish.filter((f) => f.landed && !f.eaten);

    for (let n = 0; n < agents.length; n++) {
      const a = agents[n];
      // visibility envelope
      if (!city || folding) {
        if (state === 'unfold' || P < 0.9) {
          a.state = 'inside';
          a.vis = Math.max(0, a.vis - dt * 3);
          a.phi = a.home.phi;
          a.r = a.home.doorR;
          a.roof = null;
          a.jump = null;
        }
      }
      if (city) {
        if (a.state === 'inside') {
          a.vis = Math.max(0, a.vis - dt * 4);
          const wake = 6.15 + a.lazy * 2.2;
          if (!C.forceHome && hour >= wake && hour < 21.2) {
            const d = doorOf(a.home, Math.random);
            a.phi = d.phi;
            a.r = d.r;
            a.state = 'idle';
            a.pose = 'sit';
            a.timer = 0.4 + Math.random();
            a.activity = 'stretching on the doorstep';
            a.where = 'home';
          }
        } else if (a.state === 'entering') {
          a.vis = Math.max(0, a.vis - dt * 3);
          if (a.vis <= 0) a.state = 'inside';
        } else {
          a.vis = Math.min(1, a.vis + dt * 2.5);
          // targets: fish first, then laser
          let target = null;
          if (a.state !== 'jump' && a.state !== 'eat' && !C.forceHome) {
            let best = 9;
            for (const f of landedFish) {
              const d = Math.hypot(f.x - a.x, f.z - a.z);
              if (d < best) {
                best = d;
                target = f;
              }
            }
            if (!target && laser.active) {
              const d = Math.hypot(laser.x - a.x, laser.z - a.z);
              if (d < 7.5 || (a.state === 'chase' && d < 11)) target = laser;
            }
          }
          if (target) {
            if (a.state !== 'chase') {
              a.state = 'chase';
              a.roof = null;
              a.faceFixed = false;
            }
            chase(a, target, dt);
            if (target === laser) chasers++;
          } else if (a.state === 'chase') {
            a.state = 'idle';
            a.pose = 'sit';
            a.timer = 0.6 + Math.random() * 1.5;
            a.activity = 'pretending that never happened';
            syncPolar(a);
            if (a.y > W.GROUND + 0.4) {
              // hop back down to the street
              const ph = spoke(a.phi);
              a.jump = { t: 0, dur: 0.6, fx: a.x, fy: a.y, fz: a.z, tphi: ph, tr: a.r, ty: W.heightAt(Math.cos(ph) * a.r, Math.sin(ph) * a.r), then: 'idle' };
              a.state = 'jump';
            }
          } else if (a.state === 'walk') {
            walk(a, dt, hour);
          } else if (a.state === 'idle') {
            a.timer -= dt;
            if (a.timer <= 0 || (C.forceHome && a.then !== 'enter')) {
              a.faceFixed = false;
              if (a.roof) {
                // climb down from a roof nap
                const b = a.roof;
                const d = doorOf(b, Math.random);
                a.jump = { t: 0, dur: 0.7, fx: a.x, fy: a.y, fz: a.z, tphi: d.phi, tr: d.r, ty: W.GROUND, then: 'decide' };
                a.state = 'jump';
                a.roof = null;
              } else decide(a, hour);
            }
            if (a.pose === 'walk' && !a.faceFixed) a.heading += Math.sin(clock + n) * dt * 0.5;
          } else if (a.state === 'jump') {
            const j = a.jump;
            j.t += dt / j.dur;
            const t = Math.min(1, j.t);
            const tx = Math.cos(j.tphi) * j.tr, tz = Math.sin(j.tphi) * j.tr;
            const nx = U.lerp(j.fx, tx, t), nz = U.lerp(j.fz, tz, t);
            if (t < 1) a.heading = Math.atan2(tx - j.fx, tz - j.fz);
            a.x = nx;
            a.z = nz;
            a.y = U.lerp(j.fy, j.ty, t) + Math.sin(t * Math.PI) * (0.6 + Math.abs(j.ty - j.fy) * 0.4);
            a.pose = 'walk';
            if (t >= 1) {
              a.phi = j.tphi;
              a.r = j.tr;
              a.jump = null;
              if (j.then === 'roofsleep') {
                a.state = 'idle';
                a.pose = 'sleep';
                a.timer = hour < 14.2 ? (14.2 - hour) * 10 + Math.random() * 8 : 6;
              } else {
                a.state = 'idle';
                a.timer = 0.01;
              }
            }
          } else if (a.state === 'eat') {
            a.eat -= dt;
            a.pose = 'sit';
            if (a.eat <= 0) {
              a.state = 'idle';
              a.timer = 1 + Math.random() * 2;
              a.activity = 'digesting, smugly';
            }
          }
        }
      }
      if (a.state !== 'chase' && a.state !== 'jump') {
        a.x = Math.cos(a.phi) * a.r;
        a.z = Math.sin(a.phi) * a.r;
        let gy;
        if (a.roof && a.state === 'idle') gy = a.roof.roofY + 0.01;
        else {
          gy = W.heightAt(a.x, a.z);
          if (gy > W.GROUND + 0.5) gy = W.GROUND + 0.14;
          if (gy < 0) gy = 0.02;
        }
        a.y += (gy - a.y) * Math.min(1, dt * 10);
      }
      // write instance
      const s = U.easeOutBack(U.clamp(a.vis), 2) * (a.vis > 0.001 ? 1 : 0.0001);
      let bob = 0, sx = 1, sy = 1, sz = 1;
      if (a.pose === 'walk' && (a.state === 'walk' || a.state === 'chase')) {
        a.bob += dt * (a.state === 'chase' ? 22 : 13) * (a.walkSpeed || 1);
        bob = Math.abs(Math.sin(a.bob)) * 0.05;
        sy = 1 + Math.sin(a.bob * 2) * 0.04;
      } else if (a.pose === 'sit') {
        sx = 0.95; sy = 1.12; sz = 0.72;
      } else if (a.pose === 'sleep') {
        sx = 1.15; sy = 0.48 + Math.sin(clock * 1.7 + n) * 0.03; sz = 0.7;
      }
      if (a.boop > 0) {
        a.boop -= dt;
        bob += Math.sin((1 - a.boop) * Math.PI) * 0.5;
      }
      dummy.position.set(a.x, a.y + bob, a.z);
      dummy.rotation.set(0, a.heading, 0);
      dummy.scale.set(sx * s, sy * s, sz * s);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    C.chasers = chasers;

    updateFish(dt);
    updateMouse(dt, P);
    updateHearts(dt);
    updateBox(dt);
  };

  function syncPolar(a) {
    a.phi = Math.atan2(a.z, a.x);
    a.r = Math.hypot(a.x, a.z);
  }

  function walk(a, dt, hour) {
    const tgt = a.path[a.pi];
    if (!tgt) return arrive(a, hour);
    const dphi = U.angDiff(a.phi, tgt.phi);
    const dr = tgt.r - a.r;
    const rm = (a.r + tgt.r) / 2;
    const dist = Math.hypot(dr, dphi * rm);
    const step = (a.walkSpeed || a.speed) * dt;
    const ox = a.x, oz = a.z;
    if (dist <= step) {
      a.phi = tgt.phi;
      a.r = tgt.r;
      a.pi++;
      if (a.pi >= a.path.length) arrive(a, hour);
    } else {
      const f = step / dist;
      a.phi += dphi * f;
      a.r += dr * f;
    }
    const nx = Math.cos(a.phi) * a.r, nz = Math.sin(a.phi) * a.r;
    if (Math.abs(nx - ox) + Math.abs(nz - oz) > 1e-5) {
      const h = Math.atan2(nx - ox, nz - oz);
      a.heading += U.angDiff(a.heading, h) * Math.min(1, dt * 12);
    }
  }

  function chase(a, target, dt) {
    const dx = target.x - a.x, dz = target.z - a.z;
    const d = Math.hypot(dx, dz);
    const sp = 2.6 * (0.8 + a.lazy * 0.0 + (a.i % 5) * 0.08);
    a.pose = 'walk';
    a.walkSpeed = 2.2;
    a.activity = target === C.laser ? 'CHASING THE RED DOT' : 'running towards a fish';
    if (d > 0.22) {
      const st = Math.min(d - 0.2, sp * dt);
      const nx = a.x + (dx / d) * st + Math.sin(clock * 7 + a.i) * 0.004;
      const nz = a.z + (dz / d) * st;
      const gy = W.heightAt(nx, nz);
      if (gy >= 0) {
        a.x = nx;
        a.z = nz;
        a.y += (gy - a.y) * Math.min(1, dt * 14);
        if (gy - a.y > 0.15) a.y += Math.min(gy - a.y, dt * 6); // scramble up
      }
      a.heading += U.angDiff(a.heading, Math.atan2(dx, dz)) * Math.min(1, dt * 14);
    } else {
      a.boop = a.boop > 0 ? a.boop : 0.5; // pounce!
      if (target !== C.laser && !target.eaten) {
        target.eaten = true;
        a.state = 'eat';
        a.eat = 2.2;
        a.activity = 'eating a fish (do not disturb)';
        C.heartAt(a.x, a.y + 0.6, a.z, 3);
        if (CTC.audio) CTC.audio.meow(1.2, 0.08);
        syncPolar(a);
      }
    }
    syncPolar(a);
  }

  // ---------------------------------------------------------------- fish from the sky
  C.dropFish = function (x, z) {
    if (C.fish.length > 10) {
      const old = C.fish.shift();
      W.scene.remove(old.mesh);
    }
    const m = new T.Mesh(C.fishGeo, C.fishMat);
    m.castShadow = true;
    W.scene.add(m);
    const gy = Math.max(0.05, W.heightAt(x, z));
    const f = { mesh: m, x, z, y: 9, vy: 0, gy, landed: false, eaten: false, spin: Math.random() * 6, life: 0 };
    C.fish.push(f);
  };
  function updateFish(dt) {
    for (let i = C.fish.length - 1; i >= 0; i--) {
      const f = C.fish[i];
      f.life += dt;
      if (!f.landed) {
        f.vy -= 18 * dt;
        f.y += f.vy * dt;
        f.spin += dt * 8;
        if (f.y <= f.gy + 0.08) {
          f.y = f.gy + 0.08;
          if (f.vy < -3) {
            f.vy = -f.vy * 0.3;
            if (CTC.audio) CTC.audio.clack(1.6, 0.08);
          } else {
            f.landed = true;
            f.vy = 0;
          }
        }
      }
      f.mesh.position.set(f.x, f.y, f.z);
      f.mesh.rotation.set(f.landed ? Math.PI / 2 : f.spin, f.spin * 0.3, f.landed ? Math.sin(f.life * 20) * 0.2 : 0);
      if (f.eaten) {
        f.mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 4));
        if (f.mesh.scale.x < 0.05) {
          W.scene.remove(f.mesh);
          C.fish.splice(i, 1);
        }
      } else if (f.life > 40 || f.gy < 0) {
        W.scene.remove(f.mesh);
        C.fish.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- mouse
  function updateMouse(dt, P) {
    const m = C.mouse;
    m.group.visible = P >= 1;
    if (!m.group.visible) return;
    if (m.moving) {
      const dphi = U.angDiff(m.phi, m.tphi);
      const dr = m.tr - m.r;
      const dist = Math.hypot(dr, dphi * m.r);
      const st = 2.8 * dt;
      if (dist < st) {
        m.phi = m.tphi;
        m.r = m.tr;
        m.moving = false;
        m.wait = 3 + Math.random() * 6;
      } else {
        m.phi += (dphi * st) / dist;
        m.r += (dr * st) / dist;
      }
      m.group.rotation.y = Math.atan2(-Math.sin(m.phi) * dphi * m.r + Math.cos(m.phi) * dr, Math.cos(m.phi) * dphi * m.r + Math.sin(m.phi) * dr);
    } else {
      m.wait -= dt;
      // flee if a cat gets close
      let near = false;
      const mx = Math.cos(m.phi) * m.r, mz = Math.sin(m.phi) * m.r;
      for (let i = 0; i < agents.length; i += 3) {
        const a = agents[i];
        if (a.vis > 0.5 && Math.abs(a.x - mx) + Math.abs(a.z - mz) < 1.2) near = true;
      }
      if (m.wait <= 0 || near) {
        m.moving = true;
        m.tphi = m.phi + (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.6);
        m.tr = 15.4 + Math.random() * 2.8;
      }
    }
    const x = Math.cos(m.phi) * m.r, z = Math.sin(m.phi) * m.r;
    m.group.position.set(x, 0.0 + (m.moving ? Math.abs(Math.sin(clock * 30)) * 0.03 : 0), z);
  }

  function updateHearts(dt) {
    for (const h of C.hearts) {
      if (h.t >= 1) continue;
      h.t += dt * 0.7;
      h.s.position.y += dt * 0.9;
      h.s.position.x += h.vx * dt;
      const sc = 0.35 + h.t * 0.3;
      h.s.scale.set(sc, sc, sc);
      h.s.material.opacity = Math.sin(Math.min(1, h.t) * Math.PI);
      if (h.t >= 1) h.s.visible = false;
    }
  }

  // ---------------------------------------------------------------- box secret
  C.openBox = function () {
    const b = W.box;
    b.open = 1;
    b.popT = 0;
    // a crowd forms
    let n = 0;
    for (const a of agents) {
      if (a.state === 'inside' || n > 18) continue;
      if (Math.random() < 0.35) {
        go(a, b.phi + (Math.random() - 0.5) * 0.12, b.r - 0.9 + (Math.random() - 0.5) * 0.8, 'staring at the box', 'idle', 1.6);
        n++;
      }
    }
    if (!C.boxCat) {
      const m = new T.Mesh(C.mesh.geometry, new T.MeshStandardMaterial({ vertexColors: true, color: 0x2b2b30, flatShading: true }));
      m.scale.setScalar(1.6);
      b.group.add(m);
      C.boxCat = m;
      m.userData.info = { title: 'Box Cat', formerly: '—', desc: 'If it fits, it sits. It fits.', box: true };
      W.pickables.push(m);
    }
  };
  function updateBox(dt) {
    const b = W.box;
    if (!b) return;
    b.flaps.forEach((f) => {
      const target = b.open ? f.userData.s * 2.3 : f.userData.s * 0.5;
      f.rotation.x += (target - f.rotation.x) * Math.min(1, dt * 6);
    });
    if (C.boxCat) {
      b.popT = Math.min(1, (b.popT || 0) + dt * 2);
      C.boxCat.position.set(0, 0.05 + U.easeOutBack(b.popT, 3) * 0.35, 0);
      C.boxCat.rotation.y = Math.sin(clock * 0.8) * 0.5;
    }
  }

  C.describe = function (i) {
    const a = agents[i];
    if (!a) return null;
    return { title: a.name + ' · ' + a.age + (a.age === 1 ? ' yr' : ' yrs'), formerly: a.job, desc: 'Currently ' + a.activity + '. Lives at ' + a.home.name + '.', cat: a };
  };
  C.poke = function (i) {
    const a = agents[i];
    if (!a) return;
    a.boop = 0.5;
    C.heartAt(a.x, a.y + 0.6, a.z, 2);
  };
})();
