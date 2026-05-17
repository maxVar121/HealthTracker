export class EventController {
  constructor(auth, data, ui, notif, onWaterChange, onDataChange) {
    this.auth = auth;
    this.data = data;
    this.ui = ui;
    this.notif = notif;
    this.onWaterChange = onWaterChange ?? (() => {});
    this.onDataChange = onDataChange ?? (() => {});
    this.abort = new AbortController();
  }

  init() {
    this.bindDashboardEvents();
  }

  destroy() {
    this.abort.abort();
  }

  bindDashboardEvents() {
    this._on('addWater', () => this.addMetric('water_ml', 'water', 'мл'));
    this._on('resetWater', () => this.resetMetric('water_ml', 'Вода'));
    this._on('setWaterGoal', () => this.setGoal('water_ml', 'waterGoal', 'мл', 'Вода'));
    this._on('clearWaterGoal', () => this.clearGoal('water_ml', 'Вода'));

    this._on('addCalories', () => this.addMetric('calories', 'calories', 'ккал'));
    this._on('resetCalories', () => this.resetMetric('calories', 'Калории'));
    this._on('setCaloriesGoal', () => this.setGoal('calories', 'caloriesGoal', 'ккал', 'Калории'));
    this._on('clearCaloriesGoal', () => this.clearGoal('calories', 'Калории'));

    this._on('addSleep', () => this.addMetric('sleep_hours', 'sleep', 'ч'));
    this._on('resetSleep', () => this.resetMetric('sleep_hours', 'Сон'));
    this._on('setSleepGoal', () => this.setGoal('sleep_hours', 'sleepGoal', 'ч', 'Сон'));
    this._on('clearSleepGoal', () => this.clearGoal('sleep_hours', 'Сон'));

    this._on('addSteps', () => this.addMetric('steps_km', 'steps', 'шагов'));
    this._on('resetSteps', () => this.resetMetric('steps_km', 'Шаги'));
    this._on('setStepsGoal', () => this.setGoal('steps_km', 'stepsGoal', 'шагов', 'Шаги'));
    this._on('clearStepsGoal', () => this.clearGoal('steps_km', 'Шаги'));

    this._bindEnter('water', 'addWater');
    this._bindEnter('calories', 'addCalories');
    this._bindEnter('sleep', 'addSleep');
    this._bindEnter('steps', 'addSteps');
    this._bindEnter('waterGoal', 'setWaterGoal');
    this._bindEnter('caloriesGoal', 'setCaloriesGoal');
    this._bindEnter('sleepGoal', 'setSleepGoal');
    this._bindEnter('stepsGoal', 'setStepsGoal');
    this._bindEnter('email', 'loginBtn');
    this._bindEnter('password', 'loginBtn');
  }

  async addMetric(field, inputId, unit) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const value = parseFloat(input.value);
    if (!value || value <= 0) {
      this.ui.showError('Введите число больше 0');
      return;
    }

    const prevValue = this.data.dayData[field] ?? 0;
    await this.data.saveMetric(field, value, null);
    input.value = '';

    if (field === 'water_ml') this.onWaterChange(this.data.dayData.water_ml);
    this.notif?.checkGoals(this.data.dayData, field, prevValue);
    this.refreshUI();
  }

  async setGoal(field, inputId, unit, metricName) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const value = parseFloat(input.value);
    if (!value || value <= 0) {
      this.ui.showError('Введите цель больше 0');
      return;
    }

    await this.data.saveMetric(field, null, value);
    input.value = '';
    this.notif?.goalSet(metricName, value, unit);
    this.notif?.checkGoals(this.data.dayData, field, null);
    this.refreshUI();
  }

  async clearGoal(field, metricName) {
    await this.data.saveMetric(field, null, 0);
    this.notif?.goalCleared(metricName);
    this.refreshUI();
  }

  async resetMetric(field, metricName) {
    await this.data.saveMetric(field, 0, null);
    if (field === 'water_ml') this.onWaterChange(0);
    this.notif?.metricReset(metricName);
    this.refreshUI();
  }

  async changeDay(day) {
    await this.data.loadDayData(day);
    this.onWaterChange(this.data.dayData.water_ml);
    this.refreshUI();
  }

  refreshUI() {
    this.ui.refreshDashboard(this.data.dayData);
    this.ui.updateDayNav(this.data.currentDay);
    this.onDataChange(this.data.dayData);
  }

  _on(id, fn) {
    document.getElementById(id)?.addEventListener('click', fn, { signal: this.abort.signal });
  }

  _bindEnter(inputId, btnId) {
    document.getElementById(inputId)?.addEventListener('keypress', event => {
      if (event.key === 'Enter') document.getElementById(btnId)?.click();
    }, { signal: this.abort.signal });
  }
}
