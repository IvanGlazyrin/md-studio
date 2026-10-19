# Релизы

Установщики собираются из этого репозитория: Electron-обёртка + Next standalone.

## Локально

```bash
npm run desktop:build   # без установщика: release/win-unpacked (или release/mac, release/linux)
npm run desktop:dist    # установщик: NSIS (Windows), DMG (macOS), AppImage (Linux)
```

## В CI

`.github/workflows/release.yml` собирает установщики на Windows, macOS и Linux.
Запуск: **Actions → Release (desktop) → Run workflow**, либо по тегу `v*`.

Артефакты workflow:

| Платформа | Файл |
| --- | --- |
| Windows | `MD Studio Setup <version>.exe` (NSIS) |
| macOS | `MD Studio-<version>.dmg` |
| Linux | `MD Studio-<version>.AppImage` |

Подпись: установщики не подписаны, поэтому Windows SmartScreen и Gatekeeper
предупреждают. Для публичного релиза нужен сертификат (и нотаризация macOS).

## Что попадает в пакет

- `electron/` — main и preload.
- `.next/standalone/` — Next-сервер со своим рантаймом.
- `vault/` — демо-хранилище, пока пользователь не выбрал свою папку.

`data/doc-todos.json` (файл TODO-заметок) в пакет не входит: он создаётся в
каталоге пользователя при первом запуске.
