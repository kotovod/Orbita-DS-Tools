#!/bin/bash

# Скрипт для переключения между dev и production версиями плагина

if [ "$1" = "dev" ]; then
    echo "🔄 Переключаемся на dev версию..."
    cp manifest.dev.json manifest.json
    echo "✅ Dev версия активирована (все функции доступны)"
    echo "📋 Доступные функции:"
    echo "   - Проверить иконки"
    echo "   - AI Design Lint"
    echo "   - Node ID Inspector"
    echo "   - Экспорт в SVG"
    echo "   - Design System Validator"
    echo "   - Экспорт свойств компонентов"
    
elif [ "$1" = "prod" ]; then
    echo "🔄 Переключаемся на production версию..."
    cat > manifest.json << 'EOF'
{
  "name": "Orbita Icons Checker",
  "id": "1537434937937210613",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": [
      "https://yandex-team.ru",
      "https://cdn.jsdelivr.net",
      "https://api.eliza.yandex.net",
      "https://events.statsigapi.net"
    ]
  },
  "documentAccess": "dynamic-page",
  "menu": [
    {
      "name": "Проверить иконки",
      "command": "check-icons"
    },
    {
      "name": "Экспорт в SVG",
      "command": "svg-export"
    }
  ]
}
EOF
    echo "✅ Production версия активирована (только основные функции)"
    echo "📋 Доступные функции:"
    echo "   - Проверить иконки"
    echo "   - Экспорт в SVG"
    echo "🚀 Готово для публикации!"
    
else
    echo "❌ Неверный параметр"
    echo ""
    echo "Использование: ./switch-version.sh [dev|prod]"
    echo ""
    echo "  dev  - включить все функции для разработки"
    echo "  prod - оставить только основные функции для публикации"
    echo ""
    echo "Примеры:"
    echo "  ./switch-version.sh dev   # Для разработки"
    echo "  ./switch-version.sh prod  # Для публикации"
fi
