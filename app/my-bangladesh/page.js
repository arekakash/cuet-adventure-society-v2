"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// 🔴 জাদুকরী লাইন! ইন্টারনেট থেকে আর ডাটা টানবে না। 
// প্যাকেজ থেকে সরাসরি ৩০,০০০ লাইনের ম্যাপ ডেটা তোমার প্রজেক্টে লোকালি চলে আসবে!
import geoData from "bangladesh-geojson/src/data/bangladesh.geojson";

export default function MyBangladesh() {
  const [user, setUser] = useState(null);
  const [visited, setVisited] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
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

    fetchUserData();
  }, []);

  const toggleDistrict = async (districtId, districtName) => {
    if (!user) return alert("ম্যাপ আপডেট করতে আগে লগইন করুন!");
    if (!districtId) return;

    const isAlreadyVisited = visited.includes(districtId);
    
    const newVisited = isAlreadyVisited
      ? visited.filter((id) => id !== districtId)
      : [...visited, districtId];
      
    setVisited(newVisited);
    setSaving(true);

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
      
      const canvas = await html2canvas(mapRef.current, { 
        scale: 3, 
        backgroundColor: '#030705',
        useCORS: true 
      });
      
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      
      const link = document.createElement('a');
      link.download = `my-bangladesh-explored-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
    } catch (error) {
      console.error('Oops!', error);
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
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 uppercase tracking-tight">
            আমার <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-[#e76f51]">বাংলাদেশ</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto">
            আপনি বাংলাদেশের ৬৪ জেলার মধ্যে কোন কোন জেলা ভ্রমণ করেছেন তা নির্বাচন করুন এবং আপনার এক্সপ্লোরেশন ম্যাপ ডাউনলোড করুন।
          </p>
        </div>

        {/* Dashboard / Stats Section */}
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
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(231,111,81,0.4)] flex items-center justify-center gap-2 ${saving ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-[#e76f51] hover:bg-orange-600 text-white'}`}
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
            ম্যাপ ডাউনলোড করুন
          </button>
        </div>

        {/* Printable Map Area */}
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

          {/* User Stats on Map */}
          {user && (
             <div className="absolute top-6 right-6 text-right pointer-events-none z-10">
               <p className="text-[#e76f51] font-black text-xl">{visited.length} / 64</p>
               <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Districts Explored</p>
             </div>
          )}

          {/* Interactive SVG Map (Local Data completely offline) */}
          <div className="w-full max-w-lg mx-auto aspect-[3/4] relative mt-16 sm:mt-8">
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 4500,
                center: [90.2, 24.2]
              }}
              className="w-full h-full drop-shadow-2xl"
            >
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const name = geo.properties.shapeName || geo.properties.ADM2_EN || geo.properties.NAME_2 || geo.properties.name || "Unknown";
                    const districtId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    const isVisited = visited.includes(districtId);

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => toggleDistrict(districtId, name)}
                        style={{
                          default: {
                            fill: isVisited ? "#e76f51" : "#1f2937",
                            stroke: "#030705",
                            strokeWidth: 0.5,
                            outline: "none",
                            transition: "all 300ms",
                          },
                          hover: {
                            fill: isVisited ? "#f97316" : "#4b5563",
                            stroke: "#030705",
                            strokeWidth: 0.5,
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: {
                            fill: "#fb923c",
                            outline: "none",
                          }
                        }}
                      >
                        <title>{name}</title>
                      </Geography>
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
        </div>

      </div>
    </div>
  );
}
