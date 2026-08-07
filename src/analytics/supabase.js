/* ============================================================
   src/analytics/supabase.js
   ============================================================ */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://dagdyyspelsdokfrwzct.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZ2R5eXNwZWxzZG9rZnJ3emN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjIwOTYsImV4cCI6MjEwMTYzODA5Nn0.wRD7crpV1c-LTr9Unbgw0lhYZPAfMMKYTPEiuxPMMmI';

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function saveEmail(email) {
  const { error } = await db.from('subscribers').insert([{
    email,
    source: 'inside-insurance-3d',
  }]);
  return !error;
}
