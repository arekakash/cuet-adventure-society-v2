"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import Link from "next/link";
import html2canvas from "html2canvas";
import AOS from "aos";
import "aos/dist/aos.css";

const geoUrl = "/bd-districts.topo.json"; 

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
  // নতুন স্টেট: ডাউনলোড থিম (ডার্ক বা লাইট)
  const [downloadTheme, setDownloadTheme] = useState("dark"); 
  
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
      // থিম অনুযায়ী ব্যাকগ্রাউন্ড কালার সেট করা
      const bgColor = downloadTheme === "light" ? "#f8fafc" : "#050b08";

      const canvas = await html2canvas(mapCardRef.current, {
        backgroundColor: bgColor, 
        scale: 2, 
        useCORS: true,
        logging: false
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

  // থিম অনুযায়ী কালার ভেরিয়েবল
  const isLight = downloadTheme === "light";
  const cardBg = isLight ? "bg-white" : "bg-[#0a1c13]";
  const textColor = isLight ? "text-slate-800" : "text-white";
  const subTextColor = isLight ? "text-slate-500" : "text-gray-400";
  const borderColor = isLight ? "border-slate-200" : "border-white/10";
  const statBoxBg = isLight ? "bg-slate-50" : "bg-black/40";
  const mapBg = isLight ? "bg-slate-100" : "bg-black/40";
  const unvisitedFill = isLight ? "#e2e8f0" : "#1e293b";
  const mapStroke = isLight ? "#ffffff" : "#050b08";

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors duration-500" style={{ backgroundColor: selectedColor }}></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors duration-500" style={{ backgroundColor: selectedColor }}></div>

      <div className="max-w-4xl mx-auto z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6" data-aos="fade-down">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold mb-4 text-sm">
              <i className="fa-solid fa-arrow-left"></i> হোমে ফিরে যান
            </Link>
            
            <div className="bg-[#0a1c13] border border-white/10 px-5 py-4 rounded-2xl shadow-lg">
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

          <div className="flex flex-col items-end gap-4 w-full md:w-auto">
            {saving && (
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2" style={{ color: selectedColor }}>
                <i className="fa-solid fa-circle-notch fa-spin"></i> সেভ হচ্ছে...
              </div>
            )}
            
            {/* ডাউনলোড প্যানেল */}
            {visitedDistricts.length > 0 && (
              <div className="bg-[#0a1c13] border border-white/10 p-4 rounded-2xl shadow-lg w-full md:w-auto flex flex-col sm:flex-row items-center gap-4">
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                  <button 
                    onClick={() => setDownloadTheme("dark")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!isLight ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <i className="fa-solid fa-moon mr-1"></i> ডার্ক
                  </button>
                  <button 
                    onClick={() => setDownloadTheme("light")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isLight ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <i className="fa-solid fa-sun mr-1"></i> লাইট
                  </button>
                </div>

                <button 
                  onClick={handleDownloadMap} 
                  disabled={downloading}
                  className="w-full sm:w-auto text-white px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-105"
                  style={{ backgroundColor: selectedColor, boxShadow: `0 0 20px ${selectedColor}60` }}
                >
                  {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                  {downloading ? "প্রসেসিং..." : "ম্যাপ ডাউনলোড"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🔴 ডাউনলোড কার্ড (Refined Layout) */}
        <div 
          ref={mapCardRef} 
          className={`border ${borderColor} rounded-[2rem] p-6 sm:p-8 shadow-2xl relative transition-colors duration-500 ${cardBg}`} 
          data-aos="zoom-in"
        >
          {/* Header */}
          <div className={`flex justify-between items-end border-b ${borderColor} pb-4 mb-6`}>
            <div>
              <h2 className={`text-2xl sm:text-4xl font-black ${textColor} tracking-tight mb-1`}>আমার বাংলাদেশ ভ্রমণ</h2>
              <p className={`text-xs sm:text-sm font-bold ${subTextColor} uppercase tracking-widest`}>
                অভিযাত্রী: <span style={{ color: selectedColor }} className="text-base sm:text-lg font-black ml-1 transition-colors duration-500">{userProfile?.full_name || 'Guest Explorer'}</span>
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <h2 className={`text-xl font-black ${textColor}`}><span style={{ color: selectedColor }}>C</span>UET <span style={{ color: selectedColor }}>A</span>S</h2>
              <p className={`text-[9px] ${subTextColor} font-black tracking-widest uppercase mt-0.5`}>Adventure Society</p>
            </div>
          </div>
          
          {/* Stats Section (Horizontal Layout - Smaller) */}
          <div className="flex gap-3 sm:gap-6 mb-6">
            <div className={`flex-1 ${statBoxBg} p-3 sm:p-4 rounded-xl border ${borderColor} text-center shadow-sm`}>
              <p className={`text-[9px] sm:text-[10px] ${subTextColor} font-bold uppercase tracking-wider mb-1`}>মোট ভ্রমণ</p>
              <h3 className="text-xl sm:text-3xl font-black transition-colors duration-500" style={{ color: selectedColor }}>
                {visitedDistricts.length} <span className={`text-xs sm:text-sm ${subTextColor}`}>/ ৬৪</span>
              </h3>
            </div>
            <div className={`flex-1 ${statBoxBg} p-3 sm:p-4 rounded-xl border ${borderColor} text-center shadow-sm`}>
              <p className={`text-[9px] sm:text-[10px] ${subTextColor} font-bold uppercase tracking-wider mb-1`}>বাকি আছে</p>
              <h3 className={`text-xl sm:text-3xl font-black ${textColor}`}>
                {64 - visitedDistricts.length} <span className={`text-[10px] sm:text-xs ${subTextColor}`}>জেলা</span>
              </h3>
            </div>
            <div className={`flex-1 ${statBoxBg} p-3 sm:p-4 rounded-xl border ${borderColor} text-center shadow-sm`}>
              <p className={`text-[9px] sm:text-[10px] ${subTextColor} font-bold uppercase tracking-wider mb-1`}>সম্পন্ন হয়েছে</p>
              <h3 className="text-xl sm:text-3xl font-black transition-colors duration-500" style={{ color: selectedColor }}>
                {percentage}%
              </h3>
            </div>
          </div>

          {/* Map Container (Bigger) */}
          <div className={`w-full h-[60vh] sm:h-[65vh] md:h-[70vh] ${mapBg} rounded-3xl border ${borderColor} overflow-hidden flex items-center justify-center relative`}>
            
            {/* Hover Tooltip */}
            {hoveredDistrict && (
              <div className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg border border-white/10 transition-colors duration-300" style={{ color: selectedColor }}>
                📍 {hoveredDistrict}
              </div>
            )}

            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 4800, center: [90.35, 23.8] }}
              className="w-full h-full outline-none"
            >
              <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
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
                              fill: isVisited ? selectedColor : unvisitedFill,
                              outline: "none",
                              stroke: mapStroke,
                              strokeWidth: isLight ? 1 : 0.8,
                              filter: isVisited && !isLight ? `drop-shadow(0px 0px 8px ${selectedColor}90)` : "none",
                              transition: "all 0.3s ease"
                            },
                            hover: {
                              fill: isVisited ? selectedColor : "#3b82f6",
                              outline: "none",
                              stroke: isLight ? "#000" : "#ffffff",
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
  );
}
