"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function BehindTheScenes() {
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#050b08] text-gray-300 font-sans overflow-x-hidden pt-20 pb-16">
      
      {/* 1. Cinematic Hero Section */}
      <div className="relative h-[60vh] flex items-center justify-center text-center px-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1c13]/80 via-[#050b08]/90 to-[#050b08] z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1519904981063-b0cf448d479e?auto=format&fit=crop&q=80&w=1920" 
            alt="Dark Trail" 
            className="w-full h-full object-cover opacity-40 scale-105 animate-[pulse_10s_ease-in-out_infinite]"
          />
          {/* Fireflies / Sparks */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#e76f51] rounded-full blur-[2px] animate-ping"></div>
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-yellow-500 rounded-full blur-[3px] animate-[ping_3s_infinite]"></div>
        </div>

        <div className="relative z-20 max-w-3xl mx-auto" data-aos="zoom-in">
          <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-[#e76f51] to-red-500 mb-6 drop-shadow-2xl uppercase tracking-widest">
            দ্য স্পার্ক: ২০১৫
          </h1>
          <p className="text-lg sm:text-2xl font-bold text-gray-200 uppercase tracking-widest typewriter-text">
            তিন বন্ধু, একটি স্বপ্ন এবং অজানাকে জয় করার নেশা...
          </p>
        </div>
      </div>

      {/* 2. Scroll-Triggered Timeline Story */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 mt-10">
        {/* Timeline Center Line */}
        <div className="absolute left-[20px] sm:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#e76f51] via-yellow-500 to-transparent transform sm:-translate-x-1/2 opacity-30 shadow-[0_0_15px_rgba(231,111,81,0.5)]"></div>

        <div className="space-y-16 sm:space-y-24 pt-10">
          
          {/* Story Node 1 */}
          <div className="relative flex flex-col sm:flex-row items-center justify-between" data-aos="fade-up">
            <div className="hidden sm:block w-5/12"></div>
            <div className="absolute left-[14px] sm:left-1/2 w-4 h-4 rounded-full bg-[#e76f51] border-4 border-[#050b08] transform sm:-translate-x-1/2 shadow-[0_0_10px_#e76f51] z-20"></div>
            <div className="w-full sm:w-5/12 pl-12 sm:pl-0 text-left">
              <div className="glass-dark p-6 rounded-2xl border border-white/10 hover:border-[#e76f51]/50 transition-colors shadow-2xl relative group overflow-hidden">
                <div className="absolute inset-0 bg-[#e76f51]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-sm sm:text-base leading-relaxed text-gray-300">
                  <span className="text-[#e76f51] font-black text-xl">আগস্ট ২০১৫।</span> সীতাকুণ্ডের খৈয়াছড়া ঝর্ণার গহীন ট্রেইল থেকে ট্রেকিং শেষে ক্যাম্পাসে ফিরছে একদল তরুণ। সারাদিনের ক্লান্তি ছাপিয়ে মেকানিক্যাল ১৩ ব্যাচের ক্লাস রিপ্রেজেন্টেটিভ আব্দুল্লাহ আল নোমানের মাথায় তখন অন্য এক ভাবনা— ক্যাম্পাসের এই বিপুল তারুণ্যকে এক সুতোয় গাঁথার জন্য একটা ট্রাভেল কমিউনিটি বড্ড প্রয়োজন!
                </p>
              </div>
            </div>
          </div>

          {/* Story Node 2 */}
          <div className="relative flex flex-col sm:flex-row items-center justify-between" data-aos="fade-up">
            <div className="w-full sm:w-5/12 pl-12 sm:pr-12 sm:pl-0 text-left sm:text-right order-2 sm:order-1 mt-4 sm:mt-0">
              <div className="glass-dark p-6 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-colors shadow-2xl relative group overflow-hidden">
                <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-sm sm:text-base leading-relaxed text-gray-300">
                  আইডিয়াটা সে শেয়ার করে তার সহপাঠী ওসমান গনির সাথে। নাপিত্তাছড়া ট্রেইল জয় করে আসা ওসমান তখন খৈয়াছড়া ট্যুরের মাস্টারমাইন্ড। সেসময় অনলাইনে বা অফলাইনে চুয়েটে ট্রাভেলিংয়ের কোনো অ্যাক্টিভ প্ল্যাটফর্ম ছিল না। নোমানের আইডিয়া আর ওসমানের এক্সিকিউশনে ফেসবুকে জন্ম নিল <span className="font-bold text-white">"চুয়েট টুরিস্ট সোসাইটি"</span>।
                </p>
              </div>
            </div>
            <div className="absolute left-[14px] sm:left-1/2 w-4 h-4 rounded-full bg-yellow-500 border-4 border-[#050b08] transform sm:-translate-x-1/2 shadow-[0_0_10px_#eab308] z-20 order-1 sm:order-2"></div>
            <div className="hidden sm:block w-5/12 order-3"></div>
          </div>

          {/* Story Node 3 */}
          <div className="relative flex flex-col sm:flex-row items-center justify-between" data-aos="fade-up">
            <div className="hidden sm:block w-5/12"></div>
            <div className="absolute left-[14px] sm:left-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#050b08] transform sm:-translate-x-1/2 shadow-[0_0_10px_#10b981] z-20"></div>
            <div className="w-full sm:w-5/12 pl-12 sm:pl-0 text-left mt-4 sm:mt-0">
              <div className="glass-dark p-6 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition-colors shadow-2xl relative group overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-sm sm:text-base leading-relaxed text-gray-300">
                  কিন্তু প্রথম এক মাস সোসাইটির কার্যক্রম যেন ঠিক গতি পাচ্ছিল না। ঠিক তখনই দৃশ্যপটে এন্ট্রি হয় সিভিল ১৩ ব্যাচের তানভীর হক তুহিনের। বান্দরবানের দুর্গম পাহাড় চষে বেড়ানো তুহিন এসে ধরিয়ে দিল আসল স্পার্ক। সে বলল, <br/><br/>
                  <i className="text-emerald-400 font-bold">"চুয়েট জীবনের এই বিপুল তারুণ্যে সাধারণ ঘোরাঘুরি তো আর মানায় না! এই বয়সের জন্য চাই পিওর অ্যাডভেঞ্চার!"</i>
                </p>
              </div>
            </div>
          </div>

          {/* Story Node 4 */}
          <div className="relative flex flex-col sm:flex-row items-center justify-between" data-aos="fade-up">
            <div className="w-full sm:w-5/12 pl-12 sm:pr-12 sm:pl-0 text-left sm:text-right order-2 sm:order-1 mt-4 sm:mt-0">
              <div className="glass-dark p-6 rounded-2xl border border-[#e76f51]/30 bg-gradient-to-br from-[#e76f51]/10 to-transparent shadow-[0_0_30px_rgba(231,111,81,0.15)] relative">
                <p className="text-sm sm:text-base leading-relaxed text-white font-bold">
                  তুহিনের সেই ভিশন থেকেই বদলে গেল নাম, জন্ম নিল আজকের <span className="text-[#e76f51] text-lg uppercase tracking-wider">"চুয়েট অ্যাডভেঞ্চার সোসাইটি"</span>। তিন বন্ধুর সেই ছোট্ট আড্ডা থেকে শুরু হওয়া স্পার্ক আজ হাজারো এক্সপ্লোরারের বুকে জ্বলছে!
                </p>
              </div>
            </div>
            <div className="absolute left-[14px] sm:left-1/2 w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-[#e76f51] border-4 border-[#050b08] transform sm:-translate-x-1/2 shadow-[0_0_20px_#e76f51] z-20 order-1 sm:order-2 flex items-center justify-center">
              <i className="fa-solid fa-fire text-[#050b08] text-[8px]"></i>
            </div>
            <div className="hidden sm:block w-5/12 order-3"></div>
          </div>

        </div>
      </div>

      {/* 3. The Pioneers (3D Glassmorphism Cards) */}
      <div className="max-w-6xl mx-auto px-4 mt-32 sm:mt-40 relative z-20">
        <div className="text-center mb-20" data-aos="fade-in">
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-widest border-b-2 border-white/10 inline-block pb-2">
            দ্য পাইওনিয়ার্স
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-24 md:gap-8 pt-10">
          
          {/* Founder 1: Noman */}
          <div className="relative group" data-aos="fade-up" data-aos-delay="100">
            <div className="absolute inset-0 bg-[#e76f51] rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
            <div className="bg-[#0a1c13]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 pt-24 text-center shadow-2xl relative transition-transform duration-500 group-hover:-translate-y-4 h-full flex flex-col justify-between">
              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-40 h-40 z-30 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]">
                <img src="/noman.png" alt="Noman" className="w-full h-full object-contain object-bottom" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-wider group-hover:text-[#e76f51] transition-colors">আব্দুল্লাহ আল নোমান</h3>
                <p className="text-xs text-[#e76f51] font-bold tracking-widest uppercase mb-2">The Visionary (ME '13)</p>
                
                {/* 🔴 Vintage Image Tag */}
                <p className="text-[9px] text-gray-500 tracking-wider mb-4"><i className="fa-solid fa-camera mr-1"></i> ২০১৫ সালে তৎকালীন তোলা ছবি</p>
                
                <div className="border-t border-white/5 my-4"></div>
                <p className="text-sm text-gray-400 italic">"ক্যাম্পাসের এই বিপুল তারুণ্যকে এক সুতোয় গাঁথার জন্য একটা ট্রাভেল কমিউনিটি বড্ড প্রয়োজন!"</p>
              </div>
            </div>
          </div>

          {/* Founder 2: Osman */}
          <div className="relative group" data-aos="fade-up" data-aos-delay="200">
            <div className="absolute inset-0 bg-yellow-500 rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
            <div className="bg-[#0a1c13]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 pt-24 text-center shadow-2xl relative transition-transform duration-500 group-hover:-translate-y-4 h-full flex flex-col justify-between">
              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-40 h-40 z-30 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]">
                <img src="/osman.png" alt="Osman" className="w-full h-full object-contain object-bottom" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-wider group-hover:text-yellow-500 transition-colors">ওসমান গনি</h3>
                <p className="text-xs text-yellow-500 font-bold tracking-widest uppercase mb-2">The Mastermind (ME '13)</p>
                
                {/* 🔴 Vintage Image Tag */}
                <p className="text-[9px] text-gray-500 tracking-wider mb-4"><i className="fa-solid fa-camera mr-1"></i> ২০১৫ সালে তৎকালীন তোলা ছবি</p>
                
                <div className="border-t border-white/5 my-4"></div>
                <p className="text-sm text-gray-400 italic">খৈয়াছড়া ট্যুরের আর্কিটেক্ট, যার হাত ধরে ফেসবুকে প্রথম ভিত্তিপ্রস্তর স্থাপিত হয়।</p>
              </div>
            </div>
          </div>

          {/* Founder 3: Tuhin */}
          <div className="relative group" data-aos="fade-up" data-aos-delay="300">
            <div className="absolute inset-0 bg-emerald-500 rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
            <div className="bg-[#0a1c13]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 pt-24 text-center shadow-2xl relative transition-transform duration-500 group-hover:-translate-y-4 h-full flex flex-col justify-between">
              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-40 h-40 z-30 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]">
                <img src="/tuhin.png" alt="Tuhin" className="w-full h-full object-contain object-bottom" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-wider group-hover:text-emerald-400 transition-colors">তানভীর হক তুহিন</h3>
                <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase mb-2">The Catalyst (CE '13)</p>
                
                {/* 🔴 Vintage Image Tag */}
                <p className="text-[9px] text-gray-500 tracking-wider mb-4"><i className="fa-solid fa-camera mr-1"></i> ২০১৫ সালে তৎকালীন তোলা ছবি</p>

                <div className="border-t border-white/5 my-4"></div>
                <p className="text-sm text-gray-400 italic">"এই বয়সের জন্য চাই পিওর অ্যাডভেঞ্চার!" - এই একটি লাইনই বদলে দিয়েছিল ক্লাবের ডিএনএ।</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Easter Egg Footer */}
      <div className="mt-32 text-center relative z-20 pb-10">
        <button 
          onClick={() => setShowSecret(true)}
          className="text-gray-600 hover:text-[#e76f51] transition-colors focus:outline-none animate-bounce cursor-pointer"
          title="Discover a secret..."
        >
          <i className="fa-solid fa-fire text-2xl"></i>
        </button>
      </div>

      {/* Secret Modal */}
      {showSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSecret(false)}></div>
          <div className="bg-[#0a1c13] border border-[#e76f51]/30 rounded-3xl p-8 max-w-md w-full mx-auto relative z-10 shadow-[0_0_50px_rgba(231,111,81,0.2)] text-center animate-zoom-in">
            <button onClick={() => setShowSecret(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
            <i className="fa-solid fa-compass text-5xl text-[#e76f51] mb-6 animate-spin-slow"></i>
            <h3 className="text-2xl font-black text-white mb-2 tracking-widest uppercase">সিক্রেট ডায়েরি</h3>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              ২০১৫ সালে শুরু হওয়া সেই ছোট্ট 'চুয়েট টুরিস্ট সোসাইটি' হয়তো সেদিন হারিয়ে যেত, যদি না তিনজনের ভিশন একসাথে মিলে 'অ্যাডভেঞ্চার' শব্দটি যোগ হতো। সেই স্পার্ক আজও আমাদের পথ দেখায়!
            </p>
            <button onClick={() => setShowSecret(false)} className="bg-[#e76f51] hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-full transition-colors text-sm uppercase tracking-widest">
              এক্সপ্লোর চালিয়ে যান
            </button>
          </div>
        </div>
      )}

      {/* Basic Custom Styles for Typewriter & Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .typewriter-text {
          overflow: hidden;
          border-right: .15em solid #e76f51;
          white-space: nowrap;
          margin: 0 auto;
          letter-spacing: .15em;
          animation: typing 3.5s steps(40, end), blink-caret .75s step-end infinite;
        }
        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }
        @keyframes blink-caret {
          from, to { border-color: transparent }
          50% { border-color: #e76f51; }
        }
        .animate-zoom-in {
          animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}} />
    </div>
  );
}
