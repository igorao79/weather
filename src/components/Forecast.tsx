import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { ForecastData, DailyForecast } from '../types';
import '../styles/components/forecast.scss';

// Кэшированные URL для иконок - вынесено за пределы компонента
const iconCache = new Map<string, string>();
const getIconUrl = (iconCode: string, large: boolean = false, description?: string) => {
  // Проверяем и корректируем код иконки на основе описания
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

  // Получаем скорректированный код иконки
  const actualIconCode = getActualIconCode(iconCode, description);
  const size = large ? '@2x' : '';
  const key = `${actualIconCode}${size}`;
  
  if (!iconCache.has(key)) {
    iconCache.set(key, `https://openweathermap.org/img/wn/${actualIconCode}${size}.png`);
  }
  
  return iconCache.get(key) as string;
};

interface ForecastProps {
  // Компонент может получать либо объект ForecastData, либо массив преобразованных прогнозов
  data?: ForecastData;
  dailyForecasts?: DailyForecast[]; 
}

// Интерфейс для почасовых данных
interface HourlyWeatherData {
  hour: number;
  temp: number;
  icon: string;
  description: string;
}

// Используем memo для предотвращения ненужных ререндеров
const Forecast = memo(({ data, dailyForecasts }: ForecastProps) => {
  // Оптимизировано: использование useRef для состояний, которые не влияют на рендеринг
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const isMobile = useRef<boolean>(window.innerWidth < 768);
  const isTablet = useRef<boolean>(window.innerWidth >= 768 && window.innerWidth < 1024);
  const isLandscape = useRef<boolean>(window.innerWidth > window.innerHeight);
  
  // Скрываем вычисления и кэшируем результаты
  const processedForecasts = useMemo(() => {
    return dailyForecasts || getDailyForecasts();
  }, [dailyForecasts, data]);
  
  // Проверка устройства только при изменении размера окна для экономии ресурсов
  useEffect(() => {
    const checkDeviceType = () => {
      isMobile.current = window.innerWidth < 768;
      isTablet.current = window.innerWidth >= 768 && window.innerWidth < 1024;
      isLandscape.current = window.innerWidth > window.innerHeight;
    };
    
    // Проверяем при загрузке
    checkDeviceType();
    
    // Используем debounced обработчик, чтобы не вызывать функцию слишком часто
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkDeviceType, 150);
    };
    
    // Обрабатываем изменение ориентации для планшетов
    const handleOrientationChange = () => {
      checkDeviceType();
      
      // Если был открытый элемент, закрываем его при смене ориентации
      if (hoveredDay && isTablet.current) {
        setIsAnimating(true);
        setHoveredDay(null);
        
        // Убираем анимацию после закрытия
        setTimeout(() => {
          setIsAnimating(false);
        }, 300);
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(resizeTimer);
    };
  }, [hoveredDay]);
  
  // Мемоизированная функция получения почасовых данных
  const getHourlyData = useCallback((date: Date): HourlyWeatherData[] => {
    if (!data || !data.list) return [];
    
    const targetDate = new Date(date).toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();
    
    // Определяем, является ли выбранный день сегодняшним
    const isToday = new Date().toISOString().split('T')[0] === targetDate;
    
    // Фильтруем данные для выбранного дня
    return data.list.filter(item => {
      const itemDate = new Date(item.dt * 1000);
      const itemDateStr = itemDate.toISOString().split('T')[0];
      if (isToday) {
        return itemDateStr === targetDate && itemDate.getHours() >= currentHour;
      }
      return itemDateStr === targetDate;
    }).map(item => {
      const itemDate = new Date(item.dt * 1000);
      return {
        hour: itemDate.getHours(),
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon,
        description: item.weather[0].description
      };
    });
  }, [data]);
  
  // Оптимизированный getDailyForecasts для предотвращения лишних вычислений
  function getDailyForecasts() {
    if (!data || !data.list || !Array.isArray(data.list)) return [];
    
    const dailyData: Record<string, any> = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const day = date.toISOString().split('T')[0];
      
      if (!dailyData[day]) {
        dailyData[day] = {
          temps: [],
          icons: {},
          date,
          conditions: []
        };
      }
      
      dailyData[day].temps.push(item.main.temp);
      
      const icon = item.weather[0].icon;
      const condition = item.weather[0].description;
      dailyData[day].icons[icon] = (dailyData[day].icons[icon] || 0) + 1;
      dailyData[day].conditions.push(condition);
    });
    
    return Object.keys(dailyData).slice(0, 5).map(day => {
      const data = dailyData[day];
      const dayName = new Date(day).toLocaleDateString('ru-RU', { weekday: 'short' });
      
      let maxCount = 0;
      let mostFrequentIcon = '';
      let mostFrequentCondition = '';
      
      for (const icon in data.icons) {
        if (data.icons[icon] > maxCount) {
          maxCount = data.icons[icon];
          mostFrequentIcon = icon;
        }
      }
      
      const conditionCounts: Record<string, number> = {};
      data.conditions.forEach((condition: string) => {
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
      });
      
      let maxConditionCount = 0;
      for (const condition in conditionCounts) {
        if (conditionCounts[condition] > maxConditionCount) {
          maxConditionCount = conditionCounts[condition];
          mostFrequentCondition = condition;
        }
      }
      
      return {
        day: dayName,
        date: data.date,
        temp_max: Math.max(...data.temps),
        temp_min: Math.min(...data.temps),
        icon: mostFrequentIcon,
        description: mostFrequentCondition
      };
    });
  }

  // Раннее возвращение при отсутствии данных
  if (!processedForecasts || processedForecasts.length === 0) {
    return (
      <div className="forecast">
        <h2 className="forecast__title">5-дневный прогноз</h2>
        <div className="forecast__list">
          <p>Данные прогноза недоступны</p>
        </div>
      </div>
    );
  }

  // Функция для получения ID дня
  const getDayId = (date: Date) => date.toISOString().split('T')[0];
  
  // Адаптивная функция для определения позиции элемента в сетке
  const getPositionClass = useCallback((index: number) => {
    // На мобильных нет дополнительных классов
    if (isMobile.current) {
      return '';
    }
    
    // Для планшетов в портретной ориентации
    if (isTablet.current && !isLandscape.current) {
      // Сетка 3 колонки
      if (index % 3 === 0) return 'forecast__item--left';
      if (index % 3 === 1) return 'forecast__item--center';
      if (index % 3 === 2) return 'forecast__item--right';
    }
    
    // Для планшетов в альбомной ориентации и десктопов
    if ((isTablet.current && isLandscape.current) || !isTablet.current) {
      // Сетка 5 колонок
      if (index % 5 === 0) return 'forecast__item--far-left';
      if (index % 5 === 1) return 'forecast__item--left';
      if (index % 5 === 2) return 'forecast__item--center';
      if (index % 5 === 3) return 'forecast__item--right';
      if (index % 5 === 4) return 'forecast__item--far-right';
    }
    
    return '';
  }, [isMobile, isTablet, isLandscape]);
  
  // Обработчики событий с throttle для предотвращения частых обновлений состояния
  const handleMouseEnter = (dayId: string) => {
    if (isMobile.current || isTablet.current) return;
    
    setIsAnimating(true);
    setHoveredDay(dayId);
  };
  
  const handleMouseLeave = () => {
    if (isMobile.current || isTablet.current) return;
    
    setIsAnimating(true);
    setHoveredDay(null);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 300); // Уменьшено с 500 до 300 для ускорения
  };
  
  // Упрощенный обработчик для улучшения производительности
  const handleItemClick = (dayId: string, event: React.MouseEvent) => {
    if (isMobile.current || isTablet.current) {
      event.stopPropagation();
      event.preventDefault();
      
      // Ставим задержку для анимации и перестроения DOM
      if (hoveredDay !== dayId) {
        // Если открываем новый элемент, сначала закрываем текущий
        if (hoveredDay) {
          // Включаем анимацию
          setIsAnimating(true);
          // Закрываем текущий элемент
          setHoveredDay(null);
          
          // Открываем новый элемент с небольшой задержкой
          setTimeout(() => {
            setHoveredDay(dayId);
            
            // Убираем анимацию после завершения перехода
            setTimeout(() => {
              setIsAnimating(false);
            }, 300);
          }, 150);
        } else {
          // Если нет открытого элемента, просто открываем новый
          setIsAnimating(true);
          setHoveredDay(dayId);
          
          // Убираем анимацию после завершения перехода
          setTimeout(() => {
            setIsAnimating(false);
          }, 300);
        }
      } else {
        // Закрываем текущий элемент
        setIsAnimating(true);
        setHoveredDay(null);
        
        // Убираем анимацию после завершения перехода
        setTimeout(() => {
          setIsAnimating(false);
        }, 300);
      }
      
      // Перед тем, как изменить состояние, проверяем соседние элементы
      const currentItem = event.currentTarget as HTMLElement;
      const allItems = document.querySelectorAll('.forecast__item');
      
      // Закрываем все элементы, кроме текущего
      allItems.forEach(item => {
        const itemDayId = item.getAttribute('data-day-id');
        if (itemDayId !== dayId && item !== currentItem) {
          // Принудительно закрываем все другие элементы
          item.classList.remove('forecast__item--expanded');
        }
      });
    }
  };
  
  // Обработчик для закрытия карточек при клике вне элементов
  useEffect(() => {
    if ((isMobile.current || isTablet.current) && hoveredDay) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const forecastItem = target.closest('.forecast__item');
        
        // Если клик был вне элемента прогноза или на другом элементе
        if (!forecastItem || forecastItem.getAttribute('data-day-id') !== hoveredDay) {
          setIsAnimating(true);
          setHoveredDay(null);
          
          // Убираем анимацию после завершения перехода
          setTimeout(() => {
            setIsAnimating(false);
          }, 300);
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [hoveredDay]);

  // Предзагрузка только самых важных иконок
  useEffect(() => {
    let isMounted = true;
    let loadedIcons = new Set<string>(); // Кэш для уже загруженных иконок
    
    // Функция с low priority предзагрузкой
    const preloadIcons = () => {
      if (processedForecasts.length && isMounted) {
        // Загружаем иконки всех прогнозов при инициализации
        processedForecasts.forEach((forecast, index) => {
          const iconKey = `${forecast.icon}-${index < 2 ? '@2x' : ''}-${forecast.description}`;
          
          // Проверяем, не загружалась ли иконка ранее
          if (!loadedIcons.has(iconKey)) {
            const img = new Image();
            img.src = getIconUrl(forecast.icon, index < 2, forecast.description);
            loadedIcons.add(iconKey);
          }
        });
      }
    };
    
    // Отложенная предзагрузка для уменьшения нагрузки при загрузке страницы
    const timer = setTimeout(preloadIcons, 300);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [processedForecasts]); // Убираем hoveredDay из зависимостей

  // Мемоизируем генерацию URL иконок для предотвращения лишних запросов
  const iconUrlMemo = useMemo(() => {
    const cache: Record<string, string> = {};
    return (icon: string, large: boolean, description?: string) => {
      const key = `${icon}-${large ? 'large' : 'small'}-${description || ''}`;
      if (!cache[key]) {
        cache[key] = getIconUrl(icon, large, description);
      }
      return cache[key];
    };
  }, []);

  return (
    <div className={`forecast ${isAnimating ? 'forecast--animating' : ''}`}>
      <h2 className="forecast__title">5-дневный прогноз</h2>
      <div className="forecast__list">
        {processedForecasts.map((forecast, index) => {
          const dayId = getDayId(forecast.date);
          const isHovered = hoveredDay === dayId;
          const positionClass = getPositionClass(index);
          
          // Мемоизируем почасовые данные только когда они нужны
          const hourlyData = useMemo(() => {
            if (!isHovered) return [];
            
            if (dailyForecasts && !data) {
              const today = new Date().toISOString().split('T')[0];
              const forecastDay = forecast.date.toISOString().split('T')[0];
              const isToday = today === forecastDay;
              const currentHour = new Date().getHours();
              
              // Разбираем базовую погоду из иконки (удаляем суффикс d/n)
              const baseIcon = forecast.icon.replace(/[dn]$/, '');
              
              // Генерируем сокращенный набор данных для мобильных устройств
              if (isToday) {
                const hoursRemaining = Math.min(24 - currentHour, isMobile.current ? 12 : 24);
                return Array.from({ length: hoursRemaining }).map((_, idx) => {
                  const hour = currentHour + idx;
                  const tempVariation = Math.sin(hour / 24 * Math.PI) * 3;
                  const midTemp = (forecast.temp_max + forecast.temp_min) / 2;
                  
                  // Определяем, день это или ночь, на основе часа
                  const isDaytime = hour >= 6 && hour < 19;
                  
                  // Формируем новую иконку с правильным суффиксом времени суток
                  const hourIcon = baseIcon + (isDaytime ? 'd' : 'n');
                  
                  return {
                    hour,
                    temp: Math.round(midTemp + tempVariation),
                    icon: hourIcon,
                    description: forecast.description
                  };
                });
              } else {
                // Для других дней - сокращаем количество часов для мобильных
                const hoursPerDay = isMobile.current ? 12 : 24;
                const step = 24 / hoursPerDay;
                return Array.from({ length: hoursPerDay }).map((_, idx) => {
                  const hour = Math.floor(idx * step);
                  const tempVariation = Math.sin(hour / 24 * Math.PI) * 3;
                  const midTemp = (forecast.temp_max + forecast.temp_min) / 2;
                  
                  // Определяем, день это или ночь, на основе часа
                  const isDaytime = hour >= 6 && hour < 19;
                  
                  // Формируем новую иконку с правильным суффиксом времени суток
                  const hourIcon = baseIcon + (isDaytime ? 'd' : 'n');
                  
                  return {
                    hour,
                    temp: Math.round(midTemp + tempVariation),
                    icon: hourIcon,
                    description: forecast.description
                  };
                });
              }
            } else if (data) {
              const hourlyItems = getHourlyData(forecast.date);
              // Ограничиваем количество элементов для мобильных устройств
              return isMobile.current ? hourlyItems.slice(0, 12) : hourlyItems;
            }
            
            return [];
          }, [isHovered, forecast, data, dailyForecasts, getHourlyData]);
          
          return (
            <div 
              key={index} 
              className={`forecast__item ${isHovered ? 'forecast__item--expanded' : ''} ${positionClass}`}
              onMouseEnter={isMobile.current || isTablet.current ? undefined : () => handleMouseEnter(dayId)}
              onMouseLeave={isMobile.current || isTablet.current ? undefined : handleMouseLeave}
              onClick={(e) => handleItemClick(dayId, e)}
              data-day-id={dayId}
              data-position={index}
              tabIndex={0}
            >
              <div className="forecast__item-content">
                <div className="forecast__day">{forecast.day}</div>
                <div className="forecast__icon">
                  <img 
                    src={iconUrlMemo(forecast.icon, true, forecast.description)} 
                    alt={forecast.description}
                    loading={index < 3 ? "eager" : "lazy"}
                    width="50"
                    height="50"
                    fetchPriority={index < 2 ? "high" : "auto"}
                  />
                </div>
                <div className="forecast__description">
                  {forecast.description && forecast.description.charAt(0).toUpperCase() + forecast.description.slice(1)}
                </div>
                <div className="forecast__temps">
                  <div className="forecast__temp forecast__temp--max">
                    <span className="forecast__temp-label">Макс</span>
                    <span className="forecast__temp-value">{Math.round(forecast.temp_max)}°</span>
                  </div>
                  <div className="forecast__temp forecast__temp--min">
                    <span className="forecast__temp-label">Мин</span>
                    <span className="forecast__temp-value">{Math.round(forecast.temp_min)}°</span>
                  </div>
                </div>
              </div>
              
              {isHovered && (
                <div className="forecast__hourly-container">
                  <div className="forecast__hourly">
                    <h3 className="forecast__hourly-title">Почасовой прогноз</h3>
                    <div className="forecast__hourly-list">
                      {hourlyData.length > 0 ? (
                        hourlyData.map((hour, idx) => (
                          <div key={idx} className="forecast__hourly-item">
                            <span className="forecast__hourly-hour">{hour.hour}:00</span>
                            <img 
                              src={iconUrlMemo(hour.icon, false, hour.description)} 
                              alt={hour.description} 
                              className="forecast__hourly-icon"
                              loading="lazy"
                              width="30"
                              height="30" 
                            />
                            <span className="forecast__hourly-temp">{hour.temp}°</span>
                          </div>
                        ))
                      ) : (
                        <p className="forecast__hourly-empty">Почасовой прогноз недоступен</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Сравниваем данные прогноза для определения необходимости перерисовки
  
  // Если не передан data или dailyForecasts в оба набора пропсов, считаем их равными
  if (!prevProps.data && !nextProps.data && !prevProps.dailyForecasts && !nextProps.dailyForecasts) {
    return true;
  }
  
  // Если data или dailyForecasts есть только в одном из наборов, перерисовываем
  if ((!prevProps.data && nextProps.data) || (prevProps.data && !nextProps.data) ||
      (!prevProps.dailyForecasts && nextProps.dailyForecasts) || (prevProps.dailyForecasts && !nextProps.dailyForecasts)) {
    return false;
  }
  
  // Проверяем data по id или списку в случае, если dailyForecasts не предоставлены
  if (prevProps.data && nextProps.data) {
    // Сравниваем списки прогнозов
    if (prevProps.data.list?.length !== nextProps.data.list?.length) {
      return false;
    }
    
    // Сравниваем id города, если он доступен
    if (prevProps.data.city?.id !== nextProps.data.city?.id) {
      return false;
    }
  }
  
  // Проверяем dailyForecasts по дате и температуре, если они предоставлены
  if (prevProps.dailyForecasts && nextProps.dailyForecasts) {
    if (prevProps.dailyForecasts.length !== nextProps.dailyForecasts.length) {
      return false;
    }
    
    // Проверяем первый прогноз для определения, изменились ли данные
    if (
      prevProps.dailyForecasts[0]?.day !== nextProps.dailyForecasts[0]?.day ||
      prevProps.dailyForecasts[0]?.temp_max !== nextProps.dailyForecasts[0]?.temp_max ||
      prevProps.dailyForecasts[0]?.icon !== nextProps.dailyForecasts[0]?.icon
    ) {
      return false;
    }
  }
  
  // Если все проверки пройдены, считаем пропсы равными и пропускаем ререндер
  return true;
});

export default Forecast; 