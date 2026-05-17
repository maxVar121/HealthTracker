// src/services/HealthDataService.js
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';

export class HealthDataService {
  constructor(userId) {
    this.userId     = userId;
    this.currentDay = null;
    this.currentDateStr = null;
    this.dayData    = this._defaults();
    this._weekCache = {};        // { 'YYYY-MM-DD': dayData } для графиков
  }

  // ── Дефолтные значения ───────────────────────────────────────────────
  _defaults() {
    return {
      water_ml:      0,
      calories:      0,
      sleep_hours:   0,
      steps_km:      0,
      water_goal:    2000,
      calories_goal: 2000,
      sleep_goal:    8,
      steps_goal:    10000
    };
  }

  // ── Конвертация: день месяца → строка 'YYYY-MM-DD' ─────────────────
  _dateStr(dayOfMonth) {
    const now = new Date();
    return this._formatDate(new Date(now.getFullYear(), now.getMonth(), dayOfMonth));
  }

  // ── Загрузка дня ────────────────────────────────────────────────────
  async loadDayData(dayOfMonth) {
    const dateStr = this._dateStr(dayOfMonth);
    this.currentDay = dayOfMonth;
    this.currentDateStr = dateStr;

    const remote = await this._loadRemote(dateStr);
    if (remote) {
      this.dayData = this._merge(remote);
      this._saveLocal(dateStr, this.dayData);
      return this.dayData;
    }

    const cached = this._loadLocal(dateStr);
    if (cached) {
      this.dayData = this._merge(cached);
      return this.dayData;
    }

    this.dayData = this._defaults();
    return this.dayData;
  }

  // Нормализует поля, подставляя дефолты для отсутствующих
  _merge(raw) {
    const d = this._defaults();
    return {
      water_ml:      raw.water_ml      ?? d.water_ml,
      calories:      raw.calories      ?? d.calories,
      sleep_hours:   raw.sleep_hours   ?? d.sleep_hours,
      steps_km:      raw.steps_km ?? raw.steps ?? d.steps_km,
      water_goal:    raw.water_goal    ?? d.water_goal,
      calories_goal: raw.calories_goal ?? d.calories_goal,
      sleep_goal:    raw.sleep_goal    ?? d.sleep_goal,
      steps_goal:    raw.steps_goal    ?? d.steps_goal,
    };
  }

  // ── Сохранение метрики ──────────────────────────────────────────────
  /**
   * @param {string}      field  — 'water_ml' | 'calories' | 'sleep_hours' | 'steps_km'
   * @param {number|null} value  — добавить к текущему (0 = сброс, null = не менять)
   * @param {number|null} goal   — новая цель (null = не менять, 0 = сброс до дефолта)
   */
  async saveMetric(field, value = null, goal = null) {
    // Значение
    if (value !== null) {
      const cur = this.dayData[field] ?? 0;
      this.dayData[field] = value === 0 ? 0 : cur + value;
    }

    // Цель
    if (goal !== null) {
      const goalField = field + '_goal';
      if (goalField in this.dayData) {
        // goal=0 означает «очистить» → возвращаем дефолт
        this.dayData[goalField] = goal === 0 ? this._defaults()[goalField] : goal;
      }
    }

    const dateStr = this.currentDateStr ?? this._dateStr(this.currentDay);
    this._saveLocal(dateStr, this.dayData);
    await this._saveRemote(dateStr, this.currentDay, this.dayData);

    return this.dayData;
  }

  // ── Данные за текущую неделю (для графиков) ─────────────────────────
  async loadWeekData() {
    const now   = new Date();
    const today = now.getDate();
    // Пн–Вс текущей недели
    const dow   = (now.getDay() + 6) % 7; // 0=Пн
    const days  = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(today - dow + i);
      return d;
    });

    const results = await Promise.all(days.map(async d => {
      const dateStr = this._formatDate(d);
      const remote = await this._loadRemote(dateStr);
      const local = this._loadLocal(dateStr);
      const raw = remote ?? local;
      return raw ? this._merge(raw) : this._defaults();
    }));

    return results; // массив 7 объектов [Пн, Вт, ..., Вс]
  }

  // ── Прогресс ────────────────────────────────────────────────────────
  calculateProgress() {
    const d = this.dayData;
    const metrics = [
      { val: d.water_ml,    goal: d.water_goal    },
      { val: d.calories,    goal: d.calories_goal },
      { val: d.sleep_hours, goal: d.sleep_goal    },
      { val: d.steps_km,    goal: d.steps_goal    },
    ];
    const active = metrics.filter(m => m.goal > 0);
    if (!active.length) return 0;
    const sum = active.reduce((acc, m) => acc + Math.min((m.val / m.goal) * 100, 100), 0);
    return sum / active.length;
  }

  async loadHistory(daysCount = 30) {
    const today = new Date();
    const days = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      return date;
    }).reverse();

    return Promise.all(days.map(async date => {
      const dateStr = this._formatDate(date);
      const remote = await this._loadRemote(dateStr);
      const local = this._loadLocal(dateStr);
      const raw = remote ?? local;
      return {
        date,
        dateStr,
        data: raw ? this._merge(raw) : this._defaults()
      };
    }));
  }

  getCompletion(data = this.dayData) {
    const metrics = [
      { field: 'water_ml', goal: 'water_goal' },
      { field: 'calories', goal: 'calories_goal' },
      { field: 'sleep_hours', goal: 'sleep_goal' },
      { field: 'steps_km', goal: 'steps_goal' },
    ];
    const active = metrics.filter(m => data[m.goal] > 0);
    if (!active.length) return 0;
    const total = active.reduce((sum, m) => sum + Math.min((data[m.field] / data[m.goal]) * 100, 100), 0);
    return Math.round(total / active.length);
  }

  // ── localStorage ────────────────────────────────────────────────────
  _key(dateStr) { return `health_${this.userId}_${dateStr}`; }

  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _saveLocal(dateStr, data) {
    try { localStorage.setItem(this._key(dateStr), JSON.stringify(data)); } catch {}
  }

  _loadLocal(dateStr) {
    try {
      const raw = localStorage.getItem(this._key(dateStr));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async _loadRemote(dateStr) {
    try {
      const res = await fetch(`${API_BASE}/data/${encodeURIComponent(this.userId)}/${encodeURIComponent(dateStr)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return Object.keys(data).length ? data : null;
    } catch {
      return null;
    }
  }

  async _saveRemote(dateStr, dayOfMonth, data) {
    try {
      await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          day: dayOfMonth,
          date: dateStr,
          ...data
        })
      });
    } catch {}
  }
}
