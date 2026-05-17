import '@fortawesome/fontawesome-free/css/all.min.css';
import { Chart } from 'chart.js/auto';
import { AuthManager } from './modules/AuthManager.js';
import { HealthDataService } from './services/HealthDataService.js';
import { UIController } from './controllers/UIController.js';
import { EventController } from './controllers/EventController.js';
import { NotificationService } from './services/NotificationService.js';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';
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

class App {
  constructor() {
    this.auth = new AuthManager();
    this.ui = new UIController();
    this.notifService = new NotificationService();
    this.dataService = null;
    this.eventController = null;
    this.charts = {};
    this.currentUser = null;
    this.preferences = this._defaultPreferences();
    this.profileTab = 'profile';
    this.foodItems = [];
    this.chartRefreshTimer = null;
  }

  start() {
    this._bindAuthButtons();
    this._bindProfileCenter();
    this._bindFoodSearch();

    this.auth.subscribe(user => {
      if (user) this._onLogin(user);
      else this._onLogout();
    });

    this.auth.init();
  }

  _bindAuthButtons() {
    const getFields = () => ({
      email: document.getElementById('email')?.value.trim() ?? '',
      password: document.getElementById('password')?.value ?? ''
    });

    document.getElementById('loginBtn')?.addEventListener('click', async () => {
      const { email, password } = getFields();
      if (!email || !password) {
        this.ui.showError('Введите email и пароль');
        return;
      }
      this.ui.setAuthLoading(true);
      const res = await this.auth.signIn(email, password);
      this.ui.setAuthLoading(false);
      if (!res.success) this.ui.showError(res.message || 'Ошибка входа');
    });

    document.getElementById('registerBtn')?.addEventListener('click', async () => {
      const { email, password } = getFields();
      if (!email || !password) {
        this.ui.showError('Введите email и пароль');
        return;
      }
      if (password.length < 6) {
        this.ui.showError('Пароль должен быть не короче 6 символов');
        return;
      }
      this.ui.setAuthLoading(true);
      const res = await this.auth.signUp(email, password);
      this.ui.setAuthLoading(false);
      if (!res.success) this.ui.showError(res.message || 'Ошибка регистрации');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      this._closeAllDropdowns();
      this.auth.signOut();
    });

    this._initDropdowns();
  }

  _closeAllDropdowns() {
    ['profileDropdown', 'calendarDropdown', 'notifDropdown'].forEach(id =>
      document.getElementById(id)?.classList.add('hidden')
    );
  }

  _initDropdowns() {
    document.addEventListener('click', () => this._closeAllDropdowns());

    ['profileDropdown', 'calendarDropdown', 'notifDropdown'].forEach(id =>
      document.getElementById(id)?.addEventListener('click', e => e.stopPropagation())
    );

    document.getElementById('notifBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const dd = document.getElementById('notifDropdown');
      const wasHidden = dd?.classList.contains('hidden');
      this._closeAllDropdowns();
      if (wasHidden) {
        dd?.classList.remove('hidden');
        this.notifService.markAllRead();
        this._renderNotifications();
      }
    });

    document.getElementById('notifClearBtn')?.addEventListener('click', () => {
      this.notifService.clearAll();
      this._renderNotifications();
    });

    this.notifService.subscribe(() => this._updateNotifBadge());
    this._updateNotifBadge();

    document.getElementById('profileBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const dd = document.getElementById('profileDropdown');
      const wasHidden = dd?.classList.contains('hidden');
      this._closeAllDropdowns();
      if (wasHidden) dd?.classList.remove('hidden');
    });

    document.querySelectorAll('[data-profile-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._closeAllDropdowns();
        this._openProfileCenter(btn.dataset.profileTab);
      });
    });

    document.getElementById('calendarBtn')?.addEventListener('click', e => {
      e.stopPropagation();
      const dd = document.getElementById('calendarDropdown');
      const wasHidden = dd?.classList.contains('hidden');
      this._closeAllDropdowns();
      if (wasHidden) {
        dd?.classList.remove('hidden');
        this._calOffset = 0;
        this._renderCalendar();
      }
    });

    document.getElementById('calPrevMonth')?.addEventListener('click', () => {
      this._calOffset = (this._calOffset ?? 0) - 1;
      this._renderCalendar();
    });
    document.getElementById('calNextMonth')?.addEventListener('click', () => {
      this._calOffset = (this._calOffset ?? 0) + 1;
      this._renderCalendar();
    });
    document.getElementById('calTodayBtn')?.addEventListener('click', () => {
      this._calOffset = 0;
      this._renderCalendar();
      this._jumpToDay(new Date().getDate());
      this._closeAllDropdowns();
    });

    document.getElementById('prevDay')?.addEventListener('click', () => {
      const cur = this.dataService?.currentDay ?? new Date().getDate();
      if (cur > 1) this.eventController?.changeDay(cur - 1);
    });
    document.getElementById('nextDay')?.addEventListener('click', () => {
      const cur = this.dataService?.currentDay ?? new Date().getDate();
      const today = new Date().getDate();
      if (cur < today) this.eventController?.changeDay(cur + 1);
    });
  }

  _renderCalendar() {
    const offset = this._calOffset ?? 0;
    const now = new Date();
    const view = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const isCurrentMonth = view.getMonth() === now.getMonth() && view.getFullYear() === now.getFullYear();
    const today = now.getDate();

    const label = document.getElementById('calMonthLabel');
    if (label) label.textContent = view.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const nextBtn = document.getElementById('calNextMonth');
    if (nextBtn) nextBtn.disabled = isCurrentMonth;

    const grid = document.getElementById('calGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay = (view.getDay() + 6) % 7;
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const daysInPrev = new Date(view.getFullYear(), view.getMonth(), 0).getDate();
    const selectedDay = this.dataService?.currentDay;

    for (let i = firstDay - 1; i >= 0; i--) {
      grid.appendChild(this._calDay(daysInPrev - i, true, false));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isFuture = isCurrentMonth && d > today;
      const isToday = isCurrentMonth && d === today;
      const isSelected = isCurrentMonth && d === selectedDay;
      const btn = this._calDay(d, false, isFuture, isToday, isSelected);
      if (!isFuture && isCurrentMonth) {
        btn.addEventListener('click', () => {
          this._jumpToDay(d);
          this._closeAllDropdowns();
        });
      }
      grid.appendChild(btn);
    }
  }

  _calDay(day, otherMonth, isFuture, isToday = false, isSelected = false) {
    const btn = document.createElement('button');
    btn.textContent = day;
    btn.className = 'cal__day';
    if (otherMonth) btn.classList.add('cal__day--other-month');
    if (isFuture) btn.classList.add('cal__day--future');
    if (isToday) btn.classList.add('cal__day--today');
    if (isSelected) btn.classList.add('cal__day--selected');
    return btn;
  }

  _jumpToDay(day) {
    this.eventController?.changeDay(day);
  }

  async _onLogin(user) {
    this._cleanup();
    this.currentUser = user;
    this.preferences = this._loadPreferences();
    this._applyPreferences();

    try {
      this.ui.setUserStatus(user.email);
      this.ui.showDashboard();

      this.dataService = new HealthDataService(user.id);
      this.eventController = new EventController(
        this.auth,
        this.dataService,
        this.ui,
        this.notifService,
        waterMl => this._updateWaterBalance(waterMl),
        () => this._afterDataChange()
      );
      this.eventController.init();

      const today = new Date().getDate();
      await this.dataService.loadDayData(today);
      this.eventController.refreshUI();

      this._updateWaterBalance(this.dataService.dayData.water_ml);
      this._fetchRecommendation();
      await this._initCharts();
      await this._updateProfileSummary();
    } catch (err) {
      console.error('onLogin error:', err);
      this.ui.showError('Не удалось загрузить данные');
    }
  }

  _onLogout() {
    this._cleanup();
    this.currentUser = null;
    this.ui.showAuth();
  }

  _cleanup() {
    this.eventController?.destroy?.();
    Object.values(this.charts).forEach(chart => {
      try { chart.destroy(); } catch {}
    });
    if (this.chartRefreshTimer) clearTimeout(this.chartRefreshTimer);
    this.charts = {};
    this.dataService = null;
    this.eventController = null;
    this.chartRefreshTimer = null;
    this._closeProfileCenter();
  }

  _afterDataChange() {
    if (!this.dataService) return;
    this._updateProfileSummary();
    if (this.chartRefreshTimer) clearTimeout(this.chartRefreshTimer);
    this.chartRefreshTimer = setTimeout(() => this._initCharts(), 250);
    if (!document.getElementById('profileModal')?.classList.contains('hidden')) {
      this._renderProfileTab(this.profileTab);
    }
  }

  _updateWaterBalance(waterMl) {
    const glassesEl = document.getElementById('waterGlasses');
    const valueEl = document.getElementById('waterBalanceValue');
    if (!glassesEl || !valueEl) return;
    const total = 8;
    const filled = Math.min(Math.round((waterMl ?? 0) / 250), total);
    valueEl.textContent = `${filled}/${total}`;
    glassesEl.querySelectorAll('.glass').forEach((glass, index) =>
      glass.classList.toggle('filled', index < filled)
    );
  }

  async _initCharts() {
    if (!this.dataService || typeof Chart === 'undefined') return;

    let weekData = [];
    try {
      weekData = await this.dataService.loadWeekData();
    } catch {
      weekData = Array.from({ length: 7 }, () => this.dataService._defaults());
    }

    const vertLine = {
      id: 'verticalLine',
      beforeDatasetsDraw(chart) {
        const active = chart.getActiveElements();
        if (!active?.length) return;
        const { ctx, chartArea: { top, bottom } } = chart;
        const x = active[0].element.x;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
      }
    };

    const makeChart = (id, values, color, unit = '') => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      if (this.charts[id]) this.charts[id].destroy();
      this.charts[id] = new Chart(canvas, {
        type: 'line',
        data: {
          labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
          datasets: [{
            data: values,
            borderColor: color,
            backgroundColor: `${color}20`,
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#fff',
            pointBorderColor: color,
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { color: 'rgba(148,163,184,0.2)' }, ticks: { color: '#64748b' }, border: { display: false } },
            y: { grid: { color: 'rgba(148,163,184,0.2)' }, ticks: { color: '#64748b' }, border: { display: false }, beginAtZero: true }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(255,255,255,0.97)',
              titleColor: '#1e293b',
              bodyColor: color,
              borderColor: '#e2e8f0',
              borderWidth: 1,
              displayColors: false,
              callbacks: {
                label: ctx => `${ctx.parsed.y.toLocaleString('ru-RU')} ${unit}`
              }
            }
          }
        },
        plugins: [vertLine]
      });
    };

    makeChart('stepsChart', weekData.map(d => d.steps_km), '#10b981', 'шагов');
    makeChart('waterChart', weekData.map(d => d.water_ml), '#3b82f6', 'мл');
    makeChart('sleepChart', weekData.map(d => d.sleep_hours), '#8b5cf6', 'ч');
    makeChart('caloriesChart', weekData.map(d => d.calories), '#f97316', 'ккал');
  }

  _bindProfileCenter() {
    document.getElementById('profileModalClose')?.addEventListener('click', () => this._closeProfileCenter());
    document.getElementById('profileModalBackdrop')?.addEventListener('click', () => this._closeProfileCenter());
    document.getElementById('profileModalTabs')?.addEventListener('click', e => {
      const tab = e.target.closest('[data-tab]')?.dataset.tab;
      if (tab) this._renderProfileTab(tab);
    });
    document.getElementById('profileModalBody')?.addEventListener('click', e => this._handleProfileAction(e));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this._closeProfileCenter();
    });
  }

  _openProfileCenter(tab = 'profile') {
    if (!this.currentUser || !this.dataService) return;
    document.getElementById('profileModal')?.classList.remove('hidden');
    this._renderProfileTab(tab);
  }

  _closeProfileCenter() {
    document.getElementById('profileModal')?.classList.add('hidden');
  }

  async _renderProfileTab(tab) {
    if (!this.dataService || !this.currentUser) return;
    this.profileTab = tab;
    const titleMap = {
      profile: '\u041c\u043e\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c',
      activity: '\u041c\u043e\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c',
      achievements: '\u0414\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u044f',
      sleep: '\u0420\u0435\u0436\u0438\u043c \u0441\u043d\u0430',
      settings: '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438'
    };
    const title = document.getElementById('profileModalTitle');
    if (title) title.textContent = titleMap[tab] ?? '\u041c\u043e\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c';

    document.querySelectorAll('.profile-modal__tab').forEach(btn => {
      btn.classList.toggle('profile-modal__tab--active', btn.dataset.tab === tab);
    });

    const body = document.getElementById('profileModalBody');
    if (!body) return;
    body.innerHTML = '<div class="profile-loading">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>';

    const history = await this.dataService.loadHistory(14);
    const achievements = this._getAchievements(history);

    if (tab === 'profile') body.innerHTML = this._profileHtml(history, achievements);
    if (tab === 'activity') body.innerHTML = this._activityHtml(history);
    if (tab === 'achievements') body.innerHTML = this._achievementsHtml(achievements);
    if (tab === 'sleep') body.innerHTML = this._sleepHtml();
    if (tab === 'settings') body.innerHTML = this._settingsHtml();
  }

  _profileHtml(history, achievements) {
    const stats = this._summarize(history);
    const user = this.currentUser;
    return `
      <div class="profile-panel-grid">
        <section class="profile-panel profile-panel--accent">
          <div class="profile-avatar-lg">${this._initial(user.email)}</div>
          <h3>${this._escape(user.name ?? user.email.split('@')[0])}</h3>
          <p>${this._escape(user.email)}</p>
          <span>${String(user.id).startsWith('local_') ? '\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c' : 'PostgreSQL \u043f\u0440\u043e\u0444\u0438\u043b\u044c'}</span>
        </section>
        <section class="profile-panel">
          <h3>\u0421\u0432\u043e\u0434\u043a\u0430</h3>
          <div class="stat-list">
            <div><span>\u0421\u0435\u0440\u0438\u044f</span><strong>${stats.streak} \u0434\u043d.</strong></div>
            <div><span>\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441</span><strong>${stats.average}%</strong></div>
            <div><span>\u041d\u0430\u0433\u0440\u0430\u0434\u044b</span><strong>${achievements.filter(a => a.unlocked).length}/${achievements.length}</strong></div>
          </div>
        </section>
      </div>`;
  }

  _activityHtml(history) {
    const stats = this._summarize(history);
    const bars = history.slice(-7).map(item => {
      const completion = this.dataService.getCompletion(item.data);
      return `
        <div class="activity-day">
          <span>${item.date.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
          <div><i style="height:${Math.max(completion, 4)}%"></i></div>
          <strong>${completion}%</strong>
        </div>`;
    }).join('');

    return `
      <div class="profile-kpis">
        <div><span>\u0428\u0430\u0433\u0438 \u0437\u0430 7 \u0434\u043d\u0435\u0439</span><strong>${this._fmt(stats.steps)}</strong></div>
        <div><span>\u0412\u043e\u0434\u0430 \u0437\u0430 7 \u0434\u043d\u0435\u0439</span><strong>${this._fmt(stats.water)} \u043c\u043b</strong></div>
        <div><span>\u0421\u043e\u043d \u0432 \u0441\u0440\u0435\u0434\u043d\u0435\u043c</span><strong>${stats.sleepAvg} \u0447</strong></div>
        <div><span>\u041a\u0430\u043b\u043e\u0440\u0438\u0438 \u0437\u0430 7 \u0434\u043d\u0435\u0439</span><strong>${this._fmt(stats.calories)}</strong></div>
      </div>
      <div class="activity-chart">${bars}</div>`;
  }

  _achievementsHtml(achievements) {
    return `
      <div class="achievement-grid">
        ${achievements.map(item => `
          <article class="achievement-card ${item.unlocked ? 'achievement-card--unlocked' : ''}">
            <i class="${item.icon}"></i>
            <h3>${item.title}</h3>
            <p>${item.text}</p>
            <span>${item.unlocked ? '\u041f\u043e\u043b\u0443\u0447\u0435\u043d\u043e' : '\u0412 \u043f\u0440\u043e\u0446\u0435\u0441\u0441\u0435'}</span>
          </article>
        `).join('')}
      </div>`;
  }

  _sleepHtml() {
    return `
      <div class="settings-form">
        <label>\u041e\u0442\u0431\u043e\u0439 <input type="time" id="sleepStartPref" value="${this.preferences.sleepStart}"></label>
        <label>\u041f\u043e\u0434\u044a\u0435\u043c <input type="time" id="sleepEndPref" value="${this.preferences.sleepEnd}"></label>
        <label>\u0426\u0435\u043b\u044c \u0441\u043d\u0430, \u0447\u0430\u0441\u043e\u0432 <input type="number" id="sleepGoalPref" min="1" max="16" step="0.5" value="${this.dataService.dayData.sleep_goal}"></label>
        <label class="settings-toggle"><input type="checkbox" id="sleepReminderPref" ${this.preferences.sleepReminder ? 'checked' : ''}> \u041d\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u0442\u044c \u043e \u0440\u0435\u0436\u0438\u043c\u0435 \u0441\u043d\u0430</label>
        <button class="profile-action-btn" data-profile-action="save-sleep">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0440\u0435\u0436\u0438\u043c</button>
      </div>
      <div class="sleep-window">
        <span>\u041e\u043a\u043d\u043e \u0441\u043d\u0430</span>
        <strong>${this.preferences.sleepStart} - ${this.preferences.sleepEnd}</strong>
      </div>`;
  }

  _settingsHtml() {
    return `
      <div class="settings-form">
        <label>\u0426\u0432\u0435\u0442\u043e\u0432\u0430\u044f \u0442\u0435\u043c\u0430
          <select id="themePref">
            <option value="mint" ${this.preferences.theme === 'mint' ? 'selected' : ''}>\u041c\u044f\u0442\u0430</option>
            <option value="ocean" ${this.preferences.theme === 'ocean' ? 'selected' : ''}>\u041e\u043a\u0435\u0430\u043d</option>
            <option value="berry" ${this.preferences.theme === 'berry' ? 'selected' : ''}>\u042f\u0433\u043e\u0434\u0430</option>
            <option value="graphite" ${this.preferences.theme === 'graphite' ? 'selected' : ''}>\u0413\u0440\u0430\u0444\u0438\u0442</option>
          </select>
        </label>
        <label class="settings-toggle"><input type="checkbox" id="weatherEnabledPref" ${this.preferences.weatherEnabled ? 'checked' : ''}> \u041f\u043e\u0433\u043e\u0434\u043d\u044b\u0435 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438 \u043f\u043e \u0432\u043e\u0434\u0435</label>
        <label class="settings-toggle"><input type="checkbox" id="compactModePref" ${this.preferences.compactMode ? 'checked' : ''}> \u041a\u043e\u043c\u043f\u0430\u043a\u0442\u043d\u044b\u0439 \u0440\u0435\u0436\u0438\u043c \u043a\u0430\u0440\u0442\u043e\u0447\u0435\u043a</label>
        <label class="settings-toggle"><input type="checkbox" id="goalNotificationsPref" ${this.preferences.goalNotifications ? 'checked' : ''}> \u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f \u043e \u0446\u0435\u043b\u044f\u0445</label>
        <button class="profile-action-btn" data-profile-action="save-settings">\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438</button>
      </div>`;
  }

  async _handleProfileAction(e) {
    const action = e.target.closest('[data-profile-action]')?.dataset.profileAction;
    if (!action) return;

    if (action === 'save-sleep') {
      this.preferences.sleepStart = document.getElementById('sleepStartPref')?.value || this.preferences.sleepStart;
      this.preferences.sleepEnd = document.getElementById('sleepEndPref')?.value || this.preferences.sleepEnd;
      this.preferences.sleepReminder = !!document.getElementById('sleepReminderPref')?.checked;
      const sleepGoal = Number(document.getElementById('sleepGoalPref')?.value);
      if (sleepGoal > 0) {
        await this.dataService.saveMetric('sleep_hours', null, sleepGoal);
        this.eventController?.refreshUI();
      }
      this._savePreferences();
      this.ui.showSuccess('\u0420\u0435\u0436\u0438\u043c \u0441\u043d\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d');
      this._renderProfileTab('sleep');
    }

    if (action === 'save-settings') {
      this.preferences.theme = document.getElementById('themePref')?.value || 'mint';
      this.preferences.weatherEnabled = !!document.getElementById('weatherEnabledPref')?.checked;
      this.preferences.compactMode = !!document.getElementById('compactModePref')?.checked;
      this.preferences.goalNotifications = !!document.getElementById('goalNotificationsPref')?.checked;
      this._savePreferences();
      this._applyPreferences();
      this._fetchRecommendation();
      this.ui.showSuccess('\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b');
    }
  }

  async _updateProfileSummary() {
    if (!this.dataService) return;
    const history = await this.dataService.loadHistory(14);
    const stats = this._summarize(history);
    const achievements = this._getAchievements(history);
    this._setText('profileStreak', stats.streak);
    this._setText('profileBadges', achievements.filter(a => a.unlocked).length);
    this._setText('profileHealth', `${this.dataService.getCompletion()}%`);
  }

  _summarize(history) {
    const recent = history.slice(-7);
    const completions = recent.map(item => this.dataService.getCompletion(item.data));
    const average = completions.length
      ? Math.round(completions.reduce((sum, value) => sum + value, 0) / completions.length)
      : 0;
    let streak = 0;
    for (const item of [...history].reverse()) {
      if (this.dataService.getCompletion(item.data) >= 80) streak += 1;
      else break;
    }
    return {
      average,
      streak,
      steps: recent.reduce((sum, item) => sum + (item.data.steps_km ?? 0), 0),
      water: recent.reduce((sum, item) => sum + (item.data.water_ml ?? 0), 0),
      calories: recent.reduce((sum, item) => sum + (item.data.calories ?? 0), 0),
      sleepAvg: recent.length
        ? (recent.reduce((sum, item) => sum + (item.data.sleep_hours ?? 0), 0) / recent.length).toFixed(1)
        : '0.0'
    };
  }

  _getAchievements(history) {
    const today = this.dataService.dayData;
    const stats = this._summarize(history);
    const completion = this.dataService.getCompletion(today);
    const activeDays = history.filter(item => this.dataService.getCompletion(item.data) >= 50).length;
    return [
      { title: '\u041f\u0435\u0440\u0432\u044b\u0439 \u0448\u0430\u0433', text: '\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u043b\u044e\u0431\u0443\u044e \u043c\u0435\u0442\u0440\u0438\u043a\u0443 \u0434\u043d\u044f', icon: 'fas fa-circle-check', unlocked: ['water_ml', 'calories', 'sleep_hours', 'steps_km'].some(k => today[k] > 0) },
      { title: '\u0413\u0438\u0434\u0440\u043e\u0431\u0430\u043b\u0430\u043d\u0441', text: '\u0414\u043e\u0441\u0442\u0438\u0447\u044c \u0446\u0435\u043b\u0438 \u043f\u043e \u0432\u043e\u0434\u0435', icon: 'fas fa-droplet', unlocked: today.water_goal > 0 && today.water_ml >= today.water_goal },
      { title: '\u0414\u0432\u0438\u0436\u0435\u043d\u0438\u0435', text: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u0446\u0435\u043b\u044c \u043f\u043e \u0448\u0430\u0433\u0430\u043c', icon: 'fas fa-person-walking', unlocked: today.steps_goal > 0 && today.steps_km >= today.steps_goal },
      { title: '\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435', text: '\u0412\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0446\u0435\u043b\u044c \u0441\u043d\u0430', icon: 'fas fa-bed', unlocked: today.sleep_goal > 0 && today.sleep_hours >= today.sleep_goal },
      { title: '\u0411\u0430\u043b\u0430\u043d\u0441 \u0434\u043d\u044f', text: '\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u0434\u043d\u044f \u0432\u044b\u0448\u0435 80%', icon: 'fas fa-gauge-high', unlocked: completion >= 80 },
      { title: '\u0421\u0435\u0440\u0438\u044f', text: '\u0422\u0440\u0438 \u0434\u043d\u044f \u043f\u043e\u0434\u0440\u044f\u0434 \u0432\u044b\u0448\u0435 80%', icon: 'fas fa-chart-line', unlocked: stats.streak >= 3 },
      { title: '\u0410\u043a\u0442\u0438\u0432\u043d\u0430\u044f \u043d\u0435\u0434\u0435\u043b\u044f', text: '\u041f\u044f\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0434\u043d\u0435\u0439 \u0437\u0430 2 \u043d\u0435\u0434\u0435\u043b\u0438', icon: 'fas fa-calendar-check', unlocked: activeDays >= 5 },
      { title: '\u0421\u0442\u0430\u0431\u0438\u043b\u044c\u043d\u043e\u0441\u0442\u044c', text: '\u0421\u0440\u0435\u0434\u043d\u0438\u0439 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043d\u0435\u0434\u0435\u043b\u0438 \u0432\u044b\u0448\u0435 70%', icon: 'fas fa-award', unlocked: stats.average >= 70 }
    ];
  }

  _defaultPreferences() {
    return {
      weatherEnabled: true,
      compactMode: false,
      goalNotifications: true,
      theme: 'mint',
      sleepStart: '23:00',
      sleepEnd: '07:00',
      sleepReminder: true
    };
  }

  _preferencesKey() {
    return `health_preferences_${this.currentUser?.id ?? 'guest'}`;
  }

  _loadPreferences() {
    try {
      const raw = localStorage.getItem(this._preferencesKey());
      return { ...this._defaultPreferences(), ...(raw ? JSON.parse(raw) : {}) };
    } catch {
      return this._defaultPreferences();
    }
  }

  _savePreferences() {
    localStorage.setItem(this._preferencesKey(), JSON.stringify(this.preferences));
  }

  _applyPreferences() {
    document.body.classList.toggle('compact-mode', !!this.preferences.compactMode);
    document.body.dataset.theme = this.preferences.theme || 'mint';
    this.notifService.enabled = !!this.preferences.goalNotifications;
  }

  _updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const count = this.notifService.unreadCount();
    badge.textContent = count > 9 ? '9+' : count;
    badge.classList.toggle('hidden', count === 0);
    document.getElementById('notifBtn')?.classList.toggle('header__icon-btn--has-notif', count > 0);
  }

  _renderNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;
    const items = this.notifService._items;

    if (!items.length) {
      list.innerHTML = '<div class="notif__empty"><i class="far fa-message"></i><p>Уведомлений пока нет</p></div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="notif-item ${item.cls} ${item.read ? '' : 'notif-item--unread'}">
        <div class="notif-item__icon"><i class="${this._escape(item.icon)}"></i></div>
        <div class="notif-item__body">
          <p class="notif-item__title">${this._escape(item.title)}</p>
          <p class="notif-item__text">${this._escape(item.text)}</p>
          <p class="notif-item__time">${this.notifService.timeAgo(item.time)}</p>
        </div>
      </div>`).join('');
  }

  async _fetchRecommendation() {
    const statusEl = document.getElementById('recommendationStatus');
    const recommendedEl = document.getElementById('recommendedWater');
    const tempEl = document.getElementById('weatherTemp');
    if (!this.preferences.weatherEnabled) {
      if (statusEl) statusEl.textContent = 'Погодные советы отключены';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/weather/hydration`);
      if (!res.ok) throw new Error('Weather API unavailable');
      const data = await res.json();
      const weather = data.weather ?? {};
      if (statusEl) statusEl.textContent = data.status ?? 'Норма';
      if (recommendedEl) recommendedEl.textContent = data.recommendedWater ?? 2000;
      if (tempEl) {
        const temp = Number(weather.temp ?? 0).toFixed(1);
        const humidity = Math.round(Number(weather.humidity ?? 0));
        tempEl.textContent = `${temp}°C, влажность ${humidity}%`;
      }
    } catch {
      if (statusEl) statusEl.textContent = 'Сервер погоды недоступен';
      if (tempEl) tempEl.textContent = '-';
    }
  }

  _bindFoodSearch() {
    document.getElementById('foodSearchBtn')?.addEventListener('click', () => this._searchFood());
    document.getElementById('foodQuery')?.addEventListener('keypress', event => {
      if (event.key === 'Enter') this._searchFood();
    });
    document.getElementById('foodResults')?.addEventListener('click', event => {
      const button = event.target.closest('[data-food-index]');
      if (!button) return;
      this._addFoodCalories(Number(button.dataset.foodIndex));
    });
  }

  async _searchFood() {
    const queryEl = document.getElementById('foodQuery');
    const resultsEl = document.getElementById('foodResults');
    const button = document.getElementById('foodSearchBtn');
    const query = queryEl?.value?.trim();

    if (!query) {
      if (resultsEl) resultsEl.innerHTML = '<p class="food-search__message">Введите название продукта</p>';
      return;
    }

    try {
      if (button) button.disabled = true;
      if (resultsEl) resultsEl.innerHTML = '<p class="food-search__message">Ищу продукты...</p>';

      const res = await fetch(`${API_BASE}/food/search?query=${encodeURIComponent(query)}&pageSize=8`);
      if (!res.ok) throw new Error('Food API unavailable');
      const data = await res.json();
      this.foodItems = data.foods ?? [];
      if (data.source === 'local' && resultsEl) {
        resultsEl.innerHTML = '<p class="food-search__message">API питания недоступен, использую локальный справочник</p>';
      }
      this._renderFoodResults();
    } catch {
      this.foodItems = this._findLocalFoods(query);
      if (resultsEl) {
        resultsEl.innerHTML = '<p class="food-search__message">Сервер недоступен, использую локальный справочник</p>';
      }
      this._renderFoodResults();
    } finally {
      if (button) button.disabled = false;
    }
  }

  _findLocalFoods(query) {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
    return LOCAL_FOODS
      .filter(food => food.terms.some(term => term.includes(normalized) || normalized.includes(term)))
      .map((food, index) => ({
        ...food,
        fdcId: `local-${index}`,
        brandOwner: 'Локальный справочник',
        dataType: 'Local'
      }))
      .slice(0, 8);
  }

  _renderFoodResults() {
    const resultsEl = document.getElementById('foodResults');
    if (!resultsEl) return;
    const status = resultsEl.querySelector('.food-search__message');
    const keepStatus = status && !status.textContent.includes('Ищу') ? status.outerHTML : '';

    if (!this.foodItems.length) {
      resultsEl.innerHTML = `${keepStatus}<p class="food-search__message">Ничего не найдено</p>`;
      return;
    }

    resultsEl.innerHTML = keepStatus + this.foodItems.map((food, index) => `
      <button class="food-item" type="button" data-food-index="${index}">
        <span class="food-item__body">
          <span class="food-item__title">${this._escape(food.description)}</span>
          <span class="food-item__meta">${this._escape(food.brandOwner || food.dataType || 'USDA')}</span>
        </span>
        <span class="food-item__calories">${this._fmt(Math.round(food.caloriesPer100g))} ккал</span>
      </button>
    `).join('');
  }

  async _addFoodCalories(index) {
    const food = this.foodItems[index];
    if (!food || !this.dataService || !this.eventController) return;

    const grams = Math.max(1, Number(document.getElementById('foodGrams')?.value ?? 100));
    const calories = Math.round(Number(food.caloriesPer100g ?? 0) * grams / 100);
    if (!calories) {
      this.ui.showError('У продукта нет данных по калориям');
      return;
    }

    const previousValue = this.dataService.dayData.calories ?? 0;
    await this.dataService.saveMetric('calories', calories, null);
    this.notifService?.checkGoals(this.dataService.dayData, 'calories', previousValue);
    this.eventController.refreshUI();
    this.ui.showSuccess(`Добавлено ${this._fmt(calories)} ккал`);
  }

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  _fmt(value) {
    return Number(value ?? 0).toLocaleString('ru-RU');
  }

  _initial(email) {
    return (email?.[0] ?? 'U').toUpperCase();
  }

  _escape(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.healthApp = new App();
  window.healthApp.start();
});
