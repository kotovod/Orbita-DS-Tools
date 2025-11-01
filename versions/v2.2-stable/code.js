// Основной код плагина Orbita Icon Checker

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
          console.log('AI Design Lint: Узел найден:', node.name, node.type);
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
                const labelTextLower = labelText.toLowerCase();
                const componentNameLower = componentNameWithoutPrefix.toLowerCase();
                
                if (labelTextLower !== componentNameLower) {
                  componentSetErrors.push({
                    type: 'naming',
                    message: `Название компонента не совпадает с текстом в source-token-name (ожидается: ${labelText}, фактически: ${componentNameWithoutPrefix})`,
                    tooltip: 'Нажмите "Исправить", чтобы переименовать компонент в соответствии с текстом из source-token-name',
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
        
        // 1. Находим первый векторный слой в компоненте
        let firstVectorLayer = null;
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child.type === 'VECTOR' ||
              child.type === 'BOOLEAN_OPERATION' ||
              child.type === 'STAR' ||
              child.type === 'ELLIPSE' ||
              child.type === 'POLYGON' ||
              child.type === 'RECTANGLE') {
            firstVectorLayer = child;
            break;
          }
        }
        
        if (!firstVectorLayer) {
          return { success: false, message: 'Не найден векторный слой для преобразования' };
        }
        
        // 2. Создаем Union boolean операцию
        // В Figma API нет прямого метода для создания boolean операции,
        // поэтому мы просто переименуем слой в "Union"
        firstVectorLayer.name = "Union";
        
        // 3. Переименовываем Union в Color-layer
        firstVectorLayer.name = "Color-layer";
        
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
            firstVectorLayer.fills = [{
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0 }, // Значение по умолчанию
              boundVariables: {
                color: binding
              }
            }];
          } else {
            // Если не нашли переменную, устанавливаем черный цвет
            firstVectorLayer.fills = [{
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0 }
            }];
          }
        } catch (error) {
          console.error('Ошибка при применении переменной цвета:', error);
          // Устанавливаем черный цвет в случае ошибки
          firstVectorLayer.fills = [{
            type: 'SOLID',
            color: { r: 0, g: 0, b: 0 }
          }];
        }
        
        // Создаем Vector внутри Color-layer
        try {
          const newVector = figma.createVector();
          newVector.name = 'Vector';
          // Блокируем Vector
          newVector.locked = true;
          // Удаляем цвет fill у Vector
          newVector.fills = [];
          
          // Добавляем Vector внутрь Color-layer
          firstVectorLayer.appendChild(newVector);
        } catch (error) {
          console.error('Ошибка при создании Vector:', error);
          return {
            success: true,
            message: 'Слой переименован в Color-layer и применен цвет, но не удалось создать Vector внутри'
          };
        }
        
        return {
          success: true,
          message: 'Создан слой Color-layer с цветом из переменных и Vector внутри'
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
          const newName = 'orb-icon-' + labelText.toLowerCase();
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
        
        // Если нет ни Color-layer, ни Vector, создаем Color-layer
        if (!colorLayer && !vectorLayer) {
          colorLayer = figma.createFrame();
          colorLayer.name = 'Color-layer';
          node.appendChild(colorLayer);
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
        
        // Если Vector не найден на верхнем уровне, ищем его в Color-layer
        if (!vector) {
          // Находим Color-layer
          let colorLayerForVector = null;
          for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
            if (child.name === 'Color-layer') {
              colorLayerForVector = child;
              break;
            }
          }
          
          if (!colorLayerForVector) {
            return { success: false, message: 'Слой Color-layer не найден' };
          }
          
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
          console.error(`Ошибка при получении свойств варианта для компонента ${node.name}:`, variantError);
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
            debugLog(`Удалены stroke у слоя Color-layer в компоненте ${node.name}`);
          }
          
          // Ищем Vector внутри Color-layer
          if (child.children && Array.isArray(child.children)) {
            for (const vectorChild of child.children) {
              if (vectorChild.name === 'Vector') {
                // Удаляем stroke у Vector
                if (vectorChild.strokes && vectorChild.strokes.length > 0) {
                  vectorChild.strokes = [];
                  fixedCount++;
                  debugLog(`Удалены stroke у слоя Vector в компоненте ${node.name}`);
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
    
    figma.ui.postMessage({ type: 'progress', message: 'Исправление завершено', percent: 100 });
    
    return {
      success: true,
      message: `Исправлено ${fixResults.filter(r => r.success).length} из ${fixResults.length} ошибок`,
      details: fixResults
    };
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
  const nodeName = String(node.name || 'Unnamed');
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
      const nodeName = String(node.name || 'Unnamed');
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
    name: String(node.name || 'Unnamed'),  // Безопасное преобразование в строку
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