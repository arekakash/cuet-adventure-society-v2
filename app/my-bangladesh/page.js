"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import Link from "next/link";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import AOS from "aos";
import "aos/dist/aos.css";
import Cropper from "react-easy-crop";

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

const e2b = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

const standardMap = {
  "Chapainababganj": "Chapainawabganj", "Nawabganj": "Chapainawabganj", "Netrakona": "Netrokona",
  "Panchagar": "Panchagarh", "Bramhanbaria": "Brahmanbaria", "Chittagong": "Chattogram", "Coxs Bazar": "Cox's Bazar"
};

const districtBn = {
  "Barguna": "বরগুনা", "Barishal": "বরিশাল", "Bhola": "ভোলা", "Jhalokati": "ঝালকাঠি", "Patuakhali": "পটুয়াখালী", "Pirojpur": "পিরোজপুর",
  "Bandarban": "বান্দরবান", "Brahmanbaria": "ব্রাহ্মণবাড়িয়া", "Chandpur": "চাঁদপুর", "Chattogram": "চট্টগ্রাম", "Cox's Bazar": "কক্সবাজার", "Cumilla": "কুমিল্লা", "Feni": "ফেনী", "Khagrachhari": "খাগড়াছড়ি", "Lakshmipur": "লক্ষ্মীপুর", "Noakhali": "নোয়াখালী", "Rangamati": "রাঙামাটি",
  "Dhaka": "ঢাকা", "Faridpur": "ফরিদপুর", "Gazipur": "গাজীপুর", "Gopalganj": "গোপালগঞ্জ", "Kishoreganj": "কিশোরগঞ্জ", "Madaripur": "মাদারীপুর", "Manikganj": "মানিকগঞ্জ", "Munshiganj": "মুন্সীগঞ্জ", "Narayanganj": "নারায়ণগঞ্জ", "Narsingdi": "নরসিংদী", "Rajbari": "রাজবাড়ী", "Shariatpur": "শরীয়তপুর", "Tangail": "টাঙ্গাইল",
  "Bagerhat": "বাগেরহাট", "Chuadanga": "চুয়াডাঙ্গা", "Jashore": "যশোর", "Jhenaidah": "ঝিনাইদহ", "Khulna": "খুলনা", "Kushtia": "কুষ্টিয়া", "Magura": "মাগুরা", "Meherpur": "মেহেরপুর", "Narail": "নড়াইল", "Satkhira": "সাতক্ষীরা",
  "Jamalpur": "জামালপুর", "Mymensingh": "ময়মনসিংহ", "Netrokona": "নেত্রকোনা", "Sherpur": "শেরপুর",
  "Bogura": "বগুড়া", "Chapainawabganj": "চাঁপাইনবাবগঞ্জ", "Joypurhat": "জয়পুরহাট", "Naogaon": "নওগাঁ", "Natore": "নাটোর", "Pabna": "পাবনা", "Rajshahi": "রাজশাহী", "Sirajganj": "সিরাজগঞ্জ",
  "Dinajpur": "দিনাজপুর", "Gaibandha": "গাইবান্ধা", "Kurigram": "কুড়িগ্রাম", "Lalmonirhat": "লালমনিরহাট", "Nilphamari": "নীলফামারী", "Panchagarh": "পঞ্চগড়", "Rangpur": "রংপুর", "Thakurgaon": "ঠাকুরগাঁও",
  "Habiganj": "হবিগঞ্জ", "Moulvibazar": "মৌলভীবাজার", "Sunamganj": "সুনামগঞ্জ", "Sylhet": "সিলেট"
};

const districtConfigs = {
  "Dhaka": { fontSize: 5, dx: 0, dy: -1.5 },
  "Gazipur": { fontSize: 5.5, dx: 0, dy: -2.5 },
  "Narayanganj": { fontSize: 4.5, dx: 3.5, dy: 1.5 },
  "Munshiganj": { fontSize: 4.5, dx: 0, dy: 3.5 },
  "Narsingdi": { fontSize: 4.5, dx: 3.5, dy: -1.5 },
  "Manikganj": { fontSize: 5, dx: -2.5, dy: 0 },
  "Faridpur": { fontSize: 6, dx: -1, dy: 0 },
  "Rajbari": { fontSize: 5, dx: -1.5, dy: -1.5 },
  "Madaripur": { fontSize: 5, dx: -1, dy: 1 },
  "Shariatpur": { fontSize: 5, dx: 2, dy: 1 },
  "Magura": { fontSize: 5, dx: -1.5, dy: 0 },
  "Narail": { fontSize: 5, dx: -1.5, dy: 1 },
  "Jhenaidah": { fontSize: 5.5, dx: 0, dy: 0 },
  "Chuadanga": { fontSize: 5, dx: -2, dy: 0 },
  "Meherpur": { fontSize: 5, dx: -2, dy: -1 },
  "Kushtia": { fontSize: 5.5, dx: 0, dy: -1.5 },
  "Pabna": { fontSize: 6, dx: 0, dy: 0 },
  "Sirajganj": { fontSize: 5.5, dx: 1.5, dy: 0 },
  "Bogura": { fontSize: 6, dx: 0, dy: 0 },
  "Joypurhat": { fontSize: 5, dx: 0, dy: -1 },
  "Chapainawabganj": { fontSize: 5, dx: -3, dy: -1 },
  "Jhalokati": { fontSize: 5, dx: 2, dy: -1 },
  "Pirojpur": { fontSize: 5.5, dx: -2, dy: 0 },
  "Feni": { fontSize: 5, dx: 3, dy: -1 },
  "Noakhali": { fontSize: 6, dx: -1, dy: 2 },
  "Lakshmipur": { fontSize: 5.5, dx: -2, dy: 0 },
  "Brahmanbaria": { fontSize: 5.5, dx: 2, dy: 0 },
  "Lalmonirhat": { fontSize: 5.5, dx: 1, dy: -1 },
  "Kurigram": { fontSize: 6, dx: 2, dy: 0 },
  "Sylhet": { fontSize: 6, dx: 0, dy: 0 },
  "Moulvibazar": { fontSize: 5.5, dx: 1, dy: 1 }
};

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
  const [markerType, setMarkerType] = useState("name"); 
  const [displayName, setDisplayName] = useState("গেস্ট এক্সপ্লোরার");
  
  const BASE_SCALE = 5200; // 🔴 ম্যাপের সাইজ আগের চেয়ে অনেক বড় করা হয়েছে
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const mapCardRef = useRef(null);

  const fileInputRef = useRef(null);
  const [rawImage, setRawImage] = useState(null);
  const [croppedAvatar, setCroppedAvatar] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUserProfile({ isGuest: true });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, visited_districts')
      .eq('id', session.user.id)
      .single();

    if (data && !error) {
      const validSet = new Set(bangladeshDivisions.flatMap(div => div.districts));
      let rawDistricts = data.visited_districts || [];
      let cleaned = rawDistricts.map(d => standardMap[d] || d); 
      cleaned = [...new Set(cleaned)].filter(d => validSet.has(d));

      setUserProfile(data);
      setVisitedDistricts(cleaned);
      setDisplayName(data.full_name || "গেস্ট এক্সপ্লোরার");

      if (cleaned.length !== rawDistricts.length) {
        supabase.from('profiles').update({ visited_districts: cleaned }).eq('id', session.user.id).then();
      }
    } else {
      setUserProfile({ isGuest: true });
    }
    setLoading(false);
  };

  const toggleDistrict = async (rawName) => {
    if (!rawName) return;
    const districtName = standardMap[rawName] || rawName;

    setSaving(true);
    let updatedDistricts = [...visitedDistricts];

    if (updatedDistricts.includes(districtName)) {
      updatedDistricts = updatedDistricts.filter(d => d !== districtName);
    } else {
      updatedDistricts.push(districtName);
    }

    updatedDistricts = [...new Set(updatedDistricts)];
    setVisitedDistricts(updatedDistricts);

    if (userProfile?.isGuest) {
      setSaving(false);
      return; 
    }

    const { error } = await supabase
      .from('profiles')
      .update({ visited_districts: updatedDistricts })
      .eq('id', userProfile.id);

    if (error) console.error(error);
    setSaving(false);
  };

  const handleMapClick = (geo) => {
    const rawName = 
      geo.properties.adm2_name || geo.properties.ADM2_EN || geo.properties.NAME_2 || 
      geo.properties.name || geo.properties.Dist_Name || geo.properties.district;
    toggleDistrict(rawName);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.3, 1));

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => setRawImage(reader.result));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const generateCroppedImage = async () => {
    try {
      const image = new Image();
      image.src = rawImage;
      await new Promise((resolve) => (image.onload = resolve));
      
      const canvas = document.createElement("canvas");
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext("2d");

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      setCroppedAvatar(canvas.toDataURL("image/png"));
      setRawImage(null); 
    } catch (e) {
      console.error(e);
      alert("ছবি ক্রপ করতে সমস্যা হয়েছে।");
    }
  };

  const handleDownloadMap = async (format) => {
    if (!mapCardRef.current) return;
    setDownloading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); 
      const bgColor = downloadTheme === "light" ? "#f8fafc" : "#050b08";

      const canvas = await html2canvas(mapCardRef.current, {
        backgroundColor: bgColor, 
        scale: 4, 
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const fileName = `My-Bangladesh-${displayName.replace(/\s+/g, '-')}`;
      
      if (format === 'jpg') {
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `${fileName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'pdf') {
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileName}.pdf`);
      }
      
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

  const validCount = visitedDistricts.length;
  const percentage = Math.round((validCount / 64) * 100);

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
      
      {rawImage && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="relative flex-1">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="p-6 bg-gray-900 flex justify-between items-center gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-10 border-t border-white/10">
            <button onClick={() => setRawImage(null)} className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors">বাতিল</button>
            <input 
              type="range" 
              value={zoom} 
              min={1} 
              max={3} 
              step={0.1} 
              onChange={(e) => setZoom(e.target.value)} 
              className="flex-1 accent-emerald-500" 
            />
            <button onClick={generateCroppedImage} className="px-5 py-2.5 text-white rounded-xl font-black shadow-lg hover:scale-105 transition-transform" style={{ backgroundColor: selectedColor }}>
              <i className="fa-solid fa-crop-simple mr-2"></i> ক্রপ করুন
            </button>
          </div>
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

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

          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            {saving && (
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2" style={{ color: selectedColor }}>
                <i className="fa-solid fa-circle-notch fa-spin"></i> সেভ হচ্ছে...
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 w-full sm:w-auto justify-between">
                <button onClick={() => setMarkerType("name")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${markerType === 'name' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>নাম</button>
                <button onClick={() => setMarkerType("icon")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${markerType === 'icon' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>আইকন</button>
                <button onClick={() => setMarkerType("dot")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${markerType === 'dot' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>বিন্দু</button>
                <button onClick={() => setMarkerType("blank")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${markerType === 'blank' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>ফাঁকা</button>
              </div>

              <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 w-full sm:w-auto justify-between">
                <button onClick={() => setDownloadTheme("dark")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${!isLight ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}><i className="fa-solid fa-moon mr-1"></i> ডার্ক</button>
                <button onClick={() => setDownloadTheme("light")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${isLight ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-gray-300'}`}><i className="fa-solid fa-sun mr-1"></i> লাইট</button>
              </div>
            </div>
          </div>
        </div>

        {/* 🔴 Perfect 4:5 Download Card */}
        <div 
          ref={mapCardRef} 
          className="rounded-[2rem] p-4 sm:p-5 shadow-2xl relative flex flex-col mx-auto w-full max-w-[480px] aspect-[4/5] overflow-hidden" 
          style={{ backgroundColor: themeStyles.cardBg, border: `1px solid ${themeStyles.borderColor}` }}
          data-aos="zoom-in"
        >
          {/* 🔴 কম্প্যাক্ট হেডার: Avatar, Title এবং Stats একসাথে */}
          <div className="flex items-center gap-3 sm:gap-4 mb-3 shrink-0 relative z-10 w-full">
            
            {/* 🔴 ইউজারের বড় ছবি (w-20 h-20 / w-24 h-24) */}
            <div 
              onClick={() => fileInputRef.current.click()} 
              className="relative group cursor-pointer w-20 h-20 sm:w-24 sm:h-24 shrink-0"
              title="আপনার ছবি যুক্ত করুন"
            >
              {croppedAvatar ? (
                <>
                  <img 
                    src={croppedAvatar} 
                    className="w-full h-full rounded-full border-[3px] object-cover shadow-md transition-transform group-hover:scale-105" 
                    style={{ borderColor: selectedColor }} 
                    alt="Avatar" 
                  />
                  <div data-html2canvas-ignore="true" onClick={(e) => { e.stopPropagation(); setCroppedAvatar(null); }} className="absolute bottom-0 right-0 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg hover:bg-red-600">
                    <i className="fa-solid fa-times"></i>
                  </div>
                </>
              ) : (
                <div data-html2canvas-ignore="true" className="w-full h-full rounded-full border-2 border-dashed flex items-center justify-center transition-colors hover:border-gray-300 hover:bg-white/5" style={{ borderColor: themeStyles.subTextColor, backgroundColor: isLight ? '#f1f5f9' : 'rgba(0,0,0,0.2)' }}>
                  <i className="fa-solid fa-camera text-xl" style={{ color: themeStyles.subTextColor }}></i>
                </div>
              )}
            </div>

            {/* 🔴 টাইটেল এবং ছোট স্ট্যাটিস্টিক্স ব্যাজ */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <h2 className="text-lg sm:text-2xl font-black tracking-tight leading-tight truncate" style={{ color: themeStyles.textColor }}>
                {displayName.trim() === "গেস্ট এক্সপ্লোরার" || !displayName.trim() 
                  ? "আমার বাংলাদেশ ভ্রমণ" 
                  : `${displayName} এর বাংলাদেশ ভ্রমণ`}
              </h2>
              
              <div data-html2canvas-ignore="true" className="flex items-end gap-1.5 mt-0.5 mb-1.5">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest pb-1" style={{ color: themeStyles.subTextColor }}>অভিযাত্রী:</p>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-transparent border-b border-dashed border-gray-500/50 hover:border-gray-400 focus:outline-none text-xs font-black w-24 sm:w-32 px-0.5 py-0.5 leading-normal transition-colors"
                  style={{ color: selectedColor }}
                  title="আপনার নাম পরিবর্তন করতে এখানে ক্লিক করুন"
                />
              </div>

              {/* স্ট্যাটিস্টিক্স ব্যাজ (অনেক জায়গা বাঁচাবে) */}
              <div className="flex gap-1.5 sm:gap-2 w-full mt-1">
                <div className="flex-1 py-1 px-1.5 rounded-lg text-center shadow-sm" style={{ backgroundColor: themeStyles.statBoxBg, border: `1px solid ${themeStyles.borderColor}` }}>
                  <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: themeStyles.subTextColor }}>মোট ভ্রমণ</p>
                  <h3 className="text-xs sm:text-sm font-black" style={{ color: selectedColor }}>
                    {e2b(validCount)} <span className="text-[8px]" style={{ color: themeStyles.subTextColor }}>/ ৬৪</span>
                  </h3>
                </div>
                <div className="flex-1 py-1 px-1.5 rounded-lg text-center shadow-sm" style={{ backgroundColor: themeStyles.statBoxBg, border: `1px solid ${themeStyles.borderColor}` }}>
                  <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: themeStyles.subTextColor }}>বাকি আছে</p>
                  <h3 className="text-xs sm:text-sm font-black" style={{ color: themeStyles.textColor }}>
                    {e2b(64 - validCount)} <span className="text-[8px]" style={{ color: themeStyles.subTextColor }}>জেলা</span>
                  </h3>
                </div>
                <div className="flex-1 py-1 px-1.5 rounded-lg text-center shadow-sm" style={{ backgroundColor: themeStyles.statBoxBg, border: `1px solid ${themeStyles.borderColor}` }}>
                  <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: themeStyles.subTextColor }}>সম্পন্ন</p>
                  <h3 className="text-xs sm:text-sm font-black" style={{ color: selectedColor }}>
                    {e2b(percentage)}%
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* 🔴 ম্যাপ কন্টেইনার (বাকি সমস্ত জায়গা নিয়ে নেবে) */}
          <div className="w-full flex-1 rounded-2xl overflow-hidden flex items-center justify-center relative select-none" style={{ backgroundColor: themeStyles.mapBg, border: `1px solid ${themeStyles.borderColor}` }}>

            {/* 🔴 CUET AS ওয়াটারমার্ক ম্যাপের ভেতরে কোণায় */}
            <div className="absolute bottom-3 right-4 z-10 text-right opacity-60">
              <h2 className="text-lg font-black" style={{ color: themeStyles.textColor }}><span style={{ color: selectedColor }}>C</span>UET <span style={{ color: selectedColor }}>A</span>S</h2>
              <p className="text-[7px] font-black tracking-widest uppercase mt-0.5" style={{ color: themeStyles.subTextColor }}>Adventure Society</p>
            </div>

            <div data-html2canvas-ignore="true" className="absolute top-3 right-3 z-20 flex flex-col gap-2">
              <button onClick={handleZoomIn} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95" style={{ backgroundColor: themeStyles.cardBg, color: themeStyles.textColor, border: `1px solid ${themeStyles.borderColor}` }}>
                <i className="fa-solid fa-plus"></i>
              </button>
              <button onClick={handleZoomOut} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95" style={{ backgroundColor: themeStyles.cardBg, color: themeStyles.textColor, border: `1px solid ${themeStyles.borderColor}` }}>
                <i className="fa-solid fa-minus"></i>
              </button>
            </div>

            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center" }}
            >
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: BASE_SCALE, center: [90.35, 23.8] }}
                className="w-full h-full outline-none"
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) => (
                    <>
                      {geographies.map((geo) => {
                        const rawName = geo.properties.adm2_name || geo.properties.ADM2_EN || geo.properties.NAME_2 || geo.properties.name || geo.properties.Dist_Name || geo.properties.district;
                        const districtName = standardMap[rawName] || rawName;
                        const isVisited = visitedDistricts.includes(districtName);

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onClick={() => handleMapClick(geo)}
                            onMouseEnter={() => setHoveredDistrict(districtBn[districtName] || districtName)}
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
                              hover: { fill: isVisited ? selectedColor : "#3b82f6", outline: "none", stroke: isLight ? "#000" : "#ffffff", strokeWidth: 1.5, cursor: "pointer" }
                            }}
                          />
                        );
                      })}
                      
                      {geographies.map((geo) => {
                        const rawName = geo.properties.adm2_name || geo.properties.ADM2_EN || geo.properties.NAME_2 || geo.properties.name || geo.properties.Dist_Name || geo.properties.district;
                        const districtName = standardMap[rawName] || rawName;
                        const isVisited = visitedDistricts.includes(districtName);
                        
                        if (!isVisited || markerType === "blank") return null;
                        
                        const centroid = geoCentroid(geo);
                        const bengaliName = districtBn[districtName] || districtName;
                        const config = districtConfigs[districtName] || { fontSize: 7, dx: 0, dy: 0 }; 

                        return (
                          <Marker key={`${geo.rsmKey}-label`} coordinates={centroid}>
                            {markerType === "name" && (
                              <text
                                x={config.dx}
                                y={config.dy + 1}
                                fontSize={config.fontSize} 
                                fontFamily="'Noto Sans Bengali', sans-serif"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                fill={themeStyles.nameLabelColor}
                                className="font-bold pointer-events-none"
                                style={{ filter: isLight ? 'drop-shadow(0px 1px 1px rgba(255,255,255,0.8))' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}
                              >
                                {bengaliName}
                              </text>
                            )}
                            
                            {markerType === "dot" && (
                              <circle 
                                cx={0} cy={0} r={1.5} 
                                fill={themeStyles.nameLabelColor} 
                                className="pointer-events-none"
                                style={{ filter: isLight ? 'drop-shadow(0px 1px 1px rgba(255,255,255,0.8))' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }} 
                              />
                            )}

                            {markerType === "icon" && (
                              <g transform="translate(-3, -8) scale(0.015)" className="pointer-events-none" style={{ filter: isLight ? 'drop-shadow(0px 30px 30px rgba(255,255,255,0.8))' : 'drop-shadow(0px 30px 30px rgba(0,0,0,0.8))' }}>
                                <path 
                                  d="M256 0C161.9 0 85.3 76.6 85.3 170.7c0 119.5 170.7 341.3 170.7 341.3s170.7-221.8 170.7-341.3C426.7 76.6 350.1 0 256 0zm0 256c-47.1 0-85.3-38.2-85.3-85.3S208.9 85.3 256 85.3s85.3 38.2 85.3 85.3S303.1 256 256 256z" 
                                  fill={themeStyles.nameLabelColor} 
                                />
                              </g>
                            )}
                          </Marker>
                        );
                      })}
                    </>
                  )}
                </Geographies>
              </ComposableMap>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-[#0a1c13] border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl" data-aos="fade-up">
          <h3 className="text-xl sm:text-2xl font-black mb-6 text-white flex items-center gap-3 border-b border-white/10 pb-4">
            <i className="fa-solid fa-list-check" style={{ color: selectedColor }}></i> দ্রুত জেলা নির্বাচন করুন
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bangladeshDivisions.map((division) => {
              const divVisitedCount = division.districts.filter(d => visitedDistricts.includes(d)).length;
              
              return (
                <div key={division.name} className="bg-black/30 rounded-2xl p-5 border border-white/5 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                    <h4 className="font-black text-white text-lg">{division.name}</h4>
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-white/5 text-gray-300">
                      <span style={{ color: divVisitedCount > 0 ? selectedColor : '' }}>{e2b(divVisitedCount)}</span> / {e2b(division.districts.length)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {division.districts.map(dist => {
                      const isChecked = visitedDistricts.includes(dist);
                      const bngName = districtBn[dist] || dist;
                      
                      return (
                        <label key={dist} className={`flex items-center gap-2 cursor-pointer group px-3 py-1.5 rounded-full border transition-all ${isChecked ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleDistrict(dist)} className="hidden" />
                          <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${isChecked ? 'border-transparent' : 'border-gray-500'}`} style={{ backgroundColor: isChecked ? selectedColor : 'transparent' }}>
                            {isChecked && <i className="fa-solid fa-check text-[8px] text-white"></i>}
                          </div>
                          <span className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                            {bngName}
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

        {visitedDistricts.length > 0 && (
          <div className="mt-8 bg-[#0a1c13] border border-white/10 p-6 sm:p-8 rounded-[2rem] shadow-2xl flex flex-col items-center justify-center text-center" data-aos="fade-up">
            <h3 className="text-xl font-black text-white mb-2">আপনার ম্যাপ প্রস্তুত!</h3>
            <p className="text-gray-400 text-sm mb-6">কোন ফরম্যাটে ডাউনলোড করতে চান তা বেছে নিন</p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button 
                onClick={() => handleDownloadMap('jpg')} 
                disabled={downloading}
                className="w-full sm:w-auto text-white px-8 py-3.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-105"
                style={{ backgroundColor: selectedColor, boxShadow: `0 0 20px ${selectedColor}60` }}
              >
                {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-image"></i>}
                {downloading ? "প্রসেসিং..." : "ডাউনলোড JPG"}
              </button>

              <button 
                onClick={() => handleDownloadMap('pdf')} 
                disabled={downloading}
                className="w-full sm:w-auto text-white px-8 py-3.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-105 bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
                {downloading ? "প্রসেসিং..." : "ডাউনলোড PDF"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
