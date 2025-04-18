import React, { useState, useEffect } from 'react';
import { ForecastData, DailyForecast } from '../types';
import '../styles/components/forecast.scss';

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

const Forecast: React.FC<ForecastProps> = ({ data, dailyForecasts }) => {
  // Состояние для отслеживания наведения на карточку
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  // Состояние для определения типа устройства
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Проверка мобильного устройства
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Проверяем при загрузке
    checkIfMobile();
    
    // Добавляем слушатель для изменения размера
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // Используем переданные dailyForecasts, если они есть, иначе обрабатываем data
  const processedForecasts = dailyForecasts || getDailyForecasts();
  
  // Получаем почасовые данные для конкретного дня
  const getHourlyData = (date: Date): HourlyWeatherData[] => {
    if (!data || !data.list) return [];
    
    const targetDate = new Date(date).toISOString().split('T')[0];
    
    // Фильтруем данные для выбранного дня
    return data.list.filter(item => {
      const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
      return itemDate === targetDate;
    }).map(item => {
      const itemDate = new Date(item.dt * 1000);
      return {
        hour: itemDate.getHours(),
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon,
        description: item.weather[0].description
      };
    });
  };
  
  // Группировка прогноза по дням
  function getDailyForecasts() {
    const dailyData: Record<string, any> = {};
    
    // Проверяем, что данные существуют перед их обработкой
    if (!data || !data.list || !Array.isArray(data.list)) {
      return [];
    }
    
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
      
      // Считаем частоту погодных условий
      const icon = item.weather[0].icon;
      const condition = item.weather[0].description;
      dailyData[day].icons[icon] = (dailyData[day].icons[icon] || 0) + 1;
      dailyData[day].conditions.push(condition);
    });
    
    // Преобразуем в массив и берем только первые 5 дней
    return Object.keys(dailyData).slice(0, 5).map(day => {
      const data = dailyData[day];
      const dayName = new Date(day).toLocaleDateString('ru-RU', { weekday: 'short' });
      
      // Находим наиболее частую иконку
      let maxCount = 0;
      let mostFrequentIcon = '';
      let mostFrequentCondition = '';
      
      for (const icon in data.icons) {
        if (data.icons[icon] > maxCount) {
          maxCount = data.icons[icon];
          mostFrequentIcon = icon;
        }
      }
      
      // Находим наиболее частое описание погоды
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
      
      // Расчет макс и мин температуры
      const temp_max = Math.max(...data.temps);
      const temp_min = Math.min(...data.temps);
      
      return {
        day: dayName,
        date: data.date,
        temp_max,
        temp_min,
        icon: mostFrequentIcon,
        description: mostFrequentCondition
      };
    });
  };

  // Если нет данных, показываем соответствующее сообщение
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

  // Функция для получения уникального ID дня для отслеживания наведения
  const getDayId = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Обработчики событий для мобильных устройств
  const handleItemClick = (dayId: string) => {
    if (isMobile) {
      // Если уже выбран этот день, сбрасываем, иначе выбираем
      setHoveredDay(hoveredDay === dayId ? null : dayId);
    }
  };

  return (
    <div className="forecast">
      <h2 className="forecast__title">5-дневный прогноз</h2>
      <div className="forecast__list">
        {processedForecasts.map((forecast, index) => {
          const dayId = getDayId(forecast.date);
          const isHovered = hoveredDay === dayId;
          let hourlyData: HourlyWeatherData[] = [];
          
          // Если используется dailyForecasts, но нет оригинальных данных прогноза
          if (dailyForecasts && !data && isHovered) {
            // Генерируем фейковые данные по часам на основе температуры дня
            hourlyData = Array.from({ length: 8 }).map((_, idx) => {
              const hour = 3 + idx * 3; // генерируем часы от 3 до 24 с интервалом в 3 часа
              // колебание температуры в течение дня
              const tempVariation = Math.sin(hour / 24 * Math.PI) * 3;
              const midTemp = (forecast.temp_max + forecast.temp_min) / 2;
              return {
                hour,
                temp: Math.round(midTemp + tempVariation),
                icon: forecast.icon,
                description: forecast.description
              };
            });
          } else if (isHovered && data) {
            hourlyData = getHourlyData(forecast.date);
          }
          
          return (
            <div 
              key={index} 
              className={`forecast__item ${isHovered ? 'forecast__item--expanded' : ''}`}
              onMouseEnter={() => !isMobile && setHoveredDay(dayId)}
              onMouseLeave={() => !isMobile && setHoveredDay(null)}
              onClick={() => handleItemClick(dayId)}
            >
              <div className="forecast__item-content">
                <div className="forecast__day">{forecast.day}</div>
                <div className="forecast__icon">
                  <img 
                    src={`https://openweathermap.org/img/wn/${forecast.icon}@2x.png`} 
                    alt={forecast.description} 
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
                              src={`https://openweathermap.org/img/wn/${hour.icon}.png`} 
                              alt={hour.description} 
                              className="forecast__hourly-icon"
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
};

export default Forecast; 