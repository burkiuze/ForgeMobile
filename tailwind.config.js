/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#141414',
          panel: '#1C1C1C',
          panelElevated: '#262626',
          panelBorder: '#333333',
          borderSubtle: '#2A2A2A',
          orange: '#F05A22',
          orangeHover: '#FF6B35',
          gold: '#F2B233',
          goldMuted: '#C9932B',
          bone: '#EDE6D8',
          boneMuted: '#9E988D',
          danger: '#E53E3E',
          success: '#38A169',
        }
      },
      borderRadius: {
        'forge': '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
