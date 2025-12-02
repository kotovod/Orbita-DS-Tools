# 🐛 Проблема: Неправильное определение режима Light/Dark

## Описание проблемы

При тестировании обнаружена проблема: плагин неправильно определяет режим (Light/Dark) для текстовых элементов, что приводит к выбору неправильного токена.

### Пример проблемы:

```
Элемент: Text с цветом #F3F4F5
Контекст: Текст внутри фрейма с режимом Dark
Ожидаемый токен: orb-text/primary (Dark = #F3F4F5)
Фактический токен: orb-text/inverse (Light = #F3F4F5) ❌
```

### Причина:

HEX `#F3F4F5` соответствует двум токенам:
- `orb-text/primary` → Dark = `#F3F4F5` ✅
- `orb-text/inverse` → Light = `#F3F4F5` ❌

Плагин должен определить режим по родительскому фрейму, но выбирает неправильный токен.

---

## 🔍 Анализ логики определения режима

### Функция `getThemeModeForNode(node, savedVariables)`

**Задача:** Определить режим (Light/Dark) для узла, поднимаясь вверх по иерархии.

**Алгоритм:**
1. Найти коллекцию `1.Theme` в savedVariables
2. Вызвать `getModeForCollection(node, "1.Theme", savedVariables)`
3. Если режим не найден → вернуть `"Light"` по умолчанию

```javascript
function getThemeModeForNode(node, savedVariables) {
  const themeCollectionName = Object.keys(savedVariables).find(name => 
    name.startsWith('1.') || name.startsWith('1 ')
  );
  
  if (!themeCollectionName) {
    return 'Light'; // По умолчанию
  }
  
  const mode = getModeForCollection(node, themeCollectionName, savedVariables);
  
  if (!mode) {
    return 'Light'; // По умолчанию
  }
  
  return mode;
}
```

---

### Функция `getModeForCollection(node, collectionName, savedVariables)`

**Задача:** Найти активный режим для коллекции, поднимаясь вверх по иерархии.

**Алгоритм:**
1. Получить все локальные коллекции через `figma.variables.getLocalVariableCollections()`
2. Найти коллекцию по имени
3. Подниматься вверх по иерархии от узла к родителям:
   - Проверить `node.resolvedVariableModes[collectionId]`
   - Проверить `node.explicitVariableModes[collectionId]`
   - Если найден modeId → вернуть имя режима
4. Если не найден → вернуть первый режим из коллекции

```javascript
function getModeForCollection(node, collectionName, savedVariables) {
  let currentNode = node;
  const localCollections = figma.variables.getLocalVariableCollections();
  const targetCollection = localCollections.find(c => c.name === collectionName);
  
  if (targetCollection) {
    // Идём вверх по иерархии
    while (currentNode) {
      const resolvedModes = currentNode.resolvedVariableModes || {};
      const explicitModes = currentNode.explicitVariableModes || {};
      
      const modeId = resolvedModes[targetCollection.id] || explicitModes[targetCollection.id];
      
      if (modeId) {
        const mode = targetCollection.modes.find(m => m.modeId === modeId);
        if (mode) {
          return mode.name; // Нашли!
        }
      }
      
      // Переходим к родителю
      if (currentNode.parent && currentNode.parent.type !== 'PAGE') {
        currentNode = currentNode.parent;
      } else {
        break;
      }
    }
    
    // Не нашли → возвращаем первый режим
    if (targetCollection.modes.length > 0) {
      return targetCollection.modes[0].name;
    }
  }
  
  return null;
}
```

---

## 🧪 Тестирование с новыми логами

После добавления детальных логов в код, при запуске проверки вы увидите:

```
🎨 getThemeModeForNode: Определяем режим темы для узла "Test Text"
   ✓ Коллекция темы: "1. Theme"

🔍 getModeForCollection: Ищем режим для коллекции "1. Theme"
   Начальный узел: Test Text (TEXT)
   ✓ Коллекция найдена локально, ID: VariableCollectionId:123:456
   Доступные режимы: Light, Dark
   
   [0] Проверяем узел: Test Text (TEXT)
   ⚠️ Режим не найден на узле "Test Text"
   
   [1] Проверяем узел: Dark Container (FRAME)
   ✅ Найден режим "Dark" на узле "Dark Container"
   
✅ Режим темы: "Dark"
```

---

## ✅ Что работает правильно

Логика определения режима **работает корректно**:
1. ✅ Поднимается вверх по иерархии
2. ✅ Проверяет `resolvedVariableModes` и `explicitVariableModes`
3. ✅ Находит режим на родительском фрейме
4. ✅ Возвращает правильное имя режима

---

## ❌ Где может быть проблема

### Проблема 1: Поиск токена игнорирует режим

В функции `findColorVariable` после определения режима:

```javascript
const themeMode = getThemeModeForNode(node, savedVariables);
console.log(`✓ Режим 1.Theme для объекта: ${themeMode}`);
```

Плагин **правильно определяет** `themeMode = "Dark"`, но затем может искать токены неправильно.

**Проверьте строку ~2225 в `findColorVariable`:**

```javascript
// Ищем совпадение в 1.Theme
for (const themeVar of theme1Variables) {
  const colorInThemeMode = themeVar.modes[themeMode]; // ← Правильно ли используется themeMode?
  
  if (colorInThemeMode && typeof colorInThemeMode === 'string') {
    const themeParsed = parseColorString(colorInThemeMode);
    
    if (colorsMatch(themeParsed.hex, themeParsed.opacity, hexColor, opacity)) {
      // Найдено совпадение!
      return themeVar;
    }
  }
}
```

### Проблема 2: Поиск в неправильном режиме

Возможно, плагин ищет токен не в том режиме. Проверьте логи:

```javascript
console.log(`🔍 Ищем финальный цвет ${hexColor} в коллекции 1.Theme (режим объекта: ${themeMode})`);

for (const variable of themeVisibleVariables) {
  const colorInMode = variable.modes[themeMode]; // ← ВАЖНО: используем режим объекта!
  
  console.log(`   Проверяем переменную: ${variable.name}`);
  console.log(`   Цвет в режиме ${themeMode}: ${colorInMode}`);
  
  if (colorInMode && typeof colorInMode === 'string') {
    const parsed = parseColorString(colorInMode);
    
    if (colorsMatch(parsed.hex, parsed.opacity, hexColor, opacity)) {
      console.log(`   ✅ Найдено совпадение!`);
      return variable;
    }
  }
}
```

### Проблема 3: Проверка всех режимов вместо одного

Возможно, есть участок кода, который проверяет **все режимы** токена, а не только нужный:

```javascript
// ❌ НЕПРАВИЛЬНО: проверяем все режимы
for (const variable of allVariables) {
  for (const modeName in variable.modes) {
    const color = variable.modes[modeName];
    if (colorsMatch(color, hexColor)) {
      return variable; // Может вернуть inverse в Light режиме!
    }
  }
}

// ✅ ПРАВИЛЬНО: проверяем только нужный режим
for (const variable of allVariables) {
  const color = variable.modes[themeMode]; // Только Dark режим!
  if (color && colorsMatch(color, hexColor)) {
    return variable;
  }
}
```

---

## 🔧 Исправление

### Вариант 1: Улучшить логи для диагностики

Добавьте детальные логи в `findColorVariable` в месте, где происходит финальный поиск в 1.Theme:

```javascript
// В функции findColorVariable, примерно строка 2220
console.log(`\n📍 ШАГ 2: Ищем переменные напрямую в коллекции 1.Theme`);
console.log(`   Ищем цвет: ${hexColor} (opacity: ${Math.round(opacity * 100)}%)`);
console.log(`   Режим объекта: ${themeMode}`); // ← Проверьте этот лог!
console.log(`   Тип узла: ${node.type}, Имя узла: ${node.name}`);

const themeVisibleVariables = allColorVariables.filter(v => {
  return v.collectionName === themeCollectionName && 
         v.hiddenFromPublishing !== true &&
         isScopeCompatible(v.scopes, requiredScopes);
});

console.log(`   ✓ Найдено ${themeVisibleVariables.length} видимых переменных в 1.Theme`);

// Ищем совпадения
for (const variable of themeVisibleVariables) {
  // ВАЖНО: проверяем ТОЛЬКО режим объекта!
  const colorInMode = variable.modes[themeMode];
  
  console.log(`\n   Проверяем переменную: ${variable.name}`);
  console.log(`      Доступные режимы: ${Object.keys(variable.modes).join(', ')}`);
  console.log(`      Цвет в режиме "${themeMode}": ${colorInMode}`);
  
  if (colorInMode && typeof colorInMode === 'string') {
    const parsed = parseColorString(colorInMode);
    console.log(`      Parsed HEX: ${parsed.hex}, opacity: ${Math.round(parsed.opacity * 100)}%`);
    
    if (colorsMatch(parsed.hex, parsed.opacity, hexColor, opacity)) {
      console.log(`      ✅ СОВПАДЕНИЕ! Выбираем ${variable.name}`);
      return {
        name: variable.name,
        key: variable.key,
        id: variable.id,
        scopes: variable.scopes,
        modes: variable.modes,
        collectionName: variable.collectionName,
        matchedMode: themeMode
      };
    } else {
      console.log(`      ❌ Не совпадает`);
    }
  }
}
```

### Вариант 2: Убедиться, что режим передаётся правильно

Проверьте, что `themeMode` правильно передаётся во все функции поиска:

```javascript
// В начале findColorVariable
function findColorVariable(hexColor, opacity, propertyType, savedVariables, node) {
  console.log(`🎨 Ищем цветовую переменную для ${propertyType}: ${hexColor} (opacity: ${Math.round(opacity * 100)}%)`);
  
  // ... код ...
  
  // Получаем режим 1.Theme для узла
  const themeMode = getThemeModeForNode(node, savedVariables);
  console.log(`✓ Режим 1.Theme для объекта: ${themeMode}`);
  
  // ⚠️ ПРОВЕРЬТЕ: передаётся ли themeMode дальше?
  // Во всех местах, где ищем в 1.Theme, должен использоваться themeMode!
}
```

### Вариант 3: Добавить фильтрацию по режиму

Если проблема в том, что ищутся токены из всех режимов, добавьте явную фильтрацию:

```javascript
// Фильтруем переменные, которые имеют значение в нужном режиме
const themeMatchingVariables = [];

for (const variable of themeFilteredVariables) {
  // Проверяем ТОЛЬКО режим объекта (Light или Dark)
  const colorInMode = variable.modes[themeMode];
  
  if (!colorInMode) {
    console.log(`   ⚠️ Переменная ${variable.name} не имеет цвета в режиме ${themeMode}, пропускаем`);
    continue; // Пропускаем переменные без значения в этом режиме
  }
  
  if (typeof colorInMode === 'string') {
    const parsed = parseColorString(colorInMode);
    
    if (colorsMatch(parsed.hex, parsed.opacity, hexColor, opacity)) {
      themeMatchingVariables.push({
        name: variable.name,
        key: variable.key,
        id: variable.id,
        scopes: variable.scopes,
        modes: variable.modes,
        collectionName: variable.collectionName,
        matchedMode: themeMode
      });
      console.log(`   ✅ Найдено совпадение в 1.Theme: ${variable.name} в режиме ${themeMode}`);
    }
  }
}
```

---

## 📊 План действий

### Шаг 1: Запустить тест с логами (5 минут)

1. Сохраните изменения в `code.js` (логи уже добавлены)
2. Перезагрузите плагин в Figma
3. Создайте тест:
   ```
   Frame "Dark Container" [Режим: Dark из 1.Theme]
     └─ Text "Test" [Цвет: #F3F4F5]
   ```
4. Запустите проверку
5. Откройте консоль: `Plugins → Development → Open Console`
6. Скопируйте все логи

### Шаг 2: Анализ логов (5 минут)

Ищите в логах:

```
🎨 getThemeModeForNode: Определяем режим темы...
   ✅ Режим темы: "Dark"  ← Должно быть Dark!

📍 ШАГ 2: Ищем переменные напрямую в коллекции 1.Theme
   Режим объекта: Dark  ← Должно быть Dark!
   
   Проверяем переменную: orb-text/primary
      Цвет в режиме "Dark": #F3F4F5  ← Должен совпадать!
      ✅ СОВПАДЕНИЕ!
```

Если видите:
```
   ✅ Выбрана переменная: orb-text/inverse
```
Значит проблема в логике выбора.

### Шаг 3: Найти проблемное место (10 минут)

Если `themeMode = "Dark"`, но выбирается `inverse`, значит:
- Либо ищется не в том режиме
- Либо `inverse` находится раньше в списке
- Либо есть приоритет по другому критерию

Проверьте код в районе строк:
- 2175-2262 (ШАГ 2 в findColorVariable)
- Ищите, где происходит выбор токена

### Шаг 4: Исправить логику (15 минут)

Возможные исправления:

**A) Явно указать режим в фильтрации:**
```javascript
const themeVisibleVariables = allColorVariables.filter(v => {
  if (v.collectionName !== themeCollectionName) return false;
  if (v.hiddenFromPublishing === true) return false;
  if (!isScopeCompatible(v.scopes, requiredScopes)) return false;
  
  // НОВОЕ: проверяем, что у переменной есть значение в нужном режиме
  const colorInMode = v.modes[themeMode];
  if (!colorInMode) return false;
  
  return true;
});
```

**B) Добавить сортировку по имени:**
```javascript
// Если найдено несколько совпадений, предпочитаем primary над inverse
themeMatchingVariables.sort((a, b) => {
  // primary имеет приоритет над inverse
  if (a.name.includes('primary') && b.name.includes('inverse')) return -1;
  if (a.name.includes('inverse') && b.name.includes('primary')) return 1;
  return 0;
});
```

**C) Добавить проверку режима токена:**
```javascript
// Проверяем, что токен "предназначен" для этого режима
// т.е. его основное значение в этом режиме
function isTokenIntendedForMode(variable, mode, hexColor) {
  // Если токен называется inverse, он для Light режима
  if (variable.name.includes('inverse') && mode === 'Dark') {
    return false; // inverse не для Dark режима
  }
  
  // Если токен называется primary, он для любого режима
  if (variable.name.includes('primary')) {
    return true;
  }
  
  return true;
}
```

---

## 📝 Резюме

### Логика определения режима работает ✅
- `getModeForCollection` правильно поднимается по иерархии
- `getThemeModeForNode` правильно определяет Light/Dark

### Проблема, скорее всего, в выборе токена ❌
- `findColorVariable` получает правильный `themeMode`
- Но может искать токен не в том режиме
- Или выбирать первый найденный токен без учета режима

### Следующие шаги:
1. ✅ Добавлены детальные логи (уже сделано)
2. 🔄 Запустить тест и проверить логи
3. 🔍 Найти место, где выбирается неправильный токен
4. 🔧 Исправить логику выбора

---

*Документация по отладке проблемы с определением режима Light/Dark*
*Для плагина Orbita DS Tools v3.x*
*Дата: Декабрь 2024*

