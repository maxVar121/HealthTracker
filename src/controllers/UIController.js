export class UIController {
  showAuth() {
    document.getElementById('authSection')?.classList.remove('hidden');
    document.getElementById('dashboard')?.classList.add('hidden');
    this._setHeaderToolsVisible(false);
    this._hideDropdowns();
  }

  showDashboard() {
    document.getElementById('authSection')?.classList.add('hidden');
    document.getElementById('dashboard')?.classList.remove('hidden');
    this._setHeaderToolsVisible(true);
  }

  setAuthLoading(loading) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');

    [loginBtn, registerBtn, emailInput, passInput].forEach(el => {
      if (el) el.disabled = loading;
    });

    if (loginBtn) loginBtn.textContent = loading ? 'Вхожу...' : 'Войти';
  }

  setUserStatus(email) {
    const name = email?.split('@')[0] ?? '';
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const userStatus = document.getElementById('userStatus');

    if (nameEl) nameEl.textContent = capitalized;
    if (emailEl) emailEl.textContent = email;
    if (userStatus) userStatus.textContent = email;
  }

  showError(msg) {
    this._toast(msg, 'error');
  }

  showSuccess(msg) {
    this._toast(msg, 'success');
  }

  updateDayNav(day) {
    const now = new Date();
    const today = now.getDate();
    const dateObj = new Date(now.getFullYear(), now.getMonth(), day);
    const isToday = day === today;
    const isYesterday = day === today - 1;

    const dayLabel = isToday
      ? 'Сегодня'
      : isYesterday
        ? 'Вчера'
        : dateObj.toLocaleDateString('ru-RU', { weekday: 'long' });
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

    this._setText('dayNavLabel', dayLabel);
    this._setText('dayNavDate', dateStr);

    const prevBtn = document.getElementById('prevDay');
    const nextBtn = document.getElementById('nextDay');
    if (prevBtn) prevBtn.disabled = day <= 1;
    if (nextBtn) nextBtn.disabled = isToday;
  }

  updateMetricText(type, value, unit) {
    const map = {
      water: { id: 'resultWater', label: 'Вода сегодня' },
      calories: { id: 'resultCalories', label: 'Калории сегодня' },
      sleep: { id: 'resultSleep', label: 'Сон сегодня' },
      steps: { id: 'resultSteps', label: 'Шаги сегодня' }
    };
    const cfg = map[type];
    const el = cfg ? document.getElementById(cfg.id) : null;
    if (!el) return;

    el.replaceChildren();
    el.append(`${cfg.label}: `);
    const strong = document.createElement('strong');
    strong.textContent = this._fmt(value);
    el.append(strong, ` ${unit}`);
  }

  updateGoalText(type, goal) {
    const map = {
      water: 'waterGoalDisplay',
      calories: 'caloriesGoalDisplay',
      sleep: 'sleepGoalDisplay',
      steps: 'stepsGoalDisplay'
    };
    const el = document.getElementById(map[type]);
    if (el) el.textContent = goal > 0 ? this._fmt(goal) : '-';
  }

  updateProgress(type, value, goal) {
    const fill = document.getElementById(`${type}Progress`);
    const percent = document.getElementById(`${type}Percent`);
    if (!fill) return;

    const p = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
    fill.style.width = `${p}%`;
    fill.classList.toggle('metric-card__progress-fill--complete', p >= 100);
    if (percent) percent.textContent = `${Math.round(p)}%`;
  }

  updateOverallProgress(percent) {
    this._setText('overallProgress', `${Math.round(percent)}%`);
  }

  refreshDashboard(data) {
    if (!data) return;

    this.updateMetricText('water', data.water_ml, 'мл');
    this.updateMetricText('calories', data.calories, 'ккал');
    this.updateMetricText('sleep', data.sleep_hours, 'ч');
    this.updateMetricText('steps', data.steps_km, 'шагов');

    this.updateGoalText('water', data.water_goal);
    this.updateGoalText('calories', data.calories_goal);
    this.updateGoalText('sleep', data.sleep_goal);
    this.updateGoalText('steps', data.steps_goal);

    this.updateProgress('water', data.water_ml, data.water_goal);
    this.updateProgress('calories', data.calories, data.calories_goal);
    this.updateProgress('sleep', data.sleep_hours, data.sleep_goal);
    this.updateProgress('steps', data.steps_km, data.steps_goal);
  }

  _setHeaderToolsVisible(visible) {
    document.getElementById('notifWrap')?.classList.toggle('hidden', !visible);
    document.getElementById('calendarWrap')?.classList.toggle('hidden', !visible);
    document.getElementById('profileWrap')?.classList.toggle('hidden', !visible);
  }

  _hideDropdowns() {
    ['profileDropdown', 'calendarDropdown', 'notifDropdown'].forEach(id =>
      document.getElementById(id)?.classList.add('hidden')
    );
  }

  _toast(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icon = document.createElement('i');
    icon.className = `toast__icon fas ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`;

    const text = document.createElement('span');
    text.className = 'toast__msg';
    text.textContent = msg;

    toast.append(icon, text);
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast--show'));
    setTimeout(() => {
      toast.classList.remove('toast--show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  _fmt(n) {
    return Number(n ?? 0).toLocaleString('ru-RU');
  }
}
