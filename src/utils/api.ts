import axios from 'axios';
import { WeatherData, ForecastData, DailyForecast } from '../types';

// Используйте свой ключ API. Рекомендуется хранить его в .env файле для безопасности
const API_KEY = 'b1b15e88fa797225412429c1c50c122a1'; // Тестовый ключ из документации OpenWeatherMap

// Альтернативные API URL для использования с VPN
const API_FALLBACK_URLS = [
  'https://api.openweathermap.org/data/2.5', // Основной URL
  'https://openweathermap.org/data/2.5', // Альтернативный URL
  'https://pro.openweathermap.org/data/2.5' // Еще один альтернативный URL
];

// Функция для попыток запроса к разным URL при ошибке
async function fetchWithFallback(path: string, params: any): Promise<any> {
  let lastError;
  for (const baseUrl of API_FALLBACK_URLS) {
    try {
      const response = await axios.get(`${baseUrl}/${path}`, { params });
      return response.data;
    } catch (error: any) {
      console.log(`Ошибка запроса к ${baseUrl}: ${error.message}`);
      lastError = error;
      
      // Если это не проблема сети, а ошибка API, не пытаемся другие URL
      if (error.response && error.response.status !== 0) {
        throw error;
      }
      
      // Иначе пробуем следующий URL
    }
  }
  
  // Если все URL не сработали, выбрасываем последнюю ошибку
  throw lastError;
}

// Только русские названия стран и территорий для проверки
const INVALID_QUERIES = [
  'россия', 'украина', 'белоруссия', 'беларусь', 'казахстан', 'узбекистан',
  'сша', 'соединенные штаты', 'великобритания', 'англия', 'германия', 'франция', 
  'италия', 'испания', 'китай', 'япония', 'австралия', 'бразилия', 'индия',
  'сибирь', 'урал', 'кавказ', 'восточная европа', 'западная европа', 'африка', 
  'азия', 'америка', 'евразия'
];

// Функция для проверки, является ли запрос страной или слишком общим
export const isInvalidCityQuery = (query: string): boolean => {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Проверка на русский язык
  const russianRegex = /^[а-яА-ЯёЁ\s-]+$/;
  if (!russianRegex.test(normalizedQuery)) {
    return true; // Недопустимый запрос, если не на русском
  }
  
  // Проверка на страну или регион
  if (INVALID_QUERIES.includes(normalizedQuery)) {
    return true;
  }
  
  return false;
};

// Функция для получения погоды по названию города
export const getWeatherByCity = async (city: string): Promise<WeatherData> => {
  try {
    // Сначала проверим, что запрос на русском и это не страна/регион
    if (isInvalidCityQuery(city)) {
      if (!/^[а-яА-ЯёЁ\s-]+$/.test(city)) {
        throw new Error('RUSSIAN_ONLY');
      } else {
        throw new Error('COUNTRY_OR_GENERAL_QUERY');
      }
    }
    
    // Используем fetchWithFallback вместо прямого запроса
    const data = await fetchWithFallback('weather', {
      q: city,
      appid: API_KEY,
      units: 'metric',
      lang: 'ru'
    });
    
    return data;
  } catch (error: any) {
    if (error.message === 'COUNTRY_OR_GENERAL_QUERY') {
      throw new Error('Пожалуйста, введите название конкретного города, а не страны или региона');
    } else if (error.message === 'RUSSIAN_ONLY') {
      throw new Error('Пожалуйста, введите название города на русском языке');
    }
    console.error('Ошибка при получении погоды по городу:', error);
    throw error;
  }
};

// Функция для получения погоды по координатам
export const getWeatherByCoords = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    // Используем fetchWithFallback вместо прямого запроса
    const data = await fetchWithFallback('weather', {
      lat,
      lon,
      appid: API_KEY,
      units: 'metric',
      lang: 'ru'
    });
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении погоды по координатам:', error);
    throw error;
  }
};

// Функция для получения прогноза на 5 дней
export const getForecastByCity = async (city: string): Promise<ForecastData> => {
  try {
    // Используем fetchWithFallback вместо прямого запроса
    const data = await fetchWithFallback('forecast', {
      q: city,
      appid: API_KEY,
      units: 'metric',
      lang: 'ru'
    });
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении прогноза по городу:', error);
    throw error;
  }
};

// Функция для получения прогноза по координатам
export const getForecastByCoords = async (lat: number, lon: number): Promise<ForecastData> => {
  try {
    // Используем fetchWithFallback вместо прямого запроса
    const data = await fetchWithFallback('forecast', {
      lat,
      lon,
      appid: API_KEY,
      units: 'metric',
      lang: 'ru'
    });
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении прогноза по координатам:', error);
    throw error;
  }
};

// Преобразование прогноза в ежедневный формат
export const transformForecastData = (forecast: ForecastData): DailyForecast[] => {
  // Группировка по дням
  const dailyData: { [key: string]: any } = {};
  
  forecast.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toISOString().split('T')[0];
    
    if (!dailyData[day]) {
      dailyData[day] = {
        temps: [],
        icons: {},
        date
      };
    }
    
    dailyData[day].temps.push(item.main.temp);
    
    // Считаем частоту появления иконки
    const icon = item.weather[0].icon;
    dailyData[day].icons[icon] = (dailyData[day].icons[icon] || 0) + 1;
  });
  
  // Преобразование в массив и выбор наиболее частой иконки
  return Object.keys(dailyData).slice(0, 6).map(day => {
    const data = dailyData[day];
    const dayName = new Date(day).toLocaleDateString('ru-RU', { weekday: 'short' });
    
    // Находим наиболее частую иконку
    let maxCount = 0;
    let mostFrequentIcon = '';
    let description = '';
    
    for (const icon in data.icons) {
      if (data.icons[icon] > maxCount) {
        maxCount = data.icons[icon];
        mostFrequentIcon = icon;
        // Берем описание из первого элемента с данной иконкой
        const forecastItem = forecast.list.find(item => item.weather[0].icon === icon);
        description = forecastItem ? forecastItem.weather[0].description : '';
      }
    }
    
    // Расчет макс и мин температуры
    const temps = data.temps;
    const temp_max = Math.max(...temps);
    const temp_min = Math.min(...temps);
    
    return {
      day: dayName,
      date: data.date,
      temp_max,
      temp_min,
      icon: mostFrequentIcon,
      description
    };
  });
}; 