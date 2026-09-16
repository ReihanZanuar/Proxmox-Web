/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          card: 'var(--color-card)',
          border: 'var(--color-border)',
          'text-primary': 'var(--color-text-primary)',
          'text-muted': 'var(--color-text-muted)',
          accent: 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          'accent-fg': 'var(--color-accent-fg)',
          running: 'var(--color-running)',
          'running-bg': 'var(--color-running-bg)',
          stopped: 'var(--color-stopped)',
          'stopped-bg': 'var(--color-stopped-bg)',
          warning: 'var(--color-warning)',
          'warning-bg': 'var(--color-warning-bg)',
          danger: 'var(--color-danger)',
          'danger-bg': 'var(--color-danger-bg)',
        }
      },
      boxShadow: {
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-hard': 'var(--shadow-hard)',
      },
      borderRadius: {
        'theme': 'var(--radius-theme)',
        'theme-sm': 'var(--radius-theme-sm)',
      },
      borderWidth: {
        'theme': 'var(--border-width-theme)',
      }
    },
  },
  plugins: [],
}
