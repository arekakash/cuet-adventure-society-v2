import './globals.css';
import Navbar from '@/components/Navbar';
import AIChatBot from '@/components/AIChatBot'; // 🔴 ১. এখানে এআই ইম্পোর্ট করা হলো

export const metadata = {
  title: 'CUET Adventure Society',
  description: 'Official website of CUET Adventure Society (CAS)',
  manifest: '/manifest.json',
  themeColor: '#0a1c13',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className="scroll-smooth">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-darkForest text-gray-300 font-sans antialiased selection:bg-campfire selection:text-white relative min-h-screen">
        
        {/* Dynamic Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&q=80&w=1920" 
            alt="Dark Forest" 
            className="absolute w-full h-full object-cover opacity-30 filter brightness-50 contrast-125" 
          />
          <div className="absolute inset-0 bg-gradient-to-br from-darkForest/90 via-moss/80 to-darkForest/90"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-campfire/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-trail/10 rounded-full blur-[80px] animate-pulse"></div>
        </div>

        <Navbar />

        <main className="pt-20 relative z-10"> 
          {children}
        </main>

        <AIChatBot /> {/* 🔴 ২. এখানে এআই কল করা হলো, মেইন কন্টেন্টের ঠিক নিচে */}

      </body>
    </html>
  );
}
