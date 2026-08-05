const plugin = require('tailwindcss/plugin')

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
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui'],
        serif: ['"Cormorant Garamond"', 'ui-serif', 'Georgia']
      },
      boxShadow: {
        'soft': '0 12px 28px rgba(40,44,33,0.05)',
        'lg-soft': '0 28px 60px rgba(20,27,19,0.14)'
      },
      borderRadius: {
        'xl-md': '18px'
      }
    },
  },
  plugins: [
    plugin(function({ addComponents, theme }) {
      const components = {
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderRadius: theme('borderRadius.md'),
          fontWeight: theme('fontWeight.semibold') || 600,
        },
        '.btn-primary': {
          backgroundColor: theme('colors.forest.800'),
          color: theme('colors.cream.50'),
          padding: `${theme('spacing.2')} ${theme('spacing.5')}`,
          borderRadius: theme('borderRadius.md'),
          boxShadow: theme('boxShadow.soft'),
          fontWeight: 700,
        },
        '.btn-secondary': {
          backgroundColor: 'transparent',
          borderColor: theme('colors.line'),
          color: theme('colors.coffee.700'),
          padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: theme('borderRadius.md'),
        },
        '.card': {
          background: `linear-gradient(145deg, rgba(255,253,247,0.97), rgba(250,245,236,0.97)), ${theme('colors.cream.50')}`,
          padding: `${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.xl-md'),
          border: `1px solid ${theme('colors.line')}`,
          boxShadow: theme('boxShadow.lg-soft'),
        },
        '.chip': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${theme('spacing.1')} ${theme('spacing.3')}`,
          borderRadius: theme('borderRadius.full') || '9999px',
          backgroundColor: 'rgba(248,241,228,0.68)',
          border: `1px solid ${theme('colors.line')}`,
          color: theme('colors.muted'),
          fontSize: theme('fontSize.sm')[0],
        },
        '.badge-terra': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${theme('spacing.1')} ${theme('spacing.2')}`,
          borderRadius: theme('borderRadius.full') || '9999px',
          backgroundColor: 'rgba(167,77,58,0.11)',
          color: theme('colors.terracotta.600'),
          fontWeight: 700,
          fontSize: theme('fontSize.xs')[0],
        },
      }
      addComponents(components)
    })
  ],
}
