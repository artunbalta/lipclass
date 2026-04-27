/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-light': '#818cf8',
        background: '#0f0f0f',
        card: '#1a1a1a',
        border: '#2a2a2a',
        muted: '#3a3a3a',
        'muted-foreground': '#a1a1aa',
        destructive: '#ef4444',
        success: '#10b981',
      },
    },
  },
  plugins: [],
};
