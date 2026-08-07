/* ============================================================
   src/ui/achievements.js  — Micro-Dopamine toasts
   ============================================================ */
import { trackEvent } from '../analytics/tracker.js';

const ACHIEVEMENTS = [
  { id: 'started',     icon: '🚀', title: 'You\'re Inside',     sub: 'Experience started'          },
  { id: 'profiled',    icon: '🎯', title: 'Profile Built',      sub: 'Your risk is calculated'     },
  { id: 'crowd_seen',  icon: '👥', title: 'You saw the 1,000',  sub: 'Most people skip this'       },
  { id: 'myth_buster', icon: '💥', title: 'Myth Busted',        sub: 'You got a surprise'          },
  { id: 'game_player', icon: '🎮', title: 'Player Mode',        sub: 'You\'re gaming the system'   },
  { id: 'game_winner', icon: '🏆', title: 'System Beaten!',     sub: 'Under $80/month!'            },
  { id: 'completionist',icon:'🌟', title: 'Full Run',           sub: 'Top 60% of visitors'         },
];

const unlocked = new Set();
const queue    = [];
let showing    = false;

export function unlockAchievement(id) {
  if (unlocked.has(id)) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  unlocked.add(id);
  queue.push(ach);
  trackEvent('achievement', null, { id });
  if (!showing) showNext();
}

function showNext() {
  if (!queue.length) { showing = false; return; }
  showing = true;
  const ach = queue.shift();

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
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); setTimeout(showNext, 300); }, 500);
  }, 3200);
}

window.unlockAchievement = unlockAchievement;
