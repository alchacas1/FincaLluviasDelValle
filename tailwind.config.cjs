module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        forest: {
          950: 'var(--forest-950)',
          800: 'var(--forest-800)',
          700: 'var(--forest-700)'
        },
        cream: {
          50: 'var(--cream-50)',
          100: 'var(--cream-100)'
        },
        coffee: {
          700: 'var(--coffee-700)'
        },
        terracotta: {
          600: 'var(--terracotta-600)'
        },
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)'
      }
    },
  },
  plugins: [],
}
