/**
 * Система маршрутизации сообщений
 * Заменяет 33 else-if на чистую структуру обработчиков
 */

const { debugLog } = require('./common/debug');

// Хранилище обработчиков сообщений
const messageHandlers = new Map();

/**
 * Регистрирует обработчик для типа сообщения
 * @param {string} type - Тип сообщения
 * @param {Function} handler - Асинхронная функция-обработчик
 */
function registerHandler(type, handler) {
  if (messageHandlers.has(type)) {
    console.warn(`⚠️ Обработчик для "${type}" уже зарегистрирован. Будет перезаписан.`);
  }
  messageHandlers.set(type, handler);
  debugLog(`✅ Зарегистрирован обработчик: ${type}`);
}

/**
 * Регистрирует несколько обработчиков сразу
 * @param {Object} handlers - Объект {type: handler}
 */
function registerHandlers(handlers) {
  Object.entries(handlers).forEach(([type, handler]) => {
    registerHandler(type, handler);
  });
}

/**
 * Получает обработчик для типа сообщения
 * @param {string} type - Тип сообщения
 * @returns {Function|null} Обработчик или null
 */
function getHandler(type) {
  return messageHandlers.get(type) || null;
}

/**
 * Главный роутер сообщений
 * @param {Object} msg - Сообщение от UI
 */
async function routeMessage(msg) {
  if (!msg || !msg.type) {
    console.error('❌ Сообщение без типа:', msg);
    figma.ui.postMessage({
      type: 'error',
      message: 'Получено сообщение без типа'
    });
    return;
  }

  const handler = getHandler(msg.type);

  if (!handler) {
    console.warn(`⚠️ Неизвестный тип сообщения: ${msg.type}`);
    debugLog('Доступные обработчики:', Array.from(messageHandlers.keys()));
    figma.ui.postMessage({
      type: 'error',
      message: `Неизвестный тип сообщения: ${msg.type}`
    });
    return;
  }

  try {
    debugLog(`📨 Обработка сообщения: ${msg.type}`);
    await handler(msg);
    debugLog(`✅ Сообщение обработано: ${msg.type}`);
  } catch (error) {
    console.error(`❌ Ошибка при обработке сообщения ${msg.type}:`, error);
    figma.ui.postMessage({
      type: 'error',
      message: `Ошибка: ${error.message}`
    });
  }
}

/**
 * Получает список всех зарегистрированных типов сообщений
 * @returns {string[]} Массив типов
 */
function getRegisteredTypes() {
  return Array.from(messageHandlers.keys());
}

/**
 * Очищает все обработчики (для тестов)
 */
function clearHandlers() {
  messageHandlers.clear();
  debugLog('🗑️ Все обработчики очищены');
}

module.exports = {
  registerHandler,
  registerHandlers,
  getHandler,
  routeMessage,
  getRegisteredTypes,
  clearHandlers
};

