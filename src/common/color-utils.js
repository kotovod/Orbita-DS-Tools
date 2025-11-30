/**
 * Утилиты для работы с цветами
 */

/**
 * Конвертирует RGB объект в HEX строку
 * @param {Object} rgb - Объект цвета {r, g, b, a?}
 * @returns {string} HEX строка цвета
 */
function rgbToHex(rgb) {
  if (!rgb || typeof rgb !== 'object' || rgb.r === undefined || rgb.g === undefined || rgb.b === undefined) {
    console.warn('Некорректный объект цвета:', rgb);
    return '#000000'; // Возвращаем черный цвет по умолчанию
  }
  
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  const a = rgb.a !== undefined ? Math.round(rgb.a * 255) : 255;
  
  const toHex = (n) => {
    const hex = n.toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  if (a < 255) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  }
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Конвертирует HEX строку в RGB объект
 * @param {string} hex - HEX строка цвета
 * @returns {Object} RGB объект {r, g, b, a?}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  
  if (!result) {
    return null;
  }
  
  const rgb = {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
  
  if (result[4]) {
    rgb.a = parseInt(result[4], 16) / 255;
  }
  
  return rgb;
}

module.exports = {
  rgbToHex,
  hexToRgb
};

