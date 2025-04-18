import { useState, FormEvent } from 'react';
import '../styles/components/search-bar.scss';

// Интерфейс для пропсов компонента поиска
interface SearchBarProps {
  onSearch: (city: string) => void;
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [city, setCity] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(city);
    // Очищаем поле ввода после отправки
    setCity('');
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Введите название города..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button type="submit">Поиск</button>
      </form>
    </div>
  );
};

export default SearchBar; 