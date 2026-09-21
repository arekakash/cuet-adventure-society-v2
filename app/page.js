"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";
import Cropper from "react-easy-crop";

export default function HomePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sliders, setSliders] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Admin Edit States
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23'; 

  useEffect(() => {
    AOS.init({ once: true, offset: 50 });
    checkAdminStatus();
    fetchSliders();
  }, []);

  // ৩ সেকেন্ড পরপর স্লাইড (Horizontal Translation)
  useEffect(() => {
    if (sliders.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliders.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [sliders]);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (data?.role === 'admin') setIsAdmin(true);
    }
  };

  const fetchSliders = async () => {
    const { data } = await supabase.from('hero_sliders').select('*').order('id', { ascending: true });
    if (data && data.length > 0) setSliders(data);
  };

  const handleImageSelect = (e, id) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
        setEditingId(id);
        setIsEditModalOpen(true);
        setIsAdminPanelOpen(false); // Close thumbnail panel when cropping starts
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndUpload = async () => {
    setIsUploading(true);
    try {
      const image = new Image();
      image.src = imageSrc;
      await new Promise(resolve => image.onload = resolve);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);

      let quality = 0.9;
      let base64Image = canvas.toDataURL('image/jpeg', quality);
      
      while (base64Image.length > 270000 && quality > 0.2) {
        quality -= 0.1;
        base64Image = canvas.toDataURL('image/jpeg', quality);
      }

      const blob = await fetch(base64Image).then(res => res.blob());
      const file = new File([blob], "hero-slider.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append('image', file);
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const imgbbData = await imgbbRes.json();

      if (!imgbbData.success) throw new Error("Upload Failed");

      const newUrl = imgbbData.data.url;
      await supabase.from('hero_sliders').update({ image_url: newUrl }).eq('id', editingId);

      alert("ছবি সফলভাবে আপডেট করা হয়েছে!");
      setIsEditModalOpen(false);
      fetchSliders(); 
    } catch (error) {
      console.error(error);
      alert("ছবি আপডেটে সমস্যা হয়েছে!");
    } finally {
      setIsUploading(false);
    }
  };

    return (
    <main className="bg-[#030705] text-gray-300 font-sans antialiased overflow-x-hidden min-h-screen flex flex-col">
      
      {/* CSS for Marquee Scrolling Text */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll-text {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: scroll-text 20s linear infinite;
        }
      `}} />

      {/* 🔴 1. 16:9 Slider Banner Section (Ultra-Lightweight, Horizontal Slide) */}
      <section className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-[#0a1c13] overflow-hidden mt-16 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        
        {/* Sliding Flex Container */}
        <div 
          className="flex w-full h-full transition-transform duration-[1200ms] ease-in-out will-change-transform"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {/* Skeleton Loader (When sliders are fetching from Supabase) */}
          {sliders.length === 0 ? (
            <div className="min-w-full h-full flex items-center justify-center bg-[#050b08] animate-pulse">
               <i className="fa-solid fa-mountain-sun text-6xl text-gray-700/50"></i>
            </div>
          ) : (
            sliders.map((slide, index) => (
              <div key={slide.id} className="min-w-full h-full relative shrink-0">
                <img 
                  src={slide.image_url} 
                  alt={`Slide ${slide.id}`} 
                  className="w-full h-full object-cover bg-[#050b08]"
                  /* 🔴 Magic Fix: First image loads instantly, others wait */
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                />
              </div>
            ))
          )}
        </div>

        {/* 🔴 2. Minimal Admin Panel Trigger */}
        {isAdmin && (
          <div className="absolute top-4 right-4 z-30">
            <button 
              onClick={() => setIsAdminPanelOpen(true)}
              className="bg-black/60 hover:bg-[#e76f51] backdrop-blur-md text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-lg border border-white/20"
            >
              <i className="fa-solid fa-gear"></i>
            </button>
          </div>
        )}
      </section>


      {/* 🔴 4. Scrolling Ticker (Marquee) */}
      <div className="bg-[#e76f51] text-[#030705] py-2 overflow-hidden flex items-center border-y border-yellow-500/30 shadow-md relative z-20">
        <div className="whitespace-nowrap w-full">
          <span className="animate-marquee font-bold text-xs sm:text-sm tracking-wide">
            <i className="fa-solid fa-bolt mr-2"></i> চুয়েট এডভেঞ্চার সোসাইটি একটি সম্পূর্ণ অলাভজনক এবং অরাজনৈতিক প্রতিষ্ঠান, শুধুমাত্র ভ্রমণের মাধ্যমে নিখাদ আনন্দ লাভ আমাদের একমাত্র উদ্দেশ্য। <i className="fa-solid fa-bolt ml-2"></i>
          </span>
        </div>
      </div>

      {/* 🔴 3. Text & Content Section (Separated from Images) */}
      <section className="py-16 sm:py-24 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center" data-aos="fade-up">
          <div className="inline-block px-4 py-1.5 rounded-full border border-gray-700 text-gray-400 font-bold text-xs sm:text-sm mb-8 bg-white/5">
            <i className="fa-solid fa-fire text-[#e76f51] mr-2"></i> ২০১৫ সাল থেকে পথচলা
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight tracking-tighter mb-8 text-white">
            চুয়েট অ্যাডভেঞ্চার <span className="text-[#e76f51]">সোসাইটি</span>
          </h1>
          
          <p className="text-base sm:text-xl text-gray-400 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            পাহাড়ের গহীনে, মেঘের চূড়ায় কিংবা অরণ্যের গভীরে—চুয়েটিয়ানদের পদচারণায় জেগে উঠুক নতুন ট্রেইল।
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup" className="w-full sm:w-auto bg-[#e76f51] hover:bg-orange-600 px-8 py-3.5 rounded-xl font-black transition-colors flex items-center justify-center gap-3 text-white shadow-lg">
              <i className="fa-solid fa-shoe-prints"></i> এক্সপ্লোর শুরু করুন
            </Link>
            <Link href="/login" className="w-full sm:w-auto bg-[#0a1c13] hover:bg-[#0d261a] border border-emerald-900/50 text-white px-8 py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-3 shadow-lg">
              <i className="fa-solid fa-right-to-bracket text-emerald-500"></i> লগইন
            </Link>
          </div>
        </div>
      </section>

      {/* Original Features Section */}
      <section className="py-12 sm:py-20 max-w-5xl mx-auto px-6 relative z-10 border-t border-white/5">
        <div className="space-y-16 sm:space-y-24">
          
          <div data-aos="fade-up" className="text-center">
            <i className="fa-solid fa-quote-left text-3xl text-gray-700 mb-4"></i>
            <p className="font-bold text-white text-xl sm:text-3xl leading-tight">পাহাড় আর সমুদ্রের সীমানায় আমরা—<span className="text-[#e76f51]">চুয়েটিয়ান!</span></p>
            <p className="mt-3 text-sm sm:text-base font-medium text-gray-500">দেশের সবচেয়ে সুন্দর রুটগুলো যাদের ক্যাম্পাসের ঠিক দোরগোড়ায়.</p>
          </div>

          <div data-aos="fade-up" className="grid sm:grid-cols-3 gap-6">
            <div className="bg-[#0a1c13] p-6 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-colors">
              <i className="fa-solid fa-calendar-check text-3xl text-emerald-500 mb-4"></i>
              <h4 className="font-bold text-white mb-2">নিয়মিত ট্যুর</h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">প্রতি মাসেই আয়োজন করা হয় দারুণ সব রোমাঞ্চকর ট্যুর।</p>
            </div>
            <div className="bg-[#0a1c13] p-6 rounded-2xl border border-white/5 hover:border-[#e76f51]/30 transition-colors">
              <i className="fa-solid fa-map-location-dot text-3xl text-[#e76f51] mb-4"></i>
              <h4 className="font-bold text-white mb-2">হিডেন স্পট শেয়ারিং</h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">ক্যাম্পাসের আশপাশের অজানা ঝিরি বা পাহাড় খুঁজে পেলে শেয়ার করুন।</p>
            </div>
            <div className="bg-[#0a1c13] p-6 rounded-2xl border border-white/5 hover:border-blue-400/30 transition-colors">
              <i className="fa-solid fa-people-group text-3xl text-blue-400 mb-4"></i>
              <h4 className="font-bold text-white mb-2">কমিউনিটি পাওয়ার</h4>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">একাকী ভ্রমণ নয়, দল বেঁধে ঘুরে বেড়ানোর নিখাদ আনন্দ।</p>
            </div>
          </div>

        </div>
      </section>

      {/* 🔴 6. 3D Floating Social Links Section */}
      <section className="py-16 sm:py-24 bg-[#050b08] border-t border-white/5 relative z-10 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h3 className="text-2xl sm:text-4xl font-black text-white mb-4">আমাদের সাথে <span className="text-[#e76f51]">যুক্ত হোন</span></h3>
          <p className="text-gray-400 text-sm mb-12">কমিউনিটির সব আপডেট পেতে সোশ্যাল মিডিয়ায় ফলো করুন</p>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            
            {/* FB Page */}
            <a href="https://www.facebook.com/share/1PoWHdyPeV/" target="_blank" className="group bg-[#0a1c13] border border-white/10 p-4 w-32 sm:w-40 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(24,119,242,0.2)] hover:border-[#1877F2]/50">
              <i className="fa-brands fa-facebook text-3xl text-gray-500 group-hover:text-[#1877F2] transition-colors mb-2"></i>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">FB Page</span>
            </a>

            {/* FB Group */}
            <a href="https://NzNlfacebook.com/share/g/1JGXYcNPhC/" target="_blank" className="group bg-[#0a1c13] border border-white/10 p-4 w-32 sm:w-40 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(24,119,242,0.2)] hover:border-[#1877F2]/50">
              <i className="fa-solid fa-users text-3xl text-gray-500 group-hover:text-[#1877F2] transition-colors mb-2"></i>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">FB Group</span>
            </a>

            {/* Instagram */}
            <a href="https://www.instagram.com/cuet_adventure_society?stkn=bnlxbnA3aG4zOTg3" target="_blank" className="group bg-[#0a1c13] border border-white/10 p-4 w-32 sm:w-40 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(225,48,108,0.2)] hover:border-[#E1306C]/50">
              <i className="fa-brands fa-instagram text-3xl text-gray-500 group-hover:text-[#E1306C] transition-colors mb-2"></i>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">Instagram</span>
            </a>

            {/* Insta Chat */}
            <a href="https://ig.me/j/neGUu-76jpsZK6Pv/" target="_blank" className="group bg-[#0a1c13] border border-white/10 p-4 w-32 sm:w-40 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(131,58,180,0.2)] hover:border-[#833AB4]/50">
              <i className="fa-regular fa-comment-dots text-3xl text-gray-500 group-hover:text-[#833AB4] transition-colors mb-2"></i>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">Insta Chat</span>
            </a>

            {/* WhatsApp */}
            <a href="https://chat.whatsapp.com/ETpX1KFvtqeL6bHqzEvmxy" target="_blank" className="group bg-[#0a1c13] border border-white/10 p-4 w-32 sm:w-40 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(37,211,102,0.2)] hover:border-[#25D366]/50">
              <i className="fa-brands fa-whatsapp text-3xl text-gray-500 group-hover:text-[#25D366] transition-colors mb-2"></i>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">WhatsApp</span>
            </a>

            {/* Telegram */}
            <a href="https://t.me/+-CZ_HsryVLA1NzNl" target="_blank" className="group bg-[#0a1c13] border border-white/10 p-4 w-32 sm:w-40 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(0,136,204,0.2)] hover:border-[#0088cc]/50">
              <i className="fa-brands fa-telegram text-3xl text-gray-500 group-hover:text-[#0088cc] transition-colors mb-2"></i>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">Telegram</span>
            </a>

            {/* Messenger */}
            <a href="https://m.me/j/wU6N1jDd8iNDP_ea/?send_source=gc%3Acopy_invite_link_t" target="_blank" className="group bg-[#0a1c13] border border-white/10 p-4 w-32 sm:w-40 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(0,106,255,0.2)] hover:border-[#006AFF]/50">
              <i className="fa-brands fa-facebook-messenger text-3xl text-gray-500 group-hover:text-[#006AFF] transition-colors mb-2"></i>
              <span className="text-xs font-bold text-gray-300 group-hover:text-white">Messenger</span>
            </a>

          </div>
        </div>
      </section>

      {/* 🔴 5. Formal Copyright Footer */}
      <footer className="mt-auto bg-[#020504] border-t border-white/10 py-8 px-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="text-2xl font-black tracking-widest text-white mb-2">
            <span className="text-[#e76f51]">C</span>UET <span className="text-[#e76f51]">A</span>S
          </div>
          <p className="text-xs text-gray-500 mb-1">
            © {new Date().getFullYear()} CUET Adventure Society. সর্বস্বত্ব সংরক্ষিত।
          </p>
          <p className="text-[10px] text-gray-600">
            Design & Developed for the explorers, by the explorers.
          </p>
        </div>
      </footer>

      {/* 🔴 Admin Thumbnail Selection Modal */}
      {isAdminPanelOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => {if(e.target === e.currentTarget) setIsAdminPanelOpen(false)}}>
          <div className="bg-[#0a1c13] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold"><i className="fa-solid fa-images text-[#e76f51] mr-2"></i> ব্যানার স্লাইডার এডিট</h3>
              <button onClick={() => setIsAdminPanelOpen(false)} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            <p className="text-xs text-gray-400 mb-4">যেকোনো একটি ছবিতে ক্লিক করে নতুন ছবি সিলেক্ট করুন (১৬:৯ রেশিও):</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sliders.map((slide, i) => (
                <label key={slide.id} className="relative aspect-video rounded-lg overflow-hidden border-2 border-white/10 hover:border-[#e76f51] cursor-pointer group">
                  <img src={slide.image_url} alt="Thumb" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent transition-colors">
                    <span className="bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">Slide {i + 1}</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, slide.id)} />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🔴 Admin Image Cropper Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-[#030705]">
          <div className="relative flex-grow">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          
          <div className="bg-[#0a1c13] px-6 py-4 border-t border-white/10 flex items-center gap-4">
            <i className="fa-solid fa-magnifying-glass-minus text-gray-400"></i>
            <input 
              type="range" 
              value={zoom} 
              min={1} 
              max={3} 
              step={0.1} 
              onChange={(e) => setZoom(Number(e.target.value))} 
              className="w-full accent-[#e76f51]"
            />
            <i className="fa-solid fa-magnifying-glass-plus text-gray-400"></i>
          </div>

          <div className="pb-8 pt-4 bg-[#0a1c13] flex items-center justify-between px-6 border-t border-black">
            <button onClick={() => {setIsEditModalOpen(false); setIsAdminPanelOpen(true);}} className="text-red-400 font-bold hover:bg-red-500/20 px-5 py-3 rounded-xl transition-colors">বাতিল</button>
            <button onClick={handleCropAndUpload} disabled={isUploading} className="bg-[#e76f51] hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
              {isUploading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-crop-simple"></i>}
              {isUploading ? 'সেভ হচ্ছে...' : 'ক্রপ ও সেভ করুন'}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
