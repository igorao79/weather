import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import '../styles/components/weather-card.scss';
import { WeatherData } from '../types';

// Кэширование URL для иконок
const iconUrlCache = new Map<string, string>();
const getIconUrl = (iconCode: string, size: string = '@2x.png') => {
  const cacheKey = `${iconCode}${size}`;
  if (!iconUrlCache.has(cacheKey)) {
    iconUrlCache.set(cacheKey, `https://openweathermap.org/img/wn/${iconCode}${size}`);
  }
  return iconUrlCache.get(cacheKey) as string;
};

interface WeatherCardProps {
  weatherData: WeatherData;
  hourlyData?: HourlyWeatherItem[];
}

// Интерфейс для почасовых данных
interface HourlyWeatherItem {
  hour: number;
  temp: number;
  icon: string;
  description: string;
}

// Кэш для URL карт по координатам
const mapCache: Record<string, string> = {};

const WeatherCard: React.FC<WeatherCardProps> = ({ weatherData, hourlyData = [] }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState<boolean>(false);
  const [mapKey, setMapKey] = useState<string>('');
  
  // Сохраняем предыдущие координаты для проверки изменений
  const prevCoordsRef = useRef<{lat: number, lon: number} | null>(null);
  const isMobile = useRef<boolean>(window.innerWidth < 768);
  const timeInterval = useRef<NodeJS.Timeout | null>(null);

  // Мемоизируем температуру для предотвращения пересчетов
  const tempC = useMemo(() => 
    Math.round(weatherData.main.temp), 
    [weatherData.main.temp]
  );
  
  // Мемоизируем URL иконки погоды с кэшированием
  const iconUrl = useMemo(() => 
    getIconUrl(weatherData.weather[0].icon), 
    [weatherData.weather[0].icon]
  );

  // Обновление времени с учетом часового пояса города - оптимизированная версия
  useEffect(() => {
    const updateDateTime = () => {
      try {
        const now = new Date();
        
        // Смещение локального времени от UTC в минутах
        const localOffset = -now.getTimezoneOffset();
        
        // Смещение времени в городе от UTC в секундах
        const cityOffset = weatherData.timezone;
        
        // Разница между локальным временем и временем в городе в миллисекундах
        const offsetDiff = (cityOffset / 60 - localOffset) * 60 * 1000;
        
        // Время в указанном городе
        const cityTime = new Date(now.getTime() + offsetDiff);
        
        // Форматируем время
        const hours = cityTime.getHours().toString().padStart(2, '0');
        const minutes = cityTime.getMinutes().toString().padStart(2, '0');
        setCurrentTime(`${hours}:${minutes}`);
      } catch (error) {
        console.error('Ошибка при обновлении времени:', error);
        setCurrentTime('--:--');
      }
    };
    
    // Очищаем предыдущий интервал
    if (timeInterval.current) {
      clearInterval(timeInterval.current);
    }
    
    // Обновляем сразу и затем каждую минуту
    updateDateTime();
    timeInterval.current = setInterval(updateDateTime, 60000);
    
    return () => {
      if (timeInterval.current) {
        clearInterval(timeInterval.current);
        timeInterval.current = null;
      }
    };
  }, [weatherData.timezone]);

  // Загружаем карту города при изменении координат - с оптимизацией
  useEffect(() => {
    const loadCityMap = () => {
      try {
        setIsMapLoading(true);
        
        const { lat, lon } = weatherData.coord;
        
        // Создаем ключ для кэша, округляя координаты до 4 знаков
        const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
        setMapKey(cacheKey);
        
        // Проверяем, изменились ли координаты
        if (prevCoordsRef.current && 
            prevCoordsRef.current.lat === lat && 
            prevCoordsRef.current.lon === lon) {
          // Если координаты не изменились, просто завершаем загрузку
          setIsMapLoading(false);
          return;
        }
        
        // Обновляем ссылку на текущие координаты
        prevCoordsRef.current = { lat, lon };
        
        // Проверяем кэш
        if (mapCache[cacheKey]) {
          setMapUrl(mapCache[cacheKey]);
          setIsMapLoading(false);
          return;
        }
        
        // Создаем URL для OpenStreetMap (без маркера)
        // Формат: lon1,lat1,lon2,lat2
        const delta = isMobile.current ? 0.02 : 0.03; // Меньший масштаб для мобильных
        const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
        
        // URL без маркера, убираем параметр marker
        const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
        
        // Сохраняем в кэше
        mapCache[cacheKey] = embedUrl;
        setMapUrl(embedUrl);
      } catch (error) {
        console.error('Ошибка при загрузке карты города:', error);
        setMapUrl(null);
      } finally {
        setIsMapLoading(false);
      }
    };
    
    // Проверяем, что координаты города есть в данных
    if (weatherData.coord && weatherData.coord.lat && weatherData.coord.lon) {
      // Добавляем дебаунсинг для улучшения производительности
      const timeoutId = setTimeout(() => {
        loadCityMap();
      }, 200);
      
      return () => clearTimeout(timeoutId);
    } else {
      setMapUrl(null);
      setIsMapLoading(false);
    }
  }, [weatherData.coord]);

  // Проверяем тип устройства для оптимизации отображения
  useEffect(() => {
    const checkDeviceType = () => {
      isMobile.current = window.innerWidth < 768;
    };
    
    // Проверяем при загрузке
    checkDeviceType();
    
    // Добавляем дебаунсинг для предотвращения частых вызовов
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkDeviceType, 150);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Получаем дату в городе с учетом часового пояса - мемоизированная версия
  const formattedDate = useMemo(() => {
    try {
      const now = new Date();
      // Смещение локального времени от UTC в минутах
      const localOffset = -now.getTimezoneOffset();
      // Смещение времени в городе от UTC в секундах
      const cityOffset = weatherData.timezone;
      // Разница между локальным временем и временем в городе в миллисекундах
      const offsetDiff = (cityOffset / 60 - localOffset) * 60 * 1000;
      // Дата в указанном городе
      const cityDate = new Date(now.getTime() + offsetDiff);
      
      return cityDate.toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return '';
    }
  }, [weatherData.timezone]);
  
  // Получаем текущий час в городе с учетом часового пояса - мемоизированная версия
  const currentCityHour = useMemo(() => {
    const now = new Date();
    // Смещение локального времени от UTC в минутах
    const localOffset = -now.getTimezoneOffset();
    // Смещение времени в городе от UTC в секундах
    const cityOffset = weatherData.timezone;
    // Разница между локальным временем и временем в городе в миллисекундах
    const offsetDiff = (cityOffset / 60 - localOffset) * 60 * 1000;
    // Время в указанном городе
    const cityTime = new Date(now.getTime() + offsetDiff);
    return cityTime.getHours();
  }, [weatherData.timezone]);

  // Мемоизированная функция для получения почасового прогноза
  const getHourlyForecast = useCallback((currentHour: number, tempC: number, weatherIcon: string, description: string) => {
    // Рассчитываем количество оставшихся часов до конца дня
    const hoursRemaining = 24 - currentHour;
    const limit = isMobile.current ? Math.min(12, hoursRemaining) : hoursRemaining;
    
    // Создаем массив из оставшихся часов дня (с ограничением для мобильных)
    return Array.from({ length: limit }).map((_, index) => {
      const hour = currentHour + index;
      // Небольшие колебания температуры с течением дня
      const tempAdjustment = Math.sin(hour / 12 * Math.PI) * 2;
      
      // Генерируем разные иконки в зависимости от времени суток
      let hourIcon = weatherIcon;
      
      // Меняем иконки в зависимости от времени суток для разнообразия
      // Солнце/ясно сменяется на облачность вечером
      if (weatherIcon.includes('01') || weatherIcon.includes('02')) {
        if (hour >= 18 || hour < 6) {
          hourIcon = hourIcon.replace('d', 'n'); // ночные иконки
        } else {
          hourIcon = hourIcon.replace('n', 'd'); // дневные иконки
        }
      } 
      
      // Дождь может усиливаться или ослабевать
      if (weatherIcon.includes('09') || weatherIcon.includes('10')) {
        // Меняем интенсивность дождя
        if (index % 3 === 0) {
          hourIcon = '10d'; // легкий дождь
        } else if (index % 3 === 1) {
          hourIcon = '09d'; // умеренный дождь
        }
        // День/ночь
        if (hour >= 18 || hour < 6) {
          hourIcon = hourIcon.replace('d', 'n');
        }
      }
      
      // Облачность может меняться
      if (weatherIcon.includes('03') || weatherIcon.includes('04')) {
        if (index % 3 === 0) {
          hourIcon = '02d'; // переменная облачность
        } else if (index % 3 === 1) {
          hourIcon = '03d'; // облачно
        } else {
          hourIcon = '04d'; // пасмурно
        }
        // День/ночь
        if (hour >= 18 || hour < 6) {
          hourIcon = hourIcon.replace('d', 'n');
        }
      }
      
      return {
        hour,
        temp: Math.round(tempC + tempAdjustment),
        icon: hourIcon,
        description
      };
    });
  }, []);
  
  // Мемоизируем почасовой прогноз
  const nextHours = useMemo(() => {
    if (hourlyData && hourlyData.length > 0) {
      // Если есть переданные почасовые данные, используем их (с ограничением для мобильных)
      const limit = isMobile.current ? Math.min(12, hourlyData.length) : hourlyData.length;
      return hourlyData.slice(0, limit);
    }
    
    // Создаем заглушку с примерной почасовой температурой на основе текущей 
    return getHourlyForecast(
      currentCityHour,
      tempC, 
      weatherData.weather[0].icon,
      weatherData.weather[0].description
    );
  }, [hourlyData, tempC, weatherData.weather, currentCityHour, getHourlyForecast]);

  // Мемоизируем направление ветра
  const windDirection = useMemo(() => {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    return directions[Math.round(weatherData.wind.deg / 45) % 8];
  }, [weatherData.wind.deg]);

  // Предзагрузка иконок погоды
  useEffect(() => {
    if (!weatherData.weather[0]?.icon) return;
    
    // Предзагружаем основную иконку и первые несколько иконок почасового прогноза
    const preloadIcons = () => {
      const mainIcon = new Image();
      mainIcon.src = iconUrl;
      
      // Для экономии ресурсов предзагружаем только первые 4 иконки
      if (nextHours && nextHours.length > 0) {
        nextHours.slice(0, 4).forEach(hour => {
          const img = new Image();
          img.src = getIconUrl(hour.icon, '.png');
        });
      }
    };
    
    const timerId = setTimeout(preloadIcons, 300);
    return () => clearTimeout(timerId);
  }, [weatherData.weather, iconUrl, nextHours]);

  // Обновляем CSS стили для плавных переходов облаков
  useEffect(() => {
    // Добавим стили для плавной анимации облаков и предотвращения исчезновения карты при прокрутке
    const style = document.createElement('style');
    style.textContent = `
      /* Фикс для предотвращения черного прямоугольника при скролле */
      body * {
        transform-style: flat;
      }
      
      .weather-card {
        contain: layout; /* Улучшает производительность изоляцией */
        transform-style: flat;
      }
      
      .weather-card__map {
        transition: opacity 0.5s ease-in-out;
        contain: paint; /* Изолирует перерисовку */
        transform-style: preserve-3d; /* Помогает с GPU-рендерингом */
        z-index: -1;
      }
      
      .weather-card__map iframe {
        transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
        transform: translate3d(0, 0, 0) scale(1.1);
        will-change: transform;
        backface-visibility: hidden;
        z-index: -1;
        transform-style: preserve-3d;
      }
      
      .weather-card__map::after {
        transform: translateZ(0);
        will-change: transform;
      }
      
      .loading-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      
      .loading-indicator::before {
        content: "";
        display: block;
        width: 40px;
        height: 40px;
        margin-bottom: 10px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      @media (max-width: 768px) {
        .location-button {
          aspect-ratio: 1/1;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
      }
      
      /* Скрываем черный прямоугольник при скролле */
      @media (max-width: 768px) {
        body {
          background-color: var(--secondary-color) !important;
        }
        
        .weather-card {
          background-color: rgba(30, 33, 58, 0.9) !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Предотвращаем исчезновение карты при скроллинге без изменения глобальных стилей
  useEffect(() => {
    // Функция для фиксации карты при скролле
    const handleScroll = () => {
      const iframes = document.querySelectorAll('.weather-card__map iframe');
      const cardMaps = document.querySelectorAll('.weather-card__map');
      const cards = document.querySelectorAll('.weather-card');
      
      iframes.forEach((iframe: Element) => {
        if (iframe instanceof HTMLIFrameElement) {
          // Обновляем стили для предотвращения исчезновения
          iframe.style.transform = 'scale(1.1) translateZ(0)';
          iframe.style.willChange = 'transform';
        }
      });
      
      // Убеждаемся, что карты не исчезают
      cardMaps.forEach((map: Element) => {
        if (map instanceof HTMLElement) {
          map.style.willChange = 'transform';
          map.style.transform = 'translateZ(0)';
        }
      });
      
      // Убеждаемся, что у карточек правильный фон
      cards.forEach((card: Element) => {
        if (card instanceof HTMLElement) {
          card.style.backgroundColor = 'rgba(30, 33, 58, 0.9)';
        }
      });
      
      // Обновляем боди, чтобы не было черного фона
      document.body.style.backgroundColor = 'var(--secondary-color)';
    };
    
    // Эффективная подписка на скролл
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const throttledScroll = () => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          handleScroll();
          scrollTimeout = 0 as unknown as ReturnType<typeof setTimeout>;
        }, 100);
      }
    };
    
    window.addEventListener('scroll', throttledScroll, { passive: true });
    window.addEventListener('touchmove', throttledScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    // Запускаем сразу при монтировании
    handleScroll();
    
    // Регулярно обновляем
    const intervalId = setInterval(handleScroll, 1000);
    
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('touchmove', throttledScroll);
      window.removeEventListener('resize', handleScroll);
      clearInterval(intervalId);
      clearTimeout(scrollTimeout);
    };
  }, [mapUrl]);

  return (
    <div className="weather-card">
      {isMapLoading ? (
        <div className="weather-card__map weather-card__map--loading">
          <div className="loading-indicator">Загрузка карты...</div>
        </div>
      ) : mapUrl ? (
        <div className="weather-card__map">
          <iframe 
            src={mapUrl}
            width="100%" 
            height="100%" 
            frameBorder="0" 
            scrolling="no"
            title={`Карта ${weatherData.name}`}
            loading="lazy"
            allowFullScreen
            key={mapKey} // Используем ключ для предотвращения перерисовки iframe
          />
        </div>
      ) : null}
      
      <div className="weather-card__header">
        <div className="weather-card__header-left">
          <h2 className="weather-card__title">{weatherData.name}, {weatherData.sys.country}</h2>
          <div className="weather-card__date">{formattedDate}</div>
        </div>
        <div className="weather-card__time">{currentTime}</div>
      </div>
      
      <div className="weather-card__content">
      <div className="weather-card__center">
        <div className="weather-card__icon">
          <img 
            src={iconUrl} 
            alt={weatherData.weather[0].description} 
            loading="eager"
            width="100"
            height="100"
            decoding="async"
          />
        </div>
        
        <div className="weather-card__temp">
          {tempC}
          <span className="weather-card__temp-unit">°C</span>
        </div>
        
        <div className="weather-card__description">
          {weatherData.weather[0].description.charAt(0).toUpperCase() + weatherData.weather[0].description.slice(1)}
        </div>
        </div>
        
        {/* Основные параметры в одну строку */}
        <div className="weather-card__details-row">
          <div className="weather-card__detail-item">
            <span className="weather-card__detail-label">Ощущается:</span>
            <span className="weather-card__detail-value">{Math.round(weatherData.main.feels_like)}°</span>
          </div>
          <div className="weather-card__detail-separator"></div>
          <div className="weather-card__detail-item">
            <span className="weather-card__detail-label">Влажность:</span>
            <span className="weather-card__detail-value">{weatherData.main.humidity}%</span>
          </div>
          <div className="weather-card__detail-separator"></div>
          <div className="weather-card__detail-item">
            <span className="weather-card__detail-label">Ветер:</span>
            <span className="weather-card__detail-value">{Math.round(weatherData.wind.speed)} м/с, {windDirection}</span>
          </div>
        </div>
        
        <div className="weather-card__details">
          <div className="weather-card__hourly">
            <span className="weather-card__detail-label">Почасовой прогноз</span>
            <div className="weather-card__hours">
              {nextHours.map((hour, index) => (
                <div key={index} className="weather-card__hour">
                  <span className="weather-card__hour-time">{hour.hour}:00</span>
                  <img 
                    src={getIconUrl(hour.icon, '.png')}
                    alt={hour.description}
                    className="weather-card__hour-icon"
                    loading={index < 4 ? "eager" : "lazy"}
                    width="30"
                    height="30"
                  />
                  <span className="weather-card__hour-temp">{hour.temp}°</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard; 