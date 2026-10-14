/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        s1: v('s1'),
        s2: v('s2'),
        s3: v('s3'),
        line: v('line'),
        ink: v('ink'),
        mute: v('mute'),
        acc: v('acc'),
        gold: v('gold'),
        ok: v('ok'),
        bad: v('bad'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: { xl2: '1.125rem' },
      boxShadow: { lift: '0 10px 30px -12px rgb(0 0 0 / 0.55)' },
    },
  },
  plugins: [],
};
