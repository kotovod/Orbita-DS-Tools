/**
 * Утилиты для работы с нодами Figma
 */

/**
 * Безопасно получает имя ноды
 * @param {SceneNode} node - Нода Figma
 * @returns {string} Имя ноды
 */
function getSafeNodeName(node) {
  if (!node) return 'Unknown';
  
  try {
    const name = node.name;
    if (name === undefined || name === null) return 'Unnamed';
    if (typeof name === 'symbol') return 'Symbol';
    return String(name);
  } catch (e) {
    return 'Error';
  }
}

/**
 * Рекурсивно собирает все дочерние ноды
 * @param {SceneNode} node - Родительская нода
 * @param {Array} collection - Массив для накопления нод
 * @returns {Array} Массив всех дочерних нод
 */
function collectAllChildNodes(node, collection = []) {
  collection.push(node);
  
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      collectAllChildNodes(child, collection);
    }
  }
  
  return collection;
}

/**
 * Проверяет, имеет ли нода определённое значение свойства
 * @param {SceneNode} node - Нода для проверки
 * @param {string} property - Имя свойства
 * @returns {boolean} true если свойство существует и не пустое
 */
function hasPropertyValue(node, property) {
  if (!node || !(property in node)) {
    return false;
  }
  
  const value = node[property];
  
  // Проверка на null/undefined
  if (value === null || value === undefined) {
    return false;
  }
  
  // Проверка массивов
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  // Проверка чисел (0 - это валидное значение)
  if (typeof value === 'number') {
    return true;
  }
  
  return true;
}

/**
 * Получает значение свойства ноды безопасно
 * @param {SceneNode} node - Нода
 * @param {string} property - Имя свойства
 * @returns {any} Значение свойства или null
 */
function getPropertyValue(node, property) {
  if (!node || !(property in node)) {
    return null;
  }
  
  try {
    return node[property];
  } catch (e) {
    console.warn(`Ошибка получения свойства ${property}:`, e);
    return null;
  }
}

module.exports = {
  getSafeNodeName,
  collectAllChildNodes,
  hasPropertyValue,
  getPropertyValue
};

