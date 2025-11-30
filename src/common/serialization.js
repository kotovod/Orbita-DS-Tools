/**
 * Утилиты для сериализации данных
 */

/**
 * Безопасно конвертирует значение в строку для логирования
 * @param {any} value - Значение для конвертации
 * @returns {string} Строковое представление
 */
function safeStringify(value) {
  if (value === undefined || value === null) {
    return String(value);
  }
  
  if (typeof value === 'symbol') {
    return 'Symbol';
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Object]';
    }
  }
  
  return String(value);
}

/**
 * Функция очистки объекта от Symbol для postMessage
 * @param {any} obj - Объект для очистки
 * @returns {any} Очищенный объект
 */
function sanitizeForPostMessage(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Если это Symbol, конвертируем в строку
  if (typeof obj === 'symbol') {
    return String(obj);
  }
  
  // Если это примитив, возвращаем как есть
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // Если это массив
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForPostMessage(item));
  }
  
  // Если это объект
  const sanitized = {};
  for (const key in obj) {
    // Пропускаем Symbol ключи
    if (typeof key === 'symbol') {
      continue;
    }
    
    try {
      sanitized[key] = sanitizeForPostMessage(obj[key]);
    } catch (e) {
      console.warn(`Ошибка при sanitize ключа ${key}:`, e);
      sanitized[key] = null;
    }
  }
  
  return sanitized;
}

/**
 * Создаёт безопасную копию токена для передачи в UI
 * @param {any} token - Токен для копирования
 * @returns {Object} Безопасная копия
 */
function createSafeSuggestedToken(token) {
  if (!token) return null;
  
  return {
    id: token.id || null,
    name: token.name || 'Unknown',
    value: safeStringify(token.value),
    type: token.type || 'unknown'
  };
}

module.exports = {
  safeStringify,
  sanitizeForPostMessage,
  createSafeSuggestedToken
};

