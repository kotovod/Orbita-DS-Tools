/**
 * Обработчики общих сообщений
 */

const { debugLog } = require('./common/debug');

/**
 * Обработчик: Фокус на ноде
 */
async function handleFocusNode(msg) {
  try {
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
      message: `Ошибка при переходе к элементу: ${error.message}`
    });
  }
}

/**
 * Обработчик: Восстановление выделения
 */
async function handleRestoreSelection(msg) {
  try {
    const nodes = [];
    for (const nodeId of msg.nodeIds) {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (node) {
        nodes.push(node);
      }
    }
    
    if (nodes.length > 0) {
      figma.currentPage.selection = nodes;
      figma.viewport.scrollAndZoomIntoView(nodes);
    }
  } catch (error) {
    console.error('Ошибка при восстановлении выделения:', error);
  }
}

/**
 * Обработчик: Получение ID выделенной ноды
 */
async function handleGetSelectedNodeId(msg) {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'selected-node-id',
      nodeId: null,
      nodeName: null,
      nodeType: null,
      message: 'Ничего не выбрано'
    });
    return;
  }
  
  const node = selection[0];
  figma.ui.postMessage({
    type: 'selected-node-id',
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type
  });
}

/**
 * Обработчик: Закрытие плагина
 */
async function handleClosePlugin(msg) {
  debugLog('Закрытие плагина');
  figma.closePlugin();
}

module.exports = {
  handleFocusNode,
  handleRestoreSelection,
  handleGetSelectedNodeId,
  handleClosePlugin
};

