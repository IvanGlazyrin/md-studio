---
title: Установка и запуск
nav_title: Установка
nav_order: 1
---

Нужен Node.js 20+ и npm. Дальше — три команды.

```bash
npm install
npm run dev
```

Студия откроется на `http://localhost:3000`. Всё, что лежит в `vault/`, будет
прочитано автоматически: боковое меню, поиск и оглавление строятся из папок.

## Проверка, что всё собралось

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run build       # статическая генерация всех страниц
```

> [!note] Один запуск — весь пайплайн
> `npm test` и `npm run build` читают одну и ту же папку `vault/`. Если тесты
> проходят, а сборка падает — почти всегда виноват конкретный документ,
> а не код. Начните с `npm run docs:stats`: он покажет, что студия вообще видит.

## Что дальше

- Настроить свою папку: [[01_getting_started/02_configuration]]
- Написать первую заметку: [[02_guides/01_writing]]
