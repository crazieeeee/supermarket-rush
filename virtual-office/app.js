/* King Hang's Staff Virtual Office — Three.js v1 (snapshot) */
(function () {
  'use strict';

  const SNAP = window.OFFICE_SNAPSHOT;
  if (!SNAP || !SNAP.agents) {
    document.body.innerHTML = '<p style="color:#fff;padding:2rem">Missing OFFICE_SNAPSHOT (data.js).</p>';
    return;
  }

  const FX_KEY = '外匯';
  const INV_KEYS = ['搵股','持倉','SA','Seeking Alpha','Bitcoin','低估值','動能','基本面','主題宏觀','對照持倉','再平衡','風險','宏觀利率'];
  const INV_GROUPS = new Set(['搵股隊·甲','搵股隊·乙','Seeking Alpha隊','持倉分析隊']);

  function classifyRoom(name) {
    if (name.includes(FX_KEY)) return 'fx';
    if (INV_GROUPS.has(name) || INV_KEYS.some((k) => name.includes(k))) return 'investment';
    return 'other';
  }

  const ROOM_META = {
    investment: { label: 'Investment', color: 0x3b82f6, accent: '#3b82f6' },
    fx: { label: '外匯', color: 0x14b8a6, accent: '#14b8a6' },
    other: { label: '未分類', color: 0xa78bfa, accent: '#a78bfa' },
  };

  const STATUS_COLOR = {
    Working: 0x3b82f6,
    'Need You': 0xf97316,
    'Needs You': 0xf97316,
    Idle: 0x6b7280,
    Coding: 0xa855f7,
    Browsing: 0x3b82f6,
    'In Terminal': 0xf59e0b,
    Thinking: 0xeab308,
    Error: 0xef4444,
  };

  function activityColor(activity, status) {
    return STATUS_COLOR[activity] || STATUS_COLOR[status] || 0x6b7280;
  }

  function hashHue(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function shortRole(role) {
    if (!role) return '';
    const s = role.replace(/\s+/g, ' ').trim();
    return s.length > 48 ? s.slice(0, 48) + '…' : s;
  }

  // ——— agents ———
  const agents = SNAP.agents.map((a) => {
    const room = classifyRoom(a.name);
    return {
      ...a,
      room,
      hue: hashHue(a.id),
      color: new THREE.Color().setHSL(hashHue(a.id) / 360, 0.65, 0.55),
    };
  });

  const byRoom = { investment: [], fx: [], other: [] };
  agents.forEach((a) => byRoom[a.room].push(a));

  // ——— DOM ———
  document.getElementById('asof').textContent =
    'As of ' + SNAP.asOf + ' · ' + (SNAP.note || '');

  const teamList = document.getElementById('teamList');
  const activityLog = document.getElementById('activityLog');
  let filterRoom = 'all';
  let selectedId = null;

  function cssDot(activity, status) {
    const key = (activity || status || 'Idle').toLowerCase().replace(/\s+/g, '');
    const map = {
      working: 'working', coding: 'coding', browsing: 'browsing',
      interminal: 'terminal', thinking: 'thinking', needyou: 'needyou',
      needsyou: 'needyou', error: 'error', idle: 'idle',
    };
    return map[key] || 'idle';
  }

  function renderTeam() {
    const list = filterRoom === 'all' ? agents : byRoom[filterRoom];
    teamList.innerHTML = '';
    list.forEach((a) => {
      const row = document.createElement('div');
      row.className = 'agent-row' + (selectedId === a.id ? ' selected' : '');
      row.innerHTML =
        '<i class="dot ' + cssDot(a.activity, a.status) + '"></i>' +
        '<div class="meta">' +
        '<div class="name">' + escapeHtml(a.name) + '</div>' +
        '<div class="sub">' + escapeHtml(a.activity || a.status) +
        (a.detail ? ' · ' + escapeHtml(a.detail) : '') + '</div>' +
        '<span class="room-tag">' + ROOM_META[a.room].label + '</span>' +
        '</div>';
      row.addEventListener('click', () => {
        selectedId = a.id;
        focusAgent(a);
        renderTeam();
      });
      teamList.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  (SNAP.activityLog || []).forEach((item) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML =
      '<span class="t">' + escapeHtml(item.t) + '</span>' +
      '<span class="who">' + escapeHtml(item.who) + '</span>: ' +
      escapeHtml(item.text);
    activityLog.appendChild(div);
  });

  document.getElementById('roomTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-room]');
    if (!btn) return;
    filterRoom = btn.dataset.room;
    document.querySelectorAll('#roomTabs button').forEach((b) =>
      b.classList.toggle('active', b === btn));
    renderTeam();
  });

  // ——— Three.js ———
  const canvas = document.getElementById('c');
  // Low power: phones / coarse pointer / Save-Data / few cores — keep look, cut GPU cost
  const LOW = (() => {
    try {
      if (window.matchMedia('(max-width: 720px)').matches) return true;
      if (window.matchMedia('(pointer: coarse)').matches) return true;
      if (navigator.connection && navigator.connection.saveData) return true;
      if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0
          && navigator.hardwareConcurrency <= 4) return true;
    } catch (_) {}
    return false;
  })();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !LOW,
    alpha: false,
    powerPreference: LOW ? 'low-power' : 'default',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW ? 1 : 2));
  renderer.setClearColor(0x0b1020, 1);
  renderer.shadowMap.enabled = !LOW;
  if (!LOW) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  if (!LOW) scene.fog = new THREE.FogExp2(0x0b1020, 0.012);

  // Orthographic isometric-ish camera
  let frustumSize = 28;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camera.position.set(28, 26, 28);
  camera.lookAt(2, 0, 0);
  function updateCamera() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const aspect = w / h;
    camera.left = (-frustumSize * aspect) / 2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  updateCamera();

  // Lights
  const hemi = new THREE.HemisphereLight(0x9eb7ff, 0x1a1520, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d6, LOW ? 1.05 : 0.85);
  sun.position.set(20, 30, 10);
  if (!LOW) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
  }
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x4a6cff, 0.25);
  fill.position.set(-15, 12, -10);
  scene.add(fill);
  const ambientNight = new THREE.AmbientLight(0x1a2240, LOW ? 0.55 : 0.35);
  scene.add(ambientNight);
  if (LOW) hemi.intensity = 0.7;

  // City sky backdrop (simple)
  const skyGeo = new THREE.PlaneGeometry(120, 50);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x152038, side: THREE.DoubleSide });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.set(-5, 12, -28);
  scene.add(sky);

  // Building footprint rooms layout (world XZ)
  // Investment: x -20..-2, z -10..10
  // FX:         x -2..10,  z -10..10
  // Other:      x 10..26,  z -10..10
  const ROOMS = {
    investment: { x0: -20, x1: -2, z0: -10, z1: 10, label: 'Investment' },
    fx: { x0: -2, x1: 10, z0: -10, z1: 10, label: '外匯' },
    other: { x0: 10, x1: 26, z0: -10, z1: 10, label: '未分類' },
  };

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xd4b896, roughness: 0.75, metalness: 0.02,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, roughness: 0.9, metalness: 0.05,
  });
  const glassMat = LOW
    ? new THREE.MeshBasicMaterial({
        color: 0x88aacc, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0x88aacc, transparent: true, opacity: 0.18,
        roughness: 0.1, metalness: 0.1, transmission: 0.6,
        thickness: 0.2, side: THREE.DoubleSide,
      });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

  function makeFloor(x0, x1, z0, z1, y) {
    const w = x1 - x0, d = z1 - z0;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, d), woodMat);
    mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    mesh.receiveShadow = true;
    return mesh;
  }

  function makeWall(x, z, w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || wallMat);
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function makeGlassPartition(x0, z0, x1, z1, h) {
    const g = new THREE.Group();
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(len, h, 0.08),
      glassMat
    );
    pane.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    pane.rotation.y = -Math.atan2(dz, dx);
    g.add(pane);
    // frame posts
    [[x0, z0], [x1, z1]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), trimMat);
      post.position.set(px, h / 2, pz);
      g.add(post);
    });
    return g;
  }

  const building = new THREE.Group();
  scene.add(building);

  // Shared slab under all rooms
  building.add(makeFloor(-20.5, 26.5, -10.5, 10.5, -0.12));

  // Outer walls (back + sides), open front for dollhouse view
  const WALL_H = 4.2;
  building.add(makeWall(3, -10.35, 47, WALL_H, 0.3)); // back
  building.add(makeWall(-20.35, 0, 0.3, WALL_H, 21)); // left
  building.add(makeWall(26.35, 0, 0.3, WALL_H, 21)); // right

  // Window strips on back wall
  for (let i = 0; i < 8; i++) {
    const wx = -17 + i * 5.5;
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.8),
      new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.85 })
    );
    win.position.set(wx, 2.2, -10.18);
    building.add(win);
    // soft glow (desktop only — PointLights stack badly on phones)
    if (!LOW) {
      const glow = new THREE.PointLight(0x3b6ea8, 0.35, 8);
      glow.position.set(wx, 2.2, -9.5);
      building.add(glow);
    }
  }

  // Glass room dividers
  building.add(makeGlassPartition(-2, -10, -2, 10, WALL_H));
  building.add(makeGlassPartition(10, -10, 10, 10, WALL_H));

  // Room labels (sprites)
  function makeTextSprite(text, color) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(10,14,28,0.75)';
    roundRect(ctx, 16, 24, 480, 80, 16);
    ctx.fill();
    ctx.font = 'bold 42px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(5.5, 1.4, 1);
    return spr;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  Object.keys(ROOMS).forEach((key) => {
    const r = ROOMS[key];
    const spr = makeTextSprite(r.label, ROOM_META[key].accent);
    spr.position.set((r.x0 + r.x1) / 2, 5.2, r.z0 + 1);
    building.add(spr);
  });

  // Furniture helpers
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55, metalness: 0.2 });
  const lampGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.25, LOW ? 6 : 8);
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: LOW ? 0.85 : 0.6,
  });
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee, emissive: 0x0ea5e9, emissiveIntensity: 0.85, roughness: 0.4,
  });
  const screenMatAlt = new THREE.MeshStandardMaterial({
    color: 0xc084fc, emissive: 0xa855f7, emissiveIntensity: 0.7, roughness: 0.4,
  });
  const plantPot = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.9 });
  const plantLeaf = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.75 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 1 });

  function makeDesk(x, z, variant) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), deskMat);
    top.position.y = 0.75;
    top.castShadow = true;
    g.add(top);
    // legs
    [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), deskMat);
      leg.position.set(lx, 0.375, lz);
      g.add(leg);
    });
    // dual monitors
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.04), variant ? screenMatAlt : screenMat);
    m1.position.set(-0.3, 1.05, -0.25);
    g.add(m1);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.04), variant ? screenMat : screenMatAlt);
    m2.position.set(0.35, 1.05, -0.25);
    g.add(m2);
    // lamp (emissive mesh always; real PointLight only on desktop — dozens of lights lag phones)
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(0.7, 0.95, 0.2);
    g.add(lamp);
    if (!LOW) {
      const pl = new THREE.PointLight(0xffcc66, 0.45, 3.5);
      pl.position.set(0.7, 1.15, 0.2);
      g.add(pl);
    }
    // chair
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.45), chairMat);
    seat.position.set(0, 0.45, 0.7);
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.06), chairMat);
    back.position.set(0, 0.7, 0.9);
    g.add(back);

    g.position.set(x, 0, z);
    g.userData.isDesk = true;
    g.userData.seat = new THREE.Vector3(x, 0.9, z + 0.55);
    g.userData.occupied = false;
    return g;
  }

  function makePlant(x, z, scale) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.25, LOW ? 6 : 10), plantPot);
    pot.position.y = 0.12;
    g.add(pot);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35 * scale, LOW ? 6 : 10, LOW ? 6 : 10), plantLeaf);
    leaf.position.y = 0.45 * scale + 0.2;
    leaf.scale.y = 1.3;
    g.add(leaf);
    g.position.set(x, 0, z);
    return g;
  }

  function makeLounge(cx, cz) {
    const g = new THREE.Group();
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.04, LOW ? 16 : 32), rugMat);
    rug.position.set(cx, 0.02, cz);
    g.add(rug);
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.8), sofaMat);
    sofa.position.set(cx, 0.35, cz + 0.6);
    sofa.castShadow = true;
    g.add(sofa);
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16),
      new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.6 })
    );
    table.position.set(cx, 0.2, cz - 0.4);
    g.add(table);
    return g;
  }

  function makeMeetingTable(cx, cz) {
    const g = new THREE.Group();
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.55 })
    );
    table.position.set(cx, 0.7, cz);
    table.castShadow = true;
    g.add(table);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.4;
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.4), chairMat);
      ch.position.set(cx + Math.cos(ang) * 1.5, 0.35, cz + Math.sin(ang) * 1.5);
      g.add(ch);
    }
    return g;
  }

  function makeKitchen(cx, cz) {
    const g = new THREE.Group();
    const island = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 })
    );
    island.position.set(cx, 0.45, cz);
    island.castShadow = true;
    g.add(island);
    return g;
  }

  // Desk grids per room
  const desksByRoom = { investment: [], fx: [], other: [] };

  function layoutDesks(roomKey, count) {
    const r = ROOMS[roomKey];
    const cols = roomKey === 'investment' ? 4 : roomKey === 'fx' ? 3 : 4;
    const gapX = (r.x1 - r.x0 - 2) / cols;
    const rows = Math.ceil(count / cols);
    const gapZ = Math.min(2.6, (r.z1 - r.z0 - 3) / Math.max(rows, 1));
    const list = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = r.x0 + 1.2 + col * gapX + gapX * 0.35;
      const z = r.z0 + 2.2 + row * gapZ;
      const desk = makeDesk(x, z, i % 2 === 0);
      building.add(desk);
      list.push(desk);
    }
    desksByRoom[roomKey] = list;
  }

  layoutDesks('investment', Math.max(byRoom.investment.length, 8));
  layoutDesks('fx', Math.max(byRoom.fx.length, 6));
  layoutDesks('other', Math.max(byRoom.other.length, 8));

  // Decor per room
  building.add(makeLounge(-11, 7.2));
  building.add(makeMeetingTable(-6, -6.5));
  building.add(makeKitchen(4, 7));
  building.add(makeLounge(18, 6.5));
  building.add(makeMeetingTable(16, -6));
  [[-18, -8], [-4, 8], [2, -8], [8, 8], [12, -8], [24, 8], [22, -4]].forEach(([x, z], i) => {
    building.add(makePlant(x, z, 0.9 + (i % 3) * 0.15));
  });

  // Wall screen in Investment (exec vibe)
  const wallScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.4),
    new THREE.MeshBasicMaterial({ color: 0x0a1f14 })
  );
  wallScreen.position.set(-18.5, 2.4, -10.05);
  building.add(wallScreen);
  const pctSpr = makeTextSprite('81.7%', '#4ade80');
  pctSpr.scale.set(3, 0.8, 1);
  pctSpr.position.set(-18.5, 2.4, -9.9);
  building.add(pctSpr);

  // ——— Avatars ———
  const avatarGroup = new THREE.Group();
  scene.add(avatarGroup);
  const avatarActors = [];

  // Shared cat geos (one set for all bots — cheap on phones)
  const _catSeg = LOW ? 8 : 12;
  const catBodyGeo = new THREE.SphereGeometry(0.28, _catSeg, _catSeg);
  const catHeadGeo = new THREE.SphereGeometry(0.22, _catSeg, _catSeg);
  const catEarGeo = new THREE.ConeGeometry(0.09, 0.16, LOW ? 5 : 6);
  const catEarInnerGeo = new THREE.ConeGeometry(0.05, 0.1, LOW ? 4 : 5);
  const catTailGeo = new THREE.CapsuleGeometry(0.045, 0.28, 4, LOW ? 6 : 8);
  const catEyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
  const catNoseGeo = new THREE.SphereGeometry(0.028, 6, 6);
  const catCheekGeo = new THREE.SphereGeometry(0.06, 6, 6);
  const catBowGeo = new THREE.SphereGeometry(0.05, 6, 6);
  const catMuffGeo = new THREE.TorusGeometry(0.12, 0.035, 6, LOW ? 10 : 14);

  const CAT_PALETTES = [
    { fur: 0xf5d0a9, belly: 0xfff6eb, ear: 0xf9a8d4, accent: 0xf472b6 }, // cream peach
    { fur: 0xf97316, belly: 0xfed7aa, ear: 0xfb7185, accent: 0xea580c }, // orange tabby
    { fur: 0x1f2937, belly: 0xe5e7eb, ear: 0xf9a8d4, accent: 0x38bdf8 }, // tuxedo
    { fur: 0xd6d3d1, belly: 0xfafaf9, ear: 0xfbcfe8, accent: 0xa78bfa }, // silver
    { fur: 0x78350f, belly: 0xfde68a, ear: 0xf9a8d4, accent: 0xfbbf24 }, // chocolate
    { fur: 0xfce7f3, belly: 0xffffff, ear: 0xfb7185, accent: 0xec4899 }, // pinkish
    { fur: 0x86efac, belly: 0xecfdf5, ear: 0xf9a8d4, accent: 0x22c55e }, // mint
    { fur: 0x93c5fd, belly: 0xeff6ff, ear: 0xf9a8d4, accent: 0x3b82f6 }, // sky
    { fur: 0xc4b5fd, belly: 0xf5f3ff, ear: 0xf9a8d4, accent: 0x8b5cf6 }, // lavender
    { fur: 0xfca5a5, belly: 0xfef2f2, ear: 0xfb7185, accent: 0xef4444 }, // rosy
    { fur: 0xfde047, belly: 0xfefce8, ear: 0xf9a8d4, accent: 0xeab308 }, // butter
    { fur: 0x2dd4bf, belly: 0xccfbf1, ear: 0xf9a8d4, accent: 0x14b8a6 }, // teal
  ];

  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeAvatar(agent) {
    const g = new THREE.Group();
    const key = agent.id || agent.name || '';
    const h = hashStr(key);
    const pal = CAT_PALETTES[h % CAT_PALETTES.length];
    const style = h % 4; // 0 plain, 1 bow, 2 scarf, 3 cheek fluff
    const furMat = new THREE.MeshStandardMaterial({
      color: pal.fur, roughness: 0.75, metalness: 0.05,
      emissive: pal.fur, emissiveIntensity: 0.08,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: pal.belly, roughness: 0.85, metalness: 0.0,
    });
    const earMat = new THREE.MeshStandardMaterial({ color: pal.ear, roughness: 0.7 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: pal.accent, roughness: 0.55, emissive: pal.accent, emissiveIntensity: 0.25,
    });

    // body
    const body = new THREE.Mesh(catBodyGeo, furMat);
    body.position.y = 0.32;
    body.scale.set(1.05, 0.9, 0.95);
    body.castShadow = !LOW;
    g.add(body);
    // belly patch
    const belly = new THREE.Mesh(catBodyGeo, bellyMat);
    belly.position.set(0, 0.28, 0.12);
    belly.scale.set(0.72, 0.65, 0.55);
    g.add(belly);
    // head
    const head = new THREE.Mesh(catHeadGeo, furMat);
    head.position.y = 0.62;
    head.castShadow = !LOW;
    g.add(head);
    // ears
    [[-0.12, 0.78, 0], [0.12, 0.78, 0]].forEach(([x, y, z], i) => {
      const ear = new THREE.Mesh(catEarGeo, furMat);
      ear.position.set(x, y, z);
      ear.rotation.z = i === 0 ? 0.35 : -0.35;
      ear.rotation.x = -0.15;
      g.add(ear);
      const inner = new THREE.Mesh(catEarInnerGeo, earMat);
      inner.position.set(x, y - 0.01, 0.02);
      inner.rotation.z = i === 0 ? 0.35 : -0.35;
      g.add(inner);
    });
    // eyes
    [[-0.08, 0.64, 0.18], [0.08, 0.64, 0.18]].forEach(([x, y, z]) => {
      const eye = new THREE.Mesh(catEyeGeo, eyeMat);
      eye.position.set(x, y, z);
      g.add(eye);
    });
    // nose
    const nose = new THREE.Mesh(catNoseGeo, noseMat);
    nose.position.set(0, 0.58, 0.2);
    g.add(nose);
    // cheeks
    if (style === 3 || style === 1) {
      [[-0.16, 0.56, 0.12], [0.16, 0.56, 0.12]].forEach(([x, y, z]) => {
        const cheek = new THREE.Mesh(catCheekGeo, bellyMat);
        cheek.position.set(x, y, z);
        g.add(cheek);
      });
    }
    // accessories for variety
    if (style === 1) {
      const bowL = new THREE.Mesh(catBowGeo, accentMat);
      bowL.position.set(-0.06, 0.74, 0.12);
      const bowR = new THREE.Mesh(catBowGeo, accentMat);
      bowR.position.set(0.06, 0.74, 0.12);
      g.add(bowL, bowR);
    } else if (style === 2) {
      const muff = new THREE.Mesh(catMuffGeo, accentMat);
      muff.position.set(0, 0.48, 0.02);
      muff.rotation.x = Math.PI / 2;
      g.add(muff);
    }
    // tail (cute curl)
    const tail = new THREE.Mesh(catTailGeo, furMat);
    tail.position.set(0.22, 0.28, -0.22);
    tail.rotation.z = 0.9;
    tail.rotation.x = 0.4;
    g.add(tail);

    // status ring under paws
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.03, 8, LOW ? 16 : 24),
      new THREE.MeshBasicMaterial({ color: activityColor(agent.activity, agent.status) })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    g.add(ring);
    // label
    const label = makeNameLabel(agent.name, ROOM_META[agent.room].accent);
    label.position.y = 1.15;
    g.add(label);

    g.userData.agent = agent;
    g.userData.ring = ring;
    g.userData.body = body;
    g.userData.tail = tail;
    g.userData.palette = pal;
    return g;
  }

  function makeNameLabel(name, color) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(8,12,24,0.8)';
    roundRect(ctx, 8, 12, 240, 40, 10);
    ctx.fill();
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = color || '#e8ecf7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const display = name.length > 10 ? name.slice(0, 10) + '…' : name;
    ctx.fillText(display, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(1.8, 0.45, 1);
    return spr;
  }

  function assignSeats() {
    ['investment', 'fx', 'other'].forEach((room) => {
      const roomAgents = byRoom[room];
      const desks = desksByRoom[room];
      roomAgents.forEach((agent, i) => {
        const avatar = makeAvatar(agent);
        avatarGroup.add(avatar);
        const desk = desks[i % desks.length];
        const seat = desk.userData.seat.clone();
        const working = agent.status === 'Working' ||
          ['Coding', 'Browsing', 'In Terminal', 'Thinking'].includes(agent.activity);

        const actor = {
          agent,
          mesh: avatar,
          desk,
          seat,
          working,
          pos: seat.clone(),
          target: seat.clone(),
          wanderT: Math.random() * 8,
          phase: Math.random() * Math.PI * 2,
        };

        if (working) {
          desk.userData.occupied = true;
          actor.pos.copy(seat);
          actor.target.copy(seat);
        } else {
          // idle start near lounge / random walk zone
          const r = ROOMS[room];
          actor.pos.set(
            r.x0 + 1 + Math.random() * (r.x1 - r.x0 - 2),
            0,
            r.z0 + 1 + Math.random() * (r.z1 - r.z0 - 2)
          );
          actor.target.copy(actor.pos);
        }
        avatar.position.copy(actor.pos);
        avatarActors.push(actor);
      });
    });
  }
  assignSeats();

  function focusAgent(agent) {
    const actor = avatarActors.find((a) => a.agent.id === agent.id);
    if (!actor) return;
    const p = actor.mesh.position;
    // nudge look-at toward agent
    const look = new THREE.Vector3(p.x, 0, p.z);
    camera.lookAt(look);
  }

  // ——— Orbit / zoom (simple) ———
  let dragging = false;
  let lastX = 0, lastY = 0;
  let theta = Math.PI / 4;
  let phi = Math.PI / 3.2;
  let radius = 48;
  const lookAt = new THREE.Vector3(2, 0, 0);

  function syncCamFromSpherical() {
    camera.position.set(
      lookAt.x + radius * Math.sin(phi) * Math.cos(theta),
      lookAt.y + radius * Math.cos(phi),
      lookAt.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(lookAt);
  }
  syncCamFromSpherical();

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    theta -= dx * 0.005;
    phi = Math.max(0.35, Math.min(1.35, phi - dy * 0.005));
    syncCamFromSpherical();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    frustumSize = Math.max(14, Math.min(48, frustumSize + e.deltaY * 0.02));
    radius = Math.max(28, Math.min(70, radius + e.deltaY * 0.03));
    updateCamera();
    syncCamFromSpherical();
  }, { passive: false });

  // ——— Time of day ———
  const TOD = {
    day: { sun: 1.1, hemi: 0.75, amb: 0.25, clear: 0x87a0c8, sky: 0x7eb6e8, fog: 0.006 },
    evening: { sun: 0.7, hemi: 0.45, amb: 0.3, clear: 0x2a2038, sky: 0x4a3560, fog: 0.01 },
    night: { sun: 0.25, hemi: 0.35, amb: 0.4, clear: 0x0b1020, sky: 0x152038, fog: 0.012 },
  };
  function applyTod(mode) {
    const m = mode === 'now' ? 'night' : mode; // snapshot evening-ish → night default
    const t = TOD[m] || TOD.night;
    sun.intensity = t.sun;
    hemi.intensity = t.hemi;
    ambientNight.intensity = t.amb;
    renderer.setClearColor(t.clear, 1);
    skyMat.color.setHex(t.sky);
    scene.fog.density = t.fog;
  }
  applyTod('night');

  document.getElementById('tod').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tod]');
    if (!btn) return;
    document.querySelectorAll('#tod button').forEach((b) =>
      b.classList.toggle('active', b === btn));
    applyTod(btn.dataset.tod);
  });

  // ——— Animation ———
  const clock = new THREE.Clock();
  function pickWanderTarget(actor) {
    const r = ROOMS[actor.agent.room];
    actor.target.set(
      r.x0 + 1.2 + Math.random() * (r.x1 - r.x0 - 2.4),
      0,
      r.z0 + 1.2 + Math.random() * (r.z1 - r.z0 - 2.4)
    );
  }

  let _rafAccum = 0;
  const _frameMs = LOW ? 1000 / 30 : 0; // phones: cap ~30fps
  function animate(now) {
    requestAnimationFrame(animate);
    if (LOW) {
      if (now - _rafAccum < _frameMs) return;
      _rafAccum = now;
    }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    avatarActors.forEach((actor) => {
      if (actor.working) {
        // subtle bob at desk
        actor.mesh.position.copy(actor.seat);
        actor.mesh.position.y = 0.02 * Math.sin(t * 2 + actor.phase);
        actor.mesh.rotation.y = Math.PI; // face monitors (desk -z)
      } else {
        actor.wanderT -= dt;
        if (actor.wanderT <= 0) {
          pickWanderTarget(actor);
          actor.wanderT = 4 + Math.random() * 7;
        }
        const pos = actor.mesh.position;
        const dx = actor.target.x - pos.x;
        const dz = actor.target.z - pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
          const speed = 1.1;
          pos.x += (dx / dist) * speed * dt;
          pos.z += (dz / dist) * speed * dt;
          actor.mesh.rotation.y = Math.atan2(dx, dz);
          // walk bob
          pos.y = Math.abs(Math.sin(t * 8 + actor.phase)) * 0.06;
        } else {
          pos.y = 0;
        }
      }
      // pulse ring + cute tail wag
      const ring = actor.mesh.userData.ring;
      if (ring) {
        const s = 1 + 0.08 * Math.sin(t * 3 + actor.phase);
        ring.scale.set(s, s, s);
      }
      const tail = actor.mesh.userData.tail;
      if (tail) {
        tail.rotation.z = 0.9 + 0.25 * Math.sin(t * 2.2 + actor.phase);
      }
    });

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    updateCamera();
    syncCamFromSpherical();
  });

  renderTeam();
  animate();
})();

// ——— Mobile panel (Team / Activity sheet) ———
(function setupMobilePanel() {
  const toggle = document.getElementById('panelToggle');
  const scrim = document.getElementById('panelScrim');
  if (!toggle) return;
  const setOpen = (open) => {
    document.body.classList.toggle('panel-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? '關閉' : '名單';
  };
  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('panel-open')));
  if (scrim) scrim.addEventListener('click', () => setOpen(false));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();
