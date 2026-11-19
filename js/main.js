/* CAT / TRANSFORM CITY — director: camera, story states, input, secrets, film UI */
(function () {
  'use strict';
  const T = THREE;
  const U = CTC.util;
  const W = CTC.world;
  const C = CTC.citizens;
  const A = CTC.audio;
  const $ = (s) => document.querySelector(s);

  // ------------------------------------------------------------ renderer
  const canvas = $('#scene');
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    $('#nogl').hidden = false;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, 0.5, 700);

  W.build(scene);
  W.indexBuildings();
  C.build(scene);
  W.pickables.push(C.mesh);
  const K = CTC.clawd;
  K.build(scene);

  // ------------------------------------------------------------ story state
  const S = (CTC.state = {
    state: 'intro',
    P: 0,
    hour: 2.6,
    nightHour: 2.6,
    t: 0,
    speed: 1,
    wake: 0,
    purr: 0.25,
    tool: 'look',
    secrets: {},
  });
  const DAY_SECONDS_PER_HOUR = 10;
  const UNFOLD_SECONDS = 21;
  const FOLD_SECONDS = 17;

  const sleepTarget = W.headPos.clone().multiplyScalar(0.62).setY(1.3);
  const faceTheta = (() => {
    const f = W.headPos.clone().addScaledVector(W.headFwd, 12).addScaledVector(U.radial(Math.atan2(W.headPos.z, W.headPos.x)), 5).sub(sleepTarget);
    return Math.atan2(f.z, f.x);
  })();

  // ------------------------------------------------------------ camera rig
  const cam = { target: sleepTarget.clone(), dist: 22, theta: faceTheta, phi: 1.12 };
  const want = { target: sleepTarget.clone(), dist: 22, theta: faceTheta, phi: 1.12 };
  let userHold = 0;
  let userTheta = 0, userPhi = 0, userZoom = 1;
  function camUpdate(dt) {
    const st = S.state;
    const t = S.t;
    if (st === 'intro' || st === 'sleep') {
      want.target.copy(sleepTarget);
      want.dist = st === 'intro' ? 25 : 21;
      want.phi = 1.1;
      want.theta = faceTheta + Math.sin(t * 0.07) * 0.35;
    } else if (st === 'waking') {
      want.target.copy(sleepTarget).lerp(new T.Vector3(0, 1.5, 0), 0.3);
      want.dist = 25;
      want.phi = 1.05;
      want.theta = faceTheta + 0.1;
    } else if (st === 'unfold') {
      const p = U.easeInOutCubic(S.P);
      want.target.copy(sleepTarget).lerp(new T.Vector3(0, 0.8, 0), U.clamp(S.P * 2));
      want.dist = U.lerp(25, 41, p);
      want.phi = U.lerp(1.05, 0.9, p);
      want.theta = faceTheta + 0.1 + p * 1.25;
    } else if (st === 'day') {
      want.target.set(0, 0.8, 0);
      want.dist = 38;
      want.phi = 0.92;
      if (userHold <= 0) want.theta += dt * 0.022;
    } else if (st === 'bell') {
      want.dist = 42;
      want.phi = 0.85;
    } else if (st === 'fold') {
      const p = U.easeInOutCubic(1 - S.P);
      want.target.copy(new T.Vector3(0, 0.8, 0)).lerp(sleepTarget, p);
      want.dist = U.lerp(42, 22, p);
      want.phi = U.lerp(0.85, 1.1, p);
      if (p > 0.15) want.theta += U.angDiff(want.theta, faceTheta) * Math.min(1, dt * 0.6);
    }
    userHold -= dt;
    // user offsets decay back to the cinematic rig when idle (except during the day)
    if (userHold <= 0 && st !== 'day') {
      userTheta *= 1 - Math.min(1, dt * 0.4);
      userPhi *= 1 - Math.min(1, dt * 0.4);
      userZoom += (1 - userZoom) * Math.min(1, dt * 0.4);
    }
    const k = 1 - Math.exp(-dt * 2.2);
    cam.target.lerp(want.target, k);
    cam.dist += (want.dist * userZoom - cam.dist) * k;
    cam.theta += U.angDiff(cam.theta, want.theta + userTheta) * k;
    cam.phi += (U.clamp(want.phi + userPhi, 0.22, 1.42) - cam.phi) * k;
    const sp = Math.sin(cam.phi);
    camera.position.set(
      cam.target.x + cam.dist * sp * Math.cos(cam.theta),
      cam.target.y + cam.dist * Math.cos(cam.phi),
      cam.target.z + cam.dist * sp * Math.sin(cam.theta)
    );
    camera.lookAt(cam.target);
  }

  // ------------------------------------------------------------ UI helpers
  const ui = {
    subtitle: $('#subtitle'),
    chapter: $('#chapter'),
    clock: $('#clock'),
    phase: $('#phase'),
    tip: $('#tooltip'),
    toast: $('#toast'),
    hint: $('#hint'),
    meter: $('#meter i'),
    secretsBtn: $('#secrets-btn'),
    secretsPanel: $('#secrets-panel'),
  };
  let subTimer = 0;
  function subtitle(text, stamp, dur = 6) {
    ui.subtitle.innerHTML = (stamp ? '<span class="stamp">' + stamp + '</span>' : '') + '<span class="line">' + text + '</span>';
    ui.subtitle.classList.remove('show');
    void ui.subtitle.offsetWidth;
    ui.subtitle.classList.add('show');
    subTimer = dur;
  }
  function chapter(num, title) {
    ui.chapter.innerHTML = '<span class="num">' + num + '</span><span class="title">' + title + '</span>';
    ui.chapter.classList.remove('show');
    void ui.chapter.offsetWidth;
    ui.chapter.classList.add('show');
    $('#chapter-name').textContent = num + ' · ' + title;
  }
  let toastTimer = null;
  function toast(html) {
    ui.toast.innerHTML = html;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 4200);
  }
  function setBars(on) {
    document.body.classList.toggle('cinema', on);
  }

  // ------------------------------------------------------------ secrets
  const SECRETS = [
    ['boop', 'The Boop', 'Some noses are made for booping.'],
    ['mouse', 'Rent-Free', 'Something small lives in the park.'],
    ['box', 'If It Fits', 'Somebody left a box out on the cushion.'],
    ['laser', 'The Red Dot Cult', 'Gather twenty followers of the dot at once.'],
    ['yarn', 'The Moon Is Yarn', 'Look up, at night.'],
    ['tail', 'Chasing Its Own Tail', 'The train gets ideas if you keep encouraging it.'],
    ['belly', 'Belly Rub', 'Rub the heart of the city. A lot.'],
    ['clawd', 'Hello, Clawd', 'Someone around here is not a cat.'],
  ];
  function renderSecrets() {
    const n = Object.keys(S.secrets).length;
    $('#secrets-count').textContent = n + '/' + SECRETS.length;
    $('#secrets-list').innerHTML = SECRETS.map(
      ([id, name, hint]) =>
        '<li class="' + (S.secrets[id] ? 'found' : '') + '"><b>' + (S.secrets[id] ? name : '???') + '</b><span>' + hint + '</span></li>'
    ).join('');
  }
  function secret(id) {
    if (S.secrets[id]) return;
    S.secrets[id] = true;
    const s = SECRETS.find((x) => x[0] === id);
    renderSecrets();
    A.chime(true);
    const n = Object.keys(S.secrets).length;
    toast('<small>secret ' + n + ' of ' + SECRETS.length + '</small>' + s[1]);
    ui.secretsBtn.classList.add('ping');
    setTimeout(() => ui.secretsBtn.classList.remove('ping'), 1200);
    if (n === SECRETS.length) setTimeout(() => toast('<small>all secrets found</small>The cat is very proud of you. (And asleep.)'), 4500);
    try {
      localStorage.setItem('ctc-secrets', JSON.stringify(S.secrets));
    } catch (e) {}
  }
  try {
    const saved = JSON.parse(localStorage.getItem('ctc-secrets') || '{}');
    if (saved && typeof saved === 'object') S.secrets = saved;
  } catch (e) {}
  renderSecrets();

  // ------------------------------------------------------------ sound hooks
  W.onLand = (p, toCity) => {
    if (S.state !== 'unfold' && S.state !== 'fold') return;
    const k = p.k + 1;
    if (p.kind === 'road' && p.j === 3) A.note(toCity ? k : 14 - k, 0.11);
    else if (p.kind === 'tail') A.note(toCity ? Math.floor(p.k / 2) : 8 - Math.floor(p.k / 2), 0.06, 60);
    else if (p.kind === 'ear' || p.kind === 'heart' || p.kind === 'bell' || p.kind === 'nose') A.note(toCity ? 10 : 2, 0.12, 72);
    A.clack(p.kind === 'roof' ? 1.2 : p.kind === 'tail' ? 0.8 : 1, p.kind === 'road' ? 0.14 : 0.09);
  };
  W.onWall = () => A.clack(0.7, 0.05);
  W.onPop = () => A.pop();

  // ------------------------------------------------------------ story transitions
  const DAY_CAPTIONS = [
    [6.55, 'The residents wake. Stretching is mandatory; hurrying is not.'],
    [7.5, 'Rush hour. Nobody is late. Nobody is early. Everyone arrives exactly when they meant to.'],
    [9.4, 'Work begins, in theory. The Tuna Works exhales its first fish-shaped cloud.'],
    [10.9, 'The Tip Express runs the Circle Line — which is the tail — which is fine.'],
    [12.15, 'Siesta. Town Hall closes. Every rooftop in the city is reserved.'],
    [14.35, 'Afternoon. Belly Lake fills with optimists holding fishing rods.'],
    [16.2, 'Gondolas run along the whiskers, one cat per car. Some cats insist on going twice.'],
    [18.0, 'The Fish Market opens. It will close again at 18:04.'],
    [19.55, 'Dusk. The Purr Reactor spins up — the windows glow on purr-power.'],
    [21.0, 'A light in every window. Somewhere, one last cat refuses to come inside.'],
  ];
  const UNFOLD_CAPTIONS = [
    [0.01, 'The tail uncoils first, and lays itself down as a railway.'],
    [0.17, 'Then the fur lifts away in a wave — from the haunches to the scruff.'],
    [0.31, 'The plates along the spine flip over. The asphalt was on the underside all along.'],
    [0.43, 'Everything else lands fur-side up. The city keeps its stripes on its rooftops.'],
    [0.53, 'The paws turn over. The toe beans become fountains.'],
    [0.62, 'Ears rise into towers, whiskers stretch into cableways, eyelids arch into bridges.'],
    [0.74, 'And the heart surfaces in the middle of the lake, purring.'],
    [0.9, 'Then — the residents.'],
  ];
  const FOLD_CAPTIONS = [
    [0.99, 'Everyone home. The city folds itself up, in reverse.'],
    [0.76, 'Bridges close back into eyelids. Towers lower into ears.'],
    [0.5, 'Rooftops lift from their buildings and find their places in the fur.'],
    [0.2, 'The tail curls around last of all, to keep the nose warm.'],
    [0.03, 'Goodnight, city.'],
  ];
  let capIdx = 0;

  function setState(s) {
    S.state = s;
    S.stateT = 0;
    capIdx = 0;
    document.body.dataset.state = s;
    if (s === 'sleep') {
      setBars(true);
      S.wake = 0;
      chapter('I', 'The Sleeper');
      ui.hint.classList.add('show');
      setTimeout(() => {
        if (S.state === 'sleep') subtitle('Somewhere under all that fur, a whole city is asleep.', null, 6);
      }, 3500);
      C.forceHome = false;
    } else if (s === 'waking') {
      S.hourAtWake = S.hour > 12 ? S.hour - 24 : S.hour;
      ui.hint.classList.remove('show');
      subtitle('Dawn. Something stretches.', U.fmtTime(S.hour), 4);
      A.meow(0.55, 0.12);
    } else if (s === 'unfold') {
      W.stretch = 0;
      chapter('II', 'The Unfolding');
    } else if (s === 'day') {
      setBars(false);
      chapter('III', 'A Day in the City');
      setTimeout(() => {
        if (S.state === 'day') toast('<small>you can</small>drag to look · scroll to zoom · try the laser &amp; the fish');
      }, 5000);
    } else if (s === 'bell') {
      C.forceHome = true;
      setBars(true);
      ringBell(3);
      subtitle('The Collar Bell. Everybody home.', U.fmtTime(S.hour), 4);
      C.laser.active = false;
    } else if (s === 'fold') {
      chapter('IV', 'The Folding');
    }
  }
  function ringBell(n = 1) {
    for (let i = 0; i < n; i++) setTimeout(() => A.bell(0.28), i * 900);
    W.bellSwing = 1;
  }

  function stepStory(dt) {
    S.t += dt;
    S.stateT = (S.stateT || 0) + dt;
    const st = S.state;
    if (st === 'intro') {
      S.hour = 2.6;
    } else if (st === 'sleep') {
      S.nightHour += dt * 0.075;
      S.hour = U.wrap(S.nightHour / 24 * U.TAU) / U.TAU * 24;
      const h = S.hour;
      if (S.wake >= 1 || (h > 5.0 && h < 12)) setState('waking');
    } else if (st === 'waking') {
      S.hour = U.wrap((U.lerp(S.hourAtWake, 5.75, U.smooth(U.clamp(S.stateT / 4))) / 24) * U.TAU) / U.TAU * 24;
      W.stretch = Math.sin(U.clamp(S.stateT / 3.6) * Math.PI);
      if (S.stateT > 4.2) setState('unfold');
    } else if (st === 'unfold') {
      S.P = U.clamp(S.stateT / UNFOLD_SECONDS);
      S.hour = U.lerp(5.75, 6.45, S.P);
      while (capIdx < UNFOLD_CAPTIONS.length && S.P >= UNFOLD_CAPTIONS[capIdx][0]) {
        subtitle(UNFOLD_CAPTIONS[capIdx][1], null, 3.4);
        capIdx++;
      }
      if (S.P >= 1) setState('day');
    } else if (st === 'day') {
      S.hour += (dt * S.speed) / DAY_SECONDS_PER_HOUR;
      while (capIdx < DAY_CAPTIONS.length && S.hour >= DAY_CAPTIONS[capIdx][0]) {
        if (S.hour - DAY_CAPTIONS[capIdx][0] < 0.6) subtitle(DAY_CAPTIONS[capIdx][1], U.fmtTime(DAY_CAPTIONS[capIdx][0]), 6.5);
        capIdx++;
      }
      if (S.hour >= 21.75) setState('bell');
    } else if (st === 'bell') {
      S.hour += dt / DAY_SECONDS_PER_HOUR;
      if (S.stateT > 4.5) setState('fold');
    } else if (st === 'fold') {
      S.P = 1 - U.clamp(S.stateT / FOLD_SECONDS);
      S.hour = U.lerp(22.2, 23.4, 1 - S.P);
      while (capIdx < FOLD_CAPTIONS.length && S.P <= FOLD_CAPTIONS[capIdx][0]) {
        subtitle(FOLD_CAPTIONS[capIdx][1], null, 3.4);
        capIdx++;
      }
      if (S.P <= 0) {
        S.nightHour = S.hour;
        setState('sleep');
      }
    }
    if (subTimer > 0) {
      subTimer -= dt;
      if (subTimer <= 0) ui.subtitle.classList.remove('show');
    }
  }

  // ------------------------------------------------------------ input
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  let pointer = { x: 0, y: 0, down: false, sx: 0, sy: 0, moved: 0, petting: false, id: null, over: false };
  const pinch = { active: false, d: 0 };
  const touches = new Map();

  function pick(clientX, clientY, list) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(list || W.pickables, false);
    for (const h of hits) {
      let o = h.object;
      if (!visibleChain(o)) continue;
      return h;
    }
    return null;
  }
  function visibleChain(o) {
    while (o) {
      if (!o.visible) return false;
      o = o.parent;
    }
    return true;
  }
  const isCatPart = (o) => {
    const inf = o.userData.info;
    return S.P < 0.05 && inf && inf.catTitle;
  };
  function groundPoint(clientX, clientY) {
    const h = pick(clientX, clientY);
    if (h && h.object !== W.moon.mesh && h.point.y > -0.5) return h.point;
    // fall back to the ground plane
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const pl = new T.Plane(new T.Vector3(0, 1, 0), -0.1);
    const p = new T.Vector3();
    return ray.ray.intersectPlane(pl, p) ? p : null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    A.init();
    canvas.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch.active = true;
      pinch.d = Math.hypot(a.x - b.x, a.y - b.y);
      pointer.down = false;
      return;
    }
    pointer.down = true;
    pointer.sx = pointer.x = e.clientX;
    pointer.sy = pointer.y = e.clientY;
    pointer.moved = 0;
    pointer.petting = false;
    if ((S.state === 'sleep' || S.state === 'intro') && S.state !== 'intro') {
      const h = pick(e.clientX, e.clientY);
      if (h && isCatPart(h.object)) {
        pointer.petting = true;
        pointer.petPoint = h.point;
      }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    pointer.over = true;
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.active && touches.size === 2) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      userZoom = U.clamp(userZoom * (pinch.d / d), 0.3, 1.6);
      pinch.d = d;
      userHold = 8;
      return;
    }
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (pointer.down) {
      pointer.moved += Math.abs(dx) + Math.abs(dy);
      if (pointer.petting) {
        const h = pick(e.clientX, e.clientY);
        if (h && isCatPart(h.object)) {
          W.ruffle(h.point, 0.32);
          const amt = Math.min(60, Math.abs(dx) + Math.abs(dy));
          const now = performance.now();
          if (now - (pointer.lastHeart || 0) > 260) {
            pointer.lastHeart = now;
            C.heartAt(h.point.x, h.point.y + 0.6, h.point.z, 1);
          }
          S.wake = Math.min(1, S.wake + amt * 0.0011);
          S.petBoost = Math.min(1, (S.petBoost || 0) + amt * 0.01);
        }
      } else if (S.tool === 'look' || pointer.moved > 6) {
        userTheta += dx * 0.0055;
        userPhi -= dy * 0.004;
        userPhi = U.clamp(userPhi, -0.8, 0.5);
        userHold = 8;
      }
    }
    if (S.tool === 'laser' && S.P >= 1) {
      const p = groundPoint(e.clientX, e.clientY);
      if (p) {
        C.laser.active = true;
        C.laser.x = p.x;
        C.laser.z = p.z;
        C.laser.y = p.y;
      }
    }
    hoverQueued = true;
  });
  const endPointer = (e) => {
    touches.delete(e.pointerId);
    if (pinch.active) {
      if (touches.size < 2) pinch.active = false;
      return;
    }
    if (!pointer.down) return;
    pointer.down = false;
    if (pointer.moved < 7 && !pointer.petting) click(e.clientX, e.clientY);
    pointer.petting = false;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    pointer.over = false;
    ui.tip.classList.remove('show');
    if (S.tool === 'laser') C.laser.active = false;
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      userZoom = U.clamp(userZoom * Math.exp(e.deltaY * 0.0011), 0.3, 1.6);
      userHold = 8;
    },
    { passive: false }
  );

  let trainClicks = [], heartClicks = 0;
  function click(x, y) {
    if (S.state === 'intro') return;
    if (S.tool === 'fish' && S.P >= 1) {
      const p = groundPoint(x, y);
      if (p) {
        C.dropFish(p.x, p.z);
        A.pop();
      }
      return;
    }
    const h = pick(x, y);
    if (!h) return;
    if (h.object === C.mesh && h.instanceId !== undefined) {
      C.poke(h.instanceId);
      A.meow(1 + Math.random() * 0.4, 0.1);
      const d = C.describe(h.instanceId);
      showTip(d, x, y, true);
      return;
    }
    const inf = h.object.userData.info || {};
    if (inf.clawd) {
      K.poke(S);
      secret('clawd');
      return;
    }
    if (inf.boop) {
      A.sneeze();
      setTimeout(() => {
        W.shake = S.P > 0.5 ? 1 : 0.5;
        C.agents.forEach((a) => {
          if (a.vis > 0.5) a.boop = 0.5 + Math.random() * 0.3;
        });
      }, 800);
      subtitle(S.P > 0.5 ? 'Bless you, city.' : 'Even asleep, a boop is a boop.', null, 3);
      secret('boop');
    } else if (inf.bell) {
      if (S.state === 'day') {
        S.hour = Math.max(S.hour, 21.75);
        setState('bell');
      } else ringBell(1);
    } else if (inf.train) {
      A.toot();
      const now = performance.now();
      trainClicks = trainClicks.filter((t) => now - t < 4000);
      trainClicks.push(now);
      if (trainClicks.length >= 3 && S.P >= 1) {
        W.trainBoost = 1;
        W.trainWait = 0;
        subtitle('The train has started chasing its own tail.', null, 4);
        secret('tail');
        trainClicks = [];
      }
    } else if (inf.heart) {
      W.overpurr = Math.min(1.6, W.overpurr + 0.45);
      C.heartAt(0, 2.4, 0, 3);
      heartClicks++;
      S.petBoost = 1;
      if (heartClicks >= 5) {
        secret('belly');
        subtitle('The whole city purrs at once. The lights can barely cope.', null, 4);
        C.heartAt(0, 2.4, 0, 12);
      }
    } else if (inf.moon) {
      const m = W.moon;
      m.yarn = !m.yarn;
      m.mat.map = m.yarn ? W.yarnTex : null;
      m.mat.color.set(m.yarn ? 0xffd0e0 : 0xfff3d1);
      m.mat.needsUpdate = true;
      if (m.yarn) {
        subtitle('Of course. The moon is a ball of yarn. It always was.', null, 4);
        secret('yarn');
      }
    } else if (inf.mouse) {
      A.squeak();
      C.mouse.wait = 0;
      subtitle('A mouse! Living in the park, rent-free, under everyone’s noses.', null, 4);
      secret('mouse');
    } else if (inf.box) {
      C.openBox();
      A.meow(0.8, 0.12);
      subtitle('If it fits, it sits. It fits.', null, 3.5);
      secret('box');
    }
    if (inf.title) showTip(inf, x, y, true);
  }

  // hover tooltips
  let hoverQueued = false, hoverClock = 0, tipPinned = 0;
  function showTip(inf, x, y, pin) {
    if (!inf) return;
    const cat = S.P < 0.05 && inf.catTitle;
    let html;
    if (cat) {
      html = '<b>' + inf.catTitle + '</b><em>will become</em><p>' + (inf.catFuture || inf.title) + '</p>';
    } else {
      html = '<b>' + inf.title + '</b>' + (inf.formerly && inf.formerly !== '—' ? '<em>formerly ' + inf.formerly + '</em>' : '') + '<p>' + (inf.desc || '') + '</p>';
    }
    ui.tip.innerHTML = html;
    const w = ui.tip.offsetWidth || 260, hh = ui.tip.offsetHeight || 90;
    let px = x + 18, py = y + 18;
    if (px + w > innerWidth - 12) px = x - w - 18;
    if (py + hh > innerHeight - 90) py = y - hh - 18;
    ui.tip.style.transform = 'translate(' + Math.max(8, px) + 'px,' + Math.max(8, py) + 'px)';
    ui.tip.classList.add('show');
    if (pin) tipPinned = 2.5;
  }
  function hover(dt) {
    hoverClock -= dt;
    if (tipPinned > 0) {
      tipPinned -= dt;
      return;
    }
    if (!hoverQueued || hoverClock > 0 || pointer.down) return;
    hoverQueued = false;
    hoverClock = 0.07;
    if (!pointer.over || S.state === 'intro' || S.tool !== 'look') {
      ui.tip.classList.remove('show');
      return;
    }
    const h = pick(pointer.x, pointer.y);
    if (!h) {
      ui.tip.classList.remove('show');
      canvas.style.cursor = '';
      return;
    }
    if (h.object === C.mesh) {
      showTip(C.describe(h.instanceId), pointer.x, pointer.y);
      canvas.style.cursor = 'pointer';
      return;
    }
    const inf = h.object.userData.info;
    if (!inf) return ui.tip.classList.remove('show');
    if (inf === W.cushion.userData.info && S.P < 0.5) {
      ui.tip.classList.remove('show');
      return;
    }
    showTip(inf, pointer.x, pointer.y);
    canvas.style.cursor = S.state === 'sleep' && isCatPart(h.object) ? 'grab' : inf.boop || inf.bell || inf.train || inf.heart || inf.moon || inf.mouse || inf.box ? 'pointer' : '';
  }

  // laser dot visuals
  const laserDot = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), new T.MeshBasicMaterial({ color: 0xff1020 }));
  const laserGlow = new T.Sprite(new T.SpriteMaterial({ map: W.glowTex, color: 0xff2030, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  laserGlow.scale.set(0.9, 0.9, 0.9);
  laserDot.add(laserGlow);
  scene.add(laserDot);
  laserDot.visible = false;

  // ------------------------------------------------------------ dock & buttons
  function setTool(t) {
    if (t !== 'look' && S.P < 1) {
      toast('<small>not yet</small>the city has to wake up first');
      return;
    }
    S.tool = t;
    document.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    document.body.dataset.tool = t;
    if (t !== 'laser') C.laser.active = false;
    ui.tip.classList.remove('show');
  }
  document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $('#speed').addEventListener('click', () => {
    S.speed = S.speed === 1 ? 3 : S.speed === 3 ? 8 : 1;
    $('#speed b').textContent = S.speed + '×';
  });
  $('#bell').addEventListener('click', () => {
    A.init();
    if (S.state === 'day') {
      S.hour = Math.max(S.hour, 21.75);
      setState('bell');
    } else if (S.state === 'sleep') {
      S.wake = 1;
    } else ringBell(1);
  });
  $('#sound').addEventListener('click', () => {
    A.init();
    A.setMuted(!A.muted);
    $('#sound').classList.toggle('off', A.muted);
  });
  $('#wake-now').addEventListener('click', () => {
    A.init();
    S.wake = 1;
  });
  ui.secretsBtn.addEventListener('click', () => ui.secretsPanel.classList.toggle('show'));
  $('#secrets-close').addEventListener('click', () => ui.secretsPanel.classList.remove('show'));
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === '1' || k === 'h') setTool('look');
    else if (k === '2' || k === 'l') setTool('laser');
    else if (k === '3' || k === 'f') setTool('fish');
    else if (k === 'b') $('#bell').click();
    else if (k === 'm') $('#sound').click();
    else if (k === 't') $('#speed').click();
    else if (k === ' ' && S.state === 'sleep') {
      e.preventDefault();
      S.wake = 1;
    } else if (k === 'escape') ui.secretsPanel.classList.remove('show');
  });

  function begin(withSound) {
    A.init();
    A.setMuted(!withSound);
    $('#sound').classList.toggle('off', !withSound);
    $('#intro').classList.add('gone');
    document.body.classList.add('started');
    setTimeout(() => setState('sleep'), 900);
  }
  $('#begin').addEventListener('click', () => begin(true));
  $('#begin-quiet').addEventListener('click', () => begin(false));

  // ------------------------------------------------------------ grain overlay
  (function grain() {
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const g = c.getContext('2d');
    const id = g.createImageData(192, 192);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    $('#grain').style.backgroundImage = 'url(' + c.toDataURL() + ')';
  })();

  // ------------------------------------------------------------ resize
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 52 : 38;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ------------------------------------------------------------ main loop
  let last = performance.now();
  let tinkleClock = 0;
  const PHASES = [[5, 'night'], [7.5, 'dawn'], [11.5, 'morning'], [14, 'noon'], [17.5, 'afternoon'], [20, 'dusk'], [24, 'night']];
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (CTC.fixedDt) dt = CTC.fixedDt;
    if (S.frozen) S.t += dt;
    else stepStory(dt);
    W.env(S.hour, camera);
    W.update(S.P, S.hour, dt, S.state);
    C.update(dt, S.hour, S.P, S.state);
    K.update(dt, S, camera);
    camUpdate(dt);
    hover(dt);

    // bell swing
    if (W.bellSwing > 0) {
      W.bellSwing = Math.max(0, W.bellSwing - dt * 0.25);
      W.bell.rotation.z = Math.sin(S.t * 9) * 0.5 * W.bellSwing;
    }

    // laser
    const ls = C.laser;
    laserDot.visible = ls.active && S.tool === 'laser';
    if (laserDot.visible) {
      laserDot.position.set(ls.x + Math.sin(S.t * 31) * 0.02, ls.y + 0.04, ls.z + Math.cos(S.t * 27) * 0.02);
      if (C.chasers >= 20) secret('laser');
    }

    // purr + ambience
    S.petBoost = Math.max(0, (S.petBoost || 0) - dt * 0.6);
    const baseP = S.state === 'sleep' || S.state === 'intro' ? 0.22 : S.state === 'waking' ? 0.5 : S.P > 0.95 ? 0.06 + W.overpurr * 0.3 : 0.15;
    S.purr += (Math.min(1, baseP + S.petBoost * 0.8) - S.purr) * Math.min(1, dt * 3);
    A.update(dt, S.state === 'intro' ? 0 : S.purr, W.breath || 0.5);
    const h = S.hour;
    A.setChord(h < 5 || h >= 20.5 ? 'night' : h < 8 ? 'dawn' : h < 17.5 ? 'day' : 'dusk');
    tinkleClock -= dt;
    if (tinkleClock <= 0 && S.state === 'day') {
      tinkleClock = 0.35 + Math.random() * 1.6;
      if (Math.random() < 0.5) A.tinkle(h >= 20 ? 'night' : h >= 17.5 ? 'dusk' : 'day');
    }

    // HUD
    ui.clock.textContent = U.fmtTime(h);
    ui.phase.textContent = (PHASES.find((p) => h < p[0]) || PHASES[0])[1];
    ui.meter.style.transform = 'scaleX(' + S.wake.toFixed(3) + ')';
    document.body.classList.toggle('city', S.P >= 1);

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // debugging / testing hooks
  CTC.debug = {
    setState,
    jump(P, hour, state) {
      S.P = P;
      S.hour = hour;
      S.state = state || S.state;
      document.body.dataset.state = S.state;
      if (S.state === 'day') {
        S.stateT = 0;
        setBars(false);
        document.body.classList.add('started');
        $('#intro').classList.add('gone');
      }
    },
    cam,
    want,
    S,
    begin,
    camera,
    /* run the simulation headlessly (no rendering) for a number of seconds */
    sim(seconds, step = 1 / 30) {
      const log = [];
      let last = S.state;
      for (let t = 0; t < seconds; t += step) {
        stepStory(step);
        W.env(S.hour, camera);
        W.update(S.P, S.hour, step, S.state);
        C.update(step, S.hour, S.P, S.state);
        K.update(step, S, camera);
        camUpdate(step);
        if (S.state !== last) {
          log.push(last + '→' + S.state + ' @h' + S.hour.toFixed(2));
          last = S.state;
        }
      }
      return { state: S.state, P: +S.P.toFixed(3), hour: +S.hour.toFixed(2), log };
    },
    project(x, y, z) {
      const v = new T.Vector3(x, y, z).project(camera);
      return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
    },
  };
})();
