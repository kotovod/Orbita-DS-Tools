# 📦 Релизы плагина

Эта папка содержит ZIP-архивы готовых релизов для распространения.

## 📥 Скачать релиз

Последняя стабильная версия: **v2.2-stable**

## 🎯 Как создать релиз

### Автоматически (рекомендуется):

```bash
cd "/Users/kotovod/Desktop/Figma Plugins/Orbita Icon Checker"
./version-manager.sh create v2.3-stable

# Создать ZIP
cd versions/v2.3-stable
zip -r ../../releases/orbita-icon-checker-v2.3.zip code.js ui.html manifest.json
```

### Вручную:

```bash
cd "/Users/kotovod/Desktop/Figma Plugins/Orbita Icon Checker"
zip -r releases/orbita-icon-checker-v2.2.zip code.js ui.html manifest.json
```

## 📋 Список релизов

- `orbita-icon-checker-v2.2-stable.zip` - Текущая стабильная (15.10.2025)
- `orbita-icon-checker-v2.1-initial.zip` - Первые исправления (15.10.2025)
- `orbita-icon-checker-v2.0-base.zip` - Базовая версия (06.10.2025)

## 🚀 Установка релиза

1. Скачайте ZIP-архив
2. Распакуйте в отдельную папку
3. В Figma: Plugins → Development → Import plugin from manifest
4. Выберите `manifest.json` из распакованной папки

## 📝 Changelog

См. `CHANGELOG_AI_DESIGN_LINT.md` в корне проекта

