import { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Добавляем ref для отслеживания текущих координат
  const currentCoordsRef = useRef<{lat: number, lon: number} | null>(null);
  // Добавляем ref для отслеживания текущего города
  const currentCityRef = useRef<string | null>(null);
  // Добавляем ref для предотвращения повторной загрузки при ошибке
  const isLoadingRef = useRef<boolean>(false);
  // Добавляем ref для отслеживания времени последнего обновления геолокации
  const lastGeoLocationTimeRef = useRef<number>(Date.now());
  // Константа для ограничения времени между обновлениями геолокации (10 минут в миллисекундах)
  const GEO_UPDATE_INTERVAL = 10 * 60 * 1000;
  
  // Используем useCallback для предотвращения пересоздания функций
  const updateWeatherData = useCallback((data: WeatherData) => {
    if (data.coord) {
      // Сохраняем текущие координаты в ref
      currentCoordsRef.current = {
        lat: parseFloat(data.coord.lat.toFixed(2)),
        lon: parseFloat(data.coord.lon.toFixed(2))
      };
      // Сохраняем текущий город в ref
      currentCityRef.current = data.name;
    }
    setWeatherData(data);
  }, []);
  
  // Функция для получения погоды по названию города
  const fetchWeatherByCity = useCallback(async (city: string) => {
    // Предотвращаем повторную загрузку при активной загрузке
    if (isLoadingRef.current) return;
    
    // Проверяем, что город написан на русском языке
    const russianRegex = /^[а-яА-ЯёЁ\s-]+$/;
    if (!russianRegex.test(city)) {
      setError('Пожалуйста, введите название города на русском языке');
      return;
    }
    
    // Проверяем, не тот же ли это город, что уже отображается
    if (currentCityRef.current?.toLowerCase() === city.toLowerCase()) {
      console.log('Тот же город, пропускаем запрос');
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      
      const weatherData = await getWeatherByCity(city);
      const forecastData = await getForecastByCity(city);
      
      updateWeatherData(weatherData);
      setForecastData(transformForecastData(forecastData));
      setOriginalForecastData(forecastData);
    } catch (error: any) {
      console.error('Ошибка при получении данных:', error);
      
      if (error.response && error.response.status === 401) {
        setError('Ошибка авторизации API. Пожалуйста, проверьте ваш API ключ.');
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
      isLoadingRef.current = false;
    }
  }, [updateWeatherData]);

  // Функция для получения погоды по геолокации
  const fetchWeatherByLocation = useCallback(async () => {
    // Предотвращаем повторную загрузку при активной загрузке
    if (isLoadingRef.current) return;
    
    // Проверка на наличие геолокации в браузере
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером');
      return;
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
      setError('Для определения местоположения, пожалуйста, откройте сайт в браузере.');
      return;
    } else if (isMobileApp) {
      setError('Для определения местоположения откройте сайт в браузере, а не во встроенном просмотрщике.');
      return;
    }
    
    let position: GeolocationPosition;
    
    try {
      // Получаем координаты без изменения состояния loading пока не убедимся, что координаты изменились
      position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const geoTimeout = setTimeout(() => {
          reject(new Error('Превышено время ожидания геолокации. Пожалуйста, попробуйте снова.'));
        }, 10000);
        
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
      const newLat = parseFloat(latitude.toFixed(2));
      const newLon = parseFloat(longitude.toFixed(2));
      
      // Проверяем, не те же ли это координаты, что у текущего города
      if (currentCoordsRef.current) {
        const { lat: currentLat, lon: currentLon } = currentCoordsRef.current;
        
        // Если координаты совпадают с допустимой погрешностью, проверяем временной интервал
        if (Math.abs(currentLat - newLat) < 0.05 && Math.abs(currentLon - newLon) < 0.05) {
          const now = Date.now();
          const timeSinceLastUpdate = now - lastGeoLocationTimeRef.current;
          
          // Если прошло меньше 10 минут с последнего обновления, пропускаем обновление
          if (timeSinceLastUpdate < GEO_UPDATE_INTERVAL) {
            console.log('Местоположение не изменилось и прошло менее 10 минут, пропускаем обновление');
            return;
          } else {
            console.log('Прошло более 10 минут с последнего обновления, обновляем данные');
            // Продолжаем обновление
          }
        }
      }
      
      // Обновляем время последнего обновления геолокации
      lastGeoLocationTimeRef.current = Date.now();
      
      // Только если координаты изменились или прошло достаточно времени, показываем состояние загрузки и обновляем данные
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      
      // Получаем текущую погоду
      const newWeatherData = await getWeatherByCoords(latitude, longitude);
      updateWeatherData(newWeatherData);
      
      // Получаем прогноз
      const forecastData = await getForecastByCoords(latitude, longitude);
      const processedForecasts = transformForecastData(forecastData);
      setForecastData(processedForecasts);
      setOriginalForecastData(forecastData);
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
      isLoadingRef.current = false;
    }
  }, [updateWeatherData]);

  // При первой загрузке страницы пытаемся определить местоположение
  useEffect(() => {
    fetchWeatherByLocation();
  }, [fetchWeatherByLocation]);

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
