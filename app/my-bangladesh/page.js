"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import Link from "next/link";
import html2canvas from "html2canvas";
import AOS from "aos";
import "aos/dist/aos.css";

const geoUrl = "/bd-districts.json"; 

export default function MyBangladeshPage() {
  const [visitedDistricts, setVisitedDistricts] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState("");
  
  // ম্যাপের অংশটুকু ক্যাপচার করার জন্য রেফারেন্স
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

  // জিরো স্টোরেজ পলিসি: ক্লায়েন্ট সাইডে ম্যাপ ডাউনলোড করার ফাংশন
  const handleDownloadMap = async () => {
    if (!mapCardRef.current) return;
    
    setDownloading(true);
    
    try {
      // html2canvas দিয়ে HTML কে হাই-রেজোলিউশন ছবিতে রূপান্তর (Scale: 2)
      const canvas = await html2canvas(mapCardRef.current, {
        backgroundColor: '#0a1c13', // ম্যাপের ব্যাকগ্রাউন্ড কালার
        scale: 2, 
        useCORS: true,
      });
      
      const dataUrl = canvas.toDataURL("image/png");
      
      // অটোমেটিক ডাউনলোড ট্রিগার করা
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Travel-Map-${userProfile?.full_name || 'CUET-AS'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Download Error:", error);
      alert("ম্যাপটি ডাউনলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন!");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#050b08]">
        <i className="fa-solid fa-compass fa-spin text-4xl text-emerald-500"></i>
      </div>
    );
  }

  const percentage = Math.round((visitedDistricts.length / 64) * 100);

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl mx-auto z-10 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4" data-aos="fade-down">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors font-bold mb-2 text-sm">
              <i className="fa-solid fa-arrow-left"></i> হোমে ফিরে যান
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
              <i className="fa-solid fa-map-location-dot text-emerald-500"></i> আমার বাংলাদেশ
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              আপনি ৬৪টি জেলার মধ্যে <strong className="text-emerald-400 text-lg">{visitedDistricts.length}</strong> টি জেলা ভ্রমণ করেছেন!
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saving && (
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-emerald-400 text-xs font-bold flex items-center gap-2">
                <i className="fa-solid fa-circle-notch fa-spin"></i> সেভ হচ্ছে...
              </div>
            )}
            
            {/* ডাউনলোড বাটন */}
            {visitedDistricts.length > 0 && (
              <button 
                onClick={handleDownloadMap} 
                disabled={downloading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                {downloading ? "প্রসেসিং..." : "ম্যাপ ডাউনলোড"}
              </button>
            )}
          </div>
        </div>

        {/* 🔴 এই কন্টেইনারটির স্ক্রিনশট নেওয়া হবে */}
        <div 
          ref={mapCardRef} 
          className="glass-panel border border-white/10 rounded-[2rem] p-4 sm:p-8 shadow-2xl relative bg-[#0a1c13]" 
          data-aos="zoom-in"
        >
          {/* ওয়াটারমার্ক / ব্র্যান্ডিং (শুধুমাত্র ডাউনলোড করা ইমেজে সুন্দর দেখানোর জন্য) */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-white"><span className="text-[#e76f51]">C</span>UET <span className="text-[#e76f51]">A</span>S</h2>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Explorer</p>
              <p className="text-sm font-bold text-emerald-400">{userProfile?.full_name || 'Guest'}</p>
            </div>
          </div>
          
          {/* Map Container */}
          <div className="w-full h-[65vh] sm:h-[75vh] bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center relative">
            
            {/* Hover Tooltip */}
            {hoveredDistrict && (
              <div className="absolute top-4 left-4 z-20 bg-[#10b981]/20 border border-[#10b981]/50 backdrop-blur-md text-[#34d399] px-4 py-2 rounded-xl text-sm font-black shadow-lg">
                📍 {hoveredDistrict}
              </div>
            )}

            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ scale: 4800, center: [90.35, 23.68] }}
              className="w-full h-full outline-none"
            >
              <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const districtName = 
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
                              fill: isVisited ? "#10b981" : "#1e293b",
                              outline: "none",
                              stroke: "#0a1c13",
                              strokeWidth: 0.8,
                              transition: "all 0.25s ease"
                            },
                            hover: {
                              fill: isVisited ? "#34d399" : "#3b82f6",
                              outline: "none",
                              stroke: "#ffffff",
                              strokeWidth: 1.2,
                              cursor: "pointer",
                            },
                            pressed: {
                              fill: "#e76f51",
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-gray-400 border-t border-white/5 pt-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-[#10b981]"></div>
                <span>ভ্রমণ সম্পন্ন ({visitedDistricts.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-[#1e293b] border border-[#334155]"></div>
                <span>এখনো বাকি ({64 - visitedDistricts.length})</span>
              </div>
            </div>
            <div className="text-[11px] text-emerald-500/70 font-black tracking-widest">
              {percentage}% OF BANGLADESH EXPLORED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
