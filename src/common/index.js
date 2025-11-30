/**
 * Общие утилиты плагина Orbita DS Tools
 * Экспортирует все общие модули
 */

const debug = require('./debug');
const colorUtils = require('./color-utils');
const nodeUtils = require('./node-utils');
const serialization = require('./serialization');
const constants = require('./constants');
const storage = require('./storage');

module.exports = {
  ...debug,
  ...colorUtils,
  ...nodeUtils,
  ...serialization,
  ...constants,
  ...storage
};

