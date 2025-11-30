/**
 * Скрипт сборки плагина с помощью esbuild
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Проверяем флаг watch
const isWatch = process.argv.includes('--watch');

// Конфигурация сборки
const buildConfig = {
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'code.js',
  platform: 'node',
  target: 'es2017',
  format: 'cjs',
  logLevel: 'info',
  sourcemap: false,
  minify: false, // Оставляем читаемым для отладки
  define: {
    'process.env.NODE_ENV': '"production"'
  }
};

async function build() {
  try {
    console.log('🔨 Начинаем сборку плагина...');
    
    if (isWatch) {
      // Режим watch для разработки
      const context = await esbuild.context(buildConfig);
      await context.watch();
      console.log('👀 Режим watch активен. Изменения отслеживаются...');
    } else {
      // Одноразовая сборка
      await esbuild.build(buildConfig);
      console.log('✅ Сборка завершена успешно!');
      
      // Показываем размер файла
      const stats = fs.statSync('code.js');
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`📦 Размер: ${sizeMB} MB`);
    }
  } catch (error) {
    console.error('❌ Ошибка сборки:', error);
    process.exit(1);
  }
}

build();

