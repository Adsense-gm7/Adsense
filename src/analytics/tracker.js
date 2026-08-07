/* ============================================================
   src/analytics/tracker.js
   ============================================================ */
import { db } from './supabase.js';

export const SESSION_ID = crypto.randomUUID();

export async function trackEvent(event, scene, value = {}) {
  try {
    await db.from('analytics_events').insert([{
      session_id: SESSION_ID,
      event_type: event,
      scene,
      value,
      created_at: new Date().toISOString(),
    }]);
  } catch (_) {}
}

export async function trackSceneEnter(scene) {
  try {
    await db.from('scene_funnel').insert([{
      session_id: SESSION_ID,
      scene,
      action: 'enter',
      created_at: new Date().toISOString(),
    }]);
  } catch (_) {}
}
