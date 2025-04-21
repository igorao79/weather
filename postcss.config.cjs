module.exports = {
  plugins: [
    require('autoprefixer'),
    process.env.NODE_ENV === 'production' && require('@fullhuman/postcss-purgecss')({
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