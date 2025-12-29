# Исправление проверки переменных для Stroke Weight и других числовых свойств

**Дата:** 29 декабря 2025  
**Статус:** ✅ Исправлено

## 🐛 Проблема

Валидатор выводил ошибку для `Stroke Weight` (и других числовых свойств), даже когда переменная уже была проставлена:

```
Stroke Weight: 1 → 05m
```

Хотя в Figma элемент уже имел привязанную переменную через `boundVariables`.

### Две подпроблемы:

1. **Некорректная проверка наличия переменной** — не проверялось поле `id` внутри объекта привязки
2. **Не учитывались Individual Strokes** — когда в Figma используются отдельные значения толщины обводки для каждой стороны (Top, Right, Bottom, Left)

## 🔍 Причина

### Проблема 1: Проверка наличия `id`

В Figma API свойство `node.boundVariables` содержит объекты вида:

```javascript
{
  strokeWeight: {
    id: "VariableID:123:456"
  }
}
```

Код проверял наличие переменной так:

```javascript
hasVariable: !!boundVariables['strokeWeight']
```

Эта проверка возвращала `true` даже для **пустого объекта** `{}` или объекта без поля `id`.

### Проблема 2: Individual Strokes

Когда в Figma используются **individual strokes** (отдельные значения для каждой стороны), Figma API использует другие ключи:

```javascript
boundVariables: {
  strokeTopWeight: { id: "..." },
  strokeRightWeight: { id: "..." },
  strokeBottomWeight: { id: "..." },
  strokeLeftWeight: { id: "..." }
}
```

А НЕ просто `strokeWeight`!

Старый код проверял только `boundVariables['strokeWeight']`, который был `undefined` для individual strokes.

## ✅ Решение

### 1. Корректная проверка `id`

Обновлена проверка наличия переменных для всех числовых свойств:

```javascript
const strokeWeightVar = boundVariables['strokeWeight'];
const hasStrokeWeightVariable = !!(strokeWeightVar && strokeWeightVar.id);
```

### 2. Поддержка Individual Strokes

Добавлена проверка для отдельных сторон обводки:

```javascript
// Проверяем individual stroke weights (для каждой стороны отдельно)
const hasIndividualStrokeWeights = !!(
  boundVariables['strokeTopWeight'] ||
  boundVariables['strokeRightWeight'] ||
  boundVariables['strokeBottomWeight'] ||
  boundVariables['strokeLeftWeight']
);

// Проверяем, все ли стороны имеют переменные
const allIndividualStrokesHaveVars = hasIndividualStrokeWeights && 
  !!(boundVariables['strokeTopWeight'] && boundVariables['strokeTopWeight'].id) &&
  !!(boundVariables['strokeRightWeight'] && boundVariables['strokeRightWeight'].id) &&
  !!(boundVariables['strokeBottomWeight'] && boundVariables['strokeBottomWeight'].id) &&
  !!(boundVariables['strokeLeftWeight'] && boundVariables['strokeLeftWeight'].id);

// Итоговая проверка: либо общий strokeWeight, либо все individual strokes
const hasStrokeWeightVariable = 
  !!(strokeWeightVar && strokeWeightVar.id) || allIndividualStrokesHaveVars;
```

## 📝 Исправленные свойства

1. **Stroke Weight** (`strokeWeight` + individual stroke weights)
2. **Padding** (`paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`)
3. **Gap** (`itemSpacing`)
4. **Corner Radius** (`cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`)

## 🔧 Изменения в коде

### 1. Stroke Weight с поддержкой Individual Strokes (строки 667-710)

```javascript
// Проверяем также individual stroke weights
const hasIndividualStrokeWeights = !!(
  boundVariables['strokeTopWeight'] ||
  boundVariables['strokeRightWeight'] ||
  boundVariables['strokeBottomWeight'] ||
  boundVariables['strokeLeftWeight']
);

const allIndividualStrokesHaveVars = hasIndividualStrokeWeights && 
  !!(boundVariables['strokeTopWeight'] && boundVariables['strokeTopWeight'].id) &&
  !!(boundVariables['strokeRightWeight'] && boundVariables['strokeRightWeight'].id) &&
  !!(boundVariables['strokeBottomWeight'] && boundVariables['strokeBottomWeight'].id) &&
  !!(boundVariables['strokeLeftWeight'] && boundVariables['strokeLeftWeight'].id);

const hasStrokeWeightVariable = 
  !!(strokeWeightVar && strokeWeightVar.id) || allIndividualStrokesHaveVars;

console.log(`🖊️ DSV: Проверяем strokeWeight для "${node.name}":`, {
  value: node.strokeWeight,
  hasBoundVariables: !!strokeWeightVar,
  boundVariablesStructure: strokeWeightVar,
  hasIndividualStrokeWeights: hasIndividualStrokeWeights,
  allIndividualStrokesHaveVars: allIndividualStrokesHaveVars,
  hasVariableId: hasStrokeWeightVariable,
  allBoundVariablesKeys: Object.keys(boundVariables)
});
```

### 2. Padding (строки 525-537)

```javascript
const hasLeftVar = !!(boundVariables['paddingLeft'] && boundVariables['paddingLeft'].id);
const hasRightVar = !!(boundVariables['paddingRight'] && boundVariables['paddingRight'].id);
const hasTopVar = !!(boundVariables['paddingTop'] && boundVariables['paddingTop'].id);
const hasBottomVar = !!(boundVariables['paddingBottom'] && boundVariables['paddingBottom'].id);
```

### 3. Gap / Item Spacing (строки 616-629)

```javascript
const hasItemSpacingVar = !!(boundVariables['itemSpacing'] && boundVariables['itemSpacing'].id);
```

### 4. Corner Radius (строки 636-668)

```javascript
const hasIndependentCorners = corners.some(corner => 
  boundVariables[corner] && boundVariables[corner].id
);

// Для индивидуальных углов:
const hasCornerVar = !!(boundVariables[corner] && boundVariables[corner].id);

// Для общего cornerRadius:
const hasCornerRadiusVar = !!(boundVariables['cornerRadius'] && boundVariables['cornerRadius'].id);
```

## 🧪 Тестирование

### Сценарий 1: Обычный Stroke Weight

1. Создайте элемент с обводкой (stroke)
2. Установите `Stroke Weight = 1` (общее значение для всех сторон)
3. Привяжите Stroke Weight к переменной `line/05m`
4. Запустите Design System Validator
5. **Результат:** Элемент НЕ должен появиться в списке ошибок ✅

### Сценарий 2: Individual Strokes (главное!)

1. Создайте элемент с обводкой
2. В панели Stroke выберите "Individual strokes" (отдельные значения для каждой стороны)
3. Установите одинаковое значение для всех сторон (например, `line/05m`)
4. Запустите Design System Validator
5. **Результат:** Элемент НЕ должен появиться в списке ошибок ✅

### Ожидаемое поведение:

- ✅ Если у `strokeWeight` есть привязанная переменная → **не показывать ошибку**
- ✅ Если используются individual strokes и ВСЕ стороны привязаны к переменным → **не показывать ошибку**
- ❌ Если у свойства нет привязанной переменной → **показать ошибку с рекомендацией**
- ❌ Если individual strokes и хотя бы одна сторона без переменной → **показать ошибку**

## 📊 Влияние

### Затронутые функции:
- `extractNumericValues()` в `code.js`

### Совместимость:
- ✅ Обратная совместимость сохранена
- ✅ Поддержка как обычных, так и individual stroke weights
- ✅ Не влияет на другие функции валидатора
- ✅ Не влияет на проверку цветов (fills/strokes)

## 🔗 Связанные файлы

- `/Users/kotovod/Documents/GitHub/Orbita DS Tools/code.js` — основной файл с исправлениями

## 💡 Дополнительно

### Расширенное логирование

Добавлено детальное логирование для `strokeWeight`, которое показывает:
- Значение толщины обводки
- Наличие обычной привязки `strokeWeight`
- Наличие individual stroke weights (по сторонам)
- Все ключи в `boundVariables` для отладки

```javascript
console.log(`🖊️ DSV: Проверяем strokeWeight для "${node.name}":`, {
  value: node.strokeWeight,
  hasBoundVariables: !!strokeWeightVar,
  boundVariablesStructure: strokeWeightVar,
  hasIndividualStrokeWeights: hasIndividualStrokeWeights,
  allIndividualStrokesHaveVars: allIndividualStrokesHaveVars,
  hasVariableId: hasStrokeWeightVariable,
  allBoundVariablesKeys: Object.keys(boundVariables)
});
```

Это логирование можно посмотреть в консоли Figma (Developer Console) при запуске валидатора.

### Ключи для Individual Strokes в Figma API

Для справки, вот какие ключи использует Figma для individual stroke weights:

```javascript
boundVariables: {
  strokeTopWeight: { id: "VariableID:..." },     // Верхняя обводка
  strokeRightWeight: { id: "VariableID:..." },   // Правая обводка
  strokeBottomWeight: { id: "VariableID:..." },  // Нижняя обводка
  strokeLeftWeight: { id: "VariableID:..." }     // Левая обводка
}
```

---

## ✅ Статус

**Исправление завершено и готово к тестированию.**

После тестирования рекомендуется обновить версию плагина в `manifest.json`.

