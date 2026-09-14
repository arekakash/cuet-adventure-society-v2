"use client";
import { useEffect } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function HomePage() {
  useEffect(() => {
    AOS.init({ once: true, offset: 100 });
  }, []);

  return (
    <main className="bg-darkForest text-gray-300 font-sans antialiased selection:bg-campfire selection:text-white overflow-x-hidden relative min-h-screen">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=1920" alt="Dark Forest" className="absolute w-full h-full object-cover opacity-50 scale-105 filter brightness-75 contrast-125" />
        <div className="absolute inset-0 bg-gradient-to-b from-darkForest/40 via-darkForest/80 to-[#030705]/95"></div>
      </div>

      <section className="relative min-h-screen flex items-center justify-center text-white overflow-hidden pt-20">
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto" data-aos="zoom-out" data-aos-duration="1500">
          <div className="inline-block px-5 py-2 rounded-full border border-campfire/30 text-campfire font-bold text-xs sm:text-sm mb-8 tracking-widest backdrop-blur-md shadow-glow animate-pulse bg-black/20">
            <i className="fa-solid fa-fire mr-2"></i> <span>২০১৫ সাল থেকে পথচলা</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tighter mb-8 text-glow-futuristic">
            চুয়েট অ্যাডভেঞ্চার <br />সোসাইটি
          </h1>
          
          <p className="text-lg sm:text-2xl text-gray-300 font-medium mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            পাহাড়ের গহীনে, মেঘের চূড়ায় কিংবা অরণ্যের গভীরে—চুয়েটিয়ানদের পদচারণায় জেগে উঠুক নতুন ট্রেইল।
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup" className="w-full sm:w-auto bg-campfire hover:bg-orange-600 px-8 py-4 sm:py-5 rounded-2xl font-black transition-all shadow-glow flex items-center justify-center gap-3 text-lg sm:text-xl text-white hover:-translate-y-1">
              <i className="fa-solid fa-shoe-prints"></i> <span>এক্সপ্লোর শুরু করুন</span>
            </Link>
            
            <Link href="/login" className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 sm:py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 text-lg sm:text-xl backdrop-blur-sm hover:-translate-y-1 shadow-lg">
              <i className="fa-solid fa-right-to-bracket text-gray-400"></i> <span>লগইন</span>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce opacity-50 z-10 text-white">
          <i className="fa-solid fa-angles-down text-2xl"></i>
        </div>
      </section>

      <section className="py-24 sm:py-32 max-w-4xl mx-auto px-6 relative z-10">
        <div className="absolute top-40 left-0 w-72 h-72 bg-trail/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-40 right-0 w-96 h-96 bg-campfire/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="space-y-16 sm:space-y-24 text-lg sm:text-xl md:text-2xl leading-relaxed sm:leading-loose text-gray-200 font-light relative z-10">
          
          <div data-aos="fade-up" data-aos-duration="1000" className="text-center drop-shadow-md">
            <i className="fa-solid fa-quote-left text-4xl text-white/20 mb-6"></i>
            <p className="font-bold text-white text-2xl sm:text-4xl leading-tight">পাহাড় আর সমুদ্রের সীমানায় আমরা—<span className="text-campfire">চুয়েটিয়ান!</span></p>
            <p className="mt-4 font-medium">দেশের সবচেয়ে সুন্দর রুটগুলো যাদের ক্যাম্পাসের ঠিক দোরগোড়ায়।</p>
          </div>

          <div data-aos="fade-up" data-aos-duration="1000" className="border-l-4 border-trail pl-6 sm:pl-8 py-2 drop-shadow-md">
            <p className="font-medium">কখনো ভেবে দেখেছেন, ক্যাম্পাস লোকেশনের দিক থেকে আমরা চুয়েটিয়ানরা কতটা ভাগ্যবান?</p>
            <p className="mt-4">রাউজানের পাশেই রাঙ্গুনিয়া, আর তার পরই রাঙামাটির নীল জল ও পাহাড়। লিচুবাগান থেকে অল্প দূরত্বেই মেঘের দেশ বান্দরবান, কাছেই খাগড়াছড়ির সবুজ উপত্যকা আর একদিকে বঙ্গোপসাগরের উত্তাল ঢেউ।</p>
          </div>

          <div data-aos="fade-up" data-aos-duration="1000" className="bg-[#0a1c13]/60 p-8 sm:p-12 rounded-3xl backdrop-blur-md border border-white/10 shadow-xl">
            <p className="font-bold text-campfire mb-6 text-xl sm:text-2xl">ঘুরতে যাওয়ার ইচ্ছে সবারই থাকে, কিন্তু...</p>
            <ul className="space-y-4 text-base sm:text-lg font-medium list-none">
              <li className="flex items-start gap-4"><i className="fa-solid fa-circle-xmark text-red-500 mt-1.5 opacity-70"></i> <span>পর্যাপ্ত যোগাযোগ বা সঠিক প্ল্যানিংয়ের অভাব?</span></li>
              <li className="flex items-start gap-4"><i className="fa-solid fa-circle-xmark text-red-500 mt-1.5 opacity-70"></i> <span>একা একা ঘুরতে ভালো লাগে ঘন জঙ্গলে?</span></li>
              <li className="flex items-start gap-4"><i className="fa-solid fa-circle-xmark text-red-500 mt-1.5 opacity-70"></i> <span>ছুটির দিনে ট্রাভেল পার্টনার খুঁজে পান না?</span></li>
            </ul>
            <div className="mt-10 pt-8 border-t border-white/10">
              <p className="font-bold text-white text-xl sm:text-2xl">আর কোনো অজুহাত নয়!</p>
              <p className="mt-2 text-base sm:text-lg font-medium">ভ্রমণপিপাসু চুয়েটিয়ানদের এক ছাদের নিচে আনতেই আমাদের এই প্ল্যাটফর্ম। একা নন, এবার পুরো ক্যাম্পাসের ট্রাভেলাররা আপনার সাথে।</p>
            </div>
          </div>

          <div data-aos="fade-up" data-aos-duration="1000">
            <h3 className="text-3xl font-black text-white mb-10 text-center uppercase tracking-widest drop-shadow-md"><span className="text-trail">আমাদের</span> বিশেষত্ব</h3>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 text-base">
              <div className="bg-[#0a1c13]/60 p-8 rounded-2xl backdrop-blur-md border border-white/5 hover:-translate-y-2 transition-transform duration-300 shadow-lg">
                <i className="fa-solid fa-calendar-check text-4xl text-trail mb-6 drop-shadow-md"></i>
                <h4 className="font-bold text-white mb-3">নিয়মিত ট্যুর</h4>
                <p className="text-sm text-gray-300 font-medium">প্রতি মাসেই আয়োজন করা হয় দারুণ সব রোমাঞ্চকর ট্যুর।</p>
              </div>
              <div className="bg-[#0a1c13]/60 p-8 rounded-2xl backdrop-blur-md border border-white/5 hover:-translate-y-2 transition-transform duration-300 shadow-lg">
                <i className="fa-solid fa-map-location-dot text-4xl text-campfire mb-6 drop-shadow-md"></i>
                <h4 className="font-bold text-white mb-3">হিডেন স্পট শেয়ারিং</h4>
                <p className="text-sm text-gray-300 font-medium">ক্যাম্পাসের আশপাশের অজানা ঝিরি বা পাহাড় খুঁজে পেলে শেয়ার করুন।</p>
              </div>
              <div className="bg-[#0a1c13]/60 p-8 rounded-2xl backdrop-blur-md border border-white/5 hover:-translate-y-2 transition-transform duration-300 shadow-lg">
                <i className="fa-solid fa-people-group text-4xl text-blue-400 mb-6 drop-shadow-md"></i>
                <h4 className="font-bold text-white mb-3">কমিউনিটি পাওয়ার</h4>
                <p className="text-sm text-gray-300 font-medium">একাকী ভ্রমণ নয়, দল বেঁধে ঘুরে বেড়ানোর নিখাদ আনন্দ।</p>
              </div>
            </div>
          </div>

          <div data-aos="zoom-in" data-aos-duration="1200" className="text-center pt-24">
            <p className="font-black text-3xl sm:text-5xl text-white mb-10 drop-shadow-lg">প্রস্তুত তো পরবর্তী রোমাঞ্চের জন্য?</p>
            <p className="text-base sm:text-xl font-medium mb-12 max-w-2xl mx-auto drop-shadow-md">যুক্ত হোন আমাদের কমিউনিটিতে, অংশ নিন আগামী ট্যুরে এবং উপভোগ করুন বাংলার সেরা প্রাকৃতিক সৌন্দর্য।</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-campfire hover:bg-orange-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-glow hover:scale-105 transition-all">
                <i className="fa-solid fa-compass"></i> <span>জয়েন করুন</span>
              </Link>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
