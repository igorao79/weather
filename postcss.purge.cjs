const autoprefixer = require('autoprefixer');
const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    autoprefixer,
    purgecss({
      content: [
        './src/**/*.ts',
        './src/**/*.tsx', 
        './src/**/*.js',
        './src/**/*.jsx',
        './index.html'
      ],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: {
        standard: [/^weather-background/, /^weather-animation/, /forecast__item/, /^forecast__hourly/],
        deep: [/dark$/, /light$/, /--(day|night|morning|evening)$/],
        greedy: [/snow$/, /rain$/, /mist$/, /clouds$/, /clear$/, /storm$/]
      }
    })
  ]
} 