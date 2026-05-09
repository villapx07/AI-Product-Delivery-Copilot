/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAFA',
        surface: '#FFFFFF',
        border: '#E4E4E7',
        'text-primary': '#18181B',
        'text-secondary': '#71717A',
        accent: '#6366F1',
        'accent-subtle': '#EEF2FF',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        reviewer: '#8B5CF6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
