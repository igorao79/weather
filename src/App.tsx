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
    try {
      setLoading(true);
      setError(null);
      
      // Проверка на наличие геолокации в браузере
      if (!navigator.geolocation) {
        throw new Error('Геолокация не поддерживается вашим браузером');
      }
      
      // Более точная проверка на WebView (Telegram и другие)
      const ua = navigator.userAgent;
      const isMobileApp = /WebView|TelegramWebApp|Instagram|FB(AN|AV)|Line|KAKAOTALK|NAVER|trill|zalo|zalaupdate/i.test(ua);
      const isInAppBrowser = /TelegramWebViewProxy/i.test(navigator.userAgent) || 
                             window.hasOwnProperty('TelegramWebviewProxy') ||
                             document.referrer.includes('t.me') ||
                             document.referrer.includes('telegram.me') ||
                             /Telegram/i.test(document.referrer);
      
      // Более точная проверка на Telegram
      const isTelegram = isInAppBrowser || 
                         /Telegram/i.test(ua) || 
                         (window as any).Telegram || 
                         (window as any).TelegramWebviewProxy;
      
      // Для Telegram показываем специальное сообщение
      if (isTelegram) {
        throw new Error('Для определения местоположения, пожалуйста, откройте сайт в браузере. Приложение Telegram не предоставляет доступ к геолокации.');
      } else if (isMobileApp) {
        throw new Error('Для определения местоположения откройте сайт в браузере, а не во встроенном просмотрщике.');
      }
      
      // Получаем текущую позицию с таймаутом
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const geoTimeout = setTimeout(() => {
          reject(new Error('Превышено время ожидания геолокации. Пожалуйста, попробуйте снова.'));
        }, 10000); // 10 секунд таймаут
        
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(geoTimeout);
            resolve(pos);
          },
          (err) => {
            clearTimeout(geoTimeout);
            reject(err);
          },
          { 
            enableHighAccuracy: true, 
            timeout: 5000, 
            maximumAge: 0 
          }
        );
      });
      
      const { latitude, longitude } = position.coords;
      
      // Получаем текущую погоду
      const weatherData = await getWeatherByCoords(latitude, longitude);
      setWeatherData(weatherData);
      
      // Получаем прогноз
      const forecastData = await getForecastByCoords(latitude, longitude);
      const processedForecasts = transformForecastData(forecastData);
      setForecastData(processedForecasts);
      setOriginalForecastData(forecastData); // Сохраняем оригинальные данные
    } catch (err: any) {
      console.error('Ошибка при получении погоды по геолокации:', err);
      
      if (err.code === 1) {
        setError('Для определения вашего местоположения необходимо предоставить разрешение на использование геолокации.');
      } else if (err.code === 2) {
        setError('Не удалось определить ваше местоположение. Проверьте, включена ли у вас геолокация.');
      } else if (err.code === 3) {
        setError('Превышено время ожидания при определении местоположения. Пожалуйста, попробуйте снова.');
      } else {
        setError(err.message || 'Произошла ошибка при определении местоположения.');
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
