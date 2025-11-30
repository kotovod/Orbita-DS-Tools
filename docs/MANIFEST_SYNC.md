# ✅ Манифесты Синхронизированы

**Дата:** 30 ноября 2025

---

## 📊 Сравнение манифестов

### Production (manifest.json) - 6 команд

| # | Название | Command |
|---|----------|---------|
| 1 | Icons Checker | check-icons |
| 2 | SVG Export icons | svg-export |
| 3 | Design System Validator β | design-system-validator |
| 4 | Node Inspector | node-id-inspector |
| 5 | Component Props Export | export-component-properties |
| 6 | Page Text Export | get-page-text |

---

### Development (manifest.dev.json) - 7 команд

| # | Название | Command |
|---|----------|---------|
| 1 | Icons Checker | check-icons |
| 2 | **AI Design Lint** 🔧 | ai-design-lint |
| 3 | Node Inspector | node-id-inspector |
| 4 | SVG Export icons | svg-export |
| 5 | Design System Validator | design-system-validator |
| 6 | Component Props Export | export-component-properties |
| 7 | Page Text Export | get-page-text |

---

## ✅ Изменения

### Все команды переведены на английский:

| Было (русский) | Стало (английский) |
|----------------|-------------------|
| Проверить иконки | Icons Checker ✅ |
| Экспорт иконок в SVG | SVG Export icons ✅ |
| Node ID Inspector | Node Inspector ✅ |
| Экспорт свойств компонентов | Component Props Export ✅ |
| Получить текст со страницы | Page Text Export ✅ |
| Design System Validator β | Design System Validator ✅ |

### Дополнительно:

- ✅ Добавлена команда "Page Text Export" в manifest.dev.json (была пропущена)
- ✅ Убрана "β" из названия в dev версии для единообразия
- ✅ Оба манифеста валидны
- ✅ Все команды синхронизированы

---

## 🔍 Различия между манифестами

### Только в manifest.dev.json:
- 🔧 **AI Design Lint** (в разработке, скрыт из production)
- 🌐 AI API домены в networkAccess

### Различия в порядке:
Production и Dev версии имеют **разный порядок** команд, но это не критично.

**Production порядок:**
1. Icons → 2. SVG → 3. DSV → 4. Node → 5. Props → 6. Text

**Dev порядок:**
1. Icons → 2. AI → 3. Node → 4. SVG → 5. DSV → 6. Props → 7. Text

---

## ✅ Валидация

```bash
✅ manifest.json - Валидный JSON
✅ manifest.dev.json - Валидный JSON
✅ Все команды на английском
✅ Нет дубликатов
✅ Все ID команд корректны
```

---

## 📝 Рекомендации

### Если хотите одинаковый порядок:

Можно синхронизировать порядок команд в dev версии с production, но это **опционально** - на функциональность не влияет.

### Production порядок (рекомендуемый):
```json
1. Icons Checker
2. SVG Export icons
3. Design System Validator
4. Node Inspector
5. Component Props Export
6. Page Text Export
```

Для Dev - добавить AI Design Lint после Icons Checker или в любое место по вашему усмотрению.

---

**Статус:** ✅ Синхронизировано и готово к использованию

