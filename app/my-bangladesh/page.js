"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { fetchDistrictsData } from "./districtData";

export default function MyBangladesh() {
  const [user, setUser] = useState(null);
  const [visited, setVisited] = useState([]);
  const [districts, setDistricts] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const mapRef = useRef(null);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      // ১. ৬৪ জেলার ম্যাপ ডেটা ফেচ করা
      const mapData = await fetchDistrictsData();
      setDistricts(mapData);

      // ২. ইউজারের ডেটা ফেচ করা
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data } = await supabase
          .from("profiles")
          .select("visited_districts")
          .eq("id", session.user.id)
          .single();
        
        if (data?.visited_districts) {
          setVisited(data.visited_districts);
        }
      }
      setLoading(false);
    };

    initializeData();
  }, []);

  const toggleDistrict = async (districtId, districtName) => {
    if (!user) return alert("ম্যাপ আপডেট করতে আগে লগইন করুন!");
    
    const isAlreadyVisited = visited.includes(districtId);
    
    // নতুন লিস্ট তৈরি (থাকলে রিমুভ, না থাকলে অ্যাড)
    const newVisited = isAlreadyVisited
      ? visited.filter((id) => id !== districtId)
      : [...visited, districtId];
      
    setVisited(newVisited);
    setSaving(true);

    // মোবাইলের ইউজারের জন্য ছোট্ট অ্যালার্ট (যাতে বুঝতে পারে কোন জেলায় ক্লিক পড়েছে)
    if (!isAlreadyVisited) {
       alert(`✅ ${districtName} আপনার ট্রাভেল লিস্টে যুক্ত হয়েছে!`);
    } else {
       alert(`❌ ${districtName} ট্রাভেল লিস্ট থেকে বাদ দেওয়া হয়েছে!`);
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ visited_districts: newVisited })
        .eq("id", user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error(error);
      alert("আপডেট করতে সমস্যা হয়েছে!");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadMap = async () => {
    if (!mapRef.current) return;
    try {
      setSaving(true);
      
      // html2canvas ব্যবহার করে হাই রেজুলেশন ছবি তৈরি (scale: 3)
      const canvas = await html2canvas(mapRef.current, { 
        scale: 3, 
        backgroundColor: '#030705',
        useCORS: true
      });
      
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      
      // ক্লায়েন্ট-সাইডেই ছবি ডাউনলোডের ব্যবস্থা
      const link = document.createElement('a');
      link.download = `my-bangladesh-explored-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
    } catch (error) {
      console.error('Oops, something went wrong!', error);
      alert("ছবি ডাউনলোড করতে সমস্যা হয়েছে!");
    } finally {
      setSaving(false);
    }
  };

  const percentage = Math.round((visited.length / 64) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-compass fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 uppercase tracking-tight">
            আমার <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-[#e76f51]">বাংলাদেশ</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            আপনি বাংলাদেশের ৬৪ জেলার মধ্যে কোন কোন জেলা ভ্রমণ করেছেন তা নির্বাচন করুন এবং আপনার এক্সপ্লোরেশন ম্যাপ ডাউনলোড করুন।
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-[#0a1c13] p-4 rounded-2xl border border-white/10 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-black/40 border border-[#e76f51]/50 flex items-center justify-center">
              <span className="text-[#e76f51] font-black text-lg">{visited.length}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">এক্সপ্লোর করেছেন</p>
              <p className="text-white font-bold text-sm">৬৪ জেলার মধ্যে ({percentage}%)</p>
            </div>
          </div>

          <button 
            onClick={handleDownloadMap} 
            disabled={saving}
            className="w-full sm:w-auto bg-[#e76f51] hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(231,111,81,0.4)] flex items-center justify-center gap-2"
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
            ম্যাপ ডাউনলোড করুন
          </button>
        </div>

        {/* 🔴 Printable Map Area (এই অংশের ছবি উঠবে) */}
        <div 
          ref={mapRef} 
          className="bg-[#030705] p-6 sm:p-10 rounded-3xl border border-white/5 relative overflow-hidden"
        >
          {/* Watermark for Downloaded Image */}
          <div className="absolute top-6 left-6 opacity-30 pointer-events-none z-10">
            <h2 className="text-3xl font-black tracking-widest text-white">
              <span className="text-[#e76f51]">C</span>UET <span className="text-[#e76f51]">A</span>S
            </h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Adventure Society</p>
          </div>

          {/* User Name & Stats on Map */}
          {user && (
             <div className="absolute top-6 right-6 text-right pointer-events-none z-10">
               <p className="text-[#e76f51] font-black text-xl">{visited.length} / 64</p>
               <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Districts Explored</p>
             </div>
          )}

          {/* Interactive SVG Map */}
          <div className="w-full max-w-lg mx-auto aspect-[3/4] relative mt-16 sm:mt-8">
            {districts.length > 0 ? (
              <svg 
                viewBox="0 0 550 750" // বাংলাদেশের অরিজিনাল GeoJSON টু SVG এর সাধারণত এই ভিউবক্স থাকে (প্রয়োজনে অ্যাডজাস্ট করা যাবে)
                className="w-full h-full drop-shadow-2xl"
                xmlns="http://www.w3.org/2000/svg"
              >
                {districts.map((district) => {
                  const isVisited = visited.includes(district.id);
                  return (
                    <path
                      key={district.id}
                      d={district.d}
                      onClick={() => toggleDistrict(district.id, district.nameBn || district.name)}
                      className={`cursor-pointer transition-all duration-300 stroke-[#050b08] stroke-[1px] outline-none ${
                        isVisited 
                          ? 'fill-[#e76f51] drop-shadow-[0_0_8px_rgba(231,111,81,0.8)]' // গ্লোয়িং কালার
                          : 'fill-gray-700/50 hover:fill-gray-500' // ডিম কালার
                      }`}
                    >
                      <title>{district.nameBn || district.name}</title>
                    </path>
                  );
                })}
              </svg>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                 <p className="text-gray-500 font-bold animate-pulse">ম্যাপ লোড হচ্ছে...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
