(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = (t, n = 2) => 1 - Math.pow(1 - clamp(t), n);
  const $ = (sel) => document.querySelector(sel);

  const root = document.documentElement;
  const body = document.body;

  /* ---------- elements ---------- */
  const openingTrack = $('.opening-track');
  const openingStage = $('.opening-stage');
  const paperLayer = $('.layer-paper');
  const nightLayer = $('.layer-night');
  const wordLight = $('.word-light');
  const wordInk = $('.word-ink');
  const wordB = $('.word-b');
  const vwordA = $('.vword-a');
  const vwordB = $('.vword-b');
  const scrollLabel = $('.scroll-label');

  const workTrack = $('.work-track');
  const workLabel = $('.sec-label-work');
  const workBar = $('.work-bar');
  const edgeLine = $('.edge-line');
  const previewCol = $('.preview-col');
  const edgeFront = $('.edge-front');
  const projectPreview = $('.project-preview');
  const projectRows = [...document.querySelectorAll('.project-row')];
  const projectArts = [...document.querySelectorAll('.project-art')];

  const aboutTrack = $('.about-track');
  const aboutStage = $('.about-stage');   // PERBAIKAN: variabel CSS about ditulis di sini, bukan di <html>
  const aboutWord = $('.sideword');
  const aboutCopy = $('.about-copy');
  const aboutParas = [...document.querySelectorAll('.about-copy p')];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* =========================================================
     PECAH TEKS: huruf judul (.ch)
     ========================================================= */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    let i = 0;
    [...text].forEach((c) => {
      if (c === ' ') { el.appendChild(document.createTextNode(' ')); return; }
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i++);
      s.textContent = c;
      el.appendChild(s);
    });
  }

  const META_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789#@%&*+';
  const metaStore = new Map();
  function collectText(el) {
    const nodes = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (n.nodeValue.length) nodes.push({ node: n, text: n.nodeValue });
    return nodes;
  }
  function scrambleMeta(el) {
    if (reduceMotion) return;
    if (!metaStore.has(el)) metaStore.set(el, collectText(el));
    const data = metaStore.get(el);
    const total = data.reduce((s, d) => s + d.text.length, 0);
    clearInterval(el._metaTimer);
    let frame = 0;
    const FRAMES = 20;
    el._metaTimer = setInterval(() => {
      frame++;
      const reveal = Math.floor((frame / FRAMES) * total);
      let idx = 0;
      data.forEach((d) => {
        d.node.nodeValue = [...d.text].map((c) => {
          const i = idx++;
          return i < reveal || /\s/.test(c) ? c : META_CHARS[Math.floor(Math.random() * META_CHARS.length)];
        }).join('');
      });
      if (frame >= FRAMES) { clearInterval(el._metaTimer); data.forEach((d) => { d.node.nodeValue = d.text; }); }
    }, 28);
  }
  document.querySelectorAll('.project-title .title-filled, .project-title .title-outline').forEach(splitChars);

  /* =========================================================
     PROJECT PREVIEW (hover)
     ========================================================= */
  const IDLE_MS = 5000;
  let activeProject = -1;

  function setProject(index) {
    if (index < 0 || index >= projectRows.length || activeProject === index) return;
    activeProject = index;
    projectRows.forEach((row, i) => {
      row.classList.toggle('is-active', i === index);
      if (i === index) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
    const key = projectRows[index].dataset.project;
    projectArts.forEach((art) => art.classList.toggle('is-visible', art.dataset.art === key));
    projectPreview && projectPreview.classList.add('has-active');
  }

  function resetProjectPreview() {
    activeProject = -1;
    projectRows.forEach((row) => {
      row.classList.remove('is-active');
      row.removeAttribute('aria-current');
    });
    projectArts.forEach((art) => art.classList.remove('is-visible'));
    projectPreview && projectPreview.classList.remove('has-active');
  }

  /* slot gambar di dalam tiap baris (layout HP: gambar di bawah judul) */
  projectRows.forEach((row) => {
    const art = projectArts.find((a) => a.dataset.art === row.dataset.project);
    if (!art) return;
    const fig = document.createElement('span');
    fig.className = 'row-art';
    const im = art.cloneNode();
    im.className = 'row-art-img';
    im.removeAttribute('data-art');
    if (art.dataset.srcMobile) im.src = art.dataset.srcMobile;   // versi putih untuk kartu gelap di HP
    fig.appendChild(im);
    row.appendChild(fig);
  });

  const stackedMQ = window.matchMedia('(max-width: 700px)');
  const isStacked = () => stackedMQ.matches;

  let idleTimer = 0;
  let overPreview = false;
  const cancelIdle = () => clearTimeout(idleTimer);
  function armIdle() {
    clearTimeout(idleTimer);
    if (isStacked()) return;
    idleTimer = setTimeout(() => {
      if (overPreview || projectRows.some((r) => r.classList.contains('is-hover'))) return;
      resetProjectPreview();
    }, IDLE_MS);
  }
  if (projectPreview) {
    projectPreview.addEventListener('mouseenter', () => { overPreview = true; cancelIdle(); });
    projectPreview.addEventListener('mouseleave', () => { overPreview = false; armIdle(); });
  }

  let lastScrollAt = 0;
  window.addEventListener('scroll', () => { lastScrollAt = performance.now(); }, { passive: true });

  function hoverRow(index) {
    const row = projectRows[index];
    if (!row) return;
    cancelIdle();
    const changed = !row.classList.contains('is-hover');
    projectRows.forEach((r) => r.classList.remove('is-hover'));
    row.classList.add('is-hover');
    setProject(index);
    const meta = row.querySelector('.project-meta');
    if (changed && meta) scrambleMeta(meta);
  }

  projectRows.forEach((row, index) => {
    row.addEventListener('mouseenter', () => {
      if (performance.now() - lastScrollAt < 350) return;
      hoverRow(index);
    });
    row.addEventListener('mousemove', (e) => {
      if ((e.movementX || e.movementY) && !row.classList.contains('is-hover')) hoverRow(index);
    }, { passive: true });
    // HP: kalau gambar belum terbuka, ketukan pertama membukanya; setelah itu buka link / popup
    row.addEventListener('click', (e) => {
      if (isStacked() && !row.classList.contains('is-open')) {
        e.preventDefault();
        row.dataset.tapped = '1';
        row.classList.add('is-open');
        const meta = row.querySelector('.project-meta');
        if (meta) scrambleMeta(meta);
        return;
      }
      if (row.dataset.popup && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) {
        e.preventDefault();
        openCv(row.dataset.popup);
      }
    });
    row.addEventListener('mouseleave', () => { row.classList.remove('is-hover'); armIdle(); });
    row.addEventListener('focus', () => { cancelIdle(); setProject(index); row.classList.add('is-hover'); });
    row.addEventListener('blur', () => { row.classList.remove('is-hover'); armIdle(); });
  });

  /* =========================================================
     TEXT SCRAMBLE (email & link sosial)
     ========================================================= */
  const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789@.#*+';
  function scramble(el) {
    const text = el.dataset.text || el.textContent;
    el.dataset.text = text;
    clearInterval(el._scrambleTimer);
    let frame = 0;
    const total = 12;
    el._scrambleTimer = setInterval(() => {
      frame++;
      const reveal = Math.floor((frame / total) * text.length);
      el.textContent = text.split('').map((c, i) => (
        i < reveal || c === ' ' ? c : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
      )).join('');
      if (frame >= total) { clearInterval(el._scrambleTimer); el.textContent = text; }
    }, 32);
  }
  document.querySelectorAll('[data-u][data-d]').forEach((el) => {
    const addr = `${el.dataset.u}@${el.dataset.d}`;
    el.href = `mailto:${addr.toLowerCase()}`;
    el.textContent = addr;
  });
  document.querySelectorAll('.scramble').forEach((el) => {
    el.dataset.text = el.textContent;
    if (!reduceMotion) el.addEventListener('mouseenter', () => scramble(el));
  });

  /* =========================================================
     OPENING — ukuran & posisi
     ========================================================= */
  const FINAL_LS = -0.04;
  const START_LS = 2.2;
  const LINE_OVERSHOOT = 0.00;
  const WORK_EDGE_D = 1.9;
  let edgeDraw = 0;

  const M = {
    vw: 0, vh: 0, L: 0, copyH: 0, ou: 10, holeX: 0, holeY: 0, holeL: 0, holeR: 0, glyphL: 0, frontX: 0, lh: 3,
    A: { fs: 0, w: 0, left0: 0, leftF: 0 },
    B: { fs: 0, w: 0, leftF: 0 },
    VA: { w: 0, y: 0 },
    VB: { w: 0, y: 0 }
  };

  let _ctx = null;
  function glyphAdvance(text, fs, el) {
    try {
      _ctx = _ctx || document.createElement('canvas').getContext('2d');
      const cs = getComputedStyle(el);
      _ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      return _ctx.measureText(text).width;
    } catch (e) {
      return fs * 0.7;
    }
  }

  function fitWord(el) {
    el.style.fontSize = '100px';
    el.style.letterSpacing = `${FINAL_LS}em`;
    const w100 = el.offsetWidth - FINAL_LS * 100;
    const fs = Math.min(M.vh * 0.52, (M.vw * 0.8 * 100) / w100);
    return { fs, w: (w100 * fs) / 100 };
  }

  function findRHole(fs, left0, stageH) {
    try {
      const cs = getComputedStyle(wordLight);
      const W = Math.ceil(fs * 1.3), H = Math.ceil(fs * 1.5);
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      g.textBaseline = 'alphabetic';
      g.fillStyle = '#000';
      const ox = fs * 0.15, by = fs * 1.15;
      g.fillText('R', ox, by);
      const m = g.measureText('R');
      const asc = m.fontBoundingBoxAscent || fs * 0.95;
      const desc = m.fontBoundingBoxDescent || fs * 0.25;
      const data = g.getImageData(0, 0, W, H).data;
      const ink = (i) => data[i * 4 + 3] >= 128;
      const seen = new Uint8Array(W * H);
      const stack = new Int32Array(W * H);
      let sp = 0;
      stack[sp++] = 0; seen[0] = 1;
      while (sp) {
        const i = stack[--sp];
        const x = i % W, y = (i / W) | 0;
        if (x > 0)     { const k = i - 1; if (!seen[k] && !ink(k)) { seen[k] = 1; stack[sp++] = k; } }
        if (x < W - 1) { const k = i + 1; if (!seen[k] && !ink(k)) { seen[k] = 1; stack[sp++] = k; } }
        if (y > 0)     { const k = i - W; if (!seen[k] && !ink(k)) { seen[k] = 1; stack[sp++] = k; } }
        if (y < H - 1) { const k = i + W; if (!seen[k] && !ink(k)) { seen[k] = 1; stack[sp++] = k; } }
      }
      let sx = 0, sy = 0, cnt = 0, hx0 = W, hx1 = 0, gl = W;
      for (let i = 0; i < W * H; i++) {
        const xx = i % W;
        if (ink(i)) { if (xx < gl) gl = xx; }
        else if (!seen[i]) { sx += xx; sy += (i / W) | 0; cnt++; if (xx < hx0) hx0 = xx; if (xx > hx1) hx1 = xx; }
      }
      if (cnt < 60) return null;
      const gx = sx / cnt, gy = sy / cnt;
      const boxTop = stageH / 2 - fs / 2;
      const baseline = boxTop + (fs - (asc + desc)) / 2 + asc;
      return { x: left0 + (gx - ox), y: baseline + (gy - by), left: left0 + (hx0 - ox), right: left0 + (hx1 - ox), glyphLeft: left0 + (gl - ox) };
    } catch (e) {
      return null;
    }
  }

  function measure() {
    if (!openingStage) return;
    M.vw = window.innerWidth;
    M.ou = Math.max(1, (openingTrack.offsetHeight - window.innerHeight) / window.innerHeight);
    M.vh = openingStage.clientHeight || window.innerHeight;

    const a = fitWord(wordInk);
    wordInk.style.fontSize = wordLight.style.fontSize = `${a.fs}px`;
    const firstAdv = glyphAdvance(wordInk.textContent.trim().charAt(0), a.fs, wordInk);
    M.A = { fs: a.fs, w: a.w, left0: M.vw / 2 - firstAdv / 2, leftF: (M.vw - a.w) / 2 };

    const hole = findRHole(a.fs, M.A.left0, M.vh) || { x: M.A.left0 + a.fs * 0.33, y: M.vh / 2 - a.fs * 0.08 };
    M.holeX = hole.x; M.holeY = hole.y;
    M.holeR = (hole.right != null ? hole.right : hole.x + a.fs * 0.1) + a.fs * LINE_OVERSHOOT;
    M.holeL = hole.left != null ? hole.left : hole.x - a.fs * 0.1;
    M.glyphL = hole.glyphLeft != null ? hole.glyphLeft : hole.x - a.fs * 0.3;
    M.frontX = (M.holeL + M.glyphL) / 2;
    M.lh = (edgeLine && edgeLine.offsetHeight) || 3;

    const b = fitWord(wordB);
    wordB.style.fontSize = `${b.fs}px`;
    M.B = { fs: b.fs, w: b.w, leftF: (M.vw - b.w) / 2 };

    const vfs = Math.min(M.vh * 0.30, M.vw * 0.40);
    [vwordA, vwordB].forEach((el) => {
      el.style.fontSize = `${vfs}px`;
      el.style.setProperty('--vfs', `${vfs}px`);
    });
    M.VA = { w: vwordA.offsetWidth, y: M.vh * 0.33 - vfs / 2 };
    M.VB = { w: vwordB.offsetWidth, y: M.vh * 0.69 - vfs / 2 };

    M.L = aboutWord ? aboutWord.offsetWidth : 0;
    M.copyH = aboutCopy ? aboutCopy.offsetHeight : 0;
  }

  function placeWord(el, left, ls) {
    el.style.transform = `translate3d(${left.toFixed(2)}px, -50%, 0)`;
    el.style.letterSpacing = `${ls.toFixed(4)}em`;
  }

  /* =========================================================
     OPENING — timeline (p = 0 … 1)
     ========================================================= */
  function updateOpening(p) {
    if (!paperLayer || !M.vw) return;
    const { vw } = M;
    const u = p * M.ou;
    const po = u / 8;

    const wipe = smooth(0.012, 0.13, po);
    paperLayer.style.clipPath = `inset(0 0 0 ${((1 - wipe) * 100).toFixed(3)}%)`;

    const q1 = clamp((po - 0.015) / 0.285);
    const q2 = clamp((po - 0.015) / 0.385);
    const lsA = FINAL_LS + (START_LS - FINAL_LS) * Math.pow(1 - q1, 2.6);
    const leftA = lerp(M.A.left0, M.A.leftF, 1 - Math.pow(1 - q2, 2.2));
    placeWord(wordLight, leftA, lsA);
    placeWord(wordInk, leftA, lsA);

    if (edgeLine) {
      const xr = (1 - wipe) * vw;
      const len = Math.max(0, vw * edgeDraw * (1 - wipe));
      const xl = xr - len;
      const y = (M.holeY - M.lh / 2).toFixed(1);
      edgeLine.style.width = `${len.toFixed(1)}px`;
      edgeLine.style.transform = `translate3d(${xl.toFixed(1)}px, ${y}px, 0)`;
      edgeLine.style.visibility = len > 0.5 ? 'visible' : 'hidden';
      if (edgeFront) {
        const holeR = M.holeR + (leftA - M.A.left0);
        const right = Math.min(xr, holeR);
        const fl = Math.max(0, right - xl);
        edgeFront.style.width = `${fl.toFixed(1)}px`;
        edgeFront.style.transform = `translate3d(${xl.toFixed(1)}px, ${y}px, 0)`;
        edgeFront.style.visibility = fl > 0.5 ? 'visible' : 'hidden';
      }
    }

    const tb = clamp((po - 0.31) / 0.43);
    const leftB = lerp(vw * 0.94, -(M.B.w + vw * 0.06), tb);
    const lsB = lerp(0.40, -0.005, easeOut((po - 0.31) / 0.20, 2));
    placeWord(wordB, leftB, lsB);
    wordB.style.visibility = po > 0.30 && po < 0.82 ? 'visible' : 'hidden';

    const night = easeOut((u - 5.12) / 1.28, 2);
    nightLayer.style.clipPath = `inset(0 0 0 ${((1 - night) * 100).toFixed(3)}%)`;

    const tA = clamp((u - 5.3) / 2.8);
    const tB = clamp((u - 6.4) / 2.6);
    const xA = lerp(vw * 1.02, -M.VA.w, tA);
    const xB = lerp(-M.VB.w, vw * 1.02, tB);
    vwordA.style.transform = `translate3d(${xA.toFixed(2)}px, ${M.VA.y.toFixed(2)}px, 0)`;
    vwordB.style.transform = `translate3d(${xB.toFixed(2)}px, ${M.VB.y.toFixed(2)}px, 0)`;

    scrollLabel.style.opacity = String(1 - smooth(0.004, 0.03, po));
  }

  /* =========================================================
     ABOUT + CONTACT
     ========================================================= */
  function updateAbout(p) {
    if (isStacked()) p = clamp(p / 0.82);   // HP: semua animasi About selesai lebih awal (garis merah / Let's Talk muncul lebih cepat)
    const vh = window.innerHeight;
    const y0 = vh * 0.72;
    const y1 = Math.max(y0 + vh * 0.4, M.L + vh * 0.05);
    aboutStage.style.setProperty('--about-word-y', `${lerp(y0, y1, p).toFixed(2)}px`);

    const copyTop = aboutCopy ? aboutCopy.offsetTop : vh * 0.56;
    const copyTravel = ((copyTop + M.copyH + vh * 0.06) / vh) * 100;
    aboutStage.style.setProperty('--about-copy-y', `${(-clamp(p / 0.78) * copyTravel).toFixed(3)}vh`);

    const settle = smooth(0, 0.5, p);
    aboutParas.forEach((el, i) => el.style.setProperty('--ps', `${(i * 5 * (1 - settle)).toFixed(2)}vh`));

    aboutStage.style.setProperty('--strike-1', smooth(0.03, 0.12, p).toFixed(4));
    aboutStage.style.setProperty('--strike-2', smooth(0.12, 0.22, p).toFixed(4));

    const cp = smooth(0.46, 0.78, p);
    aboutStage.style.setProperty('--contact-y', `${((1 - cp) * 110).toFixed(3)}vh`);
    aboutStage.style.setProperty('--rule', smooth(0.72, 1.0, p).toFixed(4));

    aboutStage.style.setProperty('--marq', (p * 70).toFixed(3));
  }

  /* =========================================================
     SCROLL ENGINE
     ========================================================= */
  let rafPending = false;
  let sceneLoopActive = false;
  let previousFrameTime = 0;

  const target = { opening: 0, enter: 0, about: 0, aboutEnter: 0 };
  const current = { opening: 0, enter: 0, about: 0, aboutEnter: 0 };

  function progressOf(section) {
    if (!section) return 0;
    const rect = section.getBoundingClientRect();
    const distance = Math.max(1, section.offsetHeight - window.innerHeight);
    return clamp(-rect.top / distance);
  }

  function enterOf(section) {
    if (!section) return 0;
    const rect = section.getBoundingClientRect();
    return clamp((window.innerHeight - rect.top) / window.innerHeight, 0, 2);
  }

  function renderSceneFrame() {
    updateOpening(current.opening);

    const stacked = isStacked();
    const vh = window.innerHeight;
    const natTop = workTrack.offsetTop - window.scrollY;
    const eN = (vh - natTop) / vh;
    const tE = clamp(eN / (stacked ? 1 : WORK_EDGE_D));   // HP: kertas naik normal, tanpa easing lambat
    const gE = tE * tE * (3 - 2 * tE);
    const edgeY = vh * (1 - gE);
    const topClip = edgeY > 0.5 ? Math.max(0, edgeY - natTop) : 0;
    const tilt = 0.035 * vh * (1 - smooth(0.8, 1, tE));
    workTrack.style.clipPath = stacked
      ? 'none'
      : `polygon(0 ${topClip.toFixed(1)}px, 100% ${(topClip + tilt).toFixed(1)}px, 100% 100%, 0 100%)`;

    const aE = current.aboutEnter;
    const la = clamp((0.16 * vh - edgeY) / (0.16 * vh));
    const lo = smooth(0, 0.6, la) * (1 - smooth(0.3, 0.75, aE));
    const ly = (1 - easeOut(la, 2)) * -9 + smooth(0.25, 0.8, aE) * -9;
    if (workLabel) {
      workLabel.style.setProperty('--wl-y', `${ly.toFixed(2)}vh`);
      workLabel.style.setProperty('--wl-o', lo.toFixed(3));
    }
    if (workBar) workBar.style.opacity = (1 - smooth(0.2, 0.65, aE)).toFixed(3);

    if (!stacked) {
      const e1 = 1 - smooth(0, 2.2, eN);
      projectRows.forEach((row, i) => row.style.setProperty('--row-enter', `${((4 + 3 * i) * e1).toFixed(3)}vh`));
      if (previewCol) previewCol.style.setProperty('--pv-enter', `${(10 * e1).toFixed(3)}vh`);
    }

    updateAbout(current.about);

    // HP: kartu yang sudah naik melewati garis pemicu otomatis membuka gambarnya
    if (stacked && current.enter > 0.5) {
      const trigger = vh * 0.55;
      projectRows.forEach((row) => {
        const open = row.getBoundingClientRect().top <= trigger || row.dataset.tapped === '1';
        if (open !== row.classList.contains('is-open')) {
          row.classList.toggle('is-open', open);
          const meta = row.querySelector('.project-meta');
          if (open && meta) scrambleMeta(meta);
        }
      });
    }
  }

  function animateSceneProgress(timestamp) {
    if (!sceneLoopActive) return;

    const dt = previousFrameTime ? Math.min(40, timestamp - previousFrameTime) : 16.67;
    previousFrameTime = timestamp;
    // PERBAIKAN: di layar sentuh tanpa lerp (scroll bawaan browser sudah halus; lerp bikin patah-patah)
    const factor = (reduceMotion || !smoothOn) ? 1 : 1 - Math.exp(-dt / 45);

    current.opening += (target.opening - current.opening) * factor;
    current.enter += (target.enter - current.enter) * factor;
    current.about += (target.about - current.about) * factor;
    current.aboutEnter += (target.aboutEnter - current.aboutEnter) * factor;

    renderSceneFrame();

    const diff = Math.max(
      Math.abs(target.opening - current.opening),
      Math.abs(target.enter - current.enter),
      Math.abs(target.about - current.about),
      Math.abs(target.aboutEnter - current.aboutEnter)
    );

    if (diff > 0.0002) {
      window.requestAnimationFrame(animateSceneProgress);
    } else {
      Object.assign(current, target);
      previousFrameTime = 0;
      sceneLoopActive = false;
      renderSceneFrame();
    }
  }

  function readTargets() {
    target.opening = progressOf(openingTrack);
    target.enter = enterOf(workTrack);
    target.about = progressOf(aboutTrack);
    target.aboutEnter = enterOf(aboutTrack);
  }

  function updateScrollScenes() {
    rafPending = false;
    if (!openingTrack || !workTrack || !aboutTrack) return;
    readTargets();
    if (!smoothOn || reduceMotion) { Object.assign(current, target); renderSceneFrame(); return; }   // HP: tanpa jeda 1 frame
    if (!sceneLoopActive) {
      sceneLoopActive = true;
      previousFrameTime = 0;
      window.requestAnimationFrame(animateSceneProgress);
    }
  }

  function requestSceneUpdate() {
    if (rafPending) return;
    rafPending = true;
    window.requestAnimationFrame(updateScrollScenes);
  }

  window.addEventListener('scroll', requestSceneUpdate, { passive: true });

  // PERBAIKAN: abaikan resize yang hanya mengubah tinggi (address bar HP naik/turun)
  let resizeTimer = 0;
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      layoutLoader();
      readTargets();
      Object.assign(current, target);
      renderSceneFrame();
    }, 60);
  }, { passive: true });

  /* =========================================================
     CUSTOM CURSOR
     ========================================================= */
  if (finePointer) {
    const dot = $('.cursor-dot');
    const ring = $('.cursor-ring');

    let px = -100, py = -100, rx = -100, ry = -100;
    let dotScale = 1, ringScale = 1;
    let hovering = false, visible = false, seen = false;

    window.addEventListener('mousemove', (e) => {
      px = e.clientX;
      py = e.clientY;
      if (!seen) { seen = true; rx = px; ry = py; }
      if (!visible) { visible = true; body.classList.add('has-custom-cursor'); }
    }, { passive: true });

    document.addEventListener('mouseleave', () => { visible = false; body.classList.remove('has-custom-cursor'); });
    document.addEventListener('mouseenter', () => { if (seen) { visible = true; body.classList.add('has-custom-cursor'); } });

    document.addEventListener('mouseover', (e) => {
      hovering = !!(e.target.closest && e.target.closest('a, button, .project-preview.has-active'));
    }, { passive: true });

    const tick = () => {
      const follow = reduceMotion ? 1 : 0.14;
      rx += (px - rx) * follow;
      ry += (py - ry) * follow;
      dotScale += ((hovering ? 2.3 : 1) - dotScale) * 0.2;
      ringScale += ((hovering ? 0.42 : 1) - ringScale) * 0.2;

      const dist = Math.hypot(px - rx, py - ry);
      const ringOpacity = !visible ? 0 : hovering ? 1 : clamp(dist / 10) * 0.9;

      dot.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${dotScale.toFixed(3)})`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${ringScale.toFixed(3)})`;
      dot.style.opacity = visible ? '1' : '0';
      ring.style.opacity = ringOpacity.toFixed(3);

      window.requestAnimationFrame(tick);
    };
    tick();
  }

  /* =========================================================
     SCROLLBAR MINIMALIS (hanya desktop; di HP disembunyikan lewat CSS)
     ========================================================= */
  const sb = $('.scrollbar');
  const sbThumb = $('.scrollbar-thumb');
  let sbDrag = false, sbGrab = 0;

  function sbMetrics() {
    const vh = window.innerHeight;
    const docH = Math.max(root.scrollHeight, body.scrollHeight);
    const thumbH = Math.max(48, (vh * vh) / docH);
    return { vh, docH, thumbH };
  }
  function updateScrollbar() {
    if (!sb || !finePointer) return;
    const { vh, docH, thumbH } = sbMetrics();
    const max = Math.max(1, docH - vh);
    const y = (window.scrollY / max) * (vh - thumbH);
    sbThumb.style.height = `${thumbH}px`;
    sbThumb.style.transform = `translate3d(0, ${clamp(y, 0, vh - thumbH).toFixed(2)}px, 0)`;
    sb.classList.toggle('is-hidden', docH <= vh + 1);
  }
  function sbMoveTo(clientY) {
    const { vh, docH, thumbH } = sbMetrics();
    const ratio = clamp((clientY - sbGrab) / Math.max(1, vh - thumbH));
    window.scrollTo(0, ratio * (docH - vh));
  }
  if (sb) {
    sb.addEventListener('pointerdown', (e) => {
      const r = sbThumb.getBoundingClientRect();
      sbGrab = e.clientY >= r.top && e.clientY <= r.bottom ? e.clientY - r.top : r.height / 2;
      sbDrag = true;
      sb.classList.add('is-drag');
      sb.setPointerCapture(e.pointerId);
      sbMoveTo(e.clientY);
      e.preventDefault();
    });
    sb.addEventListener('pointermove', (e) => { if (sbDrag) sbMoveTo(e.clientY); });
    const sbEnd = () => { sbDrag = false; sb.classList.remove('is-drag'); };
    sb.addEventListener('pointerup', sbEnd);
    sb.addEventListener('pointercancel', sbEnd);
    window.addEventListener('scroll', updateScrollbar, { passive: true });
    window.addEventListener('resize', updateScrollbar, { passive: true });
    window.addEventListener('load', updateScrollbar);
  }

  /* =========================================================
     SMOOTH SCROLL (mouse wheel saja)
     ========================================================= */
  let smoothOn = false;
  (function initSmoothScroll() {
    if (reduceMotion || !finePointer) return;
    smoothOn = true;
    let targetY = window.scrollY, curY = window.scrollY, running = false, last = 0;
    const maxY = () => Math.max(0, root.scrollHeight - window.innerHeight);
    const frame = (t) => {
      const dt = last ? Math.min(50, t - last) : 16.7;
      last = t;
      curY += (targetY - curY) * (1 - Math.exp(-dt / 120));
      if (Math.abs(targetY - curY) < 0.5) { curY = targetY; running = false; last = 0; }
      window.scrollTo(0, curY);
      if (running) window.requestAnimationFrame(frame);
    };
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey || root.classList.contains('is-loading') || root.classList.contains('is-modal')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
      if (!running) { curY = window.scrollY; targetY = curY; }
      targetY = clamp(targetY + e.deltaY * unit, 0, maxY());
      if (!running) { running = true; last = 0; window.requestAnimationFrame(frame); }
    }, { passive: false });
    window.addEventListener('scroll', () => { if (!running) { curY = targetY = window.scrollY; } }, { passive: true });
  })();

  /* =========================================================
     TOUCH SCROLL — inersia "berat" di HP.
     Menggeser halaman mengikuti jari 1:1, tapi lemparan (fling) dibatasi kecepatannya
     dan cepat melambat, jadi scroll kencang tidak langsung melompat ke paling bawah.
     Atur rasa lewat 2 angka ini:
       TOUCH_MAX_V : kecepatan maksimal lemparan (px/ms). Kecil = lebih berat.
       TOUCH_TAU   : lamanya meluncur (ms). Kecil = cepat berhenti.
     ========================================================= */
  const TOUCH_MAX_V = 1.9;
  const TOUCH_TAU = 300;
  (function initTouchScroll() {
    const main = $('main');
    if (reduceMotion || finePointer || !main) return;
    let pos = 0, v = 0, startY = 0, startPos = 0, lastY = 0, lastT = 0, drag = false, raf = 0, last = 0;
    const maxY = () => Math.max(0, root.scrollHeight - window.innerHeight);
    const blocked = () => root.classList.contains('is-loading') || root.classList.contains('is-modal');
    const setPos = (y) => { pos = clamp(y, 0, maxY()); window.scrollTo(0, pos); };
    const stop = () => { if (raf) window.cancelAnimationFrame(raf); raf = 0; };
    const coast = (t) => {
      const dt = last ? Math.min(40, t - last) : 16.7;
      last = t;
      setPos(pos + v * dt);
      v *= Math.exp(-dt / TOUCH_TAU);
      if (Math.abs(v) < 0.02 || pos <= 0 || pos >= maxY()) { raf = 0; return; }
      raf = window.requestAnimationFrame(coast);
    };
    main.addEventListener('touchstart', (e) => {
      if (blocked() || e.touches.length !== 1) { drag = false; return; }
      stop();
      drag = true; v = 0; pos = window.scrollY;
      startY = lastY = e.touches[0].clientY; startPos = pos; lastT = performance.now();
    }, { passive: true });
    main.addEventListener('touchmove', (e) => {
      if (!drag) return;
      if (e.cancelable) e.preventDefault();
      const y = e.touches[0].clientY, t = performance.now();
      setPos(startPos + (startY - y));
      const inst = (lastY - y) / Math.max(1, t - lastT);
      v = v * 0.6 + inst * 0.4;
      lastY = y; lastT = t;
    }, { passive: false });
    const end = () => {
      if (!drag) return;
      drag = false;
      if (performance.now() - lastT > 80) v = 0;     // jari berhenti dulu sebelum dilepas = tanpa lemparan
      v = clamp(v, -TOUCH_MAX_V, TOUCH_MAX_V);
      last = 0;
      if (Math.abs(v) > 0.05) raf = window.requestAnimationFrame(coast);
    };
    main.addEventListener('touchend', end, { passive: true });
    main.addEventListener('touchcancel', end, { passive: true });
  })();

  /* =========================================================
     LOADING SCREEN
     ========================================================= */
  const loader = $('.loader');
  const loaderFill = $('.loader-fill');
  const loaderOutline = $('.loader-outline');
  function layoutLoader() {
    if (!loader || !loader.isConnected || !M.vw) return;
    [loaderFill, loaderOutline].forEach((el) => {
      el.style.fontSize = `${M.A.fs}px`;
      el.style.left = `${M.A.left0}px`;
    });
  }

  function drawEdgeLine() {
    if (!edgeLine) return;
    const t0 = performance.now(), D = reduceMotion ? 1 : 1800;
    const step = (now) => {
      const t = clamp((now - t0) / D);
      edgeDraw = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      updateOpening(current.opening);
      if (t < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  const bgMusic = $('#bg-music');
  const MUSIC_VOLUME = 0.05;
  function playMusic() {
    if (!bgMusic) return;
    bgMusic.volume = MUSIC_VOLUME;
    const pr = bgMusic.play();
    if (pr && pr.catch) pr.catch(() => {});
  }

  function startLoader() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    if (!loader) { root.classList.remove('is-loading'); root.classList.add('is-loaded'); drawEdgeLine(); return; }

    layoutLoader();

    let begun = false;
    const EVENTS = ['click', 'touchend', 'keydown'];
    const begin = (e) => {
      if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if (begun) return;
      begun = true;
      EVENTS.forEach((t) => window.removeEventListener(t, begin));
      playMusic();
      loader.classList.add('is-started');
      runLoading();
    };
    EVENTS.forEach((t) => window.addEventListener(t, begin));

    function runLoading() {
      loaderFill.style.clipPath = 'inset(88% 0 0 0)';
      const MIN = reduceMotion ? 200 : 2200;
      const t0 = performance.now();
      let ready = false;

      Promise.all([
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        new Promise((res) => (document.readyState === 'complete' ? res() : window.addEventListener('load', res, { once: true })))
      ]).then(() => { ready = true; });

      const step = (now) => {
        const t = clamp((now - t0) / MIN);
        const p = ready ? t : Math.min(t, 0.9);
        const eased = p * p * (3 - 2 * p);
        loaderFill.style.clipPath = `inset(${p >= 1 ? 0 : lerp(88, 14, eased).toFixed(2)}% 0 0 0)`;

        if (p >= 1) {
          window.setTimeout(() => {
            loader.classList.add('is-done');
            root.classList.add('is-loaded');
            drawEdgeLine();
            window.setTimeout(() => {
              root.classList.remove('is-loading');
              loader.remove();
              window.scrollTo(0, 0);
              readTargets();
              Object.assign(current, target);
              renderSceneFrame();
            }, 650);
          }, 300);
          return;
        }
        window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    }
  }

  /* =========================================================
     POPUP CV
     ========================================================= */
  const cvModal = $('#cv-modal');
  const cvFrame = $('.cv-frame');
  const cvPanel = $('.cv-panel');
  const cvCloseBtn = $('.cv-close');
  let cvLastFocus = null;

  function openCv(url) {
    if (!cvModal || !cvFrame) { window.open(url, '_blank', 'noopener'); return; }
    if (cvFrame.getAttribute('data-src') !== url) {
      cvPanel.classList.remove('is-loaded');
      cvFrame.setAttribute('data-src', url);
      cvFrame.src = url;
    }
    cvLastFocus = document.activeElement;
    cvModal.classList.add('is-open');
    cvModal.setAttribute('aria-hidden', 'false');
    root.classList.add('is-modal');
    cancelIdle();
    window.setTimeout(() => cvCloseBtn && cvCloseBtn.focus({ preventScroll: true }), 50);
  }
  function closeCv() {
    if (!cvModal) return;
    cvModal.classList.remove('is-open');
    cvModal.setAttribute('aria-hidden', 'true');
    root.classList.remove('is-modal');
    if (cvLastFocus && cvLastFocus.focus) cvLastFocus.focus({ preventScroll: true });
  }
  if (cvModal) {
    cvModal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeCv(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cvModal.classList.contains('is-open')) closeCv(); });
    cvFrame.addEventListener('load', () => cvPanel.classList.add('is-loaded'));
  }

  /* =========================================================
     INIT
     ========================================================= */
  resetProjectPreview();

  function initializeScenes() {
    measure();
    readTargets();
    Object.assign(current, target);
    renderSceneFrame();
    body.classList.add('is-ready');
  }

  initializeScenes();
  updateScrollbar();
  startLoader();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measure();
      layoutLoader();
      updateScrollbar();
      readTargets();
      Object.assign(current, target);
      renderSceneFrame();
    });
  }
})();
