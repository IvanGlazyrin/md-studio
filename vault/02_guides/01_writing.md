---
title: Как писать заметки
nav_title: Пишем заметки
nav_order: 1
---

Обычный Markdown с Obsidian-надстройкой. Студия сама превращает это в страницу.

## Frontmatter

```yaml
---
title: Название страницы
nav_title: Что видно в меню
nav_order: 3
---
```

`nav_title` и `nav_order` опциональны: без них в меню попадёт `title`, а
порядок задастся именем файла. Полный список — в
[[03_reference/01_frontmatter|справочнике frontmatter]].

## Код

````markdown
```ts
export const answer = 42;
```
````

Подсветка синтаксиса — Prism, языки: TypeScript, JavaScript, Python, Go, Rust,
Bash, PowerShell, JSON, YAML, Markdown, GDScript.

## Таблицы

| Ключ | Тип | По умолчанию |
| --- | --- | --- |
| `title` | string | имя файла |
| `nav_order` | number | `Infinity` |

## Формулы

Внутри строки — $E = mc^2$, отдельным блоком:

$$
\frac{\partial u}{\partial t} = \alpha \nabla^2 u
$$

## Callout-ы

> [!note]
> Обычная заметка с рамкой.

> [!tip] Заголовок callout-а
> Тело callout-а. Типы: `note`, `tip`, `warning`, `danger`, `info`.

## Изображения

Картинки лежат рядом с заметкой и подставляются относительным путём:

![Схема студии](../assets/studio-architecture.svg)

Файл отдаётся через `/api/vault/image`: путь проверяется на выход за пределы
папки, а отдаются только файлы-картинки.
