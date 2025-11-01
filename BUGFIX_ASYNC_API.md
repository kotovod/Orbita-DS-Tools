# Bugfix: Async API Calls

## Проблема

```
Ошибка при сборе информации: in get_mainComponent: 
Cannot call with documentAccess: dynamic-page. 
Use node.getMainComponentAsync instead.
```

## Причина

В новых версиях Figma Plugin API многие методы требуют асинхронного вызова, особенно при работе с:
- `mainComponent` у Instance
- `getVariableById()` для получения переменных

## Исправление

### 1. mainComponent → getMainComponentAsync()

**Было:**
```javascript
info.mainComponent = node.mainComponent ? {
  name: node.mainComponent.name,
  id: node.mainComponent.id
} : null;
```

**Стало:**
```javascript
try {
  const mainComponent = await node.getMainComponentAsync();
  if (mainComponent) {
    info.mainComponent = {
      name: mainComponent.name,
      id: mainComponent.id
    };
  }
} catch (e) {
  console.log('Не удалось получить mainComponent:', e.message);
  info.mainComponent = null;
}
```

### 2. getVariableById() → getVariableByIdAsync()

**Было:**
```javascript
const variable = figma.variables.getVariableById(fill.boundVariables.color.id);
```

**Стало:**
```javascript
const variable = await figma.variables.getVariableByIdAsync(fill.boundVariables.color.id);
```

### 3. Обработка fills через цикл вместо map

**Было:**
```javascript
info.fills = node.fills.map(fill => {
  // async код внутри - не работает!
});
```

**Стало:**
```javascript
info.fills = [];
for (const fill of node.fills) {
  // async код работает корректно
  info.fills.push(fillInfo);
}
```

## Затронутые функции

- ✅ `extractNodeInfo()` - добавлен await для всех async операций
- ✅ Обработка fills
- ✅ Обработка fontSizeVariable
- ✅ Обработка mainComponent для Instance

## Результат

Теперь плагин корректно работает с новым Figma Plugin API и не выдаёт ошибок при сборе информации о дизайне для AI Design Lint.

## Тестирование

Для проверки:
1. Выбери компонент с Instance внутри
2. Запусти AI Design Lint
3. Проверь, что анализ проходит без ошибок
4. Убедись, что информация о mainComponent собирается корректно

---

**Дата исправления:** 6 октября 2025  
**Версия плагина:** 2.0.1

