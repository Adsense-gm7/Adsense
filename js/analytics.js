/* ============================================================
   INSIDE THINGS — analytics.js
   Full behavioral analytics engine:
   - Scene funnel tracking
   - Scroll depth
   - Time on scene
   - Rage clicks
   - WOW event measurement
   - Back scroll detection
   - Idle detection
   - Micro-Dopamine achievements
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
const Analytics = {
  sessionId:    SESSION_ID,   // from supabase.js
  currentScene: 0,
  sceneEnterTime: null,
  sceneScrollMax: 0,
  rageClickCount: 0,
  rageClickTimer: null,
  lastScrollY: 0,
  backScrollCount: 0,
  totalWowEvents: 0,
  totalAchievements: 0,
  idleTimer: null,
  deviceType: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
};

/* ══════════════════════════════════════════════════════════════
   SCENE FUNNEL TRACKING
   ══════════════════════════════════════════════════════════════ */
async function trackSceneEnter(sceneNum) {
  // Exit previous scene first
  if (Analytics.currentScene !== sceneNum && Analytics.sceneEnterTime) {
    await trackSceneExit(Analytics.currentScene);
  }

  Analytics.currentScene  = sceneNum;
  Analytics.sceneEnterTime = Date.now();
  Analytics.sceneScrollMax = 0;

  await db.from('scene_funnel').insert([{
    session_id:  Analytics.sessionId,
    scene:       sceneNum,
    action:      'enter',
    created_at:  new Date().toISOString(),
  }]);

  updateSessionSummary({ last_scene: sceneNum });
  resetIdleTimer();
}

async function trackSceneExit(sceneNum) {
  if (!Analytics.sceneEnterTime) return;
  const timeSpent = Date.now() - Analytics.sceneEnterTime;

  await db.from('scene_funnel').insert([{
    session_id:   Analytics.sessionId,
    scene:        sceneNum,
    action:       'exit',
    time_spent_ms: timeSpent,
    scroll_pct:   Analytics.sceneScrollMax,
    created_at:   new Date().toISOString(),
  }]);
}

async function trackSceneComplete(sceneNum) {
  await db.from('scene_funnel').insert([{
    session_id:  Analytics.sessionId,
    scene:       sceneNum,
    action:      'complete',
    time_spent_ms: Date.now() - (Analytics.sceneEnterTime || Date.now()),
    created_at:  new Date().toISOString(),
  }]);

  if (sceneNum === 6) {
    updateSessionSummary({ completed: true });
  }
}

/* ══════════════════════════════════════════════════════════════
   WOW EVENT TRACKING
   ══════════════════════════════════════════════════════════════ */
const wowPendingMap = {};

function trackWowStart(wowId, sceneNum) {
  Analytics.totalWowEvents++;
  wowPendingMap[wowId] = {
    startTime: Date.now(),
    scene: sceneNum,
    continued: false,
  };
}

async function trackWowContinue(wowId) {
  if (!wowPendingMap[wowId]) return;
  const wow = wowPendingMap[wowId];
  const timeToNext = Date.now() - wow.startTime;

  await db.from('wow_events').insert([{
    session_id:   Analytics.sessionId,
    scene:        wow.scene,
    wow_id:       wowId,
    continued:    true,
    time_to_next: timeToNext,
    created_at:   new Date().toISOString(),
  }]);

  delete wowPendingMap[wowId];
}

async function trackWowDropped(wowId) {
  if (!wowPendingMap[wowId]) return;
  const wow = wowPendingMap[wowId];

  await db.from('wow_events').insert([{
    session_id:   Analytics.sessionId,
    scene:        wow.scene,
    wow_id:       wowId,
    continued:    false,
    time_to_next: null,
    created_at:   new Date().toISOString(),
  }]);

  delete wowPendingMap[wowId];
}

/* ══════════════════════════════════════════════════════════════
   RAGE CLICK DETECTION
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('click', async (e) => {
  Analytics.rageClickCount++;
  clearTimeout(Analytics.rageClickTimer);

  Analytics.rageClickTimer = setTimeout(async () => {
    if (Analytics.rageClickCount >= 3) {
      await db.from('analytics_events').insert([{
        session_id: Analytics.sessionId,
        event_type: 'rage_click',
        scene:      Analytics.currentScene,
        element_id: e.target.id || e.target.className || 'unknown',
        value:      { count: Analytics.rageClickCount, x: e.clientX, y: e.clientY },
        created_at: new Date().toISOString(),
      }]);
      Analytics.rageClickCount = 0;
    } else {
      Analytics.rageClickCount = 0;
    }
  }, 800);
});

/* ══════════════════════════════════════════════════════════════
   SCROLL TRACKING (depth + back scroll)
   ══════════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  Analytics.sceneScrollMax = Math.max(Analytics.sceneScrollMax, Math.round(scrolled));

  // Back scroll detection
  if (window.scrollY < Analytics.lastScrollY - 200) {
    Analytics.backScrollCount++;
    if (Analytics.backScrollCount % 3 === 0) { // throttle
      db.from('analytics_events').insert([{
        session_id: Analytics.sessionId,
        event_type: 'back_scroll',
        scene:      Analytics.currentScene,
        value:      { scroll_y: window.scrollY, count: Analytics.backScrollCount },
        created_at: new Date().toISOString(),
      }]);
    }
  }
  Analytics.lastScrollY = window.scrollY;
  resetIdleTimer();
}, { passive: true });

/* ══════════════════════════════════════════════════════════════
   IDLE DETECTION (20+ seconds no interaction)
   ══════════════════════════════════════════════════════════════ */
function resetIdleTimer() {
  clearTimeout(Analytics.idleTimer);
  Analytics.idleTimer = setTimeout(async () => {
    await db.from('analytics_events').insert([{
      session_id: Analytics.sessionId,
      event_type: 'idle',
      scene:      Analytics.currentScene,
      value:      { idle_seconds: 20 },
      created_at: new Date().toISOString(),
    }]);
  }, 20000);
}

/* ══════════════════════════════════════════════════════════════
   SESSION SUMMARY (upsert)
   ══════════════════════════════════════════════════════════════ */
async function updateSessionSummary(updates = {}) {
  await db.from('session_summary').upsert([{
    session_id:       Analytics.sessionId,
    rage_clicks:      Analytics.rageClickCount,
    back_scrolls:     Analytics.backScrollCount,
    wow_events:       Analytics.totalWowEvents,
    achievements:     Analytics.totalAchievements,
    device_type:      Analytics.deviceType,
    user_agent:       navigator.userAgent.slice(0, 200),
    updated_at:       new Date().toISOString(),
    ...updates,
  }], { onConflict: 'session_id' });
}

/* ══════════════════════════════════════════════════════════════
   MICRO-DOPAMINE ENGINE — Achievement System
   A micro-reward fires every ~20 seconds of engagement
   ══════════════════════════════════════════════════════════════ */
const ACHIEVEMENTS = [
  { id: 'started',      icon: '🚀', title: 'You\'re Inside',      sub: 'Experience started' },
  { id: 'profiled',     icon: '🎯', title: 'Profile Built',       sub: 'Your risk is being calculated' },
  { id: 'crowd_seen',   icon: '👥', title: 'You saw the 1,000',   sub: 'Most people skip this part' },
  { id: 'risk_known',   icon: '⚖️', title: 'Risk Decoded',        sub: 'You know your score' },
  { id: 'myth_buster',  icon: '💥', title: 'Myth Busted',         sub: 'You got a surprise' },
  { id: 'game_player',  icon: '🎮', title: 'Player Mode',         sub: 'You\'re playing the system' },
  { id: 'game_winner',  icon: '🏆', title: 'System Beaten',       sub: 'Under $80/month!' },
  { id: 'completionist',icon: '🌟', title: 'Full Experience',     sub: 'Top 60% of visitors' },
];

const unlockedAchievements = new Set();
let achievementQueue = [];
let achievementShowing = false;

function unlockAchievement(id) {
  if (unlockedAchievements.has(id)) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;

  unlockedAchievements.add(id);
  Analytics.totalAchievements++;
  achievementQueue.push(ach);

  db.from('analytics_events').insert([{
    session_id: Analytics.sessionId,
    event_type: 'achievement',
    scene:      Analytics.currentScene,
    element_id: id,
    created_at: new Date().toISOString(),
  }]);

  if (!achievementShowing) showNextAchievement();
}

function showNextAchievement() {
  if (achievementQueue.length === 0) { achievementShowing = false; return; }
  achievementShowing = true;
  const ach = achievementQueue.shift();

  // Create toast
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="ach-icon">${ach.icon}</div>
    <div class="ach-text">
      <div class="ach-title">${ach.title}</div>
      <div class="ach-sub">${ach.sub}</div>
    </div>
    <div class="ach-badge">Achievement</div>
  `;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  // Remove after 3.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      setTimeout(showNextAchievement, 400);
    }, 500);
  }, 3500);
}

/* ══════════════════════════════════════════════════════════════
   HOOK INTO EXISTING SCENE NAVIGATION
   ══════════════════════════════════════════════════════════════ */
const _originalGoToScene = typeof goToScene === 'function' ? goToScene : null;

// Patch goToScene to add analytics hooks
if (typeof window !== 'undefined') {
  window.addEventListener('scene-change', (e) => {
    const { from, to } = e.detail;
    trackSceneEnter(to);

    // WOW tracking — mark entry, then check if user continues
    if (from > 0) trackWowContinue(`scene_${from}_complete`);
    trackWowStart(`scene_${to}_complete`, to);

    // Achievements
    const achMap = {
      1: 'started', 2: 'crowd_seen', 3: 'risk_known',
      4: 'myth_buster', 5: 'game_player', 6: 'completionist'
    };
    if (achMap[to]) setTimeout(() => unlockAchievement(achMap[to]), 1500);
  });
}

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  updateSessionSummary({ last_scene: 0 });
  trackSceneEnter(0);
  resetIdleTimer();

  // Page leave — flush pending wow events
  window.addEventListener('beforeunload', () => {
    const pending = Object.keys(wowPendingMap);
    pending.forEach(id => trackWowDropped(id));
    updateSessionSummary();
  });
});
