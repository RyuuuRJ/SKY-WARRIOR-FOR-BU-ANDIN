"use strict";

const $ = (id) => document.getElementById(id);
const menu = $("menu");
const gameScreen = $("game");
const gameCanvas = $("game-canvas");
const ctx = gameCanvas.getContext("2d");

const state = {
  mode: "menu",
  phase: 1,
  kills: 0,
  killsNeeded: [10, 14, 20],
  score: 0,
  paused: false,
  boss: null,
  warning: false,
  transition: false,
  lastTime: 0,
  spawnTimer: 0,
  playerShotTimer: 0,
  shake: 0,
  flash: 0,
  audioEnabled: true
};

const player = {
  x: 0, y: 0, w: 42, h: 52, hp: 100, maxHp: 100,
  speed: 360, invulnerable: 0
};

let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let stars = [];
let keys = {};
let pointer = { down: false, x: 0, y: 0 };
let dpr = 1;
let canvasWidth = 0;
let canvasHeight = 0;

function loadAssetImage(filename) {
  const image = new Image();
  image.onerror = () => {
    image.onerror = null;
    image.src = `assets/images/${filename}`;
  };
  image.src = filename;
  return image;
}

const spriteSheet = loadAssetImage("ChatGPT Image Nov 18, 2026, 08_12_11 PM.png");
const fighterImage = loadAssetImage("fighter.png");
const alienImages = [
  "Alien-Scout",
  "Alien-Bomber",
  "Alien-Cruiser",
  "Alien-Destroyer",
  "Alien-Frigate",
  "Alien-HeavyCruiser",
  "Alien-Battlecruiser",
  "Alien-Battleship"
].map((name) => {
  return { name, image: loadAssetImage(`${name}.png`) };
});
const bossImage = loadAssetImage("Alien-Mothership2.png");

let audioContext = null;
let musicTimer = null;
let musicStep = 0;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  if (state.audioEnabled) startMusic();
}

function tone(frequency, duration = 0.08, volume = 0.04, type = "sine", slide = 0) {
  if (!state.audioEnabled || !audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function startMusic() {
  if (musicTimer || !state.audioEnabled) return;
  musicTimer = setInterval(() => {
    if (!state.audioEnabled || state.mode === "poem" || state.mode === "final") return;
    const notes = state.phase === 4 ? [55, 65, 73, 49] : [110, 165, 147, 196];
    tone(notes[musicStep++ % notes.length], .18, .012, "triangle");
  }, state.phase === 4 ? 280 : 420);
}

function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

function setAudio(enabled) {
  state.audioEnabled = enabled;
  document.querySelectorAll(".audio-button").forEach((button) => {
    button.textContent = enabled ? "AUDIO ON" : "AUDIO OFF";
  });
  if (enabled) {
    initAudio();
  } else {
    stopMusic();
  }
}

function resizeCanvas(canvas, context) {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w: rect.width, h: rect.height };
}

function resizeGame() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = gameCanvas.getBoundingClientRect();
  canvasWidth = rect.width;
  canvasHeight = rect.height;
  gameCanvas.width = Math.round(rect.width * dpr);
  gameCanvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!player.x) {
    player.x = canvasWidth / 2;
    player.y = canvasHeight - Math.max(70, canvasHeight * .14);
  } else {
    player.x = Math.max(player.w / 2, Math.min(canvasWidth - player.w / 2, player.x));
    player.y = Math.max(canvasHeight * .25, Math.min(canvasHeight - player.h / 2 - 12, player.y));
  }
  createStars();
}

function createStars() {
  const count = Math.min(180, Math.max(70, Math.floor(canvasWidth * canvasHeight / 8500)));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    r: Math.random() * 1.4 + .2,
    speed: Math.random() * 38 + 12,
    alpha: Math.random() * .7 + .25
  }));
}

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach((item) => item.classList.remove("active"));
  screen.classList.add("active");
}

function startGame() {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(20);
  state.mode = "game";
  state.phase = 1;
  state.kills = 0;
  state.score = 0;
  state.boss = null;
  state.transition = false;
  state.warning = false;
  state.shake = 0;
  player.hp = player.maxHp;
  bullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  showScreen(gameScreen);
  resizeGame();
  player.x = canvasWidth / 2;
  player.y = canvasHeight - Math.max(76, canvasHeight * .13);
  updateHud();
  showPhaseBanner();
  state.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function showPhaseBanner() {
  const names = [
    "",
    "AWAL PERTEMPURAN",
    "SERANGAN MUSUH",
    "GELOMBANG TERAKHIR",
    "FINAL BOSS"
  ];
  const banner = $("phase-banner");
  banner.querySelector("span").textContent = `FASE ${state.phase}`;
  banner.querySelector("strong").textContent = names[state.phase];
  banner.classList.add("active");
  setTimeout(() => banner.classList.remove("active"), 1800);
}

function updateHud() {
  $("player-hp").style.width = `${Math.max(0, player.hp)}%`;
  $("score").textContent = String(state.score).padStart(6, "0");
  $("phase-label").textContent = `FASE ${state.phase}`;
  if (state.boss) {
    $("boss-hp").style.width = `${Math.max(0, state.boss.hp / state.boss.maxHp * 100)}%`;
  }
}

function spawnEnemy() {
  if (state.transition || state.phase === 4) return;
  const scale = 1 + (state.phase - 1) * .12;
  const typeRoll = Math.random();
  const type = state.phase >= 3 && typeRoll > .72 ? "heavy"
    : state.phase >= 2 && typeRoll > .48 ? "zigzag" : "scout";
  const configs = {
    scout: { w: 34, h: 38, hp: 1, speed: 70, score: 100 },
    zigzag: { w: 38, h: 42, hp: 2, speed: 92, score: 160 },
    heavy: { w: 46, h: 48, hp: 3, speed: 56, score: 220 }
  };
  const c = configs[type];
  enemies.push({
    x: 35 + Math.random() * Math.max(20, canvasWidth - 70),
    y: -55,
    w: c.w,
    h: c.h,
    hp: c.hp,
    maxHp: c.hp,
    type,
    speed: c.speed * scale,
    score: c.score,
    age: 0,
    shotTimer: 1 + Math.random() * 2,
    sprite: alienImages[Math.floor(Math.random() * alienImages.length)]
  });
}

function spawnBoss() {
  state.phase = 4;
  state.transition = false;
  enemies = [];
  const bossMaxHp = 200;
  state.boss = {
    x: canvasWidth / 2,
    y: -130,
    w: Math.min(220, canvasWidth * .48),
    h: 150,
    hp: bossMaxHp,
    maxHp: bossMaxHp,
    age: 0,
    shotTimer: 1.2,
    entered: false,
    dead: false
  };
  $("boss-hud").classList.add("active");
  updateHud();
  showPhaseBanner();
  tone(55, .5, .08, "sawtooth", -20);
  stopMusic();
  startMusic();
  if (navigator.vibrate) navigator.vibrate([100, 80, 100]);
}

function beginBossWarning() {
  state.transition = true;
  state.warning = true;
  $("warning").classList.add("active");
  tone(82, .35, .08, "square", -25);
  state.shake = 12;
  let alarmCount = 0;
  const alarm = setInterval(() => {
    tone(82 + alarmCount * 8, .18, .055, "square");
    alarmCount++;
  }, 420);
  setTimeout(() => {
    clearInterval(alarm);
    $("warning").classList.remove("active");
    state.warning = false;
    spawnBoss();
  }, 2600);
}

function firePlayerBullet() {
  const speed = 640;
  bullets.push({ x: player.x - 13, y: player.y - 24, vx: 0, vy: -speed, w: 5, h: 18, damage: 1 });
  bullets.push({ x: player.x + 13, y: player.y - 24, vx: 0, vy: -speed, w: 5, h: 18, damage: 1 });
  tone(420, .055, .018, "square", 180);
}

function fireEnemy(enemy) {
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  enemyBullets.push({
    x: enemy.x, y: enemy.y + enemy.h * .45,
    vx: Math.cos(angle) * (180 + state.phase * 16),
    vy: Math.sin(angle) * (180 + state.phase * 16),
    r: 5
  });
}

function fireBoss() {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  const pattern = Math.floor(boss.age) % 3;
  if (pattern === 0) {
    for (let i = -3; i <= 3; i++) {
      const angle = Math.PI / 2 + i * .16;
      enemyBullets.push({ x: boss.x, y: boss.y + 55, vx: Math.cos(angle) * 230, vy: Math.sin(angle) * 230, r: 7 });
    }
  } else if (pattern === 1) {
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2 + boss.age * .5;
      enemyBullets.push({ x: boss.x, y: boss.y + 30, vx: Math.cos(angle) * 170, vy: Math.sin(angle) * 170, r: 5 });
    }
  } else {
    for (let i = -2; i <= 2; i++) {
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + i * .1;
      enemyBullets.push({ x: boss.x, y: boss.y + 55, vx: Math.cos(angle) * 280, vy: Math.sin(angle) * 280, r: 6 });
    }
  }
  tone(95, .12, .025, "sawtooth", 35);
}

function explode(x, y, count = 18, color = "#67dcff") {
  const amount = Math.min(count, 32);
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 190;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: .35 + Math.random() * .75,
      maxLife: 1,
      r: 2 + Math.random() * 5,
      color
    });
  }
  tone(62, .16, .045, "sawtooth", -35);
  state.shake = Math.max(state.shake, 5);
}

function rectHit(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) * .5 &&
    Math.abs(a.y - b.y) < (a.h + b.h) * .5;
}

function damagePlayer(amount) {
  if (player.invulnerable > 0) return;
  player.hp -= amount;
  player.invulnerable = 1;
  state.flash = .18;
  state.shake = 10;
  explode(player.x, player.y, 12, "#ff7b7b");
  tone(70, .25, .07, "square", -30);
  if (navigator.vibrate) navigator.vibrate(35);
  updateHud();
  if (player.hp <= 0) gameOver();
}

function gameOver() {
  state.mode = "gameover";
  state.transition = true;
  showPhaseBanner();
  const banner = $("phase-banner");
  banner.querySelector("span").textContent = "PESAWAT JATUH";
  banner.querySelector("strong").textContent = "COBA LAGI";
  banner.classList.add("active");
  setTimeout(() => {
    banner.classList.remove("active");
    startGame();
  }, 2200);
}

function update(dt) {
  if (state.mode !== "game") return;
  if (player.invulnerable > 0) player.invulnerable -= dt;
  if (state.shake > 0) state.shake -= dt * 18;
  if (state.flash > 0) state.flash -= dt;

  let dx = 0;
  let dy = 0;
  if (keys.KeyA || keys.ArrowLeft) dx--;
  if (keys.KeyD || keys.ArrowRight) dx++;
  if (keys.KeyW || keys.ArrowUp) dy--;
  if (keys.KeyS || keys.ArrowDown) dy++;
  if (dx && dy) { dx *= .707; dy *= .707; }
  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  if (pointer.down) {
    player.x += (pointer.x - player.x) * Math.min(1, dt * 12);
    player.y += (pointer.y - player.y) * Math.min(1, dt * 12);
  }
  player.x = Math.max(player.w * .5, Math.min(canvasWidth - player.w * .5, player.x));
  player.y = Math.max(player.h * .5, Math.min(canvasHeight - player.h * .5 - 8, player.y));

  state.playerShotTimer -= dt;
  if (state.playerShotTimer <= 0) {
    firePlayerBullet();
    state.playerShotTimer = state.phase === 4 ? .16 : .19;
  }

  if (state.phase <= 3 && !state.transition) {
    state.spawnTimer -= dt;
    const interval = Math.max(.32, 1.25 - state.phase * .24);
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = interval * (.75 + Math.random() * .5);
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < -30) bullets.splice(i, 1);
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y > canvasHeight + 30 || b.x < -30 || b.x > canvasWidth + 30) {
      enemyBullets.splice(i, 1);
      continue;
    }
    if (Math.hypot(b.x - player.x, b.y - player.y) < b.r + player.w * .28) {
      enemyBullets.splice(i, 1);
      damagePlayer(8);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.age += dt;
    e.y += e.speed * dt;
    if (e.type === "zigzag") e.x += Math.sin(e.age * 3.2) * 100 * dt;
    if (e.type === "heavy") e.x += Math.sin(e.age * 1.6) * 35 * dt;
    e.x = Math.max(e.w / 2, Math.min(canvasWidth - e.w / 2, e.x));
    e.shotTimer -= dt;
    if (e.shotTimer <= 0 && e.y > 20) {
      fireEnemy(e);
      e.shotTimer = Math.max(.8, 2.4 - state.phase * .35) * (.8 + Math.random() * .5);
    }
    if (e.y > canvasHeight + 60) enemies.splice(i, 1);
    else if (rectHit(player, e)) {
      enemies.splice(i, 1);
      explode(e.x, e.y, 16);
      damagePlayer(18);
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    let consumed = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.abs(b.x - e.x) < (b.w + e.w) * .5 && Math.abs(b.y - e.y) < (b.h + e.h) * .5) {
        bullets.splice(i, 1);
        e.hp -= b.damage;
        consumed = true;
        if (e.hp <= 0) {
          enemies.splice(j, 1);
          state.kills++;
          state.score += e.score;
          explode(e.x, e.y, e.type === "heavy" ? 26 : 18, e.type === "heavy" ? "#ffb36b" : "#67dcff");
          updateHud();
          if (state.phase <= 3 && state.kills >= state.killsNeeded[state.phase - 1]) {
            state.kills = 0;
            if (state.phase === 3) {
              beginBossWarning();
            } else {
              state.phase++;
              state.transition = true;
              showPhaseBanner();
              setTimeout(() => { state.transition = false; }, 1700);
            }
          }
        }
        break;
      }
    }
    if (consumed) continue;

    if (state.boss && !state.boss.dead) {
      const boss = state.boss;
      if (Math.abs(b.x - boss.x) < (b.w + boss.w) * .5 &&
          Math.abs(b.y - boss.y) < (b.h + boss.h) * .5) {
        bullets.splice(i, 1);
        boss.hp -= b.damage;
        if (Math.random() > .5) particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: .2, maxLife: .2, r: 3, color: "#fff" });
        updateHud();
        if (boss.hp <= 0) defeatBoss();
      }
    }
  }

  if (state.boss && !state.boss.dead) {
    const boss = state.boss;
    boss.age += dt;
    if (!boss.entered) {
      boss.y += (canvasHeight * .2 - boss.y) * Math.min(1, dt * 1.5);
      if (boss.y > canvasHeight * .17) boss.entered = true;
    } else {
      boss.x = canvasWidth / 2 + Math.sin(boss.age * .75) * canvasWidth * .28;
      boss.y = canvasHeight * .2 + Math.sin(boss.age * 1.4) * 18;
    }
    boss.shotTimer -= dt;
    if (boss.entered && boss.shotTimer <= 0) {
      fireBoss();
      boss.shotTimer = boss.hp > boss.maxHp * .5 ? 1.25 : .82;
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= .98;
    p.vy *= .98;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (const star of stars) {
    star.y += star.speed * dt * (1 + state.phase * .08);
    if (star.y > canvasHeight) {
      star.y = -2;
      star.x = Math.random() * canvasWidth;
    }
  }
}

function defeatBoss() {
  if (!state.boss || state.boss.dead) return;
  state.boss.dead = true;
  state.transition = true;
  enemyBullets = [];
  state.score += 5000;
  updateHud();
  $("boss-hud").classList.remove("active");
  stopMusic();
  const boss = state.boss;
  let explosions = 0;
  const explosionLoop = setInterval(() => {
    explode(
      boss.x + (Math.random() - .5) * boss.w * .8,
      boss.y + (Math.random() - .5) * boss.h * .7,
      28,
      explosions % 2 ? "#ffe09a" : "#ff6d76"
    );
    explosions++;
    state.flash = .12;
  }, 180);
  setTimeout(() => {
    clearInterval(explosionLoop);
    showVictory();
  }, 3000);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) ctx.globalAlpha = .35;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#43cfff";
  if (fighterImage.complete && fighterImage.naturalWidth) {
    ctx.drawImage(fighterImage, -38, -38, 76, 76);
    ctx.restore();
    return;
  }
  ctx.fillStyle = "#86e4ff";
  ctx.beginPath();
  ctx.moveTo(0, -28); ctx.lineTo(22, 18); ctx.lineTo(8, 12); ctx.lineTo(0, 24); ctx.lineTo(-8, 12); ctx.lineTo(-22, 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#263fa5";
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(12, 12); ctx.lineTo(0, 5); ctx.lineTo(-12, 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#c9f6ff";
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(6, 5); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#62a6ff";
  ctx.beginPath(); ctx.moveTo(-8, 18); ctx.lineTo(-13, 32 + Math.random() * 8); ctx.lineTo(-3, 20); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8, 18); ctx.lineTo(13, 32 + Math.random() * 8); ctx.lineTo(3, 20); ctx.fill();
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.shadowBlur = 12;
  ctx.shadowColor = e.type === "heavy" ? "#ff8a62" : "#b95cff";
  if (e.sprite && e.sprite.image.complete && e.sprite.image.naturalWidth) {
    const size = e.type === "heavy" ? 78 : e.type === "zigzag" ? 68 : 58;
    ctx.drawImage(e.sprite.image, -size / 2, -size / 2, size, size);
    ctx.restore();
    return;
  }
  if (spriteSheet.complete && spriteSheet.naturalWidth) {
    const enemySprites = {
      scout: [455, 82, 170, 150],
      zigzag: [655, 82, 170, 150],
      heavy: [855, 82, 170, 150]
    };
    if (e.type === "zigzag") enemySprites.zigzag = [455, 250, 170, 150];
    if (e.type === "heavy") enemySprites.heavy = [655, 250, 170, 150];
    const s = enemySprites[e.type];
    const size = e.type === "heavy" ? 72 : 62;
    ctx.drawImage(spriteSheet, s[0], s[1], s[2], s[3], -size / 2, -size / 2, size, size);
    ctx.restore();
    return;
  }
  ctx.fillStyle = e.type === "heavy" ? "#a54d50" : e.type === "zigzag" ? "#8c63c7" : "#934ac7";
  ctx.beginPath();
  ctx.moveTo(0, e.h / 2);
  ctx.lineTo(-e.w / 2, -e.h / 3);
  ctx.lineTo(-e.w * .18, -e.h / 2);
  ctx.lineTo(0, -e.h * .28);
  ctx.lineTo(e.w * .18, -e.h / 2);
  ctx.lineTo(e.w / 2, -e.h / 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffb1c2";
  ctx.fillRect(-4, -e.h * .22, 8, 9);
  ctx.restore();
}

function drawBoss(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.shadowBlur = 30;
  ctx.shadowColor = "#ff3d73";
  if (bossImage.complete && bossImage.naturalWidth) {
    ctx.drawImage(bossImage, -b.w * .62, -b.h * .72, b.w * 1.24, b.h * 1.44);
    ctx.restore();
    return;
  }
  if (spriteSheet.complete && spriteSheet.naturalWidth) {
    ctx.drawImage(spriteSheet, 5, 390, 650, 590, -b.w * .6, -b.h * .72, b.w * 1.2, b.h * 1.44);
    ctx.restore();
    return;
  }
  const wing = b.w * .5;
  ctx.fillStyle = "#3d375a";
  ctx.beginPath();
  ctx.moveTo(-30, -65); ctx.lineTo(-wing, 18); ctx.lineTo(-55, 48);
  ctx.lineTo(-20, 35); ctx.lineTo(0, 68); ctx.lineTo(20, 35);
  ctx.lineTo(55, 48); ctx.lineTo(wing, 18); ctx.lineTo(30, -65);
  ctx.lineTo(0, -45); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6867a0";
  ctx.beginPath(); ctx.moveTo(-48, 12); ctx.lineTo(-wing, 45); ctx.lineTo(-25, 25); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(48, 12); ctx.lineTo(wing, 45); ctx.lineTo(25, 25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#251b3b";
  ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(24, 28); ctx.lineTo(0, 48); ctx.lineTo(-24, 28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#ff4f7e";
  ctx.beginPath(); ctx.arc(0, -5, 16 + Math.sin(b.age * 5) * 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd4e2";
  ctx.beginPath(); ctx.arc(0, -5, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function render() {
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake);
  ctx.fillStyle = state.phase === 4 ? "#07030e" : state.phase === 3 ? "#09051d" : state.phase === 2 ? "#050d24" : "#06152a";
  ctx.fillRect(-20, -20, canvasWidth + 40, canvasHeight + 40);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#d8efff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (state.phase >= 2) {
    ctx.strokeStyle = state.phase === 4 ? "rgba(255,58,100,.12)" : "rgba(91,125,255,.08)";
    ctx.lineWidth = 1;
    for (let y = 0; y < canvasHeight; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y + 40);
      ctx.stroke();
    }
  }

  for (const b of bullets) {
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#78efff";
    ctx.fillStyle = "#dffcff";
    ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  }
  ctx.shadowBlur = 0;

  for (const b of enemyBullets) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff5077";
    ctx.fillStyle = "#ff718e";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of enemies) drawEnemy(e);
  if (state.boss) drawBoss(state.boss);
  drawPlayer();

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,220,220,${state.flash * 2})`;
    ctx.fillRect(-20, -20, canvasWidth + 40, canvasHeight + 40);
  }
  ctx.restore();
}

function gameLoop(time) {
  if (state.mode !== "game" && state.mode !== "gameover") return;
  const dt = Math.min(.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function showVictory() {
  state.mode = "victory";
  showScreen($("victory"));
  startAmbientCanvas("victory-canvas", "gold");
  tone(523, .8, .05, "triangle");
  setTimeout(() => tone(659, .9, .04, "triangle"), 400);
  setTimeout(() => tone(784, 1.2, .04, "triangle"), 800);
  if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 150]);
}

function showPoem() {
  state.mode = "poem";
  showScreen($("poem"));
  startAmbientCanvas("poem-canvas", "poem");
  stopMusic();
  tone(392, 1.2, .025, "sine");
}

function showFinal() {
  state.mode = "final";
  showScreen($("final"));
  startAmbientCanvas("final-canvas", "gold");
  stopMusic();
  tone(523, 1.2, .035, "sine");
  setTimeout(() => tone(659, 1.4, .03, "sine"), 650);
}

function startAmbientCanvas(id, theme) {
  const canvas = $(id);
  const context = canvas.getContext("2d");
  const size = resizeCanvas(canvas, context);
  const particlesAmbient = Array.from({ length: theme === "poem" ? 90 : 180 }, () => ({
    x: Math.random() * size.w,
    y: Math.random() * size.h,
    r: Math.random() * 2.2 + .4,
    vy: theme === "gold" ? -(12 + Math.random() * 35) : -(4 + Math.random() * 12),
    vx: (Math.random() - .5) * (theme === "gold" ? 28 : 8),
    hue: theme === "gold" ? (Math.random() > .5 ? "#ffd978" : "#fff4c8") : "#91cfff",
    alpha: Math.random() * .8 + .2
  }));
  function ambient(time) {
    if (!canvas.isConnected || !canvas.closest(".active")) return;
    context.clearRect(0, 0, size.w, size.h);
    for (const p of particlesAmbient) {
      p.x += p.vx / 60;
      p.y += p.vy / 60;
      if (p.y < -10) { p.y = size.h + 10; p.x = Math.random() * size.w; }
      if (p.x < -10) p.x = size.w + 10;
      if (p.x > size.w + 10) p.x = -10;
      context.globalAlpha = p.alpha;
      context.fillStyle = p.hue;
      context.shadowBlur = theme === "gold" ? 10 : 5;
      context.shadowColor = p.hue;
      context.beginPath();
      context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    requestAnimationFrame(ambient);
  }
  requestAnimationFrame(ambient);
}

function setupMenuCanvas() {
  const canvas = $("menu-canvas");
  const context = canvas.getContext("2d");
  let menuStars = [];
  let planets = [];

  function resizeMenu() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    menuStars = Array.from({ length: 130 }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      r: Math.random() * 1.5 + .2,
      speed: 5 + Math.random() * 18
    }));
  }

  resizeMenu();
  window.addEventListener("resize", resizeMenu);
  function draw(time) {
    if (!menu.classList.contains("active")) return;
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    for (const star of menuStars) {
      star.y += star.speed / 60;
      if (star.y > rect.height) star.y = 0;
      context.globalAlpha = .35 + Math.sin(time * .002 + star.x) * .25;
      context.fillStyle = "#c9efff";
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    const planetX = rect.width * .78;
    const planetY = rect.height * .26;
    const planetR = Math.min(rect.width, rect.height) * .09;
    const glow = context.createRadialGradient(planetX, planetY, planetR * .7, planetX, planetY, planetR * 1.7);
    glow.addColorStop(0, "rgba(139,95,255,.42)");
    glow.addColorStop(.6, "rgba(61,90,170,.12)");
    glow.addColorStop(1, "rgba(61,90,170,0)");
    context.fillStyle = glow;
    context.beginPath(); context.arc(planetX, planetY, planetR * 1.7, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#1c315c";
    context.beginPath(); context.arc(planetX, planetY, planetR, 0, Math.PI * 2); context.fill();
    context.fillStyle = "rgba(120,160,220,.25)";
    context.beginPath(); context.arc(planetX - planetR * .3, planetY - planetR * .2, planetR * .55, 0, Math.PI * 2); context.fill();

    const px = rect.width / 2;
    const py = rect.height * (.72 + Math.sin(time * .0015) * .008);
    context.save();
    context.translate(px, py);
    context.shadowBlur = 26;
    context.shadowColor = "#4edcff";
    if (fighterImage.complete && fighterImage.naturalWidth) {
      context.drawImage(fighterImage, -52, -70, 104, 104);
      context.restore();
      requestAnimationFrame(draw);
      return;
    }
    if (spriteSheet.complete && spriteSheet.naturalWidth) {
      context.drawImage(spriteSheet, 30, 100, 390, 260, -52, -70, 104, 140);
      context.restore();
      requestAnimationFrame(draw);
      return;
    }
    context.fillStyle = "#70b8e8";
    context.beginPath();
    context.moveTo(0, -42); context.lineTo(32, 24); context.lineTo(12, 18); context.lineTo(0, 31); context.lineTo(-12, 18); context.lineTo(-32, 24); context.closePath(); context.fill();
    context.fillStyle = "#182c77";
    context.beginPath(); context.moveTo(0, -31); context.lineTo(16, 16); context.lineTo(0, 8); context.lineTo(-16, 16); context.closePath(); context.fill();
    context.fillStyle = "#74fff1";
    context.beginPath(); context.moveTo(-8, 24); context.lineTo(-12, 48 + Math.sin(time * .01) * 5); context.lineTo(-2, 28); context.fill();
    context.beginPath(); context.moveTo(8, 24); context.lineTo(12, 48 + Math.sin(time * .01) * 5); context.lineTo(2, 28); context.fill();
    context.restore();
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
});
window.addEventListener("keyup", (event) => { keys[event.code] = false; });
window.addEventListener("resize", resizeGame);

gameCanvas.addEventListener("pointerdown", (event) => {
  pointer.down = true;
  const rect = gameCanvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  gameCanvas.setPointerCapture?.(event.pointerId);
  initAudio();
});
gameCanvas.addEventListener("pointermove", (event) => {
  if (!pointer.down) return;
  const rect = gameCanvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
});
gameCanvas.addEventListener("pointerup", () => { pointer.down = false; });
gameCanvas.addEventListener("pointercancel", () => { pointer.down = false; });
gameCanvas.addEventListener("contextmenu", (event) => event.preventDefault());

$("start-button").addEventListener("click", startGame);
$("continue-button").addEventListener("click", showPoem);
$("finish-button").addEventListener("click", showFinal);
$("menu-audio").addEventListener("click", () => setAudio(!state.audioEnabled));
$("game-audio").addEventListener("click", () => setAudio(!state.audioEnabled));

setupMenuCanvas();
resizeGame();
