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
    
    // Debounced обработчик изменения размера
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkDeviceType, 150);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', checkDeviceType, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', checkDeviceType);
      clearTimeout(resizeTimer);
    };
  }, []);
  
  // Мемоизированная функция получения почасовых данных
  const getHourlyData = useCallback((date: Date): HourlyWeatherData[] => {
    if (!data || !data.list) return [];
    
    const targetDate = new Date(date).toISOString().split('T')[0];
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    
    // Проверка, является ли день сегодняшним или завтрашним
    const isToday = currentDate === targetDate;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const isTomorrow = tomorrowDate === targetDate;
    
    // Для сегодняшнего и завтрашнего дня всегда генерируем полный набор часов
    if (isToday || isTomorrow) {
      console.log(`GetHourlyData: Генерируем данные для ${isToday ? 'сегодняшнего' : 'завтрашнего'} дня`, targetDate);
      
      // Найдем дневной прогноз для этой даты
      const dayForecast = processedForecasts.find(f => 
        getDayId(f.date) === targetDate
      );
      
      if (!dayForecast) return [];
      
      // Создаем полный массив часов с интервалом 3 часа
      const allHours = [0, 3, 6, 9, 12, 15, 18, 21];
      
      // Для сегодня фильтруем только будущие часы
      const hoursArray = isToday 
        ? allHours.filter(h => h >= currentHour) 
        : allHours;
      
      // Если для сегодня не осталось часов, добавим текущий час
      if (isToday && hoursArray.length === 0) {
        hoursArray.push(currentHour);
        
        // Добавим еще оставшиеся часы с шагом 1 час
        for (let h = currentHour + 1; h < 24; h++) {
          hoursArray.push(h);
          if (hoursArray.length >= 6) break; // не более 6 часов
        }
      }
      
      // Получаем базовую иконку и описание
      const baseIcon = dayForecast.icon.replace(/[dn]$/, '');
      
      return hoursArray.map(hour => {
        // Расчет температуры в зависимости от времени суток
        let tempFactor = 0;
        if (hour >= 12 && hour <= 15) {
          tempFactor = 1; // Пик температуры днем
        } else if (hour >= 3 && hour <= 6) {
          tempFactor = -1; // Минимум температуры ночью
        } else if ((hour >= 9 && hour < 12) || (hour > 15 && hour <= 18)) {
          tempFactor = 0.5; // Переходные периоды
        } else {
          tempFactor = -0.5; // Вечер и ночь
        }
        
        const tempSpread = dayForecast.temp_max - dayForecast.temp_min;
        const midTemp = (dayForecast.temp_max + dayForecast.temp_min) / 2;
        const temp = midTemp + tempFactor * (tempSpread / 2);
        
        // Определяем, день это или ночь
        const isDaytime = hour >= 6 && hour < 19;
        const hourIcon = baseIcon + (isDaytime ? 'd' : 'n');
        
        return {
          hour,
          temp: Math.round(temp),
          icon: hourIcon,
          description: dayForecast.description
        };
      });
    }
    
    // Для остальных дней используем данные API
    // Фильтруем данные для выбранного дня
    const filteredData = data.list.filter(item => {
      const itemDate = new Date(item.dt * 1000);
      const itemDateStr = itemDate.toISOString().split('T')[0];
      
      return itemDateStr === targetDate;
    });
    
    // Преобразуем отфильтрованные данные
    return filteredData.map(item => {
      const itemDate = new Date(item.dt * 1000);
      return {
        hour: itemDate.getHours(),
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon,
        description: item.weather[0].description
      };
    });
  }, [data, processedForecasts]);
  
  // Оптимизированный getDailyForecasts для предотвращения лишних вычислений
  function getDailyForecasts() {
    if (!data || !data.list || !Array.isArray(data.list)) return [];
    
    const dailyData: Record<string, any> = {};
    const todayStr = new Date().toISOString().split('T')[0]; // Получаем сегодняшний день
    
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
    
    // Получаем все дни, сортируем их по дате
    const allDays = Object.keys(dailyData).sort();
    
    // Находим индекс сегодняшнего дня в отсортированном массиве
    const todayIndex = allDays.indexOf(todayStr);
    
    // Если сегодняшний день найден, начинаем со следующего дня (завтра)
    // Иначе просто берем первые 6 дней (увеличено с 5 до 6)
    const startIndex = todayIndex !== -1 ? todayIndex + 1 : 0;
    
    // Берем 6 дней, начиная с завтрашнего (увеличено с 5 до 6)
    const daysToShow = allDays.slice(startIndex, startIndex + 6);
    
    console.log("Дни для прогноза:", daysToShow);
    
    return daysToShow.map(day => {
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
  
  // Фильтруем сегодняшний день из прогнозов
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredForecasts = processedForecasts.filter(forecast => 
    getDayId(forecast.date) !== todayStr
  ).slice(0, 5); // И берем только 5 дней начиная с завтрашнего
  
  console.log("Отфильтрованные прогнозы:", 
    filteredForecasts.map(f => ({ date: getDayId(f.date), day: f.day }))
  );
  
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

  // Предзагрузка иконок с оптимизацией
  useEffect(() => {
    let isMounted = true;
    const loadedIcons = new Set<string>();
    
    const preloadIcons = () => {
      if (!filteredForecasts.length || !isMounted) return;
      
      // Загружаем только первые 5 иконок с высоким приоритетом
      filteredForecasts.slice(0, 5).forEach((forecast) => {
        const iconKey = `${forecast.icon}-large-${forecast.description}`;
        if (loadedIcons.has(iconKey)) return;
        
        const img = new Image();
        img.src = getIconUrl(forecast.icon, true, forecast.description);
        loadedIcons.add(iconKey);
        
        // Упрощенная обработка ошибок
        img.onerror = () => {
          if (isMounted) {
            setTimeout(() => img.src = `${getIconUrl(forecast.icon, true, forecast.description)}?retry=true`, 300);
          }
        };
      });
    };
    
    // Запускаем предзагрузку сразу и еще раз через небольшую задержку для мобильных
    preloadIcons();
    const timer = setTimeout(preloadIcons, 1000);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [filteredForecasts]);

  // Мемоизируем генерацию URL иконок для предотвращения лишних запросов
  const iconUrlMemo = useMemo(() => {
    const cache = new Map<string, string>();
    return (icon: string, large: boolean, description?: string) => {
      const key = `${icon}-${large ? 'large' : 'small'}-${description || ''}`;
      if (!cache.has(key)) {
        cache.set(key, getIconUrl(icon, large, description));
      }
      return cache.get(key)!;
    };
  }, []);

  return (
    <div className={`forecast ${isAnimating ? 'forecast--animating' : ''}`}>
      <h2 className="forecast__title">5-дневный прогноз</h2>
      <div className="forecast__list">
        {filteredForecasts.map((forecast, index) => {
          const dayId = getDayId(forecast.date);
          const isHovered = hoveredDay === dayId;
          const positionClass = getPositionClass(index);
          
          // Мемоизируем почасовые данные только когда они нужны
          const hourlyData = useMemo(() => {
            if (!isHovered) return [];
            
            // Получаем сегодняшнюю и завтрашнюю даты для проверки
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const forecastDateStr = forecast.date.toISOString().split('T')[0];
            
            // Проверяем, является ли это сегодняшним или завтрашним днем
            const isToday = forecastDateStr === today;
            const isTomorrow = forecastDateStr === tomorrowStr;
            
            // Для сегодня и завтра всегда генерируем полный набор часов
            if (isToday || isTomorrow) {
              console.log(`Генерируем часы для ${isToday ? 'сегодняшнего' : 'завтрашнего'} дня`, forecastDateStr);
              
              // Для сегодняшнего дня показываем часы начиная с текущего часа
              const startHour = isToday ? now.getHours() : 0;
              
              // Создаем полный массив часов с интервалом 3 часа
              const allHours = [0, 3, 6, 9, 12, 15, 18, 21];
              
              // Для сегодня фильтруем только будущие часы
              const hoursArray = isToday 
                ? allHours.filter(h => h >= startHour) 
                : allHours;
              
              // Если для сегодня не осталось часов, добавим текущий час
              if (isToday && hoursArray.length === 0) {
                const currentHour = startHour;
                hoursArray.push(currentHour);
                
                // Добавим еще оставшиеся часы с шагом 1 час
                for (let h = currentHour + 1; h < 24; h++) {
                  hoursArray.push(h);
                  if (hoursArray.length >= 6) break; // не более 6 часов
                }
              }
              
              // Получаем базовую иконку и описание
              const baseIcon = forecast.icon.replace(/[dn]$/, '');
              
              return hoursArray.map(hour => {
                // Расчет температуры в зависимости от времени суток
                let tempFactor = 0;
                if (hour >= 12 && hour <= 15) {
                  tempFactor = 1; // Пик температуры днем
                } else if (hour >= 3 && hour <= 6) {
                  tempFactor = -1; // Минимум температуры ночью
                } else if ((hour >= 9 && hour < 12) || (hour > 15 && hour <= 18)) {
                  tempFactor = 0.5; // Переходные периоды
                } else {
                  tempFactor = -0.5; // Вечер и ночь
                }
                
                const tempSpread = forecast.temp_max - forecast.temp_min;
                const midTemp = (forecast.temp_max + forecast.temp_min) / 2;
                const temp = midTemp + tempFactor * (tempSpread / 2);
                
                // Определяем, день это или ночь
                const isDaytime = hour >= 6 && hour < 19;
                const hourIcon = baseIcon + (isDaytime ? 'd' : 'n');
                
                return {
                  hour,
                  temp: Math.round(temp),
                  icon: hourIcon,
                  description: forecast.description
                };
              });
            }
            
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
                // Для других дней - генерируем почасовые данные равномерно в течение суток
                const hoursArray = [0, 3, 6, 9, 12, 15, 18, 21]; // Фиксированный набор часов через каждые 3 часа
                return hoursArray.map(hour => {
                  // Вычисляем температуру на основе времени суток
                  // Самая низкая температура ночью (3-6), самая высокая днем (12-15)
                  let tempFactor = 0;
                  if (hour >= 12 && hour <= 15) {
                    tempFactor = 1; // Пик температуры днем
                  } else if (hour >= 3 && hour <= 6) {
                    tempFactor = -1; // Минимум температуры ночью
                  } else if ((hour >= 9 && hour < 12) || (hour > 15 && hour <= 18)) {
                    tempFactor = 0.5; // Переходные периоды
                  } else {
                    tempFactor = -0.5; // Вечер и ночь
                  }
                  
                  const tempSpread = forecast.temp_max - forecast.temp_min;
                  const midTemp = (forecast.temp_max + forecast.temp_min) / 2;
                  const temp = midTemp + tempFactor * (tempSpread / 2);
                  
                  // Определяем, день это или ночь, на основе часа
                  const isDaytime = hour >= 6 && hour < 19;
                  
                  // Формируем новую иконку с правильным суффиксом времени суток
                  const hourIcon = baseIcon + (isDaytime ? 'd' : 'n');
                  
                  return {
                    hour,
                    temp: Math.round(temp),
                    icon: hourIcon,
                    description: forecast.description
                  };
                });
              }
            } else if (data) {
              // Получаем ID текущего дня для сравнения
              const now = new Date();
              const today = now.toISOString().split('T')[0];
              const tomorrowDate = new Date(now);
              tomorrowDate.setDate(tomorrowDate.getDate() + 1);
              const tomorrowDateStr = tomorrowDate.toISOString().split('T')[0];
              const forecastDayStr = getDayId(forecast.date);
              
              // Проверяем, это сегодняшний или завтрашний день?
              const isToday = forecastDayStr === today;
              const isTomorrow = forecastDayStr === tomorrowDateStr;
              
              // Для сегодняшнего или завтрашнего дня всегда используем фиксированный набор часов
              if (isToday || isTomorrow) {
                console.log(`Генерируем часы для ${isToday ? 'сегодняшнего' : 'завтрашнего'} дня`, forecastDayStr);
                
                // Для сегодняшнего дня показываем часы начиная с текущего часа
                const startHour = isToday ? now.getHours() : 0;
                
                // Создаем полный массив часов с интервалом 3 часа
                const allHours = [0, 3, 6, 9, 12, 15, 18, 21];
                
                // Для сегодня фильтруем только будущие часы
                const hoursArray = isToday 
                  ? allHours.filter(h => h >= startHour) 
                  : allHours;
                
                // Если для сегодня не осталось часов, добавим текущий час
                if (isToday && hoursArray.length === 0) {
                  const currentHour = startHour;
                  hoursArray.push(currentHour);
                  
                  // Добавим еще оставшиеся часы с шагом 1 час
                  for (let h = currentHour + 1; h < 24; h++) {
                    hoursArray.push(h);
                    if (hoursArray.length >= 6) break; // не более 6 часов
                  }
                }
                
                // Получаем базовую иконку и описание
                const baseIcon = forecast.icon.replace(/[dn]$/, '');
                
                return hoursArray.map(hour => {
                  // Расчет температуры в зависимости от времени суток
                  let tempFactor = 0;
                  if (hour >= 12 && hour <= 15) {
                    tempFactor = 1; // Пик температуры днем
                  } else if (hour >= 3 && hour <= 6) {
                    tempFactor = -1; // Минимум температуры ночью
                  } else if ((hour >= 9 && hour < 12) || (hour > 15 && hour <= 18)) {
                    tempFactor = 0.5; // Переходные периоды
                  } else {
                    tempFactor = -0.5; // Вечер и ночь
                  }
                  
                  const tempSpread = forecast.temp_max - forecast.temp_min;
                  const midTemp = (forecast.temp_max + forecast.temp_min) / 2;
                  const temp = midTemp + tempFactor * (tempSpread / 2);
                  
                  // Определяем, день это или ночь
                  const isDaytime = hour >= 6 && hour < 19;
                  const hourIcon = baseIcon + (isDaytime ? 'd' : 'n');
                  
                  return {
                    hour,
                    temp: Math.round(temp),
                    icon: hourIcon,
                    description: forecast.description
                  };
                });
              }
              
              // Для других дней используем стандартную логику или генерируем часы если API не вернул
              const hourlyItems = getHourlyData(forecast.date);
              
              // Если API вернул данные, используем их
              if (hourlyItems.length > 0) {
                // Ограничиваем количество элементов для мобильных устройств
                return isMobile.current ? hourlyItems.slice(0, 12) : hourlyItems;
              } else {
                // Если API не вернул данные, генерируем фиксированные часы
                const hoursArray = [0, 3, 6, 9, 12, 15, 18, 21];
                
                return hoursArray.map(hour => {
                  // Имитируем изменение температуры в течение дня
                  let tempFactor = 0;
                  if (hour >= 12 && hour <= 15) {
                    tempFactor = 1; // Пик температуры днем
                  } else if (hour >= 3 && hour <= 6) {
                    tempFactor = -1; // Минимум температуры ночью
                  } else if ((hour >= 9 && hour < 12) || (hour > 15 && hour <= 18)) {
                    tempFactor = 0.5; // Переходные периоды
                  } else {
                    tempFactor = -0.5; // Вечер и ночь
                  }
                  
                  const tempSpread = forecast.temp_max - forecast.temp_min;
                  const midTemp = (forecast.temp_max + forecast.temp_min) / 2;
                  const temp = midTemp + tempFactor * (tempSpread / 2);
                  
                  // Определяем, день это или ночь
                  const isDaytime = hour >= 6 && hour < 19;
                  const baseIcon = forecast.icon.replace(/[dn]$/, '');
                  const hourIcon = baseIcon + (isDaytime ? 'd' : 'n');
                  
                  return {
                    hour,
                    temp: Math.round(temp),
                    icon: hourIcon,
                    description: forecast.description
                  };
                });
              }
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
                    loading="eager" 
                    width="50"
                    height="50"
                    fetchPriority="high"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Всего одна попытка перезагрузки
                      if (!target.src.includes('?retry=true')) {
                        target.src = `${iconUrlMemo(forecast.icon, true, forecast.description)}?retry=true`;
                      } else {
                        // Если повторная загрузка не удалась, показываем текстовую замену
                        target.style.display = 'none';
                        const container = target.parentElement;
                        if (container) {
                          const fallback = document.createElement('div');
                          fallback.className = 'forecast__icon-fallback';
                          fallback.textContent = forecast.description.slice(0, 1).toUpperCase();
                          container.appendChild(fallback);
                        }
                      }
                    }}
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
                            <span className="forecast__hourly-hour">{hour.hour.toString().padStart(2, '0')}:00</span>
                            <img 
                              src={iconUrlMemo(hour.icon, false, hour.description)} 
                              alt={hour.description} 
                              className="forecast__hourly-icon"
                              loading={idx < 4 ? "eager" : "lazy"}
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