import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3001;
const FDC_API_KEY = process.env.FDC_API_KEY || 'DEMO_KEY';
const MOSCOW_COORDS = { latitude: 55.75, longitude: 37.61 };
const REQUIRED_ENV = ['PGPASSWORD'];

for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}. Create .env from .env.example.`);
  }
}

const FOOD_QUERY_ALIASES = new Map([
  ['яблоко', 'apple'],
  ['яблоки', 'apple'],
  ['банан', 'banana'],
  ['бананы', 'banana'],
  ['рис', 'rice'],
  ['гречка', 'buckwheat'],
  ['овсянка', 'oatmeal'],
  ['курица', 'chicken'],
  ['куриная грудка', 'chicken breast'],
  ['грудка', 'chicken breast'],
  ['индейка', 'turkey'],
  ['говядина', 'beef'],
  ['свинина', 'pork'],
  ['рыба', 'fish'],
  ['лосось', 'salmon'],
  ['тунец', 'tuna'],
  ['яйцо', 'egg'],
  ['яйца', 'egg'],
  ['молоко', 'milk'],
  ['кефир', 'kefir'],
  ['йогурт', 'yogurt'],
  ['творог', 'cottage cheese'],
  ['сыр', 'cheese'],
  ['хлеб', 'bread'],
  ['картофель', 'potato'],
  ['картошка', 'potato'],
  ['помидор', 'tomato'],
  ['помидоры', 'tomato'],
  ['томат', 'tomato'],
  ['огурец', 'cucumber'],
  ['огурцы', 'cucumber'],
  ['морковь', 'carrot'],
  ['лук', 'onion'],
  ['капуста', 'cabbage'],
  ['апельсин', 'orange'],
  ['апельсины', 'orange'],
  ['груша', 'pear'],
  ['макароны', 'pasta'],
  ['паста', 'pasta'],
  ['масло', 'butter'],
  ['оливковое масло', 'olive oil'],
  ['кофе', 'coffee'],
  ['чай', 'tea']
]);

const LOCAL_FOODS = [
  { description: 'Банан', terms: ['banana', 'банан', 'бананы'], caloriesPer100g: 89, protein: 1.1, fat: 0.3, carbs: 22.8 },
  { description: 'Яблоко', terms: ['apple', 'яблоко', 'яблоки'], caloriesPer100g: 52, protein: 0.3, fat: 0.2, carbs: 13.8 },
  { description: 'Рис вареный', terms: ['rice', 'рис'], caloriesPer100g: 130, protein: 2.7, fat: 0.3, carbs: 28.2 },
  { description: 'Гречка вареная', terms: ['buckwheat', 'гречка'], caloriesPer100g: 92, protein: 3.4, fat: 0.6, carbs: 19.9 },
  { description: 'Овсянка вареная', terms: ['oatmeal', 'овсянка'], caloriesPer100g: 71, protein: 2.5, fat: 1.5, carbs: 12.0 },
  { description: 'Куриная грудка', terms: ['chicken breast', 'куриная грудка', 'грудка', 'курица'], caloriesPer100g: 165, protein: 31.0, fat: 3.6, carbs: 0 },
  { description: 'Курица', terms: ['chicken', 'курица'], caloriesPer100g: 239, protein: 27.0, fat: 14.0, carbs: 0 },
  { description: 'Яйцо', terms: ['egg', 'яйцо', 'яйца'], caloriesPer100g: 155, protein: 13.0, fat: 11.0, carbs: 1.1 },
  { description: 'Творог 5%', terms: ['cottage cheese', 'творог'], caloriesPer100g: 121, protein: 17.0, fat: 5.0, carbs: 1.8 },
  { description: 'Молоко 2.5%', terms: ['milk', 'молоко'], caloriesPer100g: 52, protein: 2.8, fat: 2.5, carbs: 4.7 },
  { description: 'Кефир', terms: ['kefir', 'кефир'], caloriesPer100g: 41, protein: 3.0, fat: 1.0, carbs: 4.0 },
  { description: 'Йогурт натуральный', terms: ['yogurt', 'йогурт'], caloriesPer100g: 61, protein: 3.5, fat: 3.3, carbs: 4.7 },
  { description: 'Хлеб пшеничный', terms: ['bread', 'хлеб'], caloriesPer100g: 265, protein: 9.0, fat: 3.2, carbs: 49.0 },
  { description: 'Картофель вареный', terms: ['potato', 'картофель', 'картошка'], caloriesPer100g: 87, protein: 1.9, fat: 0.1, carbs: 20.1 },
  { description: 'Помидор', terms: ['tomato', 'помидор', 'помидоры', 'томат'], caloriesPer100g: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
  { description: 'Огурец', terms: ['cucumber', 'огурец', 'огурцы'], caloriesPer100g: 15, protein: 0.7, fat: 0.1, carbs: 3.6 },
  { description: 'Морковь', terms: ['carrot', 'морковь'], caloriesPer100g: 41, protein: 0.9, fat: 0.2, carbs: 9.6 },
  { description: 'Говядина', terms: ['beef', 'говядина'], caloriesPer100g: 250, protein: 26.0, fat: 15.0, carbs: 0 },
  { description: 'Лосось', terms: ['salmon', 'лосось'], caloriesPer100g: 208, protein: 20.0, fat: 13.0, carbs: 0 },
  { description: 'Макароны вареные', terms: ['pasta', 'макароны', 'паста'], caloriesPer100g: 131, protein: 5.0, fat: 1.1, carbs: 25.0 }
];

function normalizeFoodQuery(query) {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!/[а-яё]/i.test(normalized)) return normalized;
  if (FOOD_QUERY_ALIASES.has(normalized)) return FOOD_QUERY_ALIASES.get(normalized);

  for (const [ru, en] of FOOD_QUERY_ALIASES.entries()) {
    if (normalized.includes(ru)) {
      return normalized.replaceAll(ru, en);
    }
  }

  return normalized;
}

function findLocalFoods(query, searchQuery, pageSize) {
  const original = query.trim().toLowerCase();
  const normalized = searchQuery.trim().toLowerCase();
  return LOCAL_FOODS
    .filter(food => food.terms.some(term => term.includes(original) || original.includes(term) || term.includes(normalized) || normalized.includes(term)))
    .map((food, index) => ({
      fdcId: `local-${index}`,
      description: food.description,
      brandOwner: 'Локальный справочник',
      dataType: 'Local',
      caloriesPer100g: food.caloriesPer100g,
      protein: food.protein,
      fat: food.fat,
      carbs: food.carbs
    }))
    .slice(0, pageSize);
}

function mergeFoods(localFoods, apiFoods, pageSize) {
  const seen = new Set();
  return [...localFoods, ...apiFoods]
    .filter(food => {
      const key = String(food.description || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, pageSize);
}

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'health_tracker',
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT) || 5432,
});

const dbFeatures = { statDate: false };

const METRIC_LIMITS = {
  water_ml: { min: 0, max: 20000 },
  calories: { min: 0, max: 50000 },
  sleep_hours: { min: 0, max: 24 },
  steps_km: { min: 0, max: 200000 },
  water_goal: { min: 1, max: 20000 },
  calories_goal: { min: 1, max: 50000 },
  sleep_goal: { min: 0.5, max: 24 },
  steps_goal: { min: 1, max: 200000 }
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePassword(password) {
  return String(password || '');
}

function readPositiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function readMetricNumber(value, field) {
  const limits = METRIC_LIMITS[field];
  const n = Number(value);
  if (!limits || !Number.isFinite(n) || n < limits.min || n > limits.max) {
    return null;
  }
  return n;
}

function readPageSize(value, fallback = 8, max = 20) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function validateStatsPayload(body) {
  const userId = readPositiveInteger(body.userId);
  if (!userId) return { error: 'Некорректный пользователь' };

  const key = normalizeDateKey(body.date || body.day);
  if (!key.date && !key.day) return { error: 'Некорректная дата' };

  const values = {};
  for (const field of Object.keys(METRIC_LIMITS)) {
    const value = readMetricNumber(body[field], field);
    if (value === null) return { error: `Некорректное значение: ${field}` };
    values[field] = value;
  }

  return { userId, key, values };
}

function normalizeDateKey(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return { date: raw, day: date.getDate() };
    }
  }

  const day = Number(raw);
  if (Number.isInteger(day) && day >= 1 && day <= 31) {
    return { date: null, day };
  }

  return { date: null, day: null };
}

async function ensureOptionalSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
        water_ml NUMERIC NOT NULL DEFAULT 0 CHECK (water_ml >= 0),
        calories NUMERIC NOT NULL DEFAULT 0 CHECK (calories >= 0),
        sleep_hours NUMERIC NOT NULL DEFAULT 0 CHECK (sleep_hours >= 0),
        steps_km NUMERIC NOT NULL DEFAULT 0 CHECK (steps_km >= 0),
        water_goal NUMERIC NOT NULL DEFAULT 2000 CHECK (water_goal > 0),
        calories_goal NUMERIC NOT NULL DEFAULT 2000 CHECK (calories_goal > 0),
        sleep_goal NUMERIC NOT NULL DEFAULT 8 CHECK (sleep_goal > 0),
        steps_goal NUMERIC NOT NULL DEFAULT 10000 CHECK (steps_goal > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, day)
      )
    `);

    await pool.query('ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS stat_date DATE');
    await pool.query('ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
    await pool.query(`
      UPDATE daily_stats
      SET stat_date = make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::int,
        EXTRACT(MONTH FROM CURRENT_DATE)::int,
        day::int
      )
      WHERE stat_date IS NULL AND day BETWEEN 1 AND 31
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS daily_stats_user_stat_date_idx
      ON daily_stats (user_id, stat_date)
      WHERE stat_date IS NOT NULL
    `);
    dbFeatures.statDate = true;
  } catch (err) {
    dbFeatures.statDate = false;
    console.warn('Database schema initialization skipped:', err.message);
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, database: 'ok', statDate: dbFeatures.statDate });
  } catch (err) {
    res.status(503).json({ success: false, database: 'unavailable', message: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Некорректный email' });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Пароль должен быть от 6 до 128 символов' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.json({ success: false, message: 'Такой email уже зарегистрирован' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);
    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ success: false, message: 'Введите корректный email и пароль' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.json({ success: false, message: 'Неверный пароль' });
    }

    res.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/data/:userId/:day', async (req, res) => {
  try {
    const { userId, day } = req.params;
    const normalizedUserId = readPositiveInteger(userId);
    if (!normalizedUserId) {
      return res.status(400).json({ success: false, message: 'Некорректный пользователь' });
    }

    const key = normalizeDateKey(day);
    if (!key.date && !key.day) {
      return res.status(400).json({ success: false, message: 'Некорректная дата' });
    }

    const result = dbFeatures.statDate && key.date
      ? await pool.query(
          'SELECT * FROM daily_stats WHERE user_id = $1 AND stat_date = $2',
          [normalizedUserId, key.date]
        )
      : await pool.query(
          'SELECT * FROM daily_stats WHERE user_id = $1 AND day = $2',
          [normalizedUserId, key.day]
        );

    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/save', async (req, res) => {
  try {
    const payload = validateStatsPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, message: payload.error });
    }
    const { userId, key, values } = payload;

    if (dbFeatures.statDate && key.date) {
      await pool.query(`
        INSERT INTO daily_stats
          (user_id, day, stat_date, water_ml, calories, sleep_hours, steps_km,
           water_goal, calories_goal, sleep_goal, steps_goal)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (user_id, stat_date) WHERE stat_date IS NOT NULL DO UPDATE
        SET
          day = EXCLUDED.day,
          water_ml = EXCLUDED.water_ml,
          calories = EXCLUDED.calories,
          sleep_hours = EXCLUDED.sleep_hours,
          steps_km = EXCLUDED.steps_km,
          water_goal = EXCLUDED.water_goal,
          calories_goal = EXCLUDED.calories_goal,
          sleep_goal = EXCLUDED.sleep_goal,
          steps_goal = EXCLUDED.steps_goal,
          updated_at = NOW()
      `, [
        userId,
        key.day,
        key.date,
        values.water_ml,
        values.calories,
        values.sleep_hours,
        values.steps_km,
        values.water_goal,
        values.calories_goal,
        values.sleep_goal,
        values.steps_goal
      ]);
    } else {
      await pool.query(`
        INSERT INTO daily_stats
          (user_id, day, water_ml, calories, sleep_hours, steps_km,
           water_goal, calories_goal, sleep_goal, steps_goal)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, day) DO UPDATE
        SET
          water_ml = EXCLUDED.water_ml,
          calories = EXCLUDED.calories,
          sleep_hours = EXCLUDED.sleep_hours,
          steps_km = EXCLUDED.steps_km,
          water_goal = EXCLUDED.water_goal,
          calories_goal = EXCLUDED.calories_goal,
          sleep_goal = EXCLUDED.sleep_goal,
          steps_goal = EXCLUDED.steps_goal,
          updated_at = NOW()
      `, [
        userId,
        key.day,
        values.water_ml,
        values.calories,
        values.sleep_hours,
        values.steps_km,
        values.water_goal,
        values.calories_goal,
        values.sleep_goal,
        values.steps_goal
      ]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/food/search', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    const searchQuery = normalizeFoodQuery(query);
    const pageSize = readPageSize(req.query.pageSize);
    const upstreamPageSize = Math.min(Math.max(pageSize * 4, 20), 50);
    if (query.length < 2) return res.json({ success: true, foods: [] });
    const localFoods = findLocalFoods(query, searchQuery, pageSize);

    const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
    url.searchParams.set('api_key', FDC_API_KEY);

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        pageSize: upstreamPageSize,
        pageNumber: 1,
        dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded']
      })
    });

    if (!apiRes.ok) {
      return res.json({ success: true, query, searchQuery, source: 'local', foods: localFoods });
    }

    const payload = await apiRes.json();
    const foods = (payload.foods || [])
      .map(food => {
        const nutrients = food.foodNutrients || [];
        const energy = nutrients.find(n => n.nutrientName === 'Energy' && String(n.unitName).toUpperCase() === 'KCAL');
        const protein = nutrients.find(n => n.nutrientName === 'Protein');
        const fat = nutrients.find(n => n.nutrientName === 'Total lipid (fat)');
        const carbs = nutrients.find(n => n.nutrientName === 'Carbohydrate, by difference');

        return {
          fdcId: food.fdcId,
          description: food.description,
          brandOwner: food.brandOwner || '',
          dataType: food.dataType,
          caloriesPer100g: Math.round(Number(energy?.value || 0)),
          protein: Number(protein?.value || 0),
          fat: Number(fat?.value || 0),
          carbs: Number(carbs?.value || 0)
        };
      })
      .filter(food => food.caloriesPer100g > 0)
      .sort((a, b) => {
        const priority = { Foundation: 0, 'SR Legacy': 1, 'Survey (FNDDS)': 2, Branded: 3 };
        return (priority[a.dataType] ?? 9) - (priority[b.dataType] ?? 9);
      })
      .slice(0, pageSize);

    res.json({ success: true, query, searchQuery, source: 'mixed', foods: mergeFoods(localFoods, foods, pageSize) });
  } catch (err) {
    const query = String(req.query.query || '').trim();
    const searchQuery = normalizeFoodQuery(query);
    const pageSize = readPageSize(req.query.pageSize);
    res.json({ success: true, query, searchQuery, source: 'local', foods: findLocalFoods(query, searchQuery, pageSize) });
  }
});

app.get('/api/weather/hydration', async (_req, res) => {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', MOSCOW_COORDS.latitude);
    url.searchParams.set('longitude', MOSCOW_COORDS.longitude);
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m');
    url.searchParams.set('daily', 'uv_index_max');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ success: false, message: 'Open-Meteo не ответил' });
    }

    const data = await apiRes.json();
    const current = data.current || {};
    const temp = Number(current.temperature_2m);
    const apparent = Number(current.apparent_temperature);
    const humidity = Number(current.relative_humidity_2m);
    const wind = Number(current.wind_speed_10m);
    const uvIndex = Number(data.daily?.uv_index_max?.[0] || 0);

    let recommendedWater = 2000;
    const factors = [];
    if (apparent >= 25) { recommendedWater += 350; factors.push('жарко'); }
    if (apparent >= 30) { recommendedWater += 250; factors.push('очень тепло'); }
    if (humidity < 35) { recommendedWater += 200; factors.push('сухой воздух'); }
    if (uvIndex >= 6) { recommendedWater += 200; factors.push('высокий UV'); }
    if (wind >= 25) { recommendedWater += 150; factors.push('ветер'); }
    if (apparent <= 5) { recommendedWater -= 150; factors.push('прохладно'); }

    recommendedWater = Math.max(1700, Math.min(3000, recommendedWater));
    res.json({
      success: true,
      recommendedWater,
      status: factors.length ? `Учтено: ${factors.join(', ')}` : 'Погодная норма',
      weather: { temp, apparent, humidity, wind, uvIndex }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

await ensureOptionalSchema();

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
