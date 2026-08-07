/* ============================================================
   src/simulation/pricing.js
   Insurance pricing engine — migrated from old main.js
   ============================================================ */

export const state = {
  age: 19, car: 'economy', record: 'clean',
  currentScene: 0,
  gamePrice: 0,
  startPrice: 0,
};

const PRICE_TABLE = {
  age:    { 19: 92, 25: 45, 35: 0, 45: -12 },
  car:    { economy: 0, sports: 55, suv: 28, luxury: 75 },
  record: { clean: 0, ticket: 35, accident: 98, dui: 185 },
};

const BASE_PRICE = 127;

export function calcPrice() {
  return BASE_PRICE
    + PRICE_TABLE.age[state.age]
    + PRICE_TABLE.car[state.car]
    + PRICE_TABLE.record[state.record];
}

export function getRiskScore() {
  const ageRisk    = { 19: 45, 25: 22, 35: 5, 45: 2 };
  const carRisk    = { economy: 5, sports: 25, suv: 15, luxury: 20 };
  const recordRisk = { clean: 0, ticket: 18, accident: 35, dui: 55 };
  return Math.min(
    ageRisk[state.age] + carRisk[state.car] + recordRisk[state.record] + 10,
    100
  );
}

// Game moves
export const GAME_MOVES = [
  { id: 'telematics',  label: '📱 Install telematics app',       saving: -18 },
  { id: 'deductible',  label: '💸 Raise deductible to $2,000',   saving: -22 },
  { id: 'course',      label: '📚 Defensive driving course',      saving: -9  },
  { id: 'bundle',      label: '🏠 Bundle with renter\'s insurance',saving: -14 },
  { id: 'credit',      label: '📈 Improve credit score 100 pts',  saving: -31 },
];

export const appliedMoves = new Set();

export function applyGameMove(moveId) {
  if (appliedMoves.has(moveId)) return state.gamePrice;
  const move = GAME_MOVES.find(m => m.id === moveId);
  if (!move) return state.gamePrice;
  appliedMoves.add(moveId);
  state.gamePrice = Math.max(state.gamePrice + move.saving, 30);
  return state.gamePrice;
}

export function resetGame() {
  appliedMoves.clear();
  state.gamePrice  = calcPrice();
  state.startPrice = state.gamePrice;
}
