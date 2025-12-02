# 🔧 Исправление: Async/Await для режима Dark

**Дата:** 2 декабря 2024  
**Проблема:** Плагин неправильно определял режим Light/Dark для текстовых элементов  
**Причина:** Отсутствие `async`/`await` в цепочке вызовов функций

---

## 🐛 Найденная проблема

### Из логов:
```
✓ Режим 1.Theme для объекта: [object Promise]  ← ОШИБКА!
```

```
🔍 Начинаем поиск совпадений в режиме "[object Promise]":
   Проверяем переменную: Colors/orb-text/primary
      Цвет в режиме "[object Promise]": НЕТ ЗНАЧЕНИЯ
```

**Функция возвращала Promise вместо строки!**

### Почему это происходило:

1. В `getModeForCollection` использовался `await figma.variables.getLocalVariableCollectionsAsync()`
2. НО функция не была объявлена как `async`
3. Поэтому она возвращала Promise
4. Вызывающий код не использовал `await`
5. Режим определялся как "[object Promise]"
6. Поиск токена всегда возвращал "НЕТ ЗНАЧЕНИЯ"

---

## ✅ Исправления

### 1. Сделали `getModeForCollection` асинхронной

```javascript
// БЫЛО:
function getModeForCollection(node, collectionName, savedVariables) {
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  // ...
}

// СТАЛО:
async function getModeForCollection(node, collectionName, savedVariables) {
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  // ...
}
```

### 2. Добавили `await` в `getThemeModeForNode`

```javascript
// БЫЛО:
const mode = getModeForCollection(node, themeCollectionName, savedVariables);

// СТАЛО:
const mode = await getModeForCollection(node, themeCollectionName, savedVariables);
```

**Функция уже была async**, поэтому достаточно было добавить `await`.

### 3. Сделали `findColorVariable` асинхронной

```javascript
// БЫЛО:
function findColorVariable(hexColor, opacity, propertyType, savedVariables, node) {
  const themeMode = getThemeModeForNode(node, savedVariables);
  // ...
}

// СТАЛО:
async function findColorVariable(hexColor, opacity, propertyType, savedVariables, node) {
  const themeMode = await getThemeModeForNode(node, savedVariables);
  // ...
}
```

### 4. Добавили `await` во всех вызовах `findColorVariable`

#### В функции `checkNumericVariables` (2 места):

```javascript
// БЫЛО:
suggestedToken = findColorVariable(item.value, item.opacity || 1, item.type, savedTokens.variables, item.node);

// СТАЛО:
suggestedToken = await findColorVariable(item.value, item.opacity || 1, item.type, savedTokens.variables, item.node);
```

#### В функции `fixDSVError`:

```javascript
// БЫЛО:
variableData = findColorVariable(error.value, error.opacity || 1, propertyType, savedTokens.variables, node);

// СТАЛО:
variableData = await findColorVariable(error.value, error.opacity || 1, propertyType, savedTokens.variables, node);
```

---

## 🎯 Результат

### До исправления:
```
✓ Режим 1.Theme для объекта: [object Promise]  ← ОШИБКА
🔍 Начинаем поиск совпадений в режиме "[object Promise]":
   Проверяем переменную: Colors/orb-text/primary
      Цвет в режиме "[object Promise]": НЕТ ЗНАЧЕНИЯ
❌ Не найдена подходящая переменная
✅ Выбрана переменная: orb-text/inverse  ← НЕПРАВИЛЬНО!
```

### После исправления (ожидается):
```
✓ Режим 1.Theme для объекта: Dark  ← ПРАВИЛЬНО!
🔍 Начинаем поиск совпадений в режиме "Dark":
   Проверяем переменную: Colors/orb-text/primary
      Цвет в режиме "Dark": #F3F4F5
✅ Найдено совпадение: orb-text/primary  ← ПРАВИЛЬНО!
```

---

## 📚 Дополнительная информация из логов

### Коллекции в Figma:

```
📚 Всего локальных коллекций: 1
Локальные коллекции: "Collection 1"
⚠️ Коллекция не найдена локально, используем savedVariables
✓ Найден режим из savedVariables: Light
```

**Вывод:** Коллекция "1. Theme" импортирована из библиотеки (не локальная).

---

## 🧪 Тестирование

### Шаги для проверки:

1. **Создайте тест-кейс:**
   - Создайте фрейм с названием "theme = dark"
   - Примените к нему appearance "Dark" из коллекции "1. Theme"
   - Создайте текстовый элемент внутри фрейма
   - Установите цвет текста `#F3F4F5` (без привязки к переменной)

2. **Запустите проверку:**
   - Выделите текстовый элемент
   - Запустите плагин DSV
   - Нажмите "Check Selection"

3. **Ожидаемый результат:**
   - Плагин должен предложить `orb-text/primary` (не `orb-text/inverse`)
   - В логах должно быть: `✓ Режим 1.Theme для объекта: Dark`

---

## ⚠️ Важные замечания

### Цепочка асинхронных вызовов:

```
figma.variables.getLocalVariableCollectionsAsync()  ← Async API
    ↓
getModeForCollection()  ← async function
    ↓
getThemeModeForNode()  ← async function
    ↓
findColorVariable()  ← async function
    ↓
checkNumericVariables() / fixDSVError()  ← async functions
```

**Все функции в цепочке должны быть async и использовать await!**

### Библиотечные коллекции:

- Коллекция "1. Theme" импортирована из библиотеки
- `getLocalVariableCollectionsAsync()` НЕ возвращает импортированные коллекции
- Используется fallback на `savedVariables` (JSON)
- **Важно:** Режим из `savedVariables` может быть неактуальным!

### Потенциальные улучшения:

1. Добавить поддержку библиотечных коллекций через API
2. Кешировать результаты `getLocalVariableCollectionsAsync()`
3. Добавить валидацию режимов перед использованием

---

## 📝 Изменённые файлы

- `code.js` (строки ~1565-2300):
  - `getModeForCollection` → `async`
  - `getThemeModeForNode` → добавлен `await`
  - `findColorVariable` → `async` + добавлен `await`
  - `checkNumericVariables` → добавлены `await` (2 места)
  - `fixDSVError` → добавлен `await`

---

*Исправление критического бага с режимом Light/Dark*  
*Orbita DS Tools v3.x*  
*Декабрь 2024*

