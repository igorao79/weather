import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.scss';
import App from './App';

// Полифилл для геолокации для улучшения совместимости с разными браузерами и WebView
if (navigator.geolocation) {
  const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
  
  // Переопределяем метод getCurrentPosition для лучшей обработки ошибок
  navigator.geolocation.getCurrentPosition = function(success, error, options) {
    // Устанавливаем дефолтные опции если не указаны
    const enhancedOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    };
    
    // Запускаем запрос геолокации с улучшенной обработкой ошибок
    return originalGetCurrentPosition.call(
      navigator.geolocation,
      (position) => {
        if (typeof success === 'function') {
          success(position);
        }
      },
      (err) => {
        console.log('Geolocation error:', err);
        if (typeof error === 'function') {
          error(err);
        }
      },
      enhancedOptions
    );
  };
}

// Определяем корневой элемент
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Рендерим приложение
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 