(() => {
  'use strict';

  // ── Pixel Art Sprites ──
  // Each row is exactly 14 characters wide
  // O=orange fur, p=pink, W=white eye, K=black pupil,
  // m=dark marks, L=light paw pad, T=tail dark, b=blue tear
  const PALETTE = {
    'O': '#e8a030',
    'p': '#ff6080',
    'W': '#ffffff',
    'K': '#1a1a2a',
    'm': '#906010',
    'L': '#ffe0a0',
    'T': '#c07818',
    'b': '#4488cc',
    '.': null,
  };

  // Shared rows reused across sprites
  const R = {
    earTip:  '.O..........O.',
    ear:     'OO..........OO',
    earIn:   'OpOO......OOpO',
    head:    'OOOOOOOOOOOOOO',
    nose:    'OOOOOOppOOOOOO',
    chin:    '.OOOOOOOOOOOO.',
    neck:    '..OOOOOOOOOO..',
    body:    '.OOOOOOOOOOOO.',
    paw:     '.OOL......LOO.',
    tail1:   '..........OOTT',
    tail2:   '...........TT.',
  };

  const sprites = {
    normal: [
      R.earTip,
      R.ear,
      R.earIn,
      R.head,
      R.head,
      'OOWWOOOOOOWWOO',  // eyes: white at cols 2-3 & 10-11
      'OOKKOOOOOOKKOO',  // pupils at same cols
      R.nose,
      'OOOOmOOOOmOOOO',  // mouth marks at cols 4 & 9
      R.chin,
      R.neck,
      R.body,
      R.body,
      R.body,
      R.paw,
      R.tail1,
      R.tail2,
    ],
    happy: [
      R.earTip,
      R.ear,
      R.earIn,
      R.head,
      R.head,
      R.head,              // eyes closed (all fur)
      'OOmmOOOOOOmmOO',  // ^_^ squint marks at cols 2-3 & 10-11
      R.nose,
      'OOOOmOOOOmOOOO',
      R.chin,
      R.neck,
      R.body,
      R.body,
      R.body,
      R.paw,
      R.tail1,
      R.tail2,
    ],
    sad: [
      R.earTip,
      R.ear,
      R.earIn,
      R.head,
      R.head,
      'OOWWOOOOOOWWOO',  // eyes
      'OOOKOOOOOOKOOO',  // small pupils (cols 3 & 10) - beady sad eyes
      R.nose,
      'OOOmOOOOOOmOOO',  // frown marks at cols 3 & 10
      R.chin,
      R.neck,
      R.body,
      R.body,
      R.body,
      R.paw,
      R.tail1,
      R.tail2,
    ],
    verySad: [
      R.earTip,
      R.ear,
      R.earIn,
      R.head,
      'OOmmOOOOOOmmOO',  // closed sad eyes at row 4
      R.head,
      R.head,
      R.nose,
      'OOObOOOOOObOOO',  // tears at cols 3 & 10
      R.chin,
      R.neck,
      R.body,
      R.body,
      R.body,
      R.paw,
      R.tail1,
      R.tail2,
    ],
  };

  const PIXEL_SIZE = 6;

  // ── State ──
  const state = {
    happiness: 100,
    alive: true,
    lastInteraction: Date.now(),
    idleThresholdMs: 3 * 60 * 1000, // 3 minutes
    decayIntervalMs: 3000,
    decayAmount: 0.3,
    playing: false,
    currentSprite: 'normal',
    enlightenment: 0,
    weatherActive: false,
    hasHalo: false,
  };

  // ── DOM refs ──
  const $ = (sel) => document.querySelector(sel);
  const catWrap = $('#cat-wrap');
  const canvas = $('#cat-canvas');
  const ctx = canvas.getContext('2d');
  const stage = $('#stage');
  const happinessFill = $('#happiness-fill');
  const happinessValue = $('#happiness-value');
  const heartBurst = $('#heart-burst');
  const catEmote = $('#cat-emote');
  const grave = $('#grave');
  const deathOverlay = $('#death-overlay');
  const graveNameEl = $('#grave-name');
  const catNameInput = $('#cat-name-input');
  const catNameSubmit = $('#cat-name-submit');
  const toys = document.querySelectorAll('.toy');

  // ── Toy config ──
  const toyEmoji = {
    yarn: '\u{1F9F6}',
    fish: '\u{1F41F}',
    mouse: '\u{1F401}',
    feather: '\u{1FAB6}',
    laser: '\u{1F534}',
  };

  const toyHappiness = {
    yarn: 12,
    fish: 18,
    mouse: 10,
    feather: 14,
    laser: 20,
  };

  const toyReaction = {
    yarn: '\u{1F63B}',
    fish: '\u{1F924}',
    mouse: '\u{1F640}',
    feather: '\u{1F638}',
    laser: '\u{1F631}',
  };

  // ── Pixel Cat Renderer ──
  function drawCat(spriteName) {
    const sprite = sprites[spriteName] || sprites.normal;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < sprite.length; y++) {
      const row = sprite[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const color = PALETTE[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      }
    }
    state.currentSprite = spriteName;
  }

  // ── Happiness management ──
  function setHappiness(val) {
    state.happiness = Math.max(0, Math.min(100, val));
    happinessFill.style.width = state.happiness + '%';
    happinessValue.textContent = Math.round(state.happiness);

    happinessFill.classList.remove('low', 'medium');
    happinessValue.classList.remove('low', 'medium');
    if (state.happiness < 25) {
      happinessFill.classList.add('low');
      happinessValue.classList.add('low');
    } else if (state.happiness < 55) {
      happinessFill.classList.add('medium');
      happinessValue.classList.add('medium');
    }

    updateCatMood();
  }

  function updateCatMood() {
    let target;
    if (state.happiness >= 75) target = 'happy';
    else if (state.happiness < 25) target = 'verySad';
    else if (state.happiness < 50) target = 'sad';
    else target = 'normal';

    if (state.currentSprite !== target) {
      drawCat(target);
    }
  }

  // ── Decay loop ──
  function startDecay() {
    setInterval(() => {
      if (!state.alive) return;
      setHappiness(state.happiness - state.decayAmount);
    }, state.decayIntervalMs);
  }

  // ── Idle / death check ──
  function startIdleCheck() {
    setInterval(() => {
      if (!state.alive) return;
      const elapsed = Date.now() - state.lastInteraction;
      if (elapsed >= state.idleThresholdMs) {
        killCat();
      }
      // Show zzz after 20s idle
      const existingZzz = catWrap.querySelector('.zzz');
      if (elapsed > 20000 && !existingZzz && state.alive) {
        const zzz = document.createElement('div');
        zzz.className = 'zzz';
        zzz.textContent = 'Zzz';
        catWrap.appendChild(zzz);
      } else if (elapsed <= 20000 && existingZzz) {
        existingZzz.remove();
      }
    }, 1000);
  }

  function killCat() {
    if (!state.alive) return;
    state.alive = false;

    const zzz = catWrap.querySelector('.zzz');
    if (zzz) zzz.remove();

    catWrap.classList.add('dying');
    addStars();
    stage.classList.add('night');

    setTimeout(() => {
      catWrap.style.display = 'none';
      grave.classList.remove('hidden');
      deathOverlay.classList.remove('hidden');
      catNameInput.focus();
    }, 2000);
  }

  function addStars() {
    const sky = $('#sky');
    for (let i = 0; i < 25; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = (Math.random() * 1.5) + 's';
      sky.appendChild(star);
    }
  }

  // ── Pixel clouds ──
  function addClouds() {
    const sky = $('#sky');
    const cloudShapes = [
      [[0,0],[1,0],[2,0],[3,0],[1,-1],[2,-1]],
      [[0,0],[1,0],[2,0],[3,0],[4,0],[1,-1],[2,-1],[3,-1]],
      [[0,0],[1,0],[2,0],[1,-1]],
    ];

    for (let c = 0; c < 5; c++) {
      const shape = cloudShapes[c % cloudShapes.length];
      const baseY = 20 + Math.random() * 100;
      const delay = -(Math.random() * 30);
      const duration = 20 + Math.random() * 15;

      shape.forEach(([dx, dy]) => {
        const pixel = document.createElement('div');
        pixel.className = 'pixel-cloud';
        pixel.style.top = (baseY + dy * 8) + 'px';
        pixel.style.left = (dx * 8) + 'px';
        pixel.style.animationDuration = duration + 's';
        pixel.style.animationDelay = delay + 's';
        sky.appendChild(pixel);
      });
    }
  }

  // ── Name the dead cat ──
  catNameSubmit.addEventListener('click', submitName);
  catNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitName();
  });

  function submitName() {
    const name = catNameInput.value.trim() || 'Kitty';
    graveNameEl.textContent = name;
    deathOverlay.classList.add('hidden');
  }

  // ── Pet the cat (click) ──
  catWrap.addEventListener('click', (e) => {
    if (!state.alive || state.playing) return;
    e.stopPropagation();
    recordInteraction();

    setHappiness(state.happiness + 5);
    catWrap.classList.add('petting');
    spawnHearts();

    setTimeout(() => catWrap.classList.remove('petting'), 720);
  });

  function spawnHearts() {
    const symbols = ['\u2665', '\u2764', '\u2665'];
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart-particle';
      heart.textContent = symbols[i % symbols.length];
      heart.style.left = (Math.random() * 50 - 25) + 'px';
      heart.style.animationDelay = (i * 0.1) + 's';
      heartBurst.appendChild(heart);
      setTimeout(() => heart.remove(), 1000);
    }
  }

  function showEmote(emoji) {
    catEmote.textContent = emoji;
    catEmote.classList.add('show');
    setTimeout(() => catEmote.classList.remove('show'), 1200);
  }

  function recordInteraction() {
    state.lastInteraction = Date.now();
    const zzz = catWrap.querySelector('.zzz');
    if (zzz) zzz.remove();
  }

  // ── Drag and drop ──
  let dragData = null;
  let ghostEl = null;

  toys.forEach((toy) => {
    toy.addEventListener('dragstart', (e) => {
      if (!state.alive) { e.preventDefault(); return; }
      dragData = toy.dataset.toy;
      toy.classList.add('dragging');
      e.dataTransfer.setData('text/plain', dragData);
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
      e.dataTransfer.setDragImage(img, 0, 0);
    });

    toy.addEventListener('dragend', () => {
      toy.classList.remove('dragging');
      cleanupGhost();
      catWrap.classList.remove('drop-target');
      dragData = null;
    });
  });

  stage.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dragData || !state.alive) return;

    if (!ghostEl) {
      ghostEl = document.createElement('div');
      ghostEl.className = 'drag-ghost';
      ghostEl.textContent = toyEmoji[dragData];
      stage.appendChild(ghostEl);
    }

    const rect = stage.getBoundingClientRect();
    ghostEl.style.left = (e.clientX - rect.left) + 'px';
    ghostEl.style.top = (e.clientY - rect.top) + 'px';

    const catRect = catWrap.getBoundingClientRect();
    const catCenterX = catRect.left + catRect.width / 2;
    const catCenterY = catRect.top + catRect.height / 2;
    const dist = Math.hypot(e.clientX - catCenterX, e.clientY - catCenterY);

    catWrap.classList.toggle('drop-target', dist < 100);
  });

  stage.addEventListener('dragleave', () => {
    cleanupGhost();
    catWrap.classList.remove('drop-target');
  });

  stage.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!state.alive) return;

    const toyType = e.dataTransfer.getData('text/plain') || dragData;
    if (!toyType) return;

    const catRect = catWrap.getBoundingClientRect();
    const catCenterX = catRect.left + catRect.width / 2;
    const catCenterY = catRect.top + catRect.height / 2;
    const dist = Math.hypot(e.clientX - catCenterX, e.clientY - catCenterY);

    if (dist < 120) {
      playCatWithToy(toyType);
    }

    cleanupGhost();
    catWrap.classList.remove('drop-target');
    dragData = null;
  });

  // Touch drag for mobile
  toys.forEach((toy) => {
    toy.addEventListener('touchstart', (e) => {
      if (!state.alive) return;
      e.preventDefault();
      dragData = toy.dataset.toy;
      toy.classList.add('dragging');

      const touch = e.touches[0];
      ghostEl = document.createElement('div');
      ghostEl.className = 'drag-ghost';
      ghostEl.textContent = toyEmoji[dragData];
      stage.appendChild(ghostEl);

      const rect = stage.getBoundingClientRect();
      ghostEl.style.left = (touch.clientX - rect.left) + 'px';
      ghostEl.style.top = (touch.clientY - rect.top) + 'px';
    });

    toy.addEventListener('touchmove', (e) => {
      if (!ghostEl) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = stage.getBoundingClientRect();
      ghostEl.style.left = (touch.clientX - rect.left) + 'px';
      ghostEl.style.top = (touch.clientY - rect.top) + 'px';

      const catRect = catWrap.getBoundingClientRect();
      const catCenterX = catRect.left + catRect.width / 2;
      const catCenterY = catRect.top + catRect.height / 2;
      const dist = Math.hypot(touch.clientX - catCenterX, touch.clientY - catCenterY);

      catWrap.classList.toggle('drop-target', dist < 100);
    });

    toy.addEventListener('touchend', (e) => {
      if (!dragData) return;
      toy.classList.remove('dragging');

      const touch = e.changedTouches[0];
      const catRect = catWrap.getBoundingClientRect();
      const catCenterX = catRect.left + catRect.width / 2;
      const catCenterY = catRect.top + catRect.height / 2;
      const dist = Math.hypot(touch.clientX - catCenterX, touch.clientY - catCenterY);

      if (dist < 120) {
        playCatWithToy(dragData);
      }

      cleanupGhost();
      catWrap.classList.remove('drop-target');
      dragData = null;
    });
  });

  function cleanupGhost() {
    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }
  }

  function playCatWithToy(toyType) {
    if (state.playing) return;
    state.playing = true;
    recordInteraction();

    const happinessGain = toyHappiness[toyType] || 10;
    setHappiness(state.happiness + happinessGain);

    catWrap.classList.add('playing');
    showEmote(toyReaction[toyType] || '\u{1F63A}');
    spawnHearts();

    setTimeout(() => {
      catWrap.classList.remove('playing');
      state.playing = false;
    }, 1000);
  }

  // ── Weather System ──
  const weatherBtns = document.querySelectorAll('.weather-btn');
  const enlightenmentFill = $('#enlightenment-fill');
  const enlightenmentValue = $('#enlightenment-value');
  const enlightenmentBar = $('#enlightenment-bar-container');

  const weatherConfig = {
    rain:    { drain: 15, duration: 10000 },
    snow:    { drain: 10, duration: 10000 },
    volcano: { drain: 20, duration: 10000 },
    eclipse: { drain: 0,  duration: 10000, enlightenmentGain: 15 },
    tornado: { drain: 18, duration: 10000 },
  };

  function setEnlightenment(val) {
    state.enlightenment = Math.max(0, Math.min(100, val));
    enlightenmentFill.style.width = state.enlightenment + '%';
    enlightenmentValue.textContent = Math.round(state.enlightenment);
    if (state.enlightenment >= 100 && !state.hasHalo) {
      grantHalo();
    }
  }

  function grantHalo() {
    state.hasHalo = true;
    const halo = document.createElement('div');
    halo.className = 'halo';
    catWrap.appendChild(halo);
  }

  function triggerWeather(type) {
    if (!state.alive || state.weatherActive) return;
    state.weatherActive = true;
    recordInteraction();

    const config = weatherConfig[type];
    const btn = document.querySelector(`.weather-btn[data-weather="${type}"]`);
    btn.classList.add('active');
    weatherBtns.forEach(b => b.disabled = true);

    stage.classList.add('weather-' + type);

    // Apply HP drain or enlightenment
    if (type === 'eclipse') {
      enlightenmentBar.classList.remove('hidden');
      setEnlightenment(state.enlightenment + config.enlightenmentGain);
    } else {
      setHappiness(state.happiness - config.drain);
    }

    // Spawn visual effects
    const spawned = [];
    if (type === 'rain') spawned.push(...spawnRain());
    else if (type === 'snow') spawned.push(...spawnSnow());
    else if (type === 'volcano') spawned.push(...spawnVolcano());
    else if (type === 'eclipse') spawned.push(...spawnEclipse());
    else if (type === 'tornado') spawned.push(...spawnTornado());

    // Cleanup after duration
    setTimeout(() => {
      spawned.forEach(el => el.remove());
      stage.classList.remove('weather-' + type);
      if (type === 'tornado') catWrap.classList.remove('shaking');
      btn.classList.remove('active');
      weatherBtns.forEach(b => b.disabled = false);
      state.weatherActive = false;
    }, config.duration);
  }

  function spawnRain() {
    const els = [];
    for (let i = 0; i < 40; i++) {
      const drop = document.createElement('div');
      drop.className = 'rain-drop';
      drop.style.left = (Math.random() * 100) + '%';
      drop.style.animationDuration = (0.6 + Math.random() * 0.6) + 's';
      drop.style.animationDelay = (Math.random() * 8) + 's';
      drop.style.animationIterationCount = Math.floor(3 + Math.random() * 5);
      stage.appendChild(drop);
      els.push(drop);
    }
    // Puddles on the ground
    const ground = $('#ground');
    for (let i = 0; i < 8; i++) {
      const puddle = document.createElement('div');
      puddle.className = 'rain-puddle';
      puddle.style.left = (5 + Math.random() * 85) + '%';
      puddle.style.bottom = (Math.random() * 30) + '%';
      puddle.style.width = (20 + Math.random() * 30) + 'px';
      puddle.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      puddle.style.animationDelay = (1 + Math.random() * 5) + 's';
      const shine = document.createElement('div');
      shine.className = 'rain-puddle-shine';
      puddle.appendChild(shine);
      ground.appendChild(puddle);
      els.push(puddle);
    }
    return els;
  }

  function spawnSnow() {
    const els = [];
    for (let i = 0; i < 30; i++) {
      const flake = document.createElement('div');
      flake.className = 'snowflake';
      flake.style.left = (Math.random() * 100) + '%';
      flake.style.animationDuration = (2 + Math.random() * 3) + 's';
      flake.style.animationDelay = (Math.random() * 7) + 's';
      flake.style.animationIterationCount = Math.floor(1 + Math.random() * 3);
      stage.appendChild(flake);
      els.push(flake);
    }
    // Snow cap accumulating on cat's head
    const cap = document.createElement('div');
    cap.className = 'snow-cap';
    // Pixel rows for a small snow pile: wider at bottom, narrow at top
    const rows = [
      [0,0,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,1],
    ];
    rows.forEach(row => {
      row.forEach(filled => {
        const px = document.createElement('div');
        px.className = 'snow-cap-pixel';
        px.style.opacity = filled ? '1' : '0';
        cap.appendChild(px);
      });
    });
    catWrap.appendChild(cap);
    els.push(cap);
    return els;
  }

  function spawnVolcano() {
    const els = [];

    // Build pixel-art volcano mountain
    const mountain = document.createElement('div');
    mountain.className = 'volcano-mountain';
    // Triangle shape: each row wider than the last (pixel rows)
    const mountainRows = [
      [1,1,1,1],
      [1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];
    const baseColor = '#5a3a2a';
    const darkColor = '#3a2218';
    mountainRows.forEach((row, ri) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'volcano-row';
      row.forEach(() => {
        const px = document.createElement('div');
        px.className = 'volcano-px';
        px.style.background = Math.random() > 0.3 ? baseColor : darkColor;
        rowEl.appendChild(px);
      });
      mountain.appendChild(rowEl);
    });

    // Crater glow at top
    const crater = document.createElement('div');
    crater.className = 'volcano-crater';
    mountain.appendChild(crater);
    mountain.style.position = 'relative';

    stage.appendChild(mountain);
    els.push(mountain);

    // Eruption particles shooting out of crater
    const eruptionColors = ['#ff4400', '#ff6622', '#ffaa00', '#ffcc00', '#ff2200'];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'eruption-particle';
      p.style.background = eruptionColors[Math.floor(Math.random() * eruptionColors.length)];
      p.style.right = '10%';
      p.style.bottom = '84%';
      const angle = -40 + Math.random() * 80; // spread upward
      const dist = 40 + Math.random() * 100;
      const rad = angle * Math.PI / 180;
      const tx = Math.sin(rad) * dist;
      const ty = -Math.cos(rad) * dist;
      p.style.animationDuration = (0.8 + Math.random() * 1.5) + 's';
      p.style.animationDelay = (Math.random() * 8) + 's';
      p.style.animationIterationCount = Math.floor(1 + Math.random() * 3);
      p.style.setProperty('animation-name', 'eruption-shoot');
      p.style.setProperty('--tx', tx + 'px');
      p.style.setProperty('--ty', ty + 'px');
      stage.appendChild(p);
      els.push(p);
    }

    // Lava flows down the mountain sides
    for (let i = 0; i < 6; i++) {
      const flow = document.createElement('div');
      flow.className = 'lava-flow';
      flow.style.right = (10 + i * 3 - 4 + Math.random() * 8) + '%';
      flow.style.bottom = (48 + Math.random() * 10) + '%';
      const flowHeight = 30 + Math.random() * 50;
      flow.style.setProperty('--flow-h', flowHeight + 'px');
      flow.style.animationDuration = (2 + Math.random() * 3) + 's';
      flow.style.animationDelay = (Math.random() * 5) + 's';
      flow.style.background = Math.random() > 0.5 ? '#ff4400' : '#ff6622';
      stage.appendChild(flow);
      els.push(flow);
    }

    // Lava pools on the ground
    const ground = $('#ground');
    const poolColors = ['#ff4400', '#cc3300', '#ff5500'];
    for (let i = 0; i < 5; i++) {
      const pool = document.createElement('div');
      pool.className = 'lava-pool';
      pool.style.left = (30 + Math.random() * 60) + '%';
      pool.style.width = (30 + Math.random() * 50) + 'px';
      pool.style.background = poolColors[Math.floor(Math.random() * poolColors.length)];
      pool.style.boxShadow = '0 0 8px #ff4400, 0 0 16px rgba(255,68,0,0.3)';
      pool.style.animationDuration = (1.5 + Math.random() * 3) + 's';
      pool.style.animationDelay = (2 + Math.random() * 5) + 's';
      ground.appendChild(pool);
      els.push(pool);
    }

    return els;
  }

  function spawnEclipse() {
    const els = [];
    const sun = document.createElement('div');
    sun.className = 'eclipse-sun';
    stage.appendChild(sun);
    els.push(sun);

    const moon = document.createElement('div');
    moon.className = 'eclipse-moon';
    stage.appendChild(moon);
    els.push(moon);
    return els;
  }

  function spawnTornado() {
    const els = [];
    const funnel = document.createElement('div');
    funnel.className = 'tornado-funnel';
    const widths = [12, 18, 26, 34, 42, 50, 58, 64, 70, 76];
    widths.forEach((w, i) => {
      const seg = document.createElement('div');
      seg.className = 'tornado-segment';
      seg.style.width = w + 'px';
      seg.style.animationDelay = (i * 0.05) + 's';
      funnel.appendChild(seg);
    });
    stage.appendChild(funnel);
    els.push(funnel);
    catWrap.classList.add('shaking');
    return els;
  }

  weatherBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerWeather(btn.dataset.weather);
    });
  });

  // ── Init ──
  function init() {
    // Validate sprites in dev
    Object.entries(sprites).forEach(([name, rows]) => {
      rows.forEach((row, i) => {
        if (row.length !== 14) {
          console.warn(`Sprite "${name}" row ${i} is ${row.length} chars (expected 14): "${row}"`);
        }
      });
    });

    canvas.width = 14 * PIXEL_SIZE;
    canvas.height = 17 * PIXEL_SIZE;
    canvas.style.width = (14 * PIXEL_SIZE) + 'px';
    canvas.style.height = (17 * PIXEL_SIZE) + 'px';
    drawCat('normal');
    addClouds();
    setHappiness(80);
    startDecay();
    startIdleCheck();
  }

  init();
})();
