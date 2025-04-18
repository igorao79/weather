import React from 'react';
import '../styles/components/weather-card.scss';
import { WeatherData } from '../types';

interface WeatherCardProps {
  weatherData: WeatherData;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weatherData }) => {
  const [currentTime, setCurrentTime] = React.useState<string>('');
  const [mapUrl, setMapUrl] = React.useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = React.useState<boolean>(false);

  // Обновление времени с учетом часового пояса города
  React.useEffect(() => {
    const updateDateTime = () => {
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
      const hours = String(cityTime.getHours()).padStart(2, '0');
      const minutes = String(cityTime.getMinutes()).padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      setCurrentTime(timeString);
    };
    
    // Обновляем сразу и затем каждую минуту
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    
    return () => clearInterval(interval);
  }, [weatherData.timezone]);

  // Загружаем карту города при изменении координат
  React.useEffect(() => {
    const loadCityMap = () => {
      try {
        setIsMapLoading(true);
        
        const { lat, lon } = weatherData.coord;
        
        // Создаем URL для OpenStreetMap (с указателем на город)
        // Формат: lon1,lat1,lon2,lat2
        const delta = 0.03; // Немного увеличиваем дельту для лучшего обзора
        const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
        
        // Альтернативный URL с маркером местоположения и увеличенным зумом
        const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
        
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
      loadCityMap();
    } else {
      setMapUrl(null);
      setIsMapLoading(false);
    }
  }, [weatherData.coord]);

  // Получаем дату в городе с учетом часового пояса
  const getCityDate = () => {
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
  };
  
  // Температура уже в Цельсиях (API возвращает метрические единицы)
  const tempC = Math.round(weatherData.main.temp);
  
  // Получаем URL иконки погоды
  const iconUrl = `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;
  
  // Форматируем дату с учетом часового пояса города
  const formattedDate = getCityDate();

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
        <div className="weather-card__icon">
          <img 
            src={iconUrl} 
            alt={weatherData.weather[0].description} 
          />
        </div>
        
        <div className="weather-card__temp">
          {tempC}
          <span className="weather-card__temp-unit">°C</span>
        </div>
        
        <div className="weather-card__description">
          {weatherData.weather[0].description.charAt(0).toUpperCase() + weatherData.weather[0].description.slice(1)}
        </div>
        
        <div className="weather-card__details">
          <div className="weather-card__detail">
            <span className="weather-card__detail-label">Ощущается как</span>
            <span className="weather-card__detail-value">{Math.round(weatherData.main.feels_like)}°C</span>
          </div>
          
          <div className="weather-card__detail">
            <span className="weather-card__detail-label">Мин/Макс</span>
            <span className="weather-card__detail-value">{Math.round(weatherData.main.temp_min)}°C / {Math.round(weatherData.main.temp_max)}°C</span>
          </div>
          
          <div className="weather-card__detail">
            <span className="weather-card__detail-label">Влажность</span>
            <span className="weather-card__detail-value">{weatherData.main.humidity}%</span>
          </div>
          
          <div className="weather-card__detail">
            <span className="weather-card__detail-label">Ветер</span>
            <span className="weather-card__detail-value">{Math.round(weatherData.wind.speed)} м/с</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard; 