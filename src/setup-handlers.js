/**
 * Регистрация всех обработчиков сообщений
 */

const { registerHandlers } = require('./message-router');

// Импортируем обработчики из модулей
const commonHandlers = require('./common-handlers');
const checkIconsHandlers = require('./features/check-icons/handlers');

/**
 * Регистрирует все обработчики сообщений для плагина
 */
function setupMessageHandlers() {
  // Регистрируем общие обработчики
  registerHandlers({
    'focus-node': commonHandlers.handleFocusNode,
    'restore-selection': commonHandlers.handleRestoreSelection,
    'get-selected-node-id': commonHandlers.handleGetSelectedNodeId,
    'close-plugin': commonHandlers.handleClosePlugin
  });

  // Регистрируем обработчики Check Icons
  registerHandlers({
    'check-icons': checkIconsHandlers.handleCheckIcons,
    'stop-check': checkIconsHandlers.handleStopCheck,
    'fix-error': checkIconsHandlers.handleFixError,
    'fix-all-errors': checkIconsHandlers.handleFixAllErrors,
    'get-settings': checkIconsHandlers.handleGetSettings,
    'update-settings': checkIconsHandlers.handleUpdateSettings
  });

  console.log('✅ Зарегистрировано обработчиков:', 10);
  
  // TODO: Добавить обработчики для других модулей:
  // - Design System Validator
  // - AI Design Lint
  // - SVG Export
  // - Node Inspector
  // - Component Properties
  // - Page Text
}

module.exports = {
  setupMessageHandlers
};

