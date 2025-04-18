import { useState, useEffect } from 'react';
import { WeatherData, ForecastData, DailyForecast } from './types';
import { 
  getWeatherByCity, 
  getWeatherByCoords, 
  getForecastByCity, 
  getForecastByCoords,
  transformForecastData
} from './utils/api';

// Компоненты
import Search from './components/Search';
import WeatherCard from './components/WeatherCard';
import Forecast from './components/Forecast';
import Loader from './components/Loader';
import WeatherBackground from './components/WeatherBackground';

// Стили
import './styles/index.scss';

function App() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<DailyForecast[]>([]);
  const [originalForecastData, setOriginalForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Функция для получения погоды по названию города
  const fetchWeatherByCity = async (city: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Проверяем, что город написан на русском языке
      const russianRegex = /^[а-яА-ЯёЁ\s-]+$/;
      if (!russianRegex.test(city)) {
        throw new Error('Пожалуйста, введите название города на русском языке');
      }
      
      const weatherData = await getWeatherByCity(city);
      const forecastData = await getForecastByCity(city);
      
      setWeatherData(weatherData);
      setForecastData(transformForecastData(forecastData));
      setOriginalForecastData(forecastData); // Сохраняем оригинальные данные
    } catch (error: any) {
      console.error('Ошибка при получении данных:', error);
      if (error.response && error.response.status === 401) {
        setError('Ошибка авторизации API. Пожалуйста, проверьте ваш API ключ в файле api.ts или зарегистрируйте новый ключ на openweathermap.org.');
      } else if (error.message && error.message.includes('введите название конкретного города')) {
        setError(error.message);
      } else if (error.response && error.response.status === 404) {
        setError('Город не найден. Пожалуйста, проверьте правильность названия.');
      } else if (error.message && error.message.includes('на русском языке')) {
        setError(error.message);
      } else {
        setError('Не удалось загрузить данные о погоде. Проверьте название города.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Функция для получения погоды по геолокации
  const fetchWeatherByLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Геолокация не поддерживается вашим браузером');
      }
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const { latitude, longitude } = position.coords;
      const weatherData = await getWeatherByCoords(latitude, longitude);
      const forecastData = await getForecastByCoords(latitude, longitude);
      
      setWeatherData(weatherData);
      setForecastData(transformForecastData(forecastData));
      setOriginalForecastData(forecastData); // Сохраняем оригинальные данные
    } catch (error: any) {
      console.error('Ошибка при получении геолокации:', error);
      if (error.response && error.response.status === 401) {
        setError('Ошибка авторизации API. Пожалуйста, проверьте ваш API ключ в файле api.ts или зарегистрируйте новый ключ на openweathermap.org.');
      } else {
        setError('Не удалось определить ваше местоположение. Пожалуйста, введите город вручную.');
      }
    } finally {
      setLoading(false);
    }
  };

  // При первой загрузке страницы пытаемся определить местоположение
  useEffect(() => {
    fetchWeatherByLocation();
  }, []);

  // Эффект для автоматического скрытия сообщения об ошибке через 3 секунды
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <>
      <WeatherBackground weatherData={weatherData} />
      
      <div className="container">
        <header>
          <Search 
            onSearch={fetchWeatherByCity} 
            onLocationSearch={fetchWeatherByLocation}
            isLoading={loading}
          />
        </header>
        
        <main>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {loading ? (
            <Loader />
          ) : weatherData ? (
            <>
              <WeatherCard weatherData={weatherData} />
              {forecastData.length > 0 && (
                <Forecast 
                  dailyForecasts={forecastData} 
                  data={originalForecastData || undefined} 
                />
              )}
            </>
          ) : null}
        </main>
      </div>
    </>
  );
}

export default App;
