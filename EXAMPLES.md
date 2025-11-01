# Примеры иконок для Orbita DS

В этом документе приведены примеры правильной и неправильной реализации иконок для дизайн-системы Orbita DS.

## Правильная структура иконки

```
orb-icon-name (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (Lock)
 └─ Edit (Group) (Invisible)
```

### Пример правильной иконки

#### Component Set: orb-icon-bell

- **Variant=outline, Size=lg (32x32 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=outline, Size=md (24x24 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=outline, Size=sm (16x16 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=outline, Size=xs (12x12 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=outline, Size=xxs (8x8 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=solid, Size=lg (32x32 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=solid, Size=md (24x24 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=solid, Size=sm (16x16 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=solid, Size=xs (12x12 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

- **Variant=solid, Size=xxs (8x8 px)**
  - Color-layer (выравнивание: Center Center)
    - Vector (заблокирован, без цвета)
  - Edit (скрыта)

## Примеры ошибок

### 1. Ошибки в структуре

❌ **Отсутствует слой Color-layer**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ Vector (Icon Path)
 └─ Edit (Group) (Invisible)
```

❌ **Отсутствует слой Vector внутри Color-layer**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ Color-layer (Union)
 └─ Edit (Group) (Invisible)
```

### 2. Ошибки в размерах

❌ **Неправильный размер иконки**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant) (30x30 px вместо 24x24 px)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (Lock)
 └─ Edit (Group) (Invisible)
```

❌ **Неправильное выравнивание Color-layer**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ Color-layer (Union) (выравнивание: Left Top вместо Center Center)
         └─ Vector (Icon Path) (Lock)
 └─ Edit (Group) (Invisible)
```

### 3. Ошибки в вариантах

❌ **Отсутствуют свойства Variant или Size**
```
orb-icon-bell (Component Set)
 └─ Variant=outline (Variant) (отсутствует свойство Size)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (Lock)
 └─ Edit (Group) (Invisible)
```

❌ **Неправильные значения свойств**
```
orb-icon-bell (Component Set)
 └─ Variant=filled, Size=md (Variant) (filled вместо solid)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (Lock)
 └─ Edit (Group) (Invisible)
```

### 4. Ошибки в именовании

❌ **Неправильное имя Component Set**
```
icon-bell (Component Set) (отсутствует префикс orb-icon-)
 └─ Variant=outline, Size=md (Variant)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (Lock)
 └─ Edit (Group) (Invisible)
```

❌ **Неправильные имена слоев**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ color (Union) (неправильное имя вместо Color-layer)
         └─ path (Icon Path) (неправильное имя вместо Vector)
 └─ Edit (Group) (Invisible)
```

### 5. Ошибки в цвете и стилях

❌ **Цвет применен к слою Vector**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (Lock) (имеет цвет fill)
 └─ Edit (Group) (Invisible)
```

### 6. Ошибки в блокировке Vector

❌ **Vector не заблокирован**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (не заблокирован)
 └─ Edit (Group) (Invisible)
```

### 7. Ошибки в группе Edit

❌ **Отсутствует группа Edit**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (Lock)
```

❌ **Группа Edit видима**
```
orb-icon-bell (Component Set)
 └─ Variant=outline, Size=md (Variant)
     └─ Color-layer (Union)
         └─ Vector (Icon Path) (Lock)
 └─ Edit (Group) (Visible) (должна быть скрыта)
```

## Рекомендации по созданию иконок

1. Используйте шаблон для создания новых иконок
2. Проверяйте иконки с помощью плагина Orbita Icon Checker перед отправкой
3. Следуйте рекомендациям по толщине линий:
   - для иконок размером 32, 24 px — толщина контура 2 px
   - для иконок размером 16, 12, 8 px — толщина контура 1,5 px
4. Удаляйте пустые и неиспользуемые слои
5. Всегда сохраняйте исходник иконки в группе Edit