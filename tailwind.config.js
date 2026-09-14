/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkForest: '#050b08',
        moss: '#0a1c13',
        trail: '#2d6a4f',
        campfire: '#e76f51',
        facebook: '#0866FF',
        mistBg: '#e2e8f0', 
        mistPanel: '#f8fafc',
        mistText: '#1e293b',
        gold: '#FFD700',
        silver: '#C0C0C0',
        bronze: '#CD7F32'
      },
      boxShadow: {
        'glow': '0 0 20px rgba(231, 111, 81, 0.4)',
        'glow-sm': '0 0 10px rgba(231, 111, 81, 0.2)',
        'glow-gold': '0 0 25px rgba(255, 215, 0, 0.4)'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        }
      }
    },
  },
  plugins: [],
}
