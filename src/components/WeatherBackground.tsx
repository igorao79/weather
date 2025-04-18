import React, { useMemo } from 'react';
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

// Component for sun effect
const SunEffect = ({ intensity = 1 }) => {
  return (
    <div className="weather-animation__sun" style={{ opacity: intensity }}>
      <div className="weather-animation__sun-circle"></div>
      <div className="weather-animation__sun-rays"></div>
      <div className="weather-animation__sun-flare"></div>
    </div>
  );
};

// Component for moon effect
const MoonEffect = () => {
  return (
    <div className="weather-animation__moon">
      <div className="weather-animation__moon-circle"></div>
      <div className="weather-animation__moon-craters"></div>
    </div>
  );
};

// Component for raining effect
const RainEffect = () => {
  const raindrops = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: 0.5 + Math.random() * 0.5,
      delay: Math.random() * 5,
      opacity: 0.5 + Math.random() * 0.5,
    }));
  }, []);
  
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
  const snowflakes = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 5,
      duration: 5 + Math.random() * 10,
      delay: Math.random() * 5,
      opacity: 0.7 + Math.random() * 0.3,
    }));
  }, []);
  
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
const CloudsEffect = ({ density = 'normal', immediate = false }) => {
  // Create cloud groups with different speeds and positions
  const cloudGroups = useMemo(() => {
    // Determine how many clouds based on density
    const count = density === 'heavy' ? 15 : density === 'light' ? 5 : 10;
    
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: `${5 + Math.random() * 50}%`,
      left: immediate ? `${Math.random() * 80}%` : `${-30 - Math.random() * 50}%`,
      opacity: 0.4 + Math.random() * 0.6,
      scale: 0.3 + Math.random() * 1.2,
      duration: 40 + Math.random() * 80,
      delay: immediate ? 0 : Math.random() * 40,
      zIndex: Math.floor(Math.random() * 3),
    }));
  }, [density, immediate]);
  
  return (
    <div className="weather-animation__clouds">
      {cloudGroups.map((cloud) => (
        <div
          key={cloud.id}
          className="weather-animation__cloud"
          style={{
            top: cloud.top,
            left: cloud.left,
            opacity: cloud.opacity,
            transform: `scale(${cloud.scale})`,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
            zIndex: cloud.zIndex,
          }}
        />
      ))}
    </div>
  );
};

// Component for stars effect
const StarsEffect = ({ density = 'normal' }) => {
  const stars = useMemo(() => {
    const count = density === 'heavy' ? 200 : density === 'light' ? 50 : 100;
    
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 3,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      twinkleType: Math.floor(Math.random() * 3), // Different twinkling patterns
    }));
  }, [density]);
  
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
  const bolts = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
      id: i,
      left: `${20 + Math.random() * 60}%`,
      height: 100 + Math.random() * 200,
      width: 3 + Math.random() * 10,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 5,
    }));
  }, []);
  
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
  const mistLayers = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      top: `${10 + i * 20}%`,
      opacity: 0.2 + Math.random() * 0.3,
      speed: 100 + Math.random() * 200,
      delay: Math.random() * 5,
    }));
  }, []);
  
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
  
  return (
    <>
      <div className={`weather-background weather-background--${weatherCondition} weather-background--${timeOfDay}`}>
        <div className="weather-animation">
          {/* Day/Night celestial bodies */}
          {(timeOfDay === 'day' || timeOfDay === 'morning' || timeOfDay === 'evening') && 
            (weatherCondition === 'clear' || weatherCondition === 'clouds') && 
            <SunEffect intensity={sunIntensity} />}
          
          {(timeOfDay === 'night' || (timeOfDay === 'evening' && weatherCondition !== 'clear')) && 
            <MoonEffect />}
          
          {/* Weather condition effects */}
          {weatherCondition === 'rain' && <RainEffect />}
          {weatherCondition === 'snow' && <SnowEffect />}
          {weatherCondition === 'mist' && <MistEffect />}
          
          {/* Clouds with different densities based on condition */}
          {weatherCondition === 'clouds' && <CloudsEffect density="heavy" immediate={true} />}
          {weatherCondition === 'rain' && <CloudsEffect density="heavy" immediate={true} />}
          {weatherCondition === 'snow' && <CloudsEffect density="heavy" immediate={true} />}
          {shouldShowClouds && <CloudsEffect density="light" immediate={needsImmediateElements} />}
          {weatherCondition === 'storm' && <CloudsEffect density="heavy" immediate={true} />}
          
          {/* Night sky stars */}
          {(timeOfDay === 'night' || timeOfDay === 'evening') && <StarsEffect density={weatherCondition === 'clear' ? 'heavy' : 'light'} />}
          
          {/* Storm effects */}
          {weatherCondition === 'storm' && (
            <>
              <RainEffect />
              <LightningEffect />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default WeatherBackground; 