/* ============================================================
   src/ui/hud.js
   HTML overlay panels that float over the 3D canvas.
   Each HUD panel corresponds to a scroll section.
   ============================================================ */
import { state, calcPrice, getRiskScore, GAME_MOVES, applyGameMove, resetGame } from '../simulation/pricing.js';
import { triggerConfetti } from '../world/particles.js';
import { unlockAchievement } from './achievements.js';
import { trackEvent } from '../analytics/tracker.js';

const hudPanels = {};

export function initHUD() {
  document.querySelectorAll('[data-hud]').forEach(el => {
    hudPanels[el.dataset.hud] = el;
  });

  // Wire up all interactions
  wireProfile();
  wireGuess();
  wireGame();
}

export function showHUD(id) {
  const el = hudPanels[id];
  if (el && !el.classList.contains('hud-visible')) {
    el.classList.add('hud-visible');
    if (id === 'hud-crowd')   renderCrowdMath();
    if (id === 'hud-game')    initGame();
  }
}

export function hideHUD(id) {
  const el = hudPanels[id];
  if (el) el.classList.remove('hud-visible');
}

// ── PROFILE BUILDER ────────────────────────────────────────
function wireProfile() {
  document.querySelectorAll('.age-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.age = parseInt(btn.dataset.age);
      refreshPrice();
      unlockAchievement('profiled');
      trackEvent('profile_select', 1, { field: 'age', value: state.age });
    });
  });

  document.querySelectorAll('.car-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.car-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.car = btn.dataset.car;
      refreshPrice();
      trackEvent('profile_select', 1, { field: 'car', value: state.car });
    });
  });

  document.querySelectorAll('.record-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.record-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.record = btn.dataset.record;
      refreshPrice();
      trackEvent('profile_select', 1, { field: 'record', value: state.record });
    });
  });
}

function refreshPrice() {
  const price = calcPrice();
  const risk  = getRiskScore();

  animateNum(document.getElementById('hud-price'), price);
  animateNum(document.getElementById('viral-price'), price);

  const bar = document.getElementById('hud-risk-bar');
  if (bar) bar.style.width = risk + '%';

  const riskEl = document.getElementById('hud-risk-num');
  if (riskEl) animateNum(riskEl, risk);
}

// ── CROWD MATH DISPLAY ─────────────────────────────────────
function renderCrowdMath() {
  const el = document.getElementById('crowd-math');
  if (!el) return;
  el.innerHTML = `
    <div class="math-line">50 accidents × $8,500 avg claim</div>
    <div class="math-op">÷</div>
    <div class="math-line">1,000 drivers in your pool</div>
    <div class="math-eq">=</div>
    <div class="math-result">$<span id="pool-base">425</span>/year base cost</div>
    <div class="math-note">+ your personal risk score adjustments</div>
  `;
  unlockAchievement('crowd_seen');
}

// ── GUESS MECHANIC ─────────────────────────────────────────
const QUESTIONS = [
  { q: 'Does your car\'s <strong>color</strong> affect your premium?',  icon: '🎨', correct: false, twist: 'WHERE you park at night matters. High-theft ZIP = +23%.' },
  { q: 'Safer cars = <strong>cheaper</strong> insurance?',               icon: '🚗', correct: false, twist: 'Volvo is safe but expensive to repair. Repair cost > safety rating.' },
  { q: 'Does your <strong>credit score</strong> affect your premium?',   icon: '💳', correct: true,  twist: 'Only CA, HI & MA ban this. 76% higher for poor credit in 46 states.' },
  { q: 'Moving 2 miles can change your rate by <strong>$4,000/yr</strong>?', icon: '📍', correct: true, twist: 'Same driver, same car. Different ZIP = $4,000 more in Detroit.' },
];

let guessScore = 0;

function wireGuess() {
  const container = document.getElementById('guess-cards');
  if (!container) return;

  container.innerHTML = QUESTIONS.map((q, i) => `
    <div class="guess-card" id="gc-${i}">
      <div class="gc-front">
        <div class="gc-icon">${q.icon}</div>
        <div class="gc-question">${q.q}</div>
        <div class="gc-btns">
          <button class="gc-btn" data-idx="${i}" data-ans="yes">👍 Yes</button>
          <button class="gc-btn" data-idx="${i}" data-ans="no">👎 No</button>
        </div>
      </div>
      <div class="gc-back" id="gc-back-${i}"></div>
    </div>
  `).join('');

  container.addEventListener('click', e => {
    const btn = e.target.closest('.gc-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    const ans = btn.dataset.ans === 'yes';
    resolveGuess(idx, ans);
  });
}

function resolveGuess(idx, userYes) {
  const q       = QUESTIONS[idx];
  const correct = userYes === q.correct;
  if (correct) guessScore++;

  const card    = document.getElementById(`gc-${idx}`);
  const back    = document.getElementById(`gc-back-${idx}`);
  if (!card || !back) return;

  // Disable buttons
  card.querySelectorAll('.gc-btn').forEach(b => {
    b.disabled = true;
    const bYes = b.dataset.ans === 'yes';
    if (bYes === q.correct) b.classList.add('correct');
    else if (b === document.querySelector(`[data-idx="${idx}"][data-ans="${userYes ? 'yes':'no'}"]`) && !correct) b.classList.add('wrong');
  });

  back.innerHTML = `
    <div class="gc-verdict ${q.correct ? 'true' : 'false'}">${q.correct ? '✅ TRUE' : '❌ MYTH'}</div>
    <div class="gc-twist">${q.twist}</div>
    <div class="gc-score-msg">${correct ? '✓ You got it right!' : '✗ Most people miss this.'}</div>
  `;

  setTimeout(() => card.classList.add('flipped'), 400);

  unlockAchievement('myth_buster');
  trackEvent('guess_answer', 4, { question: idx, correct, userAnswer: userYes ? 'yes' : 'no' });
}

// ── GAME (Beat the System) ─────────────────────────────────
function initGame() {
  resetGame();
  const priceEl = document.getElementById('game-price');
  if (priceEl) animateNum(priceEl, state.gamePrice);

  document.querySelectorAll('.move-btn').forEach(btn => {
    btn.disabled = false;
    btn.addEventListener('click', () => {
      const moveId = btn.dataset.move;
      const newPrice = applyGameMove(moveId);
      btn.disabled = true;
      btn.classList.add('applied');
      btn.textContent = '✓ Applied';

      animateNum(document.getElementById('game-price'), newPrice);

      if (newPrice <= 80) {
        setTimeout(() => showGameWon(), 600);
      }

      unlockAchievement('game_player');
      trackEvent('game_move', 5, { move: moveId, newPrice });
    });
  });
}

function showGameWon() {
  const wonEl = document.getElementById('game-won');
  if (wonEl) wonEl.classList.remove('hidden');
  triggerConfetti();
  unlockAchievement('game_winner');
  trackEvent('game_won', 5, { finalPrice: state.gamePrice, saved: state.startPrice - state.gamePrice });

  // Update viral card
  const viralEl = document.getElementById('viral-price');
  if (viralEl) animateNum(viralEl, state.gamePrice);
}

// ── Viral share ────────────────────────────────────────────
export function viralShare(type) {
  const price = calcPrice();
  const url   = 'https://inside-things.vercel.app';
  const text  = `My car insurance: $${price}/mo. Can you get below $80? Try the simulation 👇`;

  if (type === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  } else {
    navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
      const el = document.getElementById('viral-copied');
      if (el) { el.textContent = '✓ Copied!'; setTimeout(() => el.textContent = '', 3000); }
    });
  }
  trackEvent('viral_share', 6, { type, price });
}

// ── Email subscribe ────────────────────────────────────────
export async function subscribeEmail(email) {
  if (!email || !email.includes('@')) return;
  const { saveEmail } = await import('../analytics/supabase.js');
  await saveEmail(email);
  trackEvent('email_subscribe', 6, { email });
}

// ── Number animation ───────────────────────────────────────
function animateNum(el, target) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff  = target - start;
  const dur   = 600;
  const t0    = performance.now();

  function step(now) {
    const prog = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - prog, 3);
    el.textContent = Math.round(start + diff * ease);
    if (prog < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

window.viralShare     = viralShare;
window.subscribeEmail = subscribeEmail;
