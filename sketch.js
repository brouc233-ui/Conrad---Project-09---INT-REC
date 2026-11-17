const MYUNGJO_FONT = 'Nanum Myeongjo';
const TITLE_BAR_H = 34;
const PIXEL_STEP = 3;

const QWERTY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const TWO_TONE_BLUES = [
  { name: 'Cobalt / Azure',       dark: [14, 56, 195],  light: [75, 165, 255] },
  { name: 'Sapphire / Sky',       dark: [20, 74, 210],  light: [105, 195, 255] },
  { name: 'Ultramarine / Cyan',   dark: [28, 52, 200],  light: [95, 210, 255] },
  { name: 'Deep Royal / Glacier', dark: [12, 62, 180],  light: [135, 215, 255] },
  { name: 'Cerulean / Ice',       dark: [18, 96, 215],  light: [150, 225, 255] },
  { name: 'Indigo / Periwinkle',  dark: [34, 58, 190],  light: [125, 168, 255] },
];

const PIANO_SCALE = [
  { note: 'C5', freq: 523.25 }, { note: 'D5', freq: 587.33 }, { note: 'E5', freq: 659.25 },
  { note: 'G5', freq: 783.99 }, { note: 'A5', freq: 880.00 }, { note: 'B5', freq: 987.77 },
  { note: 'C6', freq: 1046.50 }, { note: 'D6', freq: 1174.66 }, { note: 'E6', freq: 1318.51 },
  { note: 'G6', freq: 1567.98 },
  { note: 'C4', freq: 261.63 }, { note: 'D4', freq: 293.66 }, { note: 'E4', freq: 329.63 },
  { note: 'F4', freq: 349.23 }, { note: 'G4', freq: 392.00 }, { note: 'A4', freq: 440.00 },
  { note: 'B4', freq: 493.88 }, { note: 'C5', freq: 523.25 }, { note: 'D5', freq: 587.33 },
  { note: 'C3', freq: 130.81 }, { note: 'D3', freq: 146.83 }, { note: 'E3', freq: 164.81 },
  { note: 'G3', freq: 196.00 }, { note: 'A3', freq: 220.00 }, { note: 'B3', freq: 246.94 },
  { note: 'C4', freq: 261.63 }
];

let keys = [];
let stars = [];
let bgDots = [];
let shootingStars = [];
let activeVoices = {};
let heldCodes = new Set();
let mousePressedKey = null;

let filigreeFrameGfx;
let filigreeLeftGfx;
let filigreeRightGfx;
let keyboardDeckFiligreeGfx;
let filigreePulse = 0;

let audioReady = false;
let masterFilter;
let lastMouse = { x: 0, y: 0 };
let mouseSpeed = 0;
let mouseMovedRecently = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noSmooth();
  textFont(MYUNGJO_FONT);
  textAlign(CENTER, CENTER);
  rectMode(CENTER);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      textFont(MYUNGJO_FONT);
    });
  }

  buildKeyboard();
  seedAmbientSky();
  buildProceduralFiligree();
  tryLoadUploadedImages();

  lastMouse = { x: width / 2, y: height * 0.32 };
}

function snap(v, step = PIXEL_STEP) {
  return Math.round(v / step) * step;
}

function convertImageToTwoTone(srcImg, shadowRgb, highlightRgb) {
  const g = createGraphics(srcImg.width, srcImg.height);
  g.pixelDensity(1);
  g.clear();
  srcImg.loadPixels();

  const step = max(1, Math.floor(srcImg.width / 320));
  g.noStroke();

  g.fill(shadowRgb[0], shadowRgb[1], shadowRgb[2], 220);
  for (let y = 0; y < srcImg.height; y += step) {
    for (let x = 0; x < srcImg.width; x += step) {
      const idx = (y * srcImg.width + x) * 4;
      const bright = (srcImg.pixels[idx] + srcImg.pixels[idx + 1] + srcImg.pixels[idx + 2]) / 3;
      if (bright > 115) {
        g.rect(x + 3, y + 3, step, step);
      }
    }
  }

  g.fill(highlightRgb[0], highlightRgb[1], highlightRgb[2], 245);
  for (let y = 0; y < srcImg.height; y += step) {
    for (let x = 0; x < srcImg.width; x += step) {
      const idx = (y * srcImg.width + x) * 4;
      const bright = (srcImg.pixels[idx] + srcImg.pixels[idx + 1] + srcImg.pixels[idx + 2]) / 3;
      if (bright > 115) {
        g.rect(x, y, step, step);
      }
    }
  }
  return g;
}

function tryLoadUploadedImages() {
  loadImage(
    'scroll1.jpg',
    (img) => { filigreeLeftGfx = convertImageToTwoTone(img, [14, 58, 195], [220, 240, 255]); },
    () => {}
  );
  loadImage(
    'scroll2.jpg',
    (img) => { filigreeRightGfx = convertImageToTwoTone(img, [14, 58, 195], [220, 240, 255]); },
    () => {}
  );
  loadImage(
    'scroll3.jpg',
    (img) => { filigreeFrameGfx = convertImageToTwoTone(img, [12, 48, 175], [235, 245, 255]); },
    () => {}
  );
}

function buildProceduralFiligree() {
  const skyH = Math.max(180, Math.floor(height * 0.61 - TITLE_BAR_H));

  filigreeFrameGfx = createGraphics(width, skyH);
  filigreeFrameGfx.noStroke();
  drawTwoToneDamaskFrame(filigreeFrameGfx, width, skyH);

  const sideW = Math.floor(min(width * 0.28, 320));
  filigreeLeftGfx = createGraphics(sideW, skyH);
  filigreeLeftGfx.noStroke();
  drawTwoToneSideScroll(filigreeLeftGfx, sideW, skyH, 1);

  filigreeRightGfx = createGraphics(sideW, skyH);
  filigreeRightGfx.noStroke();
  drawTwoToneSideScroll(filigreeRightGfx, sideW, skyH, -1);

  const deckH = Math.max(160, Math.floor(height * 0.39));
  keyboardDeckFiligreeGfx = createGraphics(width, deckH);
  keyboardDeckFiligreeGfx.noStroke();
  drawKeyboardDeckFlourishes(keyboardDeckFiligreeGfx, width, deckH);
}

function drawTwoToneDotCluster(g, x, y, dotSize) {
  const gx = Math.round(x / 4) * 4;
  const gy = Math.round(y / 4) * 4;
  g.fill(16, 62, 195, 215);
  g.rect(gx + 3, gy + 3, dotSize, dotSize);
  g.fill(235, 244, 255, 240);
  g.rect(gx, gy, dotSize, dotSize);
}

function drawTwoToneDamaskFrame(g, w, h) {
  for (const dir of [-1, 1]) {
    const baseX = w * 0.5 + dir * min(w * 0.15, 160);
    for (let t = 0; t <= 1; t += 0.008) {
      const y = t * h;
      const wave = sin(t * TWO_PI * 1.4) * 28 * dir;
      drawTwoToneDotCluster(g, baseX + wave, y, 3);
      if (sin(t * PI * 6) > 0.35) {
        drawTwoToneDotCluster(g, baseX + wave + dir * 7, y + 3, 2.5);
      }
      if (Math.abs((t * 4) % 1 - 0.5) < 0.02) {
        for (let a = 0; a < PI * 2.1; a += 0.25) {
          const rad = 24 * (1 - a / (PI * 2.4));
          drawTwoToneDotCluster(
            g,
            baseX + wave + dir * (18 + cos(a) * rad),
            y + sin(a) * rad,
            2.5
          );
        }
      }
    }

    for (const cy of [h * 0.16, h * 0.84]) {
      const cx = dir === -1 ? min(w * 0.11, 115) : w - min(w * 0.11, 115);
      for (let a = 0; a < PI * 2.4; a += 0.14) {
        const rad = 52 * (1 - a / (PI * 2.8));
        drawTwoToneDotCluster(g, cx + dir * cos(a) * rad, cy + sin(a) * rad * 0.85, 3);
        drawTwoToneDotCluster(g, cx + dir * cos(a + 0.3) * (rad * 0.72), cy + sin(a + 0.3) * (rad * 0.6), 2.5);
      }
    }
  }
}

function drawTwoToneSideScroll(g, w, h, dir) {
  const cx = dir === 1 ? w * 0.45 : w * 0.55;
  for (let t = 0; t <= 1; t += 0.009) {
    const y = h * 0.08 + t * h * 0.84;
    const x = cx + sin(t * PI * 2.2) * (w * 0.26) * dir;
    drawTwoToneDotCluster(g, x, y, 3);
    drawTwoToneDotCluster(g, x + dir * 6, y + 4, 2.5);

    if (Math.abs((t * 3) % 1 - 0.35) < 0.025) {
      for (let a = 0; a < PI * 2.3; a += 0.22) {
        const r = 34 * (1 - a / (PI * 2.6));
        drawTwoToneDotCluster(g, x - dir * cos(a) * r, y + sin(a) * r, 2.5);
      }
    }
  }
}

function drawKeyboardDeckFlourishes(g, w, h) {
  function whiteDot(x, y, sz = 2.5, alpha = 155) {
    const gx = Math.round(x / 3) * 3;
    const gy = Math.round(y / 3) * 3;
    g.fill(255, 255, 255, alpha);
    g.rect(gx, gy, sz, sz);
  }

  for (const dir of [-1, 1]) {
    const edgeX = dir === -1 ? 26 : w - 26;
    for (let t = 0; t <= 1; t += 0.015) {
      const y = h * 0.12 + t * h * 0.76;
      const x = edgeX - dir * sin(t * PI * 2) * 16;
      whiteDot(x, y, 2.5, 145);
      if (Math.abs((t * 2) % 1 - 0.5) < 0.03) {
        for (let a = 0; a < PI * 2; a += 0.28) {
          const r = 18 * (1 - a / (PI * 2.3));
          whiteDot(x - dir * cos(a) * r, y + sin(a) * r, 2, 130);
        }
      }
    }

    const wingStartX = w * 0.5 + dir * min(w * 0.22, 235);
    const wingY = h * 0.84;
    for (let t = 0; t <= 1; t += 0.025) {
      const wx = wingStartX + dir * t * min(w * 0.14, 130);
      const wy = wingY + sin(t * TWO_PI) * 10;
      whiteDot(wx, wy, 2.5, 165);
    }
    for (let a = 0; a < PI * 2.1; a += 0.25) {
      const r = 16 * (1 - a / (PI * 2.4));
      whiteDot(wingStartX + dir * 16 + dir * cos(a) * r, wingY + sin(a) * r * 0.8, 2, 150);
    }
  }
}

function generateKeycapFlourishPoints(variant, w, h) {
  const pts = [];
  const rx = w * 0.34;
  const ry = h * 0.32;
  const step = 2;

  function addPt(x, y) {
    pts.push({
      x: Math.round(x / step) * step,
      y: Math.round(y / step) * step,
    });
  }

  if (variant === 0) {
    for (let a = -0.3; a < PI * 1.45; a += 0.26) {
      const r = min(rx, ry) * 0.72 * (1 - a / (PI * 2.1));
      addPt(-rx * 0.52 + cos(a) * r, -ry * 0.1 + sin(a) * r);
      addPt(rx * 0.52 - cos(a) * r, ry * 0.1 - sin(a) * r);
    }
  } else if (variant === 1) {
    for (let t = 0; t <= 1; t += 0.05) {
      const seg = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const dir = t < 0.5 ? 1 : -1;
      const a = dir * seg * PI * 1.75;
      const r = min(rx, ry) * 0.55 * (1 - seg * 0.6);
      const cx = t < 0.5 ? -rx * 0.38 : rx * 0.38;
      addPt(cx + cos(a) * r, sin(a) * r * 0.85);
    }
  } else if (variant === 2) {
    for (let t = 0; t <= 1; t += 0.055) {
      const x = lerp(-rx * 0.85, rx * 0.85, t);
      const y = -cos(t * PI * 2) * ry * 0.42;
      addPt(x, y);
    }
    for (let a = 0; a < PI * 1.8; a += 0.32) {
      const r = min(rx, ry) * 0.38 * (1 - a / (PI * 2.2));
      addPt(-rx * 0.55 + cos(a) * r, ry * 0.35 + sin(a) * r);
      addPt(rx * 0.55 - cos(a) * r, ry * 0.35 + sin(a) * r);
    }
  } else {
    for (let t = 0; t <= 1; t += 0.045) {
      const a = t * PI * 2.2;
      const r = min(rx, ry) * 0.72 * t;
      addPt(cos(a) * r * 1.15, sin(a) * r * 0.85);
      addPt(cos(a + PI) * r * 1.15, sin(a + PI) * r * 0.85);
    }
  }

  return pts;
}

function seedAmbientSky() {
  bgDots = [];
  for (let i = 0; i < 55; i++) {
    const pair = random(TWO_TONE_BLUES);
    bgDots.push({
      x: snap(random(width)),
      y: snap(random(TITLE_BAR_H + 14, height * 0.58)),
      r: random() > 0.5 ? 3 : 6,
      colors: pair,
    });
  }
}

function buildKeyboard() {
  keys = [];
  const kbTop = height * 0.64;
  const kbHeight = height * 0.33;
  const rowH = kbHeight / 4.2;
  const maxCols = 10;
  const keyW = min((width * 0.86) / maxCols, 74);
  const keyH = min(rowH * 0.84, 58);
  const gapX = keyW * 0.14;
  const gapY = rowH * 0.16;
  const rowStagger = [0, keyW * 0.28, keyW * 0.72];

  let idx = 0;
  for (let r = 0; r < QWERTY_ROWS.length; r++) {
    const row = QWERTY_ROWS[r];
    const totalW = row.length * keyW + (row.length - 1) * gapX;
    const startX = (width - totalW) / 2 + keyW / 2 + rowStagger[r] * 0.25;
    const y = kbTop + r * (keyH + gapY) + keyH / 2;

    for (let c = 0; c < row.length; c++) {
      const letter = row[c];
      const colors = TWO_TONE_BLUES[(idx * 3 + r) % TWO_TONE_BLUES.length];
      const piano = PIANO_SCALE[idx % PIANO_SCALE.length];

      keys.push({
        letter: letter,
        code: letter.charCodeAt(0),
        row: r,
        col: c,
        x: startX + c * (keyW + gapX),
        y: y,
        w: keyW,
        h: keyH,
        colors: colors,
        noteName: piano.note,
        freq: piano.freq,
        pressAnim: 0,
        lastStar: null,
        flourishPts: generateKeycapFlourishPoints((idx + r) % 4, keyW, keyH),
      });
      idx++;
    }
  }

  const spaceY = kbTop + 3 * (keyH + gapY) + keyH * 0.45;
  const spaceW = keyW * 5.6;
  const spaceH = keyH * 0.7;
  keys.push({
    letter: ' ',
    code: 32,
    row: 3,
    col: 0,
    x: width / 2,
    y: spaceY,
    w: spaceW,
    h: spaceH,
    colors: TWO_TONE_BLUES[0],
    noteName: 'CLEAR',
    freq: 0,
    pressAnim: 0,
    lastStar: null,
    flourishPts: generateKeycapFlourishPoints(2, spaceW * 0.65, spaceH),
  });
}

function initAudio() {
  if (audioReady) return;
  userStartAudio();
  if (typeof p5.LowPass !== 'undefined') {
    masterFilter = new p5.LowPass();
    masterFilter.freq(2600);
    masterFilter.res(1.2);
  }
  audioReady = true;
}

function playPianoNote(k) {
  if (!audioReady || k.freq === 0 || typeof p5.Oscillator === 'undefined') return;
  stopPianoNote(k.code);

  const fundamental = new p5.Oscillator('triangle');
  const overtone2 = new p5.Oscillator('sine');
  const overtone3 = new p5.Oscillator('sine');

  fundamental.freq(k.freq);
  overtone2.freq(k.freq * 2);
  overtone3.freq(k.freq * 3);

  if (masterFilter) {
    [fundamental, overtone2, overtone3].forEach((osc) => {
      osc.disconnect();
      osc.connect(masterFilter);
    });
  }

  fundamental.start();
  overtone2.start();
  overtone3.start();

  const vel = constrain(0.22 + mouseSpeed * 0.004, 0.2, 0.36);
  fundamental.amp(0);
  overtone2.amp(0);
  overtone3.amp(0);

  fundamental.amp(vel, 0.012);
  overtone2.amp(vel * 0.32, 0.01);
  overtone3.amp(vel * 0.1, 0.008);

  overtone2.amp(vel * 0.05, 0.45, 0.02);
  overtone3.amp(0, 0.2, 0.015);
  fundamental.amp(vel * 0.45, 0.9, 0.03);

  activeVoices[k.code] = { fundamental, overtone2, overtone3 };
}

function stopPianoNote(code) {
  const voice = activeVoices[code];
  if (!voice) return;

  voice.fundamental.amp(0, 0.45);
  voice.overtone2.amp(0, 0.25);
  voice.overtone3.amp(0, 0.15);

  setTimeout(() => {
    try {
      voice.fundamental.stop();
      voice.overtone2.stop();
      voice.overtone3.stop();
    } catch (e) {}
  }, 520);

  delete activeVoices[code];
}

function spawnStarForKey(k) {
  const skyTopY = TITLE_BAR_H + 46;
  const skyLimitY = height * 0.56;
  const keySkyX = map(k.col, 0, 9, width * 0.12, width * 0.88);
  const keySkyY = map(k.row, 0, 2, skyTopY + 14, skyLimitY - 36);

  let targetX = keySkyX;
  let targetY = keySkyY;
  if (mouseMovedRecently > 0 && mouseY > TITLE_BAR_H && mouseY < skyLimitY) {
    targetX = lerp(keySkyX, mouseX, 0.72);
    targetY = lerp(keySkyY, mouseY, 0.72);
  }

  const sx = snap(constrain(targetX + random(-34, 34), 34, width - 34));
  const sy = snap(constrain(targetY + random(-24, 24), skyTopY, skyLimitY));
  const baseRadius = random(8, 12) + constrain(mouseSpeed * 0.14, 0, 7);

  const newStar = {
    x: sx,
    y: sy,
    r: baseRadius,
    targetR: baseRadius,
    colors: k.colors,
    keyCode: k.code,
    phase: random(TWO_PI),
    ripple: 1,
  };

  stars.push(newStar);
  k.lastStar = newStar;
  filigreePulse = 1;

  if (stars.length > 90) {
    stars.shift();
  }
}

function triggerKey(k) {
  initAudio();
  k.pressAnim = 1;

  if (k.letter === ' ') {
    stars = [];
    shootingStars = [];
    seedAmbientSky();
    console.log('[Keyboard] Key: SPACE | Cleared the night sky');
    return;
  }

  playPianoNote(k);
  spawnStarForKey(k);
  console.log(
    `[Keyboard] Key: ${k.letter} | Piano Note: ${k.noteName} (${k.freq} Hz) | Star Tone: ${k.colors.name}`
  );
}

function findKey(code) {
  return keys.find((k) => k.code === code);
}

function keyPressed() {
  const k = findKey(keyCode);
  if (k) {
    if (!heldCodes.has(k.code)) {
      heldCodes.add(k.code);
      triggerKey(k);
    }
    return false;
  }
}

function keyReleased() {
  const k = findKey(keyCode);
  if (k) {
    heldCodes.delete(k.code);
    stopPianoNote(k.code);
    return false;
  }
}

function mouseMoved() {
  mouseMovedRecently = 140;
}

function mousePressed() {
  initAudio();
  for (const k of keys) {
    if (
      mouseX >= k.x - k.w / 2 &&
      mouseX <= k.x + k.w / 2 &&
      mouseY >= k.y - k.h / 2 &&
      mouseY <= k.y + k.h / 2
    ) {
      mousePressedKey = k;
      heldCodes.add(k.code);
      triggerKey(k);
      return;
    }
  }

  if (mouseY > TITLE_BAR_H && mouseY < height * 0.6) {
    const col = random(TWO_TONE_BLUES);
    shootingStars.push({
      x: snap(mouseX),
      y: snap(mouseY),
      vx: random(5, 9) * (mouseX > width / 2 ? -1 : 1),
      vy: random(1.5, 4),
      life: 1,
      colors: col,
    });
    console.log(`[Sky Click] Pixel Shooting Star (${col.name}) at (${Math.round(mouseX)}, ${Math.round(mouseY)})`);
  }
}

function mouseReleased() {
  if (mousePressedKey) {
    heldCodes.delete(mousePressedKey.code);
    stopPianoNote(mousePressedKey.code);
    mousePressedKey = null;
  }
}

function drawPixelatedStar(cx, cy, radius, colorPair, phase = 0, boost = 0, step = PIXEL_STEP) {
  noStroke();
  const r = radius * (1 + boost * 0.35);
  const [dr, dg, db] = colorPair.dark;
  const [lr, lg, lb] = colorPair.light;

  const scx = snap(cx, step);
  const scy = snap(cy, step);

  const ox = snap(cos(frameCount * 0.03 + phase) * (r * 0.16), step);
  const oy = snap(sin(frameCount * 0.03 + phase) * (r * 0.16), step);

  const rOuter = r * 1.55;
  const rMid = r * 0.98;
  const rCore = r * 0.48;
  const bound = Math.ceil((rOuter + Math.abs(ox) + step) / step) * step;

  const c1x = scx - ox;
  const c1y = scy - oy;
  for (let dy = -bound; dy <= bound; dy += step) {
    for (let dx = -bound; dx <= bound; dx += step) {
      const px = scx + dx;
      const py = scy + dy;
      const d1 = dist(px, py, c1x, c1y);
      if (d1 <= rOuter) {
        const isRim = d1 > rOuter - step * 1.15;
        fill(dr, dg, db, isRim ? 165 : 75 + boost * 25);
        rect(px, py, step, step);
      }
    }
  }

  const c2x = scx + ox;
  const c2y = scy + oy;
  const midBound = Math.ceil((rMid + step) / step) * step;
  for (let dy = -midBound; dy <= midBound; dy += step) {
    for (let dx = -midBound; dx <= midBound; dx += step) {
      const px = c2x + dx;
      const py = c2y + dy;
      const d2 = dist(px, py, c2x, c2y);
      if (d2 <= rMid) {
        const isRim = d2 > rMid - step * 1.15;
        fill(lr, lg, lb, isRim ? 205 : 115 + boost * 30);
        rect(px, py, step, step);
      }
    }
  }

  const coreBound = Math.ceil((rCore + step) / step) * step;
  for (let dy = -coreBound; dy <= coreBound; dy += step) {
    for (let dx = -coreBound; dx <= coreBound; dx += step) {
      const d3 = Math.hypot(dx, dy);
      if (d3 <= rCore) {
        if (dx + dy > rCore * 0.42) {
          fill(lr, lg, lb, 240);
        } else {
          fill(255, 255, 255, 255);
        }
        rect(scx + dx, scy + dy, step, step);
      }
    }
  }
}

function draw() {
  mouseSpeed = dist(mouseX, mouseY, lastMouse.x, lastMouse.y);
  lastMouse = { x: mouseX, y: mouseY };
  if (mouseMovedRecently > 0) mouseMovedRecently--;
  filigreePulse *= 0.92;

  if (audioReady && masterFilter) {
    masterFilter.freq(map(mouseX, 0, width, 900, 4200, true));
  }

  background(0);
  noStroke();
  fill(6, 13, 32);
  rect(width / 2, height * 0.53, width, height * 0.16);
  fill(11, 24, 58);
  rect(width / 2, height * 0.585, width, height * 0.05);

  const filAlpha = 140 + filigreePulse * 115;
  tint(255, filAlpha);
  if (filigreeFrameGfx) {
    image(filigreeFrameGfx, 0, TITLE_BAR_H, width, height * 0.61 - TITLE_BAR_H);
  }
  if (filigreeLeftGfx) {
    image(filigreeLeftGfx, 0, TITLE_BAR_H, filigreeLeftGfx.width, height * 0.61 - TITLE_BAR_H);
  }
  if (filigreeRightGfx) {
    image(filigreeRightGfx, width - filigreeRightGfx.width, TITLE_BAR_H, filigreeRightGfx.width, height * 0.61 - TITLE_BAR_H);
  }
  noTint();

  for (const d of bgDots) {
    const [lr, lg, lb] = d.colors.light;
    fill(lr, lg, lb, 135);
    rect(d.x + PIXEL_STEP, d.y + PIXEL_STEP, d.r, d.r);
    fill(255, 255, 255, 225);
    rect(d.x, d.y, d.r, d.r);
  }

  const currentlyHeldKeys = [];
  for (const k of keys) {
    const isDown = keyIsDown(k.code) || mousePressedKey === k;
    if (isDown) {
      k.pressAnim = lerp(k.pressAnim, 1, 0.35);
      currentlyHeldKeys.push(k);
      if (k.lastStar) {
        k.lastStar.targetR = min(k.lastStar.targetR + 0.25, 20);
      }
    } else {
      k.pressAnim = lerp(k.pressAnim, 0, 0.18);
    }
  }

  if (currentlyHeldKeys.length >= 2) {
    const heldStars = currentlyHeldKeys.map((k) => k.lastStar).filter((s) => s !== null);
    for (let i = 0; i < heldStars.length - 1; i++) {
      const a = heldStars[i];
      const b = heldStars[i + 1];
      drawPixelatedLine(a.x, a.y, b.x, b.y);
    }
  }

  for (const s of stars) {
    s.r = lerp(s.r, s.targetR, 0.16);
    const isHeldStar = heldCodes.has(s.keyCode);

    if (s.ripple > 0.05) {
      const ringR = s.r * (1.5 + (1 - s.ripple) * 2.2);
      fill(s.colors.light[0], s.colors.light[1], s.colors.light[2], s.ripple * 190);
      for (let a = 0; a < TWO_PI; a += 0.22) {
        rect(snap(s.x + cos(a) * ringR), snap(s.y + sin(a) * ringR), PIXEL_STEP, PIXEL_STEP);
      }
      s.ripple *= 0.9;
    }

    drawPixelatedStar(s.x, s.y, s.r, s.colors, s.phase, isHeldStar ? 0.35 : 0, PIXEL_STEP);
  }

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const ss = shootingStars[i];
    ss.x += ss.vx;
    ss.y += ss.vy;
    ss.life -= 0.024;
    if (ss.life <= 0) {
      shootingStars.splice(i, 1);
      continue;
    }
    const [lr, lg, lb] = ss.colors.light;
    for (let t = 0; t <= 1; t += 0.1) {
      const tx = snap(ss.x - ss.vx * 6 * t);
      const ty = snap(ss.y - ss.vy * 6 * t);
      fill(lr, lg, lb, ss.life * (1 - t) * 180);
      rect(tx + PIXEL_STEP, ty + PIXEL_STEP, PIXEL_STEP * 1.5, PIXEL_STEP * 1.5);
      fill(255, 255, 255, ss.life * (1 - t) * 240);
      rect(tx, ty, PIXEL_STEP, PIXEL_STEP);
    }
    drawPixelatedStar(ss.x, ss.y, 5.5 * ss.life, ss.colors, 0, 0.15, PIXEL_STEP);
  }

  if (mouseY > TITLE_BAR_H && mouseY < height * 0.6) {
    drawPixelatedStar(mouseX, mouseY, 4.5 + constrain(mouseSpeed * 0.05, 0, 3.5), TWO_TONE_BLUES[1], 0, 0, PIXEL_STEP);
  }

  drawFlatKeyboardDeck();
  drawInstructions();
  drawTitleBar();
}

function drawPixelatedLine(x1, y1, x2, y2) {
  const steps = Math.max(1, Math.floor(dist(x1, y1, x2, y2) / PIXEL_STEP));
  noStroke();
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = snap(lerp(x1, x2, t));
    const py = snap(lerp(y1, y2, t));
    fill(70, 165, 255, 115);
    rect(px, py, PIXEL_STEP * 2.5, PIXEL_STEP * 2.5);
    fill(255, 255, 255, 240);
    rect(px, py, PIXEL_STEP, PIXEL_STEP);
  }
}

function drawFlatKeyboardDeck() {
  const deckTop = height * 0.61;
  const deckH = height - deckTop;

  noStroke();
  fill(0);
  rect(width / 2, deckTop + deckH / 2, width, deckH);

  stroke(26, 68, 175);
  strokeWeight(2);
  line(0, deckTop, width, deckTop);
  stroke(255);
  strokeWeight(1);
  line(0, deckTop + 3, width, deckTop + 3);

  if (keyboardDeckFiligreeGfx) {
    tint(255, 185 + filigreePulse * 70);
    image(keyboardDeckFiligreeGfx, 0, deckTop, width, deckH);
    noTint();
  }

  const activeKeys = keys.filter((k) => heldCodes.has(k.code));
  if (activeKeys.length >= 2) {
    for (let i = 0; i < activeKeys.length - 1; i++) {
      drawPixelatedLine(activeKeys[i].x, activeKeys[i].y, activeKeys[i + 1].x, activeKeys[i + 1].y);
    }
  }

  for (const k of keys) {
    const pressed = k.pressAnim > 0.2;
    const ky = k.y + k.pressAnim * 2;
    const [dr, dg, db] = k.colors.dark;
    const [lr, lg, lb] = k.colors.light;

    noStroke();
    fill(pressed ? 255 : color(18, 42, 108));
    rect(k.x + 2.5, ky + 2.5, k.w, k.h, 3);

    fill(pressed ? color(dr, dg, db) : color(8, 13, 26));
    stroke(pressed ? 255 : color(65, 105, 175));
    strokeWeight(1.2);
    rect(k.x, ky, k.w, k.h, 3);

    noStroke();
    fill(255, 255, 255, pressed ? 150 : 44);
    for (const pt of k.flourishPts) {
      rect(k.x + pt.x, ky + pt.y, 2, 2);
    }

    if (k.letter === ' ') {
      fill(255);
      textFont(MYUNGJO_FONT);
      textSize(11);
      text('SPACEBAR  —  CLEAR NIGHT SKY', k.x, ky);
    } else {
      drawPixelatedStar(k.x, ky - 2, min(k.w, k.h) * 0.11, k.colors, k.col * 0.5, k.pressAnim * 0.3, 2);

      noStroke();
      textFont(MYUNGJO_FONT);
      textSize(12);
      fill(255);
      text(k.letter, k.x - k.w / 2 + 10, ky - k.h / 2 + 10);

      textSize(9);
      fill(pressed ? 255 : color(lr, lg, lb));
      text(k.noteName, k.x, ky + k.h / 2 - 8);
    }
  }
}

function drawInstructions() {
  noStroke();
  textFont(MYUNGJO_FONT);
  textSize(12);
  textAlign(LEFT, TOP);

  fill(16, 62, 195);
  text('TYPE OR CLICK QWERTY KEYS: play piano notes & add pixelated 3-layer stars', 21, TITLE_BAR_H + 13);
  fill(255);
  text('TYPE OR CLICK QWERTY KEYS: play piano notes & add pixelated 3-layer stars', 20, TITLE_BAR_H + 12);

  fill(120, 195, 255);
  text('HOLD KEY: expand star  ·  2+ KEYS AT ONCE: constellation line  ·  SPACE: clear sky', 20, TITLE_BAR_H + 29);
  textAlign(CENTER, CENTER);
}

function drawTitleBar() {
  noStroke();
  fill(6, 11, 24);
  rect(width / 2, TITLE_BAR_H / 2, width, TITLE_BAR_H);

  stroke(22, 68, 195);
  strokeWeight(2);
  line(0, TITLE_BAR_H - 1, width, TITLE_BAR_H - 1);
  stroke(255);
  strokeWeight(1);
  line(0, TITLE_BAR_H + 1, width, TITLE_BAR_H + 1);

  noStroke();
  fill(255, 255, 255, 200);
  for (const dir of [-1, 1]) {
    const startX = dir === -1 ? 18 : width - 18;
    for (let i = 0; i < 5; i++) {
      rect(startX - dir * i * 6, TITLE_BAR_H / 2 + (i % 2 === 0 ? -3 : 3), 2.5, 2.5);
    }
  }

  fill(255);
  textFont(MYUNGJO_FONT);
  textSize(13);
  textAlign(CENTER, CENTER);
  text('Conrad Brousseau / Core 1: Interactions / Project 09', width / 2, TITLE_BAR_H / 2);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildKeyboard();
  seedAmbientSky();
  buildProceduralFiligree();
  tryLoadUploadedImages();
}