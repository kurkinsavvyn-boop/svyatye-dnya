# Святые дня

Подготовка богослужебного списка: календарь «Азбуки веры», редактирование, Word и одностраничный PDF А4 с интервалом 1,5.

## Открыть сайт

https://kurkinsavvyn-boop.github.io/svyatye-dnya/

Версия GitHub Pages работает независимо от ChatGPT: календарь, шрифты и экспорт загружаются с GitHub. Аккаунт OpenAI не нужен. Доступность зависит от сети пользователя.

Календарь содержит предыдущий, текущий и следующий годы. GitHub Actions еженедельно обновляет ближайшие даты и публикует сайт. Если источник недоступен, обновление останавливается, предыдущая публикация остаётся доступна. Нераспознанные записи сохраняются с предупреждением для проверки.

## Разработка

Node.js 22.13+ и pnpm (версия указана в package.json).

- pnpm install --frozen-lockfile
- pnpm test
- pnpm typecheck
- pnpm calendar:prepare
- VITE_STATIC_CALENDAR=true pnpm dev:portable

## Сборка GitHub Pages

VITE_STATIC_CALENDAR=true SITE_BASE_PATH=/svyatye-dnya/ pnpm build:pages

Результат: outputs/standalone/public. Публикация настроена в .github/workflows/pages.yml. Дополнительные годы можно подготовить через CALENDAR_FIRST_YEAR и CALENDAR_LAST_YEAR.

## Серверная версия

Исходная версия Sites использует app/api/calendar/route.ts для загрузки произвольной даты. Самостоятельный Node.js-сервер описан в portable/README.md. GitHub Pages не выполняет серверный код.

## Проверки и ограничения

Регрессионные проверки покрывают имена, лики, ударения источника, сан, соборы и хронологию на сохранённых календарных страницах. Это не богословская экспертиза; перед чтением за богослужением проверьте список. Шрифт PDF — Liberation Serif (лицензия в public/fonts); Word — Times New Roman на компьютере получателя. Поделиться файлом можно в браузерах с Web Share API; скачивание доступно отдельно.
