-- ================================================================
-- Inside Things — Full Analytics Schema
-- Run this in Supabase SQL Editor
-- ================================================================

-- ── 1. SCENE FUNNEL (الأهم — معدل الإكمال) ─────────────────────
CREATE TABLE IF NOT EXISTS scene_funnel (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    TEXT NOT NULL,
  experience    TEXT DEFAULT 'inside-insurance',
  scene         INTEGER NOT NULL,           -- 0-6
  action        TEXT NOT NULL,              -- 'enter' | 'exit' | 'complete'
  time_spent_ms INTEGER,                   -- milliseconds on scene
  scroll_pct    INTEGER,                   -- 0-100% scrolled
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. DETAILED EVENTS (كل حدث صغير) ───────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  TEXT NOT NULL,
  experience  TEXT DEFAULT 'inside-insurance',
  event_type  TEXT NOT NULL,   -- 'click'|'hover'|'rage_click'|'wow'|'achievement'|'back_scroll'|'idle'
  scene       INTEGER,
  element_id  TEXT,            -- which element was interacted with
  value       JSONB,           -- extra data (coordinates, duration, etc)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. WOW EVENTS (قياس الأنيميشن الحقيقي) ────────────────────
CREATE TABLE IF NOT EXISTS wow_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    TEXT NOT NULL,
  scene         INTEGER NOT NULL,
  wow_id        TEXT NOT NULL,             -- 'crowd_animation'|'meter_reveal'|'game_win'
  continued     BOOLEAN,                  -- هل أكمل بعد WOW؟
  time_to_next  INTEGER,                  -- كم ثانية حتى انتقل؟
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. SESSION SUMMARY (ملخص كل جلسة) ─────────────────────────
CREATE TABLE IF NOT EXISTS session_summary (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      TEXT UNIQUE NOT NULL,
  experience      TEXT DEFAULT 'inside-insurance',
  last_scene      INTEGER DEFAULT 0,       -- آخر scene وصل إليه
  completed       BOOLEAN DEFAULT FALSE,   -- هل أكمل؟
  total_time_ms   INTEGER DEFAULT 0,
  rage_clicks     INTEGER DEFAULT 0,
  back_scrolls    INTEGER DEFAULT 0,
  wow_events      INTEGER DEFAULT 0,
  achievements    INTEGER DEFAULT 0,
  device_type     TEXT,                    -- 'mobile'|'tablet'|'desktop'
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES (لتسريع الاستعلامات) ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_funnel_session ON scene_funnel(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_scene   ON scene_funnel(scene);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type    ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_wow_scene      ON wow_events(scene);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────
ALTER TABLE scene_funnel     ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wow_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_summary  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert funnel"     ON scene_funnel     FOR INSERT WITH CHECK (true);
CREATE POLICY "anon insert events"     ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "anon insert wow"        ON wow_events       FOR INSERT WITH CHECK (true);
CREATE POLICY "anon upsert summary"    ON session_summary  FOR ALL    USING (true) WITH CHECK (true);

-- ── FUNNEL VIEW (لوحة المتابعة السهلة) ────────────────────────
CREATE OR REPLACE VIEW funnel_overview AS
SELECT
  scene,
  COUNT(DISTINCT session_id) FILTER (WHERE action = 'enter')    AS entered,
  COUNT(DISTINCT session_id) FILTER (WHERE action = 'complete') AS completed,
  ROUND(AVG(time_spent_ms) / 1000.0, 1)                         AS avg_seconds,
  ROUND(AVG(scroll_pct), 0)                                     AS avg_scroll_pct
FROM scene_funnel
GROUP BY scene
ORDER BY scene;

-- ── COMPLETION RATE VIEW ───────────────────────────────────────
CREATE OR REPLACE VIEW completion_rate AS
SELECT
  COUNT(*) FILTER (WHERE last_scene >= 6)::FLOAT /
  NULLIF(COUNT(*), 0) * 100 AS completion_pct,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE completed) AS completed_sessions,
  ROUND(AVG(total_time_ms) / 60000.0, 1) AS avg_minutes
FROM session_summary;
