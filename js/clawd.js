/* CAT / TRANSFORM CITY — Clawd, a visitor from the terminal.
 * Made of voxels rather than paper. Keeps watch beside the sleeping cat at night,
 * steps back to watch the unfolding, tours the city by day. Not a cat. */
(function () {
  'use strict';
  const T = THREE;
  const U = CTC.util;
  const W = CTC.world;
  const C = CTC.citizens;
  const K = (CTC.clawd = {});

  const ORANGE = 0xd97757;
  const INK = 0x1b1512;

  const LINES = {
    day: [
      'Hi! I’m Clawd.',
      'I fold code, not paper. But I respect the craft.',
      'This whole city used to be a cat. Wild.',
      'Main Street is very well indented.',
      'I asked the mayor for a commit message. She sat on my keyboard.',
      'No bugs in this city. Only mice.',
      'I’m not a cat. Please don’t tell anyone.',
      'The roofs still have stripes. Nice continuity.',
      'Have you tried turning the cat off and on again?',
    ],
    night: ['Shh. It’s sleeping.', 'I’m on night watch.', 'It purrs at about 26 hertz. I measured.', 'Somewhere in there is Main Street.'],
    unfold: ['Here it goes!', 'Every time. Every single morning.'],
    laser: ['I don’t know why I’m chasing this.', 'Must… catch… dot.'],
    morning: ['Morning, city!'],
    evening: ['Bell’s ringing. Back to my post.'],
  };

  K.build = function (scene) {
    const box = (w, h, d, x, y, z, color) => ({ geo: new T.BoxGeometry(w, h, d), matrix: U.mat4([x, y, z]), color });
    const bodyGeo = U.merge([
      box(0.9, 0.5, 0.46, 0, 0.43, 0, ORANGE),
      // eyes: tall dark blocks near the top of the face
      box(0.09, 0.15, 0.04, -0.21, 0.55, 0.23, INK),
      box(0.09, 0.15, 0.04, 0.21, 0.55, 0.23, INK),
      // four little legs
      box(0.08, 0.2, 0.12, -0.33, 0.09, 0, ORANGE),
      box(0.08, 0.2, 0.12, -0.15, 0.09, 0, ORANGE),
      box(0.08, 0.2, 0.12, 0.15, 0.09, 0, ORANGE),
      box(0.08, 0.2, 0.12, 0.33, 0.09, 0, ORANGE),
    ]);
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, flatShading: true, emissive: 0xd97757, emissiveIntensity: 0 });
    K.mat = m;
    const g = new T.Group();
    const body = new T.Mesh(bodyGeo, m);
    g.add(body);
    const armGeo = U.merge([box(0.16, 0.13, 0.2, 0.08, 0, 0, ORANGE)]);
    const armL = new T.Mesh(armGeo, m);
    const armR = new T.Mesh(armGeo, m);
    armR.position.set(0.45, 0.36, 0);
    armL.position.set(-0.45, 0.36, 0);
    armL.scale.x = -1;
    g.add(armL, armR);
    // a small lantern for night watch, hanging from the right arm
    const lantern = new T.Group();
    const lb = new T.Mesh(new T.BoxGeometry(0.1, 0.13, 0.1), new T.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffb040, emissiveIntensity: 1 }));
    lb.position.y = -0.12;
    const lh = new T.Mesh(new T.BoxGeometry(0.02, 0.08, 0.02), new T.MeshStandardMaterial({ color: 0x333333 }));
    lh.position.y = -0.03;
    const lg = new T.Sprite(new T.SpriteMaterial({ map: W.glowTex, color: 0xffb860, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    lg.scale.set(1.6, 1.6, 1.6);
    lg.position.y = -0.12;
    lantern.add(lh, lb, lg);
    lantern.position.set(0.16, -0.05, 0.05);
    armR.add(lantern);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.userData.info = {
          title: 'Clawd',
          formerly: 'a visitor from the terminal',
          desc: 'Not a cat. Made of voxels, not paper. Keeps watch every night and tours the city every day. Click to say hello.',
          clawd: true,
        };
        W.pickables.push(o);
      }
    });
    g.scale.setScalar(0.95);
    scene.add(g);

    // spots: beside the sleeping head, and a viewing spot out past the railway
    const watchPhi = W.PHI0 + W.SPAN + U.deg(23);
    K.sleepSpot = { phi: watchPhi + U.deg(2), r: 12.2 };
    K.viewSpot = { phi: watchPhi + U.deg(6), r: 16.4 };
    Object.assign(K, {
      group: g, body, armL, armR, lantern, glow: lg,
      phi: K.sleepSpot.phi, r: K.sleepSpot.r, x: 0, z: 0, y: 0,
      heading: 0, mode: 'watch', path: [], pi: 0, wait: 2, hop: 0, wave: 0, t: 0, said: {},
    });
    const bub = document.createElement('div');
    bub.id = 'bubble';
    document.body.appendChild(bub);
    K.bubbleEl = bub;
    K.bubbleT = 0;
  };

  function say(text, dur = 3.6) {
    K.bubbleEl.textContent = text;
    K.bubbleEl.classList.add('show');
    K.bubbleT = dur;
  }
  K.say = say;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  K.poke = function (S) {
    K.hop = 1;
    K.wave = 2.2;
    const set = S.state === 'day' ? LINES.day : S.state === 'unfold' || S.state === 'waking' ? LINES.unfold : LINES.night;
    let line = pick(set);
    if (line === K.lastLine) line = pick(set);
    K.lastLine = line;
    say(line);
    if (CTC.audio) {
      CTC.audio.note(4, 0.08, 72);
      setTimeout(() => CTC.audio.note(7, 0.08, 72), 110);
    }
  };

  // ---- movement
  function faceToward(x, z, dt, rate = 8) {
    const h = Math.atan2(x - K.x, z - K.z);
    K.heading += U.angDiff(K.heading, h) * Math.min(1, dt * rate);
  }
  function straightTo(phi, r, dt, speed) {
    const tx = Math.cos(phi) * r, tz = Math.sin(phi) * r;
    const dx = tx - K.x, dz = tz - K.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const st = Math.min(d, speed * dt);
    K.x += (dx / d) * st;
    K.z += (dz / d) * st;
    K.phi = Math.atan2(K.z, K.x);
    K.r = Math.hypot(K.x, K.z);
    faceToward(tx, tz, dt);
    K.walking = true;
    return false;
  }
  function followPath(dt, speed) {
    const tgt = K.path[K.pi];
    if (!tgt) return true;
    const dphi = U.angDiff(K.phi, tgt.phi);
    const dr = tgt.r - K.r;
    const dist = Math.hypot(dr, dphi * (K.r + tgt.r) / 2);
    const st = speed * dt;
    const ox = K.x, oz = K.z;
    if (dist <= st) {
      K.phi = tgt.phi;
      K.r = tgt.r;
      K.pi++;
    } else {
      K.phi += (dphi * st) / dist;
      K.r += (dr * st) / dist;
    }
    K.x = Math.cos(K.phi) * K.r;
    K.z = Math.sin(K.phi) * K.r;
    if (Math.abs(K.x - ox) + Math.abs(K.z - oz) > 1e-5) faceToward(K.x + (K.x - ox) * 50, K.z + (K.z - oz) * 50, dt, 10);
    K.walking = true;
    return K.pi >= K.path.length;
  }
  function tourStop() {
    const opts = [
      ...W.plazas.map((p) => ({ phi: p.phi + (Math.random() - 0.5) * 0.1, r: p.r + 0.6 })),
      { phi: W.PHI_C + 0.12, r: 8.4 + 1.6 },
      { phi: W.PHI0 + Math.random() * W.SPAN, r: W.LANES.prom },
      { phi: W.PHI0 + Math.random() * W.SPAN, r: W.LANES.main },
      { phi: W.PHI0 + Math.random() * W.SPAN, r: W.LANES.alleyOut },
      { phi: W.stationPhi, r: W.LANES.outer },
      { phi: W.box.phi + 0.05, r: W.box.r - 1.2 },
    ];
    return pick(opts);
  }

  // ---- per frame
  K.update = function (dt, S, camera) {
    if (!K.group) return;
    K.t += dt;
    K.walking = false;
    const st = S.state;
    const laser = C.laser;
    const city = S.P >= 1;

    if (st === 'intro' || st === 'sleep' || st === 'waking') {
      K.mode = 'watch';
      if (straightTo(K.sleepSpot.phi, K.sleepSpot.r, dt, 1.4)) faceToward(W.headPos.x, W.headPos.z, dt, 3);
      if (st === 'waking' && !K.said.wake) {
        K.said.wake = true;
        K.hop = 1;
      }
    } else if (st === 'unfold') {
      if (K.mode !== 'view') {
        K.mode = 'view';
        K.hop = 1;
        if (S.P < 0.1) say(pick(LINES.unfold), 3);
      }
      if (straightTo(K.viewSpot.phi, K.viewSpot.r, dt, 2.6)) {
        faceToward(0, 0, dt, 3);
        if (S.P > 0.9) K.wave = Math.max(K.wave, 0.5);
      }
    } else if (st === 'day' && city) {
      if (K.mode !== 'tour' && K.mode !== 'chase') {
        K.mode = 'tour';
        K.path = [];
        K.wait = 1.5;
        K.said = {};
        setTimeout(() => S.state === 'day' && say(LINES.morning[0], 2.6), 1800);
      }
      const near = laser.active && Math.hypot(laser.x - K.x, laser.z - K.z) < 8;
      if (near) {
        if (K.mode !== 'chase') {
          K.mode = 'chase';
          if (!K.said.laser) {
            K.said.laser = true;
            say(pick(LINES.laser), 2.8);
          }
        }
        const dx = laser.x - K.x, dz = laser.z - K.z, d = Math.hypot(dx, dz);
        if (d > 0.4) {
          const s = Math.min(d - 0.35, 2.3 * dt);
          const nx = K.x + (dx / d) * s, nz = K.z + (dz / d) * s;
          if (W.heightAt(nx, nz) >= 0) {
            K.x = nx;
            K.z = nz;
          }
          faceToward(laser.x, laser.z, dt, 12);
          K.walking = true;
        } else if (K.hop <= 0) K.hop = 0.7;
        K.phi = Math.atan2(K.z, K.x);
        K.r = Math.hypot(K.x, K.z);
      } else {
        if (K.mode === 'chase') {
          K.mode = 'tour';
          K.path = [];
          K.wait = 1;
          // step back onto the nearest lane
          K.r = U.clamp(K.r, 3.98, 17);
        }
        if (K.path.length && K.pi < K.path.length) {
          followPath(dt, 1.15);
        } else {
          K.wait -= dt;
          if (K.wave <= 0 && Math.random() < dt * 0.15) K.wave = 1.2;
          if (K.wait <= 0) {
            const s = tourStop();
            C.plan(K, s.phi, s.r);
            K.wait = 3 + Math.random() * 5;
          }
        }
      }
    } else if (st === 'bell' || st === 'fold') {
      if (K.mode !== 'home') {
        K.mode = 'home';
        say(LINES.evening[0], 2.6);
      }
      if (S.P > 0.3) {
        if (straightTo(K.viewSpot.phi, K.viewSpot.r, dt, 2.4)) faceToward(0, 0, dt, 3);
      } else if (straightTo(K.sleepSpot.phi, K.sleepSpot.r, dt, 2.4)) faceToward(W.headPos.x, W.headPos.z, dt, 3);
    }

    K.x = Math.cos(K.phi) * K.r;
    K.z = Math.sin(K.phi) * K.r;
    let gy = city ? W.heightAt(K.x, K.z) : 0;
    if (gy < 0) gy = 0.02;
    if (gy > 1.2 && K.mode !== 'chase') gy = W.GROUND;
    K.y += (gy - K.y) * Math.min(1, dt * 10);

    // animation: waddle, hop, arm waves, idle bob
    let bob = Math.sin(K.t * 2.2) * 0.012;
    let tilt = 0;
    if (K.walking) {
      bob = Math.abs(Math.sin(K.t * 14)) * 0.06;
      tilt = Math.sin(K.t * 14) * 0.08;
    }
    if (K.hop > 0) {
      K.hop = Math.max(0, K.hop - dt * 2.2);
      bob += Math.sin((1 - K.hop) * Math.PI) * 0.55;
    }
    const g = K.group;
    g.scale.setScalar(U.lerp(1.55, 1.1, U.clamp(S.P * 1.5)));
    K.mat.emissiveIntensity = W.night * 0.32;
    g.position.set(K.x, K.y + bob, K.z);
    g.rotation.set(0, K.heading, tilt);
    let aL = 0, aR = 0;
    if (K.walking) {
      aL = Math.sin(K.t * 14) * 0.5;
      aR = -aL;
    }
    if (K.wave > 0) {
      K.wave = Math.max(0, K.wave - dt);
      aR = -1.2 - Math.sin(K.t * 16) * 0.5;
      if (S.P > 0.9 || st === 'day') aL = 1.2 + Math.sin(K.t * 16 + 1) * 0.5;
    }
    K.armL.rotation.z = -aL;
    K.armR.rotation.z = aR;
    // lantern only on night watch
    const lanternOn = (st === 'sleep' || st === 'intro' || st === 'waking' || st === 'fold') && W.night > 0.3;
    K.lantern.visible = lanternOn;
    K.glow.material.opacity = lanternOn ? W.night * (0.75 + Math.sin(K.t * 7) * 0.08) : 0;
    K.lantern.rotation.z = -aR;

    // speech bubble follows Clawd on screen
    if (K.bubbleT > 0) {
      K.bubbleT -= dt;
      const v = new T.Vector3(K.x, K.y + 1.15, K.z).project(camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      K.bubbleEl.style.transform = 'translate(' + ((v.x + 1) / 2) * innerWidth + 'px,' + ((1 - v.y) / 2) * innerHeight + 'px) translate(-50%, -100%)';
      if (K.bubbleT <= 0 || !on) K.bubbleEl.classList.remove('show');
    }
  };
})();
