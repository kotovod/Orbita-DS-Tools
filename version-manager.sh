#!/bin/bash

# 🔄 Version Manager для Orbita Icon Checker
# Скрипт для управления версиями плагина

PLUGIN_DIR="/Users/kotovod/Desktop/Figma Plugins/Orbita Icon Checker"
VERSIONS_DIR="$PLUGIN_DIR/versions"
BACKUPS_DIR="$PLUGIN_DIR/backups"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция вывода сообщений
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверка что скрипт запущен из правильной директории
check_directory() {
    if [ ! -f "$PLUGIN_DIR/manifest.json" ]; then
        print_error "Ошибка: manifest.json не найден. Проверьте путь к плагину."
        exit 1
    fi
}

# Показать список версий
list_versions() {
    print_info "📦 Доступные версии:"
    echo ""
    
    if [ ! -d "$VERSIONS_DIR" ]; then
        print_warning "Папка versions не найдена"
        return
    fi
    
    cd "$VERSIONS_DIR"
    for version in */; do
        if [ -f "$version/VERSION_INFO.md" ]; then
            status="✅"
        else
            status="⚠️ "
        fi
        echo "$status $version"
    done
    
    echo ""
    print_info "Текущая версия: v2.2-stable"
}

# Создать новую версию
create_version() {
    local version_name=$1
    
    if [ -z "$version_name" ]; then
        print_error "Укажите имя версии: ./version-manager.sh create v2.3-new-feature"
        exit 1
    fi
    
    local version_dir="$VERSIONS_DIR/$version_name"
    
    if [ -d "$version_dir" ]; then
        print_error "Версия $version_name уже существует"
        exit 1
    fi
    
    print_info "Создаю версию $version_name..."
    
    mkdir -p "$version_dir"
    cp "$PLUGIN_DIR/code.js" "$version_dir/"
    cp "$PLUGIN_DIR/ui.html" "$version_dir/"
    cp "$PLUGIN_DIR/manifest.json" "$version_dir/"
    
    # Создаем VERSION_INFO.md
    cat > "$version_dir/VERSION_INFO.md" << EOF
# Версия $version_name

**Дата релиза:** $(date +"%d %B %Y")  
**Статус:** 🚧 В разработке

---

## ✨ Что нового

(Опишите изменения здесь)

---

## 🔄 Откат на эту версию

\`\`\`bash
cd "$PLUGIN_DIR"
cp versions/$version_name/* ./
\`\`\`

Затем перезагрузите плагин в Figma.
EOF
    
    print_success "Версия $version_name создана!"
    print_info "Файлы сохранены в: $version_dir"
}

# Откатиться на версию
restore_version() {
    local version_name=$1
    
    if [ -z "$version_name" ]; then
        print_error "Укажите имя версии: ./version-manager.sh restore v2.2-stable"
        exit 1
    fi
    
    local version_dir="$VERSIONS_DIR/$version_name"
    
    if [ ! -d "$version_dir" ]; then
        print_error "Версия $version_name не найдена"
        print_info "Доступные версии:"
        list_versions
        exit 1
    fi
    
    print_warning "⚠️  Вы собираетесь откатиться на $version_name"
    print_info "Текущая версия будет сохранена в backups/"
    read -p "Продолжить? (y/n): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_info "Отмена"
        exit 0
    fi
    
    # Создаем бэкап текущей версии
    backup_dir="$BACKUPS_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    cp "$PLUGIN_DIR/code.js" "$backup_dir/" 2>/dev/null
    cp "$PLUGIN_DIR/ui.html" "$backup_dir/" 2>/dev/null
    cp "$PLUGIN_DIR/manifest.json" "$backup_dir/" 2>/dev/null
    
    print_success "Бэкап создан: $backup_dir"
    
    # Восстанавливаем версию
    print_info "Восстанавливаю версию $version_name..."
    cp "$version_dir/code.js" "$PLUGIN_DIR/"
    cp "$version_dir/ui.html" "$PLUGIN_DIR/"
    cp "$version_dir/manifest.json" "$PLUGIN_DIR/"
    
    print_success "Версия $version_name восстановлена!"
    print_warning "⚠️  Перезагрузите плагин в Figma!"
    print_info "Figma → Plugins → Development → Remove → Add plugin from manifest"
}

# Создать бэкап
create_backup() {
    local backup_dir="$BACKUPS_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    
    print_info "Создаю бэкап..."
    mkdir -p "$backup_dir"
    cp "$PLUGIN_DIR/code.js" "$backup_dir/"
    cp "$PLUGIN_DIR/ui.html" "$backup_dir/"
    cp "$PLUGIN_DIR/manifest.json" "$backup_dir/"
    
    print_success "Бэкап создан: $backup_dir"
}

# Сравнить две версии
compare_versions() {
    local v1=$1
    local v2=$2
    
    if [ -z "$v1" ] || [ -z "$v2" ]; then
        print_error "Укажите две версии: ./version-manager.sh compare v2.1-initial v2.2-stable"
        exit 1
    fi
    
    print_info "🔍 Сравнение $v1 и $v2:"
    echo ""
    
    diff -u "$VERSIONS_DIR/$v1/code.js" "$VERSIONS_DIR/$v2/code.js" | head -n 50
    
    echo ""
    print_info "Показаны первые 50 строк различий в code.js"
    print_info "Для полного сравнения используйте: diff -u versions/$v1/code.js versions/$v2/code.js"
}

# Показать текущую версию
show_current() {
    print_info "📊 Информация о текущей версии:"
    echo ""
    echo "Плагин: Orbita Icons Checker"
    echo "Текущая версия: v2.2-stable"
    echo "Дата последнего изменения code.js: $(date -r "$PLUGIN_DIR/code.js" +"%d %B %Y %H:%M:%S")"
    echo "Дата последнего изменения ui.html: $(date -r "$PLUGIN_DIR/ui.html" +"%d %B %Y %H:%M:%S")"
    echo ""
    print_info "Доступные версии:"
    list_versions
}

# Главное меню
show_help() {
    echo "🔄 Version Manager для Orbita Icon Checker"
    echo ""
    echo "Использование:"
    echo "  ./version-manager.sh <команда> [параметры]"
    echo ""
    echo "Команды:"
    echo "  list                    - Показать список версий"
    echo "  create <name>           - Создать новую версию"
    echo "  restore <name>          - Откатиться на версию"
    echo "  backup                  - Создать бэкап текущей версии"
    echo "  compare <v1> <v2>       - Сравнить две версии"
    echo "  current                 - Показать текущую версию"
    echo "  help                    - Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  ./version-manager.sh list"
    echo "  ./version-manager.sh create v2.3-new-feature"
    echo "  ./version-manager.sh restore v2.2-stable"
    echo "  ./version-manager.sh backup"
    echo "  ./version-manager.sh compare v2.1-initial v2.2-stable"
    echo ""
}

# Основная логика
main() {
    check_directory
    
    case "$1" in
        list)
            list_versions
            ;;
        create)
            create_version "$2"
            ;;
        restore)
            restore_version "$2"
            ;;
        backup)
            create_backup
            ;;
        compare)
            compare_versions "$2" "$3"
            ;;
        current)
            show_current
            ;;
        help|--help|-h|"")
            show_help
            ;;
        *)
            print_error "Неизвестная команда: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Запуск
main "$@"

