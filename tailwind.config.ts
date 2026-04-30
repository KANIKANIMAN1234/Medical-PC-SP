import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        judgment: {
          A: '#16a34a',
          B: '#ca8a04',
          C: '#ea580c',
          D: '#dc2626',
          E: '#9333ea',
        },
      },
    },
  },
  plugins: [],
};

export default config;
