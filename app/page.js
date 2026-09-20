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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // জিরো স্টোরেজ পলিসি: ImgBB API Key
  const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23'; 

  useEffect(() => {
    AOS.init({ once: true, offset: 100 });
    checkAdminStatus();
    fetchSliders();
  }, []);

  // ৩.৫ সেকেন্ড পরপর স্লাইডার অ্যানিমেশন
  useEffect(() => {
    if (sliders.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliders.length);
    }, 3500);
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
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // ক্রপিং, অটো-কম্প্রেশন এবং ImgBB আপলোড লজিক
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
      
      // Auto compress loop until size is approx under 200KB
      while (base64Image.length > 270000 && quality > 0.2) {
        quality -= 0.1;
        base64Image = canvas.toDataURL('image/jpeg', quality);
      }

      // Convert Base64 to Blob
      const blob = await fetch(base64Image).then(res => res.blob());
      const file = new File([blob], "hero-slider.jpg", { type: "image/jpeg" });

      // Upload to ImgBB
      const formData = new FormData();
      formData.append('image', file);
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const imgbbData = await imgbbRes.json();

      if (!imgbbData.success) throw new Error("Upload Failed");

      // Update Supabase with just the URL
      const newUrl = imgbbData.data.url;
      await supabase.from('hero_sliders').update({ image_url: newUrl }).eq('id', editingId);

      alert("ছবি সফলভাবে আপডেট এবং কম্প্রেস করা হয়েছে!");
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
    <main className="bg-[#030705] text-gray-300 font-sans antialiased selection:bg-campfire selection:text-white overflow-x-hidden min-h-screen">
      
      {/* 🔴 Eye-catching Framed Hero Section with Slider */}
      <section className="relative min-h-[90vh] pt-20 px-4 sm:px-6 flex items-center justify-center">
        
        {/* The Majestic Border Container */}
        <div className="relative w-full max-w-7xl h-[85vh] rounded-[2.5rem] p-2 bg-white/5 border border-white/10 shadow-[0_0_80px_rgba(231,111,81,0.15)] overflow-hidden group z-10">
          
          {/* Inner Glowing Frame */}
          <div className="absolute inset-0 border-[2px] border-campfire/40 rounded-[2.5rem] pointer-events-none z-30 shadow-[inset_0_0_50px_rgba(231,111,81,0.2)]"></div>
          <div className="absolute inset-2 border border-white/20 rounded-[2rem] pointer-events-none z-30"></div>

                    {/* 🔴 Slider Images Engine */}
          <div className="absolute inset-2 rounded-[2rem] overflow-hidden bg-[#0a1c13]">
            {sliders.map((slide, index) => (
              <img 
                key={slide.id}
                src={slide.image_url} 
                alt={`Slider ${index + 1}`} 
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1500ms] ease-in-out will-change-transform ${index === currentSlide ? 'opacity-100 scale-105 z-10' : 'opacity-0 scale-100 z-0'}`} 
              />
            ))}
            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#030705]/60 via-[#0a1c13]/70 to-[#030705]/90 z-20 pointer-events-none"></div>
          </div>


          {/* Hero Content Overlay */}
          <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6" data-aos="zoom-out" data-aos-duration="1500">
            <div className="inline-block px-5 py-2 rounded-full border border-campfire/30 text-campfire font-bold text-xs sm:text-sm mb-6 tracking-widest backdrop-blur-md shadow-glow animate-pulse bg-black/40">
              <i className="fa-solid fa-fire mr-2"></i> <span>২০১৫ সাল থেকে পথচলা</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black leading-tight tracking-tighter mb-6 text-glow-futuristic text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
              চুয়েট অ্যাডভেঞ্চার <br />সোসাইটি
            </h1>
            
            <p className="text-lg sm:text-2xl text-gray-200 font-medium mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              পাহাড়ের গহীনে, মেঘের চূড়ায় কিংবা অরণ্যের গভীরে—চুয়েটিয়ানদের পদচারণায় জেগে উঠুক নতুন ট্রেইল।
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup" className="w-full sm:w-auto bg-campfire hover:bg-orange-600 px-8 py-4 sm:py-4 rounded-2xl font-black transition-all shadow-glow flex items-center justify-center gap-3 text-lg text-white hover:-translate-y-1">
                <i className="fa-solid fa-shoe-prints"></i> <span>এক্সপ্লোর শুরু করুন</span>
              </Link>
              <Link href="/login" className="w-full sm:w-auto bg-black/40 hover:bg-white/10 border border-white/20 text-white px-8 py-4 sm:py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 text-lg backdrop-blur-md hover:-translate-y-1 shadow-lg">
                <i className="fa-solid fa-right-to-bracket text-gray-400"></i> <span>লগইন</span>
              </Link>
            </div>
          </div>

          {/* 🔴 Admin Edit Panel Overlay (Mobile Friendly Fixed Visibility) */}
          {isAdmin && (
            <div className="absolute top-6 right-6 sm:top-6 sm:right-6 z-40 bg-black/70 backdrop-blur-md border border-campfire/50 p-3 sm:p-4 rounded-2xl shadow-xl transition-opacity opacity-100 sm:opacity-0 group-hover:opacity-100 flex flex-col gap-2">
              <p className="text-[10px] text-campfire font-bold uppercase tracking-widest text-center mb-1 border-b border-campfire/30 pb-1">অ্যাডমিন স্লাইডার প্যানেল</p>
              <div className="flex gap-2">
                {sliders.map((slide, i) => (
                  <label key={slide.id} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${currentSlide === i ? 'bg-campfire text-white border-campfire' : 'bg-black/50 text-gray-400 border-white/10 hover:border-campfire/50'}`}>
                    <span className="text-xs font-black">{i + 1}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, slide.id)} />
                  </label>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Other Original Sections */}
      <section className="py-24 sm:py-32 max-w-4xl mx-auto px-6 relative z-10">
        <div className="absolute top-40 left-0 w-72 h-72 bg-trail/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-40 right-0 w-96 h-96 bg-campfire/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="space-y-16 sm:space-y-24 text-lg sm:text-xl md:text-2xl leading-relaxed sm:leading-loose text-gray-200 font-light relative z-10">
          
          <div data-aos="fade-up" data-aos-duration="1000" className="text-center drop-shadow-md">
            <i className="fa-solid fa-quote-left text-4xl text-white/20 mb-6"></i>
            <p className="font-bold text-white text-2xl sm:text-4xl leading-tight">পাহাড় আর সমুদ্রের সীমানায় আমরা—<span className="text-campfire">চুয়েটিয়ান!</span></p>
            <p className="mt-4 font-medium">দেশের সবচেয়ে সুন্দর রুটগুলো যাদের ক্যাম্পাসের ঠিক দোরগোড়ায়.</p>
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

      {/* 🔴 Mobile Friendly Admin Image Cropper Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md">
          <div className="relative flex-grow">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9} // Strict 16:9 Ratio
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          
          {/* Mobile Zoom Control Slider */}
          <div className="bg-[#0a1c13] px-6 py-4 border-t border-white/10 flex items-center gap-4">
            <i className="fa-solid fa-magnifying-glass-minus text-gray-400"></i>
            <input 
              type="range" 
              value={zoom} 
              min={1} 
              max={3} 
              step={0.1} 
              onChange={(e) => setZoom(Number(e.target.value))} 
              className="w-full accent-campfire"
            />
            <i className="fa-solid fa-magnifying-glass-plus text-gray-400"></i>
          </div>

          <div className="pb-8 pt-4 bg-[#0a1c13] flex items-center justify-between px-6 border-t border-black">
            <button onClick={() => setIsEditModalOpen(false)} className="text-red-400 font-bold hover:bg-red-500/20 px-5 py-3 rounded-xl transition-colors">বাতিল</button>
            <button onClick={handleCropAndUpload} disabled={isUploading} className="bg-campfire hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-glow flex items-center gap-2">
              {isUploading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-crop-simple"></i>}
              {isUploading ? 'সেভ হচ্ছে...' : 'ক্রপ ও সেভ করুন'}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
