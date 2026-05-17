# Трекер здоровья

Веб-приложение для учета воды, шагов, сна и калорий. Есть цели, прогресс, уведомления, достижения, профиль, темы оформления, поиск продуктов и рекомендация воды по погоде.

Frontend работает на Vite. Backend работает на Express и PostgreSQL. Если backend недоступен, приложение использует localStorage.

## Установка

```bash
npm install
```

## Настройка `.env`

Скопируйте пример:

```bash
cp .env.example .env
```

Для PowerShell:

```powershell
Copy-Item .env.example .env
```

Заполните `.env`:

```env
PORT=3001
PGUSER=postgres
PGHOST=localhost
PGDATABASE=health_tracker
PGPASSWORD=your_password
PGPORT=5432
FDC_API_KEY=DEMO_KEY
```

## Запуск

Frontend:

```bash
npm run dev
```

Backend:

```bash
npm run server
```

Frontend + backend вместе:

```bash
npm run dev:full
```

Обычно frontend открывается на `http://localhost:3000`, API на `http://localhost:3001/api`.

## Проверка

```bash
npm run check
npm run build
npm run smoke
```

`npm run smoke` требует запущенный backend и PostgreSQL.

## GitHub Pages

Для деплоя frontend уже добавлен workflow:

```text
.github/workflows/deploy-pages.yml
```

В настройках репозитория выберите:

```text
Settings -> Pages -> Source: GitHub Actions
```

GitHub Pages не запускает `server.js` и PostgreSQL. На Pages приложение будет работать как статический frontend с localStorage. Для полноценной базы backend нужно размещать отдельно.

## Скрипты

```bash
npm run dev          # frontend
npm run server       # backend
npm run dev:full     # frontend + backend
npm run build        # сборка
npm run check        # проверка синтаксиса
npm run smoke        # smoke-тест API
```
