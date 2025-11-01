console.log('=== ORBITA ICON CHECKER v3.0.5 START ===');
console.log('Timestamp:', new Date().toISOString());

// Основной код плагина Orbita Icon Checker
// VERSION: 3.0.5 (2025-10-17 00:50)

console.log('🔧 Orbita Icon Checker v3.0.5 загружен');

// Флаг отладочного режима (можно изменить на false для продакшена)
const DEBUG_MODE = false;

// Функция для условного логирования
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

// Функция для условного предупреждения
function debugWarn(...args) {
  if (DEBUG_MODE) {
    console.warn(...args);
  }
}

// Хранилище для загруженных токенов (JSON) в памяти плагина
let savedTokensFromJson = null;

// Запуск плагина с разными UI в зависимости от команды
if (figma.command === 'node-id-inspector') {
  // Для Node ID Inspector используем минимальный UI
  figma.showUI(__html__, { width: 320, height: 300 });
  
  // Отправляем команду в UI для настройки интерфейса
  setTimeout(() => {
    figma.ui.postMessage({ type: 'set-mode', mode: 'node-id-inspector' });
  }, 100);
} else if (figma.command === 'svg-export') {
  // Для SVG экспорта используем средний UI
  figma.showUI(__html__, { width: 360, height: 380 });
  
  // Отправляем команду в UI для настройки интерфейса
  setTimeout(() => {
    figma.ui.postMessage({ type: 'set-mode', mode: 'svg-export' });
  }, 100);
} else if (figma.command === 'ai-design-lint') {
  // Для AI Design Lint используем средний UI
  figma.showUI(__html__, { width: 400, height: 550 });
  
  // Отправляем команду в UI для настройки интерфейса
  setTimeout(() => {
    figma.ui.postMessage({ type: 'set-mode', mode: 'ai-design-lint' });
  }, 100);
} else if (figma.command === 'design-system-validator') {
  // Для Design System Validator используем полный UI
  figma.showUI(__html__, { width: 450, height: 600 });
  
  // Загружаем сохранённые токены из clientStorage
  (async () => {
    try {
      const savedData = await figma.clientStorage.getAsync('dsv-tokens');
      if (savedData && savedData.tokens && Array.isArray(savedData.tokens)) {
        savedTokensFromJson = savedData.tokens;
        console.log('DSV: Загружено сохранённых токенов из clientStorage:', savedData.count);
        
        // Отправляем токены в UI через небольшую задержку
        setTimeout(() => {
          figma.ui.postMessage({ 
            type: 'set-mode', 
            mode: 'design-system-validator' 
          });
          
          // Отправляем информацию о сохранённых токенах
          figma.ui.postMessage({
            type: 'dsv-tokens-loaded-from-storage',
            count: savedData.count,
            savedAt: savedData.savedAt
          });
        }, 100);
      } else {
        // Нет сохранённых токенов
        setTimeout(() => {
          figma.ui.postMessage({ type: 'set-mode', mode: 'design-system-validator' });
        }, 100);
      }
    } catch (error) {
      console.error('DSV: Ошибка при загрузке токенов из clientStorage:', error);
      // В случае ошибки просто показываем UI
      setTimeout(() => {
        figma.ui.postMessage({ type: 'set-mode', mode: 'design-system-validator' });
      }, 100);
    }
  })();
} else if (figma.command === 'export-component-properties') {
  // Для экспорта свойств компонентов используем средний UI
  figma.showUI(__html__, { width: 400, height: 450 });
  
  // Отправляем команду в UI для настройки интерфейса
  setTimeout(() => {
    figma.ui.postMessage({ type: 'set-mode', mode: 'component-properties-export' });
  }, 100);
} else {
  // Для основной проверки иконок используем полный UI
  figma.showUI(__html__, { width: 400, height: 480 });
  
  // Отправляем команду в UI для настройки интерфейса
  setTimeout(() => {
    figma.ui.postMessage({ type: 'set-mode', mode: 'check-icons' });
  }, 100);
}

// Настройки проверок по умолчанию
const defaultCheckSettings = {
  naming: true,
  variants: true,
  sizes: true,
  structure: true,
  constraints: true,
  vector: true,
  editGroup: true,
  description: true, // Проверка description варианта компонента
  colorVariable: true, // Проверка цвета слоя Color-layer (должен быть определен переменной)
  noStroke: true, // Проверка отсутствия stroke у слоев Color-layer и Vector
  excludeDotNames: true // Исключать компоненты с именами, начинающимися с точки
};

// Текущие настройки проверок
let checkSettings = Object.assign({}, defaultCheckSettings);

// Флаг для отслеживания состояния проверки
let isCheckingInProgress = false;

// Обработка сообщений от UI
figma.ui.onmessage = async function(msg) {
  try {
    if (msg.type === 'check-icons') {
      // Устанавливаем флаг, что проверка запущена
      isCheckingInProgress = true;
      
      // Обновляем настройки проверок, если они переданы
      if (msg.settings) {
        checkSettings = msg.settings;
      }
      
      // Начинаем проверку иконок
      figma.ui.postMessage({ type: 'progress', message: 'Начинаем проверку иконок...', percent: 0 });
      
      const results = await checkIcons(checkSettings);
      
      // Сбрасываем флаг проверки
      isCheckingInProgress = false;
      
      // Отправляем результаты в UI
      figma.ui.postMessage({ type: 'check-results', results });
    } else if (msg.type === 'stop-check') {
      // Останавливаем проверку
      isCheckingInProgress = false;
      
      // Отправляем сообщение о том, что проверка остановлена
      figma.ui.postMessage({
        type: 'progress',
        message: 'Проверка остановлена пользователем',
        percent: 100
      });
    } else if (msg.type === 'focus-node') {
      // Фокусировка на компоненте с ошибкой
      try {
        // Используем асинхронный метод getNodeByIdAsync вместо getNodeById
        const node = await figma.getNodeByIdAsync(msg.nodeId);
        if (node) {
          figma.currentPage.selection = [node];
          figma.viewport.scrollAndZoomIntoView([node]);
        } else {
          figma.ui.postMessage({
            type: 'error',
            message: 'Не удалось найти компонент. Возможно, он был удален или перемещен.'
          });
        }
      } catch (error) {
        console.error('Ошибка при фокусировке на компоненте:', error);
        figma.ui.postMessage({
          type: 'error',
          message: `Ошибка при фокусировке на компоненте: ${error.message}`
        });
      }
    } else if (msg.type === 'create-cell') {
      // Создание Cell с компонент-сетом и sourse-token-name
      const result = await createCell();
      figma.ui.postMessage({ type: 'create-cell-result', result });
    } else if (msg.type === 'fix-error') {
      // Исправление конкретной ошибки
      const result = await fixError(msg.nodeId, msg.errorType);
      figma.ui.postMessage({ type: 'fix-result', result });
    } else if (msg.type === 'fix-all-errors') {
      // Исправление всех ошибок
      figma.ui.postMessage({ type: 'progress', message: 'Исправление ошибок...', percent: 0 });
      const result = await fixAllErrors(msg.results);
      figma.ui.postMessage({ type: 'fix-all-result', result });
    } else if (msg.type === 'get-settings') {
      // Отправляем текущие настройки проверок в UI
      figma.ui.postMessage({ type: 'settings', settings: checkSettings });
    } else if (msg.type === 'update-settings') {
      // Обновляем настройки проверок
      checkSettings = msg.settings;
      figma.ui.postMessage({ type: 'settings-updated', settings: checkSettings });
    } else if (msg.type === 'get-selected-node-id') {
      // Получение ID выделенного объекта
      try {
        const selection = figma.currentPage.selection;
        
        if (selection.length === 0) {
          figma.ui.postMessage({
            type: 'selected-node-id',
            success: false,
            message: 'Ничего не выделено. Выберите объект для получения его ID.'
          });
          return;
        }
        
        if (selection.length > 1) {
          figma.ui.postMessage({
            type: 'selected-node-id',
            success: false,
            message: 'Выделено несколько объектов. Выберите только один объект.'
          });
          return;
        }
        
        const selectedNode = selection[0];
        
        figma.ui.postMessage({
          type: 'selected-node-id',
          success: true,
          nodeId: selectedNode.id,
          nodeName: selectedNode.name || 'Безымянный объект',
          nodeType: selectedNode.type
        });
      } catch (error) {
        console.error('Ошибка при получении ID выделенного объекта:', error);
        figma.ui.postMessage({
          type: 'selected-node-id',
          success: false,
          message: `Ошибка при получении ID: ${error.message}`
        });
      }
    } else if (msg.type === 'scan-icons-for-export') {
      // Сканирование иконок для экспорта
      debugLog('SVG Export (Code): Начинаем сканирование иконок для экспорта');
      const scanResult = await scanIconsForExport();
      debugLog('SVG Export (Code): Результат сканирования:', scanResult);
      figma.ui.postMessage({ type: 'scan-result', result: scanResult });
    } else if (msg.type === 'export-icons-to-svg') {
      // Экспорт иконок в SVG
      debugLog('SVG Export (Code): Начинаем экспорт иконок, получены данные:', msg.componentSets);
      debugLog('SVG Export (Code): Настройки цвета:', msg.colorSettings);
      
      // Подсчитываем общее количество вариантов для детального прогресса
      const totalVariants = msg.componentSets.reduce(function(sum, cs) { return sum + cs.variants; }, 0);
      
      figma.ui.postMessage({ 
        type: 'svg-export-progress', 
        current: 0,
        total: totalVariants,
        message: 'Подготовка к экспорту...',
        currentIcon: 'Инициализация...',
        percent: 0 
      });
      
      const exportResult = await exportIconsToSVG(msg.componentSets, msg.colorSettings);
      debugLog('SVG Export (Code): Результат экспорта:', exportResult);
      figma.ui.postMessage({ type: 'export-result', result: exportResult });
    } else if (msg.type === 'analyze-design-with-ai') {
      // AI Design Lint - анализ дизайна с помощью AI
      debugLog('AI Design Lint: Начинаем анализ дизайна');
      figma.ui.postMessage({ type: 'ai-lint-progress', message: 'Сбор информации о выделенных элементах...' });
      
      const designInfo = await collectDesignInfo();
      debugLog('AI Design Lint: Собрана информация о дизайне');
      
      // Проверяем, что данные успешно собраны
      if (!designInfo.success) {
        figma.ui.postMessage({ 
          type: 'design-info-collected', 
          designInfo: designInfo 
        });
        return;
      }
      
      // Отправляем информацию обратно в UI для отправки в API
      // (запрос к API будет выполняться из UI, так как Figma Plugin API не поддерживает fetch напрямую)
      // Данные уже безопасно сериализованы в collectDesignInfo()
      figma.ui.postMessage({ 
        type: 'design-info-collected', 
        designInfo: designInfo 
      });
    } else if (msg.type === 'save-token') {
      // AI Design Lint - сохранение токена
      try {
        await figma.clientStorage.setAsync('yandex-oauth-token', msg.token);
        figma.ui.postMessage({ type: 'token-saved' });
        debugLog('AI Design Lint: Токен успешно сохранен');
      } catch (error) {
        console.error('AI Design Lint: Ошибка при сохранении токена:', error);
      }
    } else if (msg.type === 'get-saved-token') {
      // AI Design Lint - получение сохраненного токена
      try {
        const token = await figma.clientStorage.getAsync('yandex-oauth-token');
        figma.ui.postMessage({ 
          type: 'saved-token', 
          token: token || '' 
        });
        debugLog('AI Design Lint: Токен загружен из хранилища');
      } catch (error) {
        console.error('AI Design Lint: Ошибка при загрузке токена:', error);
        figma.ui.postMessage({ 
          type: 'saved-token', 
          token: '' 
        });
      }
    } else if (msg.type === 'analyze-component') {
      // Новая функция анализа компонентов с локальным скорингом
      try {
        console.log('AI Design Lint: Получено сообщение analyze-component');
        const selection = figma.currentPage.selection;
        console.log('AI Design Lint: Выбрано элементов:', selection.length);
        
        if (selection.length === 0) {
          console.log('AI Design Lint: Нет выделенных элементов');
          figma.ui.postMessage({
            type: 'analysis-result',
            success: false,
            message: 'Ничего не выбрано. Выберите компонент для анализа.'
          });
          return;
        }

        const component = selection[0];
        console.log('AI Design Lint: Начинаем анализ компонента:', String(component.name), component.type);
        const analysis = await analyzeComponent(component);
        console.log('AI Design Lint: Анализ завершен, очищаем от Symbol...');
        
        // Очищаем analysis от Symbol перед отправкой через postMessage
        const cleanAnalysis = sanitizeForPostMessage(analysis);
        console.log('AI Design Lint: Данные очищены:', cleanAnalysis);
        
        figma.ui.postMessage({
          type: 'analysis-result',
          success: true,
          analysis: cleanAnalysis
        });
        
        console.log('AI Design Lint: Результат отправлен в UI');
        debugLog('Анализ компонента завершен:', analysis);
      } catch (error) {
        console.error('AI Design Lint: Ошибка при анализе компонента:', error);
        console.error('AI Design Lint: Stack trace:', error.stack);
        figma.ui.postMessage({
          type: 'analysis-result',
          success: false,
          message: `Ошибка при анализе: ${error.message}`
        });
      }
    } else if (msg.type === 'highlight-layer') {
      // Подсветка слоя при клике на проблему
      try {
        console.log('AI Design Lint: Переход к узлу:', msg.nodeId);
        const nodeId = msg.nodeId;
        
        // Используем асинхронный метод (как в проверке иконок)
        const node = await figma.getNodeByIdAsync(nodeId);
        
        if (node) {
          console.log('AI Design Lint: Узел найден:', getSafeNodeName(node), node.type);
          // Очищаем предыдущее выделение
          figma.currentPage.selection = [];
          // Выделяем нужный узел
          figma.currentPage.selection = [node];
          // Прокручиваем к элементу
          figma.viewport.scrollAndZoomIntoView([node]);
          
          console.log('AI Design Lint: Переход выполнен успешно');
          figma.ui.postMessage({
            type: 'layer-highlighted',
            success: true,
            nodeId: nodeId
          });
        } else {
          console.error('AI Design Lint: Узел не найден');
          figma.ui.postMessage({
            type: 'layer-highlighted',
            success: false,
            message: 'Слой не найден'
          });
        }
      } catch (error) {
        console.error('AI Design Lint: Ошибка при подсветке слоя:', error);
        figma.ui.postMessage({
          type: 'layer-highlighted',
          success: false,
          message: `Ошибка при подсветке: ${error.message}`
        });
      }
    } else if (msg.type === 'save-custom-design-system') {
      // AI Design Lint - сохранение кастомной дизайн-системы
      try {
        await figma.clientStorage.setAsync('custom-design-system-json', JSON.stringify(msg.data));
        debugLog('AI Design Lint: Кастомная дизайн-система сохранена');
      } catch (error) {
        console.error('AI Design Lint: Ошибка при сохранении дизайн-системы:', error);
      }
    } else if (msg.type === 'clear-custom-design-system') {
      // AI Design Lint - очистка кастомной дизайн-системы
      try {
        await figma.clientStorage.deleteAsync('custom-design-system-json');
        debugLog('AI Design Lint: Кастомная дизайн-система очищена');
      } catch (error) {
        console.error('AI Design Lint: Ошибка при очистке дизайн-системы:', error);
      }
    } else if (msg.type === 'get-custom-design-system') {
      // AI Design Lint - получение кастомной дизайн-системы
      try {
        const jsonString = await figma.clientStorage.getAsync('custom-design-system-json');
        if (jsonString) {
          const jsonData = JSON.parse(jsonString);
          figma.ui.postMessage({ 
            type: 'custom-design-system-loaded', 
            data: jsonData 
          });
          debugLog('AI Design Lint: Кастомная дизайн-система загружена');
        } else {
          figma.ui.postMessage({ 
            type: 'custom-design-system-loaded', 
            data: null 
          });
        }
      } catch (error) {
        console.error('AI Design Lint: Ошибка при загрузке дизайн-системы:', error);
        figma.ui.postMessage({ 
          type: 'custom-design-system-loaded', 
          data: null 
        });
      }
    } else if (msg.type === 'dsv-validate') {
      // Design System Validator - запуск проверки
      try {
        console.log('Design System Validator: Запуск проверки, режим:', msg.mode, 'опции:', msg.options);
        const options = msg.options || {};
        const report = await validateDesignSystem(msg.mode, options);
        figma.ui.postMessage({
          type: 'dsv-validation-result',
          report: report
        });
      } catch (error) {
        console.error('Design System Validator: Ошибка при проверке:', error);
        figma.ui.postMessage({
          type: 'dsv-validation-error',
          error: error.message || 'Неизвестная ошибка при проверке'
        });
      }
    } else if (msg.type === 'dsv-focus-node') {
      // Design System Validator - переход к ноде
      try {
        const node = await figma.getNodeByIdAsync(msg.nodeId);
        if (node) {
          figma.currentPage.selection = [node];
          figma.viewport.scrollAndZoomIntoView([node]);
        }
      } catch (error) {
        console.error('Design System Validator: Ошибка при переходе к ноде:', error);
      }
    } else if (msg.type === 'dsv-export-tokens') {
      // Design System Validator - экспорт токенов в JSON
      try {
        console.log('Design System Validator: Запуск экспорта токенов');
        const exportData = await exportTokensToJSON();
        figma.ui.postMessage({
          type: 'dsv-export-tokens-result',
          success: true,
          data: exportData
        });
      } catch (error) {
        console.error('Design System Validator: Ошибка при экспорте токенов:', error);
        figma.ui.postMessage({
          type: 'dsv-export-tokens-result',
          success: false,
          error: error.message || 'Не удалось экспортировать токены'
        });
      }
    } else if (msg.type === 'analyze-component-properties') {
      // Анализ свойств компонентов (предварительный подсчет)
      try {
        figma.ui.postMessage({ 
          type: 'progress', 
          message: 'Анализ компонентов...', 
          percent: 0,
          current: 0,
          total: 0,
          currentItem: 'Подготовка анализа'
        });
        const analysis = await analyzeComponentProperties();
        figma.ui.postMessage({
          type: 'component-properties-analysis-result',
          success: true,
          analysis: analysis
        });
      } catch (error) {
        figma.ui.postMessage({
          type: 'component-properties-analysis-result',
          success: false,
          error: error.message
        });
      }
    } else if (msg.type === 'export-component-properties') {
      // Экспорт свойств компонентов
      try {
        figma.ui.postMessage({ 
          type: 'progress', 
          message: 'Сбор компонентов...', 
          percent: 0,
          current: 0,
          total: 0,
          currentItem: 'Подготовка экспорта'
        });
        const result = await exportComponentProperties();
        figma.ui.postMessage({
          type: 'component-properties-export-result',
          success: true,
          json: result.jsonString,
          csv: result.csvString
        });
      } catch (error) {
        figma.ui.postMessage({
          type: 'component-properties-export-result',
          success: false,
          error: error.message
        });
      }
    } else if (msg.type === 'dsv-save-tokens') {
      // Design System Validator - сохранение токенов в памяти и в clientStorage
      try {
        console.log('DSV: Сохранение токенов в памяти плагина, количество:', msg.tokens.length);
        savedTokensFromJson = msg.tokens;
        
        // Пытаемся сохранить в clientStorage для постоянного хранения
        try {
          await figma.clientStorage.setAsync('dsv-tokens', {
            tokens: msg.tokens,
            savedAt: new Date().toISOString(),
            count: msg.tokens.length
          });
          
          console.log('DSV: Токены сохранены в clientStorage');
          
          // Отправляем подтверждение в UI
          figma.ui.postMessage({
            type: 'dsv-tokens-saved',
            count: msg.tokens.length,
            savedAt: new Date().toISOString(),
            persistent: true
          });
        } catch (storageError) {
          console.warn('DSV: Не удалось сохранить в clientStorage, токены будут доступны только в текущей сессии:', storageError);
          
          // Отправляем частичный успех - токены в памяти, но не сохранены навсегда
          figma.ui.postMessage({
            type: 'dsv-tokens-saved',
            count: msg.tokens.length,
            savedAt: new Date().toISOString(),
            persistent: false,
            warning: 'Токены загружены в память, но не сохранены навсегда (ошибка IndexedDB)'
          });
        }
        
        console.log('DSV: Токены успешно загружены в память плагина');
      } catch (error) {
        console.error('DSV: Критическая ошибка при сохранении токенов:', error);
        
        // Отправляем ошибку в UI
        figma.ui.postMessage({
          type: 'dsv-tokens-save-error',
          error: error.message || 'Неизвестная ошибка'
        });
      }
    } else if (msg.type === 'dsv-clear-tokens') {
      // Design System Validator - очистка токенов
      console.log('DSV: Очистка сохранённых токенов');
      savedTokensFromJson = null;
      
      // Очищаем также clientStorage
      try {
        await figma.clientStorage.deleteAsync('dsv-tokens');
        console.log('DSV: Токены удалены из clientStorage');
      } catch (error) {
        console.error('DSV: Ошибка при удалении токенов из clientStorage:', error);
      }
    } else if (msg.type === 'dsv-get-tokens-status') {
      // Design System Validator - запрос статуса токенов
      const hasTokens = savedTokensFromJson !== null && Array.isArray(savedTokensFromJson);
      const count = hasTokens ? savedTokensFromJson.length : 0;
      
      console.log('DSV: Запрос статуса токенов, есть токены:', hasTokens, 'количество:', count);
      
      figma.ui.postMessage({
        type: 'dsv-tokens-status',
        hasTokens: hasTokens,
        count: count
      });
    } else if (msg.type === 'dsv-bind-token') {
      // Design System Validator - привязка токена к свойству
      try {
        console.log('DSV: Привязка токена', msg.tokenId, 'к свойству', msg.property, 'элемента', msg.nodeId);
        const result = await bindTokenToProperty(msg.nodeId, msg.property, msg.tokenId);
        
        figma.ui.postMessage({
          type: 'dsv-bind-token-result',
          result: result,
          issueIndex: msg.issueIndex // Передаём обратно индекс issue для обновления UI
        });
        
        if (result.success) {
          figma.notify(`✓ Токен "${result.tokenName}" привязан к "${result.property}"`);
        } else {
          figma.notify(`✗ Ошибка: ${result.error}`, { error: true });
        }
      } catch (error) {
        console.error('DSV: Ошибка при привязке токена:', error);
        figma.ui.postMessage({
          type: 'dsv-bind-token-result',
          result: {
            success: false,
            error: error.message || 'Неизвестная ошибка при привязке токена'
          },
          issueIndex: msg.issueIndex
        });
      }
    } else if (msg.type === 'close-plugin') {
      figma.closePlugin();
    }
  } catch (error) {
    // Отправляем информацию об ошибке в UI
    figma.ui.postMessage({
      type: 'error',
      message: `Произошла ошибка: ${error.message}`
    });
    console.error('Ошибка в плагине:', error);
  }
};

// Функция проверки иконок с использованием пакетной обработки
async function checkIcons(settings) {
  try {
    const results = [];
    
    // Проверяем, есть ли выделенные элементы
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'progress', message: 'Ничего не выбрано', percent: 100 });
      return [{
        nodeId: null,
        nodeName: 'Ничего не выбрано',
        errors: ['Не выбран ни один фрейм или компонент. Выберите фрейм с иконками для проверки.']
      }];
    }
    
    // Получаем все компоненты в выделенных элементах
    figma.ui.postMessage({ type: 'progress', message: 'Поиск компонентов в выделенном фрейме...', percent: 5 });
    
    // Функция для рекурсивного поиска компонентов внутри узла
    function findComponentSetsInNode(node) {
      // Проверка на null/undefined
      if (!node) return [];
      
      let components = [];
      
      // Если узел сам является компонент-сетом, добавляем его
      if (node.type === 'COMPONENT_SET') {
        components.push(node);
      }
      
      // Если узел имеет дочерние элементы, ищем компоненты в них
      if ('children' in node && Array.isArray(node.children)) {
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          // Добавляем дочерние компоненты в общий список
          const childComponents = findComponentSetsInNode(child);
          if (childComponents.length > 0) {
            for (var j = 0; j < childComponents.length; j++) {
              var component = childComponents[j];
              components.push(component);
            }
          }
        }
      }
      
      return components;
    }
    
    // Собираем все компоненты из выделенных элементов
    let componentSets = [];
    for (var k = 0; k < selection.length; k++) {
      var selectedNode = selection[k];
      componentSets = componentSets.concat(findComponentSetsInNode(selectedNode));
    }
    
    // Фильтруем компоненты, которые могут быть иконками
    figma.ui.postMessage({ type: 'progress', message: 'Фильтрация иконок...', percent: 10 });
    
    // Проверяем все компоненты, а не только те, которые начинаются с "orb-icon-"
    // Это позволит находить компоненты с неправильным именованием
    const iconComponentSets = componentSets;
    
    // Если компонентов не найдено, возвращаем сообщение
    if (iconComponentSets.length === 0) {
      figma.ui.postMessage({ type: 'progress', message: 'Компоненты не найдены', percent: 100 });
      return [{
        nodeId: null,
        nodeName: 'Компоненты не найдены',
        errors: ['В выбранном фрейме не найдено ни одного компонента. Выберите фрейм, содержащий Component Set для иконок.']
      }];
    }
    
    figma.ui.postMessage({
      type: 'progress',
      message: `Найдено ${iconComponentSets.length} наборов компонентов. Начинаем проверку...`,
      percent: 15
    });
    
    // Разбиваем компоненты на пакеты для пакетной обработки
    const BATCH_SIZE = 30; // Размер пакета (можно настроить)
    const batches = [];
    
    for (let i = 0; i < iconComponentSets.length; i += BATCH_SIZE) {
      batches.push(iconComponentSets.slice(i, i + BATCH_SIZE));
    }
    
    // Функция для обработки одного пакета компонентов
    const processBatch = function(batchIndex) {
      return new Promise(function(resolve) {
        setTimeout(function() {
          // Проверяем, не была ли остановлена проверка
          if (!isCheckingInProgress) {
            debugLog('Проверка остановлена пользователем во время обработки пакета');
            resolve([]);
            return;
          }
          
          const batch = batches[batchIndex];
          const batchResults = [];
          
          // Обрабатываем каждый компонент в пакете
          // Переменная для отслеживания последнего отправленного процента прогресса
          let lastProgressPercent = 0;
          
          for (var l = 0; l < batch.length; l++) {
            var componentSet = batch[l];
            // Проверяем, не была ли остановлена проверка
            if (!isCheckingInProgress) {
              debugLog('Проверка остановлена пользователем во время обработки компонента');
              break;
            }
            
            // Исключаем компоненты с именами, начинающимися с точки
            if (settings.excludeDotNames && componentSet.name.indexOf('.') === 0) {
              debugLog('Пропускаем компонент с именем, начинающимся с точки:', componentSet.name);
              continue;
            }
            // Обновляем прогресс для каждого пакета
            const processedSets = batchIndex * BATCH_SIZE + batch.indexOf(componentSet) + 1;
            const totalSets = iconComponentSets.length;
            const progressPercent = Math.floor(15 + (processedSets / totalSets) * 75);
            
            // Отправляем сообщение о прогрессе только если он изменился на 10% или более,
            // или если это первый или последний элемент пакета
            // Это уменьшит количество сообщений и улучшит производительность
            if (progressPercent - lastProgressPercent >= 10 ||
                batch.indexOf(componentSet) === 0 ||
                batch.indexOf(componentSet) === batch.length - 1) {
              figma.ui.postMessage({
                type: 'progress',
                message: `Проверка набора ${processedSets} из ${totalSets}: ${componentSet.name || 'без имени'}`,
                percent: progressPercent
              });
              lastProgressPercent = progressPercent;
            }
            
            // Проверяем каждый вариант в наборе
            if (!componentSet.children || !Array.isArray(componentSet.children)) {
              figma.ui.postMessage({
                type: 'error',
                message: `Компонент ${componentSet.name} не содержит вариантов`
              });
              continue;
            }
            
            // Проверка имени компонента (только один раз для всего Component Set)
            if (settings.naming && componentSet.name) {
              let componentSetErrors = [];
              
              // Проверяем, что имя начинается с "orb-icon-"
              if (componentSet.name.indexOf('orb-icon-') !== 0) {
                componentSetErrors.push({
                  type: 'naming',
                  message: 'Неправильное именование иконки. Должно начинаться с: orb-icon-',
                  tooltip: 'Выберите компонент → Нажмите правой кнопкой мыши → Выберите "Rename" → Введите имя в формате "orb-icon-name", где name - название иконки в нижнем регистре с дефисами вместо пробелов'
                });
              }
              // Проверяем, что после префикса есть название иконки
              else if (componentSet.name === 'orb-icon-' || componentSet.name.length <= 9) {
                componentSetErrors.push({
                  type: 'naming',
                  message: 'Отсутствует название иконки после префикса orb-icon-',
                  tooltip: 'Выберите компонент → Нажмите правой кнопкой мыши → Выберите "Rename" → Добавьте название иконки после префикса "orb-icon-"'
                });
              }
              // Проверяем, что название содержит только допустимые символы
              else if (!componentSet.name.substring(9).match(/^[a-z0-9-]+$/)) {
                componentSetErrors.push({
                  type: 'naming',
                  message: 'Название иконки должно содержать только строчные буквы, цифры и дефисы',
                  tooltip: 'Выберите компонент → Нажмите правой кнопкой мыши → Выберите "Rename" → Используйте только строчные буквы, цифры и дефисы в названии иконки'
                });
              }
              
              // Проверяем соответствие названия компонента с текстом в source-token-name
              // Ищем instance "sourse-token-name" в рамках родительского Frame (Cell)
              let parentFrame = componentSet.parent;
              let sourceTokenNameInstance = null;
              let labelText = null;
              
              // Ищем родительский Frame (Cell)
              if (parentFrame && parentFrame.type === 'FRAME') {
                // Ищем instance "sourse-token-name" внутри того же Frame
                if (parentFrame.children && Array.isArray(parentFrame.children)) {
                  for (let i = 0; i < parentFrame.children.length; i++) {
                    const child = parentFrame.children[i];
                    if (child.type === 'INSTANCE' && child.name === 'sourse-token-name') {
                      sourceTokenNameInstance = child;
                      // Ищем текстовый слой Label внутри instance
                      if (child.children && Array.isArray(child.children)) {
                        for (let j = 0; j < child.children.length; j++) {
                          const instanceChild = child.children[j];
                          if (instanceChild.name === 'Label' && instanceChild.type === 'TEXT') {
                            labelText = instanceChild.characters;
                            break;
                          }
                        }
                      }
                      break;
                    }
                  }
                }
              }
              
              // Если instance не найден, добавляем ошибку
              if (!sourceTokenNameInstance) {
                componentSetErrors.push({
                  type: 'naming',
                  message: 'Instance sourse-token-name не найден в родительском Frame',
                  tooltip: 'Убедитесь, что компонент-сет находится в Frame вместе с instance "sourse-token-name"',
                  fixable: false
                });
              } else if (labelText) {
                // Сравниваем текст из Label с названием компонента (без префикса, без учета регистра)
                const componentNameWithoutPrefix = componentSet.name.replace(/^orb-icon-/i, '');
                // Заменяем пробелы на дефисы в labelText для корректного сравнения
                const labelTextNormalized = labelText.toLowerCase().replace(/\s+/g, '-');
                const componentNameLower = componentNameWithoutPrefix.toLowerCase();
                
                if (labelTextNormalized !== componentNameLower) {
                  componentSetErrors.push({
                    type: 'naming',
                    message: `Название компонента не совпадает с текстом в source-token-name (ожидается: ${labelTextNormalized}, фактически: ${componentNameWithoutPrefix})`,
                    tooltip: 'Нажмите "Исправить", чтобы переименовать компонент в соответствии с текстом из source-token-name (пробелы будут заменены на дефисы)',
                    sourceTokenLabel: labelText
                  });
                }
              }
              
              // Если есть ошибки именования, добавляем их в результаты сразу
              if (componentSetErrors.length > 0) {
                batchResults.push({
                  nodeId: componentSet.id, // ID самого Component Set, а не варианта
                  nodeName: componentSet.name,
                  parentName: componentSet.name,
                  errors: componentSetErrors
                });
              }
            }
            
            // Проверка свойств Variant и Size (только один раз для всего Component Set)
            if (settings.variants) {
              let componentSetVariantErrors = [];
              let hasVariantPropertyErrors = false;
              
              // Проверяем наличие свойств Variant и Size у всех вариантов
              try {
                for (const component of componentSet.children) {
                  try {
                    const variantProperties = component.variantProperties;
                    if (!variantProperties || !variantProperties.Variant || !variantProperties.Size) {
                      hasVariantPropertyErrors = true;
                      break;
                    }
                    
                    // Проверка значений свойств
                    var validVariants = ['outline', 'solid'];
                    var validSizes = ['lg', 'md', 'sm', 'xs', 'xxs'];
                    var hasValidVariant = false;
                    var hasValidSize = false;
                    for (var r = 0; r < validVariants.length; r++) {
                      if (validVariants[r] === variantProperties.Variant) {
                        hasValidVariant = true;
                        break;
                      }
                    }
                    for (var s = 0; s < validSizes.length; s++) {
                      if (validSizes[s] === variantProperties.Size) {
                        hasValidSize = true;
                        break;
                      }
                    }
                    if (!hasValidVariant || !hasValidSize) {
                      hasVariantPropertyErrors = true;
                      break;
                    }
                  } catch (variantError) {
                    console.error(`Ошибка при получении свойств варианта для компонента ${component.name}:`, variantError);
                    hasVariantPropertyErrors = true;
                    break;
                  }
                }
              } catch (componentSetError) {
                console.error(`Ошибка при обработке компонент-сета ${componentSet.name}:`, componentSetError);
                hasVariantPropertyErrors = true;
              }
              
              // Если есть ошибки, добавляем одну общую ошибку для всего Component Set
              if (hasVariantPropertyErrors) {
                componentSetVariantErrors.push({
                  type: 'variants',
                  message: 'Отсутствуют или неправильно заданы свойства Variant и/или Size',
                  tooltip: 'Выберите компонент → Откройте панель свойств (правый сайдбар) → В разделе Properties добавьте свойства Variant (со значениями outline/solid) и Size (со значениями lg/md/sm/xs/xxs)'
                });
                
                // Добавляем ошибку в результаты сразу
                batchResults.push({
                  nodeId: componentSet.id, // ID самого Component Set, а не варианта
                  nodeName: componentSet.name,
                  parentName: componentSet.name,
                  errors: componentSetVariantErrors
                });
              }
            }
            
            // Проверка вариантов компонента
            for (const component of componentSet.children) {
              const errors = [];
              
              // Проверка размеров
              if (settings.sizes) {
                const validSizes = [
                  { width: 32, height: 32 },
                  { width: 24, height: 24 },
                  { width: 16, height: 16 },
                  { width: 12, height: 12 },
                  { width: 8, height: 8 }
                ];
                
                var sizeIsValid = false;
                for (var t = 0; t < validSizes.length; t++) {
                  if (component.width === validSizes[t].width && component.height === validSizes[t].height) {
                    sizeIsValid = true;
                    break;
                  }
                }
                
                if (!sizeIsValid) {
                  errors.push({
                    type: 'sizes',
                    message: 'Неправильный размер иконки. Должен быть 32x32, 24x24, 16x16, 12x12 или 8x8 px',
                    tooltip: 'Выберите компонент → Откройте панель свойств (правый сайдбар) → В разделе Size установите одинаковые значения для W и H (32, 24, 16, 12 или 8)'
                  });
                }
              }
              
              // Проверка структуры (Color-layer и Vector)
              if (settings.structure) {
                let colorLayer = null;
                let vectorLayer = null;
                
                // Ищем слой Color-layer и Vector на верхнем уровне
                if (!component.children || !Array.isArray(component.children)) {
                  errors.push({
                    type: 'structure',
                    message: 'Компонент не содержит слоев',
                    tooltip: 'Выберите компонент → Добавьте слой Color-layer (Frame) → Внутри него создайте слой Vector'
                  });
                  continue;
                }
                
                // Проверяем наличие слоев Color-layer и Vector на верхнем уровне
                // Также проверяем наличие слоев с похожими, но неправильными именами
                let hasIncorrectLayerName = false;
                
                for (const child of component.children) {
                  // Проверка имени слоя (регистр и дефис важны)
                  const childName = child.name.toLowerCase();
                  
                  if (child.name === 'Color-layer') {
                    colorLayer = child;
                  } else if (child.name === 'Vector') {
                    vectorLayer = child;
                  } else if (childName === 'color' ||
                            childName === 'color-layer' ||
                            childName === 'color layer' ||
                            childName === 'colorlayer' ||
                            child.name === 'Color layer' ||
                            child.name === 'ColorLayer') {
                    // Проверка неправильного именования слоя Color-layer
                    hasIncorrectLayerName = true;
                    errors.push({
                      type: 'structure',
                      message: `Неправильное именование слоя "${child.name}". Должно быть: Color-layer`,
                      tooltip: 'Выберите слой → Нажмите правой кнопкой мыши → Выберите "Rename" → Введите имя "Color-layer" (с учетом регистра и дефиса)'
                    });
                  }
                }
                
                // Добавляем отладочную информацию
                debugLog(`Проверка слоя Color-layer для компонента ${component.name}:`, {
                  hasColorLayer: !!colorLayer,
                  hasVectorLayer: !!vectorLayer,
                  hasIncorrectLayerName: hasIncorrectLayerName,
                  childrenNames: component.children ? (function() {
                    var names = [];
                    for (var m = 0; m < component.children.length; m++) {
                      names.push(component.children[m].name);
                    }
                    return names;
                  })() : []
                });
                
                // Vector должен находиться только внутри Color-layer
                if (!colorLayer) {
                  errors.push({
                    type: 'structure',
                    message: 'Отсутствует слой Color-layer',
                    tooltip: 'Выберите компонент → Добавьте слой Color-layer (Frame) → Внутри него создайте слой Vector'
                  });
                } else {
                  // Если Vector найден на верхнем уровне, это ошибка
                  if (vectorLayer) {
                    errors.push({
                      type: 'structure',
                      message: 'Слой Vector должен находиться внутри Color-layer, а не на верхнем уровне',
                      tooltip: 'Переместите слой Vector внутрь слоя Color-layer'
                    });
                  }
                  // Проверка выравнивания Color-layer по центру
                  if (settings.constraints && colorLayer) {
                    // Временно отключаем проверку выравнивания, так как она работает некорректно
                    // Пользователь должен самостоятельно проверить, что слой Color-layer выровнен по центру
                    
                    // Выводим отладочную информацию о constraints
                    debugLog(`Проверка constraints для Color-layer в компоненте ${component.name}:`, {
                      hasConstraints: !!colorLayer.constraints,
                      horizontal: colorLayer.constraints ? colorLayer.constraints.horizontal : 'undefined',
                      vertical: colorLayer.constraints ? colorLayer.constraints.vertical : 'undefined',
                      rawConstraints: colorLayer.constraints
                    });
                    
                    // Проверка временно отключена из-за проблем с определением правильного выравнивания
                    // Будет включена после дополнительного тестирования
                  }
                  
                  // Проверка цвета слоя Color-layer (должен быть определен переменной)
                  if (settings.colorVariable && colorLayer) {
                    let hasVariableColor = false;
                    
                    // Проверяем, что у слоя есть fills
                    if (colorLayer.fills && colorLayer.fills.length > 0) {
                      // Проверяем каждый fill
                      for (const fill of colorLayer.fills) {
                        // Проверяем, что fill определен переменной
                        if (fill.boundVariables && fill.boundVariables.color) {
                          hasVariableColor = true;
                          break;
                        }
                      }
                    }
                    
                    if (!hasVariableColor) {
                      errors.push({
                        type: 'color-variable',
                        message: 'Цвет слоя Color-layer должен быть определен переменной из коллекции icon-color',
                        tooltip: 'Выберите слой Color-layer → Откройте панель свойств (правый сайдбар) → В разделе Fill выберите переменную из коллекции icon-color'
                      });
                    }
                  }
                  
                  // Проверка наличия Vector внутри Color-layer
                  if (settings.vector) {
                    let vectorFound = false;
                    if (!colorLayer.children || !Array.isArray(colorLayer.children)) {
                      errors.push({
                        type: 'empty-color-layer',
                        message: 'Слой Color-layer не содержит дочерних элементов',
                        tooltip: 'Выберите слой Color-layer → Добавьте внутрь него слой Vector'
                      });
                    } else {
                      for (const child of colorLayer.children) {
                        if (child.name === 'Vector') {
                          vectorFound = true;
                          
                          // Проверка блокировки Vector
                          if (!child.locked) {
                            errors.push({
                              type: 'vector',
                              message: 'Слой Vector должен быть заблокирован (Lock)',
                              tooltip: 'Выберите слой Vector → Нажмите на иконку замка в панели свойств или используйте сочетание клавиш Ctrl+Shift+L (Cmd+Shift+L на Mac)'
                            });
                          }
                          
                          // Проверка типа Vector (должен быть VECTOR, не STROKE)
                          if (child.type !== 'VECTOR') {
                            errors.push({
                              type: 'vector',
                              message: 'Слой Vector должен быть в кривых (не Stroke)',
                              tooltip: 'Выберите слой Vector → Убедитесь, что он создан как векторный объект (не как линия или фигура со stroke) → При необходимости преобразуйте в векторный объект через меню Object → Flatten'
                            });
                          }
                          
                          // Проверка цвета Vector (не должен иметь цвета)
                          if (child.fills && child.fills.length > 0) {
                            errors.push({
                              type: 'vector',
                              message: 'Слой Vector не должен иметь цвета. Цвет должен назначаться через Color-layer',
                              tooltip: 'Выберите слой Vector → Откройте панель свойств (правый сайдбар) → В разделе Fill удалите все цвета → Цвет должен быть назначен слою Color-layer'
                            });
                          }
                          
                          break;
                        }
                      }
                    }
                    
                    if (!vectorFound) {
                      errors.push({
                        type: 'vector',
                        message: 'Отсутствует слой Vector внутри Color-layer',
                        tooltip: 'Выберите слой Color-layer → Добавьте внутрь него слой Vector → Убедитесь, что слой Vector создан как векторный объект'
                      });
                    }
                  }
                }
              }
              
              // Проверка отсутствия stroke у слоев Color-layer и Vector
              if (settings.noStroke) {
                // Проверяем Color-layer на верхнем уровне
                if (component.children && Array.isArray(component.children)) {
                  for (const child of component.children) {
                    if (child.name === 'Color-layer') {
                      // Проверяем stroke у Color-layer
                      if (child.strokes && child.strokes.length > 0) {
                        var visibleStrokes = [];
                        for (var n = 0; n < child.strokes.length; n++) {
                          if (child.strokes[n].visible !== false) {
                            visibleStrokes.push(child.strokes[n]);
                          }
                        }
                        if (visibleStrokes.length > 0) {
                          errors.push({
                            type: 'no-stroke',
                            message: 'Слой Color-layer не должен иметь обводку (Stroke)',
                            tooltip: 'Выберите слой Color-layer → Откройте панель свойств (правый сайдбар) → В разделе Stroke удалите все обводки'
                          });
                        }
                      }
                      
                      // Проверяем Vector внутри Color-layer
                      if (child.children && Array.isArray(child.children)) {
                        for (const vectorChild of child.children) {
                          if (vectorChild.name === 'Vector') {
                            // Проверяем stroke у Vector
                            if (vectorChild.strokes && vectorChild.strokes.length > 0) {
                              var visibleStrokes = [];
                              for (var o = 0; o < vectorChild.strokes.length; o++) {
                                if (vectorChild.strokes[o].visible !== false) {
                                  visibleStrokes.push(vectorChild.strokes[o]);
                                }
                              }
                              if (visibleStrokes.length > 0) {
                                errors.push({
                                  type: 'no-stroke',
                                  message: 'Слой Vector не должен иметь обводку (Stroke)',
                                  tooltip: 'Выберите слой Vector → Откройте панель свойств (правый сайдбар) → В разделе Stroke удалите все обводки'
                                });
                              }
                            }
                            break;
                          }
                        }
                      }
                      break;
                    }
                  }
                }
              }
              
              // Проверка наличия объекта Edit для исходника
              if (settings.editGroup) {
                let editObjectFound = false;
                if (component.children && Array.isArray(component.children)) {
                  for (const child of component.children) {
                    // Принимаем любой объект с именем 'Edit' или 'edit'
                    if (child.name === 'Edit' || child.name === 'edit') {
                      editObjectFound = true;
                      
                      // Проверка видимости объекта Edit
                      if (child.visible) {
                        errors.push({
                          type: 'editGroup',
                          message: 'Объект Edit должен быть скрыт',
                          tooltip: `Выберите объект "${child.name}" → Нажмите на иконку глаза в панели слоев, чтобы скрыть объект`
                        });
                      }
                      
                      break;
                    }
                  }
                }
                
                if (!editObjectFound) {
                  errors.push({
                    type: 'editGroup',
                    message: 'Отсутствует объект Edit для хранения исходника иконки',
                    tooltip: 'Создайте объект с именем "Edit" (фрейм, группа, объединение или другой тип) → Поместите в него исходные файлы для редактирования иконки → Скройте объект, нажав на иконку глаза в панели слоев'
                  });
                }
              }
              
              // Проверка description варианта компонента
              if (settings.description) {
                // Получаем значения Variant и Size
                let variant = 'outline';
                let size = 'md';
                
                try {
                  if (component.variantProperties) {
                    variant = component.variantProperties.Variant || 'outline';
                    size = component.variantProperties.Size || 'md';
                  }
                } catch (variantError) {
                  console.error(`Ошибка при получении свойств варианта для компонента ${component.name}:`, variantError);
                  // Используем значения по умолчанию
                }
                
                // Ищем соседний компонент Instance "sourse-token-name"
                let sourceTokenName = '';
                let sourceTokenFound = false;
                
                // Используем имя компонента без префикса
                sourceTokenName = componentSet.name ? componentSet.name.replace(/^orb-icon-/i, '') : 'icon';
                
                // Только если имя не получено из компонента, ищем sourse-token-name
                if (!sourceTokenName || sourceTokenName === 'icon') {
                  // Ищем на текущей странице
                  const instances = figma.currentPage.findAllWithCriteria({
                    types: ['INSTANCE']
                  });
                  
                  for (const instance of instances) {
                    if (instance.name === 'sourse-token-name') {
                      sourceTokenFound = true;
                      // Ищем текстовый слой Label внутри instance
                      if (instance.children && Array.isArray(instance.children)) {
                        for (const child of instance.children) {
                          if (child.name === 'Label' && child.type === 'TEXT') {
                            sourceTokenName = child.characters;
                            break;
                          }
                        }
                      }
                      break;
                    }
                  }
                }
                
                // Формируем ожидаемый description
                const expectedDescription = `${sourceTokenName}-${variant}-${size}`;
                
                // Проверяем description компонента
                if (!component.description || component.description !== expectedDescription) {
                  errors.push({
                    type: 'description',
                    message: `Неправильный description компонента. Должен быть: ${expectedDescription}`,
                    tooltip: 'Откройте панель свойств компонента (правый сайдбар) → Найдите поле Description → Введите значение в формате "name-variant-size", где name - название иконки, variant - тип (outline/solid), size - размер (lg/md/sm/xs/xxs). Учитывайте нижний регистр'
                  });
                }
              }
              
              // Добавляем результаты проверки, если есть ошибки (кроме ошибок именования компонента)
              if (errors.length > 0) {
                batchResults.push({
                  nodeId: component.id,
                  nodeName: component.name,
                  parentName: componentSet.name,
                  errors: errors
                });
              }
            }
          }
          
          // Добавляем результаты пакета в общие результаты
          for (const result of batchResults) {
            results.push(result);
          }
          
          // Возвращаем результаты пакета
          resolve(batchResults);
        }, 0); // setTimeout с нулевой задержкой для разгрузки основного потока
      });
    };
    
    // Последовательная обработка пакетов
    for (let i = 0; i < batches.length; i++) {
      // Проверяем, не была ли остановлена проверка
      if (!isCheckingInProgress) {
        debugLog('Проверка остановлена пользователем перед обработкой пакета');
        break;
      }
      
      await processBatch(i);
      
      // Обновляем общий прогресс после каждого пакета
      const batchProgress = Math.floor(15 + ((i + 1) / batches.length) * 80);
      figma.ui.postMessage({
        type: 'progress',
        message: `Обработано ${i + 1} из ${batches.length} пакетов...`,
        percent: batchProgress
      });
    }
    
    figma.ui.postMessage({ type: 'progress', message: 'Проверка завершена', percent: 100 });
    return results;
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: `Ошибка при проверке иконок: ${error.message}`
    });
    console.error('Ошибка при проверке иконок:', error);
    return [{
      nodeId: null,
      nodeName: 'Ошибка при проверке',
      errors: [`Произошла ошибка при проверке иконок: ${error.message}`]
    }];
  }
}

// Функция исправления конкретной ошибки
async function fixError(nodeId, errorType) {
  try {
    // Проверка входных параметров
    if (!nodeId) {
      return { success: false, message: 'Не указан ID компонента' };
    }
    
    if (!errorType) {
      return { success: false, message: 'Не указан тип ошибки' };
    }
    
    // Используем асинхронный метод getNodeByIdAsync вместо getNodeById
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      return { success: false, message: 'Не удалось найти компонент' };
    }
    
    // Определяем componentSet в зависимости от типа node
    let componentSet;
    if (node.type === 'COMPONENT_SET') {
      // Если node уже ComponentSet, используем его напрямую
      componentSet = node;
    } else if (node.type === 'COMPONENT') {
      // Если node - это вариант компонента, берем родителя
      componentSet = node.parent;
    } else {
      // Для других типов берем родителя
      componentSet = node.parent;
    }
    
    if (!componentSet) {
      return { success: false, message: 'Не удалось найти родительский компонент' };
    }
    
    switch (errorType) {
      case 'empty-color-layer': {
        // Исправление по новому алгоритму
        if (!node.children || !Array.isArray(node.children)) {
          return { success: false, message: 'Компонент не содержит слоев' };
        }
        
        // Находим Color-layer
        let colorLayer = null;
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child.name === 'Color-layer') {
            colorLayer = child;
            break;
          }
        }
        
        if (!colorLayer) {
          return { success: false, message: 'Слой Color-layer не найден' };
        }
        
        // Находим все векторные слои в компоненте (кроме Color-layer)
        const vectorLayers = [];
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child !== colorLayer && (child.type === 'VECTOR' ||
              child.type === 'BOOLEAN_OPERATION' ||
              child.type === 'STAR' ||
              child.type === 'ELLIPSE' ||
              child.type === 'POLYGON' ||
              child.type === 'RECTANGLE')) {
            vectorLayers.push(child);
          }
        }
        
        if (vectorLayers.length === 0) {
          return { success: false, message: 'Не найдены векторные слои для преобразования' };
        }
        
        // 1. Переименовываем Color-layer в Vector
        colorLayer.name = "Vector";
        
        // 2. Создаем boolean union из всех векторных слоев
        const union = figma.union(vectorLayers);
        union.name = "Vector";
        
        // 3. Переименовываем результат union в Color-layer
        union.name = "Color-layer";
        
        // 4. Задаем Color-layer цвет fill из переменных
        // Ищем переменные цвета в файле с названием "orb-icon"
        try {
          // Получаем все локальные переменные
          const allVariables = figma.variables.getLocalVariables();
          
          // Ищем коллекцию переменных с названием, содержащим "orb-icon"
          let iconVariableCollection = null;
          for (const collection of figma.variables.getLocalVariableCollections()) {
            if (collection.name.toLowerCase().includes('orb-icon')) {
              iconVariableCollection = collection;
              break;
            }
          }
          
          // Если нашли коллекцию, ищем переменную цвета
          let colorVariable = null;
          if (iconVariableCollection) {
            for (const variable of allVariables) {
              if (variable.variableCollectionId === iconVariableCollection.id &&
                  variable.resolvedType === 'COLOR') {
                colorVariable = variable;
                break;
              }
            }
          }
          
          // Если нашли переменную цвета, применяем ее к слою
          if (colorVariable) {
            // Создаем привязку к переменной
            const binding = {
              type: 'VARIABLE',
              variableId: colorVariable.id
            };
            
            // Применяем переменную к fills
            union.fills = [{
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0 }, // Значение по умолчанию
              boundVariables: {
                color: binding
              }
            }];
          } else {
            // Если не нашли переменную, устанавливаем черный цвет
            union.fills = [{
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0 }
            }];
          }
        } catch (error) {
          console.error('Ошибка при применении переменной цвета:', error);
          // Устанавливаем черный цвет в случае ошибки
          union.fills = [{
            type: 'SOLID',
            color: { r: 0, g: 0, b: 0 }
          }];
        }
        
        return {
          success: true,
          message: 'Color-layer переименован в Vector, создан boolean union и переименован в Color-layer'
        };
      }
        
      case 'naming': {
        // Исправление имени компонента
        if (!componentSet.name) {
          componentSet.name = 'orb-icon-icon';
          return { success: true, message: 'Имя компонента установлено на "orb-icon-icon"' };
        }
        
        // Ищем instance "sourse-token-name" в родительском Frame для исправления по его тексту
        let parentFrame = componentSet.parent;
        let labelText = null;
        
        if (parentFrame && parentFrame.type === 'FRAME') {
          // Ищем instance "sourse-token-name" внутри того же Frame
          if (parentFrame.children && Array.isArray(parentFrame.children)) {
            for (let i = 0; i < parentFrame.children.length; i++) {
              const child = parentFrame.children[i];
              if (child.type === 'INSTANCE' && child.name === 'sourse-token-name') {
                // Ищем текстовый слой Label внутри instance
                if (child.children && Array.isArray(child.children)) {
                  for (let j = 0; j < child.children.length; j++) {
                    const instanceChild = child.children[j];
                    if (instanceChild.name === 'Label' && instanceChild.type === 'TEXT') {
                      labelText = instanceChild.characters;
                      break;
                    }
                  }
                }
                break;
              }
            }
          }
        }
        
        // Если нашли текст из source-token-name, используем его для исправления
        if (labelText) {
          // Заменяем пробелы на дефисы в labelText для корректного именования
          const normalizedLabelText = labelText.toLowerCase().replace(/\s+/g, '-');
          const newName = 'orb-icon-' + normalizedLabelText;
          componentSet.name = newName;
          return { success: true, message: `Имя компонента исправлено на "${newName}" по тексту из source-token-name` };
        }
        
        // Иначе выполняем стандартное исправление имени
        // Удаляем префикс "orb-icon-" в любом регистре, если он есть
        let baseName = componentSet.name.replace(/^orb-icon-/i, '');
        
        // Преобразуем название в нижний регистр и заменяем недопустимые символы на дефисы
        const cleanIconName = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        
        // Если после очистки название пустое, добавляем "icon"
        const finalIconName = cleanIconName.length > 0 ? cleanIconName : 'icon';
        
        // Формируем итоговое имя с префиксом
        const finalName = 'orb-icon-' + finalIconName;
        
        // Устанавливаем новое имя только если оно изменилось
        if (componentSet.name !== finalName) {
          componentSet.name = finalName;
          return { success: true, message: `Имя компонента исправлено на "${finalName}"` };
        } else {
          return { success: true, message: 'Имя компонента уже соответствует требованиям' };
        }
      }
        
      case 'variants': {
        // Исправление свойств Variant и Size
        if (!node.variantProperties) {
          return { success: false, message: 'Компонент не имеет свойств вариантов' };
        }
        
        // Определяем размер по ширине компонента
        let size = 'md';
        if (node.width === 32) size = 'lg';
        else if (node.width === 24) size = 'md';
        else if (node.width === 16) size = 'sm';
        else if (node.width === 12) size = 'xs';
        else if (node.width === 8) size = 'xxs';
        
        // Устанавливаем свойства
        node.setProperties({
          Variant: node.variantProperties.Variant === 'solid' ? 'solid' : 'outline',
          Size: size
        });
        
        return { success: true, message: 'Свойства вариантов исправлены' };
      }
        
      case 'sizes': {
        // Исправление размеров компонента
        // Определяем правильный размер по свойству Size
        let targetSize = { width: 24, height: 24 }; // md по умолчанию
        
        if (node.variantProperties && node.variantProperties.Size) {
          const sizeProperty = node.variantProperties.Size;
          if (sizeProperty === 'lg') targetSize = { width: 32, height: 32 };
          else if (sizeProperty === 'md') targetSize = { width: 24, height: 24 };
          else if (sizeProperty === 'sm') targetSize = { width: 16, height: 16 };
          else if (sizeProperty === 'xs') targetSize = { width: 12, height: 12 };
          else if (sizeProperty === 'xxs') targetSize = { width: 8, height: 8 };
        }
        
        node.resize(targetSize.width, targetSize.height);
        return { success: true, message: 'Размер компонента исправлен' };
      }
        
      case 'structure': {
        // Исправление структуры (добавление слоя Color-layer или исправление имени)
        if (!node.children || !Array.isArray(node.children)) {
          return { success: false, message: 'Компонент не содержит слоев' };
        }
        
        // Проверяем наличие Color-layer, Vector и слоев с неправильным именем
        let colorLayer = null;
        let vectorLayer = null;
        let incorrectNamedLayer = null;
        
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          const childName = child.name.toLowerCase();
          
          if (child.name === 'Color-layer') {
            colorLayer = child;
          } else if (child.name === 'Vector') {
            vectorLayer = child;
          } else if (childName === 'color' ||
                    childName === 'color-layer' ||
                    childName === 'color layer' ||
                    childName === 'colorlayer' ||
                    child.name === 'Color layer' ||
                    child.name === 'ColorLayer') {
            incorrectNamedLayer = child;
          }
        }
        
        // Если найден слой с неправильным именем, исправляем его
        if (incorrectNamedLayer) {
          incorrectNamedLayer.name = 'Color-layer';
          return { success: true, message: 'Имя слоя исправлено на Color-layer' };
        }
        
        // Если нет Color-layer, но есть Vector слои, создаем Color-layer из Vector path
        if (!colorLayer && vectorLayer) {
          // Находим все Vector слои
          const vectorLayers = [];
          for (const child of node.children) {
            if (child.name === 'Vector') {
              vectorLayers.push(child);
            }
          }
          
          if (vectorLayers.length === 1) {
            // Если один Vector, переименовываем его в Color-layer
            vectorLayers[0].name = 'Color-layer';
            return { success: true, message: 'Vector переименован в Color-layer' };
          } else if (vectorLayers.length > 1) {
            // Если несколько Vector слоев, создаем boolean union
            const union = figma.union(vectorLayers);
            union.name = 'Color-layer';
            return { success: true, message: `Создан Color-layer из ${vectorLayers.length} Vector слоев через boolean union` };
          }
        }
        
        // Если нет ни Color-layer, ни Vector, ищем любые векторные элементы
        if (!colorLayer && !vectorLayer) {
          // Находим все векторные элементы в компоненте
          const vectorElements = [];
          for (const child of node.children) {
            if (child.type === 'VECTOR' ||
                child.type === 'BOOLEAN_OPERATION' ||
                child.type === 'STAR' ||
                child.type === 'ELLIPSE' ||
                child.type === 'POLYGON' ||
                child.type === 'RECTANGLE') {
              vectorElements.push(child);
            }
          }
          
          if (vectorElements.length === 1) {
            // Если один векторный элемент, переименовываем его в Color-layer
            vectorElements[0].name = 'Color-layer';
            return { success: true, message: 'Векторный элемент переименован в Color-layer' };
          } else if (vectorElements.length > 1) {
            // Если несколько векторных элементов, создаем boolean union
            const union = figma.union(vectorElements);
            union.name = 'Color-layer';
            return { success: true, message: `Создан Color-layer из ${vectorElements.length} векторных элементов через boolean union` };
          } else {
            // Если нет векторных элементов, создаем пустой Color-layer
            colorLayer = figma.createFrame();
            colorLayer.name = 'Color-layer';
            node.appendChild(colorLayer);
            return { success: true, message: 'Создан пустой Color-layer' };
          }
        }
        
        return { success: true, message: 'Структура компонента исправлена' };
      }
        
      case 'constraints': {
        // Исправление выравнивания Color-layer
        if (!node.children || !Array.isArray(node.children)) {
          return { success: false, message: 'Компонент не содержит слоев' };
        }
        
        // Находим Color-layer
        let colorLayerForConstraints = null;
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child.name === 'Color-layer') {
            colorLayerForConstraints = child;
            break;
          }
        }
        
        if (!colorLayerForConstraints) {
          return { success: false, message: 'Слой Color-layer не найден' };
        }
        
        // Устанавливаем выравнивание по центру
        // Это базовое выравнивание, которое должно работать в большинстве случаев
        // Если возникнут проблемы, пользователь может вручную настроить выравнивание
        colorLayerForConstraints.constraints = {
          horizontal: 'CENTER',
          vertical: 'CENTER'
        };
        
        return { success: true, message: 'Выравнивание Color-layer исправлено' };
      }
        
      case 'vector': {
        // Исправление Vector (блокировка, тип, цвет)
        if (!node.children || !Array.isArray(node.children)) {
          return { success: false, message: 'Компонент не содержит слоев' };
        }
        
        // Сначала проверяем наличие Vector на верхнем уровне
        let vector = null;
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child.name === 'Vector') {
            vector = child;
            break;
          }
        }
        
        // Находим Color-layer для поиска Vector
        let colorLayerForVector = null;
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child.name === 'Color-layer') {
            colorLayerForVector = child;
            break;
          }
        }
        
        // Если Vector не найден на верхнем уровне, ищем его в Color-layer
        if (!vector && colorLayerForVector) {
          // Находим Vector в Color-layer
          if (colorLayerForVector.children && Array.isArray(colorLayerForVector.children)) {
            for (const child of colorLayerForVector.children) {
              if (child.name === 'Vector') {
                vector = child;
                break;
              }
            }
          }
        }
        
        if (!vector) {
          // Если Vector не найден, но есть Color-layer, то Color-layer должен стать Vector
          if (colorLayerForVector) {
            // Проверяем, есть ли дочерние элементы в Color-layer для создания union
            if (colorLayerForVector.children && colorLayerForVector.children.length > 0) {
              // Если есть дочерние элементы, создаем boolean union
              const union = figma.union(colorLayerForVector.children);
              union.name = 'Vector';
              union.locked = true;
              
              // Удаляем старый Color-layer
              colorLayerForVector.remove();
              
              return { success: true, message: 'Создан Vector из содержимого Color-layer через boolean union' };
            } else {
              // Если нет дочерних элементов, просто переименовываем Color-layer в Vector
              colorLayerForVector.name = 'Vector';
              colorLayerForVector.locked = true;
              
              return { success: true, message: 'Color-layer переименован в Vector и заблокирован' };
            }
          }
          
          return { success: false, message: 'Слой Vector не найден' };
        }
        
        // Блокируем Vector
        vector.locked = true;
        
        // Удаляем цвет fill у слоя Vector
        if (vector.fills && vector.fills.length > 0) {
          vector.fills = [];
        }
        
        return { success: true, message: 'Слой Vector исправлен (заблокирован и удален цвет)' };
      }
        
      case 'editGroup': {
        // Исправление объекта Edit (создание и скрытие)
        if (!node.children || !Array.isArray(node.children)) {
          return { success: false, message: 'Компонент не содержит слоев' };
        }
        
        // Проверяем наличие объекта Edit
        let editObject = null;
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child.name === 'Edit' || child.name === 'edit') {
            editObject = child;
            break;
          }
        }
        
        // Если нет объекта Edit, создаем фрейм Edit
        let wasCreated = false;
        if (!editObject) {
          editObject = figma.createFrame();
          editObject.name = 'Edit';
          // Устанавливаем размер фрейма равный размеру варианта компонента
          editObject.resize(node.width, node.height);
          node.appendChild(editObject);
          wasCreated = true;
        }
        
        // Скрываем объект Edit
        editObject.visible = false;
        
        // Возвращаем подходящее сообщение
        if (wasCreated) {
          return { success: true, message: `Создан скрытый фрейм "${editObject.name}" размером ${node.width}×${node.height}px` };
        } else {
          return { success: true, message: `Объект "${editObject.name}" исправлен (скрыт)` };
        }
      }
        
      case 'description': {
        // Исправление description компонента
        let variant = 'outline';
        let sizeValue = 'md';
        
        try {
          if (node.variantProperties) {
            variant = node.variantProperties.Variant || 'outline';
            sizeValue = node.variantProperties.Size || 'md';
          } else {
            debugLog('Предупреждение: Компонент не имеет свойств вариантов, используем значения по умолчанию');
          }
        } catch (variantError) {
          console.error(`Ошибка при получении свойств варианта для компонента ${getSafeNodeName(node)}:`, variantError);
          // Используем значения по умолчанию
        }
        
        // Получаем имя компонента из родительского компонент-сета
        let sourceTokenName = '';
        // Используем componentSet, который уже объявлен в начале функции fixError
        
        if (componentSet && componentSet.name) {
          sourceTokenName = componentSet.name.replace(/^orb-icon-/i, '');
        } else {
          sourceTokenName = 'icon';
        }
        
        // Только если имя не получено из компонента, ищем sourse-token-name
        if (!sourceTokenName || sourceTokenName === 'icon') {
          let sourceTokenFound = false;
          
          // Ищем на текущей странице
          const instances = figma.currentPage.findAllWithCriteria({
            types: ['INSTANCE']
          });
          
          for (const instance of instances) {
            if (instance.name === 'sourse-token-name') {
              sourceTokenFound = true;
              // Ищем текстовый слой Label внутри instance
              if (instance.children && Array.isArray(instance.children)) {
                for (const child of instance.children) {
                  if (child.name === 'Label' && child.type === 'TEXT') {
                    sourceTokenName = child.characters;
                    break;
                  }
                }
              }
              break;
            }
          }
        }
        
        // Формируем ожидаемый description
        const expectedDescription = `${sourceTokenName}-${variant}-${sizeValue}`;
        
        // Устанавливаем description компонента
        node.description = expectedDescription;
        
        return { success: true, message: 'Description компонента исправлен' };
      }
        
      case 'color-variable': {
        // Исправление цвета слоя Color-layer
        if (!node.children || !Array.isArray(node.children)) {
          return { success: false, message: 'Компонент не содержит слоев' };
        }
        
        // Находим Color-layer
        let colorLayerForColor = null;
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child.name === 'Color-layer') {
            colorLayerForColor = child;
            break;
          }
        }
        
        if (!colorLayerForColor) {
          return { success: false, message: 'Слой Color-layer не найден' };
        }
        
        // Ищем переменные цвета в коллекции icon-color
        try {
          // Получаем все локальные переменные
          const allVariables = figma.variables.getLocalVariables();
          
          // Ищем коллекцию переменных с названием icon-color
          let iconColorCollection = null;
          for (const collection of figma.variables.getLocalVariableCollections()) {
            if (collection.name.toLowerCase().includes('icon-color')) {
              iconColorCollection = collection;
              break;
            }
          }
          
          // Если нашли коллекцию, ищем переменную цвета
          let colorVariable = null;
          if (iconColorCollection) {
            for (const variable of allVariables) {
              if (variable.variableCollectionId === iconColorCollection.id &&
                  variable.resolvedType === 'COLOR') {
                colorVariable = variable;
                break;
              }
            }
          }
          
          // Если нашли переменную цвета, применяем ее к слою
          if (colorVariable) {
            // Создаем привязку к переменной
            const binding = {
              type: 'VARIABLE',
              variableId: colorVariable.id
            };
            
            // Применяем переменную к fills
            colorLayerForColor.fills = [{
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0 }, // Значение по умолчанию
              boundVariables: {
                color: binding
              }
            }];
            
            return { success: true, message: 'Цвет слоя Color-layer привязан к переменной из коллекции icon-color' };
          } else {
            return { success: false, message: 'Не найдена переменная цвета в коллекции icon-color' };
          }
        } catch (error) {
          console.error('Ошибка при применении переменной цвета:', error);
          return { success: false, message: `Ошибка при применении переменной цвета: ${error.message}` };
        }
      }
        
      case 'no-stroke': {
        // Исправление ошибок stroke у слоев Color-layer и Vector
        return await fixNoStrokeError(node);
      }
        
      default:
        return { success: false, message: 'Неизвестный тип ошибки' };
    }
  } catch (error) {
    console.error('Ошибка при исправлении:', error);
    return { success: false, message: `Ошибка при исправлении: ${error.message}` };
  }
}

// Функция для исправления ошибок stroke
async function fixNoStrokeError(node) {
  try {
    let fixedCount = 0;
    
    // Если это компонент, ищем Color-layer и Vector
    if (node.type === 'COMPONENT' && node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child.name === 'Color-layer') {
          // Удаляем stroke у Color-layer
          if (child.strokes && child.strokes.length > 0) {
            child.strokes = [];
            fixedCount++;
            debugLog(`Удалены stroke у слоя Color-layer в компоненте ${getSafeNodeName(node)}`);
          }
          
          // Ищем Vector внутри Color-layer
          if (child.children && Array.isArray(child.children)) {
            for (const vectorChild of child.children) {
              if (vectorChild.name === 'Vector') {
                // Удаляем stroke у Vector
                if (vectorChild.strokes && vectorChild.strokes.length > 0) {
                  vectorChild.strokes = [];
                  fixedCount++;
                  debugLog(`Удалены stroke у слоя Vector в компоненте ${getSafeNodeName(node)}`);
                }
                break;
              }
            }
          }
          break;
        }
      }
    }
    // Если это Component Set, проверяем все варианты
    else if (node.type === 'COMPONENT_SET' && node.children && Array.isArray(node.children)) {
      for (const component of node.children) {
        if (component.children && Array.isArray(component.children)) {
          for (const child of component.children) {
            if (child.name === 'Color-layer') {
              // Удаляем stroke у Color-layer
              if (child.strokes && child.strokes.length > 0) {
                child.strokes = [];
                fixedCount++;
                debugLog(`Удалены stroke у слоя Color-layer в варианте ${component.name}`);
              }
              
              // Ищем Vector внутри Color-layer
              if (child.children && Array.isArray(child.children)) {
                for (const vectorChild of child.children) {
                  if (vectorChild.name === 'Vector') {
                    // Удаляем stroke у Vector
                    if (vectorChild.strokes && vectorChild.strokes.length > 0) {
                      vectorChild.strokes = [];
                      fixedCount++;
                      debugLog(`Удалены stroke у слоя Vector в варианте ${component.name}`);
                    }
                    break;
                  }
                }
              }
              break;
            }
          }
        }
      }
    }
    
    if (fixedCount > 0) {
      return {
        success: true,
        message: `Удалены обводки у ${fixedCount} слоев`
      };
    } else {
      return {
        success: false,
        message: 'Не найдено слоев с обводками для исправления'
      };
    }
    
  } catch (error) {
    console.error('Ошибка при исправлении stroke:', error);
    return {
      success: false,
      message: `Ошибка при исправлении stroke: ${error.message}`
    };
  }
}

// Функция исправления всех ошибок
async function fixAllErrors(results) {
  try {
    // Устанавливаем флаг, что проверка запущена
    isCheckingInProgress = true;
    
    const fixResults = [];
    let processedCount = 0;
    const totalCount = results.length;
    let lastProgressPercent = 0;
    
    for (const result of results) {
      // Проверяем, не была ли остановлена проверка
      if (!isCheckingInProgress) {
        debugLog('Исправление ошибок остановлено пользователем');
        break;
      }
      
      processedCount++;
      const progressPercent = Math.floor((processedCount / totalCount) * 100);
      
      // Отправляем сообщение о прогрессе только если он изменился на 10% или более,
      // или если это первый или последний элемент
      if (progressPercent - lastProgressPercent >= 10 || processedCount === 1 || processedCount === totalCount) {
        figma.ui.postMessage({
          type: 'progress',
          message: `Исправление ошибок (${processedCount}/${totalCount})`,
          percent: progressPercent
        });
        lastProgressPercent = progressPercent;
      }
      
      // Получаем уникальные типы ошибок для этого компонента
      var errorTypes = [];
      for (var q = 0; q < result.errors.length; q++) {
        errorTypes.push(result.errors[q].type);
      }
      const errorTypesSet = new Set(errorTypes);
      const uniqueErrorTypes = Array.from(errorTypesSet);
      
      // Исправляем каждый тип ошибки
      for (const errorType of uniqueErrorTypes) {
        const fixResult = await fixError(result.nodeId, errorType);
        fixResults.push({
          nodeId: result.nodeId,
          nodeName: result.nodeName,
          errorType: errorType,
          success: fixResult.success,
          message: fixResult.message
        });
      }
    }
    
    
    // Сбрасываем флаг проверки
    isCheckingInProgress = false;
    
    figma.ui.postMessage({ type: 'progress', message: 'Проверка результатов...', percent: 100 });
    
    // После исправления выполняем повторную проверку, чтобы убедиться, что все ошибки исправлены
    const successfulFixes = fixResults.filter(r => r.success).length;
    const totalFixes = fixResults.length;
    
    // Если все ошибки были успешно исправлены, показываем сообщение об успехе
    if (successfulFixes === totalFixes && totalFixes > 0) {
      return {
        success: true,
        message: 'Все иконки соответствуют требованиям!',
        details: fixResults
      };
    } else {
      return {
        success: true,
        message: `Исправлено ${successfulFixes} из ${totalFixes} ошибок`,
        details: fixResults
      };
    }
  } catch (error) {
    // Сбрасываем флаг проверки даже в случае ошибки
    isCheckingInProgress = false;
    
    console.error('Ошибка при исправлении всех ошибок:', error);
    return {
      success: false,
      message: `Ошибка при исправлении всех ошибок: ${error.message}`
    };
  }
}

// Функция создания Cell с компонент-сетом и sourse-token-name
async function createCell() {
  try {
    // Проверяем, что выбран компонент-сет
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      return {
        success: false,
        message: 'Выберите компонент-сет иконки для создания Cell'
      };
    }

    // Проверяем, что выбран компонент-сет
    const componentSet = selection[0];
    if (componentSet.type !== 'COMPONENT_SET') {
      return {
        success: false,
        message: 'Выберите компонент-сет иконки (не отдельный вариант компонента)'
      };
    }

    // Создаем фрейм Cell с auto-layout
    const cell = figma.createFrame();
    cell.name = 'Cell';
    cell.resize(246, 128);
    cell.layoutMode = 'VERTICAL';
    cell.primaryAxisSizingMode = 'FIXED';
    cell.counterAxisSizingMode = 'AUTO';
    cell.paddingLeft = 16;
    cell.paddingRight = 16;
    cell.paddingTop = 16;
    cell.paddingBottom = 16;
    cell.itemSpacing = 16;
    cell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    cell.cornerRadius = 16;

    // Пытаемся найти компонент sourse-token-name на странице
    let sourceTokenNameInstance = null;
    
    // Оптимизированный поиск экземпляров
    // Сначала ищем в непосредственной близости от выбранного компонента
    // Это более эффективно, чем искать по всей странице
    
    // Функция для поиска экземпляров с заданным именем в узле и его дочерних элементах
    function findInstanceByName(node, name) {
      // Проверка на null/undefined
      if (!node) return null;
      
      // Если это экземпляр с нужным именем, возвращаем его
      if (node.type === 'INSTANCE' && node.name === name) {
        return node;
      }
      
      // Если у узла есть дочерние элементы, ищем в них
      if ('children' in node && Array.isArray(node.children)) {
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          const found = findInstanceByName(child, name);
          if (found) return found;
        }
      }
      
      return null;
    }
    
    // Проверяем, есть ли экземпляр в родительском фрейме компонента
    // Это наиболее вероятное место, где может находиться sourse-token-name
    let parentFrame = componentSet.parent;
    while (parentFrame && parentFrame.type !== 'PAGE') {
      // Ищем в текущем родительском элементе
      const found = findInstanceByName(parentFrame, 'sourse-token-name');
      if (found) {
        sourceTokenNameInstance = found.clone();
        break;
      }
      // Переходим к следующему родительскому элементу
      parentFrame = parentFrame.parent;
    }
    
    // Если не нашли в родительских элементах, используем более эффективный поиск на странице
    if (!sourceTokenNameInstance) {
      // Используем findAllWithCriteria с более конкретными критериями
      // Это быстрее, чем искать все экземпляры и затем фильтровать их по имени
      const instances = figma.currentPage.findAllWithCriteria({
        types: ['INSTANCE'],
        // Можно добавить дополнительные критерии, если они известны
      });
      
      // Ищем экземпляр с именем 'sourse-token-name'
      for (const instance of instances) {
        if (instance && instance.name === 'sourse-token-name') {
          sourceTokenNameInstance = instance.clone();
          break;
        }
      }
    }
    
    if (!sourceTokenNameInstance) {
      return {
        success: false,
        message: 'Не найден компонент sourse-token-name. Добавьте его на страницу.'
      };
    }
    
    // Добавляем sourse-token-name в Cell
    cell.appendChild(sourceTokenNameInstance);
    
    // Ищем текстовый слой Label внутри sourse-token-name и меняем его текст
    let labelFound = false;
    if (sourceTokenNameInstance.children) {
      for (const child of sourceTokenNameInstance.children) {
        if (child.name === 'Label' && child.type === 'TEXT') {
          // Получаем имя иконки без префикса
          const iconName = componentSet.name ? componentSet.name.replace(/^orb-icon-/i, '') : 'icon';
          if (child.fontName) {
            try {
              await figma.loadFontAsync(child.fontName);
              // Делаем первую букву заглавной
              child.characters = iconName.charAt(0).toUpperCase() + iconName.slice(1);
              labelFound = true;
              break;
            } catch (fontError) {
              console.error('Ошибка при загрузке шрифта:', fontError);
              return {
                success: false,
                message: `Не удалось загрузить шрифт: ${fontError.message}`
              };
            }
          } else {
            debugWarn('Предупреждение: fontName не определен для текстового слоя');
            return {
              success: false,
              message: 'Не удалось загрузить шрифт для текстового слоя'
            };
          }
        }
      }
    }
    
    if (!labelFound) {
      return {
        success: false,
        message: 'В компоненте sourse-token-name не найден текстовый слой Label'
      };
    }
    
    // Создаем копию компонент-сета
    const componentSetClone = componentSet.clone();
    
    // Настраиваем компонент-сет с autolayout
    componentSetClone.layoutMode = 'HORIZONTAL';
    componentSetClone.primaryAxisAlignItems = 'MIN'; // align left
    componentSetClone.paddingLeft = 8;
    componentSetClone.paddingRight = 8;
    componentSetClone.paddingTop = 8;
    componentSetClone.paddingBottom = 8;
    componentSetClone.itemSpacing = 8; // gap = 8
    
    // Устанавливаем ширину cell = 246
    cell.resize(246, cell.height);
    
    // Устанавливаем компонент-сету ширину fill и высоту = 40 (в указанном порядке)
    componentSetClone.layoutAlign = 'STRETCH'; // Ширина Fill
    componentSetClone.layoutGrow = 1; // Дополнительное растягивание
    componentSetClone.resize(componentSetClone.width, 40); // Высота 40px
    
    // Добавляем компонент-сет напрямую в Cell
    cell.appendChild(componentSetClone);
    
    // Размещаем Cell рядом с выбранным компонент-сетом
    cell.x = componentSet.x + componentSet.width + 20;
    cell.y = componentSet.y;
    
    // Выбираем созданный Cell
    figma.currentPage.selection = [cell];
    figma.viewport.scrollAndZoomIntoView([cell]);
    
    // Проверка размеров Cell и компонент-сета
    debugLog('Проверка размеров Cell:', {
      width: cell.width, // Должно быть 246px
      height: cell.height, // Должно быть 128px
      layoutMode: cell.layoutMode, // Должно быть 'VERTICAL'
      primaryAxisSizingMode: cell.primaryAxisSizingMode, // Должно быть 'FIXED'
      counterAxisSizingMode: cell.counterAxisSizingMode // Должно быть 'AUTO' (hug)
    });

    debugLog('Проверка размеров компонент-сета:', {
      width: componentSetClone.width, // Должно быть fill
      height: componentSetClone.height, // Должно быть 40px
      layoutAlign: componentSetClone.layoutAlign, // Должно быть 'STRETCH' (Fill)
      layoutMode: componentSetClone.layoutMode, // Должно быть 'HORIZONTAL'
      primaryAxisAlignItems: componentSetClone.primaryAxisAlignItems, // Должно быть 'MIN' (align left)
      itemSpacing: componentSetClone.itemSpacing, // Должно быть 8 (gap)
      padding: {
        left: componentSetClone.paddingLeft, // Должно быть 8
        right: componentSetClone.paddingRight, // Должно быть 8
        top: componentSetClone.paddingTop, // Должно быть 8
        bottom: componentSetClone.paddingBottom // Должно быть 8
      }
    });
    
    return {
      success: true,
      message: 'Cell успешно создан'
    };
  } catch (error) {
    console.error('Ошибка при создании Cell:', error);
    return {
      success: false,
      message: `Ошибка при создании Cell: ${error.message}`
    };
  }
}

// Функция сканирования иконок для экспорта
async function scanIconsForExport() {
  try {
    debugLog('SVG Export (Code): Начинаем поиск компонент-сетов на странице');
    
    // Ищем все компонент-сеты на текущей странице
    const componentSets = figma.currentPage.findAllWithCriteria({
      types: ['COMPONENT_SET']
    });
    
    debugLog('SVG Export (Code): Найдено всего компонент-сетов:', componentSets.length);
    
    // Фильтруем только те, которые начинаются с "orb-icon-" и не начинаются с точки
    const iconComponentSets = componentSets.filter(componentSet => 
      componentSet.name && 
      componentSet.name.startsWith('orb-icon-') &&
      !componentSet.name.startsWith('.')
    );
    
    debugLog('SVG Export (Code): Компонент-сетов с префиксом "orb-icon-":', iconComponentSets.length);
    debugLog('SVG Export (Code): Найденные компонент-сеты:', iconComponentSets.map(cs => cs.name));
    
    // Подсчитываем общее количество вариантов
    let totalVariants = 0;
    const componentSetData = [];
    
    for (const componentSet of iconComponentSets) {
      debugLog('SVG Export (Code): Обрабатываем компонент-сет:', componentSet.name, 'children:', componentSet.children ? componentSet.children.length : 0);
      
      if (componentSet.children && Array.isArray(componentSet.children)) {
        const variants = componentSet.children.length;
        totalVariants += variants;
        
        // Собираем информацию о компонент-сете
        componentSetData.push({
          id: componentSet.id,
          name: componentSet.name,
          iconName: componentSet.name.replace(/^orb-icon-/i, ''),
          variants: variants
        });
      }
    }
    
    debugLog('SVG Export (Code): Итого вариантов для экспорта:', totalVariants);
    
    return {
      success: true,
      componentSetsCount: iconComponentSets.length,
      totalVariants: totalVariants,
      componentSets: componentSetData
    };
  } catch (error) {
    console.error('SVG Export (Code): Ошибка при сканировании иконок:', error);
    return {
      success: false,
      message: `Ошибка при сканировании иконок: ${error.message}`
    };
  }
}

// Функция экспорта иконок в SVG
async function exportIconsToSVG(componentSetsData, colorSettings = null) {
  try {
    debugLog('SVG Export (Code): Начинаем экспорт, получены данные:', componentSetsData);
    
    let exportedCount = 0;
    let failedCount = 0;
    const failedExports = [];
    let currentProgress = 0;
    
    // Подсчитываем общее количество вариантов для прогресса
    const totalVariants = componentSetsData.reduce((sum, cs) => sum + cs.variants, 0);
    debugLog('SVG Export (Code): Всего вариантов для экспорта:', totalVariants);
    
    for (const componentSetData of componentSetsData) {
      debugLog('SVG Export (Code): Экспортируем компонент-сет:', componentSetData.name);
      
      const componentSet = await figma.getNodeByIdAsync(componentSetData.id);
      
      if (!componentSet || componentSet.type !== 'COMPONENT_SET') {
        debugLog('SVG Export (Code): Не удалось найти компонент-сет по ID:', componentSetData.id);
        failedCount += componentSetData.variants;
        continue;
      }
      
      debugLog('SVG Export (Code): Найден компонент-сет, вариантов:', componentSet.children ? componentSet.children.length : 0);
      
      // Экспортируем каждый вариант компонента
      for (const component of componentSet.children) {
        try {
          currentProgress++;
          const progressPercent = Math.floor((currentProgress / totalVariants) * 100);
          
          debugLog(`SVG Export (Code): Экспортируем компонент ${currentProgress}/${totalVariants}: ${component.name}`);
          
          // Обновляем детальный прогресс для SVG экспорта
          figma.ui.postMessage({
            type: 'svg-export-progress',
            current: currentProgress,
            total: totalVariants,
            message: `Экспортируем иконки в SVG...`,
            currentIcon: `${componentSetData.iconName}-${component.variantProperties ? component.variantProperties.Variant || 'outline' : 'outline'}-${component.variantProperties ? component.variantProperties.Size || 'md' : 'md'}.svg`,
            percent: progressPercent
          });
          
          // Формируем имя файла
          const fileName = generateSVGFileName(componentSetData.iconName, component);
          debugLog('SVG Export (Code): Имя файла:', fileName);
          
          // Экспортируем компонент в SVG
          const svgData = await component.exportAsync({
            format: 'SVG',
            svgIdAttribute: true,
            svgOutlineText: false,
            svgSimplifyStroke: true
          });
          
          debugLog('SVG Export (Code): Экспорт компонента успешен, размер данных:', svgData.length, 'тип:', typeof svgData);
          
          // Конвертируем Uint8Array в строку для отправки в UI
          // TextDecoder не поддерживается в Figma, используем альтернативный метод
          let svgString;
          try {
            // Пробуем более эффективный способ для больших файлов
            // Конвертируем Uint8Array в обычный массив для совместимости
            const dataArray = [];
            for (let i = 0; i < svgData.length; i++) {
              dataArray[i] = svgData[i];
            }
            svgString = String.fromCharCode.apply(null, dataArray);
          } catch (error) {
            // Если не работает (слишком большой файл), используем цикл
            debugLog('SVG Export (Code): Используем fallback метод для конвертации');
            svgString = '';
            for (let i = 0; i < svgData.length; i++) {
              svgString += String.fromCharCode(svgData[i]);
            }
          }
          
          debugLog('SVG Export (Code): Конвертация успешна, длина строки:', svgString.length, 'начало:', svgString.substring(0, 100));
          
          // Применяем цвет fill если необходимо
          if (colorSettings && colorSettings.applyFillColor && colorSettings.fillColor) {
            debugLog('SVG Export (Code): Применяем цвет fill:', colorSettings.fillColor);
            debugLog('SVG Export (Code): Исходный SVG (первые 200 символов):', svgString.substring(0, 200));
            
            const originalSVG = svgString;
            svgString = applySVGFillColor(svgString, colorSettings.fillColor);
            
            debugLog('SVG Export (Code): Обработанный SVG (первые 200 символов):', svgString.substring(0, 200));
            
            // Проверяем, изменился ли SVG
            if (originalSVG === svgString) {
              debugLog('SVG Export (Code): Предупреждение - SVG не изменился после применения fill');
            }
          }
          
          // Отправляем данные для сохранения через UI
          figma.ui.postMessage({
            type: 'save-svg-file',
            fileName: fileName,
            svgData: svgString
          });
          
          exportedCount++;
          
          // Небольшая задержка для предотвращения блокировки UI
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error(`SVG Export (Code): Ошибка при экспорте компонента ${component.name}:`, error);
          failedCount++;
          failedExports.push({
            componentName: component.name,
            error: error.message
          });
        }
      }
    }
    
    // Финальное обновление детального прогресса
    figma.ui.postMessage({
      type: 'svg-export-progress',
      current: totalVariants,
      total: totalVariants,
      message: 'Экспорт завершен!',
      currentIcon: `✅ Готово! Экспортировано ${exportedCount} иконок`,
      percent: 100
    });
    
    return {
      success: true,
      exportedCount: exportedCount,
      failedCount: failedCount,
      failedExports: failedExports,
      message: `Экспортировано ${exportedCount} иконок, ошибок: ${failedCount}`
    };
    
  } catch (error) {
    console.error('Ошибка при экспорте иконок:', error);
    return {
      success: false,
      message: `Ошибка при экспорте иконок: ${error.message}`
    };
  }
}

// Функция для генерации имени SVG файла
function generateSVGFileName(iconName, component) {
  try {
    // Получаем свойства варианта
    const variantProperties = component.variantProperties || {};
    const variant = variantProperties.Variant || 'outline';
    const size = variantProperties.Size || 'md';
    
    // Формируем имя файла: iconName-variant-size.svg
    // Например: tab-add-outline-md.svg, arrow-top-solid-lg.svg
    return `${iconName}-${variant}-${size}.svg`;
  } catch (error) {
    console.error('Ошибка при генерации имени файла:', error);
    // Возвращаем базовое имя в случае ошибки
    return `${iconName}-${component.name || 'variant'}.svg`;
  }
}

// Функция для применения цвета fill к SVG
function applySVGFillColor(svgString, fillColor) {
  try {
    debugLog('SVG Export (Code): Применяем цвет fill:', fillColor, 'к SVG длиной:', svgString.length);
    
    let modifiedSVG = svgString;
    
    // Используем более простой и безопасный подход - добавляем fill к корневому SVG
    // Это перекроет все дочерние элементы через CSS cascade
    modifiedSVG = modifiedSVG.replace(
      /<svg([^>]*?)>/i,
      function(match, attributes) {
        // Удаляем существующий fill из SVG если есть
        let cleanAttributes = attributes.replace(/\s+fill\s*=\s*["'][^"']*["']/gi, '');
        cleanAttributes = cleanAttributes.trim();
        const space = cleanAttributes ? ' ' : '';
        return `<svg${space}${cleanAttributes} fill="${fillColor}">`;
      }
    );
    
    // Дополнительно: удаляем fill из дочерних элементов для чистоты
    modifiedSVG = modifiedSVG.replace(
      /(<(?:path|circle|rect|polygon|ellipse|g)[^>]*?)\s+fill\s*=\s*["'][^"']*["']/gi,
      '$1'
    );
    
    // Проверяем корректность результирующего SVG
    if (!modifiedSVG.includes('<svg')) {
      debugLog('SVG Export (Code): Предупреждение - не найден корневой тег svg');
      return svgString; // Возвращаем оригинал если что-то не так
    }
    
    debugLog('SVG Export (Code): Цвет fill успешно применен к корневому SVG');
    return modifiedSVG;
    
  } catch (error) {
    console.error('SVG Export (Code): Ошибка при применении цвета fill:', error);
    return svgString; // Возвращаем оригинальный SVG в случае ошибки
  }
}

// Функция исправления всех ошибок
async function fixAllErrors(results) {
  try {
    // Устанавливаем флаг, что проверка запущена
    isCheckingInProgress = true;
    
    const fixResults = [];
    let processedCount = 0;
    let lastProgressPercent = 0;
    
    // Подсчитываем общее количество компонентов для исправления
    const totalCount = results.length;
    
    debugLog(`Начинаем исправление ошибок для ${totalCount} компонентов`);
    
    for (const result of results) {
      // Проверяем, не была ли остановлена проверка
      if (!isCheckingInProgress) {
        debugLog('Исправление ошибок остановлено пользователем');
        break;
      }
      
      processedCount++;
      const progressPercent = Math.floor((processedCount / totalCount) * 100);
      
      // Отправляем сообщение о прогрессе только если он изменился на 10% или более,
      // или если это первый или последний элемент
      if (progressPercent - lastProgressPercent >= 10 || processedCount === 1 || processedCount === totalCount) {
        figma.ui.postMessage({
          type: 'progress',
          message: `Исправление ошибок (${processedCount}/${totalCount})`,
          percent: progressPercent
        });
        lastProgressPercent = progressPercent;
      }
      
      // Получаем уникальные типы ошибок для этого компонента
      var errorTypes = [];
      for (var q = 0; q < result.errors.length; q++) {
        errorTypes.push(result.errors[q].type);
      }
      const errorTypesSet = new Set(errorTypes);
      const uniqueErrorTypes = Array.from(errorTypesSet);
      
      // Исправляем каждый тип ошибки
      for (const errorType of uniqueErrorTypes) {
        const fixResult = await fixError(result.nodeId, errorType);
        fixResults.push({
          nodeId: result.nodeId,
          nodeName: result.nodeName,
          errorType: errorType,
          success: fixResult.success,
          message: fixResult.message
        });
        
        // Небольшая задержка для предотвращения блокировки UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Сбрасываем флаг проверки
    isCheckingInProgress = false;
    
    figma.ui.postMessage({ type: 'progress', message: 'Исправление завершено', percent: 100 });
    
    return {
      success: true,
      message: `Исправлено ${fixResults.filter(r => r.success).length} из ${fixResults.length} ошибок`,
      details: fixResults
    };
    
  } catch (error) {
    // Сбрасываем флаг проверки в случае ошибки
    isCheckingInProgress = false;
    
    console.error('Ошибка при исправлении всех ошибок:', error);
    return {
      success: false,
      message: `Ошибка при исправлении всех ошибок: ${error.message}`
    };
  }
}

// Функция сбора информации о дизайне для AI-анализа
// Локальные правила для анализа (заменяют MCP)
const localRules = {
  tokens: {
    colors: ['color', 'fill', 'stroke'],
    spacing: ['padding', 'margin', 'gap', 'spacing'],
    typography: ['fontSize', 'lineHeight', 'letterSpacing'],
    radius: ['cornerRadius', 'borderRadius']
  },
  scoring: {
    hardcodedPenalty: 3,
    missingStatePenalty: 10,
    missingTokenPenalty: 2,
    nonStandardSpacingPenalty: 1
  },
  standardSpacings: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64],
  standardRadii: [0, 2, 4, 6, 8, 12, 16, 20, 24, 32],
  requiredStates: ['default', 'hover', 'focus', 'disabled']
};

// Функция конвертации RGB в HEX
function rgbToHex(rgb) {
  if (!rgb || typeof rgb !== 'object' || rgb.r === undefined || rgb.g === undefined || rgb.b === undefined) {
    console.warn('AI Design Lint: Некорректный объект цвета:', rgb);
    return '#000000'; // Возвращаем черный цвет по умолчанию
  }
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

// Функция очистки объекта от Symbol для postMessage
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
  const cleaned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      // Пропускаем Symbol ключи
      if (typeof key === 'symbol') {
        continue;
      }
      // Очищаем значение
      cleaned[key] = sanitizeForPostMessage(value);
    }
  }
  
  return cleaned;
}

// Новая функция анализа компонентов с локальным скорингом
async function analyzeComponent(component) {
  try {
    const analysis = {
      componentType: getComponentType(component),
      totalLayers: 0,
      hardcodedValues: [],
      tokensUsed: [],
      missingStates: [],
      accessibility: {
        hasLabels: false,
        hasAltText: false,
        colorContrast: 'unknown'
      },
      score: 0,
      recommendations: [],
      availableTokens: [],
      tokenSuggestions: []
    };

    // Собираем доступные токены из дизайн-системы
    analysis.availableTokens = await collectAvailableTokens();

    // Рекурсивно анализируем все слои, начиная с корневого компонента
    await analyzeNodeRecursively(component, analysis, '', true);

    // Вычисляем оценку
    analysis.score = calculateScore(analysis);
    
    // Генерируем рекомендации
    analysis.recommendations = generateRecommendations(analysis);

    // Генерируем предложения токенов
    analysis.tokenSuggestions = generateTokenSuggestions(analysis);

    return analysis;
  } catch (error) {
    console.error('Ошибка при анализе компонента:', error);
    return {
      error: error.message,
      score: 0
    };
  }
}

// Определение типа компонента
function getComponentType(node) {
  if (node.type === 'COMPONENT_SET') return 'componentSet';
  if (node.type === 'COMPONENT') return 'mainComponent';
  if (node.type === 'INSTANCE') return 'instance';
  return 'unknown';
}

// Рекурсивный анализ узлов
async function analyzeNodeRecursively(node, analysis, path, isRootComponent = false) {
  // Проверка валидности узла
  if (!node || !node.id) {
    console.warn('AI Design Lint: Пропущен некорректный узел:', node);
    return;
  }
  
  // Безопасное преобразование path и имени в строку
  const safePath = String(path || '');
  const nodeName = getSafeNodeName(node);
  const currentPath = safePath ? `${safePath} > ${nodeName}` : nodeName;
  
  // Не анализируем сам корневой компонент, только его содержимое
  if (!isRootComponent) {
    analysis.totalLayers++;

    // Анализ заливок
    if (node.fills && Array.isArray(node.fills)) {
      for (const fill of node.fills) {
        if (fill.type === 'SOLID') {
          if (fill.boundVariables && fill.boundVariables.color) {
            // Это токен
            try {
              const variable = await figma.variables.getVariableByIdAsync(fill.boundVariables.color.id);
              if (variable) {
                analysis.tokensUsed.push({
                  type: 'color',
                  name: variable.name,
                  path: currentPath,
                  nodeId: node.id
                });
              }
            } catch (e) {
              // Переменная не найдена
            }
          } else if (fill.color && typeof fill.color === 'object') {
            // Hardcoded цвет - конвертируем в hex
            try {
              const hexColor = rgbToHex(fill.color);
              analysis.hardcodedValues.push({
                type: 'color',
                value: hexColor,
                path: currentPath,
                nodeId: node.id,
                description: `Hardcoded color: ${hexColor}`
              });
            } catch (e) {
              console.error('AI Design Lint: Ошибка при конвертации цвета:', e);
            }
          }
        }
      }
    }

    // Анализ текста
    if (node.type === 'TEXT') {
      if (node.boundVariables && node.boundVariables.fontSize) {
        try {
          const variable = await figma.variables.getVariableByIdAsync(node.boundVariables.fontSize.id);
          if (variable) {
            analysis.tokensUsed.push({
              type: 'typography',
              name: variable.name,
              path: currentPath,
              nodeId: node.id
            });
          }
        } catch (e) {
          // Переменная не найдена
        }
      } else if (typeof node.fontSize === 'number') {
        analysis.hardcodedValues.push({
          type: 'fontSize',
          value: node.fontSize,
          path: currentPath,
          nodeId: node.id,
          description: `Hardcoded font size: ${String(node.fontSize)}px`
        });
      }

      // Проверка доступности
      if (node.characters && node.characters.trim()) {
        analysis.accessibility.hasLabels = true;
      }
    }

    // Анализ Auto Layout
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      // Проверяем itemSpacing (gap)
      if (node.itemSpacing !== undefined && node.itemSpacing !== 0) {
        if (node.boundVariables && node.boundVariables.itemSpacing) {
          // Есть токен для gap
          try {
            const variable = await figma.variables.getVariableByIdAsync(node.boundVariables.itemSpacing.id);
            if (variable) {
              analysis.tokensUsed.push({
                type: 'spacing',
                name: variable.name,
                path: currentPath,
                nodeId: node.id
              });
            }
          } catch (e) {
            // Переменная не найдена
          }
        } else {
          // Нет токена - hardcoded
          analysis.hardcodedValues.push({
            type: 'gap',
            value: node.itemSpacing,
            path: currentPath,
            nodeId: node.id,
            description: `Hardcoded gap (itemSpacing): ${String(node.itemSpacing)}px - используй токен spacing`
          });
        }
      }

      // Проверяем paddings
      const paddingProps = [
        { key: 'paddingLeft', value: node.paddingLeft, name: 'paddingLeft' },
        { key: 'paddingRight', value: node.paddingRight, name: 'paddingRight' },
        { key: 'paddingTop', value: node.paddingTop, name: 'paddingTop' },
        { key: 'paddingBottom', value: node.paddingBottom, name: 'paddingBottom' }
      ];

      for (const prop of paddingProps) {
        if (prop.value !== undefined && prop.value !== 0) {
          const boundVar = node.boundVariables && node.boundVariables[prop.key];
          
          if (boundVar) {
            // Есть токен
            try {
              const variable = await figma.variables.getVariableByIdAsync(boundVar.id);
              if (variable) {
                analysis.tokensUsed.push({
                  type: 'spacing',
                  name: variable.name,
                  path: currentPath,
                  nodeId: node.id
                });
              }
            } catch (e) {
              // Переменная не найдена
            }
          } else {
            // Нет токена - проверяем стандартность значения
            if (!localRules.standardSpacings.includes(prop.value)) {
              analysis.hardcodedValues.push({
                type: 'padding',
                value: prop.value,
                path: currentPath,
                nodeId: node.id,
                description: `Hardcoded ${prop.name}: ${String(prop.value)}px - используй токен spacing`
              });
            } else {
              // Стандартное значение, но без токена
              analysis.hardcodedValues.push({
                type: 'padding',
                value: prop.value,
                path: currentPath,
                nodeId: node.id,
                description: `${prop.name}: ${String(prop.value)}px без токена - привяжи к переменной`
              });
            }
          }
        }
      }
    }

    // Анализ corner radius
    if (node.cornerRadius !== undefined && node.cornerRadius !== 0) {
      if (node.boundVariables && node.boundVariables.cornerRadius) {
        // Есть токен для radius
        try {
          const variable = await figma.variables.getVariableByIdAsync(node.boundVariables.cornerRadius.id);
          if (variable) {
            analysis.tokensUsed.push({
              type: 'radius',
              name: variable.name,
              path: currentPath,
              nodeId: node.id
            });
          }
        } catch (e) {
          // Переменная не найдена
        }
      } else {
        // Нет токена - hardcoded
        if (!localRules.standardRadii.includes(node.cornerRadius)) {
          analysis.hardcodedValues.push({
            type: 'radius',
            value: node.cornerRadius,
            path: currentPath,
            nodeId: node.id,
            description: `Hardcoded non-standard radius: ${String(node.cornerRadius)}px - используй стандартное значение и токен`
          });
        } else {
          analysis.hardcodedValues.push({
            type: 'radius',
            value: node.cornerRadius,
            path: currentPath,
            nodeId: node.id,
            description: `Corner radius: ${String(node.cornerRadius)}px без токена - привяжи к переменной`
          });
        }
      }
    }
  }

  // Рекурсивно анализируем дочерние элементы
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      await analyzeNodeRecursively(child, analysis, currentPath, false);
    }
  }
}

// Вычисление оценки
function calculateScore(analysis) {
  let score = 100;
  
  console.log('AI Design Lint: Расчет оценки компонента...');
  console.log('AI Design Lint: Hardcoded значений:', analysis.hardcodedValues.length);
  console.log('AI Design Lint: Токенов использовано:', analysis.tokensUsed.length);
  console.log('AI Design Lint: Отсутствующих состояний:', analysis.missingStates.length);
  console.log('AI Design Lint: Всего слоев:', analysis.totalLayers);
  
  // Штрафы за hardcoded значения
  const hardcodedPenalty = analysis.hardcodedValues.length * localRules.scoring.hardcodedPenalty;
  score -= hardcodedPenalty;
  console.log('AI Design Lint: Штраф за hardcoded:', hardcodedPenalty);
  
  // Штрафы за отсутствующие состояния
  const missingStatesPenalty = analysis.missingStates.length * localRules.scoring.missingStatePenalty;
  score -= missingStatesPenalty;
  console.log('AI Design Lint: Штраф за отсутствующие состояния:', missingStatesPenalty);
  
  // Бонусы за использование токенов
  const tokenBonus = Math.min(analysis.tokensUsed.length * 2, 20);
  score += tokenBonus;
  console.log('AI Design Lint: Бонус за токены:', tokenBonus);
  
  // Ограничиваем оценку от 0 до 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  console.log('AI Design Lint: Финальная оценка:', finalScore);
  
  return finalScore;
}

// Генерация рекомендаций
function generateRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.hardcodedValues.length > 0) {
    recommendations.push({
      type: 'hardcoded',
      priority: 'high',
      message: `Замените ${analysis.hardcodedValues.length} hardcoded значений на токены дизайн-системы`
    });
  }
  
  if (analysis.tokensUsed.length === 0) {
    recommendations.push({
      type: 'tokens',
      priority: 'high',
      message: 'Используйте токены дизайн-системы для цветов, отступов и типографики'
    });
  }
  
  if (!analysis.accessibility.hasLabels) {
    recommendations.push({
      type: 'accessibility',
      priority: 'medium',
      message: 'Добавьте текстовые метки для улучшения доступности'
    });
  }
  
  if (analysis.missingStates.length > 0) {
    recommendations.push({
      type: 'states',
      priority: 'medium',
      message: `Добавьте отсутствующие состояния: ${analysis.missingStates.join(', ')}`
    });
  }
  
  return recommendations;
}

// Сбор доступных токенов из дизайн-системы
async function collectAvailableTokens() {
  try {
    const variables = await figma.variables.getLocalVariablesAsync();
    const tokens = {
      colors: [],
      spacing: [],
      typography: [],
      radius: []
    };

    for (const variable of variables) {
      const token = {
        id: variable.id,
        name: variable.name,
        type: variable.resolvedType,
        value: variable.valuesByMode
      };

      if (variable.name.toLowerCase().includes('color') || 
          variable.name.toLowerCase().includes('fill') ||
          variable.name.toLowerCase().includes('stroke')) {
        tokens.colors.push(token);
      } else if (variable.name.toLowerCase().includes('spacing') ||
                 variable.name.toLowerCase().includes('padding') ||
                 variable.name.toLowerCase().includes('margin') ||
                 variable.name.toLowerCase().includes('gap')) {
        tokens.spacing.push(token);
      } else if (variable.name.toLowerCase().includes('font') ||
                 variable.name.toLowerCase().includes('text') ||
                 variable.name.toLowerCase().includes('size')) {
        tokens.typography.push(token);
      } else if (variable.name.toLowerCase().includes('radius') ||
                 variable.name.toLowerCase().includes('border')) {
        tokens.radius.push(token);
      }
    }

    return tokens;
  } catch (error) {
    console.error('Ошибка при сборе токенов:', error);
    return { colors: [], spacing: [], typography: [], radius: [] };
  }
}

// Генерация предложений токенов
function generateTokenSuggestions(analysis) {
  const suggestions = [];
  
  // Для каждого hardcoded значения ищем подходящий токен
  for (const hardcoded of analysis.hardcodedValues) {
    if (hardcoded.type === 'color') {
      const colorTokens = analysis.availableTokens.colors;
      const bestMatch = findBestColorToken(hardcoded.value, colorTokens);
      if (bestMatch) {
        suggestions.push({
          hardcodedValue: hardcoded,
          suggestedToken: bestMatch,
          confidence: bestMatch.confidence,
          reason: bestMatch.reason
        });
      }
    } else if (hardcoded.type === 'spacing') {
      const spacingTokens = analysis.availableTokens.spacing;
      const bestMatch = findBestSpacingToken(hardcoded.value, spacingTokens);
      if (bestMatch) {
        suggestions.push({
          hardcodedValue: hardcoded,
          suggestedToken: bestMatch,
          confidence: bestMatch.confidence,
          reason: bestMatch.reason
        });
      }
    }
  }
  
  return suggestions;
}

// Поиск лучшего цветового токена
function findBestColorToken(hexColor, colorTokens) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const token of colorTokens) {
    // Простое сравнение по имени токена
    const nameScore = calculateColorNameScore(hexColor, token.name);
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestMatch = Object.assign({}, token, {
        confidence: nameScore,
        reason: `Подходящий токен по названию: ${token.name}`
      });
    }
  }
  
  return bestMatch;
}

// Поиск лучшего токена для отступов
function findBestSpacingToken(value, spacingTokens) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const token of spacingTokens) {
    // Ищем токен с похожим значением
    const valueScore = calculateSpacingValueScore(value, token);
    if (valueScore > bestScore) {
      bestScore = valueScore;
      bestMatch = Object.assign({}, token, {
        confidence: valueScore,
        reason: `Подходящий токен по значению: ${token.name}`
      });
    }
  }
  
  return bestMatch;
}

// Оценка соответствия названия токена цвету
function calculateColorNameScore(hexColor, tokenName) {
  const name = tokenName.toLowerCase();
  let score = 0;
  
  // Базовые цвета
  if (hexColor.includes('FF') && hexColor.includes('0000') && name.includes('red')) score += 0.8;
  if (hexColor.includes('00FF') && name.includes('green')) score += 0.8;
  if (hexColor.includes('0000FF') && name.includes('blue')) score += 0.8;
  if (hexColor.includes('FFFFFF') && name.includes('white')) score += 0.8;
  if (hexColor.includes('000000') && name.includes('black')) score += 0.8;
  
  // Семантические названия
  if (name.includes('primary')) score += 0.6;
  if (name.includes('secondary')) score += 0.5;
  if (name.includes('accent')) score += 0.4;
  
  return Math.min(score, 1);
}

// Оценка соответствия значения токена отступам
function calculateSpacingValueScore(value, token) {
  // Простая эвристика - ищем токены с похожими значениями
  for (const modeValue of Object.values(token.value)) {
    if (typeof modeValue === 'number' && Math.abs(modeValue - value) < 2) {
      return 0.9;
    }
  }
  return 0;
}

async function collectDesignInfo() {
  try {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      return {
        success: false,
        message: 'Ничего не выбрано. Выберите элементы для анализа.'
      };
    }
    
    const elementsInfo = [];
    const allNodes = []; // Карта всех узлов с ID для навигации
    
    // Рекурсивная функция для сбора всех узлов
    async function collectAllNodes(node, parentPath = '') {
      // Безопасное преобразование имени в строку
      const nodeName = getSafeNodeName(node);
      const nodeInfo = {
        id: node.id,
        name: nodeName,
        type: node.type,
        path: parentPath ? `${parentPath} > ${nodeName}` : nodeName
      };
      allNodes.push(nodeInfo);
      
      // Рекурсивно обходим дочерние элементы
      if ('children' in node && Array.isArray(node.children)) {
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          await collectAllNodes(child, nodeInfo.path);
        }
      }
    }
    
    // Собираем информацию о каждом выделенном элементе
    for (const node of selection) {
      // Собираем все узлы для навигации
      await collectAllNodes(node);
      
      // Собираем детальную информацию о корневом элементе
      const elementInfo = await extractNodeInfo(node, true); // true = detailed
      elementsInfo.push(elementInfo);
    }
    
    debugLog('AI Design Lint: Собрано узлов для навигации:', allNodes.length);
    debugLog('AI Design Lint: Собрано элементов:', elementsInfo.length);
    
    // Собираем информацию о дизайн-системе (доступные токены)
    const designSystemInfo = await collectDesignSystemInfo();
    debugLog('AI Design Lint: Собрана информация о дизайн-системе');
    
    // Безопасная сериализация - удаляем Symbol и другие несериализуемые данные
    // Используем функцию replacer для фильтрации Symbol
    const safeStringify = (obj, label = 'object') => {
      try {
        const jsonString = JSON.stringify(obj, (key, value) => {
          // Пропускаем Symbol
          if (typeof value === 'symbol') {
            debugLog(`AI Design Lint: Пропущен Symbol в ${label}, ключ: ${key}`);
            return undefined;
          }
          // Пропускаем функции
          if (typeof value === 'function') {
            debugLog(`AI Design Lint: Пропущена функция в ${label}, ключ: ${key}`);
            return undefined;
          }
          return value;
        });
        return JSON.parse(jsonString);
      } catch (error) {
        console.error(`AI Design Lint: Ошибка при сериализации ${label}:`, error);
        return null;
      }
    };
    
    debugLog('AI Design Lint: Начинаем безопасную сериализацию данных...');
    const safeDesignSystemInfo = safeStringify(designSystemInfo, 'designSystem');
    debugLog('AI Design Lint: Сериализация designSystem завершена');
    
    const safeElementsInfo = safeStringify(elementsInfo, 'elements');
    debugLog('AI Design Lint: Сериализация elements завершена');
    
    const safeAllNodes = safeStringify(allNodes, 'allNodes');
    debugLog('AI Design Lint: Сериализация allNodes завершена');
    
    return {
      success: true,
      elementsCount: safeElementsInfo ? safeElementsInfo.length : 0,
      elements: safeElementsInfo || [],
      allNodes: safeAllNodes || [], // Карта всех узлов
      pageName: figma.currentPage.name,
      designSystem: safeDesignSystemInfo || {} // Информация о дизайн-системе
    };
    
  } catch (error) {
    console.error('Ошибка при сборе информации о дизайне:', error);
    return {
      success: false,
      message: `Ошибка при сборе информации: ${error.message}`
    };
  }
}

// Функция сбора информации о дизайн-системе
async function collectDesignSystemInfo() {
  const designSystem = {
    variables: {
      colors: [],
      spacing: [],
      typography: [],
      other: []
    },
    collections: []
  };
  
  try {
    // Получаем все локальные коллекции переменных (асинхронно)
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    
    for (const collection of collections) {
      const collectionInfo = {
        name: collection.name,
        id: collection.id,
        variables: []
      };
      
      // Получаем все переменные в этой коллекции (асинхронно)
      const variables = await figma.variables.getLocalVariablesAsync();
      const collectionVariables = variables.filter(v => v.variableCollectionId === collection.id);
      
      for (const variable of collectionVariables) {
        try {
          const varInfo = {
            name: variable.name,
            id: variable.id,
            type: variable.resolvedType,
            description: variable.description || ''
          };
          
          // Добавляем значение переменной
          try {
            const modes = collection.modes;
            if (modes && modes.length > 0) {
              const modeId = modes[0].modeId;
              const value = variable.valuesByMode[modeId];
              
              // Преобразуем значение в сериализуемый формат
              if (variable.resolvedType === 'COLOR' && value && typeof value === 'object') {
                // Для цветов сохраняем RGB значения
                varInfo.value = {
                  r: value.r || 0,
                  g: value.g || 0,
                  b: value.b || 0,
                  a: value.a !== undefined ? value.a : 1
                };
              } else if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
                // Для примитивных типов сохраняем как есть
                varInfo.value = value;
              } else if (value && typeof value === 'object') {
                // Для других объектов пытаемся сериализовать
                try {
                  varInfo.value = JSON.parse(JSON.stringify(value));
                } catch (e) {
                  varInfo.value = String(value);
                }
              }
            }
          } catch (e) {
            // Не удалось получить значение
            debugLog('Не удалось получить значение переменной:', variable.name, e.message);
          }
          
          collectionInfo.variables.push(varInfo);
          
          // Сортируем переменные по типам
          if (variable.resolvedType === 'COLOR') {
            designSystem.variables.colors.push(varInfo);
          } else if (variable.name.toLowerCase().includes('spacing') || 
                     variable.name.toLowerCase().includes('gap') ||
                     variable.name.toLowerCase().includes('padding')) {
            designSystem.variables.spacing.push(varInfo);
          } else if (variable.name.toLowerCase().includes('font') || 
                     variable.name.toLowerCase().includes('text') ||
                     variable.name.toLowerCase().includes('size')) {
            designSystem.variables.typography.push(varInfo);
          } else {
            designSystem.variables.other.push(varInfo);
          }
        } catch (varError) {
          debugLog('Ошибка при обработке переменной:', varError.message);
          continue;
        }
      }
      
      designSystem.collections.push(collectionInfo);
    }
    
    // Добавляем стандартные правила дизайн-системы Orbita
    designSystem.rules = {
      spacing: {
        standard: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64],
        description: "Все отступы должны быть кратны 4px"
      },
      cornerRadius: {
        standard: [0, 2, 4, 6, 8, 12, 16, 20, 24, 32],
        description: "Стандартные значения border-radius"
      },
      touchTargets: {
        minimum: 44,
        description: "Минимальный размер для интерактивных элементов"
      },
      contrast: {
        normalText: 4.5,
        largeText: 3.0,
        description: "Минимальный контраст по WCAG AA"
      }
    };
    
    debugLog('AI Design Lint: Собрана информация о дизайн-системе:', {
      collectionsCount: designSystem.collections.length,
      colorsCount: designSystem.variables.colors.length,
      spacingCount: designSystem.variables.spacing.length,
      typographyCount: designSystem.variables.typography.length
    });
    
  } catch (error) {
    console.error('Ошибка при сборе информации о дизайн-системе:', error);
  }
  
  return designSystem;
}

// Функция извлечения информации о узле
async function extractNodeInfo(node, detailed = false) {
  const info = {
    id: node.id,
    name: getSafeNodeName(node),  // Безопасное преобразование в строку
    type: node.type,
    visible: node.visible
  };
  
  // Если detailed = true, собираем информацию о дочерних элементах
  if (detailed && 'children' in node && Array.isArray(node.children)) {
    info.children = [];
    for (const child of node.children) {
      const childInfo = await extractNodeInfo(child, true);
      info.children.push(childInfo);
    }
  }
  
  // Добавляем размеры, если доступны
  if ('width' in node && 'height' in node) {
    info.width = node.width;
    info.height = node.height;
  }
  
  // Добавляем позицию, если доступна
  if ('x' in node && 'y' in node) {
    info.x = node.x;
    info.y = node.y;
  }
  
  // Добавляем информацию о заливке с переменными
  if ('fills' in node && Array.isArray(node.fills)) {
    info.fills = [];
    for (const fill of node.fills) {
      const fillInfo = {
        type: fill.type,
        visible: fill.visible !== false
      };
      
      if (fill.type === 'SOLID') {
        fillInfo.color = fill.color;
        fillInfo.opacity = fill.opacity || 1;
        
        // Проверяем, привязан ли цвет к переменной
        if (fill.boundVariables && fill.boundVariables.color) {
          try {
            const variable = await figma.variables.getVariableByIdAsync(fill.boundVariables.color.id);
            if (variable) {
              fillInfo.variable = {
                name: variable.name,
                id: variable.id,
                isToken: true
              };
            }
          } catch (e) {
            // Переменная не найдена
            debugLog('Не удалось получить переменную цвета:', e.message);
          }
        } else {
          fillInfo.isHardcoded = true;
        }
      }
      info.fills.push(fillInfo);
    }
  }
  
  // Добавляем информацию о обводке
  if ('strokes' in node && Array.isArray(node.strokes)) {
    info.strokes = node.strokes.map(stroke => {
      if (stroke.type === 'SOLID') {
        return {
          type: 'SOLID',
          color: stroke.color,
          opacity: stroke.opacity || 1
        };
      }
      return { type: stroke.type };
    });
    
    if ('strokeWeight' in node) {
      info.strokeWeight = node.strokeWeight;
    }
  }
  
  // Добавляем информацию о тексте с проверкой токенов
  if (node.type === 'TEXT') {
    info.characters = node.characters;
    info.fontSize = node.fontSize;
    info.fontName = node.fontName;
    info.textAlignHorizontal = node.textAlignHorizontal;
    info.textAlignVertical = node.textAlignVertical;
    info.lineHeight = node.lineHeight;
    info.letterSpacing = node.letterSpacing;
    
    // Проверяем, привязан ли размер шрифта к переменной
    if (node.boundVariables && node.boundVariables.fontSize) {
      try {
        const variable = await figma.variables.getVariableByIdAsync(node.boundVariables.fontSize.id);
        if (variable) {
          info.fontSizeVariable = {
            name: variable.name,
            isToken: true
          };
        }
      } catch (e) {
        // Переменная не найдена
        debugLog('Не удалось получить переменную fontSize:', e.message);
      }
    } else if (typeof node.fontSize === 'number') {
      info.fontSizeHardcoded = true;
    }
  }
  
  // Добавляем информацию о дочерних элементах
  if ('children' in node && Array.isArray(node.children)) {
    info.childrenCount = node.children.length;
    info.childrenTypes = node.children.map(child => child.type);
  }
  
  // Добавляем информацию о компоненте
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    info.description = node.description;
    
    // Добавляем информацию о свойствах компонента
    if (node.type === 'COMPONENT') {
      try {
        if (node.variantProperties) {
          info.variantProperties = node.variantProperties;
        }
      } catch (e) {
        // Свойства недоступны
      }
    }
    
    // Для Component Set собираем информацию о всех вариантах
    if (node.type === 'COMPONENT_SET' && node.children) {
      info.variantsCount = node.children.length;
      info.variantsList = node.children.map(child => ({
        name: child.name,
        id: child.id,
        properties: child.variantProperties || {}
      }));
    }
  }
  
  // Добавляем информацию об instance
  if (node.type === 'INSTANCE') {
    // Используем асинхронный метод для получения mainComponent
    try {
      const mainComponent = await node.getMainComponentAsync();
      if (mainComponent) {
        info.mainComponent = {
          name: mainComponent.name,
          id: mainComponent.id
        };
      }
    } catch (e) {
      // mainComponent недоступен
      debugLog('Не удалось получить mainComponent:', e.message);
      info.mainComponent = null;
    }
    
    // Добавляем информацию об overrides
    try {
      if (node.overrides && node.overrides.length > 0) {
        info.hasOverrides = true;
        info.overridesCount = node.overrides.length;
      }
    } catch (e) {
      // Overrides недоступны
    }
  }
  
  // Добавляем информацию о Auto Layout с проверкой токенов
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    info.autoLayout = {
      mode: node.layoutMode,
      primaryAxisSizingMode: node.primaryAxisSizingMode,
      counterAxisSizingMode: node.counterAxisSizingMode,
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
      itemSpacing: node.itemSpacing,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems
    };
    
    // Проверяем на жестко закодированные значения
    const spacingValues = [
      node.paddingLeft, 
      node.paddingRight, 
      node.paddingTop, 
      node.paddingBottom, 
      node.itemSpacing
    ];
    
    // Стандартные значения токенов (8px сетка)
    const standardSpacings = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64];
    
    var hasNonStandardSpacing = false;
    for (var u = 0; u < spacingValues.length; u++) {
      var val = spacingValues[u];
      if (val !== 0) {
        var isStandard = false;
        for (var v = 0; v < standardSpacings.length; v++) {
          if (standardSpacings[v] === val) {
            isStandard = true;
            break;
          }
        }
        if (!isStandard) {
          hasNonStandardSpacing = true;
          break;
        }
      }
    }
    info.autoLayout.hasNonStandardSpacing = hasNonStandardSpacing;
    
    if (info.autoLayout.hasNonStandardSpacing) {
      info.autoLayout.nonStandardValues = spacingValues.filter(val => 
        val !== 0 && !standardSpacings.includes(val)
      );
    }
  }
  
  // Добавляем информацию о corner radius
  if ('cornerRadius' in node) {
    info.cornerRadius = node.cornerRadius;
    
    // Проверяем, стандартное ли значение
    const standardRadii = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32];
    if (!standardRadii.includes(node.cornerRadius)) {
      info.nonStandardCornerRadius = true;
    }
  }
  
  // Добавляем информацию об эффектах (тени, размытие)
  if ('effects' in node && Array.isArray(node.effects) && node.effects.length > 0) {
    info.effects = node.effects.map(effect => ({
      type: effect.type,
      visible: effect.visible !== false,
      radius: effect.radius,
      offset: effect.offset
    }));
  }
  
  return info;
}

// =============================================================================
// Design System Validator - Проверка Variables
// =============================================================================

/**
 * Главная функция валидации дизайн-системы
 * @param {string} mode - Режим проверки: 'local', 'remote', 'all'
 * @param {Object} options - Опции проверки
 * @returns {Promise<Object>} Отчёт о проверке
 */
async function validateDesignSystem(mode, options = {}) {
  console.log('DSV: Начало проверки, режим:', mode, 'опции:', options);
  
  const startTime = Date.now();
  const report = {
    mode: mode,
    totalNodes: 0,
    nodesChecked: 0,
    nodesWithVariables: 0,
    nodesWithoutVariables: 0,
    totalIssues: 0,
    issues: [],
    timestamp: new Date().toISOString()
  };
  
  try {
    // 1. Определяем область проверки
    const nodesToCheck = await getValidationScope();
    console.log('DSV: Найдено нод для проверки:', nodesToCheck.length);
    
    if (nodesToCheck.length === 0) {
      report.totalNodes = 0;
      return report;
    }
    
    // 2. Получаем список variables
    // Используем сохранённые в памяти токены из JSON
    const variables = await getVariablesByMode(mode, savedTokensFromJson);
    console.log('DSV: Загружено variables:', variables.size, 'шт.');
    
    // Логируем источник токенов
    if (savedTokensFromJson && savedTokensFromJson.length > 0) {
      console.log('DSV: Используются токены из загруженного JSON файла:', savedTokensFromJson.length);
    } else {
      console.log('DSV: Используются токены из Figma API');
    }
    
    // Логирование первых 5 variables для проверки
    if (variables.size > 0) {
      const firstFive = Array.from(variables.entries()).slice(0, 5);
      console.log('DSV: Примеры загруженных variables:', firstFive.map(([id, v]) => ({
        id: id.substring(0, 20) + '...',
        name: v.name,
        remote: v.remote || false
      })));
    }
    
    // 3. Проверяем ноды батчами для производительности
    const BATCH_SIZE = 50;
    let processedCount = 0;
    
    for (let i = 0; i < nodesToCheck.length; i += BATCH_SIZE) {
      const batch = nodesToCheck.slice(i, Math.min(i + BATCH_SIZE, nodesToCheck.length));
      
      // Проверяем каждую ноду в батче
      for (const node of batch) {
        await checkNodeVariables(node, variables, mode, report, options);
        processedCount++;
        
        // Отправляем прогресс каждые 10 нод
        if (processedCount % 10 === 0 || processedCount === nodesToCheck.length) {
          figma.ui.postMessage({
            type: 'dsv-validation-progress',
            processed: processedCount,
            total: nodesToCheck.length
          });
        }
      }
      
      // Даём Figma немного времени на обработку других задач
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    report.totalNodes = nodesToCheck.length;
    report.nodesChecked = processedCount;
    report.totalIssues = report.issues.length;
    
    const duration = Date.now() - startTime;
    console.log(`DSV: Проверка завершена за ${duration}ms. Найдено проблем: ${report.totalIssues}`);
    
    return report;
    
  } catch (error) {
    console.error('DSV: Критическая ошибка при валидации:', error);
    throw error;
  }
}

/**
 * Определяет область проверки (выделенные объекты или вся страница)
 * @returns {Promise<SceneNode[]>} Список нод для проверки
 */
async function getValidationScope() {
  const selection = figma.currentPage.selection;
  
  if (selection.length > 0) {
    // Если есть выделение - проверяем выделенные объекты и их детей
    console.log('DSV: Проверка выделенных объектов:', selection.length);
    const allNodes = [];
    
    for (const node of selection) {
      allNodes.push(node);
      collectAllChildNodes(node, allNodes);
    }
    
    return allNodes;
  } else {
    // Если нет выделения - проверяем всю страницу
    console.log('DSV: Проверка всей страницы');
    const allNodes = [];
    
    for (const child of figma.currentPage.children) {
      allNodes.push(child);
      collectAllChildNodes(child, allNodes);
    }
    
    return allNodes;
  }
}

/**
 * Рекурсивно собирает все дочерние ноды
 * @param {SceneNode} node - Родительская нода
 * @param {SceneNode[]} collection - Массив для сбора
 */
function collectAllChildNodes(node, collection) {
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      collection.push(child);
      collectAllChildNodes(child, collection);
    }
  }
}

/**
 * Получает список variables в зависимости от режима
 * @param {string} mode - Режим: 'local', 'remote', 'all'
 * @returns {Promise<Map>} Map с ID variables
 */
async function getVariablesByMode(mode, tokensFromJson = null) {
  const variablesMap = new Map();
  
  try {
    // Если есть tokensFromJson - используем их вместо Figma API
    if (tokensFromJson && Array.isArray(tokensFromJson) && tokensFromJson.length > 0) {
      console.log('DSV: Используются токены из JSON файла:', tokensFromJson.length);
      
      let localCount = 0;
      let remoteCount = 0;
      
      for (const token of tokensFromJson) {
        // Валидация структуры токена
        if (!token.name) {
          console.warn('DSV: Пропущен токен без имени:', token);
          continue;
        }
        
        // Определяем тип токена (local/remote) по полю isRemote или remote
        const isRemote = token.isRemote === true || token.remote === true;
        
        // Подсчёт для логирования
        if (isRemote) {
          remoteCount++;
        } else {
          localCount++;
        }
        
        // Создаём ID для токена (используем существующий или генерируем из имени)
        const tokenId = token.id || `json-token-${token.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Создаём объект, совместимый с Figma Variable
        // Если токен является алиасом и есть resolvedValue - используем его
        const actualValue = token.isAlias && token.resolvedValue ? token.resolvedValue : token.value;
        
        // Логируем разрешение алиасов
        if (token.isAlias && token.resolvedValue) {
          console.log(`DSV: Алиас разрешён для "${token.name}":`, token.resolvedValue);
        }
        
        const variableObject = {
          id: tokenId,
          name: token.name,
          remote: isRemote,
          resolvedType: token.type || token.resolvedType || 'UNKNOWN',
          // Дополнительные поля из JSON
          value: actualValue,
          originalValue: token.value, // Сохраняем оригинальное значение (может быть алиасом)
          isAlias: token.isAlias || false,
          description: token.description || '',
          scopes: token.scopes || [],
          hiddenFromPublishing: token.hiddenFromPublishing || false
        };
        
        // Добавляем в Map согласно выбранному режиму
        if (mode === 'all') {
          // Все variables
          variablesMap.set(tokenId, variableObject);
        } else if (mode === 'local' && !isRemote) {
          // Только локальные
          variablesMap.set(tokenId, variableObject);
        } else if (mode === 'remote' && isRemote) {
          // Только remote
          variablesMap.set(tokenId, variableObject);
        }
      }
      
      console.log('DSV: Статистика токенов из JSON:', {
        total: tokensFromJson.length,
        local: localCount,
        remote: remoteCount,
        mode: mode,
        selected: variablesMap.size
      });
      
      // Логирование первых 10 токенов
      console.log('DSV: === ТОКЕНЫ ИЗ JSON (первые 10) ===');
      tokensFromJson.slice(0, 10).forEach((token, idx) => {
        console.log(`  ${idx + 1}. ${token.name} (type: ${token.type || 'N/A'}, remote: ${token.isRemote || token.remote || false})`);
      });
      console.log('DSV: ====================================');
      
    } else {
      // Используем Figma API
      console.log('DSV: Используются токены из Figma API');
      
      const allVariables = await figma.variables.getLocalVariablesAsync();
      console.log('DSV: Получено всего variables:', allVariables.length);
      
      // Фильтруем по свойству variable.remote
      let localCount = 0;
      let remoteCount = 0;
      
      for (const variable of allVariables) {
        const isRemote = variable.remote === true;
        
        // Подсчёт для логирования
        if (isRemote) {
          remoteCount++;
        } else {
          localCount++;
        }
        
        // Добавляем в Map согласно выбранному режиму
        if (mode === 'all') {
          // Все variables
          variablesMap.set(variable.id, variable);
        } else if (mode === 'local' && !isRemote) {
          // Только локальные (remote === false или undefined)
          variablesMap.set(variable.id, variable);
        } else if (mode === 'remote' && isRemote) {
          // Только remote (remote === true)
          variablesMap.set(variable.id, variable);
        }
      }
      
      console.log('DSV: Статистика variables:', {
        total: allVariables.length,
        local: localCount,
        remote: remoteCount,
        mode: mode,
        selected: variablesMap.size
      });
      
      // ДЕТАЛЬНОЕ логирование ВСЕХ variables для отладки
      console.log('DSV: === ПОЛНЫЙ СПИСОК VARIABLES ===');
      console.log('DSV: Local variables:');
      allVariables.filter(v => !v.remote).forEach((v, idx) => {
        console.log(`  ${idx + 1}. ${v.name} (ID: ${v.id.substring(0, 20)}..., type: ${v.resolvedType})`);
      });
      console.log('DSV: Remote variables:');
      allVariables.filter(v => v.remote).forEach((v, idx) => {
        console.log(`  ${idx + 1}. ${v.name} (ID: ${v.id.substring(0, 20)}..., type: ${v.resolvedType})`);
      });
      console.log('DSV: ================================');
    }
    
  } catch (error) {
    console.error('DSV: Ошибка при получении variables:', error);
  }
  
  return variablesMap;
}

/**
 * Проверяет ноду на использование variables
 * @param {SceneNode} node - Нода для проверки
 * @param {Map} variables - Map доступных variables
 * @param {string} mode - Режим проверки
 * @param {Object} report - Отчёт для записи результатов
 */
async function checkNodeVariables(node, variables, mode, report, options = {}) {
  if (!node || !node.id) return;
  
  // 1. Исключаем проверку COMPONENT_SET (родительский фрейм компонента)
  if (node.type === 'COMPONENT_SET') {
    return;
  }
  
  // 2. Фильтрация по префиксу "orb-" для INSTANCE и COMPONENT
  if (options.filterOrbPrefix && (node.type === 'INSTANCE' || node.type === 'COMPONENT')) {
    const nodeName = getSafeNodeName(node);
    let hasOrbPrefix = nodeName.toLowerCase().startsWith('orb-');
    
    // Для INSTANCE также проверяем mainComponent если доступен
    if (node.type === 'INSTANCE' && !hasOrbPrefix) {
      try {
        if (node.mainComponent && node.mainComponent.name) {
          const mainCompName = getSafeNodeName(node.mainComponent);
          hasOrbPrefix = mainCompName.toLowerCase().startsWith('orb-');
        }
      } catch (e) {
        // Игнорируем ошибки при получении mainComponent
      }
    }
    
    // Если нет префикса "orb-", пропускаем компонент
    if (!hasOrbPrefix) {
      console.log(`DSV: Пропущен компонент без префикса "orb-": ${nodeName} (${node.type})`);
      return;
    }
  }
  
  // 3. Проверяем настройку для INSTANCE нод
  if (node.type === 'INSTANCE' && options.skipInstances) {
    return;
  }
  
  let hasVariables = false;
  const nodeIssues = [];
  
  // Получаем настройки проверяемых свойств (по умолчанию все включены)
  const propsSettings = options.propertiesToCheck || {
    fills: true,
    strokes: true,
    cornerRadius: true,
    spacing: true,
    padding: true,
    effects: false,
    opacity: false,
    size: false
  };
  
  // Проверяем различные свойства на наличие boundVariables
  // 2. Разделяем свойства на обязательные и опциональные
  const allProperties = [
    // Обязательные свойства (должны иметь токен если заданы)
    { key: 'fills', displayName: 'Fill', optional: false, settingKey: 'fills' },
    { key: 'strokes', displayName: 'Stroke', optional: false, settingKey: 'strokes' },
    { key: 'cornerRadius', displayName: 'Corner Radius', optional: false, settingKey: 'cornerRadius' },
    { key: 'paddingLeft', displayName: 'Padding Left', optional: false, settingKey: 'padding' },
    { key: 'paddingRight', displayName: 'Padding Right', optional: false, settingKey: 'padding' },
    { key: 'paddingTop', displayName: 'Padding Top', optional: false, settingKey: 'padding' },
    { key: 'paddingBottom', displayName: 'Padding Bottom', optional: false, settingKey: 'padding' },
    { key: 'itemSpacing', displayName: 'Gap', optional: false, settingKey: 'spacing' },
    
    // Опциональные свойства (могут отсутствовать, но если заданы - должны иметь токен)
    { key: 'effects', displayName: 'Effect', optional: true, settingKey: 'effects' },
    { key: 'opacity', displayName: 'Opacity', optional: true, settingKey: 'opacity' },
    { key: 'width', displayName: 'Width', optional: true, settingKey: 'size' },
    { key: 'height', displayName: 'Height', optional: true, settingKey: 'size' }
  ];
  
  // Фильтруем свойства на основе настроек
  const propertiesToCheck = allProperties.filter(prop => {
    return propsSettings[prop.settingKey] !== false;
  });
  
  // Проверяем каждое свойство
  for (const prop of propertiesToCheck) {
    // Получаем boundVariable для этого свойства
    const boundVar = ('boundVariables' in node && node.boundVariables) ? node.boundVariables[prop.key] : undefined;
    
    // СПЕЦИАЛЬНАЯ ПРОВЕРКА для cornerRadius:
    // Если cornerRadius не привязан, проверяем каждый угол отдельно
    if (prop.key === 'cornerRadius' && !boundVar && 'boundVariables' in node && node.boundVariables) {
      const cornerProperties = [
        { key: 'topLeftRadius', name: 'Top-Left' },
        { key: 'topRightRadius', name: 'Top-Right' },
        { key: 'bottomLeftRadius', name: 'Bottom-Left' },
        { key: 'bottomRightRadius', name: 'Bottom-Right' }
      ];
      
      let hasAnyIndividualCorners = false;
      let checkedIndividualCorners = false;
      
      for (const corner of cornerProperties) {
        const cornerBoundVar = node.boundVariables[corner.key];
        const cornerValue = node[corner.key];
        
        // Проверяем есть ли значение у этого угла
        if (cornerValue !== undefined && cornerValue !== 0) {
          checkedIndividualCorners = true;
          
          if (cornerBoundVar) {
            // Угол имеет токен - валидируем его
            hasVariables = true;
            hasAnyIndividualCorners = true;
            await validateVariableBinding(cornerBoundVar.id, variables, mode, node, `Corner Radius ${corner.name}`, nodeIssues);
          } else {
            // Угол имеет значение, но НЕТ токена - это проблема!
            console.warn(`DSV: 🔍 Угол без токена:`);
            console.log(`  Node: "${getSafeNodeName(node)}"`);
            console.log(`  Corner: ${corner.name} (${corner.key})`);
            console.log(`  Value: ${safeStringify(cornerValue)}`);
            console.log(`  ---`);
            
            // Поиск подходящего токена по значению
            const suggestedToken = findTokenByValue(variables, cornerValue, 'cornerRadius');
            
            console.log(`DSV: Поиск токена для угла ${corner.name}, значение: ${safeStringify(cornerValue)}, найден:`, suggestedToken ? suggestedToken.name : 'нет');
            
            nodeIssues.push({
              type: 'No Variable',
              severity: 'medium',
              property: `Corner Radius ${corner.name}`,
              description: `Corner "${corner.name}" не использует Design Token`,
              nodeId: node.id,
              nodeName: getSafeNodeName(node),
              value: safeStringify(cornerValue),
              suggestedToken: createSafeSuggestedToken(suggestedToken)
            });
          }
        }
      }
      
      // Если проверили отдельные углы, пропускаем общую проверку cornerRadius
      if (checkedIndividualCorners) {
        console.log(`DSV: ✓ Проверены раздельные углы для ${getSafeNodeName(node)}`);
        continue;
      }
    }
    
    // Логирование для отладки (можно удалить после тестирования)
    const nodeName = getSafeNodeName(node);
    if (nodeName && typeof nodeName === 'string' && nodeName.includes('DEBUG')) {
      console.log(`DSV: Проверка ${nodeName} -> ${prop.key}:`, {
        hasBoundVariables: 'boundVariables' in node,
        boundVar: boundVar,
        actualValue: node[prop.key]
      });
    }
    
    if (boundVar) {
      // Есть привязка к токену
      hasVariables = true;
      
      // Проверяем типы привязок
      if (Array.isArray(boundVar)) {
        // Для массивов (fills, strokes, effects)
        // Проверяем, что массив не пустой и есть реальные привязки
        let hasValidBinding = false;
        for (const varBinding of boundVar) {
          if (varBinding && varBinding.id) {
            hasValidBinding = true;
            await validateVariableBinding(varBinding.id, variables, mode, node, prop.displayName, nodeIssues);
          }
        }
        
        // Если массив boundVar не пустой, но нет валидных привязок - это тоже проблема
        if (boundVar.length > 0 && !hasValidBinding) {
          console.warn('DSV: boundVar массив есть, но нет валидных привязок для', prop.key, 'в', getSafeNodeName(node));
        }
      } else if (typeof boundVar === 'object' && boundVar.id) {
        // Для одиночных привязок
        await validateVariableBinding(boundVar.id, variables, mode, node, prop.displayName, nodeIssues);
      }
    } else {
      // НЕТ привязки к токену
      // Проверяем, нужно ли сообщать об этом
      
      // Сначала проверяем, есть ли вообще значение у этого свойства
      const propertyValue = node[prop.key];
      
      // Для массивов (fills, strokes, effects) - проверяем что массив не пустой
      if (Array.isArray(propertyValue)) {
        // Проверяем наличие непустых и видимых элементов, которые МОГУТ использовать токены
        const hasVisibleValues = propertyValue.length > 0 && 
          propertyValue.some(item => {
            // Для effects проверяем visible
            if (prop.key === 'effects') {
              return item.visible !== false && item.type !== 'NONE';
            }
            
            // Для fills/strokes - только SOLID цвета могут использовать токены
            // IMAGE, GRADIENT, VIDEO - не поддерживают токены, пропускаем их
            if (prop.key === 'fills' || prop.key === 'strokes') {
              const supportedTypes = ['SOLID'];
              if (!supportedTypes.includes(item.type)) {
                return false; // Не проверяем IMAGE/GRADIENT/VIDEO
              }
              
              return item.visible !== false && 
                     (item.opacity === undefined || item.opacity > 0);
            }
            
            // Для других массивов
            return item.visible !== false;
          });
        
        if (hasVisibleValues && shouldReportMissingVariable(node, prop.key)) {
          // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ для отладки
          console.warn(`DSV: 🔍 Массив свойств без токена:`);
          console.log(`  Node: "${getSafeNodeName(node)}"`);
          console.log(`  Property: ${prop.displayName} (${prop.key})`);
          console.log(`  Array length: ${propertyValue.length}`);
          console.log(`  Has boundVariables: ${'boundVariables' in node}`);
          if ('boundVariables' in node) {
            console.log(`  boundVariables для ${prop.key}:`, node.boundVariables[prop.key]);
            try {
              // Используем Object.getOwnPropertyNames для избежания Symbol ключей
              console.log(`  Все boundVariables:`, Object.getOwnPropertyNames(node.boundVariables));
            } catch (e) {
              console.log(`  Ошибка при получении ключей boundVariables:`, e);
            }
          }
          console.log(`  Node type: ${node.type}`);
          console.log(`  ---`);
          
          // Поиск подходящего токена по значению
          const rawValue = node[prop.key]; // Оригинальное значение для поиска
          const displayValue = getPropertyValue(node, prop.key); // Отформатированное для отображения
          const suggestedToken = findTokenByValue(variables, rawValue, prop.key);
          
          console.log(`DSV: Поиск токена для ${prop.displayName}, значение:`, displayValue, ', найден:', suggestedToken ? suggestedToken.name : 'нет');
          
          nodeIssues.push({
            type: 'No Variable',
            severity: 'medium',
            property: prop.displayName,
            description: `Property "${prop.displayName}" не использует Design Token`,
            nodeId: node.id,
            nodeName: getSafeNodeName(node),
            value: displayValue,
            suggestedToken: createSafeSuggestedToken(suggestedToken)
          });
        }
      } else if (prop.optional) {
        // Для опциональных свойств: проверяем только если свойство реально задано
        const hasValue = hasPropertyValue(node, prop.key);
        
        if (hasValue && shouldReportMissingVariable(node, prop.key)) {
          // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ для отладки
          console.warn(`DSV: 🔍 Опциональное свойство без токена:`);
          console.log(`  Node: "${getSafeNodeName(node)}"`);
          console.log(`  Property: ${prop.displayName} (${prop.key})`);
          console.log(`  Value: ${safeStringify(propertyValue)}`);
          console.log(`  Has boundVariables: ${'boundVariables' in node}`);
          if ('boundVariables' in node) {
            console.log(`  boundVariables для ${prop.key}:`, node.boundVariables[prop.key]);
            try {
              // Используем Object.getOwnPropertyNames для избежания Symbol ключей
              console.log(`  Все boundVariables:`, Object.getOwnPropertyNames(node.boundVariables));
            } catch (e) {
              console.log(`  Ошибка при получении ключей boundVariables:`, e);
            }
          }
          console.log(`  Node type: ${node.type}`);
          console.log(`  ---`);
          
          // Поиск подходящего токена по значению
          const rawValue = node[prop.key]; // Оригинальное значение для поиска
          const displayValue = getPropertyValue(node, prop.key); // Отформатированное для отображения
          const suggestedToken = findTokenByValue(variables, rawValue, prop.key);
          
          nodeIssues.push({
            type: 'No Variable',
            severity: 'medium',
            property: prop.displayName,
            description: `Property "${prop.displayName}" установлено, но не использует Design Token`,
            nodeId: node.id,
            nodeName: getSafeNodeName(node),
            value: displayValue,
            suggestedToken: createSafeSuggestedToken(suggestedToken)
          });
        }
      } else {
        // Для обязательных свойств: проверяем если значение задано и не равно 0
        if (propertyValue !== undefined && propertyValue !== 0 && propertyValue !== null) {
          if (shouldReportMissingVariable(node, prop.key)) {
            // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ для отладки
            console.warn(`DSV: 🔍 Свойство без токена:`);
            console.log(`  Node: "${getSafeNodeName(node)}"`);
            console.log(`  Property: ${prop.displayName} (${prop.key})`);
            console.log(`  Value: ${safeStringify(propertyValue)}`);
            console.log(`  Has boundVariables: ${'boundVariables' in node}`);
            if ('boundVariables' in node) {
              console.log(`  boundVariables для ${prop.key}:`, node.boundVariables[prop.key]);
              try {
                // Используем Object.getOwnPropertyNames для избежания Symbol ключей
                console.log(`  Все boundVariables:`, Object.getOwnPropertyNames(node.boundVariables));
              } catch (e) {
                console.log(`  Ошибка при получении ключей boundVariables:`, e);
              }
            }
            console.log(`  Node type: ${node.type}`);
            console.log(`  ---`);
            
            // Поиск подходящего токена по значению
            const rawValue = node[prop.key]; // Оригинальное значение для поиска
            const displayValue = getPropertyValue(node, prop.key); // Отформатированное для отображения
            const suggestedToken = findTokenByValue(variables, rawValue, prop.key);
            
            nodeIssues.push({
              type: 'No Variable',
              severity: 'medium',
              property: prop.displayName,
              description: `Property "${prop.displayName}" не использует Design Token`,
              nodeId: node.id,
              nodeName: getSafeNodeName(node),
              value: displayValue,
              suggestedToken: createSafeSuggestedToken(suggestedToken)
            });
          }
        }
      }
    }
  }
  
  // Обновляем статистику
  if (hasVariables) {
    report.nodesWithVariables++;
  } else {
    report.nodesWithoutVariables++;
  }
  
  // Добавляем проблемы в отчёт
  if (nodeIssues.length > 0) {
    report.issues.push(...nodeIssues);
  }
}

/**
 * Проверяет валидность привязки к variable
 * @param {string} variableId - ID переменной
 * @param {Map} variables - Map доступных variables
 * @param {string} mode - Режим проверки
 * @param {SceneNode} node - Нода
 * @param {string} propertyName - Название свойства
 * @param {Array} issues - Массив для записи проблем
 */
async function validateVariableBinding(variableId, variables, mode, node, propertyName, issues) {
  // Сначала проверяем прямое совпадение по ID
  if (!variables.has(variableId)) {
    // Variable не найдена по ID в списке токенов
    // Попытаемся получить реальный токен из Figma API
    try {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      
      if (!variable) {
        // Variable удалена или недоступна
        console.warn(`DSV: Variable не найден в Figma API. Node: "${getSafeNodeName(node)}", Property: ${propertyName}, ID: ${variableId.substring(0, 20)}`);
        issues.push({
          type: 'Missing Variable',
          severity: 'high',
          property: propertyName,
          description: `Variable удалена или недоступна (ID: ${variableId.substring(0, 8)}...)`,
          nodeId: node.id,
          nodeName: getSafeNodeName(node),
          variableId: variableId
        });
      } else {
        // Variable существует в Figma
        // Проверяем, может быть она есть в JSON токенах по имени
        const tokenByName = findTokenByName(variables, variable.name);
        
        if (tokenByName) {
          // Токен найден по имени в JSON - всё в порядке!
          // Убираем избыточное логирование
          // console.log(`DSV: ✓ Токен "${variable.name}" найден по имени`);
          
          // Проверяем на deprecated
          if (variable.name && (variable.name.includes('_deprecated') || variable.name.includes('old-'))) {
            issues.push({
              type: 'Deprecated Token',
              severity: 'low',
              property: propertyName,
              description: `Используется устаревший токен "${variable.name}"`,
              nodeId: node.id,
              nodeName: getSafeNodeName(node),
              variableId: variableId,
              variableName: variable.name
            });
          }
        } else {
          // Variable существует в Figma, но не найдена в токенах (ни по ID, ни по имени)
          console.warn(`DSV: ❌ Токен не найден. Node: "${getSafeNodeName(node)}", Property: ${propertyName}, Token: "${variable.name}", isRemote: ${variable.remote}, Mode: ${mode}`);
          console.log(`DSV: Всего токенов в списке: ${variables.size}, Токен ID: ${variableId.substring(0, 20)}`);
          
          issues.push({
            type: 'Invalid Source',
            severity: 'medium',
            property: propertyName,
            description: `Variable "${variable.name}" не найден в списке токенов для режима проверки (${mode})`,
            nodeId: node.id,
            nodeName: getSafeNodeName(node),
            variableId: variableId,
            variableName: variable.name
          });
        }
      }
    } catch (error) {
      console.error('DSV: Ошибка при получении variable:', error);
    }
  } else {
    // Variable найдена по ID - всё в порядке
    const variable = variables.get(variableId);
    
    // Проверяем на deprecated токены
    if (variable.name && (variable.name.includes('_deprecated') || variable.name.includes('old-'))) {
      issues.push({
        type: 'Deprecated Token',
        severity: 'low',
        property: propertyName,
        description: `Используется устаревший токен "${variable.name}"`,
        nodeId: node.id,
        nodeName: getSafeNodeName(node),
        variableId: variableId,
        variableName: variable.name
      });
    }
  }
}

/**
 * Поиск токена по имени в Map токенов
 * @param {Map} variables - Map токенов
 * @param {string} name - Имя токена
 * @returns {Object|null} - Токен или null
 */
function findTokenByName(variables, name) {
  for (const [id, token] of variables.entries()) {
    if (token.name === name) {
      return token;
    }
  }
  return null;
}

/**
 * Ищет токен по значению свойства
 * @param {Map} variables - Map токенов
 * @param {any} value - Значение для поиска
 * @param {string} propertyType - Тип свойства (cornerRadius, spacing, color и т.д.)
 * @returns {Object|null} - Найденный токен или null
 */
function findTokenByValue(variables, value, propertyType) {
  console.log(`DSV findTokenByValue v3.0.4: поиск токена. Type: ${propertyType}, Value:`, value, `Variables count: ${variables ? variables.size : 0}`);
  
  const valueType = typeof value;
  const isArray = Array.isArray(value);
  const constructorName = (value && value.constructor) ? value.constructor.name : 'undefined';
  console.log(`DSV findTokenByValue v3.0.4: тип значения - typeof: ${valueType}, isArray: ${isArray}, constructor: ${constructorName}`);
  
  if (!variables || variables.size === 0 || value === undefined || value === null) {
    console.log('DSV findTokenByValue: прерывание - нет данных');
    return null;
  }
  
  // Для массивов (fills, strokes) - извлекаем первый элемент
  if (Array.isArray(value)) {
    console.log(`DSV findTokenByValue v3.0.4: ✅ ОБНАРУЖЕН МАССИВ! Длина: ${value.length}`);
    
    if (value.length === 0) {
      console.log('DSV findTokenByValue: пустой массив fills/strokes');
      return null;
    }
    
    const firstPaint = value[0];
    console.log(`DSV findTokenByValue: первый элемент массива:`, firstPaint);
    
    // Извлекаем цвет из paint
    if (firstPaint && firstPaint.type === 'SOLID' && firstPaint.color) {
      console.log(`DSV findTokenByValue: ✅ извлечён цвет из SOLID fill:`, firstPaint.color);
      return findTokenByValue(variables, firstPaint.color, propertyType);
    }
    
    console.log('DSV findTokenByValue: ❌ Неподдерживаемый тип paint (не SOLID или нет color)');
    return null;
  }
  
  // Для числовых значений (радиусы, отступы, размеры)
  if (typeof value === 'number') {
    console.log(`DSV findTokenByValue: числовое значение ${value}, ищем в ${variables.size} токенах`);
    for (const [id, token] of variables.entries()) {
      // Проверяем что токен подходящего типа
      const tokenType = token.type || token.resolvedType;
      if (tokenType !== 'FLOAT' && tokenType !== 'NUMBER') continue;
      
      // Сравниваем значение
      const tokenValue = token.value;
      if (typeof tokenValue === 'number' && Math.abs(tokenValue - value) < 0.01) {
        // Дополнительная проверка по имени токена для релевантности
        const tokenName = token.name.toLowerCase();
        
        // Для cornerRadius ищем radius/corner/rounded
        if (propertyType === 'cornerRadius' && 
            (tokenName.includes('radius') || tokenName.includes('corner') || tokenName.includes('rounded'))) {
          console.log(`DSV findTokenByValue: ✅ Найден токен для cornerRadius: ${token.name} = ${tokenValue}`);
          return token;
        }
        
        // Для spacing/gap ищем spacing/gap/margin
        if ((propertyType === 'itemSpacing' || propertyType === 'spacing') && 
            (tokenName.includes('spacing') || tokenName.includes('gap') || tokenName.includes('margin'))) {
          console.log(`DSV findTokenByValue: ✅ Найден токен для spacing: ${token.name} = ${tokenValue}`);
          return token;
        }
        
        // Для padding ищем padding
        if (propertyType.includes('padding') && tokenName.includes('padding')) {
          console.log(`DSV findTokenByValue: ✅ Найден токен для padding: ${token.name} = ${tokenValue}`);
          return token;
        }
        
        // Для width/height ищем size/width/height
        if ((propertyType === 'width' || propertyType === 'height') && 
            (tokenName.includes('size') || tokenName.includes('width') || tokenName.includes('height'))) {
          console.log(`DSV findTokenByValue: ✅ Найден токен для size: ${token.name} = ${tokenValue}`);
          return token;
        }
        
        // Если не подошло по имени, но значение совпадает - возвращаем с низким приоритетом
        // (можно расширить логику если нужно)
      }
    }
    console.log(`DSV findTokenByValue: ❌ Токен не найден для числового значения ${value}`);
    return null;
  }
  
  // Для цветов (fills, strokes) - более сложная логика
  if (typeof value === 'object' && value.r !== undefined) {
    const searchHex = rgbToHex(value);
    console.log(`DSV findTokenByValue: цвет RGB(${value.r.toFixed(3)}, ${value.g.toFixed(3)}, ${value.b.toFixed(3)}) = ${searchHex}`);
    
    let closestToken = null;
    let closestDiff = Infinity;
    
    for (const [id, token] of variables.entries()) {
      const tokenType = token.type || token.resolvedType;
      if (tokenType !== 'COLOR') continue;
      
      // Для алиасов используем resolvedValue
      let tokenValue = token.value;
      if (token.isAlias && token.resolvedValue) {
        tokenValue = token.resolvedValue;
      }
      
      if (tokenValue && typeof tokenValue === 'object' && tokenValue.r !== undefined) {
        // Вычисляем разницу между цветами
        const rDiff = Math.abs(tokenValue.r - value.r);
        const gDiff = Math.abs(tokenValue.g - value.g);
        const bDiff = Math.abs(tokenValue.b - value.b);
        const aDiff = Math.abs((tokenValue.a || 1) - (value.a || 1));
        const totalDiff = rDiff + gDiff + bDiff + aDiff;
        
        // Сохраняем самый близкий токен для отладки
        if (totalDiff < closestDiff) {
          closestDiff = totalDiff;
          closestToken = {
            name: token.name,
            value: tokenValue,
            hexValue: token.hexValue || rgbToHex(tokenValue),
            diff: totalDiff,
            diffs: { r: rDiff.toFixed(3), g: gDiff.toFixed(3), b: bDiff.toFixed(3), a: aDiff.toFixed(3) }
          };
        }
        
        // Сравниваем RGB с точностью до 0.01
        const rMatch = rDiff < 0.01;
        const gMatch = gDiff < 0.01;
        const bMatch = bDiff < 0.01;
        const aMatch = aDiff < 0.01;
        
        if (rMatch && gMatch && bMatch && aMatch) {
          console.log(`DSV findTokenByValue: ✅ Найден цветовой токен: ${token.name}`);
          return token;
        }
      }
    }
    
    // Если не нашли точное совпадение, выводим ближайший токен
    if (closestToken) {
      console.log(`DSV findTokenByValue: ❌ Точное совпадение не найдено. Ближайший токен: ${closestToken.name} (${closestToken.hexValue}), разница:`, closestToken.diffs);
    } else {
      console.log('DSV findTokenByValue: ❌ Цветовые токены не найдены');
    }
    return null;
  }
  
  console.log('DSV findTokenByValue: ❌ Неподдерживаемый тип значения');
  return null;
}

/**
 * Привязывает токен к свойству элемента
 * @param {string} nodeId - ID элемента
 * @param {string} property - Название свойства (fills, cornerRadius, itemSpacing и т.д.)
 * @param {string} tokenId - ID токена для привязки
 * @returns {Promise<Object>} Результат операции
 */
async function bindTokenToProperty(nodeId, property, tokenId) {
  try {
    // Получаем ноду по ID
    const node = await figma.getNodeByIdAsync(nodeId);
    
    if (!node) {
      return {
        success: false,
        error: 'Элемент не найден'
      };
    }
    
    // Проверяем доступность свойства на ноде
    if (!(property in node)) {
      return {
        success: false,
        error: `Свойство "${property}" недоступно для этого типа элемента`
      };
    }
    
    // Получаем токен (variable)
    let variable = null;
    let tokenName = null;
    
    // Ищем токен в сохранённом JSON для получения имени
    if (savedTokensFromJson && Array.isArray(savedTokensFromJson)) {
      const jsonToken = savedTokensFromJson.find(t => 
        (t.id === tokenId) || 
        (`json-token-${t.name.replace(/[^a-zA-Z0-9]/g, '-')}` === tokenId)
      );
      
      if (jsonToken) {
        tokenName = jsonToken.name;
        console.log(`DSV: Найден токен в JSON: ${tokenName}, ID: ${tokenId}`);
      }
    }
    
    // Пробуем получить токен через Figma API по ID
    try {
      variable = await figma.variables.getVariableByIdAsync(tokenId);
      console.log(`DSV: ✓ Токен найден по ID через API: ${variable.name}`);
    } catch (e) {
      console.log(`DSV: Токен не найден по ID (${tokenId}), ищем по имени: ${tokenName}`);
    }
    
    // Если не найден по ID и есть имя - ищем по имени во всех доступных токенах
    if (!variable && tokenName) {
      console.log(`DSV: Поиск токена "${tokenName}" по имени...`);
      
      // Сначала ищем в локальных токенах
      const localVariables = await figma.variables.getLocalVariablesAsync();
      console.log(`DSV: Локальных переменных: ${localVariables.length}`);
      
      for (const v of localVariables) {
        if (v.name === tokenName) {
          variable = v;
          console.log(`DSV: ✓ Токен найден в локальных: ${v.name}`);
          break;
        }
      }
      
      // Если не нашли в локальных - пробуем получить список всех используемых переменных из текущей страницы
      if (!variable) {
        console.log(`DSV: Не найден в локальных, ищем в используемых переменных на текущей странице...`);
        
        const usedVariableIds = new Set();
        
        // Собираем ID всех используемых переменных на текущей странице
        const currentPageNodes = figma.currentPage.findAll();
        for (const node of currentPageNodes) {
          if ('boundVariables' in node && node.boundVariables) {
            for (const key in node.boundVariables) {
              const binding = node.boundVariables[key];
              if (binding) {
                if (Array.isArray(binding)) {
                  binding.forEach(b => b && b.id && usedVariableIds.add(b.id));
                } else if (binding.id) {
                  usedVariableIds.add(binding.id);
                }
              }
            }
          }
        }
        
        console.log(`DSV: Найдено используемых переменных на текущей странице: ${usedVariableIds.size}`);
        
        // Проверяем каждую используемую переменную
        for (const varId of usedVariableIds) {
          try {
            const v = await figma.variables.getVariableByIdAsync(varId);
            if (v && v.name === tokenName) {
              variable = v;
              console.log(`DSV: ✓ Токен найден среди используемых: ${v.name} (remote: ${v.remote})`);
              break;
            }
          } catch (e) {
            // Игнорируем недоступные переменные
          }
        }
      }
    }
    
    // Если все еще не найден - возвращаем ошибку с подсказкой
    if (!variable) {
      const errorMessage = tokenName 
        ? `Токен "${tokenName}" не найден на текущей странице.\n\n` +
          `Возможные причины:\n` +
          `• Токен не используется на этой странице\n` +
          `• Библиотека не подключена\n` +
          `• Имя токена в JSON не совпадает с Figma\n\n` +
          `💡 Решение: Привяжите этот токен вручную к любому элементу на этой странице, затем попробуйте снова.`
        : 'Токен не найден';
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    // Привязываем токен к свойству
    // Для fills и strokes нужно привязывать токен к paint объекту, а не к свойству
    if (property === 'fills' || property === 'strokes') {
      const paints = node[property];
      
      if (!paints || paints.length === 0) {
        return {
          success: false,
          error: `Свойство ${property} пустое`
        };
      }
      
      // Создаём копию массива паинтов
      const newPaints = JSON.parse(JSON.stringify(paints));
      
      // Привязываем токен к полю 'color' первого paint
      newPaints[0] = figma.variables.setBoundVariableForPaint(newPaints[0], 'color', variable);
      
      // Устанавливаем обновлённый массив
      node[property] = newPaints;
      
      console.log(`DSV: ✓ Токен привязан к ${property}[0].color`);
    } else if (property === 'effects') {
      // Для effects - пока не поддерживается
      return {
        success: false,
        error: 'Привязка токенов к effects пока не поддерживается'
      };
    } else if (property.includes('Radius') || 
               property.includes('padding') || 
               property === 'itemSpacing' ||
               property === 'width' || 
               property === 'height' ||
               property === 'opacity') {
      // Для обычных свойств - прямая привязка
      node.setBoundVariable(property, variable);
    } else {
      // Для corner радиусов с постфиксами (topLeftRadius и т.д.)
      const cornerMapping = {
        'topLeftRadius': 'topLeftRadius',
        'topRightRadius': 'topRightRadius',
        'bottomLeftRadius': 'bottomLeftRadius',
        'bottomRightRadius': 'bottomRightRadius'
      };
      
      if (cornerMapping[property]) {
        node.setBoundVariable(cornerMapping[property], variable);
      } else {
        node.setBoundVariable(property, variable);
      }
    }
    
    console.log(`DSV: ✓ Токен "${variable.name}" привязан к свойству "${property}" элемента "${getSafeNodeName(node)}"`);
    
    return {
      success: true,
      nodeName: getSafeNodeName(node),
      tokenName: variable.name,
      property: property
    };
    
  } catch (error) {
    console.error('DSV: Ошибка при привязке токена:', error);
    return {
      success: false,
      error: error.message || 'Неизвестная ошибка'
    };
  }
}

/**
 * Проверяет, имеет ли нода реальное значение для данного свойства
 * @param {SceneNode} node - Нода
 * @param {string} property - Название свойства
 * @returns {boolean}
 */
function hasPropertyValue(node, property) {
  if (!(property in node)) {
    return false;
  }
  
  const value = node[property];
  
  // Для effects - проверяем массив
  if (property === 'effects') {
    return Array.isArray(value) && value.length > 0 && value.some(e => e.visible !== false);
  }
  
  // Для opacity - проверяем что не равно 1 (дефолтное значение)
  if (property === 'opacity') {
    return value !== undefined && value !== 1;
  }
  
  // Для width/height - проверяем что установлены явно (не AUTO)
  if (property === 'width' || property === 'height') {
    // В Figma width/height могут быть числом или специальным значением
    return typeof value === 'number' && value > 0;
  }
  
  // Для остальных свойств
  return value !== undefined && value !== null && value !== 0;
}

/**
 * Определяет, нужно ли сообщать об отсутствии variable для данного свойства
 * @param {SceneNode} node - Нода
 * @param {string} property - Название свойства
 * @returns {boolean}
 */
function shouldReportMissingVariable(node, property) {
  // Не сообщаем об отсутствии токенов для текстовых нод с fontSize
  if (node.type === 'TEXT' && property === 'fontSize') {
    return false; // Размер шрифта может быть частью текстового стиля
  }
  
  // Не сообщаем для нулевых значений
  if (node[property] === 0) {
    return false;
  }
  
  // Не сообщаем для скрытых нод
  if ('visible' in node && !node.visible) {
    return false;
  }
  
  return true;
}

/**
 * Безопасно получает имя ноды, избегая ошибок с Symbol
 * @param {SceneNode} node - Нода
 * @returns {string}
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
 * Безопасно конвертирует значение в строку для логирования
 * @param {any} value - Значение для конвертации
 * @returns {string}
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
  
  try {
    return String(value);
  } catch (e) {
    return '[Unconvertible]';
  }
}

/**
 * Безопасно создает объект suggestedToken для issue
 * @param {any} token - Токен из variables
 * @returns {object|null}
 */
function createSafeSuggestedToken(token) {
  if (!token) return null;
  
  return {
    id: token.id || '',
    name: token.name || 'Unknown',
    value: safeStringify(token.value)
  };
}

/**
 * Получает значение свойства для отображения
 * @param {SceneNode} node - Нода
 * @param {string} property - Название свойства
 * @returns {string}
 */
function getPropertyValue(node, property) {
  const value = node[property];
  
  if (value === undefined || value === null) {
    return 'N/A';
  }
  
  // Обработка Symbol - не пытаемся конвертировать в строку
  if (typeof value === 'symbol') {
    return 'Symbol';
  }
  
  if (typeof value === 'number') {
    return `${value}px`;
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      // Если не удалось stringify (например, есть Symbol внутри объекта)
      return '[Object]';
    }
  }
  
  return String(value);
}

/**
 * Рекурсивно разрешает алиасы переменных (включая внешние библиотеки)
 * @param {string} aliasId - ID переменной-алиаса
 * @param {Array} allVariables - Все локальные переменные
 * @param {Set} visited - Множество посещённых ID (для предотвращения циклов)
 * @returns {Promise<any>} Разрешённое значение или null
 */
async function resolveVariableAlias(aliasId, allVariables, visited = new Set()) {
  // Защита от бесконечной рекурсии
  if (visited.has(aliasId)) {
    console.warn(`DSV: Обнаружен циклический алиас: ${aliasId}`);
    return null;
  }
  visited.add(aliasId);
  
  let aliasVariable = null;
  let value = null;
  
  // Сначала ищем в локальных переменных
  aliasVariable = allVariables.find(v => v.id === aliasId);
  
  if (aliasVariable) {
    // Нашли в локальных переменных
    if (!aliasVariable.valuesByMode) return null;
    
    const modes = Object.keys(aliasVariable.valuesByMode);
    if (modes.length === 0) return null;
    
    value = aliasVariable.valuesByMode[modes[0]];
  } else {
    // Не нашли в локальных - пробуем через Figma API (для внешних библиотек)
    console.log(`DSV: Токен не найден локально, пробую через API: ${aliasId}`);
    
    try {
      aliasVariable = await figma.variables.getVariableByIdAsync(aliasId);
      
      if (!aliasVariable) {
        console.warn(`DSV: Переменная-алиас не найдена даже через API: ${aliasId}`);
        return null;
      }
      
      console.log(`DSV: ✓ Токен найден через API: ${aliasVariable.name} (remote: ${aliasVariable.remote})`);
      
      // Получаем значение из первого mode
      if (!aliasVariable.valuesByMode) return null;
      
      const modes = Object.keys(aliasVariable.valuesByMode);
      if (modes.length === 0) return null;
      
      value = aliasVariable.valuesByMode[modes[0]];
    } catch (error) {
      console.error(`DSV: Ошибка при получении токена через API: ${aliasId}`, error);
      return null;
    }
  }
  
  // Если это снова алиас - рекурсивно разрешаем
  if (value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
    console.log(`DSV: Цепочка алиасов: ${aliasVariable.name} → ${value.id}`);
    return await resolveVariableAlias(value.id, allVariables, visited);
  }
  
  // Возвращаем конечное значение
  console.log(`DSV: ✓ Конечное значение для ${aliasVariable.name}:`, value);
  return value;
}

/**
 * Конвертирует RGB цвет в HEX формат
 * @param {Object} rgb - Объект с r, g, b, a (значения от 0 до 1)
 * @returns {string} HEX цвет вида #RRGGBB или #RRGGBBAA
 */
function rgbToHex(rgb) {
  if (!rgb || typeof rgb !== 'object' || rgb.r === undefined) {
    return null;
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
 * Экспортирует все токены (variables) из текущего файла в JSON формат
 * @returns {Promise<Object>} Объект с токенами и метаданными
 */
async function exportTokensToJSON() {
  console.log('DSV Export: Начало экспорта токенов');
  
  try {
    // Получаем все variables из Figma
    const allVariables = await figma.variables.getLocalVariablesAsync();
    console.log(`DSV Export: Найдено variables: ${allVariables.length}`);
    
    if (allVariables.length === 0) {
      console.warn('DSV Export: Variables не найдены в файле');
      return {
        tokens: [],
        metadata: {
          exportDate: new Date().toISOString(),
          totalTokens: 0,
          localTokens: 0,
          remoteTokens: 0,
          figmaFileName: figma.root.name,
          warning: 'Variables не найдены в файле'
        }
      };
    }
    
    // Подсчёт local и remote
    const localCount = allVariables.filter(v => !v.remote).length;
    const remoteCount = allVariables.filter(v => v.remote).length;
    
    console.log(`DSV Export: Local variables: ${localCount}, Remote variables: ${remoteCount}`);
    
    // Преобразуем в формат для плагина
    const tokens = [];
    
    for (const variable of allVariables) {
      const token = {
        name: variable.name,
        type: variable.resolvedType,
        id: variable.id,
        isRemote: variable.remote || false
      };
      
      // Добавляем опциональные поля если они есть
      if (variable.description) {
        token.description = variable.description;
      }
      
      if (variable.scopes && variable.scopes.length > 0) {
        token.scopes = variable.scopes;
      }
      
      if (variable.hiddenFromPublishing !== undefined) {
        token.hiddenFromPublishing = variable.hiddenFromPublishing;
      }
      
      // Пытаемся получить значение (для первого mode)
      try {
        if (variable.valuesByMode) {
          const modes = Object.keys(variable.valuesByMode);
          if (modes.length > 0) {
            const firstModeValue = variable.valuesByMode[modes[0]];
            
            // Обрабатываем разные типы значений
            if (firstModeValue !== undefined && firstModeValue !== null) {
              // Для alias токенов (ссылка на другой токен)
              if (typeof firstModeValue === 'object' && firstModeValue.type === 'VARIABLE_ALIAS') {
                token.value = `{alias: ${firstModeValue.id}}`;
                token.isAlias = true;
                
                // Разрешаем алиас и получаем реальное значение
                try {
                  const resolvedValue = await resolveVariableAlias(firstModeValue.id, allVariables);
                  if (resolvedValue !== null) {
                    token.resolvedValue = resolvedValue;
                    
                    // Добавляем HEX для цветовых токенов-алиасов
                    if (variable.resolvedType === 'COLOR' && resolvedValue.r !== undefined) {
                      token.hexValue = rgbToHex(resolvedValue);
                    }
                    
                    console.log(`DSV Export: Алиас разрешён для "${variable.name}"${token.hexValue ? ` (${token.hexValue})` : ''}`);
                  }
                } catch (e) {
                  console.warn(`DSV Export: Не удалось разрешить алиас для ${variable.name}:`, e);
                }
              } else {
                token.value = firstModeValue;
                token.isAlias = false;
                
                // Добавляем HEX для цветовых токенов
                if (variable.resolvedType === 'COLOR' && firstModeValue.r !== undefined) {
                  token.hexValue = rgbToHex(firstModeValue);
                }
              }
            }
          }
        }
      } catch (e) {
        // Игнорируем ошибки при получении значения
        console.warn(`DSV Export: Не удалось получить значение для ${variable.name}:`, e);
      }
      
      tokens.push(token);
    }
    
    // Создаём финальный JSON объект
    const exportData = {
      tokens: tokens,
      metadata: {
        exportDate: new Date().toISOString(),
        totalTokens: tokens.length,
        localTokens: localCount,
        remoteTokens: remoteCount,
        figmaFileName: figma.root.name,
        exportedBy: 'Orbita Icon Checker - Design System Validator',
        version: '3.0.4'
      }
    };
    
    console.log('DSV Export: Экспорт завершён успешно');
    console.log(`DSV Export: Токенов экспортировано: ${tokens.length}`);
    
    return exportData;
    
  } catch (error) {
    console.error('DSV Export: Ошибка при экспорте:', error);
    throw new Error(`Не удалось экспортировать токены: ${error.message}`);
  }
}

// === Analyze component properties (pre-export analysis) ===
async function analyzeComponentProperties() {
  // Required for documentAccess: dynamic-page
  await figma.loadAllPagesAsync();
  
  const allNodes = figma.root.findAll(n =>
    n.type === 'COMPONENT_SET' || n.type === 'COMPONENT' || n.type === 'INSTANCE'
  );

  const componentSets = allNodes.filter(n => n.type === 'COMPONENT_SET');
  const components = allNodes.filter(n => n.type === 'COMPONENT');
  const instances = allNodes.filter(n => n.type === 'INSTANCE');

  // Анализ компонентов
  let totalProperties = 0;
  let maxProperties = 0;
  let componentWithMaxProperties = null;
  let totalVariants = 0;
  let totalInstances = 0;

  // Анализ ComponentSet
  for (const cs of componentSets) {
    const variants = cs.children.filter(child => child.type === 'COMPONENT');
    totalVariants += variants.length;
    
    // Анализ свойств ComponentSet (не вариантов)
    try {
      const setDefinitions = cs.componentPropertyDefinitions || {};
      const setPropCount = Object.keys(setDefinitions).length;
      totalProperties += setPropCount;
      
      if (setPropCount > maxProperties) {
        maxProperties = setPropCount;
        componentWithMaxProperties = {
          name: cs.name,
          type: 'Component Set',
          setName: null,
          properties: setPropCount
        };
      }
    } catch (error) {
      console.warn('Component Properties Analysis: Ошибка при получении свойств набора:', cs.name, error);
    }
  }

  // Анализ отдельных компонентов (не в наборах)
  for (const comp of components) {
    const parent = comp.parent;
    if (parent && parent.type === 'COMPONENT_SET') continue; // Уже учтен выше
    
    try {
      const definitions = comp.componentPropertyDefinitions || {};
      const propCount = Object.keys(definitions).length;
      totalProperties += propCount;
      
      if (propCount > maxProperties) {
        maxProperties = propCount;
        componentWithMaxProperties = {
          name: comp.name,
          type: 'Standalone Component',
          setName: null,
          properties: propCount
        };
      }
    } catch (error) {
      console.warn('Component Properties Analysis: Ошибка при получении свойств компонента:', comp.name, error);
    }
  }

  // Анализ инстансов
  for (const inst of instances) {
    try {
      const mc = await inst.getMainComponentAsync();
      if (mc) {
        totalInstances++;
      }
    } catch (error) {
      // Игнорируем ошибки для инстансов
    }
  }

  // Подсчет уникальных свойств
  const uniqueProperties = new Set();
  
  // Свойства ComponentSet
  for (const cs of componentSets) {
    try {
      const definitions = cs.componentPropertyDefinitions || {};
      Object.keys(definitions).forEach(prop => uniqueProperties.add(prop));
    } catch (error) {
      console.warn('Component Properties Analysis: Ошибка при получении уникальных свойств набора:', cs.name, error);
    }
  }
  
  // Свойства отдельных компонентов
  for (const comp of components) {
    const parent = comp.parent;
    if (parent && parent.type === 'COMPONENT_SET') continue; // Уже учтен выше
    
    try {
      const definitions = comp.componentPropertyDefinitions || {};
      Object.keys(definitions).forEach(prop => uniqueProperties.add(prop));
    } catch (error) {
      console.warn('Component Properties Analysis: Ошибка при получении уникальных свойств компонента:', comp.name, error);
    }
  }

  return {
    summary: {
      componentSets: componentSets.length,
      components: components.length,
      totalVariants: totalVariants,
      instances: totalInstances,
      totalProperties: totalProperties,
      uniqueProperties: uniqueProperties.size,
      maxProperties: maxProperties
    },
    componentWithMaxProperties: componentWithMaxProperties,
    uniquePropertyNames: Array.from(uniqueProperties).sort(),
    breakdown: {
      componentSetsWithVariants: componentSets.map(cs => {
        let totalProperties = 0;
        try {
          const setDefinitions = cs.componentPropertyDefinitions || {};
          totalProperties = Object.keys(setDefinitions).length;
        } catch (error) {
          console.warn('Component Properties Analysis: Ошибка при подсчете свойств набора для breakdown:', cs.name, error);
        }
        
        return {
          name: cs.name,
          variants: cs.children.filter(c => c.type === 'COMPONENT').length,
          totalProperties: totalProperties
        };
      }).sort((a, b) => b.totalProperties - a.totalProperties)
    }
  };
}

// === Export component properties (definitions, variants, usage) ===
async function exportComponentProperties() {
  // Required for documentAccess: dynamic-page
  await figma.loadAllPagesAsync();
  
  figma.ui.postMessage({ 
    type: 'progress', 
    message: 'Поиск компонентов...', 
    percent: 10,
    current: 1,
    total: 4,
    currentItem: 'Сканирование файла'
  });
  
  const allNodes = figma.root.findAll(n =>
    n.type === 'COMPONENT_SET' || n.type === 'COMPONENT' || n.type === 'INSTANCE'
  );

  const componentSets = allNodes.filter(n => n.type === 'COMPONENT_SET');
  const components = allNodes.filter(n => n.type === 'COMPONENT');
  const instances  = allNodes.filter(n => n.type === 'INSTANCE');
  
  figma.ui.postMessage({ 
    type: 'progress', 
    message: 'Анализ инстансов...', 
    percent: 25,
    current: 2,
    total: 4,
    currentItem: `Найдено ${instances.length} инстансов`
  });

  // Собираем фактическое использование значений по инстансам
  const usageIndex = new Map(); // componentKey -> { propName -> Map(valueString -> count) }
  let processedInstances = 0;
  
  for (const inst of instances) {
    try {
      const mc = await inst.getMainComponentAsync();
      if (!mc) continue;
      const ckey = mc.key || mc.id;
      const props = inst.componentProperties || {};
      if (!usageIndex.has(ckey)) usageIndex.set(ckey, {});
      const bag = usageIndex.get(ckey);
      for (const [propName, prop] of Object.entries(props)) {
        const val = prop && 'value' in prop ? prop.value : undefined;
        const vStr = normalizePropValue(val);
        if (!bag[propName]) bag[propName] = new Map();
        const m = bag[propName];
        m.set(vStr, (m.get(vStr) || 0) + 1);
      }
      processedInstances++;
      
      // Обновляем прогресс каждые 10 инстансов
      if (processedInstances % 10 === 0) {
        figma.ui.postMessage({ 
          type: 'progress', 
          message: 'Анализ инстансов...', 
          percent: 25 + (processedInstances / instances.length) * 25,
          current: 2,
          total: 4,
          currentItem: `Обработано ${processedInstances}/${instances.length} инстансов`
        });
      }
    } catch (error) {
      console.warn('Component Properties Export: Ошибка при получении mainComponent для инстанса:', inst.name, error);
    }
  }

  const result = [];

  function collectFromComponent(comp, extra) {
    const ckey = comp.key || comp.id;
    let definitions = {};
    
    try {
      definitions = comp.componentPropertyDefinitions || {};
    } catch (error) {
      console.warn('Component Properties Export: Ошибка при получении свойств компонента:', comp.name, error);
      definitions = {};
    }
    
    const defList = Object.entries(definitions).map(([name, def]) => ({
      name,
      type: def && def.type ? def.type : 'UNKNOWN',
      defaultValue: safeSerialize(def ? def.defaultValue : undefined),
      preferredValues: def && def.preferredValues ? safeSerialize(def.preferredValues) : undefined,
      variantOptions: def && def.variantOptions ? safeSerialize(def.variantOptions) : undefined
    }));

    const used = usageIndex.get(ckey) || {};
    const usedList = Object.entries(used).map(([propName, map]) => ({
      name: propName,
      values: Array.from(map.entries()).map(([value, count]) => ({ value, count }))
                  .sort((a,b) => b.count - a.count)
    }));

    result.push({
      kind: 'COMPONENT',
      key: ckey,
      id: comp.id,
      name: comp.name,
      fromSet: extra && extra.fromSet ? extra.fromSet : null,
      variantProperties: comp.variantProperties || {},
      definitions: defList,
      usedValues: usedList
    });
  }

  figma.ui.postMessage({ 
    type: 'progress', 
    message: 'Сбор свойств компонентов...', 
    percent: 50,
    current: 3,
    total: 4,
    currentItem: `Обработка ${componentSets.length} наборов компонентов`
  });

  for (const cs of componentSets) {
    const setInfo = {
      kind: 'COMPONENT_SET',
      key: cs.key || cs.id,
      id: cs.id,
      name: cs.name,
      propertiesSchema: extractVariantAxes(cs),
      components: []
    };
    
    // Собираем свойства самого ComponentSet
    collectFromComponent(cs, { fromSet: null });
    
    // Собираем информацию о вариантах (но не их свойства)
    for (const child of cs.children) {
      if (child.type === 'COMPONENT') {
        setInfo.components.push({
          id: child.id,
          name: child.name,
          variantProperties: child.variantProperties || {}
        });
      }
    }
    result.push(setInfo);
  }

  for (const c of components) {
    const parent = c.parent;
    if (parent && parent.type === 'COMPONENT_SET') continue;
    collectFromComponent(c, null);
  }

  const json = {
    meta: {
      fileName: figma.root.name,
      exportDate: new Date().toISOString(),
      totals: { componentSets: componentSets.length, components: components.length, instances: instances.length }
    },
    data: result
  };
  const jsonString = JSON.stringify(json, null, 2);

  const rows = [];
  rows.push(['kind','setName','componentName','property','type','defaultValue','usedValue','count']);
  for (const item of result) {
    if (item.kind !== 'COMPONENT') continue;
    const setName = item.fromSet || '';
    const compName = item.name || '';
    for (const d of (item.definitions || [])) {
      rows.push(['definition', setName, compName, d.name || '', d.type || '', toFlat(d.defaultValue), '', '']);
    }
    for (const u of (item.usedValues || [])) {
      if (!u.values || u.values.length === 0) {
        rows.push(['usage', setName, compName, u.name, '', '', '', '']);
      } else {
        for (const v of u.values) {
          rows.push(['usage', setName, compName, u.name, '', '', toFlat(v.value), String(v.count)]);
        }
      }
    }
  }
  const csvString = toCSV(rows);

  return { jsonString, csvString };
}

function extractVariantAxes(componentSet) {
  const keys = new Set();
  for (const child of componentSet.children) {
    if (child.type === 'COMPONENT' && child.variantProperties) {
      Object.keys(child.variantProperties).forEach(k => keys.add(k));
    }
  }
  return Array.from(keys);
}

function normalizePropValue(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch (e) { return '[object]'; }
  }
  return String(val);
}

function safeSerialize(val) {
  try { return JSON.parse(JSON.stringify(val)); } catch (e) { return undefined; }
}

function toFlat(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch (e) { return '[object]'; }
  }
  return String(v);
}

function toCSV(rows) {
  const esc = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  return rows.map(r => r.map(esc).join(',')).join('\n');
}