"use client";
import { useEffect } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

const mapTools = [
  {
    href: "/my-bangladesh/color-map",
    title: "কালার ম্যাপ",
    subtitle: "জেলা ভিত্তিক রঙে নিজের যাত্রা আঁকুন",
    description: "প্রতিটা জেলা আলাদা রঙে চিহ্নিত করে আপনার ভ্রমণের মানচিত্র তৈরি করুন। সোশ্যাল মিডিয়ায় শেয়ারের জন্য রেডি!",
    icon: "fa-solid fa-palette",
    gradient: "from-orange-500 via-red-500 to-pink-500",
    shadow: "shadow-orange-500/30",
    badge: "জনপ্রিয়",
    features: ["৬৪ জেলা ট্র্যাকিং", "কাস্টম থিম", "HD ডাউনলোড"],
  },
  {
    href: "/my-bangladesh/photo-map",
    title: "ফটো ম্যাপ",
    subtitle: "স্মৃতির ছবিতে সাজিয়ে তোলা বাংলাদেশ",
    description: "প্রতিটা জেলার সেরা মুহূর্তের ছবি যোগ করে হাই-রেজোলিউশনে ডাউনলোড করার সুযোগ।",
    icon: "fa-solid fa-camera-retro",
    gradient: "from-emerald-500 via-teal-500 to-blue-500",
    shadow: "shadow-emerald-500/30",
    features: ["ছবি আপলোড", "৪K রেজোলিউশন", "PDF এক্সপোর্ট"],
  },
  {
    href: "/my-bangladesh/family-map",
    title: "পরিবার ম্যাপ",
    subtitle: "আত্মীয়রা কোথায় ছড়িয়ে আছে",
    description: "পৈতৃক-মাতৃকুল সব আত্মীয়ের অবস্থান এক ম্যাপে দেখুন, পরিবারের Spread Map flex করুন।",
    icon: "fa-solid fa-people-roof",
    gradient: "from-blue-500 via-purple-500 to-pink-500",
    shadow: "shadow-purple-500/30",
    badge: "নতুন",
    features: ["অটো-সেভ", "সম্পর্ক ট্যাগ", "Backup Import"],
  },
];

const comingSoonTools = [
  { title: "ফুড ম্যাপ", description: "প্রতিটা জেলার বিখ্যাত খাবার আবিষ্কার করুন", icon: "fa-solid fa-utensils", color: "#f59e0b" },
  { title: "উইশলিস্ট ম্যাপ", description: "যেতে চান এমন জেলার বাকেট লিস্ট তৈরি করুন", icon: "fa-solid fa-star", color: "#8b5cf6" },
  { title: "৬৪ দিনের চ্যালেঞ্জ", description: "৬৪ দিনে ৬৪ জেলা — gamified adventure", icon: "fa-solid fa-trophy", color: "#ef4444" },
];

const stats = [
  { value: "৬৪", label: "জেলা", icon: "fa-solid fa-map-location-dot" },
  { value: "৮", label: "বিভাগ", icon: "fa-solid fa-layer-group" },
  { value: "৩+", label: "ইন্টারেক্টিভ টুল", icon: "fa-solid fa-toolbox" },
  { value: "∞", label: "সম্ভাবনা", icon: "fa-solid fa-infinity" },
];

export default function MyBangladeshHub() {
  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
  }, []);

  return (
    <div className="min-h-screen bg-[#fcf9f2] dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-10 bg-emerald-500"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-10 bg-purple-500"></div>

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-16">
        <div className="text-center pt-8 sm:pt-12" data-aos="fade-down">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">CUET Adventure Society</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight mb-6">
            <span className="text-gray-900 dark:text-white">আমার</span>{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500">বাংলাদেশ</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
            আপনার ভ্রমণের স্মৃতি, পরিবারের বিস্তার আর ভালোবাসার গল্প — সব একসাথে দেশের ৬৪ জেলার ম্যাপে ফুটিয়ে তুলুন। মাত্র কয়েক ক্লিকে নিজের কাস্টম ম্যাপ বানিয়ে সোশ্যাল মিডিয়ায় শেয়ার করুন।
          </p>

          <Link href="/my-bangladesh/color-map" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-sm sm:text-base uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all">
            <i className="fa-solid fa-rocket"></i> শুরু করুন
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" data-aos="fade-up">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-[#0a1c13] p-5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm text-center hover:shadow-md transition-shadow">
              <i className={`${stat.icon} text-2xl mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500`} style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}></i>
              <p className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="text-center mb-10" data-aos="fade-up">
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3">
              এক্সপ্লোর করুন <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">ইন্টারেক্টিভ ম্যাপ</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto">প্রতিটা ম্যাপ আলাদা গল্প বলে। যেটা আপনার মনের মতো, সেটা দিয়ে শুরু করুন।</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mapTools.map((tool, idx) => (
              <Link key={tool.href} href={tool.href} className="group" data-aos="fade-up" data-aos-delay={idx * 100}>
                <div className={`h-full relative overflow-hidden rounded-3xl bg-gradient-to-br ${tool.gradient} p-7 shadow-xl ${tool.shadow} hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 flex flex-col min-h-[340px]`}>
                  <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors"></div>
                  <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-black/10 rounded-full blur-3xl"></div>

                  {tool.badge && (
                    <div className="absolute top-5 right-5 bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full border border-white/40 z-10">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{tool.badge}</span>
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 border border-white/30 group-hover:scale-110 transition-transform duration-500">
                      <i className={`${tool.icon} text-white text-xl`}></i>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-1.5">{tool.title}</h3>
                    <p className="text-white/85 text-xs font-bold mb-3">{tool.subtitle}</p>
                    <p className="text-white/75 text-sm leading-relaxed flex-grow">{tool.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-5 mt-4">
                      {tool.features.map((f) => (
                        <span key={f} className="text-[9px] font-bold text-white/90 bg-white/15 backdrop-blur-sm px-2 py-1 rounded-md border border-white/20">{f}</span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-wider group-hover:gap-4 transition-all">
                      এক্সপ্লোর করুন <i className="fa-solid fa-arrow-right"></i>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-center mb-10" data-aos="fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-full mb-4">
              <i className="fa-solid fa-hourglass-half text-purple-500 text-xs"></i>
              <span className="text-xs font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest">শীঘ্রই আসছে</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3">
              পরবর্তী <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">অ্যাডভেঞ্চার</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto">My Bangladesh আরো সমৃদ্ধ হতে যাচ্ছে। অপেক্ষা করুন নতুন সব ফিচারের জন্য!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {comingSoonTools.map((tool, idx) => (
              <div key={tool.title} className="bg-white dark:bg-[#0a1c13] p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 relative overflow-hidden group hover:border-gray-300 dark:hover:border-white/20 transition-colors" data-aos="fade-up" data-aos-delay={idx * 100}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${tool.color}15`, border: `1.5px solid ${tool.color}40` }}>
                  <i className={`${tool.icon} text-xl`} style={{ color: tool.color }}></i>
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{tool.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{tool.description}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5">
                  <i className="fa-solid fa-clock text-[9px] text-gray-500"></i>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coming Soon</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 rounded-3xl p-8 sm:p-12 relative overflow-hidden" data-aos="fade-up">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/15 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-black/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/30">
              <i className="fa-solid fa-heart text-white text-3xl"></i>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white mb-4 leading-tight">আপনার গল্প, আপনার ম্যাপ</h2>
            <p className="text-white/90 text-base sm:text-lg leading-relaxed mb-8">
              প্রতিটা জেলা একটা গল্প। প্রতিটা ভ্রমণ একটা স্মৃতি। এই টুলগুলো আপনার সেই গল্পগুলোকে সুন্দরভাবে visual করার জন্য বানানো — সম্পূর্ণ ফ্রি, সম্পূর্ণ আপনার নিজের।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <i className="fa-solid fa-shield-halved text-white text-xl mb-2"></i>
                <p className="text-white font-black text-sm mb-1">১০০% ফ্রি</p>
                <p className="text-white/70 text-xs">কোনো লগইন লাগবে না</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <i className="fa-solid fa-lock text-white text-xl mb-2"></i>
                <p className="text-white font-black text-sm mb-1">প্রাইভেসি ফার্স্ট</p>
                <p className="text-white/70 text-xs">সব data শুধু আপনার ব্রাউজারে</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <i className="fa-solid fa-download text-white text-xl mb-2"></i>
                <p className="text-white font-black text-sm mb-1">HD ডাউনলোড</p>
                <p className="text-white/70 text-xs">৪K রেজোলিউশনে সেভ করুন</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center py-8" data-aos="fade-up">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">প্রস্তুত?</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-6">আজই আপনার বাংলাদেশ ম্যাপ বানান</h2>
          <Link href="/my-bangladesh/color-map" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all">
            <i className="fa-solid fa-map-location-dot"></i> শুরু করুন
          </Link>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
            Powered by <span className="font-bold">CUET Adventure Society</span>
          </p>
        </div>
      </div>
    </div>
  );
}
