import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'CUET Adventure Society',
  description: 'Official website of CUET Adventure Society (CAS)',
}

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className="scroll-smooth">
      <head>
        {/* Font Awesome for Icons */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="bg-[#050b08] text-gray-300 font-sans antialiased selection:bg-[#e76f51] selection:text-white">
        
        {/* গ্লোবাল নেভিগেশন বার, যা সব পেজে থাকবে */}
        <Navbar />

        {/* ওয়েবসাইটের অন্যান্য পেজের কনটেন্ট এখানে লোড হবে */}
        <main className="pt-20"> 
          {children}
        </main>

      </body>
    </html>
  )
}
