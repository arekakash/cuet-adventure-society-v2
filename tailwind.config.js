/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 🔴 ডার্ক মোড ম্যানুয়ালি টগল করার জন্য
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ডার্ক মোডের কালার
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
        bronze: '#CD7F32',

        // লাইট/প্যাস্টেল মোডের জন্য সফট কালার প্যালেট
        pastel: {
          bg: '#fdfbf7',       // চোখের জন্য আরামদায়ক সফট ক্রিম/প্যাস্টেল ব্যাকগ্রাউন্ড
          card: '#ffffff',     // কার্ডের জন্য ক্লিন হোয়াইট
          text: '#374151',     // সফট ডার্ক গ্রে (কড়া কালো নয়, যাতে চোখে না লাগে)
          border: '#f3f4f6',   // খুব হালকা সফট বর্ডার
          muted: '#8c98a9'     // সাব-টেক্সট বা ছোট লেখার জন্য মিউটেড কালার
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(231, 111, 81, 0.4)',
        'glow-sm': '0 0 10px rgba(231, 111, 81, 0.2)',
        'glow-lg': '0 0 40px rgba(231, 111, 81, 0.15)', // 🔴 চ্যাটবট এবং বড় কার্ডের সফট গ্লো-এর জন্য
        'glow-gold': '0 0 25px rgba(255, 215, 0, 0.4)',
        'soft': '0 10px 40px -10px rgba(0,0,0,0.05)' // লাইট মোডের কার্ডগুলোর জন্য একদম সফট একটি শ্যাডো
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards', // 🔴 চ্যাটবট পপ-আপ অ্যানিমেশন
        'bounce-slow': 'bounceSlow 2s infinite',         // 🔴 চ্যাটবট টগল বাটনের বাউন্স অ্যানিমেশন
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        // 🔴 নতুন যুক্ত করা কি-ফ্রেমগুলো
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSlow: {
          '0%, 100%': { 
            transform: 'translateY(-5%)', 
            animationTimingFunction: 'cubic-bezier(0.8,0,1,1)' 
          },
          '50%': { 
            transform: 'none', 
            animationTimingFunction: 'cubic-bezier(0,0,0.2,1)' 
          },
        }
      }
    },
  },
  plugins: [],
}
