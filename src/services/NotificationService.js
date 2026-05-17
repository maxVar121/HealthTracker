export class NotificationService {
  static TYPES = {
    GOAL_REACHED: { icon: 'fas fa-award', cls: 'notif-item--success' },
    GOAL_SET: { icon: 'fas fa-bullseye', cls: 'notif-item--info' },
    GOAL_CLEARED: { icon: 'fas fa-sliders', cls: 'notif-item--warning' },
    METRIC_RESET: { icon: 'fas fa-rotate-left', cls: 'notif-item--warning' },
    ALMOST_THERE: { icon: 'fas fa-gauge-high', cls: 'notif-item--info' },
    OVERDUE: { icon: 'fas fa-triangle-exclamation', cls: 'notif-item--danger' },
    DAY_SUMMARY: { icon: 'fas fa-chart-line', cls: 'notif-item--info' }
  };

  constructor() {
    this._items = [];
    this._listeners = [];
    this.enabled = true;
    this._load();
  }

  subscribe(fn) {
    this._listeners.push(fn);
  }

  add(typeKey, title, text) {
    if (!this.enabled) return null;

    const type = NotificationService.TYPES[typeKey] ?? NotificationService.TYPES.DAY_SUMMARY;
    const item = {
      id: Date.now() + Math.random(),
      typeKey,
      icon: type.icon,
      cls: type.cls,
      title,
      text,
      time: new Date(),
      read: false
    };

    this._items.unshift(item);
    if (this._items.length > 50) this._items = this._items.slice(0, 50);
    this._save();
    this._notify();
    return item;
  }

  checkGoals(dayData, changedField, prevValue) {
    const metrics = [
      { field: 'water_ml', goal: 'water_goal', name: 'Вода', unit: 'мл' },
      { field: 'calories', goal: 'calories_goal', name: 'Калории', unit: 'ккал' },
      { field: 'sleep_hours', goal: 'sleep_goal', name: 'Сон', unit: 'ч' },
      { field: 'steps_km', goal: 'steps_goal', name: 'Шаги', unit: 'шагов' }
    ];

    const metric = metrics.find(item => item.field === changedField);
    if (!metric) return;

    const val = dayData[metric.field] ?? 0;
    const goal = dayData[metric.goal] ?? 0;
    if (goal <= 0) return;

    const pct = (val / goal) * 100;
    const prevPct = prevValue != null ? (prevValue / goal) * 100 : 0;

    if (pct >= 100 && prevPct < 100) {
      this.add(
        'GOAL_REACHED',
        'Цель достигнута',
        `${metric.name}: ${this._fmt(val)} ${metric.unit} из ${this._fmt(goal)}`
      );
    } else if (pct >= 80 && prevPct < 80) {
      this.add(
        'ALMOST_THERE',
        'Почти у цели',
        `${metric.name}: осталось ${this._fmt(Math.ceil(goal - val))} ${metric.unit}`
      );
    }
  }

  goalSet(metricName, value, unit) {
    this.add('GOAL_SET', 'Цель установлена', `${metricName}: новая цель ${this._fmt(value)} ${unit}`);
  }

  goalCleared(metricName) {
    this.add('GOAL_CLEARED', 'Цель очищена', `${metricName}: цель сброшена`);
  }

  metricReset(metricName) {
    this.add('METRIC_RESET', 'Данные сброшены', `${metricName}: значение обнулено`);
  }

  daySummary(dayData) {
    const metrics = [
      { field: 'water_ml', goal: 'water_goal', name: 'Вода' },
      { field: 'calories', goal: 'calories_goal', name: 'Калории' },
      { field: 'sleep_hours', goal: 'sleep_goal', name: 'Сон' },
      { field: 'steps_km', goal: 'steps_goal', name: 'Шаги' }
    ];

    const total = metrics.filter(item => dayData[item.goal] > 0);
    if (!total.length) return;

    const done = total.filter(item => dayData[item.field] >= dayData[item.goal]);
    const lines = total.map(item => {
      const pct = Math.min(Math.round((dayData[item.field] / dayData[item.goal]) * 100), 100);
      return `${item.name}: ${pct}%`;
    }).join(' · ');

    this.add(
      'DAY_SUMMARY',
      done.length === total.length ? 'День закрыт отлично' : `Итог: ${done.length}/${total.length} целей`,
      lines
    );
  }

  markAllRead() {
    this._items.forEach(item => {
      item.read = true;
    });
    this._save();
    this._notify();
  }

  clearAll() {
    this._items = [];
    this._save();
    this._notify();
  }

  unreadCount() {
    return this._items.filter(item => !item.read).length;
  }

  timeAgo(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  _notify() {
    this._listeners.forEach(fn => fn(this._items));
  }

  _save() {
    try {
      localStorage.setItem('health_notifications', JSON.stringify(this._items));
    } catch {}
  }

  _load() {
    try {
      const raw = localStorage.getItem('health_notifications');
      this._items = raw ? JSON.parse(raw).map(item => ({ ...item, time: new Date(item.time) })) : [];
    } catch {
      this._items = [];
    }
  }

  _fmt(n) {
    return Number(n ?? 0).toLocaleString('ru-RU');
  }
}
