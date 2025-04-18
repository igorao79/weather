# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

# Weather App

Приложение для отображения погоды по местоположению, использующее OpenWeatherMap API.

## Технологии

- React
- TypeScript
- SCSS + БЭМ
- Axios
- OpenWeatherMap API

## Особенности

- Получение прогноза погоды на основе геолокации
- Поиск погоды по названию города
- Адаптивный дизайн
- Фон меняется в зависимости от погодных условий
- Детальная информация о текущей погоде
- Прогноз на 5 дней

## Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd weather-app
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите приложение в режиме разработки:
```bash
npm run dev
```

## OpenWeatherMap API

В приложении используется тестовый ключ API из документации OpenWeatherMap, который имеет ограничения. Для полноценного использования приложения рекомендуется получить собственный API ключ:

1. Зарегистрируйтесь на [OpenWeatherMap](https://home.openweathermap.org/users/sign_up)
2. После регистрации перейдите в раздел "API keys"
3. Скопируйте ваш ключ API
4. Откройте файл `src/utils/api.ts` и замените значение константы `API_KEY` на ваш ключ:

```typescript
const API_KEY = 'ваш_api_ключ';
```

**Примечание**: После регистрации новому API ключу может потребоваться до 2 часов для активации.

## Структура проекта

- `src/components/` - React компоненты
- `src/styles/` - SCSS стили
- `src/utils/` - утилиты и вспомогательные функции
- `src/types/` - TypeScript типы
