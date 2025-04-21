import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Функция для получения размера директории
async function getDirSize(dirPath) {
  let totalSize = 0;
  
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      totalSize += await getDirSize(filePath);
    } else {
      totalSize += stats.size;
    }
  }
  
  return totalSize;
}

// Функция для анализа CSS файлов
async function analyzeCssFiles(dirPath) {
  let cssSize = 0;
  
  const processDir = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        processDir(filePath);
      } else if (path.extname(file) === '.css') {
        cssSize += stats.size;
        console.log(`CSS file: ${filePath}, Size: ${formatBytes(stats.size)}`);
      }
    }
  };
  
  processDir(dirPath);
  
  return cssSize;
}

// Основная функция
async function main() {
  console.log('Analyzing CSS files in dist directory...');
  
  const distPath = path.join(__dirname, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.error('Dist directory not found. Run a build first.');
    return;
  }
  
  const totalDistSize = await getDirSize(distPath);
  console.log(`Total dist size: ${formatBytes(totalDistSize)}`);
  
  const cssSize = await analyzeCssFiles(distPath);
  console.log(`Total CSS size: ${formatBytes(cssSize)}`);
  console.log(`CSS percentage of total bundle: ${((cssSize / totalDistSize) * 100).toFixed(2)}%`);
}

main().catch(console.error); 