import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import '../styles/components/weather-card.scss';
import { WeatherData } from '../types';

// Кэширование URL для иконок
const iconUrlCache = new Map<string, string>();
const getIconUrl = (iconCode: string, size: string = '@2x.png', description?: string) => {
  // Переопределение иконок для специфичных описаний
  const getActualIconCode = (iconCode: string, description?: string) => {
    if (description) {
      const lowerDesc = description.toLowerCase();
      
      // Определяем время суток из оригинальной иконки
      const isDaytime = iconCode.includes('d');
      const dayNightSuffix = isDaytime ? 'd' : 'n';
      
      // Для любого дождя всегда используем иконку обычного дождя (облако с каплями без солнца)
      if (lowerDesc.includes('дождь') || lowerDesc.includes('ливень') || lowerDesc.includes('осадки')) {
        // 09d/09n - дождь без солнца, 10d/10n - дождь с солнцем
        // Всегда возвращаем 09d/09n для всех типов дождя
        return `09${dayNightSuffix}`;
      }
      
      // Используем более подходящие иконки для частичной облачности
      if (lowerDesc.includes('переменная облачность') || lowerDesc.includes('облачно с прояснени')) {
        return `02${dayNightSuffix}`; // 02d и 02n - это иконки с солнцем и небольшой облачностью
      } else if (lowerDesc.includes('небольшая облачность')) {
        return `02${dayNightSuffix}`;
      } else if (lowerDesc.includes('область с прояснени')) {
        return `02${dayNightSuffix}`;
      } else if (lowerDesc.includes('ясно')) {
        return `01${dayNightSuffix}`;
      } else if (lowerDesc.includes('пасмурно')) {
        return `04${dayNightSuffix}`;
      }
    }
    return iconCode;
  };

  const actualIconCode = getActualIconCode(iconCode, description);
  const cacheKey = `${actualIconCode}${size}`;
  
  if (!iconUrlCache.has(cacheKey)) {
    iconUrlCache.set(cacheKey, `https://openweathermap.org/img/wn/${actualIconCode}${size}`);
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

// Используем memo для предотвращения ререндеров при неизменных пропсах
const WeatherCard = memo(({ weatherData, hourlyData = [] }: WeatherCardProps) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState<boolean>(false);
  const [mapKey, setMapKey] = useState<string>('');
  // Храним текущую иконку в состоянии компонента, используем null вместо пустой строки
  const [weatherIconSrc, setWeatherIconSrc] = useState<string | null>(null);
  
  // Сохраняем предыдущие координаты для проверки изменений
  const prevCoordsRef = useRef<{lat: number, lon: number} | null>(null);
  const isMobile = useRef<boolean>(window.innerWidth < 768);
  const timeInterval = useRef<NodeJS.Timeout | null>(null);
  const weatherIconContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Мемоизируем температуру для предотвращения пересчетов
  const tempC = useMemo(() => 
    Math.round(weatherData.main.temp), 
    [weatherData.main.temp]
  );
  
  // Обновляем URL иконки когда изменяется иконка погоды или описание
  useEffect(() => {
    if (weatherData?.weather && weatherData.weather[0]?.icon) {
      // Избегаем ненужного обновления, если в URL иконки уже содержится нужный код
      const newIconUrl = getIconUrl(
        weatherData.weather[0].icon, 
        '@2x.png', 
        weatherData.weather[0].description
      );
      
      // Обновляем URL иконки только если он изменился
      if (newIconUrl !== weatherIconSrc) {
        setWeatherIconSrc(newIconUrl);
      }
    }
  }, [weatherData?.weather?.[0]?.icon, weatherData?.weather?.[0]?.description]);
  
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
        const bbox = `${(lon - delta).toFixed(6)},${(lat - delta).toFixed(6)},${(lon + delta).toFixed(6)},${(lat + delta).toFixed(6)}`;
        
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
    
    // Оптимизация для обработки скролла - добавляем passive: true
    window.addEventListener('resize', handleResize, { passive: true });
    
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
    
    // Базовая температура для прогноза
    const baseTemp = tempC;
    
    // Создаем массив из оставшихся часов дня (с ограничением для мобильных)
    return Array.from({ length: limit }).map((_, index) => {
      const hour = (currentHour + index) % 24;
      
      // Более реалистичная модель температуры
      // Пик в 14-15 часов, минимум в 4-5 утра
      // Целый день моделируем синусоидой
      const timeOfDay = hour / 24; // нормализуем час (0-1)
      const peakHour = 14 / 24; // пик в 14 часов (нормализованный)
      
      // Расстояние от пикового часа (0-0.5)
      let distFromPeak = Math.abs(timeOfDay - peakHour);
      if (distFromPeak > 0.5) distFromPeak = 1 - distFromPeak;
      
      // Нормализуем к диапазону 0-1, где 0 = пик дня, 1 = глубокая ночь
      const normalizedDist = distFromPeak * 2;
      
      // Амплитуда колебаний температуры (дневной разброс)
      const amplitude = 5;
      
      // Температура с учетом времени суток: теплее днем, холоднее ночью
      // cos(π*x) дает значения от 1 (x=0) до -1 (x=1)
      const tempAdjustment = Math.cos(Math.PI * normalizedDist) * amplitude;
      
      // Генерируем иконку в зависимости от времени суток
      let hourIcon = weatherIcon;
      
      // Разбираем базовую погоду из иконки (удаляем суффикс d/n)
      const baseIcon = weatherIcon.replace(/[dn]$/, '');
      
      // Определяем, день это или ночь, на основе часа
      const isDaytime = hour >= 6 && hour < 19;
      
      // Формируем новую иконку с правильным суффиксом времени суток
      hourIcon = baseIcon + (isDaytime ? 'd' : 'n');
      
      return {
        hour,
        temp: Math.round(baseTemp + tempAdjustment),
        icon: hourIcon,
        description
      };
    });
  }, []);
  
  // Мемоизируем почасовой прогноз
  const nextHours = useMemo(() => {
    if (hourlyData && hourlyData.length > 0) {
      // Если есть переданные почасовые данные, используем их (с ограничением для мобильных)
      const limit = isMobile.current ? Math.min(24, hourlyData.length) : hourlyData.length;
      return hourlyData.slice(0, limit);
    }
    
    // Создаем примерный почасовой прогноз на основе текущей температуры
    return getHourlyForecast(
      currentCityHour,
      tempC, 
      weatherData.weather[0].icon,
      weatherData.weather[0].description
    );
  }, [hourlyData, tempC, weatherData.weather, currentCityHour, getHourlyForecast]);

  // Мемоизируем URL иконок почасового прогноза, чтобы избежать повторных перерисовок
  const hourlyIconUrls = useMemo(() => {
    return nextHours.map(hour => ({
      hour: hour.hour,
      temp: hour.temp,
      iconUrl: getIconUrl(hour.icon, '.png', hour.description),
      description: hour.description
    }));
  }, [nextHours]);

  // Мемоизируем направление ветра
  const windDirection = useMemo(() => {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    return directions[Math.round(weatherData.wind.deg / 45) % 8];
  }, [weatherData.wind.deg]);

  // Предзагрузка иконок погоды
  useEffect(() => {
    if (!weatherData.weather[0]?.icon || !weatherIconSrc) return;
    
    // Предзагружаем основную иконку и первые несколько иконок почасового прогноза
    const preloadIcons = () => {
      const mainIcon = new Image();
      mainIcon.src = weatherIconSrc;
      
      // Для экономии ресурсов предзагружаем только первые 4 иконки
      if (hourlyIconUrls && hourlyIconUrls.length > 0) {
        hourlyIconUrls.slice(0, 4).forEach(hour => {
          const img = new Image();
          img.src = hour.iconUrl;
        });
      }
    };
    
    const timerId = setTimeout(preloadIcons, 300);
    return () => clearTimeout(timerId);
  }, [weatherData.weather, weatherIconSrc, hourlyIconUrls]);

  // Обновляем CSS стили для плавных переходов облаков
  useEffect(() => {
    // Добавим стили для плавной анимации облаков
    const style = document.createElement('style');
    style.textContent = `
      .weather-card__map {
        transition: opacity 0.5s ease-in-out;
      }
      .weather-card__map iframe {
        transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
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
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем интервал обновления времени
      if (timeInterval.current) {
        clearInterval(timeInterval.current);
        timeInterval.current = null;
      }
      
      // Очищаем кэш иконок при размонтировании
      iconUrlCache.clear();
    };
  }, []);

  // Не забываем вернуть JSX в конце компонента
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
        <div className="weather-card__icon" ref={weatherIconContainerRef}>
          {weatherIconSrc && (
            <img 
              src={weatherIconSrc}
              alt={weatherData.weather[0].description} 
              loading="eager"
              width="100"
              height="100"
              decoding="async"
              key={`weather-icon-${weatherData.name}-${weatherData.weather[0].icon}`}
            />
          )}
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
            <span className="weather-card__hourly-title">Почасовой прогноз</span>
            <div className="weather-card__hours-container">
              <div className="weather-card__hours">
                {hourlyIconUrls.map((hour, index) => {
                  return (
                    <div key={`hour-${index}-${weatherData.name}`} className="weather-card__hour">
                      <span className="weather-card__hour-time">{hour.hour.toString().padStart(2, '0')}:00</span>
                      <img 
                        src={hour.iconUrl}
                        alt={hour.description}
                        className="weather-card__hour-icon"
                        loading={index < 4 ? "eager" : "lazy"}
                        width="40"
                        height="40"
                        decoding="async"
                      />
                      <span className="weather-card__hour-temp">{hour.temp}°</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизированное сравнение для предотвращения ререндеров при скролле
  // Сравниваем только ключевые свойства, которые действительно требуют обновления UI
  
  try {
    // Если изменился город - обновляем
    if (prevProps.weatherData.name !== nextProps.weatherData.name) {
      return false;
    }
    
    // Если изменилась температура - обновляем
    if (prevProps.weatherData.main.temp !== nextProps.weatherData.main.temp) {
      return false;
    }
    
    // Если изменилась иконка погоды - обновляем
    if (prevProps.weatherData.weather[0].icon !== nextProps.weatherData.weather[0].icon) {
      return false;
    }
    
    // Если изменились почасовые данные - обновляем
    if (prevProps.hourlyData && nextProps.hourlyData && 
        JSON.stringify(prevProps.hourlyData) !== JSON.stringify(nextProps.hourlyData)) {
      return false;
    }
    
    // Если изменились координаты более чем на 0.01 градус - обновляем
    const coordChanged = Math.abs(prevProps.weatherData.coord.lat - nextProps.weatherData.coord.lat) > 0.01 ||
                         Math.abs(prevProps.weatherData.coord.lon - nextProps.weatherData.coord.lon) > 0.01;
    
    if (coordChanged) {
      return false;
    }
    
    // Во всех других случаях пропускаем обновление
    return true;
  } catch (e) {
    // В случае ошибки лучше обновить компонент
    return false;
  }
});

export default WeatherCard; 