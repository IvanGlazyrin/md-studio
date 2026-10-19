# Публикация на GitHub

Репозиторий подготовлен локально: чистая история, README со скриншотами, CI и MIT-лицензия.
Осталось создать пустое публичное репо на github.com и залить код.

## 1. Создать репозиторий

На <https://github.com/new>:

| Поле | Значение |
| --- | --- |
| Repository name | `md-studio` |
| Visibility | **Public** |
| Initialize this repository with | **ничего** (README, .gitignore и лицензию мы уже добавили) |

Для второго проекта — `hf-assets`, шаги те же.

## 2. Добавить со-владельца

В репозитории: **Settings → Collaborators → Add people** → добавить `glazrus97@gmail.com`
с правом **Write**. У GitHub есть ограничение на количество со-владельцев с правом записи
(для организаций — 3, для личных аккаунтов — без жёсткого лимита), поэтому второго
владельца добавляйте как Collaborator с правом **Admin**, если Write не хватит.

## 3. Залить код

```powershell
cd C:\projects\md-studio
git remote add origin https://github.com/IvanGlazyrin/md-studio.git
git push -u origin main
```

`hf-assets` — то же самое, только путь к папке и URL другие.

## 4. Проверить

- <https://github.com/IvanGlazyrin/md-studio/actions> — зелёный CI (lint → typecheck → test → build).
- На странице репозитория: **Settings → General → Danger Zone** — удалить `main` из
  «Protected branches», если push ругается.
- Вкладка **Insights → Traffic** покажет, что на репозиторий заходят.

## Что уже внутри

- `README.md` со скриншотами (`docs/`), описанием возможностей и команд.
- `.github/workflows/ci.yml` — lint, typecheck, тесты и сборка на каждом пуше.
- `LICENSE` (MIT) и `CONTRIBUTORS.md` с владельцами.
- Демо-хранилище `vault/` — чтобы студия запускалась сразу, без своей папки.
- `data/doc-todos.json` в `.gitignore` — состояние приложения не коммитится.

## Владельцы

| Роль | Контакт |
| --- | --- |
| Автор | IvanGlazyrin <glazrus97@gmail.com> |
| Со-владелец | glazrus97@gmail.com |
