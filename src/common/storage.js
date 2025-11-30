/**
 * Утилиты для работы с clientStorage
 */

/**
 * Сохраняет данные в clientStorage
 * @param {string} key - Ключ для сохранения
 * @param {any} data - Данные для сохранения
 * @returns {Promise<boolean>} true если успешно
 */
async function saveToStorage(key, data) {
  try {
    await figma.clientStorage.setAsync(key, data);
    console.log(`✅ Данные сохранены в storage: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка сохранения в storage (${key}):`, error);
    return false;
  }
}

/**
 * Загружает данные из clientStorage
 * @param {string} key - Ключ для загрузки
 * @returns {Promise<any>} Загруженные данные или null
 */
async function loadFromStorage(key) {
  try {
    const data = await figma.clientStorage.getAsync(key);
    if (data) {
      console.log(`✅ Данные загружены из storage: ${key}`);
      return data;
    }
    console.log(`ℹ️ Нет данных в storage: ${key}`);
    return null;
  } catch (error) {
    console.error(`❌ Ошибка загрузки из storage (${key}):`, error);
    return null;
  }
}

/**
 * Удаляет данные из clientStorage
 * @param {string} key - Ключ для удаления
 * @returns {Promise<boolean>} true если успешно
 */
async function deleteFromStorage(key) {
  try {
    await figma.clientStorage.deleteAsync(key);
    console.log(`✅ Данные удалены из storage: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка удаления из storage (${key}):`, error);
    return false;
  }
}

/**
 * Получает список всех ключей в storage
 * @returns {Promise<string[]>} Массив ключей
 */
async function getStorageKeys() {
  try {
    const keys = await figma.clientStorage.keysAsync();
    return keys || [];
  } catch (error) {
    console.error('❌ Ошибка получения ключей storage:', error);
    return [];
  }
}

module.exports = {
  saveToStorage,
  loadFromStorage,
  deleteFromStorage,
  getStorageKeys
};

