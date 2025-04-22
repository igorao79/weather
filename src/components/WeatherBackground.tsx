import React, { useMemo, useEffect, useState } from 'react';
import { WeatherData } from '../types';

interface WeatherBackgroundProps {
  weatherData: WeatherData | null;
}

// Helper function to determine time of day
const getTimeOfDay = (weatherData: WeatherData): 'day' | 'night' | 'evening' | 'morning' => {
  if (!weatherData) return 'day';
  
  const now = new Date();
  
  // Adjust for timezone
  const localOffset = -now.getTimezoneOffset();
  const cityOffset = weatherData.timezone;
  const offsetDiff = (cityOffset / 60 - localOffset) * 60 * 1000;
  const cityTime = new Date(now.getTime() + offsetDiff);
  
  const hours = cityTime.getHours();
  
  if (hours >= 5 && hours < 10) return 'morning';
  if (hours >= 10 && hours < 17) return 'day';
  if (hours >= 17 && hours < 21) return 'evening';
  return 'night';
};

// Helper function to determine weather condition
const getWeatherCondition = (weatherData: WeatherData): 'clear' | 'clouds' | 'rain' | 'snow' | 'storm' | 'mist' => {
  if (!weatherData || !weatherData.weather || !weatherData.weather[0]) {
    return 'clear';
  }
  
  const id = weatherData.weather[0].id;
  
  // Weather condition codes from OpenWeatherMap API
  // https://openweathermap.org/weather-conditions
  if (id >= 200 && id < 300) return 'storm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'mist';
  if (id === 800) return 'clear';
  if (id > 800) return 'clouds';
  
  return 'clear';
};

// Обнаружение мобильных устройств для упрощения анимаций
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile(); // Проверка при монтировании
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

// Уменьшим количество элементов в анимациях для мобильных устройств
const getReducedCount = (baseCount: number, isMobile: boolean): number => {
  return isMobile ? Math.floor(baseCount * 0.4) : baseCount;
};

// Component for sun effect
const SunEffect = ({ intensity = 1 }) => {
  return (
    <div className="weather-animation__sun" style={{ 
      opacity: intensity,
      top: '15%',
      left: '15%',
      zIndex: 2
    }}>
      <div className="weather-animation__sun-circle" style={{ 
        width: '90px', 
        height: '90px',
        boxShadow: intensity > 0.8 ? '0 0 60px 30px rgba(255, 220, 122, 0.7)' : '0 0 40px 20px rgba(255, 220, 122, 0.6)'
      }}></div>
      <div className="weather-animation__sun-rays"></div>
      <div className="weather-animation__sun-flare"></div>
    </div>
  );
};

// Component for moon effect
const MoonEffect = () => {
  return (
    <div className="weather-animation__moon" style={{ 
      width: '100px', 
      height: '100px',
      top: '15%',
      right: '15%',
      zIndex: 2
    }}>
      <div className="weather-animation__moon-circle" style={{ 
        boxShadow: '0 0 30px 15px var(--moon-glow)'
      }}></div>
      <div className="weather-animation__moon-craters"></div>
    </div>
  );
};

// Component for raining effect
const RainEffect = () => {
  const isMobile = useIsMobile();
  const raindropCount = getReducedCount(150, isMobile);
  
  const raindrops = useMemo(() => {
    return Array.from({ length: raindropCount }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: 0.5 + Math.random() * 0.5,
      delay: Math.random() * 5,
      opacity: 0.5 + Math.random() * 0.5,
    }));
  }, [raindropCount]);
  
  return (
    <div className="weather-animation__rain">
      {raindrops.map((drop) => (
        <div
          key={drop.id}
          className="weather-animation__raindrop"
          style={{
            left: drop.left,
            animationDuration: `${drop.duration}s`,
            animationDelay: `${drop.delay}s`,
            opacity: drop.opacity,
          }}
        />
      ))}
    </div>
  );
};

// Component for snow effect
const SnowEffect = () => {
  const isMobile = useIsMobile();
  const snowflakeCount = getReducedCount(80, isMobile);
  
  const snowflakes = useMemo(() => {
    return Array.from({ length: snowflakeCount }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 5,
      duration: 5 + Math.random() * 10,
      delay: Math.random() * 5,
      opacity: 0.7 + Math.random() * 0.3,
    }));
  }, [snowflakeCount]);
  
  return (
    <div className="weather-animation__snow">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="weather-animation__snowflake"
          style={{
            left: flake.left,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            opacity: flake.opacity,
          }}
        />
      ))}
    </div>
  );
};

// Component for clouds effect with continuous cloud generation
const CloudsEffect = ({ density = 'normal', immediate = false, isSunBehind = false }) => {
  const isMobile = useIsMobile();
  
  // Create cloud groups with different speeds and positions
  const cloudGroups = useMemo(() => {
    // Determine how many clouds based on density
    const baseCounts = { heavy: 15, normal: 10, light: 5 };
    const countKey = density as keyof typeof baseCounts;
    const baseCount = baseCounts[countKey] || 10;
    const count = getReducedCount(baseCount, isMobile);
    
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: `${5 + Math.random() * 50}%`,
      // Clouds start from outside the screen (left side)
      left: immediate ? `${Math.random() * 80}%` : `-${20 + Math.random() * 30}%`,
      // Увеличиваем прозрачность облаков, чтобы солнце/луна были лучше видны
      opacity: isSunBehind ? (0.4 + Math.random() * 0.2) : (0.3 + Math.random() * 0.3),
      scale: 0.3 + Math.random() * 1.2,
      duration: 60 + Math.random() * 80, // Slower movement for smoother appearance
      delay: immediate ? 0 : Math.random() * 40,
      // Более низкий z-index для облаков
      zIndex: 1,
      // Brighter clouds when sun is behind
      brightness: isSunBehind ? 1.5 : 1,
    }));
  }, [density, immediate, isMobile, isSunBehind]);
  
  return (
    <div className="weather-animation__clouds">
      {cloudGroups.map((cloud) => (
        <div
          key={cloud.id}
          className={`weather-animation__cloud ${isSunBehind ? 'weather-animation__cloud--bright' : ''}`}
          style={{
            top: cloud.top,
            left: cloud.left,
            opacity: cloud.opacity,
            transform: `scale(${cloud.scale})`,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
            zIndex: cloud.zIndex,
            filter: isSunBehind ? `brightness(${cloud.brightness})` : 'none',
          }}
        />
      ))}
    </div>
  );
};

// Component for stars effect
const StarsEffect = ({ density = 'normal' }) => {
  const isMobile = useIsMobile();
  
  const stars = useMemo(() => {
    const baseCounts = { heavy: 200, normal: 100, light: 50 };
    const countKey = density as keyof typeof baseCounts;
    const baseCount = baseCounts[countKey] || 100;
    const count = getReducedCount(baseCount, isMobile);
    
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 3,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      twinkleType: Math.floor(Math.random() * 3), // Different twinkling patterns
    }));
  }, [density, isMobile]);
  
  return (
    <div className="weather-animation__stars">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`weather-animation__star weather-animation__star--type-${star.twinkleType}`}
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// Component for lightning effect
const LightningEffect = () => {
  const isMobile = useIsMobile();
  const boltCount = getReducedCount(3, isMobile) || 1; // Минимум 1 молния
  
  const bolts = useMemo(() => {
    return Array.from({ length: boltCount }).map((_, i) => ({
      id: i,
      left: `${20 + Math.random() * 60}%`,
      height: 100 + Math.random() * 200,
      width: 3 + Math.random() * 10,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 5,
    }));
  }, [boltCount]);
  
  return (
    <div className="weather-animation__lightning">
      {bolts.map((bolt) => (
        <div
          key={bolt.id}
          className="weather-animation__bolt"
          style={{
            left: bolt.left,
            height: `${bolt.height}px`,
            width: `${bolt.width}px`,
            animationDelay: `${bolt.delay}s`,
            animationDuration: `${bolt.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

// Component for mist effect
const MistEffect = () => {
  const isMobile = useIsMobile();
  const mistLayerCount = getReducedCount(5, isMobile) || 2; // Минимум 2 слоя тумана
  
  const mistLayers = useMemo(() => {
    return Array.from({ length: mistLayerCount }).map((_, i) => ({
      id: i,
      top: `${10 + i * (100 / mistLayerCount)}%`,
      opacity: 0.2 + Math.random() * 0.3,
      speed: 100 + Math.random() * 200,
      delay: Math.random() * 5,
    }));
  }, [mistLayerCount]);
  
  return (
    <div className="weather-animation__mist">
      {mistLayers.map((layer) => (
        <div
          key={layer.id}
          className="weather-animation__mist-layer"
          style={{
            top: layer.top,
            opacity: layer.opacity,
            animationDuration: `${layer.speed}s`,
            animationDelay: `${layer.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ weatherData }) => {
  const isMobile = useIsMobile();
  
  // Clear any lingering sun/moon elements when weather data changes
  useEffect(() => {
    if (weatherData) {
      // Force cleanup of any lingering celestial elements
      const clearElements = () => {
        // Remove any extra sun or moon elements if more than one exists
        const suns = document.querySelectorAll('.weather-animation__sun');
        if (suns.length > 1) {
          for (let i = 1; i < suns.length; i++) {
            suns[i].parentNode?.removeChild(suns[i]);
          }
        }
        
        const moons = document.querySelectorAll('.weather-animation__moon');
        if (moons.length > 1) {
          for (let i = 1; i < moons.length; i++) {
            moons[i].parentNode?.removeChild(moons[i]);
          }
        }
      };
      
      // Run cleanup after a short delay to ensure new elements are in place
      const timerId = setTimeout(clearElements, 100);
      return () => clearTimeout(timerId);
    }
  }, [weatherData?.name, weatherData?.weather?.[0]?.id]);
  
  if (!weatherData) return null;
  
  const timeOfDay = getTimeOfDay(weatherData);
  const weatherCondition = getWeatherCondition(weatherData);
  
  // Always show some clouds for clear conditions except at night
  const shouldShowClouds = weatherCondition === 'clear' && timeOfDay !== 'night';
  
  // Determine if we need immediately visible elements (for clear skies)
  const needsImmediateElements = weatherCondition === 'clear' && 
    (timeOfDay === 'morning' || timeOfDay === 'day');
  
  // Determine sun intensity based on time of day
  const sunIntensity = timeOfDay === 'morning' ? 1 : 
                       timeOfDay === 'day' ? 1 : 
                       timeOfDay === 'evening' ? 0.7 : 0;
  
  // На мобильных устройствах уменьшаем количество эффектов для повышения производительности
  const showSunMoon = !isMobile || ['clear', 'clouds'].includes(weatherCondition);
  
  // Проверка, нужно ли показывать солнце в зависимости от погодных условий
  const shouldShowSun = weatherCondition === 'clear' || weatherCondition === 'clouds';
  
  // Определяем, нужно ли показывать солнце за облаками
  const showSunBehindClouds = weatherCondition === 'clouds';
  
  // Определяем, показывать ли солнце или луну, но не оба сразу
  const showSun = showSunMoon && (timeOfDay === 'day' || timeOfDay === 'morning' || 
    (timeOfDay === 'evening' && weatherCondition === 'clear')) && shouldShowSun;
  
  const showMoon = showSunMoon && (timeOfDay === 'night' || 
    (timeOfDay === 'evening' && !showSun)); // Показываем луну вечером, только если не показываем солнце
  
  return (
    <div className={`weather-background weather-background--${weatherCondition} weather-background--${timeOfDay}`}>
      <div className="weather-animation">
        {/* День/ночь и небесные тела - оптимизировано для мобильных */}
        {showSun && <SunEffect intensity={showSunBehindClouds ? 1 : sunIntensity} />}
        
        {showMoon && <MoonEffect />}
        
        {/* Weather condition effects */}
        {weatherCondition === 'rain' && <RainEffect />}
        {weatherCondition === 'snow' && <SnowEffect />}
        {weatherCondition === 'mist' && <MistEffect />}
        
        {/* Облака с разной плотностью в зависимости от погоды */}
        {weatherCondition === 'clouds' && <CloudsEffect density="normal" immediate={true} isSunBehind={showSunBehindClouds} />}
        {weatherCondition === 'rain' && <CloudsEffect density="heavy" immediate={true} isSunBehind={showSunBehindClouds} />}
        {weatherCondition === 'snow' && <CloudsEffect density="heavy" immediate={true} isSunBehind={showSunBehindClouds} />}
        {shouldShowClouds && !isMobile && <CloudsEffect density="light" immediate={needsImmediateElements} isSunBehind={showSunBehindClouds} />}
        {weatherCondition === 'storm' && <CloudsEffect density="heavy" immediate={true} isSunBehind={showSunBehindClouds} />}
        
        {/* Night sky stars - уменьшаем на мобильных */}
        {(timeOfDay === 'night' || timeOfDay === 'evening') && 
          <StarsEffect density={weatherCondition === 'clear' && !isMobile ? 'heavy' : 'light'} />}
        
        {/* Storm effects */}
        {weatherCondition === 'storm' && (
          <>
            <RainEffect />
            {!isMobile && <LightningEffect />}
          </>
        )}
      </div>
    </div>
  );
};

export default WeatherBackground; 