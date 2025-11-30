/**
 * Обработчики сообщений для Check Icons
 */

const { debugLog } = require('../common/debug');

// Импортируем существующие функции (пока они в code.js)
// После полной миграции они будут в ./validator.js и ./fixer.js

/**
 * Обработчик: Проверка иконок
 */
async function handleCheckIcons(msg) {
  // Устанавливаем флаг, что проверка запущена
  global.isCheckingInProgress = true;
  
  // Сохраняем текущее выделение, если запрошено
  if (msg.saveSelection) {
    const selection = figma.currentPage.selection;
    const nodeIds = selection.map(node => node.id);
    figma.ui.postMessage({ 
      type: 'saved-selection', 
      nodeIds: nodeIds 
    });
  }
  
  // Обновляем настройки проверок, если они переданы
  if (msg.settings) {
    global.checkSettings = msg.settings;
  }
  
  // Начинаем проверку иконок
  figma.ui.postMessage({ type: 'progress', message: 'Начинаем проверку иконок...', percent: 0 });
  
  // Вызываем существующую функцию checkIcons из code.js
  const results = await global.checkIcons(global.checkSettings);
  
  // Сбрасываем флаг проверки
  global.isCheckingInProgress = false;
  
  // Отправляем результаты в UI
  figma.ui.postMessage({ type: 'check-results', results });
}

/**
 * Обработчик: Остановка проверки
 */
async function handleStopCheck(msg) {
  // Останавливаем проверку
  global.isCheckingInProgress = false;
  
  // Отправляем сообщение о том, что проверка остановлена
  figma.ui.postMessage({
    type: 'progress',
    message: 'Проверка остановлена пользователем',
    percent: 100
  });
}

/**
 * Обработчик: Исправление ошибки
 */
async function handleFixError(msg) {
  debugLog('Исправление ошибки:', msg.nodeId, msg.errorType);
  await global.fixError(msg.nodeId, msg.errorType);
}

/**
 * Обработчик: Исправление всех ошибок
 */
async function handleFixAllErrors(msg) {
  debugLog('Исправление всех ошибок');
  await global.fixAllErrors(msg.results);
}

/**
 * Обработчик: Получение настроек
 */
async function handleGetSettings(msg) {
  figma.ui.postMessage({ type: 'settings', settings: global.checkSettings });
}

/**
 * Обработчик: Обновление настроек
 */
async function handleUpdateSettings(msg) {
  global.checkSettings = msg.settings;
}

module.exports = {
  handleCheckIcons,
  handleStopCheck,
  handleFixError,
  handleFixAllErrors,
  handleGetSettings,
  handleUpdateSettings
};

