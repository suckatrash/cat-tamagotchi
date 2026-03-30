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
