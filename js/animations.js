/* ============================================================
   INSIDE THINGS — animations.js
   Scene-specific animations: Crowd Canvas, Risk Meter, Game
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════
   SCENE 2 — Crowd Canvas (1000 dots)
   ══════════════════════════════════════════ */

let crowdAnimFrame = null;
let crowdDots = [];

function buildCrowdDots(accidentCount) {
  crowdDots = [];
  const total = 1000;
  const you   = Math.floor(Math.random() * total);

  for (let i = 0; i < total; i++) {
    crowdDots.push({
      isAccident: i < accidentCount,
      isYou: i === you,
      x: 0, y: 0,
      targetX: 0, targetY: 0,
      currentX: 0, currentY: 0,
      size: i === you ? 6 : 3.5,
      opacity: 0,
      delay: Math.random() * 800,
    });
  }
}

function layoutCrowdDots(canvas) {
  const cols = 40;
  const rows = Math.ceil(crowdDots.length / cols);
  const padX = 20, padY = 15;
  const cellW = (canvas.width - padX * 2) / cols;
  const cellH = (canvas.height - padY * 2) / rows;

  crowdDots.forEach((dot, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    dot.targetX = padX + col * cellW + cellW / 2;
    dot.targetY = padY + row * cellH + cellH / 2;
    dot.currentX = canvas.width / 2 + (Math.random() - 0.5) * 200;
    dot.currentY = canvas.height + 40;
    dot.x = dot.currentX;
    dot.y = dot.currentY;
  });
}

function drawCrowd(canvas, ctx, startTime) {
  const now = performance.now() - startTime;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let allSettled = true;

  crowdDots.forEach(dot => {
    if (now < dot.delay) { allSettled = false; return; }

    const t = Math.min((now - dot.delay) / 900, 1);
    const ease = 1 - Math.pow(1 - t, 3);

    dot.x = dot.currentX + (dot.targetX - dot.currentX) * ease;
    dot.y = dot.currentY + (dot.targetY - dot.currentY) * ease;
    dot.opacity = Math.min(t * 1.5, 1);

    if (t < 1) allSettled = false;

    ctx.save();
    ctx.globalAlpha = dot.opacity;

    if (dot.isYou) {
      // You — golden, glowing
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = '#fbbf24';
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (dot.isAccident) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#6366f1';
      ctx.globalAlpha = dot.opacity * 0.7;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  if (!allSettled) {
    crowdAnimFrame = requestAnimationFrame(() => drawCrowd(canvas, ctx, startTime));
  } else {
    // Show math steps
    revealMathSteps();
  }
}

function initScene2() {
  if (crowdAnimFrame) cancelAnimationFrame(crowdAnimFrame);

  const canvas = document.getElementById('crowd-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Scale for retina
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const accidents = calcAccidents();
  document.getElementById('legend-accident-count').textContent = accidents;
  document.getElementById('legend-safe-count').textContent     = 1000 - accidents;

  // Math labels
  const total = Math.round(accidents * 8500 / 1000) * 1000;
  document.getElementById('math-accidents').textContent = accidents;
  document.getElementById('math-total').textContent     = total.toLocaleString();
  document.getElementById('math-base').textContent      = Math.round(total / 12 / 1000 * 10) / 10;

  buildCrowdDots(accidents);
  layoutCrowdDots({ width: canvas.width / dpr, height: canvas.height / dpr });

  // Reset math steps
  document.querySelectorAll('.math-step').forEach(s => s.classList.remove('visible'));

  const startTime = performance.now();
  crowdAnimFrame = requestAnimationFrame(() => drawCrowd(canvas, ctx, startTime));
}

function revealMathSteps() {
  const steps = document.querySelectorAll('.math-step');
  steps.forEach((step, i) => {
    setTimeout(() => step.classList.add('visible'), i * 300);
  });
}

/* ══════════════════════════════════════════
   SCENE 3 — Risk Meter
   ══════════════════════════════════════════ */

function updateScene3Data() {
  const score = calcRiskScore();

  // Clamp 0–100
  const clamped = Math.min(score, 100);

  // Needle angle: -90° (low) → +90° (high)
  const angle = -90 + (clamped / 100) * 180;
  const needle = document.getElementById('meter-needle');
  if (needle) {
    needle.setAttribute('transform', `rotate(${angle}, 110, 110)`);
  }

  // Meter fill dash offset: 283 = half-circle arc length, 0=full, 283=empty
  const fill = document.getElementById('meter-fill');
  if (fill) {
    const dashOffset = 283 - (clamped / 100) * 283;
    fill.style.strokeDashoffset = dashOffset;
  }

  // Score number
  const scoreEl = document.getElementById('risk-score-num');
  if (scoreEl) animateNum(scoreEl, clamped);

  // Color
  if (scoreEl) {
    scoreEl.style.color = clamped < 35 ? '#22c55e' : clamped < 65 ? '#f59e0b' : '#ef4444';
  }

  // Factor bars
  const agePoints   = RISK_TABLE.age[state.age];
  const carPoints   = RISK_TABLE.car[state.car];
  const recPoints   = RISK_TABLE.record[state.record];

  setFactorBar('age',    agePoints,  50, PRICE_TABLE.age[state.age]);
  setFactorBar('car',    carPoints,  50, PRICE_TABLE.car[state.car]);
  setFactorBar('record', recPoints,  70, PRICE_TABLE.record[state.record]);
}

function setFactorBar(key, points, max, priceAdd) {
  const pct  = Math.min((points / max) * 100, 100);
  const fill = document.getElementById(`fb-${key}`);
  const val  = document.getElementById(`fv-${key}`);
  const imp  = document.getElementById(`fi-${key}`);

  if (!fill || !val || !imp) return;

  fill.style.width = pct + '%';
  val.textContent  = `+${points} points (+$${priceAdd}/mo)`;

  if (points === 0) {
    fill.style.background = '#22c55e';
    imp.textContent = 'No Impact';
    imp.className   = 'factor-impact positive';
  } else if (points < 20) {
    fill.style.background = '#f59e0b';
    imp.textContent = 'Moderate';
    imp.className   = 'factor-impact neutral';
  } else if (points < 40) {
    fill.style.background = '#f97316';
    imp.textContent = 'High Impact';
    imp.className   = 'factor-impact negative';
  } else {
    fill.style.background = '#ef4444';
    imp.textContent = 'Very High';
    imp.className   = 'factor-impact negative';
  }
}

function initScene3() {
  updateScene3Data();
}

/* ══════════════════════════════════════════
   SCENE 5 — The Game
   ══════════════════════════════════════════ */

function initScene5() {
  // Reset game to current profile price
  const basePrice = calcPrice();
  state.gamePrice = basePrice;
  state.startPrice = basePrice;
  state.appliedMoves.clear();

  // Reset UI
  document.getElementById('game-start-price').textContent = basePrice;
  document.getElementById('won-start').textContent = basePrice;
  document.querySelectorAll('.move-btn').forEach(btn => {
    btn.disabled = false;
    btn.textContent = 'Apply';
    btn.classList.remove('applied-btn');
  });
  document.querySelectorAll('.game-move').forEach(m => m.classList.remove('applied'));
  document.getElementById('game-won').classList.add('hidden');

  updateGameDisplay();
}

function applyMove(moveId, delta, btn) {
  if (state.appliedMoves.has(moveId)) return;
  state.appliedMoves.add(moveId);

  state.gamePrice = Math.max(state.gamePrice + delta, 15);

  btn.disabled = true;
  btn.textContent = '✓ Applied';
  btn.classList.add('applied-btn');
  btn.closest('.game-move').classList.add('applied');

  updateGameDisplay();

  if (state.gamePrice <= 80) {
    setTimeout(() => showGameWon(), 500);
  }
}

function updateGameDisplay() {
  const priceEl  = document.getElementById('game-price');
  const fillEl   = document.getElementById('game-target-fill');
  const priceBox = document.querySelector('.game-price');

  if (priceEl) animateNum(priceEl, state.gamePrice);

  if (priceBox) {
    priceBox.classList.toggle('winning', state.gamePrice <= 80);
  }

  if (fillEl) {
    // Bar: $15 = 5%, $200+ = 100%, target at $80 = ~35%
    const pct = Math.min(Math.max((state.gamePrice - 15) / (200 - 15) * 100, 5), 100);
    fillEl.style.width = pct + '%';
    fillEl.classList.toggle('winning', state.gamePrice <= 80);
    fillEl.classList.toggle('danger',  state.gamePrice > 80);
  }
}

function showGameWon() {
  const wonEl    = document.getElementById('game-won');
  const wonFinal = document.getElementById('won-final');
  const wonSaved = document.getElementById('won-saved');
  if (!wonEl) return;

  wonEl.classList.remove('hidden');
  animateNum(wonFinal, state.gamePrice);
  animateNum(wonSaved, (state.startPrice - state.gamePrice) * 12);
  wonEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ══════════════════════════════════════════
   INIT on page load
   ══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Hero entry
  const hero = document.getElementById('scene-0');
  if (hero) hero.classList.add('active');

  // Initial scene 3 data
  updateScene3Data();

  // Refresh crowd when returning to scene 2
  document.getElementById('scene-2')?.addEventListener('animationend', () => initScene2());
});
