/**
 * Главная точка входа плагина Orbita DS Tools
 * Собирается с помощью esbuild в code.js
 */

console.log('=== ORBITA DS ✦ TOOLS v3.0.5 START ===');
console.log('Timestamp:', new Date().toISOString());
console.log('🔧 Orbita DS ✦ Tools v3.0.5 загружен');

// Импортируем систему маршрутизации
const { routeMessage } = require('./message-router');
const { setupMessageHandlers } = require('./setup-handlers');
const { VERSION, VERSION_DATE, UI_SIZES } = require('./common/constants');

// Хранилище для загруженных токенов (JSON) в памяти плагина
let savedTokensFromJson = null;

// Настройки проверок по умолчанию
const defaultCheckSettings = {
  naming: true,
  variants: true,
  sizes: true,
  structure: true,
  constraints: true,
  vector: true,
  editGroup: true,
  description: true,
  colorVariable: true,
  noStroke: true,
  excludeDotNames: true
};

// Текущие настройки проверок
let checkSettings = Object.assign({}, defaultCheckSettings);

// Флаг для отслеживания состояния проверки
let isCheckingInProgress = false;

// Делаем переменные глобальными для доступа из обработчиков
// TODO: Удалить после полной миграции на модули
global.checkSettings = checkSettings;
global.isCheckingInProgress = isCheckingInProgress;

// Здесь будут импорты функций из code.js
// TODO: Заменить на импорты из модулей после рефакторинга
// const { checkIcons } = require('./features/check-icons/validator');
// const { fixError, fixAllErrors } = require('./features/check-icons/fixer');

// Временное решение: загружаем функции из старого code.js
// ВАЖНО: Этот блок будет удалён после завершения рефакторинга
// Для работы нужно будет объединить этот файл со старым code.js
console.warn('⚠️ ВНИМАНИЕ: Используется гибридный режим - старый код + новая система маршрутизации');
console.warn('⚠️ Для полной работы запустите сборку: npm run build');

// Запуск плагина с разными UI в зависимости от команды
const command = figma.command;
const uiSize = UI_SIZES[command] || UI_SIZES['check-icons'];

figma.showUI(__html__, uiSize);

// Отправляем команду в UI для настройки интерфейса
setTimeout(() => {
  let mode = command || 'check-icons';
  figma.ui.postMessage({ type: 'set-mode', mode: mode });
  
  // Специальная обработка для DSV (загрузка токенов)
  if (command === 'design-system-validator') {
    (async () => {
      try {
        const savedData = await figma.clientStorage.getAsync('dsv-tokens');
        if (savedData && savedData.tokens && Array.isArray(savedData.tokens)) {
          savedTokensFromJson = savedData.tokens;
          console.log('DSV: Загружено сохранённых токенов из clientStorage:', savedData.count);
          
          figma.ui.postMessage({
            type: 'dsv-tokens-loaded-from-storage',
            count: savedData.count,
            savedAt: savedData.savedAt
          });
        }
      } catch (error) {
        console.error('DSV: Ошибка при загрузке токенов из clientStorage:', error);
      }
    })();
  }
}, 100);

// Регистрируем все обработчики сообщений
setupMessageHandlers();

// Подключаем новую систему маршрутизации
figma.ui.onmessage = async function(msg) {
  try {
    await routeMessage(msg);
  } catch (error) {
    console.error('❌ Критическая ошибка при обработке сообщения:', error);
    figma.ui.postMessage({
      type: 'error',
      message: `Критическая ошибка: ${error.message}`
    });
  }
};

console.log('✅ Плагин инициализирован с новой системой маршрутизации');
console.log(`📦 Версия: ${VERSION} (${VERSION_DATE})`);

