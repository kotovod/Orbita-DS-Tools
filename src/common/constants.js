/**
 * Константы плагина
 */

// Версия плагина
const VERSION = '3.0.5';
const VERSION_DATE = '2025-10-17 00:50';

// Размеры UI для разных режимов
const UI_SIZES = {
  'node-id-inspector': { width: 320, height: 300 },
  'svg-export': { width: 360, height: 380 },
  'ai-design-lint': { width: 400, height: 550 },
  'design-system-validator': { width: 450, height: 600 },
  'export-component-properties': { width: 400, height: 450 },
  'get-page-text': { width: 500, height: 600 },
  'check-icons': { width: 400, height: 480 }
};

// Настройки проверок по умолчанию для Check Icons
const DEFAULT_CHECK_SETTINGS = {
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

// Размеры батчей для обработки
const BATCH_SIZES = {
  icons: 30,
  validation: 50,
  export: 20
};

// Типы сообщений
const MESSAGE_TYPES = {
  // Check Icons
  CHECK_ICONS: 'check-icons',
  STOP_CHECK: 'stop-check',
  FIX_ERROR: 'fix-error',
  FIX_ALL_ERRORS: 'fix-all-errors',
  
  // Design System Validator
  DSV_VALIDATE: 'dsv-validate',
  DSV_FOCUS_NODE: 'dsv-focus-node',
  DSV_EXPORT_TOKENS: 'dsv-export-tokens',
  DSV_SAVE_TOKENS: 'dsv-save-tokens',
  DSV_CLEAR_TOKENS: 'dsv-clear-tokens',
  DSV_BIND_TOKEN: 'dsv-bind-token',
  
  // AI Design Lint
  ANALYZE_DESIGN: 'analyze-design-with-ai',
  ANALYZE_COMPONENT: 'analyze-component',
  
  // Common
  FOCUS_NODE: 'focus-node',
  SET_MODE: 'set-mode',
  CLOSE_PLUGIN: 'close-plugin'
};

module.exports = {
  VERSION,
  VERSION_DATE,
  UI_SIZES,
  DEFAULT_CHECK_SETTINGS,
  BATCH_SIZES,
  MESSAGE_TYPES
};

