# Quick Fix v3.0.4 - Token Suggestions

**Проблема:** Плагин не предлагал токены на замену для fills/strokes

**Решение:** 
- Исправлена обработка массивов в `findTokenByValue()`
- Поддержка токенов из внешних библиотек
- Правильная привязка через `setBoundVariableForPaint()`

**Результат:** ✅ Кнопка "Исправить" теперь работает для fills/strokes с токенами из библиотек

---

## Ключевые изменения:

### 1. Поиск токенов
```javascript
// Было: получал JSON строку
const actualValue = getPropertyValue(node, prop.key); // "[{...}]"

// Стало: получает оригинальный массив
const rawValue = node[prop.key]; // [{type: "SOLID", color: {...}}]
```

### 2. Обработка массивов
```javascript
if (Array.isArray(value)) {
  const firstPaint = value[0];
  if (firstPaint.type === 'SOLID' && firstPaint.color) {
    return findTokenByValue(variables, firstPaint.color, propertyType);
  }
}
```

### 3. Поддержка алиасов
```javascript
let tokenValue = token.value;
if (token.isAlias && token.resolvedValue) {
  tokenValue = token.resolvedValue; // Используем разрешённое значение
}
```

### 4. Поиск в библиотеках
```javascript
// Ищем среди используемых переменных в документе
const allNodes = figma.currentPage.findAll();
// Собираем все boundVariables
// Ищем токен по имени
```

### 5. Привязка fills/strokes
```javascript
// Было: ❌ Ошибка
node.setBoundVariable('fills', variable);

// Стало: ✅ Работает
const newPaints = [...paints];
newPaints[0] = figma.variables.setBoundVariableForPaint(newPaints[0], 'color', variable);
node.fills = newPaints;
```

---

**Дата:** 16.10.2025
**Версия:** 3.0.4
**Файлы:** code.js, ui.html, manifest.json
