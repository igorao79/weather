import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

try {
  // Находим CSS файл
  console.log('Поиск CSS файлов...');
  const cssDir = path.join(__dirname, 'dist', 'assets', 'css');
  const cssFiles = fs.readdirSync(cssDir).filter(file => file.startsWith('index-') && file.endsWith('.css'));
  
  if (cssFiles.length === 0) {
    console.error('CSS файл не найден');
    process.exit(1);
  }
  
  const cssFile = path.join(cssDir, cssFiles[0]);
  const originalSize = fs.statSync(cssFile).size;
  console.log(`Найден CSS файл: ${cssFile}`);
  console.log(`Оригинальный размер CSS: ${formatBytes(originalSize)}`);
  
  // Вручную извлекаем CSS код и обрабатываем
  console.log('Чтение содержимого CSS...');
  const cssContent = fs.readFileSync(cssFile, 'utf-8');
  
  // Создаем временный файл с результатами
  const purgedFilePath = cssFile.replace('.css', '.purged.css');
  
  // Ручная оптимизация CSS (удаляем пустые пространства и комментарии)
  console.log('Выполняем минимальную оптимизацию CSS...');
  const optimizedCss = cssContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Удаляем CSS комментарии
    .replace(/\s+/g, ' ')            // Сжимаем пробелы
    .replace(/\s*{\s*/g, '{')        // Удаляем пробелы вокруг открывающих скобок
    .replace(/\s*}\s*/g, '}')        // Удаляем пробелы вокруг закрывающих скобок
    .replace(/\s*;\s*/g, ';')        // Удаляем пробелы вокруг точки с запятой
    .replace(/\s*:\s*/g, ':')        // Удаляем пробелы вокруг двоеточия
    .replace(/;\}/g, '}')            // Удаляем ненужные точки с запятой перед закрывающей скобкой
    .trim();                         // Удаляем пробелы в начале и конце
  
  // Записываем оптимизированный CSS
  fs.writeFileSync(purgedFilePath, optimizedCss);
  
  // Проверяем результат
  const purgedSize = fs.statSync(purgedFilePath).size;
  console.log(`Размер после минимальной оптимизации: ${formatBytes(purgedSize)}`);
  console.log(`Уменьшено на: ${formatBytes(originalSize - purgedSize)} (${((1 - purgedSize / originalSize) * 100).toFixed(2)}%)`);
  
  // Переименовываем оптимизированный файл, чтобы заменить оригинальный
  const backupPath = cssFile + '.backup';
  fs.renameSync(cssFile, backupPath);
  fs.renameSync(purgedFilePath, cssFile);
  console.log(`Оригинальный файл сохранен как ${backupPath}`);
  console.log(`Оптимизированный CSS установлен как ${cssFile}`);
  
  console.log('CSS оптимизация завершена успешно.');
} catch (error) {
  console.error('Ошибка при очистке CSS:', error);
  process.exit(1);
} 