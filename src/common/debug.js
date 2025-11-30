/**
 * Утилиты для отладки
 */

// Флаг отладочного режима (можно изменить на false для продакшена)
const DEBUG_MODE = false;

/**
 * Функция для условного логирования
 * @param {...any} args - Аргументы для логирования
 */
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

/**
 * Функция для условного предупреждения
 * @param {...any} args - Аргументы для предупреждения
 */
function debugWarn(...args) {
  if (DEBUG_MODE) {
    console.warn(...args);
  }
}

module.exports = {
  DEBUG_MODE,
  debugLog,
  debugWarn
};

