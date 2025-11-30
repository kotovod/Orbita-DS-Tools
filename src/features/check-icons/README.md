# Check Icons Module

Модуль для проверки иконок на соответствие стандартам Orbita DS.

## 📁 Структура

```
src/features/check-icons/
├── index.js           # Главный экспорт
├── handler.js         # Обработчик сообщений от UI
├── validator.js       # Логика валидации иконок
├── fixer.js           # Автоматическое исправление ошибок
└── utils.js           # Вспомогательные функции
```

## 🔧 Функции

### validator.js
- `checkIcons(settings)` - Главная функция проверки
- `findComponentSetsInNode(node)` - Рекурсивный поиск Component Sets
- `validateNaming(componentSet)` - Проверка именования
- `validateVariants(componentSet)` - Проверка вариантов (Variant, Size)
- `validateSize(component)` - Проверка размеров (32x32, 24x24, etc)
- `validateStructure(component)` - Проверка структуры (Color-layer, Vector)
- `validateColorVariable(colorLayer)` - Проверка цветовых переменных
- `validateVector(vectorLayer)` - Проверка векторного слоя
- `validateEditGroup(component)` - Проверка группы Edit
- `validateDescription(component)` - Проверка описания

### fixer.js
- `fixError(nodeId, errorType)` - Исправление одной ошибки
- `fixAllErrors(results)` - Исправление всех ошибок
- `fixNaming(node)` - Исправление именования
- `fixSize(node)` - Исправление размеров
- `fixConstraints(node)` - Исправление выравнивания
- `fixVectorLock(node)` - Блокировка Vector
- `fixEditVisibility(node)` - Скрытие группы Edit
- `fixStroke(node)` - Удаление обводки

### handler.js
- `handleCheckIcons(msg)` - Обработчик сообщения 'check-icons'
- `handleFixError(msg)` - Обработчик сообщения 'fix-error'
- `handleFixAllErrors(msg)` - Обработчик сообщения 'fix-all-errors'

### utils.js
- `sendProgress(message, percent)` - Отправка прогресса в UI
- `sendError(message)` - Отправка ошибки в UI
- `sendResults(results)` - Отправка результатов в UI

## 📊 Размер

**Всего:** ~710 строк (из code.js строки 873-1583)

**Распределение:**
- validator.js: ~500 строк (основная логика)
- fixer.js: ~150 строк (исправления)
- handler.js: ~50 строк (обработчики)
- utils.js: ~10 строк (утилиты)

## 🔗 Зависимости

- `src/common/debug.js` - debugLog, debugWarn
- `src/common/constants.js` - BATCH_SIZES
- `figma` - Figma Plugin API

## 🎯 Следующие шаги

1. ✅ Создать структуру файлов
2. ⏳ Извлечь код validator.js
3. ⏳ Извлечь код fixer.js
4. ⏳ Создать handler.js
5. ⏳ Создать utils.js
6. ⏳ Создать index.js
7. ⏳ Протестировать модуль

