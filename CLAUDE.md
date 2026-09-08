# pp_shop_2.0 — ПАН ПАРКЕТ

Магазин підлогових покриттів + оренда будівельного інструменту + внутрішні інструменти
компанії (табель ПАН ПІВДЕНЬБУД). Публічний сайт і адмінка в одному React-застосунку.

## Стек

**Клієнт** — Vite 7 + React 18, react-router-dom 7, Tailwind v4 (`@tailwindcss/vite`),
lucide-react, react-quill (блог), jspdf + jspdf-autotable, exceljs, react-to-print.
**Сервер** — Express + Sequelize (PostgreSQL), міграції в `server/migrations`,
моделі в `server/models`, роути в `server/routes`, модуль угод/оренди в
`server/modules/orders-rental`. Деплой: Vercel (клієнт) + Railway (сервер).

```
npm run dev      # vite
npm run build    # vite build
npm run lint     # eslint
```

## Структура клієнта

```
src/
  pages/            публічні сторінки + pages/admin/*
  features/
    orders-rental/  угоди, заявки оренди, календар, документи (найновіший код,
                    правильна структура: pages / components / hooks / model / amounts / documents)
  components/
    admin/          AdminTable, AdminModal, AdminFilters, AdminPageHeader, ConfirmDialog
    admin/product/  блоки редактора картки товару
    ui/             button, card, badge, input, select (shadcn-подібні)
  context/          Auth, Cart, Favorites, Toast
  services/api.js   увесь HTTP-шар
  utils/            adminRoles, rentPricing, phoneUtils, transliterate, timesheetExport
```

`features/orders-rental` — зразок того, як має виглядати решта адмінки. Новий код
пишемо в такій самій структурі, а не пласким файлом на 60 КБ у `pages/admin`.

## Мова та термінологія

Весь інтерфейс — **українською**. Коментарі й назви змінних — англійською.
Глосарій адмінки — `docs/admin-redesign/00-plan.md`, розділ «Словник». Одна річ =
одна назва в усьому інтерфейсі. Якщо потрібна нова назва сутності — спершу в глосарій.

## Правила для адмінки

1. **Жодних inline `style={{}}`** у нових і зачеплених файлах. Стилі — через токени
   `src/styles/tokens.css` (`--ds-*`) і компоненти `src/features/admin/ui/*`.
   Кольори, шрифти, радіуси, щільність — тільки з токенів, жодних літералів.
   Числа, суми, дати, телефони, SKU, інв. № та серійні — `--ds-font-mono`
   з `font-variant-numeric: tabular-nums`.
   `src/pages/admin/Admin.css` підлягає видаленню: не додавати до нього правил
   і не імпортувати його в нові файли.
2. **Жодних `alert()` / `window.confirm()`** — тільки `ToastProvider` і `ConfirmDialog`.
3. **Один об'єкт — один екран — один URL.** Не заводити другий маршрут до тієї самої
   сутності. Дублікати маршрутів — джерело половини поточної плутанини.
4. **Списки не вантажать увесь каталог** заради клієнтського пошуку. Фільтрація й
   пошук — на сервері, пагінація обов'язкова для списків, що ростуть.
5. **Стан списку живе в URL** (`?tab=`, `?q=`, `?status=`), щоб повернення з картки
   не скидало фільтри.
6. Деструктивні дії називаються тим, що роблять, і показують наслідок до
   підтвердження (напр. видалення підрозділу знижує роль голови).

## База даних — обережно

`server/.env` вказує `DATABASE_URL` на **бойову базу Railway**. Локальний
`npm run dev` уже працює з продакшеном, а `npm run migrate`, запущений локально,
змінить бойові дані. Для розробки піднімати локальний PostgreSQL і окремий
`DATABASE_URL`. Перед будь-якою міграцією: `npm run db:backup` (або
`npm run db:export-json`, якщо немає `pg_dump`) + `npm run db:snapshot`, після —
`npm run db:verify` і повторний знімок. Кожна міграція має перевірений `down`.
Повний протокол — `docs/admin-redesign/03-screens.md`, розділ «Робота з базою».

## Поточна робота

Триває повний редизайн адмінки. **Перед будь-якою правкою в `src/pages/admin` або
`src/features/orders-rental` прочитати `docs/admin-redesign/00-plan.md`** — там нова
структура розділів, таблиця відповідності старих і нових маршрутів, порядок кроків
і критерії готовності. `docs/admin-redesign/01-inventory.md` — повна інвентаризація
чинного функціоналу (що саме має вціліти). `docs/admin-redesign/prototype.html` —
клікабельний прототип цільового інтерфейсу, відкривається у браузері.

Стан: кроки 1–3 (фундамент, маршрути, каркас) і 4.1–4.2 (токени, шрифти, каркас на
`--ds-*`) виконані. Далі — `docs/admin-redesign/02-visual.md` (візуальна мова) і
`docs/admin-redesign/03-screens.md` (повна специфікація екранів, порядок робіт,
контрольні точки, дозволені міграції).
