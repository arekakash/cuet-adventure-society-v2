"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import Link from "next/link";
import html2canvas from "html2canvas";
import AOS from "aos";
import "aos/dist/aos.css";

const geoUrl = "/bd-districts.json"; 

const colorPalette = [
  { name: "Emerald", value: "#10b981" },
  { name: "Sky Blue", value: "#3b82f6" },
  { name: "Pastel Pink", value: "#f472b6" },
  { name: "Soft Purple", value: "#a78bfa" },
  { name: "Golden Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "Teal", value: "#2dd4bf" }
];

export default function MyBangladeshPage() {
  const [visitedDistricts, setVisitedDistricts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState("");
  
  const [selectedColor, setSelectedColor] = useState(colorPalette[0].value);
  const mapCardRef = useRef(null);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, visited_districts')
      .eq('id', session.user.id)
      .single();

    if (data && !error) {
      setUserProfile(data);
      setVisitedDistricts(data.visited_districts || []);
    }
    setLoading(false);
  };

  const handleDistrictClick = async (geo) => {
    if (!userProfile) {
      alert("ম্যাপে জেলা মার্ক করতে অনুগ্রহ করে প্রথমে লগইন করুন!");
      return;
    }

    // 🔴 এখানে adm2_name যুক্ত করা হলো
    const districtName = 
      geo.properties.adm2_name || 
      geo.properties.ADM2_EN || 
      geo.properties.NAME_2 || 
      geo.properties.name || 
      geo.properties.Dist_Name ||
      geo.properties.district;
    
    if (!districtName) return;

    setSaving(true);
    let updatedDistricts = [...visitedDistricts];

    if (updatedDistricts.includes(districtName)) {
      updatedDistricts = updatedDistricts.filter(d => d !== districtName);
    } else {
      updatedDistricts.push(districtName);
    }

    setVisitedDistricts(updatedDistricts);

    const { error } = await supabase
      .from('profiles')
      .update({ visited_districts: updatedDistricts })
      .eq('id', userProfile.id);

    if (error) {
      console.error(error);
      alert("সংরক্ষণ করতে সমস্যা হয়েছে: " + error.message);
    }
    setSaving(false);
  };

  const handleDownloadMap = async () => {
    if (!mapCardRef.current) return;
    setDownloading(true);
    
    try {
      const canvas = await html2canvas(mapCardRef.current, {
        backgroundColor: '#050b08', 
        scale: 2, 
        useCORS: true,
      });
      
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `My-Bangladesh-${userProfile?.full_name || 'Travel-Map'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Download Error:", error);
      alert("ম্যাপটি ডাউনলোড করতে সমস্যা হয়েছে।");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#050b08]">
        <i className="fa-solid fa-compass fa-spin text-4xl" style={{ color: selectedColor }}></i>
      </div>
    );
  }

  const percentage = Math.round((visitedDistricts.length / 64) * 100);

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors duration-500" style={{ backgroundColor: selectedColor }}></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors duration-500" style={{ backgroundColor: selectedColor }}></div>

      <div className="max-w-6xl mx-auto z-10 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-6" data-aos="fade-down">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold mb-4 text-sm">
              <i className="fa-solid fa-arrow-left"></i> হোমে ফিরে যান
            </Link>
            
            <div className="bg-[#0a1c13] border border-white/10 px-5 py-3 rounded-2xl shadow-lg inline-block">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">আপনার প্রিয় থিম কালার বেছে নিন:</p>
              <div className="flex flex-wrap gap-3">
                {colorPalette.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 rounded-full shadow-lg transition-all duration-300 ${selectedColor === color.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0a1c13]' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saving && (
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2" style={{ color: selectedColor }}>
                <i className="fa-solid fa-circle-notch fa-spin"></i> সেভ হচ্ছে...
              </div>
            )}
            
            {visitedDistricts.length > 0 && (
              <button 
                onClick={handleDownloadMap} 
                disabled={downloading}
                className="text-white px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105"
                style={{ backgroundColor: selectedColor, boxShadow: `0 0 20px ${selectedColor}60` }}
              >
                {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                {downloading ? "প্রসেসিং..." : "ম্যাপ ডাউনলোড করুন"}
              </button>
            )}
          </div>
        </div>

        <div 
          ref={mapCardRef} 
          className="glass-panel border border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative bg-[#0a1c13] transition-colors duration-500" 
          data-aos="zoom-in"
        >
          <div className="flex justify-between items-end border-b border-white/10 pb-6 mb-8">
            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">আমার বাংলাদেশ ভ্রমণ</h2>
              <p className="text-sm sm:text-base font-bold text-gray-400 uppercase tracking-widest mt-2">
                অ্যাডভেঞ্চারার: <span style={{ color: selectedColor }} className="text-lg font-black ml-1 transition-colors duration-500">{userProfile?.full_name || 'Guest Explorer'}</span>
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <h2 className="text-2xl font-black text-white"><span style={{ color: selectedColor }}>C</span>UET <span style={{ color: selectedColor }}>A</span>S</h2>
              <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase mt-1">Adventure Society</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 items-center">
            
            <div className="w-full md:w-1/4 flex flex-row md:flex-col gap-4">
              <div className="flex-1 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-lg">
                <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">মোট ভ্রমণ</p>
                <h3 className="text-3xl sm:text-5xl font-black transition-colors duration-500" style={{ color: selectedColor }}>
                  {visitedDistricts.length} <span className="text-base sm:text-lg text-gray-500">/ ৬৪</span>
                </h3>
              </div>
              <div className="flex-1 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-lg">
                <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">বাকি আছে</p>
                <h3 className="text-2xl sm:text-4xl font-black text-gray-300">
                  {64 - visitedDistricts.length} <span className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest">জেলা</span>
                </h3>
              </div>
              <div className="flex-1 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20" style={{ backgroundColor: selectedColor }}></div>
                <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">সম্পন্ন হয়েছে</p>
                <h3 className="text-3xl sm:text-5xl font-black transition-colors duration-500" style={{ color: selectedColor }}>
                  {percentage}%
                </h3>
              </div>
            </div>

            <div className="w-full md:w-3/4 h-[50vh] sm:h-[65vh] bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center relative shadow-inner">
              
              {hoveredDistrict && (
                <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-black shadow-lg border border-white/10 transition-colors duration-300" style={{ color: selectedColor }}>
                  📍 {hoveredDistrict}
                </div>
              )}

              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ 
                  scale: 4000, 
                  center: [90.35, 23.8] // সেন্টার পয়েন্ট একটু অ্যাডজাস্ট করা হলো
                }}
                className="w-full h-full outline-none"
              >
                <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        // 🔴 এখানেও adm2_name যুক্ত করা হলো
                        const districtName = 
                          geo.properties.adm2_name || 
                          geo.properties.ADM2_EN || 
                          geo.properties.NAME_2 || 
                          geo.properties.name || 
                          geo.properties.Dist_Name ||
                          geo.properties.district;

                        const isVisited = visitedDistricts.includes(districtName);

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onClick={() => handleDistrictClick(geo)}
                            onMouseEnter={() => setHoveredDistrict(districtName || "")}
                            onMouseLeave={() => setHoveredDistrict("")}
                            style={{
                              default: {
                                fill: isVisited ? selectedColor : "#1e293b",
                                outline: "none",
                                stroke: "#050b08",
                                strokeWidth: 0.8,
                                filter: isVisited ? `drop-shadow(0px 0px 8px ${selectedColor}90)` : "none",
                                transition: "all 0.3s ease"
                              },
                              hover: {
                                fill: isVisited ? selectedColor : "#3b82f6",
                                outline: "none",
                                stroke: "#ffffff",
                                strokeWidth: 1.5,
                                cursor: "pointer",
                              },
                              pressed: {
                                fill: "#ffffff",
                                outline: "none",
                              },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
