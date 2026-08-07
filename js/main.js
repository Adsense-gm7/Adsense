/* ============================================================
   INSIDE THINGS — main.js
   Simulation Engine: Profile, Pricing, Navigation, Game
   ============================================================ */

'use strict';

/* ── State ── */
const state = {
  age: 19,
  car: 'economy',
  record: 'clean',
  currentScene: 0,
  gamePrice: 0,
  startPrice: 0,
  appliedMoves: new Set(),
};

/* ── Pricing Engine ── */
const BASE_PRICE = 35; // base cost from risk pool math

const PRICE_TABLE = {
  age: { 19: 92, 25: 55, 35: 32, 45: 22 },
  car: { economy: 12, sport: 55, suv: 22, luxury: 68 },
  record: { clean: 0, minor: 28, accident: 75, dui: 185 },
};

const RISK_TABLE = {
  age: { 19: 45, 25: 25, 35: 12, 45: 8 },
  car: { economy: 12, sport: 38, suv: 18, luxury: 28 },
  record: { clean: 0, minor: 22, accident: 42, dui: 65 },
};

const CROWD_TABLE = {
  age: { 19: 80, 25: 60, 35: 45, 45: 40 },
  car: { economy: 50, sport: 75, suv: 52, luxury: 55 },
  record: { clean: 50, minor: 65, accident: 85, dui: 120 },
};

function calcPrice() {
  return BASE_PRICE
    + PRICE_TABLE.age[state.age]
    + PRICE_TABLE.car[state.car]
    + PRICE_TABLE.record[state.record];
}

function calcRiskScore() {
  return 5 // base
    + RISK_TABLE.age[state.age]
    + RISK_TABLE.car[state.car]
    + RISK_TABLE.record[state.record];
}

function calcAccidents() {
  return Math.round(
    (CROWD_TABLE.age[state.age] + CROWD_TABLE.car[state.car] + CROWD_TABLE.record[state.record]) / 3
  );
}

/* ── DOM Refs ── */
const livePrice    = document.getElementById('live-price');
const priceBarFill = document.getElementById('price-bar-fill');
const progressFill = document.getElementById('progress-fill');

/* ── Cursor glow ── */
const cursorGlow = document.getElementById('cursor-glow');
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top  = e.clientY + 'px';
});

/* ── Animated counter ── */
function animateNum(el, target, prefix = '', suffix = '', duration = 500) {
  const start   = parseInt(el.textContent.replace(/\D/g, '')) || 0;
  const startTs = performance.now();
  const diff    = target - start;

  function step(ts) {
    const pct = Math.min((ts - startTs) / duration, 1);
    const ease = 1 - Math.pow(1 - pct, 3); // ease-out-cubic
    el.textContent = prefix + Math.round(start + diff * ease) + suffix;
    el.classList.add('counting');
    setTimeout(() => el.classList.remove('counting'), 150);
    if (pct < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Update live price ── */
function updatePrice() {
  const price = calcPrice();
  animateNum(livePrice, price);

  // Sync viral card price
  const viralPriceEl = document.getElementById('viral-price');
  if (viralPriceEl) animateNum(viralPriceEl, price);

  // bar: map $40–$500 → 5%–100%
  const pct = Math.min(Math.max((price - 40) / (500 - 40) * 100, 5), 100);
  priceBarFill.style.width = pct + '%';
}

/* ── Selectors ── */
function selectAge(btn) {
  document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.age = parseInt(btn.dataset.age);
  updatePrice();
  updateScene2Data();
  updateScene3Data();
}

function selectCar(btn) {
  document.querySelectorAll('.car-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.car = btn.dataset.car;
  updatePrice();
  updateScene2Data();
  updateScene3Data();
}

function selectRecord(btn) {
  document.querySelectorAll('.record-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.record = btn.dataset.record;
  updatePrice();
  updateScene2Data();
  updateScene3Data();
}

/* ── Guess Mechanic ── */
let guessScore = { correct: 0, total: 0 };

function makeGuess(id, guess, correctAnswer, btn) {
  const card       = document.getElementById(`surprise-${id}`);
  const resultEl   = document.getElementById(`gr-${id}`);
  const allBtns    = btn.closest('.guess-btns').querySelectorAll('.guess-btn');

  // Disable all buttons for this card
  allBtns.forEach(b => b.disabled = true);

  const isCorrect = (guess === 'yes') === correctAnswer;
  guessScore.total++;
  if (isCorrect) guessScore.correct++;

  // Highlight buttons
  allBtns.forEach(b => {
    const btnGuess = b.textContent.includes('Yes') ? 'yes' : 'no';
    const btnCorrect = (btnGuess === 'yes') === correctAnswer;
    if (btnCorrect)                          b.classList.add('correct');
    else if (b === btn && !isCorrect)        b.classList.add('wrong');
  });

  // Show result message
  if (resultEl) {
    resultEl.textContent = isCorrect ? '✓ You got it right!' : '✗ Most people get this wrong too.';
    resultEl.className   = `guess-result ${isCorrect ? 'correct-msg' : 'wrong-msg'}`;
  }

  // Flip card after short delay
  setTimeout(() => {
    if (card) card.classList.add('revealed');
    trackSurpriseReveal(id);
  }, 600);
}

/* ── Viral Share ── */
function viralShare(type) {
  const price = calcPrice();
  const url   = 'https://inside-things.vercel.app';
  const text  = `My car insurance estimate: $${price}/mo. Can you get below $80? Try the simulation 👇`;

  if (type === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  } else {
    const fullText = `${text}\n${url}`;
    navigator.clipboard.writeText(fullText).then(() => {
      const el = document.getElementById('viral-copied');
      if (el) {
        el.textContent = '✓ Copied! Paste it anywhere.';
        setTimeout(() => { el.textContent = ''; }, 3000);
      }
    });
  }
  trackEvent('viral_share', 6, { type, price });
}

/* ── Live Counter (simulated with Supabase session count) ── */
function animateLiveCounter() {
  const el = document.getElementById('sp-live');
  if (!el) return;
  const base = 1200 + Math.floor(Math.random() * 200);
  let current = base;
  el.textContent = current.toLocaleString();

  // Randomly increment/decrement every few seconds to feel live
  setInterval(() => {
    const delta = Math.floor(Math.random() * 7) - 2;
    current = Math.max(current + delta, 800);
    el.textContent = current.toLocaleString();
  }, 4000);
}

/* ── Scene Navigation ── */
const totalScenes = 6;

function startExperience() {
  goToScene(1);
}

function goToScene(num) {
  const prev = document.getElementById(`scene-${state.currentScene}`);
  const next = document.getElementById(`scene-${num}`);
  if (!next) return;

  if (prev) { prev.classList.remove('active', 'visible'); }

  state.currentScene = num;
  next.classList.add('visible', 'active');
  next.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Update progress bar
  const pct = ((num) / totalScenes) * 100;
  progressFill.style.width = pct + '%';

  // Show/hide chapter nav
  const chapNav = document.getElementById('chapter-nav');
  if (num >= 1) {
    chapNav.classList.remove('hidden');
    document.querySelectorAll('.chapter-dot').forEach(d => {
      d.classList.toggle('active', parseInt(d.dataset.scene) === num);
    });
  } else {
    chapNav.classList.add('hidden');
  }

  // Scene-specific init
  if (num === 2) initScene2();
  if (num === 3) initScene3();
  if (num === 5) initScene5();
}

/* ── Intersection Observer for scroll-reveal ── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const sceneId = entry.target.id;
      const num = parseInt(sceneId.replace('scene-', ''));
      if (!isNaN(num) && num > 0) {
        entry.target.classList.add('visible');
        goToScene(num);
      }
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.scene').forEach(s => observer.observe(s));

/* ── Surprise cards ── */
function revealSurprise(id) {
  const card = document.getElementById(`surprise-${id}`);
  if (card) card.classList.toggle('revealed');
}

/* ── Share ── */
function shareExperience(type) {
  const url  = window.location.href;
  const text = `I just learned why car insurance is expensive — through an interactive simulation. Mind = blown 🤯`;
  if (type === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  } else {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.querySelector('.share-btn:last-child');
      if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = '🔗 Copy Link'; }, 2000); }
    });
  }
}

/* ── Init ── */
updatePrice();
animateLiveCounter();

