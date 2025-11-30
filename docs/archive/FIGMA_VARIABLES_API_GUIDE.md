# Figma Variables API - Правильное использование

## 🎯 Важная информация

### ⚠️ Распространённая ошибка

**НЕ СУЩЕСТВУЕТ:**
```typescript
// ❌ НЕПРАВИЛЬНО - такого метода НЕТ!
figma.variables.getRemoteVariables()
```

### ✅ Правильный способ

**Единственный способ получить variables:**
```typescript
// ✅ ПРАВИЛЬНО - возвращает ВСЕ доступные variables
const allVariables = await figma.variables.getLocalVariablesAsync();
```

**Название метода вводит в заблуждение:**
- `getLocalVariablesAsync()` возвращает **ВСЕ** variables
- Включая **local** (созданные в текущем файле)
- Включая **remote** (из подключённых библиотек)

---

## 📚 Как различить Local и Remote

### Свойство `variable.remote`

Каждая variable имеет свойство `remote: boolean`:

```typescript
const allVariables = await figma.variables.getLocalVariablesAsync();

for (const variable of allVariables) {
  if (variable.remote === true) {
    // ✅ Это REMOTE variable (из библиотеки)
    console.log('Remote:', variable.name);
  } else {
    // ✅ Это LOCAL variable (из текущего файла)
    console.log('Local:', variable.name);
  }
}
```

---

## 🔧 Реализация в плагине

### Функция получения variables по режиму

```javascript
async function getVariablesByMode(mode) {
  const variablesMap = new Map();
  
  // 1. Получаем ВСЕ доступные variables
  const allVariables = await figma.variables.getLocalVariablesAsync();
  
  // 2. Фильтруем по режиму
  for (const variable of allVariables) {
    const isRemote = variable.remote === true;
    
    if (mode === 'all') {
      // Все variables (local + remote)
      variablesMap.set(variable.id, variable);
    } else if (mode === 'local' && !isRemote) {
      // Только local (remote === false или undefined)
      variablesMap.set(variable.id, variable);
    } else if (mode === 'remote' && isRemote) {
      // Только remote (remote === true)
      variablesMap.set(variable.id, variable);
    }
  }
  
  return variablesMap;
}
```

---

## 📊 Логирование для отладки

### Полезная статистика

```javascript
const allVariables = await figma.variables.getLocalVariablesAsync();

let localCount = 0;
let remoteCount = 0;

for (const variable of allVariables) {
  if (variable.remote === true) {
    remoteCount++;
  } else {
    localCount++;
  }
}

console.log({
  total: allVariables.length,
  local: localCount,
  remote: remoteCount
});

// Вывод:
// {
//   total: 150,
//   local: 45,   // Созданы в текущем файле
//   remote: 105  // Из подключённых библиотек
// }
```

---

## 🎨 UI для выбора режима

### HTML (уже реализовано)

```html
<label>Режим проверки:</label>
<div style="display: flex; gap: 8px;">
  <button id="dsv-mode-local" data-mode="local">Local</button>
  <button id="dsv-mode-remote" data-mode="remote">Remote</button>
  <button id="dsv-mode-all" data-mode="all">All</button>
</div>
```

### JavaScript обработчик (уже реализовано)

```javascript
let dsvValidationMode = 'local'; // По умолчанию

modeButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Обновляем UI
    modeButtons.forEach(btn => {
      btn.style.background = '#2A2A32';
    });
    button.style.background = '#F86025';
    
    // Сохраняем выбор
    dsvValidationMode = button.dataset.mode;
  });
});
```

### Отправка в плагин (уже реализовано)

```javascript
parent.postMessage({
  pluginMessage: {
    type: 'dsv-validate',
    mode: dsvValidationMode, // 'local' | 'remote' | 'all'
    options: { /* ... */ }
  }
}, '*');
```

---

## 🔍 Проверка boundVariables

### Структура boundVariables

```typescript
node.boundVariables = {
  fills: [{
    id: 'VariableID:123:456',
    type: 'VARIABLE_ALIAS'
  }],
  strokes: [{
    id: 'VariableID:789:012',
    type: 'VARIABLE_ALIAS'
  }],
  // ... другие свойства
}
```

### Проверка принадлежности к выбранному набору

```javascript
async function checkNodeVariables(node, variables, mode, report) {
  // 1. Получаем boundVariable для свойства
  const boundVar = node.boundVariables?.fills;
  
  if (boundVar && Array.isArray(boundVar)) {
    for (const varBinding of boundVar) {
      const variableId = varBinding.id;
      
      // 2. Проверяем, есть ли в выбранном наборе
      if (variables.has(variableId)) {
        // ✅ Variable найдена в выбранном режиме
        console.log('Valid variable:', variableId);
      } else {
        // ❌ Variable не из выбранного режима
        // Например: local variable при mode='remote'
        issues.push({
          type: 'Invalid Source',
          description: `Variable не соответствует режиму (${mode})`
        });
      }
    }
  } else {
    // ❌ Нет привязки к variable
    issues.push({
      type: 'No Variable',
      description: 'Property не использует Design Token'
    });
  }
}
```

---

## 🧪 Тестирование

### Тест 1: Local Variables

**Шаги:**
1. Создайте local variable в текущем файле
2. Привяжите к элементу
3. Запустите проверку в режиме **Local**
4. Откройте Console

**Ожидаемый результат:**
```javascript
// Console:
DSV: Статистика variables: {
  total: 150,
  local: 45,
  remote: 105,
  mode: 'local',
  selected: 45  // ✅ Выбраны только local
}

// В отчёте: НЕТ ошибки для этого элемента
```

### Тест 2: Remote Variables

**Шаги:**
1. Подключите библиотеку с variables
2. Используйте remote variable в элементе
3. Запустите проверку в режиме **Remote**

**Ожидаемый результат:**
```javascript
// Console:
DSV: Статистика variables: {
  total: 150,
  local: 45,
  remote: 105,
  mode: 'remote',
  selected: 105  // ✅ Выбраны только remote
}

// В отчёте: НЕТ ошибки для этого элемента
```

### Тест 3: Invalid Source

**Шаги:**
1. Используйте local variable в элементе
2. Запустите проверку в режиме **Remote**

**Ожидаемый результат:**
```javascript
// Console:
DSV: Статистика variables: {
  mode: 'remote',
  selected: 105  // local variable НЕ включена
}

// В отчёте:
❌ "Invalid Source: Variable не соответствует режиму (remote)"
```

---

## 🐛 Отладка

### Проверка что variables загрузились

**Откройте Console (Cmd/Ctrl + Shift + I):**

```javascript
// При запуске проверки увидите:
DSV: Получено всего variables: 150

DSV: Статистика variables: {
  total: 150,
  local: 45,
  remote: 105,
  mode: 'local',
  selected: 45
}
```

### Если remote variables = 0

**Возможные причины:**

1. **Библиотека не подключена:**
   - Assets → Libraries → Включите библиотеку

2. **В библиотеке нет variables:**
   - Проверьте что библиотека содержит variables
   - Откройте файл библиотеки → Variables panel

3. **Variables не опубликованы:**
   - В файле библиотеки опубликуйте изменения
   - Plugins → Publish library

### Если total variables = 0

**Возможные причины:**

1. **В файле нет variables:**
   - Создайте хотя бы одну variable
   - Variables panel → Create variable

2. **Ошибка API:**
   - Проверьте Console на ошибки
   - Перезапустите плагин

---

## 📖 Официальная документация

**Figma Plugin API - Variables:**
- [Variables API Reference](https://www.figma.com/plugin-docs/api/Variable/)
- [getLocalVariablesAsync()](https://www.figma.com/plugin-docs/api/figma-variables/#getlocalvariablesasync)

**Ключевые моменты из документации:**

> `getLocalVariablesAsync()` returns all variables that are available in the current file, including those from published libraries.

**Перевод:**
> `getLocalVariablesAsync()` возвращает все переменные, доступные в текущем файле, включая переменные из опубликованных библиотек.

---

## ✅ Итоговый чеклист

Правильная реализация Variables API:

- [x] ✅ Использовать `getLocalVariablesAsync()` для получения ВСЕХ variables
- [x] ✅ Фильтровать по свойству `variable.remote`
- [x] ✅ Не пытаться вызвать несуществующий `getRemoteVariables()`
- [x] ✅ Предоставить UI для выбора режима (Local/Remote/All)
- [x] ✅ Передавать режим из UI в код плагина
- [x] ✅ Логировать статистику для отладки
- [x] ✅ Проверять принадлежность boundVariables к выбранному набору

---

## 🚀 Текущая реализация

В плагине **Orbita Icon Checker** всё реализовано правильно:

1. ✅ Функция `getVariablesByMode()` использует `getLocalVariablesAsync()`
2. ✅ Фильтрация по `variable.remote`
3. ✅ UI с тремя кнопками (Local/Remote/All)
4. ✅ Передача режима через `postMessage`
5. ✅ Детальное логирование статистики
6. ✅ Проверка `boundVariables` против выбранного набора

**Готово к использованию! 🎉**

---

**© 2025 Orbita Design System Team**

