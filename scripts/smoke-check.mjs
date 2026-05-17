const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3001/api';

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {}
  return { res, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const suffix = Date.now();
const email = `smoke-${suffix}@health.local`;
const password = 'smoke123';
const date = new Date().toISOString().slice(0, 10);

console.log(`Smoke target: ${API_BASE}`);

const health = await request('/health');
assert(health.res.ok && health.body?.success, `Health check failed: ${JSON.stringify(health.body)}`);

const register = await request('/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
assert(register.res.ok && register.body?.success, `Register failed: ${JSON.stringify(register.body)}`);

const login = await request('/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
assert(login.res.ok && login.body?.success && login.body.user?.id, `Login failed: ${JSON.stringify(login.body)}`);

const userId = login.body.user.id;
const save = await request('/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    date,
    water_ml: 500,
    calories: 300,
    sleep_hours: 7.5,
    steps_km: 1200,
    water_goal: 2000,
    calories_goal: 2000,
    sleep_goal: 8,
    steps_goal: 10000
  })
});
assert(save.res.ok && save.body?.success, `Save failed: ${JSON.stringify(save.body)}`);

const data = await request(`/data/${encodeURIComponent(userId)}/${encodeURIComponent(date)}`);
assert(data.res.ok && Number(data.body?.water_ml) === 500, `Load data failed: ${JSON.stringify(data.body)}`);

const food = await request('/food/search?query=banana&pageSize=3');
assert(food.res.ok && food.body?.success && Array.isArray(food.body.foods), `Food search failed: ${JSON.stringify(food.body)}`);

console.log('Smoke check passed');
