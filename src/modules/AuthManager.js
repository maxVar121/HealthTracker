// src/modules/AuthManager.js
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
  }

  init() {
    this.currentUser = this._loadCurrentUser();
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    if (this.currentUser) {
      try {
        listener(this.currentUser);
      } catch (e) {
        console.error(e);
      }
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentUser);
      } catch (e) {
        console.error(e);
      }
    });
  }

  async signIn(email, password) {
    return this._authenticate('login', email, password);
  }

  async signUp(email, password) {
    if (!this._isValidEmail(email)) {
      return { success: false, message: 'Некорректный email' };
    }
    return this._authenticate('register', email, password);
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.notifyListeners();
  }

  async signInDemo() {
    const email = 'demo@health.local';
    const user = this._loadLocalUser(email) ?? {
      id: this._localUserId(email),
      email,
      password: 'demo1234',
      name: 'Demo'
    };
    localStorage.setItem(this._localUserKey(email), JSON.stringify(user));
    this.currentUser = this._publicUser(user);
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    this.notifyListeners();
    return { success: true };
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async _authenticate(endpoint, email, password) {
    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        return endpoint === 'register'
          ? this._signUpLocal(email, password)
          : this._signInLocal(email, password);
      }

      if (!data.success) {
        if (endpoint === 'login') {
          const localResult = this._signInLocal(email, password);
          if (localResult.success) return localResult;
        }
        return { success: false, message: data.message || 'Ошибка авторизации' };
      }

      this.currentUser = this._publicUser(data.user);
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      this.notifyListeners();
      return { success: true };
    } catch {
      return endpoint === 'register'
        ? this._signUpLocal(email, password)
        : this._signInLocal(email, password);
    }
  }

  _signInLocal(email, password) {
    const user = this._loadLocalUser(email);
    if (!user || user.password !== password) {
      return { success: false, message: 'Неверный email или пароль' };
    }

    this.currentUser = this._publicUser(user);
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    this.notifyListeners();
    return { success: true };
  }

  _signUpLocal(email, password) {
    if (this._loadLocalUser(email)) {
      return { success: false, message: 'Email уже используется локально' };
    }

    const user = {
      id: this._localUserId(email),
      email,
      password,
      name: email.split('@')[0]
    };

    localStorage.setItem(this._localUserKey(email), JSON.stringify(user));
    this.currentUser = this._publicUser(user);
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    this.notifyListeners();
    return { success: true };
  }

  _loadLocalUser(email) {
    try {
      const raw = localStorage.getItem(this._localUserKey(email));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _localUserId(email) {
    return `local_${email.trim().toLowerCase()}`;
  }

  _localUserKey(email) {
    return `user_${email.trim().toLowerCase()}`;
  }

  _loadCurrentUser() {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _publicUser(user) {
    return {
      id: String(user.id),
      email: user.email,
      name: user.name ?? user.email.split('@')[0]
    };
  }
}
