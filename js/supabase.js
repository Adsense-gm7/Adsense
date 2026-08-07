/* ============================================================
   INSIDE THINGS — supabase.js
   Handles: Email signups, Experience analytics, Game scores
   ============================================================ */

// ── Supabase Config ──────────────────────────────────────────
// These values are injected by Vercel environment variables
// For local dev: create a .env.local file (see .env.example)
const SUPABASE_URL      = 'https://dagdyyspelsdokfrwzct.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZ2R5eXNwZWxzZG9rZnJ3emN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjIwOTYsImV4cCI6MjEwMTYzODA5Nn0.wRD7crpV1c-LTr9Unbgw0lhYZPAfMMKYTPEiuxPMMmI';

// Load Supabase from CDN
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ══════════════════════════════════════════════════════
   1. EMAIL NEWSLETTER SIGNUP
   Table: subscribers (email, created_at, source)
   ══════════════════════════════════════════════════════ */
async function subscribeEmail(email) {
  if (!email || !email.includes('@')) return { error: 'Invalid email' };

  const { data, error } = await db
    .from('subscribers')
    .insert([{
      email,
      source: 'inside-insurance',
      subscribed_at: new Date().toISOString(),
    }]);

  return { data, error };
}

/* ══════════════════════════════════════════════════════
   2. EXPERIENCE ANALYTICS
   Table: experience_events (event, scene, value, session_id)
   Tracks: scene completions, surprise reveals, game wins
   ══════════════════════════════════════════════════════ */
const SESSION_ID = crypto.randomUUID();

async function trackEvent(event, sceneNum = null, value = null) {
  try {
    await db.from('experience_events').insert([{
      event,
      scene: sceneNum,
      value: value ? JSON.stringify(value) : null,
      session_id: SESSION_ID,
      experience: 'inside-insurance',
      created_at: new Date().toISOString(),
    }]);
  } catch (e) {
    // Silently fail — don't break user experience
    console.warn('Analytics:', e.message);
  }
}

// Auto-track scene visits
function trackSceneVisit(sceneNum) {
  trackEvent('scene_visit', sceneNum);
}

// Track profile selections
function trackProfileSelection(type, value) {
  trackEvent('profile_select', null, { type, value });
}

// Track surprise reveals
function trackSurpriseReveal(surpriseId) {
  trackEvent('surprise_reveal', 4, { surprise_id: surpriseId });
}

// Track game completion
function trackGameWon(startPrice, finalPrice) {
  trackEvent('game_won', 5, {
    start_price: startPrice,
    final_price: finalPrice,
    saved_monthly: startPrice - finalPrice,
    saved_annual: (startPrice - finalPrice) * 12,
  });
}

// Track experience completion
function trackExperienceComplete() {
  trackEvent('experience_complete', 6);
}

/* ══════════════════════════════════════════════════════
   3. GAME LEADERBOARD
   Table: leaderboard (session_id, start_price, final_price, moves_used, time_seconds)
   ══════════════════════════════════════════════════════ */
let gameStartTime = null;

function startGameTimer() {
  gameStartTime = Date.now();
}

async function submitLeaderboardScore(startPrice, finalPrice, movesUsed) {
  if (!gameStartTime) return;
  const timeSeconds = Math.round((Date.now() - gameStartTime) / 1000);

  const { data, error } = await db.from('leaderboard').insert([{
    session_id: SESSION_ID,
    start_price: startPrice,
    final_price: finalPrice,
    saved_amount: startPrice - finalPrice,
    moves_used: movesUsed,
    time_seconds: timeSeconds,
    created_at: new Date().toISOString(),
  }]);

  return { data, error };
}

async function getLeaderboard(limit = 10) {
  const { data, error } = await db
    .from('leaderboard')
    .select('*')
    .order('saved_amount', { ascending: false })
    .limit(limit);

  return { data, error };
}

/* ══════════════════════════════════════════════════════
   4. NEWSLETTER WIDGET (injected into scene-6)
   ══════════════════════════════════════════════════════ */
function injectEmailWidget() {
  const shareSection = document.querySelector('.share-section');
  if (!shareSection) return;

  const widget = document.createElement('div');
  widget.className = 'email-widget';
  widget.innerHTML = `
    <div class="email-widget-label">Get notified when new experiences launch</div>
    <div class="email-widget-form">
      <input
        type="email"
        id="email-input"
        class="email-input"
        placeholder="your@email.com"
        autocomplete="email"
      />
      <button class="email-submit-btn" id="email-submit-btn" onclick="handleEmailSubmit()">
        Notify Me
      </button>
    </div>
    <div id="email-feedback" class="email-feedback"></div>
  `;

  shareSection.insertAdjacentElement('beforebegin', widget);
}

async function handleEmailSubmit() {
  const input    = document.getElementById('email-input');
  const btn      = document.getElementById('email-submit-btn');
  const feedback = document.getElementById('email-feedback');
  if (!input || !btn || !feedback) return;

  const email = input.value.trim();
  btn.disabled = true;
  btn.textContent = '...';

  const { error } = await subscribeEmail(email);

  if (error) {
    if (error.code === '23505') {
      feedback.textContent = '✓ You\'re already on the list!';
      feedback.style.color = '#22c55e';
    } else {
      feedback.textContent = 'Something went wrong. Try again.';
      feedback.style.color = '#ef4444';
      btn.disabled = false;
      btn.textContent = 'Notify Me';
    }
  } else {
    feedback.textContent = '🎉 You\'re in! We\'ll email you when the next experience launches.';
    feedback.style.color = '#22c55e';
    btn.textContent = '✓ Subscribed';
    input.value = '';
    trackEvent('email_subscribe', 6);
  }
}

/* ── Init on load ── */
document.addEventListener('DOMContentLoaded', () => {
  // Track initial page view
  trackEvent('page_view');

  // Inject email widget when scene 6 becomes visible
  const scene6 = document.getElementById('scene-6');
  if (scene6) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        injectEmailWidget();
        trackExperienceComplete();
        obs.disconnect();
      }
    }, { threshold: 0.2 });
    obs.observe(scene6);
  }
});
