"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
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

const bangladeshDivisions = [
  { name: "ঢাকা", districts: ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"] },
  { name: "চট্টগ্রাম", districts: ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"] },
  { name: "সিলেট", districts: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"] },
  { name: "খুলনা", districts: ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"] },
  { name: "রাজশাহী", districts: ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"] },
  { name: "রংপুর", districts: ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"] },
  { name: "বরিশাল", districts: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"] },
  { name: "ময়মনসিংহ", districts: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"] }
];

export default function MyBangladeshPage() {
  const [visitedDistricts, setVisitedDistricts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState("");
  
  const [selectedColor, setSelectedColor] = useState(colorPalette[0].value);
  const [downloadTheme, setDownloadTheme] = useState("dark"); 
  
  // 🔴 নতুন স্টেট: জুম কন্ট্রোল করার জন্য
  const [position, setPosition] = useState({ coordinates: [90.35, 23.8], zoom: 1 });
  
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

  const toggleDistrict = async (districtName) => {
    if (!userProfile) return alert("ম্যাপ আপডেট করতে অনুগ্রহ করে প্রথমে লগইন করুন!");
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

  const handleMapClick = (geo) => {
    const districtName = 
      geo.properties.adm2_name || 
      geo.properties.ADM2_EN || 
      geo.properties.NAME_2 || 
      geo.properties.name || 
      geo.properties.Dist_Name ||
      geo.properties.district;
      
    toggleDistrict(districtName);
  };

  // 🔴 জুম ইন, জুম আউট এবং প্যানিং হ্যান্ডলার
  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleMoveEnd = (newPosition) => {
    setPosition(newPosition);
  };

  const handleDownloadMap = async () => {
    if (!mapCardRef.current) return;
    setDownloading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); 
      
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

  const isLight = downloadTheme === "light";
  const themeStyles = {
    cardBg: isLight ? "#ffffff" : "#0a1c13",
    textColor: isLight ? "#1e293b" : "#ffffff",
    subTextColor: isLight ? "#64748b" : "#9ca3af",
    borderColor: isLight ? "#e2e8f0" : "rgba(255, 255, 255, 0.1)",
    statBoxBg: isLight ? "#f8fafc" : "rgba(0, 0, 0, 0.4)",
    mapBg: isLight ? "#f1f5f9" : "rgba(0, 0, 0, 0.4)",
    unvisitedFill: isLight ? "#cbd5e1" : "#1e293b",
    mapStroke: isLight ? "#ffffff" : "#050b08",
    nameLabelColor: isLight ? "#0f172a" : "#ffffff"
  };

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors duration-500" style={{ backgroundColor: selectedColor }}></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors duration-500" style={{ backgroundColor: selectedColor }}></div>

      <div className="max-w-5xl mx-auto z-10 relative">
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
                  {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-image"></i>}
                  {downloading ? "প্রসেসিং..." : "ম্যাপ সেভ করুন"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div 
          ref={mapCardRef} 
          className="rounded-[2rem] p-6 sm:p-8 shadow-2xl relative" 
          style={{ backgroundColor: themeStyles.cardBg, border: `1px solid ${themeStyles.borderColor}` }}
          data-aos="zoom-in"
        >
          <div className="flex justify-between items-end pb-4 mb-6" style={{ borderBottom: `1px solid ${themeStyles.borderColor}` }}>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-1" style={{ color: themeStyles.textColor }}>আমার বাংলাদেশ ভ্রমণ</h2>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest" style={{ color: themeStyles.subTextColor }}>
                অভিযাত্রী: <span style={{ color: selectedColor }} className="text-lg font-black ml-1">{userProfile?.full_name || 'Guest Explorer'}</span>
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <h2 className="text-2xl font-black" style={{ color: themeStyles.textColor }}><span style={{ color: selectedColor }}>C</span>UET <span style={{ color: selectedColor }}>A</span>S</h2>
              <p className="text-[10px] font-black tracking-widest uppercase mt-0.5" style={{ color: themeStyles.subTextColor }}>Adventure Society</p>
            </div>
          </div>
          
          <div className="flex gap-3 sm:gap-6 mb-6">
            <div className="flex-1 p-3 sm:p-4 rounded-xl text-center shadow-sm" style={{ backgroundColor: themeStyles.statBoxBg, border: `1px solid ${themeStyles.borderColor}` }}>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1" style={{ color: themeStyles.subTextColor }}>মোট ভ্রমণ</p>
              <h3 className="text-2xl sm:text-4xl font-black" style={{ color: selectedColor }}>
                {visitedDistricts.length} <span className="text-sm" style={{ color: themeStyles.subTextColor }}>/ ৬৪</span>
              </h3>
            </div>
            <div className="flex-1 p-3 sm:p-4 rounded-xl text-center shadow-sm" style={{ backgroundColor: themeStyles.statBoxBg, border: `1px solid ${themeStyles.borderColor}` }}>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1" style={{ color: themeStyles.subTextColor }}>বাকি আছে</p>
              <h3 className="text-2xl sm:text-4xl font-black" style={{ color: themeStyles.textColor }}>
                {64 - visitedDistricts.length} <span className="text-xs" style={{ color: themeStyles.subTextColor }}>জেলা</span>
              </h3>
            </div>
            <div className="flex-1 p-3 sm:p-4 rounded-xl text-center shadow-sm" style={{ backgroundColor: themeStyles.statBoxBg, border: `1px solid ${themeStyles.borderColor}` }}>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1" style={{ color: themeStyles.subTextColor }}>সম্পন্ন হয়েছে</p>
              <h3 className="text-2xl sm:text-4xl font-black" style={{ color: selectedColor }}>
                {percentage}%
              </h3>
            </div>
          </div>

          <div className="w-full h-[65vh] sm:h-[75vh] rounded-3xl overflow-hidden flex items-center justify-center relative select-none" style={{ backgroundColor: themeStyles.mapBg, border: `1px solid ${themeStyles.borderColor}` }}>

            {/* 🔴 Custom Zoom Buttons (Downloads-এ হাইড করার জন্য data-html2canvas-ignore="true") */}
            <div data-html2canvas-ignore="true" className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <button 
                onClick={handleZoomIn} 
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95"
                style={{ backgroundColor: themeStyles.cardBg, color: themeStyles.textColor, border: `1px solid ${themeStyles.borderColor}` }}
              >
                <i className="fa-solid fa-plus"></i>
              </button>
              <button 
                onClick={handleZoomOut} 
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95"
                style={{ backgroundColor: themeStyles.cardBg, color: themeStyles.textColor, border: `1px solid ${themeStyles.borderColor}` }}
              >
                <i className="fa-solid fa-minus"></i>
              </button>
            </div>

            {hoveredDistrict && (
              <div data-html2canvas-ignore="true" className="absolute top-4 left-4 z-20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg border border-white/10" style={{ color: selectedColor }}>
                📍 {hoveredDistrict}
              </div>
            )}

            <ComposableMap
              projection="geoMercator"
              // 🔴 Scale কমিয়ে 4200 করা হয়েছে যাতে ম্যাপ কোনোভাবেই না কাটে
              projectionConfig={{ scale: 4200, center: [90.35, 23.8] }}
              className="w-full h-full outline-none"
            >
              <ZoomableGroup 
                zoom={position.zoom} 
                center={position.coordinates} 
                onMoveEnd={handleMoveEnd}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) => (
                    <>
                      {geographies.map((geo) => {
                        const districtName = geo.properties.adm2_name || geo.properties.ADM2_EN || geo.properties.NAME_2 || geo.properties.name || geo.properties.Dist_Name || geo.properties.district;
                        const isVisited = visitedDistricts.includes(districtName);

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onClick={() => handleMapClick(geo)}
                            onMouseEnter={() => setHoveredDistrict(districtName || "")}
                            onMouseLeave={() => setHoveredDistrict("")}
                            style={{
                              default: {
                                fill: isVisited ? selectedColor : themeStyles.unvisitedFill,
                                outline: "none",
                                stroke: themeStyles.mapStroke,
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
                              }
                            }}
                          />
                        );
                      })}
                      
                      {geographies.map((geo) => {
                        const districtName = geo.properties.adm2_name || geo.properties.ADM2_EN || geo.properties.NAME_2 || geo.properties.name || geo.properties.Dist_Name || geo.properties.district;
                        const isVisited = visitedDistricts.includes(districtName);
                        
                        if (!isVisited) return null;
                        const centroid = geoCentroid(geo);

                        return (
                          <Marker key={`${geo.rsmKey}-label`} coordinates={centroid}>
                            <text
                              y="2"
                              fontSize={4.5}
                              textAnchor="middle"
                              alignmentBaseline="middle"
                              fill={themeStyles.nameLabelColor}
                              className="font-bold pointer-events-none"
                              style={{ filter: isLight ? 'drop-shadow(0px 1px 1px rgba(255,255,255,0.8))' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}
                            >
                              {districtName}
                            </text>
                          </Marker>
                        );
                      })}
                    </>
                  )}
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>
        </div>
        
        <div className="mt-16 bg-[#0a1c13] border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl" data-aos="fade-up">
          <h3 className="text-xl sm:text-2xl font-black mb-8 text-white flex items-center gap-3 border-b border-white/10 pb-4">
            <i className="fa-solid fa-list-check" style={{ color: selectedColor }}></i> দ্রুত জেলা নির্বাচন করুন
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bangladeshDivisions.map((division) => {
              const divVisitedCount = division.districts.filter(d => visitedDistricts.includes(d)).length;
              
              return (
                <div key={division.name} className="bg-black/30 rounded-2xl p-5 border border-white/5 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                    <h4 className="font-black text-white">{division.name}</h4>
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-white/5 text-gray-300">
                      <span style={{ color: divVisitedCount > 0 ? selectedColor : '' }}>{divVisitedCount}</span> / {division.districts.length}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                    {division.districts.map(dist => {
                      const isChecked = visitedDistricts.includes(dist);
                      
                      return (
                        <label key={dist} className={`flex items-center gap-3 cursor-pointer group p-2 rounded-lg transition-colors ${isChecked ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleDistrict(dist)}
                            className="hidden" 
                          />
                          <div 
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'border-transparent' : 'border-gray-500'}`}
                            style={{ backgroundColor: isChecked ? selectedColor : 'transparent' }}
                          >
                            {isChecked && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                          </div>
                          <span className={`text-sm font-bold ${isChecked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                            {dist}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
