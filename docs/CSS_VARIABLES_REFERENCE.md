# 🎨 CSS Variables Quick Reference

## 📊 Статистика использования

**Всего использований CSS переменных: 333 раза!**

### Топ-5 самых используемых:
1. `var(--spacing-sm)` - 51 раз (8px)
2. `var(--text-primary)` - 34 раза (#FFFFFF)
3. `var(--spacing-md)` - 32 раза (12px)
4. `var(--spacing-lg)` - 31 раз (16px)
5. `var(--color-primary)` - 30 раз (#F86025)

## 🎨 Полный список переменных

### Цвета фона
```css
--bg-primary: #34343C       /* Основной фон */
--bg-secondary: #44444C     /* Вторичный фон (карточки) */
--bg-tertiary: #2A2A32      /* Третичный фон (панели) */
--bg-accent: #505059        /* Акцентный фон */
--bg-dark: #1A1A1F         /* Темный фон */
--bg-tooltip: #222228       /* Фон тултипа */
```

### Основные цвета
```css
--color-primary: #F86025           /* Оранжевый */
--color-primary-hover: #E55520     /* Оранжевый hover */
--color-primary-active: #D24A1B    /* Оранжевый active */
--color-primary-light: #FF8B4A     /* Светлый оранжевый */
--color-primary-lighter: #FF9168   /* Очень светлый оранжевый */
```

### Цвета текста
```css
--text-primary: #FFFFFF     /* Основной текст */
--text-secondary: #AAAAAA   /* Вторичный текст */
--text-tertiary: #888888    /* Третичный текст */
--text-disabled: #666666    /* Отключенный текст */
```

### Семантические цвета
```css
--success: #2D5F3D          /* Успех (темный) */
--success-bright: #4CAF50   /* Успех (яркий) */
--error: #F02D2D           /* Ошибка */
--error-dark: #5F2D2D      /* Ошибка (темная) */
--error-bright: #F44336    /* Ошибка (яркая) */
--warning: #7A5C00         /* Предупреждение */
--warning-bright: #FF9800  /* Предупреждение (яркое) */
--info: #2D3F5C           /* Информация */
```

### Специальные цвета
```css
--gold: #FFD700            /* Золотой */
```

### Радиусы
```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
```

### Отступы
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 24px
--spacing-xxl: 48px
```

### Transitions
```css
--transition-fast: 0.15s ease
--transition-normal: 0.3s ease
--transition-slow: 0.5s ease
```

### Shadows
```css
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1)
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.2)
--shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.2)
--shadow-xl: 0 2px 8px rgba(0, 0, 0, 0.3)
```

### Z-index
```css
--z-header: 10
--z-tooltip: 2000
```

---

## 🚀 Как использовать

### Пример 1: Создание кнопки
```css
.my-button {
  background-color: var(--color-primary);
  color: var(--text-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  transition: all var(--transition-normal);
}

.my-button:hover {
  background-color: var(--color-primary-hover);
  box-shadow: var(--shadow-lg);
}
```

### Пример 2: Создание карточки
```css
.my-card {
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  box-shadow: var(--shadow-md);
}
```

### Пример 3: Текстовые стили
```css
.my-title {
  color: var(--text-primary);
  font-size: 16px;
  margin-bottom: var(--spacing-md);
}

.my-subtitle {
  color: var(--text-secondary);
  font-size: 12px;
}
```

---

## 🎨 Быстрая смена темы

### Вариант 1: Изменить существующие переменные
```css
:root {
  /* Синяя тема */
  --color-primary: #0066FF;
  --color-primary-hover: #0052CC;
  --color-primary-active: #003D99;
}
```

### Вариант 2: Создать темный режим
```css
body.dark-mode {
  --bg-primary: #0F0F14;
  --bg-secondary: #1A1A1F;
  --bg-tertiary: #121217;
  --text-secondary: #888888;
}
```

### Вариант 3: Создать светлый режим
```css
body.light-mode {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F5F5F5;
  --bg-tertiary: #E8E8E8;
  --text-primary: #000000;
  --text-secondary: #666666;
}
```

---

## 💡 Советы

1. **Всегда используйте переменные** вместо хардкодных значений
2. **Для spacing** выбирайте из существующих (xs, sm, md, lg, xl)
3. **Для цветов** используйте семантические (success, error, warning)
4. **Для transitions** используйте стандартные (fast, normal, slow)
5. **Не дублируйте** - если переменная есть, используйте её!

---

## ✨ Примеры популярных цветовых схем

### 1. Синяя (корпоративная)
```css
--color-primary: #0066FF;
--color-primary-hover: #0052CC;
--color-primary-active: #003D99;
```

### 2. Зеленая (эко)
```css
--color-primary: #00CC66;
--color-primary-hover: #00B359;
--color-primary-active: #00994D;
```

### 3. Фиолетовая (креативная)
```css
--color-primary: #9933FF;
--color-primary-hover: #8529E6;
--color-primary-active: #7020CC;
```

### 4. Красная (энергичная)
```css
--color-primary: #FF3366;
--color-primary-hover: #E62E5C;
--color-primary-active: #CC2952;
```

---

**Дата:** 30 ноября 2025  
**Версия:** CSS Variables v1.0

