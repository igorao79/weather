import React, { useState, useEffect, memo } from 'react';
import '../styles/components/search.scss';

interface SearchProps {
  onSearch: (city: string) => void;
  onLocationSearch: () => void;
  isLoading: boolean;
}

// Используем memo для предотвращения ненужных ререндеров компонента
const Search = memo(({ onSearch, onLocationSearch, isLoading }: SearchProps) => {
  const [city, setCity] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    
    // Проверяем при загрузке
    checkMobile();
    
    // Слушаем изменение размера окна с дебаунсингом
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkMobile, 150);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (city.trim()) {
      onSearch(city.trim());
      setCity('');
    }
  };

  const handleLocationClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent page refresh
    e.stopPropagation(); // Stop event propagation
    onLocationSearch();
  };

  return (
    <div className="search">
      <form className="search__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search__input"
          placeholder={isMobile ? "Город..." : "Введите название города..."}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={`search__button ${isMobile ? 'search__button--icon' : ''}`}
          disabled={isLoading}
          aria-label="Поиск"
        >
          {isMobile ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
            </svg>
          ) : (
            "Поиск"
          )}
        </button>
        <button
          type="button"
          className="search__location-btn"
          onClick={handleLocationClick}
          disabled={isLoading}
          title="Определить мое местоположение"
          aria-label="Определить местоположение"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
          </svg>
        </button>
      </form>
    </div>
  );
});

export default Search; 