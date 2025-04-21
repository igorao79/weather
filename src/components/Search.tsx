import React, { useState } from 'react';
import '../styles/components/search.scss';

interface SearchProps {
  onSearch: (city: string) => void;
  onLocationSearch: () => void;
  isLoading: boolean;
}

const Search = ({ onSearch, onLocationSearch, isLoading }: SearchProps) => {
  const [city, setCity] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (city.trim()) {
      onSearch(city.trim());
      setCity('');
    }
  };

  const handleLocationClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Предотвращаем перезагрузку страницы
    onLocationSearch();
  };

  return (
    <div className="search">
      <form className="search__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search__input"
          placeholder="Введите название города..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="search__button"
          disabled={isLoading}
        >
          Поиск
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
};

export default Search; 